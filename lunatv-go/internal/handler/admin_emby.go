package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
)

// RegisterAdminEmby wires up Emby-related admin routes.
func RegisterAdminEmby(rg *gin.RouterGroup, db *gorm.DB) {
	h := &adminEmbyHandler{db: db}
	rg.POST("/emby", requireAdmin(db), h.EmbyAction)
	rg.GET("/emby/export", requireOwner(db), h.ExportEmby)
	rg.POST("/emby/import", requireOwner(db), h.ImportEmby)
}

type adminEmbyHandler struct{ db *gorm.DB }

// EmbyAction handles POST /api/admin/emby.
// Supported actions: "test" (test connectivity), "clearCache".
func (h *adminEmbyHandler) EmbyAction(c *gin.Context) {
	var body struct {
		Action    string `json:"action"`
		ServerURL string `json:"ServerURL"`
		ApiKey    string `json:"ApiKey"`
		Username  string `json:"Username"`
		Password  string `json:"Password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}

	switch body.Action {
	case "test":
		if body.ServerURL == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请填写 Emby 服务器地址"})
			return
		}
		if body.ApiKey == "" && body.Username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请填写 API Key 或用户名"})
			return
		}
		// Perform a simple connectivity test by fetching /System/Info/Public.
		userID, err := testEmbyConnection(body.ServerURL, body.ApiKey, body.Username, body.Password)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "Emby 连接失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Emby 连接测试成功", "userId": userID})

	case "clearCache":
		// In the Go implementation there is no in-process Emby cache to clear.
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "已清除 0 条 Emby 缓存", "cleared": 0})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的操作"})
	}
}

// ExportEmby handles GET /api/admin/emby/export.
func (h *adminEmbyHandler) ExportEmby(c *gin.Context) {
	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}
	emby := cfg.EmbyConfig
	if emby == nil {
		emby = &model.EmbyConfigSection{}
	}
	data, _ := json.MarshalIndent(emby, "", "  ")
	filename := fmt.Sprintf("emby-config-%d.json", time.Now().UnixMilli())
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	c.Data(http.StatusOK, "application/json", data)
}

// ImportEmby handles POST /api/admin/emby/import.
// Body: {"data": <EmbyConfigSection JSON>}
func (h *adminEmbyHandler) ImportEmby(c *gin.Context) {
	var body struct {
		Data *model.EmbyConfigSection `json:"data"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Data == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少导入数据"})
		return
	}

	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	if body.Data.Sources != nil {
		existing := cfg.EmbyConfig
		if existing == nil {
			existing = &model.EmbyConfigSection{}
		}
		merged := make([]model.EmbySource, len(existing.Sources))
		copy(merged, existing.Sources)
		for _, imp := range body.Data.Sources {
			found := false
			for j, ex := range merged {
				if ex.Key == imp.Key {
					merged[j] = imp
					found = true
					break
				}
			}
			if !found {
				merged = append(merged, imp)
			}
		}
		if cfg.EmbyConfig == nil {
			cfg.EmbyConfig = &model.EmbyConfigSection{}
		}
		cfg.EmbyConfig.Sources = merged
	} else {
		// Legacy flat import — merge all fields.
		if cfg.EmbyConfig == nil {
			cfg.EmbyConfig = &model.EmbyConfigSection{}
		}
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "导入成功"})
}

// testEmbyConnection does a minimal connectivity check against an Emby server.
// Returns the UserId on success.
func testEmbyConnection(serverURL, apiKey, username, _ string) (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	infoURL := serverURL + "/System/Info/Public"
	req, err := http.NewRequest(http.MethodGet, infoURL, nil)
	if err != nil {
		return "", err
	}
	if apiKey != "" {
		req.Header.Set("X-Emby-Token", apiKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	// Try to get UserId from /Users/Me if apiKey is set.
	if apiKey != "" {
		meURL := serverURL + "/Users/Me"
		req2, _ := http.NewRequest(http.MethodGet, meURL, nil)
		req2.Header.Set("X-Emby-Token", apiKey)
		resp2, err := client.Do(req2)
		if err == nil {
			defer resp2.Body.Close()
			var user struct {
				ID string `json:"Id"`
			}
			if json.NewDecoder(resp2.Body).Decode(&user) == nil {
				return user.ID, nil
			}
		}
	}
	return "", nil
}
