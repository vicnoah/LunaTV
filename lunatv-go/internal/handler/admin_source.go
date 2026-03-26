package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
)

// RegisterAdminSource wires up source and category admin routes.
func RegisterAdminSource(rg *gin.RouterGroup, db *gorm.DB) {
	h := &adminSourceHandler{db: db}
	rg.POST("/source", requireAdmin(db), h.SourceAction)
	rg.GET("/source/validate", requireAdmin(db), h.ValidateSource)
	rg.POST("/category", requireAdmin(db), h.CategoryAction)
}

type adminSourceHandler struct{ db *gorm.DB }

// SourceAction handles POST /api/admin/source.
func (h *adminSourceHandler) SourceAction(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}
	action, _ := body["action"].(string)

	validActions := map[string]bool{
		"add": true, "update": true, "disable": true, "enable": true, "delete": true,
		"sort": true, "batch_disable": true, "batch_enable": true, "batch_delete": true,
		"update_adult": true, "batch_mark_adult": true, "batch_unmark_adult": true,
		"batch_mark_shortdrama": true, "batch_mark_vod": true, "update_weight": true,
	}
	if !validActions[action] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}

	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	switch action {
	case "add":
		key, _ := body["key"].(string)
		name, _ := body["name"].(string)
		api, _ := body["api"].(string)
		if key == "" || name == "" || api == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要参数"})
			return
		}
		for _, s := range cfg.SourceConfig {
			if s.Key == key {
				c.JSON(http.StatusBadRequest, gin.H{"error": "该源已存在"})
				return
			}
		}
		detail, _ := body["detail"].(string)
		isAdult, _ := body["is_adult"].(bool)
		srcType, _ := body["type"].(string)
		if srcType == "" {
			srcType = "vod"
		}
		weight := 50
		if w, ok := body["weight"].(float64); ok {
			weight = clamp(int(w), 0, 100)
		}
		cfg.SourceConfig = append(cfg.SourceConfig, model.SourceConfigItem{
			Key: key, Name: name, API: api, Detail: detail,
			From: "custom", IsAdult: isAdult, Type: srcType, Weight: &weight,
		})

	case "update":
		key, _ := body["key"].(string)
		if key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 key 参数"})
			return
		}
		idx := findSourceIdx(cfg, key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "源不存在"})
			return
		}
		if v, ok := body["name"].(string); ok && v != "" {
			cfg.SourceConfig[idx].Name = v
		}
		if v, ok := body["api"].(string); ok && v != "" {
			cfg.SourceConfig[idx].API = v
		}
		if v, ok := body["detail"].(string); ok {
			cfg.SourceConfig[idx].Detail = v
		}
		if v, ok := body["is_adult"].(bool); ok {
			cfg.SourceConfig[idx].IsAdult = v
		}
		if v, ok := body["type"].(string); ok {
			cfg.SourceConfig[idx].Type = v
		}
		if v, ok := body["weight"].(float64); ok {
			w := clamp(int(v), 0, 100)
			cfg.SourceConfig[idx].Weight = &w
		}

	case "disable":
		key, _ := body["key"].(string)
		if key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 key 参数"})
			return
		}
		idx := findSourceIdx(cfg, key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "源不存在"})
			return
		}
		cfg.SourceConfig[idx].Disabled = true

	case "enable":
		key, _ := body["key"].(string)
		if key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 key 参数"})
			return
		}
		idx := findSourceIdx(cfg, key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "源不存在"})
			return
		}
		cfg.SourceConfig[idx].Disabled = false

	case "delete":
		key, _ := body["key"].(string)
		if key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 key 参数"})
			return
		}
		idx := findSourceIdx(cfg, key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "源不存在"})
			return
		}
		if cfg.SourceConfig[idx].From == "config" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "该源不可删除"})
			return
		}
		cfg.SourceConfig = append(cfg.SourceConfig[:idx], cfg.SourceConfig[idx+1:]...)
		removeKeyFromUsersAndTags(cfg, key)

	case "batch_disable":
		keys := toStringSlice(body["keys"])
		if len(keys) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 keys 参数或为空"})
			return
		}
		for _, k := range keys {
			if idx := findSourceIdx(cfg, k); idx != -1 {
				cfg.SourceConfig[idx].Disabled = true
			}
		}

	case "batch_enable":
		keys := toStringSlice(body["keys"])
		if len(keys) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 keys 参数或为空"})
			return
		}
		for _, k := range keys {
			if idx := findSourceIdx(cfg, k); idx != -1 {
				cfg.SourceConfig[idx].Disabled = false
			}
		}

	case "batch_delete":
		keys := toStringSlice(body["keys"])
		if len(keys) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 keys 参数或为空"})
			return
		}
		toDelete := map[string]bool{}
		for _, k := range keys {
			if idx := findSourceIdx(cfg, k); idx != -1 && cfg.SourceConfig[idx].From != "config" {
				toDelete[k] = true
			}
		}
		newList := make([]model.SourceConfigItem, 0, len(cfg.SourceConfig))
		for _, s := range cfg.SourceConfig {
			if !toDelete[s.Key] {
				newList = append(newList, s)
			}
		}
		cfg.SourceConfig = newList
		for k := range toDelete {
			removeKeyFromUsersAndTags(cfg, k)
		}

	case "sort":
		order := toStringSlice(body["order"])
		if order == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "排序列表格式错误"})
			return
		}
		srcMap := make(map[string]model.SourceConfigItem)
		for _, s := range cfg.SourceConfig {
			srcMap[s.Key] = s
		}
		newList := make([]model.SourceConfigItem, 0, len(cfg.SourceConfig))
		for _, k := range order {
			if s, ok := srcMap[k]; ok {
				newList = append(newList, s)
				delete(srcMap, k)
			}
		}
		for _, s := range cfg.SourceConfig {
			if _, remaining := srcMap[s.Key]; remaining {
				newList = append(newList, s)
			}
		}
		cfg.SourceConfig = newList

	case "update_adult":
		key, _ := body["key"].(string)
		if key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 key 参数"})
			return
		}
		idx := findSourceIdx(cfg, key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "源不存在"})
			return
		}
		v, _ := body["is_adult"].(bool)
		cfg.SourceConfig[idx].IsAdult = v

	case "batch_mark_adult":
		keys := toStringSlice(body["keys"])
		if len(keys) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 keys 参数或为空"})
			return
		}
		for _, k := range keys {
			if idx := findSourceIdx(cfg, k); idx != -1 {
				cfg.SourceConfig[idx].IsAdult = true
			}
		}

	case "batch_unmark_adult":
		keys := toStringSlice(body["keys"])
		if len(keys) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 keys 参数或为空"})
			return
		}
		for _, k := range keys {
			if idx := findSourceIdx(cfg, k); idx != -1 {
				cfg.SourceConfig[idx].IsAdult = false
			}
		}

	case "batch_mark_shortdrama":
		keys := toStringSlice(body["keys"])
		if len(keys) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 keys 参数或为空"})
			return
		}
		for _, k := range keys {
			if idx := findSourceIdx(cfg, k); idx != -1 {
				cfg.SourceConfig[idx].Type = "shortdrama"
			}
		}

	case "batch_mark_vod":
		keys := toStringSlice(body["keys"])
		if len(keys) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 keys 参数或为空"})
			return
		}
		for _, k := range keys {
			if idx := findSourceIdx(cfg, k); idx != -1 {
				cfg.SourceConfig[idx].Type = "vod"
			}
		}

	case "update_weight":
		key, _ := body["key"].(string)
		if key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 key 参数"})
			return
		}
		wf, ok := body["weight"].(float64)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少有效的 weight 参数"})
			return
		}
		idx := findSourceIdx(cfg, key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "源不存在"})
			return
		}
		w := clamp(int(wf), 0, 100)
		cfg.SourceConfig[idx].Weight = &w
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ValidateSource handles GET /api/admin/source/validate — SSE stream of source test results.
func (h *adminSourceHandler) ValidateSource(c *gin.Context) {
	keyword := c.Query("q")
	if keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "搜索关键词不能为空"})
		return
	}

	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	flusher, ok := c.Writer.(http.Flusher)

	sources := cfg.SourceConfig
	sendEvent(c, flusher, fmt.Sprintf(`{"type":"start","totalSources":%d}`, len(sources)))

	completed := 0
	for _, src := range sources {
		if src.Disabled {
			completed++
			continue
		}
		status := validateSourceURL(src.API, keyword)
		sendEvent(c, flusher, fmt.Sprintf(`{"type":"source_result","source":%q,"status":%q}`, src.Key, status))
		completed++
		if ok {
			flusher.Flush()
		}
	}
	sendEvent(c, flusher, fmt.Sprintf(`{"type":"complete","completedSources":%d}`, completed))
}

