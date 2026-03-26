package handler

import (
	"bufio"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
)

// RegisterAdminLive wires up live TV admin routes.
func RegisterAdminLive(rg *gin.RouterGroup, db *gorm.DB) {
	h := &adminLiveHandler{db: db}
	rg.POST("/live", requireAdmin(db), h.LiveAction)
	rg.POST("/live/refresh", requireAdmin(db), h.RefreshLive)
}

type adminLiveHandler struct{ db *gorm.DB }

// LiveAction handles POST /api/admin/live.
// Supported actions: "add", "delete", "enable", "disable", "edit", "sort".
func (h *adminLiveHandler) LiveAction(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}

	action, _ := body["action"].(string)
	key, _ := body["key"].(string)

	cfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	if cfg.LiveConfig == nil {
		cfg.LiveConfig = []model.LiveConfigItem{}
	}

	findLiveIdx := func(k string) int {
		for i, l := range cfg.LiveConfig {
			if l.Key == k {
				return i
			}
		}
		return -1
	}

	switch action {
	case "add":
		if findLiveIdx(key) != -1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "直播源 key 已存在"})
			return
		}
		name, _ := body["name"].(string)
		url, _ := body["url"].(string)
		ua, _ := body["ua"].(string)
		epg, _ := body["epg"].(string)
		isTVBox, _ := body["isTvBox"].(bool)

		liveItem := model.LiveConfigItem{
			Key: key, Name: name, URL: url,
			UA: ua, EPG: epg, IsTVBox: isTVBox,
			From: "custom",
		}
		// Count channels.
		ch := countChannels(url)
		liveItem.ChannelNumber = &ch
		cfg.LiveConfig = append(cfg.LiveConfig, liveItem)

	case "delete":
		idx := findLiveIdx(key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "直播源不存在"})
			return
		}
		if cfg.LiveConfig[idx].From == "config" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不能删除配置文件中的直播源"})
			return
		}
		cfg.LiveConfig = append(cfg.LiveConfig[:idx], cfg.LiveConfig[idx+1:]...)

	case "enable":
		idx := findLiveIdx(key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "直播源不存在"})
			return
		}
		cfg.LiveConfig[idx].Disabled = false

	case "disable":
		idx := findLiveIdx(key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "直播源不存在"})
			return
		}
		cfg.LiveConfig[idx].Disabled = true

	case "edit":
		idx := findLiveIdx(key)
		if idx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "直播源不存在"})
			return
		}
		if cfg.LiveConfig[idx].From == "config" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不能编辑配置文件中的直播源"})
			return
		}
		if v, ok := body["name"].(string); ok {
			cfg.LiveConfig[idx].Name = v
		}
		if v, ok := body["url"].(string); ok {
			cfg.LiveConfig[idx].URL = v
		}
		if v, ok := body["ua"].(string); ok {
			cfg.LiveConfig[idx].UA = v
		}
		if v, ok := body["epg"].(string); ok {
			cfg.LiveConfig[idx].EPG = v
		}
		if v, ok := body["isTvBox"].(bool); ok {
			cfg.LiveConfig[idx].IsTVBox = v
		}
		ch := countChannels(cfg.LiveConfig[idx].URL)
		cfg.LiveConfig[idx].ChannelNumber = &ch

	case "sort":
		order := toStringSlice(body["order"])
		if order == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "排序数据格式错误"})
			return
		}
		orderMap := make(map[string]bool)
		for _, k := range order {
			orderMap[k] = true
		}
		newList := make([]model.LiveConfigItem, 0, len(cfg.LiveConfig))
		for _, k := range order {
			if idx := findLiveIdx(k); idx != -1 {
				newList = append(newList, cfg.LiveConfig[idx])
			}
		}
		for _, l := range cfg.LiveConfig {
			if !orderMap[l.Key] {
				newList = append(newList, l)
			}
		}
		cfg.LiveConfig = newList

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "未知操作"})
		return
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// RefreshLive handles POST /api/admin/live/refresh.
func (h *adminLiveHandler) RefreshLive(c *gin.Context) {
	cfg, err := getAdminConfig(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	if cfg.LiveConfig == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "直播源刷新成功"})
		return
	}
	for i, live := range cfg.LiveConfig {
		if live.Disabled {
			continue
		}
		ch := countChannels(live.URL)
		cfg.LiveConfig[i].ChannelNumber = &ch
	}
	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "直播源刷新成功"})
}

// countChannels fetches an M3U playlist URL and counts the number of channels.
// Returns 0 on any error.
func countChannels(m3uURL string) int {
	if m3uURL == "" {
		return 0
	}
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(m3uURL)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0
	}
	count := 0
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "#EXTINF") {
			count++
		}
	}
	return count
}
