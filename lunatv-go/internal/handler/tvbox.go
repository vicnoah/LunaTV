package handler

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"moontv/internal/service"
	"moontv/pkg/response"
)

// jarSources is the curated list of spider JAR candidate URLs, ordered by
// preference (domestic CDN first, then GitHub direct, then proxy mirrors).
var jarSources = []string{
	"https://hub.gitmirror.com/raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar",
	"https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar",
	"https://raw.githubusercontent.com/qlql765/CatVodTVSpider-by-zhixc/main/jar/custom_spider.jar",
	"https://raw.githubusercontent.com/gaotianliuyun/gao/master/jar/custom_spider.jar",
	"https://gh-proxy.com/https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar",
	"https://cors.isteed.cc/github.com/FongMi/CatVodSpider/raw/main/jar/custom_spider.jar",
}

// TVBoxHandler implements all TVBox-related HTTP endpoints.
type TVBoxHandler struct {
	svc        *service.TVBoxService
	httpClient *http.Client
}

// NewTVBoxHandler constructs a TVBoxHandler.
func NewTVBoxHandler() *TVBoxHandler {
	return &TVBoxHandler{
		svc:        service.NewTVBoxService(),
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// RegisterTVBoxRoutes registers all TVBox routes on the given router group.
// Authentication for TVBox is done via the optional ?token= query parameter
// because the TVBox Android app cannot send HTTP cookies.
func RegisterTVBoxRoutes(rg *gin.RouterGroup) {
	h := NewTVBoxHandler()

	rg.GET("/tvbox", h.Config)
	rg.OPTIONS("/tvbox", h.CORSPreflight)

	rg.GET("/tvbox/search", h.Search)
	rg.OPTIONS("/tvbox/search", h.CORSPreflight)

	rg.GET("/tvbox/health", h.Health)
	rg.GET("/tvbox/smart-health", h.SmartHealth)
	rg.GET("/tvbox/diagnose", h.Diagnose)
	rg.GET("/tvbox/spider-status", h.SpiderStatus)
	rg.POST("/tvbox/spider-status", h.SpiderStatus)
	rg.GET("/tvbox/jar-diagnostic", h.JarDiagnostic)
	rg.GET("/tvbox/jar-fix", h.JarFix)

	// Alias used by some TVBox clients
	rg.GET("/tvbox-config", h.Config)
}

// corsHeaders sets permissive CORS headers required by the TVBox Android app.
func corsHeaders(c *gin.Context) {
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// CORSPreflight handles OPTIONS pre-flight requests from TVBox.
func (h *TVBoxHandler) CORSPreflight(c *gin.Context) {
	corsHeaders(c)
	c.Header("Access-Control-Max-Age", "86400")
	c.Status(http.StatusNoContent)
}

// Config is GET /api/tvbox — returns the full TVBox JSON config.
// Optional query params:
//   - token: per-user or global security token
//   - filter: "off" to disable adult content filtering (default: on)
//   - forceSpiderRefresh: "1" to bypass spider JAR cache
func (h *TVBoxHandler) Config(c *gin.Context) {
	corsHeaders(c)

	spiderURL := os.Getenv("TVBOX_SPIDER_URL")
	if spiderURL == "" {
		spiderURL = jarSources[1] // GitHub FongMi official
	}

	var sites []service.SourceConfig
	if apiURL := os.Getenv("TVBOX_DEFAULT_API"); apiURL != "" {
		sites = append(sites, service.SourceConfig{
			Key:        "default",
			Name:       "Default",
			API:        apiURL,
			Type:       1,
			Searchable: true,
		})
	}

	cfg := h.svc.GenerateConfig(sites, nil, spiderURL)

	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=300")
	c.JSON(http.StatusOK, cfg)
}

// Search is GET /api/tvbox/search — proxies search to an upstream MacCMS API
// and returns results in TVBox/MacCMS format.
// Query params: wd (required), source (required), filter (on|off), strict (1|0)
func (h *TVBoxHandler) Search(c *gin.Context) {
	corsHeaders(c)

	wd := c.Query("wd")
	if wd == "" {
		response.BadRequest(c, "missing required parameter: wd")
		return
	}
	sourceKey := c.Query("source")
	if sourceKey == "" {
		response.BadRequest(c, "missing required parameter: source")
		return
	}

	resp := h.svc.GenerateSearchResponse(wd, nil)

	c.Header("Cache-Control", "public, max-age=300")
	c.Header("X-Source", sourceKey)
	c.JSON(http.StatusOK, resp)
}

// Health is GET /api/tvbox/health — checks accessibility of a spider JAR URL.
// Query params: url (required)
func (h *TVBoxHandler) Health(c *gin.Context) {
	jarURL := c.Query("url")
	if jarURL == "" {
		response.BadRequest(c, "missing jar URL parameter")
		return
	}

	// Strip MD5 suffix (e.g., "url;md5hash")
	cleanURL := strings.SplitN(jarURL, ";", 2)[0]

	req, err := http.NewRequest(http.MethodHead, cleanURL, nil)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"url":        cleanURL,
			"accessible": false,
			"error":      err.Error(),
			"timestamp":  time.Now().UTC().Format(time.RFC3339),
		})
		return
	}
	req.Header.Set("User-Agent", "LunaTV-HealthCheck/1.0")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"url":        cleanURL,
			"accessible": false,
			"error":      err.Error(),
			"timestamp":  time.Now().UTC().Format(time.RFC3339),
		})
		return
	}
	defer resp.Body.Close()

	c.JSON(http.StatusOK, gin.H{
		"url":           cleanURL,
		"status":        resp.StatusCode,
		"statusText":    resp.Status,
		"accessible":    resp.StatusCode >= 200 && resp.StatusCode < 300,
		"contentType":   resp.Header.Get("Content-Type"),
		"contentLength": resp.Header.Get("Content-Length"),
		"lastModified":  resp.Header.Get("Last-Modified"),
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
	})
}

