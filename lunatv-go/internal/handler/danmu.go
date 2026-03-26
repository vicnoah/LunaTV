package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
)

const (
	defaultDanmuAPIURL   = "https://smonedanmu.vercel.app"
	defaultDanmuToken    = "smonetv"
	danmuDefaultTimeout  = 30
	danmuUserAgent       = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
)

// DanmuHandler proxies requests to an external danmu (bullet-comment) API.
type DanmuHandler struct {
	db *gorm.DB
}

// NewDanmuHandler creates a DanmuHandler backed by db.
func NewDanmuHandler(db *gorm.DB) *DanmuHandler {
	return &DanmuHandler{db: db}
}

// danmuAPICfg holds the resolved danmu API configuration.
type danmuAPICfg struct {
	Enabled bool
	APIURL  string
	Token   string
	Timeout int // seconds
}

// getDanmuConfig reads DanmuApiConfig from the admin_configs table.
func (h *DanmuHandler) getDanmuConfig() danmuAPICfg {
	def := danmuAPICfg{
		Enabled: true,
		APIURL:  defaultDanmuAPIURL,
		Token:   defaultDanmuToken,
		Timeout: danmuDefaultTimeout,
	}

	if h.db == nil {
		return def
	}

	var row model.AdminConfigModel
	if err := h.db.Where("key = ?", "DanmuApiConfig").First(&row).Error; err != nil {
		return def
	}

	var cfg struct {
		Enabled      *bool  `json:"enabled"`
		UseCustomAPI bool   `json:"useCustomApi"`
		CustomAPIURL string `json:"customApiUrl"`
		CustomToken  string `json:"customToken"`
		Timeout      int    `json:"timeout"`
	}
	if err := json.Unmarshal(row.Config, &cfg); err != nil {
		return def
	}

	if cfg.Enabled != nil && !*cfg.Enabled {
		return danmuAPICfg{Enabled: false}
	}
	if cfg.UseCustomAPI && cfg.CustomAPIURL != "" {
		token := cfg.CustomToken
		timeout := cfg.Timeout
		if timeout == 0 {
			timeout = danmuDefaultTimeout
		}
		return danmuAPICfg{
			Enabled: true,
			APIURL:  strings.TrimRight(cfg.CustomAPIURL, "/"),
			Token:   token,
			Timeout: timeout,
		}
	}
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = danmuDefaultTimeout
	}
	def.Timeout = timeout
	return def
}

// Get handles GET /api/danmu-external.
// Query params: episodeId (int), animeId (int), withRelated (bool, optional).
// Proxies to the configured danmu API's episode endpoint and returns the
// danmu list in a normalised format.
func (h *DanmuHandler) Get(c *gin.Context) {
	episodeIDStr := c.Query("episodeId")
	animeIDStr := c.Query("animeId")

	if episodeIDStr == "" || animeIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "缺少必要参数: episodeId, animeId",
		})
		return
	}

	episodeID, err := strconv.Atoi(episodeIDStr)
	if err != nil || episodeID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "episodeId 必须是正整数"})
		return
	}
	animeID, err := strconv.Atoi(animeIDStr)
	if err != nil || animeID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "animeId 必须是正整数"})
		return
	}

	cfg := h.getDanmuConfig()
	if !cfg.Enabled || cfg.APIURL == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "弹幕API未启用"})
		return
	}

	url := fmt.Sprintf("%s/%s/api/v2/episode/%d", cfg.APIURL, cfg.Token, episodeID)
	slog.Info("danmu: fetching episode", "url", url)

	data, err := danmuFetch(url, time.Duration(cfg.Timeout)*time.Second)
	if err != nil {
		slog.Warn("danmu: fetch failed", "err", err)
		c.JSON(http.StatusBadGateway, gin.H{"code": 502, "message": "弹幕获取失败: " + err.Error()})
		return
	}

	// Forward the upstream JSON response transparently.
	c.Data(http.StatusOK, "application/json; charset=utf-8", data)
}

