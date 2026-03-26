package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
)

// WatchRoomHandler manages the external Socket.IO watch-room integration.
// The handler itself does not run a WebSocket server; it provides config
// retrieval and connectivity tests against a separately-deployed server.
type WatchRoomHandler struct {
	db *gorm.DB
}

// NewWatchRoomHandler creates a WatchRoomHandler backed by db.
func NewWatchRoomHandler(db *gorm.DB) *WatchRoomHandler {
	return &WatchRoomHandler{db: db}
}

// watchRoomConfig reads the WatchRoomConfig from the admin_configs table.
// Returns (nil, nil) when no config is stored.
func (h *WatchRoomHandler) watchRoomConfig() (*watchRoomCfg, error) {
	var row model.AdminConfigModel
	err := h.db.Where("key = ?", "WatchRoomConfig").First(&row).Error
	if err != nil {
		return nil, nil // not configured
	}
	var cfg watchRoomCfg
	if err := json.Unmarshal(row.Config, &cfg); err != nil {
		return nil, fmt.Errorf("watch room: unmarshal config: %w", err)
	}
	return &cfg, nil
}

type watchRoomCfg struct {
	Enabled   bool   `json:"enabled"`
	ServerURL string `json:"serverUrl"`
	AuthKey   string `json:"authKey"`
}

// GetConfig handles GET /api/watch-room/config.
// Returns the public watch-room config (serverUrl only; authKey is omitted).
func (h *WatchRoomHandler) GetConfig(c *gin.Context) {
	cfg, err := h.watchRoomConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取配置失败", "enabled": false})
		return
	}
	if cfg == nil || !cfg.Enabled {
		c.JSON(http.StatusOK, gin.H{"enabled": false})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"enabled":   true,
		"serverUrl": cfg.ServerURL,
	})
}

// GetFullConfig handles POST /api/watch-room/config (admin only).
// Returns the full config including the authKey.
func (h *WatchRoomHandler) GetFullConfig(c *gin.Context) {
	cfg, err := h.watchRoomConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取配置失败"})
		return
	}
	if cfg == nil {
		c.JSON(http.StatusOK, gin.H{"enabled": false, "serverUrl": "", "authKey": ""})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"enabled":   cfg.Enabled,
		"serverUrl": cfg.ServerURL,
		"authKey":   cfg.AuthKey,
	})
}

// statsRequest is the body accepted by the Stats endpoint.
type statsRequest struct {
	ServerURL string `json:"serverUrl"`
	AuthKey   string `json:"authKey"`
}

// Stats handles POST /api/watch-room/stats.
// Proxies a GET /stats request to the external watch-room server.
func (h *WatchRoomHandler) Stats(c *gin.Context) {
	var req statsRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ServerURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "服务器地址不能为空"})
		return
	}

	statsURL := strings.TrimRight(req.ServerURL, "/") + "/stats"
	data, err := probeURL(statsURL, req.AuthKey, 10*time.Second)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": err.Error()})
		return
	}

	var result interface{}
	if jsonErr := json.Unmarshal(data, &result); jsonErr != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": "无效的服务器响应"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// TestConnection handles POST /api/watch-room/test-connection.
// Calls /health on the external server to verify it is reachable.
func (h *WatchRoomHandler) TestConnection(c *gin.Context) {
	var req statsRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ServerURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "服务器地址不能为空"})
		return
	}

	healthURL := strings.TrimRight(req.ServerURL, "/") + "/health"
	data, err := probeURL(healthURL, "", 10*time.Second)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": err.Error()})
		return
	}

	var health struct {
		Status string  `json:"status"`
		Uptime float64 `json:"uptime"`
	}
	if jsonErr := json.Unmarshal(data, &health); jsonErr != nil || health.Status != "ok" {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": "服务器状态异常"})
		return
	}

	uptimeMinutes := int(math.Floor(health.Uptime / 60))
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("连接成功！服务器运行时间: %d 分钟", uptimeMinutes),
	})
}

// probeURL performs a GET request to url with an optional Bearer auth header,
// returning the response body on HTTP 2xx.
func probeURL(url, authKey string, timeout time.Duration) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("无法创建请求: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	if authKey != "" {
		req.Header.Set("Authorization", "Bearer "+authKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("请求超时（%s）", timeout)
		}
		return nil, fmt.Errorf("无法连接到服务器: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("服务器返回错误: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}
	return body, nil
}
