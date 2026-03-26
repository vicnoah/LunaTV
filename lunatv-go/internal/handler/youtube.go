package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"moontv/internal/service"
	"moontv/pkg/response"
)

// YouTubeHandler proxies YouTube Data API v3 searches.
type YouTubeHandler struct {
	svc *service.YouTubeService
}

// NewYouTubeHandler constructs a YouTubeHandler.
func NewYouTubeHandler() *YouTubeHandler {
	return &YouTubeHandler{svc: service.NewYouTubeService()}
}

// RegisterYouTubeRoutes registers YouTube routes on the given router group.
// All routes require authentication (handled by the auth middleware applied to
// the parent group).
func RegisterYouTubeRoutes(rg *gin.RouterGroup) {
	h := NewYouTubeHandler()
	rg.GET("/youtube/search", h.Search)
}

// Search is GET /api/youtube/search
// Query params:
//   - q (required): search query
//   - maxResults (optional): maximum number of results (default 20, max 50)
func (h *YouTubeHandler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		response.BadRequest(c, "missing required parameter: q")
		return
	}

	maxResults := 20
	if mr := c.Query("maxResults"); mr != "" {
		if n, err := strconv.Atoi(mr); err == nil && n > 0 {
			maxResults = n
		}
	}

	data, err := h.svc.Search(q, maxResults)
	if err != nil {
		response.Error(c, http.StatusBadGateway, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
		"query":   q,
	})
}