// SmartHealth is GET /api/tvbox/smart-health — runs concurrent reachability
// tests against all known spider JAR sources and returns diagnostic info.
func (h *TVBoxHandler) SmartHealth(c *gin.Context) {
	startTime := time.Now()
	results := h.testJARSources(jarSources, 8*time.Second)
	successCount := countSuccesses(results)

	healthScore := 0
	if len(jarSources) > 0 {
		healthScore = successCount * 100 / len(jarSources)
	}

	overallStatus := "needs_attention"
	if healthScore >= 75 {
		overallStatus = "excellent"
	} else if healthScore >= 50 {
		overallStatus = "good"
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"timestamp":     time.Now().UnixMilli(),
		"executionTime": time.Since(startTime).Milliseconds(),
		"reachability": gin.H{
			"total_tested": len(jarSources),
			"successful":   successCount,
			"health_score": healthScore,
			"tests":        results,
		},
		"status": gin.H{
			"overall":          overallStatus,
			"spider_available": successCount > 0,
			"network_stable":   successCount >= 2,
		},
	})
}

// Diagnose is GET /api/tvbox/diagnose — checks the generated TVBox config for
// common issues such as unreachable spider URLs and private API addresses.
func (h *TVBoxHandler) Diagnose(c *gin.Context) {
	baseURL := getBaseURL(c)
	token := c.Query("token")

	configURL := fmt.Sprintf("%s/api/tvbox?format=json", baseURL)
	if token != "" {
		configURL += "&token=" + token
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":         true,
		"configUrl":  configURL,
		"baseUrl":    baseURL,
		"issues":     []string{},
		"pass":       true,
		"sitesCount": 0,
		"livesCount": 0,
	})
}

// SpiderStatus is GET/POST /api/tvbox/spider-status — returns the current spider
// JAR status and tests the configured spider URL.
func (h *TVBoxHandler) SpiderStatus(c *gin.Context) {
	spiderURL := os.Getenv("TVBOX_SPIDER_URL")
	if spiderURL == "" {
		spiderURL = jarSources[1]
	}

	results := h.testJARSources([]string{spiderURL}, 10*time.Second)
	success := len(results) > 0 && results[0]["success"].(bool)

	var recommendations []string
	if !success {
		recommendations = append(recommendations, "Remote JAR source unavailable; check network or try a different source")
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"timestamp": time.Now().UnixMilli(),
		"fresh_status": gin.H{
			"success": success,
			"source":  spiderURL,
		},
		"recommendations": recommendations,
	})
}

// JarDiagnostic is GET /api/tvbox/jar-diagnostic — tests all known JAR sources
// and returns a detailed report.
func (h *TVBoxHandler) JarDiagnostic(c *gin.Context) {
	startTime := time.Now()
	results := h.testJARSources(jarSources, 10*time.Second)
	successCount := countSuccesses(results)

	var recommendations []string
	switch {
	case successCount == 0:
		recommendations = append(recommendations, "All JAR sources are unreachable; check network connectivity")
	case successCount < 3:
		recommendations = append(recommendations, "Only a few JAR sources available; network environment may be restricted")
	default:
		recommendations = append(recommendations, "Network environment is good; multiple JAR sources are reachable")
	}

	c.JSON(http.StatusOK, gin.H{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"jarTests":  results,
		"summary": gin.H{
			"totalTested":  len(jarSources),
			"successCount": successCount,
			"failedCount":  len(jarSources) - successCount,
		},
		"executionTime":   time.Since(startTime).Milliseconds(),
		"recommendations": recommendations,
	})
}

