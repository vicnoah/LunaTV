package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"moontv/internal/service"
)

// ReleaseCalendarHandler handles release-calendar HTTP endpoints.
type ReleaseCalendarHandler struct{}

// NewReleaseCalendarHandler creates a ReleaseCalendarHandler.
func NewReleaseCalendarHandler() *ReleaseCalendarHandler {
	return &ReleaseCalendarHandler{}
}

// Get handles GET /api/release-calendar.
// Requires authentication (enforced by the router middleware).
// Query params: type, region, genre, dateFrom, dateTo, limit, offset, refresh.
func (h *ReleaseCalendarHandler) Get(c *gin.Context) {
	q := service.CalendarQuery{
		Type:     c.Query("type"),
		Region:   c.Query("region"),
		Genre:    c.Query("genre"),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			q.Limit = l
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			q.Offset = o
		}
	}

	refresh := c.Query("refresh") == "true" || c.Query("nocache") != ""
	q.ForceRefresh = refresh

	// Validate type parameter.
	if q.Type != "" && q.Type != "movie" && q.Type != "tv" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type 参数必须是 movie 或 tv"})
		return
	}
	if q.Offset < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "offset 不能为负数"})
		return
	}

	result, err := service.GetReleaseCalendar(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "获取发布日历失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// Refresh handles POST /api/release-calendar.
// Requires admin authentication (enforced by the router middleware).
// Forces a re-scrape and returns the updated item count.
func (h *ReleaseCalendarHandler) Refresh(c *gin.Context) {
	q := service.CalendarQuery{ForceRefresh: true}

	result, err := service.GetReleaseCalendar(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "刷新发布日历缓存失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "发布日历缓存已刷新",
		"itemCount": result.Total,
	})
}
