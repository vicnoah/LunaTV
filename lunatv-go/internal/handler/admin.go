// Package handler implements HTTP handlers for the LunaTV Go backend.
package handler

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
	"moontv/internal/service"
)

// getAdminConfig loads the AdminConfig from the DB (key="main").
// Returns an empty default config when the row does not exist yet.
func getAdminConfig(db *gorm.DB) (*model.AdminConfig, error) {
	var entry model.AdminConfigModel
	result := db.Where("key = ?", "main").First(&entry)
	if result.Error == gorm.ErrRecordNotFound {
		return &model.AdminConfig{
			SourceConfig:     []model.SourceConfigItem{},
			CustomCategories: []model.CustomCategory{},
			UserConfig:       model.UserConfigSection{Users: []model.UserEntry{}},
		}, nil
	}
	if result.Error != nil {
		return nil, result.Error
	}
	var cfg model.AdminConfig
	if err := json.Unmarshal(entry.Config, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// saveAdminConfig persists cfg to the DB under key="main" (upsert).
func saveAdminConfig(db *gorm.DB, cfg *model.AdminConfig) error {
	data, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	result := db.Where("key = ?", "main").
		Assign(model.AdminConfigModel{Key: "main", Config: data}).
		FirstOrCreate(&model.AdminConfigModel{})
	return result.Error
}

// ownerUsername returns the USERNAME env var, defaulting to "admin".
func ownerUsername() string {
	u := os.Getenv("USERNAME")
	if u == "" {
		return "admin"
	}
	return u
}

// callerUsername extracts the username and role from the Authorization Bearer JWT.
func callerUsername(c *gin.Context) (username string, role string, ok bool) {
	header := c.GetHeader("Authorization")
	if header == "" {
		return "", "", false
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return "", "", false
	}
	tokenStr := parts[1]
	segments := strings.Split(tokenStr, ".")
	if len(segments) != 3 {
		return "", "", false
	}
	// URL-safe base64 without padding.
	payload := segments[1]
	raw, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return "", "", false
	}
	var claims struct {
		Username string `json:"username"`
		Role     string `json:"role"`
	}
	if err := json.Unmarshal(raw, &claims); err != nil {
		return "", "", false
	}
	return claims.Username, claims.Role, true
}

// isOwner returns true when username matches the owner env var.
func isOwner(username string) bool {
	return username == ownerUsername()
}

// isAdminOrOwner checks whether username has admin or owner role in the config.
func isAdminOrOwner(cfg *model.AdminConfig, username string) bool {
	if isOwner(username) {
		return true
	}
	for _, u := range cfg.UserConfig.Users {
		if u.Username == username {
			return !u.Banned && (u.Role == "admin" || u.Role == "owner")
		}
	}
	return false
}

// callerRole returns the effective role ("owner", "admin", or "") for a given username.
// An empty string means the caller has no elevated privileges.
func callerRole(cfg *model.AdminConfig, username string) string {
	if isOwner(username) {
		return "owner"
	}
	for _, u := range cfg.UserConfig.Users {
		if u.Username == username && !u.Banned && (u.Role == "admin" || u.Role == "owner") {
			return u.Role
		}
	}
	return ""
}

// requireOwner is a middleware that allows only the site owner.
func requireOwner(_ *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username, _, ok := callerUsername(c)
		if !ok || username == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		if !isOwner(username) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "只有站长可以执行此操作"})
			return
		}
		c.Set("username", username)
		c.Next()
	}
}

// requireAdmin is a middleware that allows admin or owner.
// It stores the loaded config under key "adminConfig" for downstream handlers.
func requireAdmin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username, _, ok := callerUsername(c)
		if !ok || username == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		cfg, err := getAdminConfig(db)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
			return
		}
		if !isAdminOrOwner(cfg, username) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "权限不足"})
			return
		}
		c.Set("username", username)
		c.Set("adminConfig", cfg)
		c.Next()
	}
}

// adminConfigFromCtx returns the AdminConfig cached by requireAdmin, falling
// back to a fresh DB load when the route was protected by requireOwner instead.
func adminConfigFromCtx(c *gin.Context, db *gorm.DB) (*model.AdminConfig, error) {
	if v, exists := c.Get("adminConfig"); exists {
		if cfg, ok := v.(*model.AdminConfig); ok {
			return cfg, nil
		}
	}
	return getAdminConfig(db)
}

// AdminHandler handles top-level admin config endpoints.
type AdminHandler struct {
	db *gorm.DB
}

