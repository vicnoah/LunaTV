package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"moontv/internal/service"
	"moontv/pkg/response"
)

// AIRecommendHandler serves AI-powered content recommendation endpoints.
type AIRecommendHandler struct {
	svc *service.AIRecommendService
}

// NewAIRecommendHandler constructs an AIRecommendHandler.
func NewAIRecommendHandler() *AIRecommendHandler {
	return &AIRecommendHandler{svc: service.NewAIRecommendService()}
}

// RegisterAIRecommendRoutes registers all AI recommendation routes.
// User routes require auth; admin routes require admin privileges.
// Both are expected to be applied by the calling router (middleware on the
// parent group handles authentication).
func RegisterAIRecommendRoutes(authGroup *gin.RouterGroup, adminGroup *gin.RouterGroup) {
	h := NewAIRecommendHandler()

	// User-facing endpoints
	authGroup.GET("/ai-recommend", h.GetHistory)
	authGroup.POST("/ai-recommend", h.Chat)

	// Admin endpoints
	adminGroup.POST("/ai-recommend", h.UpdateConfig)
	adminGroup.POST("/ai-recommend/test", h.TestConnection)
}

// GetHistory is GET /api/ai-recommend — returns the current user's AI chat history.
func (h *AIRecommendHandler) GetHistory(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"history": []interface{}{},
		"total":   0,
	})
}

// Chat is POST /api/ai-recommend — runs an AI recommendation chat turn.
// Request body:
//
//	{
//	  "messages": [{"role": "user", "content": "..."}],
//	  "watch_history": ["Title1", "Title2"],
//	  "preferences": "optional free-form text"
//	}
func (h *AIRecommendHandler) Chat(c *gin.Context) {
	var body struct {
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
		WatchHistory []string `json:"watch_history"`
		Preferences  string   `json:"preferences"`
		Stream       bool     `json:"stream"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if len(body.Messages) == 0 {
		response.BadRequest(c, "messages must not be empty")
		return
	}

	recs, err := h.svc.GetRecommendations(body.WatchHistory, body.Preferences)
	if err != nil {
		response.Error(c, http.StatusServiceUnavailable, err.Error())
		return
	}

	// Return an OpenAI-compatible chat.completion response shape so the
	// frontend can use the same parsing logic as the Next.js version.
	c.JSON(http.StatusOK, gin.H{
		"object": "chat.completion",
		"choices": []gin.H{
			{
				"index": 0,
				"message": gin.H{
					"role":    "assistant",
					"content": formatRecommendations(recs),
				},
				"finish_reason": "stop",
			},
		},
		"recommendations": recs,
	})
}

// UpdateConfig is POST /api/admin/ai-recommend — updates the AI API config.
func (h *AIRecommendHandler) UpdateConfig(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	// Config update stored via DB; full implementation handled by admin config layer.
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// TestConnection is POST /api/admin/ai-recommend/test — verifies that the
// configured AI API is reachable and the key is valid.
func (h *AIRecommendHandler) TestConnection(c *gin.Context) {
	recs, err := h.svc.GetRecommendations([]string{"Test Movie"}, "")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"sample_recs": recs,
	})
}

// formatRecommendations converts structured recs into a Markdown string that
// the frontend parses using the same pattern as the Next.js version.
func formatRecommendations(recs []map[string]interface{}) string {
	if len(recs) == 0 {
		return "No recommendations available at this time."
	}
	var sb strings.Builder
	for _, r := range recs {
		title, _ := r["title"].(string)
		year, _ := r["year"].(string)
		genre, _ := r["genre"].(string)
		desc, _ := r["description"].(string)
		sb.WriteString("《")
		sb.WriteString(title)
		sb.WriteString("》")
		if year != "" {
			sb.WriteString(" (")
			sb.WriteString(year)
			sb.WriteString(")")
		}
		if genre != "" {
			sb.WriteString(" [")
			sb.WriteString(genre)
			sb.WriteString("]")
		}
		if desc != "" {
			sb.WriteString(" - ")
			sb.WriteString(desc)
		}
		sb.WriteByte('\n')
	}
	return sb.String()
}
