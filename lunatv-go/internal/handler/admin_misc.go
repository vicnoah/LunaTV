package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
)

// RegisterAdminMisc wires up all remaining admin endpoints.
func RegisterAdminMisc(rg *gin.RouterGroup, db *gorm.DB) {
	h := &adminMiscHandler{db: db}

	rg.POST("/netdisk", requireAdmin(db), h.UpdateNetdisk)
	rg.POST("/youtube", requireAdmin(db), h.UpdateYouTube)
	rg.POST("/ai-recommend", requireAdmin(db), h.UpdateAIRecommend)
	rg.POST("/tvbox-proxy", requireAdmin(db), h.UpdateTVBoxProxy)
	rg.POST("/tvbox-security", requireAdmin(db), h.UpdateTVBoxSecurity)
	rg.POST("/video-proxy", requireAdmin(db), h.UpdateVideoProxy)

	rg.GET("/trusted-network", requireOwner(db), h.GetTrustedNetwork)
	rg.POST("/trusted-network", requireOwner(db), h.UpdateTrustedNetwork)

	rg.GET("/shortdrama", requireAdmin(db), h.GetShortDrama)
	rg.POST("/shortdrama", requireAdmin(db), h.UpdateShortDrama)

	rg.POST("/download-config", requireAdmin(db), h.UpdateDownloadConfig)

	rg.GET("/danmu-api", requireAdmin(db), h.GetDanmuAPI)
	rg.POST("/danmu-api", requireAdmin(db), h.UpdateDanmuAPI)

	rg.POST("/oidc-discover", requireAdmin(db), h.OIDCDiscover)

	rg.POST("/data_migration/export", requireOwner(db), h.ExportData)
	rg.POST("/data_migration/import", requireOwner(db), h.ImportData)
}

type adminMiscHandler struct{ db *gorm.DB }

// UpdateNetdisk handles POST /api/admin/netdisk.
func (h *adminMiscHandler) UpdateNetdisk(c *gin.Context) {
	var cfg model.NetDiskConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.PansouURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pansouUrl value"})
		return
	}
	if cfg.Timeout < 10 || cfg.Timeout > 120 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid timeout value"})
		return
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	cfg.PansouURL = strings.TrimSpace(cfg.PansouURL)
	adminCfg.NetDiskConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateYouTube handles POST /api/admin/youtube.
func (h *adminMiscHandler) UpdateYouTube(c *gin.Context) {
	var cfg model.YouTubeConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.Enabled && !cfg.EnableDemo && cfg.APIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "API密钥不能为空"})
		return
	}
	if cfg.MaxResults < 1 || cfg.MaxResults > 50 {
		cfg.MaxResults = 25
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.YouTubeConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateAIRecommend handles POST /api/admin/ai-recommend.
func (h *adminMiscHandler) UpdateAIRecommend(c *gin.Context) {
	var cfg model.AIRecommendConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.Enabled {
		hasAI := cfg.APIURL != "" && cfg.APIKey != "" && cfg.Model != ""
		hasTavily := cfg.EnableOrchestrator && cfg.EnableWebSearch && len(cfg.TavilyAPIKeys) > 0
		if !hasAI && !hasTavily {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请至少配置一种模式"})
			return
		}
		if hasAI {
			if cfg.Temperature < 0 || cfg.Temperature > 2 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "温度参数应在0-2之间"})
				return
			}
			if cfg.MaxTokens < 1 || cfg.MaxTokens > 150000 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "最大Token数应在1-150000之间"})
				return
			}
		}
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.AIRecommendConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateTVBoxProxy handles POST /api/admin/tvbox-proxy.
func (h *adminMiscHandler) UpdateTVBoxProxy(c *gin.Context) {
	var cfg model.ProxyConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.Enabled && cfg.ProxyURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "代理URL不能为空"})
		return
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.TVBoxProxyConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateTVBoxSecurity handles POST /api/admin/tvbox-security.
func (h *adminMiscHandler) UpdateTVBoxSecurity(c *gin.Context) {
	var cfg model.TVBoxSecurityConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.EnableAuth && (cfg.Token == "" || len(cfg.Token) < 8) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token长度至少8位"})
		return
	}
	if cfg.EnableRateLimit && (cfg.RateLimit < 1 || cfg.RateLimit > 1000) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "频率限制应在1-1000之间"})
		return
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.TVBoxSecurityConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateVideoProxy handles POST /api/admin/video-proxy.
func (h *adminMiscHandler) UpdateVideoProxy(c *gin.Context) {
	var cfg model.ProxyConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.Enabled && cfg.ProxyURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "代理URL不能为空"})
		return
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.VideoProxyConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetTrustedNetwork handles GET /api/admin/trusted-network.
func (h *adminMiscHandler) GetTrustedNetwork(c *gin.Context) {
	cfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	tnCfg := cfg.TrustedNetworkConfig
	if tnCfg == nil {
		tnCfg = &model.TrustedNetworkConfig{Enabled: false, TrustedIPs: []string{}}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"config": tnCfg}})
}