// CategoryAction handles POST /api/admin/category.
func (h *adminSourceHandler) CategoryAction(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}
	action, _ := body["action"].(string)
	validActions := map[string]bool{"add": true, "disable": true, "enable": true, "delete": true, "sort": true}
	if !validActions[action] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}

	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	query, _ := body["query"].(string)
	catType, _ := body["type"].(string)

	findCatIdx := func() int {
		for i, cat := range cfg.CustomCategories {
			if cat.Query == query && cat.Type == catType {
				return i
			}
		}
		return -1
	}

	switch action {
	case "add":
		name, _ := body["name"].(string)
		if name == "" || catType == "" || query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要参数"})
			return
		}
		if findCatIdx() != -1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "该分类已存在"})
			return
		}
		cfg.CustomCategories = append(cfg.CustomCategories, model.CustomCategory{
			Name: name, Type: catType, Query: query, From: "custom",
		})

	case "disable":
		idx := findCatIdx()
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "分类不存在"})
			return
		}
		cfg.CustomCategories[idx].Disabled = true

	case "enable":
		idx := findCatIdx()
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "分类不存在"})
			return
		}
		cfg.CustomCategories[idx].Disabled = false

	case "delete":
		idx := findCatIdx()
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "分类不存在"})
			return
		}
		if cfg.CustomCategories[idx].From == "config" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "该分类不可删除"})
			return
		}
		cfg.CustomCategories = append(cfg.CustomCategories[:idx], cfg.CustomCategories[idx+1:]...)

	case "sort":
		order := toStringSlice(body["order"])
		if order == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "排序列表格式错误"})
			return
		}
		catMap := make(map[string]model.CustomCategory)
		for _, cat := range cfg.CustomCategories {
			catMap[cat.Query+":"+cat.Type] = cat
		}
		newList := make([]model.CustomCategory, 0, len(cfg.CustomCategories))
		for _, k := range order {
			if cat, ok := catMap[k]; ok {
				newList = append(newList, cat)
				delete(catMap, k)
			}
		}
		for _, cat := range cfg.CustomCategories {
			if _, rem := catMap[cat.Query+":"+cat.Type]; rem {
				newList = append(newList, cat)
			}
		}
		cfg.CustomCategories = newList
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- helpers ---