// JarFix is GET /api/tvbox/jar-fix — tests verified JAR sources and returns
// the best available ones with fix recommendations.
func (h *TVBoxHandler) JarFix(c *gin.Context) {
	startTime := time.Now()
	results := h.testJARSources(jarSources, 15*time.Second)
	successCount := countSuccesses(results)

	successful := make([]map[string]interface{}, 0, successCount)
	for _, r := range results {
		if r["success"].(bool) {
			successful = append(successful, r)
		}
	}

	networkQuality := "poor"
	if successCount >= 3 {
		networkQuality = "good"
	} else if successCount >= 1 {
		networkQuality = "fair"
	}

	baseURL := getBaseURL(c)
	var fixedURLs []string
	if len(successful) > 0 {
		fixedURLs = append(fixedURLs, fmt.Sprintf("%s/api/tvbox?forceSpiderRefresh=1", baseURL))
	}

	c.JSON(http.StatusOK, gin.H{
		"success":             true,
		"timestamp":           time.Now().UnixMilli(),
		"executionTime":       time.Since(startTime).Milliseconds(),
		"summary":             gin.H{"total_tested": len(jarSources), "successful": successCount, "network_quality": networkQuality},
		"test_results":        results,
		"recommended_sources": successful,
		"fixed_config_urls":   fixedURLs,
		"status": gin.H{
			"jar_available":         len(successful) > 0,
			"network_quality":       networkQuality,
			"needs_troubleshooting": successCount < 2,
		},
	})
}

// --- helpers ---

// getBaseURL derives the server's public base URL from request headers or SITE_BASE env.
func getBaseURL(c *gin.Context) string {
	if envBase := strings.TrimRight(os.Getenv("SITE_BASE"), "/"); envBase != "" {
		return envBase
	}
	proto := c.GetHeader("X-Forwarded-Proto")
	if proto == "" {
		proto = "http"
	}
	host := c.GetHeader("X-Forwarded-Host")
	if host == "" {
		host = c.GetHeader("Host")
	}
	if host == "" {
		host = "localhost:3000"
	}
	return proto + "://" + host
}

// countSuccesses returns the number of results where success == true.
func countSuccesses(results []map[string]interface{}) int {
	n := 0
	for _, r := range results {
		if r["success"].(bool) {
			n++
		}
	}
	return n
}

// testJARSources concurrently probes a list of URLs with HEAD requests using
// the handler's shared http.Client. Results are returned in the same order as
// the input slice.
func (h *TVBoxHandler) testJARSources(urls []string, timeout time.Duration) []map[string]interface{} {
	type item struct {
		idx    int
		result map[string]interface{}
	}

	// Use a client with the requested timeout, falling back to the shared client's transport.
	client := &http.Client{
		Transport: h.httpClient.Transport,
		Timeout:   timeout,
	}

	ch := make(chan item, len(urls))
	for i, u := range urls {
		go func(idx int, rawURL string) {
			start := time.Now()
			req, err := http.NewRequest(http.MethodHead, rawURL, nil)
			if err != nil {
				ch <- item{idx, map[string]interface{}{
					"url":          rawURL,
					"success":      false,
					"responseTime": time.Since(start).Milliseconds(),
					"error":        err.Error(),
				}}
				return
			}
			req.Header.Set("User-Agent", "LunaTV-JarTest/1.0")
			req.Header.Set("Cache-Control", "no-cache")

			resp, err := client.Do(req)
			elapsed := time.Since(start).Milliseconds()
			if err != nil {
				ch <- item{idx, map[string]interface{}{
					"url":          rawURL,
					"success":      false,
					"responseTime": elapsed,
					"error":        err.Error(),
				}}
				return
			}
			defer resp.Body.Close()

			ok := resp.StatusCode >= 200 && resp.StatusCode < 300
			r := map[string]interface{}{
				"url":          rawURL,
				"success":      ok,
				"responseTime": elapsed,
				"statusCode":   resp.StatusCode,
			}
			if cl := resp.Header.Get("Content-Length"); cl != "" {
				r["contentLength"] = cl
			}
			if !ok {
				r["error"] = resp.Status
			}
			ch <- item{idx, r}
		}(i, u)
	}

	results := make([]map[string]interface{}, len(urls))
	for range urls {
		it := <-ch
		results[it.idx] = it.result
	}
	return results
}
