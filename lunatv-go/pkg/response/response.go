package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OK sends a 200 OK JSON response.
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, data)
}

// Error sends an error JSON response with the given HTTP status code.
func Error(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

// Unauthorized sends a 401 Unauthorized response.
func Unauthorized(c *gin.Context) {
	Error(c, http.StatusUnauthorized, "Unauthorized")
}

// Forbidden sends a 403 Forbidden response.
func Forbidden(c *gin.Context) {
	Error(c, http.StatusForbidden, "Forbidden")
}

// BadRequest sends a 400 Bad Request response.
func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, message)
}

// InternalError sends a 500 Internal Server Error response.
func InternalError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, message)
}
