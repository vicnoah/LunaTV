package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"moontv/internal/service"
)

// CronHandler handles cron-job HTTP endpoints.
type CronHandler struct {
	svc *service.CronService
}

// NewCronHandler creates a CronHandler backed by svc.
func NewCronHandler(svc *service.CronService) *CronHandler {
	return &CronHandler{svc: svc}
}

// Run handles GET /api/cron.
// It fires off the cron job in a goroutine so that the HTTP response is
// returned immediately (matching the original Next.js behaviour). No
// authentication is required — the endpoint is typically invoked by an
// external scheduler (e.g. Vercel Cron or a server crontab).
func (h *CronHandler) Run(c *gin.Context) {
	go func() {
		if err := h.svc.Run(); err != nil {
			// Already logged inside Run(); nothing more to do here.
			_ = err
		}
	}()
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Stats handles GET /api/cron/stats.
// Returns the statistics from the most recent cron execution. Returns 404
// when no run has completed yet.
func (h *CronHandler) Stats(c *gin.Context) {
	stats := h.svc.GetStats()
	if stats.LastRun.IsZero() {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "No cron statistics available yet. Please run cron job first.",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cron statistics retrieved successfully",
		"stats":   stats,
	})
}