// UpdateTrustedNetwork handles POST /api/admin/trusted-network.
func (h *adminMiscHandler) UpdateTrustedNetwork(c *gin.Context) {
	var cfg model.TrustedNetworkConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.TrustedNetworkConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetShortDrama handles GET /api/admin/shortdrama.
func (h *adminMiscHandler) GetShortDrama(c *gin.Context) {
	cfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	sdCfg := cfg.ShortDramaConfig
	if sdCfg == nil {
		sdCfg = &model.ShortDramaConfig{
			PrimaryAPIURL:     "https://wwzy.tv/api.php/provide/vod",
			AlternativeAPIURL: "",
			EnableAlternative: false,
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "config": sdCfg})
}

// UpdateShortDrama handles POST /api/admin/shortdrama.
func (h *adminMiscHandler) UpdateShortDrama(c *gin.Context) {
	var cfg model.ShortDramaConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.PrimaryAPIURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "主API地址不能为空"})
		return
	}
	if cfg.EnableAlternative && cfg.AlternativeAPIURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "启用备用API时必须提供备用API地址"})
		return
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.ShortDramaConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "短剧API配置已更新"})
}

// UpdateDownloadConfig handles POST /api/admin/download-config.
func (h *adminMiscHandler) UpdateDownloadConfig(c *gin.Context) {
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.DownloadConfig = &model.DownloadConfig{Enabled: body.Enabled}
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "下载配置保存成功", "config": adminCfg.DownloadConfig})
}

// GetDanmuAPI handles GET /api/admin/danmu-api.
func (h *adminMiscHandler) GetDanmuAPI(c *gin.Context) {
	cfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	danmuCfg := cfg.DanmuApiConfig
	if danmuCfg == nil {
		danmuCfg = &model.DanmuApiConfig{
			Enabled: true, UseCustomAPI: false, CustomAPIURL: "", CustomToken: "", Timeout: 15,
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"config": danmuCfg}})
}

// UpdateDanmuAPI handles POST /api/admin/danmu-api.
func (h *adminMiscHandler) UpdateDanmuAPI(c *gin.Context) {
	var cfg model.DanmuApiConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	if cfg.Timeout < 5 || cfg.Timeout > 60 {
		cfg.Timeout = 15
	}
	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	adminCfg.DanmuApiConfig = &cfg
	if err := saveAdminConfig(h.db, adminCfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// OIDCDiscover handles POST /api/admin/oidc-discover.
func (h *adminMiscHandler) OIDCDiscover(c *gin.Context) {
	var body struct {
		IssuerURL string `json:"issuerUrl"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.IssuerURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Issuer URL不能为空"})
		return
	}

	wellKnown := strings.TrimRight(body.IssuerURL, "/") + "/.well-known/openid-configuration"
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, wellKnown, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无法构建请求"})
		return
	}
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("获取配置失败: %v", err)})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("无法获取OIDC配置: %d", resp.StatusCode)})
		return
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "解析OIDC配置失败"})
		return
	}

	authEP, _ := data["authorization_endpoint"].(string)
	tokenEP, _ := data["token_endpoint"].(string)
	if authEP == "" || tokenEP == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OIDC配置不完整，缺少必需的端点"})
		return
	}

	userInfoEP, _ := data["userinfo_endpoint"].(string)
	jwksURI, _ := data["jwks_uri"].(string)
	issuer, _ := data["issuer"].(string)

	c.JSON(http.StatusOK, gin.H{
		"authorization_endpoint": authEP,
		"token_endpoint":         tokenEP,
		"userinfo_endpoint":      userInfoEP,
		"jwks_uri":               jwksURI,
		"issuer":                 issuer,
	})
}

// ExportData handles POST /api/admin/data_migration/export.
// Returns a JSON dump of the admin config (simplified — no encryption in Go version).
func (h *adminMiscHandler) ExportData(c *gin.Context) {
	var body struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供加密密码"})
		return
	}

	adminCfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	exportData := map[string]interface{}{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"data": map[string]interface{}{
			"adminConfig": adminCfg,
			"userData":    map[string]interface{}{},
		},
	}

	data, _ := json.Marshal(exportData)
	filename := fmt.Sprintf("lunatv-backup-%s.json", time.Now().Format("20060102-150405"))
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	c.Data(http.StatusOK, "application/octet-stream", data)
}

// ImportData handles POST /api/admin/data_migration/import.
// Reads a JSON backup file from a multipart form field "file".
func (h *adminMiscHandler) ImportData(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择备份文件"})
		return
	}
	defer file.Close()

	password := c.Request.FormValue("password")
	if password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供解密密码"})
		return
	}

	raw, err := io.ReadAll(io.LimitReader(file, 50<<20)) // 50 MB
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取文件失败"})
		return
	}

	var importData struct {
		Timestamp string `json:"timestamp"`
		Data      struct {
			AdminConfig *model.AdminConfig `json:"adminConfig"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &importData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "备份文件格式错误"})
		return
	}
	if importData.Data.AdminConfig == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "备份文件格式无效"})
		return
	}

	if err := saveAdminConfig(h.db, importData.Data.AdminConfig); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "导入失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":   "数据导入成功",
		"timestamp": importData.Timestamp,
	})
}