// Search handles GET /api/danmu-external/search.
// Query param: keyword (string)
// Returns a list of matching anime with episode details.
func (h *DanmuHandler) Search(c *gin.Context) {
	keyword := strings.TrimSpace(c.Query("keyword"))
	if keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "缺少必要参数: keyword",
			"animes":  []interface{}{},
		})
		return
	}

	cfg := h.getDanmuConfig()
	if !cfg.Enabled || cfg.APIURL == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code":    503,
			"message": "弹幕API未启用",
			"animes":  []interface{}{},
		})
		return
	}

	searchURL := fmt.Sprintf("%s/%s/api/v2/search/anime?keyword=%s",
		cfg.APIURL, cfg.Token, encodeURIComponent(keyword))
	slog.Info("danmu: searching", "url", searchURL)

	data, err := danmuFetch(searchURL, time.Duration(cfg.Timeout)*time.Second)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"code":    502,
			"message": "弹幕搜索失败: " + err.Error(),
			"animes":  []interface{}{},
		})
		return
	}

	// Parse upstream response.
	var upstream map[string]interface{}
	if jsonErr := json.Unmarshal(data, &upstream); jsonErr != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": 502, "message": "无效的上游响应", "animes": []interface{}{}})
		return
	}

	animes := normaliseAnimes(upstream)

	// For animes with no episodes, try fetching bangumi detail.
	cfg2 := cfg // capture for closure
	enriched := make([]interface{}, 0, len(animes))
	for _, anime := range animes {
		a := anime
		eps, _ := getEpisodeList(a, cfg2)
		if len(eps) > 0 {
			a["episodes"] = eps
		}
		if len(getSlice(a, "episodes")) > 0 {
			enriched = append(enriched, a)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"keyword": keyword,
		"animes":  enriched,
		"count":   len(enriched),
	})
}

// --- helpers -----------------------------------------------------------------

func danmuFetch(url string, timeout time.Duration) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", danmuUserAgent)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return body, nil
}

func encodeURIComponent(s string) string {
	return strings.NewReplacer(
		" ", "%20", "#", "%23", "%", "%25", "&", "%26",
		"+", "%2B", "/", "%2F", "=", "%3D", "?", "%3F",
	).Replace(s)
}

// normaliseAnimes validates and normalises the "animes" array from the
// upstream search response.
func normaliseAnimes(data map[string]interface{}) []map[string]interface{} {
	raw, _ := data["animes"].([]interface{})
	result := make([]map[string]interface{}, 0, len(raw))
	for _, item := range raw {
		m, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		animeID := positiveInt(m["animeId"])
		if animeID == 0 {
			continue
		}
		result = append(result, m)
	}
	return result
}

// getEpisodeList returns the episodes slice for an anime, fetching bangumi
// detail from the API when the search result didn't include episodes.
func getEpisodeList(anime map[string]interface{}, cfg danmuAPICfg) ([]interface{}, error) {
	if eps := getSlice(anime, "episodes"); len(eps) > 0 {
		return eps, nil
	}

	animeID := positiveInt(anime["animeId"])
	if animeID == 0 {
		return nil, nil
	}

	bangumiURL := fmt.Sprintf("%s/%s/api/v2/bangumi/%d", cfg.APIURL, cfg.Token, animeID)
	data, err := danmuFetch(bangumiURL, 10*time.Second)
	if err != nil {
		return nil, err
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	bangumi, _ := resp["bangumi"].(map[string]interface{})
	if bangumi == nil {
		return nil, nil
	}
	eps := getSlice(bangumi, "episodes")
	return eps, nil
}

func getSlice(m map[string]interface{}, key string) []interface{} {
	v, _ := m[key].([]interface{})
	return v
}

func positiveInt(v interface{}) int {
	switch n := v.(type) {
	case float64:
		if n > 0 {
			return int(n)
		}
	case int:
		if n > 0 {
			return n
		}
	case string:
		if i, err := strconv.Atoi(n); err == nil && i > 0 {
			return i
		}
	}
	return 0
}