// NewAdminHandler constructs an AdminHandler.
func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// RegisterAdmin wires up all admin routes under rg (e.g. /api/admin).
func RegisterAdmin(rg *gin.RouterGroup, db *gorm.DB) {
	h := NewAdminHandler(db)

	// Config
	rg.GET("/config", requireAdmin(db), h.GetConfig)
	rg.POST("/config", requireOwner(db), h.UpdateConfig)
	rg.POST("/config_file", requireOwner(db), h.UpdateConfigFile)
	rg.POST("/config_subscription/fetch", requireOwner(db), h.FetchConfigSubscription)

	// Site
	rg.POST("/site", requireAdmin(db), h.UpdateSite)

	// Reset / stats / cache / performance
	rg.GET("/reset", requireOwner(db), h.Reset)
	rg.GET("/play-stats", requireAdmin(db), h.GetPlayStats)
	rg.GET("/cache", requireOwner(db), h.GetCache)
	rg.DELETE("/cache", requireOwner(db), h.ClearCache)
	rg.GET("/performance", requireOwner(db), h.GetPerformance)
	rg.DELETE("/performance", requireOwner(db), h.ClearPerformance)

	// Sub-handlers
	RegisterAdminSource(rg, db)
	RegisterAdminUser(rg, db)
	RegisterAdminEmby(rg, db)
	RegisterAdminLive(rg, db)
	RegisterAdminMisc(rg, db)
}

// GetConfig handles GET /api/admin/config.
func (h *AdminHandler) GetConfig(c *gin.Context) {
	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取管理员配置失败"})
		return
	}
	username, _ := c.Get("username")
	role := "admin"
	if isOwner(username.(string)) {
		role = "owner"
	}
	c.JSON(http.StatusOK, gin.H{
		"Role":   role,
		"Config": cfg,
	})
}

