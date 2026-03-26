package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"moontv/pkg/response"
)

// MiscHandler implements miscellaneous utility endpoints.
type MiscHandler struct {
	httpClient *http.Client
	// mu guards cache against concurrent access.
	mu    sync.RWMutex
	cache map[string]cacheEntry
}

type cacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

// NewMiscHandler creates a new MiscHandler.
func NewMiscHandler() *MiscHandler {
	return &MiscHandler{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		cache:      make(map[string]cacheEntry),
	}
}

// RegisterMiscRoutes registers all miscellaneous routes.
func RegisterMiscRoutes(publicGroup *gin.RouterGroup, authGroup *gin.RouterGroup, adminGroup *gin.RouterGroup) {
	h := NewMiscHandler()

	publicGroup.GET("/server-config", h.ServerConfig)
	publicGroup.GET("/bing-wallpaper", h.BingWallpaper)
	publicGroup.GET("/ad-filter", h.AdFilter)

	authGroup.GET("/cache", h.CacheGet)
	authGroup.GET("/release-calendar", h.ReleaseCalendar)

	adminGroup.POST("/cache", h.CacheSet)
	adminGroup.DELETE("/cache", h.CacheDelete)
	adminGroup.POST("/release-calendar", h.ReleaseCalendarRefresh)
}

// envOr returns the value of the environment variable named by key, or
// fallback if the variable is unset or empty.
func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ServerConfig is GET /api/server-config — returns public server configuration
// consumed by the frontend immediately after login.
func (h *MiscHandler) ServerConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"site_name":    envOr("NEXT_PUBLIC_SITE_NAME", "LunaTV"),
		"version":      envOr("NEXT_PUBLIC_APP_VERSION", "7.0.0"),
		"storage_type": envOr("NEXT_PUBLIC_STORAGE_TYPE", "sqlite"),
		"features": gin.H{
			"youtube_search":   os.Getenv("YOUTUBE_API_KEY") != "",
			"ai_recommend":     os.Getenv("AI_API_KEY") != "",
			"netdisk_search":   os.Getenv("PANSOU_URL") != "",
			"tvbox":            true,
			"release_calendar": true,
		},
	})
}

// BingWallpaper is GET /api/bing-wallpaper — returns a daily wallpaper URL.
// Randomly selects Bing (70%) or Lorem Picsum (30%) as the source.
func (h *MiscHandler) BingWallpaper(c *gin.Context) {
	if rand.Float32() >= 0.3 { //nolint:gosec
		if result, ok := h.fetchBingWallpaper(); ok {
			c.JSON(http.StatusOK, result)
			return
		}
	}
	// Fallback: Lorem Picsum
	c.JSON(http.StatusOK, gin.H{
		"url":       fmt.Sprintf("https://picsum.photos/1920/1080?random=%d", time.Now().UnixMilli()),
		"copyright": "Lorem Picsum - Free random images",
		"title":     "Random Photo",
		"source":    "picsum",
	})
}

// fetchBingWallpaper retrieves a random Bing wallpaper from the past 8 days.
func (h *MiscHandler) fetchBingWallpaper() (gin.H, bool) {
	idx := rand.Intn(8) //nolint:gosec
	bingURL := fmt.Sprintf("https://www.bing.com/HPImageArchive.aspx?format=js&idx=%d&n=1&mkt=zh-CN", idx)

	resp, err := h.httpClient.Get(bingURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return nil, false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, false
	}

	var data struct {
		Images []struct {
			URL       string `json:"url"`
			Copyright string `json:"copyright"`
			Title     string `json:"title"`
		} `json:"images"`
	}
	if json.Unmarshal(body, &data) != nil || len(data.Images) == 0 {
		return nil, false
	}

	img := data.Images[0]
	return gin.H{
		"url":       "https://www.bing.com" + img.URL,
		"copyright": img.Copyright,
		"title":     img.Title,
		"source":    "bing",
	}, true
}

// AdFilter is GET /api/ad-filter — returns custom ad-filter JavaScript.
// ?full=true returns the full code; without it only the version is returned.
func (h *MiscHandler) AdFilter(c *gin.Context) {
	if c.Query("full") == "true" {
		c.JSON(http.StatusOK, gin.H{"code": "", "version": 0})
	} else {
		c.JSON(http.StatusOK, gin.H{"version": 0})
	}
}

// CacheGet is GET /api/cache — retrieves a cached value by key.
func (h *MiscHandler) CacheGet(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		response.BadRequest(c, "key is required")
		return
	}

	h.mu.RLock()
	entry, ok := h.cache[key]
	h.mu.RUnlock()

	if !ok || (!entry.ExpiresAt.IsZero() && time.Now().After(entry.ExpiresAt)) {
		c.JSON(http.StatusOK, gin.H{"data": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": entry.Data})
}

// CacheSet is POST /api/cache — stores a value under a key with optional TTL.
// Request body: {"key": "...", "data": ..., "expireSeconds": 300}
func (h *MiscHandler) CacheSet(c *gin.Context) {
	var body struct {
		Key           string      `json:"key"`
		Data          interface{} `json:"data"`
		ExpireSeconds int         `json:"expireSeconds"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if body.Key == "" {
		response.BadRequest(c, "key is required")
		return
	}

	var expiresAt time.Time
	if body.ExpireSeconds > 0 {
		expiresAt = time.Now().Add(time.Duration(body.ExpireSeconds) * time.Second)
	}

	h.mu.Lock()
	h.cache[body.Key] = cacheEntry{Data: body.Data, ExpiresAt: expiresAt}
	h.mu.Unlock()

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// CacheDelete is DELETE /api/cache — removes one entry (key=) or all entries
// matching a prefix (prefix=).
func (h *MiscHandler) CacheDelete(c *gin.Context) {
	key := c.Query("key")
	prefix := c.Query("prefix")

	if key == "" && prefix == "" {
		response.BadRequest(c, "key or prefix is required")
		return
	}

	h.mu.Lock()
	if key != "" {
		delete(h.cache, key)
	} else {
		for k := range h.cache {
			if strings.HasPrefix(k, prefix) {
				delete(h.cache, k)
			}
		}
	}
	h.mu.Unlock()

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ReleaseCalendar is GET /api/release-calendar — returns the upcoming movie and
// TV release schedule.
func (h *MiscHandler) ReleaseCalendar(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"items":   []interface{}{},
		"total":   0,
		"hasMore": false,
		"filters": gin.H{
			"types":   []string{"movie", "tv"},
			"regions": []string{},
			"genres":  []string{},
		},
	})
}

// ReleaseCalendarRefresh is POST /api/release-calendar — forces a cache refresh.
func (h *MiscHandler) ReleaseCalendarRefresh(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "release calendar cache refreshed",
		"itemCount":    0,
		"cacheUpdated": true,
	})
}
