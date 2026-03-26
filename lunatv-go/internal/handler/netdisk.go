package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"moontv/pkg/response"
)

// NetdiskHandler proxies cloud-storage search requests to a PanSou-compatible service.
type NetdiskHandler struct {
	pansouURL  string
	httpClient *http.Client
}

// NewNetdiskHandler creates a new NetdiskHandler.
// The PanSou service URL is read from the PANSOU_URL environment variable;
// it defaults to the public so.252035.xyz endpoint.
func NewNetdiskHandler() *NetdiskHandler {
	pansouURL := os.Getenv("PANSOU_URL")
	if pansouURL == "" {
		pansouURL = "https://so.252035.xyz"
	}
	return &NetdiskHandler{
		pansouURL:  pansouURL,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// RegisterNetdiskRoutes registers netdisk routes on the given router group.
// All routes require authentication.
func RegisterNetdiskRoutes(rg *gin.RouterGroup) {
	h := NewNetdiskHandler()
	rg.GET("/netdisk/search", h.Search)
}

// Search is GET /api/netdisk/search
// Query params:
//   - q (required): search keyword
func (h *NetdiskHandler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		response.BadRequest(c, "missing required parameter: q")
		return
	}

	payload := map[string]interface{}{
		"kw":  q,
		"res": "merge",
		"cloud_types": []string{
			"baidu", "aliyun", "quark", "tianyi", "uc",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		response.InternalError(c, "failed to encode search request")
		return
	}

	reqURL := fmt.Sprintf("%s/api/search", h.pansouURL)
	req, err := http.NewRequest(http.MethodPost, reqURL, bytes.NewReader(body))
	if err != nil {
		response.InternalError(c, "failed to create upstream request")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "LunaTV/1.0")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		response.Error(c, http.StatusBadGateway, fmt.Sprintf("netdisk search failed: %v", err))
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		response.InternalError(c, "failed to read upstream response")
		return
	}

	if resp.StatusCode != http.StatusOK {
		response.Error(c, http.StatusBadGateway, fmt.Sprintf("upstream returned %d", resp.StatusCode))
		return
	}

	var upstreamResult map[string]interface{}
	if err := json.Unmarshal(respBody, &upstreamResult); err != nil {
		response.InternalError(c, "failed to parse upstream response")
		return
	}

	data := map[string]interface{}{
		"source":    "pansou",
		"query":     q,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	if d, ok := upstreamResult["data"].(map[string]interface{}); ok {
		data["total"] = d["total"]
		data["merged_by_type"] = d["merged_by_type"]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}