// UpdateConfig handles POST /api/admin/config.
func (h *AdminHandler) UpdateConfig(c *gin.Context) {
	var newCfg model.AdminConfig
	if err := c.ShouldBindJSON(&newCfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if err := saveAdminConfig(h.db, &newCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateConfigFile handles POST /api/admin/config_file.
func (h *AdminHandler) UpdateConfigFile(c *gin.Context) {
	var body struct {
		ConfigFile      string `json:"configFile"`
		SubscriptionURL string `json:"subscriptionUrl"`
		AutoUpdate      *bool  `json:"autoUpdate"`
		LastCheckTime   string `json:"lastCheckTime"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if body.ConfigFile == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "配置文件内容不能为空"})
		return
	}
	var raw json.RawMessage
	if err := json.Unmarshal([]byte(body.ConfigFile), &raw); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "配置文件格式错误，请检查 JSON 语法"})
		return
	}

	cfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	cfg.ConfigFile = body.ConfigFile
	if body.SubscriptionURL != "" {
		cfg.ConfigSubscription.URL = body.SubscriptionURL
	}
	if body.AutoUpdate != nil {
		cfg.ConfigSubscription.AutoUpdate = *body.AutoUpdate
	}
	cfg.ConfigSubscription.LastCheck = body.LastCheckTime

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "配置文件更新成功"})
}

// FetchConfigSubscription handles POST /api/admin/config_subscription/fetch.
func (h *AdminHandler) FetchConfigSubscription(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少URL参数"})
		return
	}

	content, err := service.FetchConfigSubscription(body.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "拉取配置失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"configContent": content,
		"message":       "配置拉取成功",
	})
}

// UpdateSite handles POST /api/admin/site.
func (h *AdminHandler) UpdateSite(c *gin.Context) {
	var body struct {
		SiteName                string      `json:"SiteName"`
		Announcement            string      `json:"Announcement"`
		SearchDownstreamMaxPage int         `json:"SearchDownstreamMaxPage"`
		SiteInterfaceCacheTime  int         `json:"SiteInterfaceCacheTime"`
		DoubanProxyType         string      `json:"DoubanProxyType"`
		DoubanProxy             string      `json:"DoubanProxy"`
		DoubanImageProxyType    string      `json:"DoubanImageProxyType"`
		DoubanImageProxy        string      `json:"DoubanImageProxy"`
		DisableYellowFilter     bool        `json:"DisableYellowFilter"`
		ShowAdultContent        bool        `json:"ShowAdultContent"`
		FluidSearch             bool        `json:"FluidSearch"`
		EnableWebLive           bool        `json:"EnableWebLive"`
		EnablePuppeteer         bool        `json:"EnablePuppeteer"`
		DoubanCookies           string      `json:"DoubanCookies"`
		TMDBApiKey              string      `json:"TMDBApiKey"`
		TMDBLanguage            string      `json:"TMDBLanguage"`
		EnableTMDBActorSearch   bool        `json:"EnableTMDBActorSearch"`
		CronConfig              *cronUpdate `json:"cronConfig"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}

	cfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	cfg.SiteConfig.SiteName = body.SiteName
	cfg.SiteConfig.Announcement = body.Announcement
	cfg.SiteConfig.SearchDownstreamMaxPage = body.SearchDownstreamMaxPage
	cfg.SiteConfig.SiteInterfaceCacheTime = body.SiteInterfaceCacheTime
	cfg.SiteConfig.DoubanProxyType = body.DoubanProxyType
	cfg.SiteConfig.DoubanProxy = body.DoubanProxy
	cfg.SiteConfig.DoubanImageProxyType = body.DoubanImageProxyType
	cfg.SiteConfig.DoubanImageProxy = body.DoubanImageProxy
	cfg.SiteConfig.DisableYellowFilter = body.DisableYellowFilter
	cfg.SiteConfig.ShowAdultContent = body.ShowAdultContent
	cfg.SiteConfig.FluidSearch = body.FluidSearch
	cfg.SiteConfig.EnableWebLive = body.EnableWebLive
	cfg.SiteConfig.TMDBApiKey = body.TMDBApiKey
	cfg.SiteConfig.TMDBLanguage = body.TMDBLanguage
	cfg.SiteConfig.EnableTMDBActorSearch = body.EnableTMDBActorSearch

	if cfg.DoubanConfig == nil {
		cfg.DoubanConfig = &model.DoubanConfig{}
	}
	cfg.DoubanConfig.EnablePuppeteer = body.EnablePuppeteer
	if body.DoubanCookies != "" {
		cfg.DoubanConfig.Cookies = body.DoubanCookies
	}

	if body.CronConfig != nil {
		cfg.CronConfig = &model.CronConfig{
			EnableAutoRefresh:  body.CronConfig.EnableAutoRefresh,
			MaxRecordsPerRun:   body.CronConfig.MaxRecordsPerRun,
			OnlyRefreshRecent:  body.CronConfig.OnlyRefreshRecent,
			RecentDays:         body.CronConfig.RecentDays,
			OnlyRefreshOngoing: body.CronConfig.OnlyRefreshOngoing,
		}
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "shouldReload": true})
}

type cronUpdate struct {
	EnableAutoRefresh  bool `json:"enableAutoRefresh"`
	MaxRecordsPerRun   int  `json:"maxRecordsPerRun"`
	OnlyRefreshRecent  bool `json:"onlyRefreshRecent"`
	RecentDays         int  `json:"recentDays"`
	OnlyRefreshOngoing bool `json:"onlyRefreshOngoing"`
}

// Reset handles GET /api/admin/reset — factory reset.
func (h *AdminHandler) Reset(c *gin.Context) {
	empty := &model.AdminConfig{
		SourceConfig:     []model.SourceConfigItem{},
		CustomCategories: []model.CustomCategory{},
		UserConfig:       model.UserConfigSection{Users: []model.UserEntry{}},
	}
	if err := saveAdminConfig(h.db, empty); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "重置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GetPlayStats handles GET /api/admin/play-stats.
func (h *AdminHandler) GetPlayStats(c *gin.Context) {
	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"totalUsers":          len(cfg.UserConfig.Users),
		"totalWatchTime":      0,
		"totalPlays":          0,
		"avgWatchTimePerUser": 0,
		"avgPlaysPerUser":     0,
		"userStats":           []interface{}{},
		"topSources":          []interface{}{},
		"dailyStats":          []interface{}{},
		"registrationStats": gin.H{
			"todayNewUsers":        0,
			"totalRegisteredUsers": len(cfg.UserConfig.Users),
			"registrationTrend":    []interface{}{},
		},
		"activeUsers": gin.H{"daily": 0, "weekly": 0, "monthly": 0},
	})
}

// GetCache handles GET /api/admin/cache.
func (h *AdminHandler) GetCache(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"total": gin.H{"count": 0, "size": 0}},
	})
}

// ClearCache handles DELETE /api/admin/cache.
func (h *AdminHandler) ClearCache(c *gin.Context) {
	cacheType := c.Query("type")
	if cacheType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 type 参数"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"clearedCount": 0, "message": "缓存清理完成"},
	})
}

// GetPerformance handles GET /api/admin/performance.
func (h *AdminHandler) GetPerformance(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"ok": true,
		"data": gin.H{
			"metrics":         []interface{}{},
			"currentStatus":   gin.H{},
			"recentRequests":  []interface{}{},
			"externalTraffic": gin.H{},
		},
	})
}

// ClearPerformance handles DELETE /api/admin/performance.
func (h *AdminHandler) ClearPerformance(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "性能数据已清空"})
}