func findSourceIdx(cfg *model.AdminConfig, key string) int {
	for i, s := range cfg.SourceConfig {
		if s.Key == key {
			return i
		}
	}
	return -1
}

func removeKeyFromUsersAndTags(cfg *model.AdminConfig, key string) {
	filter := func(apis []string) []string {
		out := apis[:0]
		for _, api := range apis {
			if api != key {
				out = append(out, api)
			}
		}
		return out
	}
	for i := range cfg.UserConfig.Users {
		cfg.UserConfig.Users[i].EnabledApis = filter(cfg.UserConfig.Users[i].EnabledApis)
	}
	for i := range cfg.UserConfig.Tags {
		cfg.UserConfig.Tags[i].EnabledApis = filter(cfg.UserConfig.Tags[i].EnabledApis)
	}
}

func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func sendEvent(c *gin.Context, flusher http.Flusher, data string) {
	fmt.Fprintf(c.Writer, "data: %s\n\n", data)
	if flusher != nil {
		flusher.Flush()
	}
}

// validateSourceURL performs a quick connectivity check against a CMS API URL.
// Returns "valid", "no_results", or "invalid".
func validateSourceURL(apiURL, keyword string) string {
	searchURL := apiURL + "?ac=videolist&wd=" + keyword
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL, nil)
	if err != nil {
		return "invalid"
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "invalid"
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "invalid"
	}

	var data struct {
		List []struct {
			VodName string `json:"vod_name"`
		} `json:"list"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "invalid"
	}
	if len(data.List) == 0 {
		return "no_results"
	}
	kw := strings.ToLower(keyword)
	for _, item := range data.List {
		if strings.Contains(strings.ToLower(item.VodName), kw) {
			return "valid"
		}
	}
	return "no_results"
}
