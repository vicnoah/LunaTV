package auth

import (
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/model"
)

// Required rejects unauthenticated or banned requests.
func Required(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := authenticate(c, db)
		if err != nil || user == nil {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		if user.Banned {
			c.JSON(403, gin.H{"error": "Account banned"})
			c.Abort()
			return
		}
		setUserContext(c, user)
		c.Next()
	}
}

// Optional loads the authenticated user when a valid token is present but
// allows the request through without one.
func Optional(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, _ := authenticate(c, db)
		if user != nil {
			setUserContext(c, user)
		}
		c.Next()
	}
}

// AdminRequired requires the owner or admin role.
func AdminRequired(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := authenticate(c, db)
		if err != nil || user == nil {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		if user.Role != RoleOwner && user.Role != RoleAdmin {
			c.JSON(403, gin.H{"error": "Forbidden"})
			c.Abort()
			return
		}
		setUserContext(c, user)
		c.Next()
	}
}

// OwnerRequired requires the owner role.
func OwnerRequired(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := authenticate(c, db)
		if err != nil || user == nil {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		if user.Role != RoleOwner {
			c.JSON(403, gin.H{"error": "Forbidden"})
			c.Abort()
			return
		}
		setUserContext(c, user)
		c.Next()
	}
}

// authenticate extracts and validates the JWT from the request, then loads the
// corresponding user from the database. Returns (nil, nil) when no token is
// present so callers can distinguish "no token" from "bad token".
func authenticate(c *gin.Context, db *gorm.DB) (*model.User, error) {
	token := extractToken(c)
	if token == "" {
		return nil, nil
	}
	claims, err := ParseToken(token)
	if err != nil {
		return nil, err
	}
	var user model.User
	if err := db.First(&user, claims.UserID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// extractToken retrieves the bearer token from the Authorization header or the
// "token" query parameter (TVBox clients that cannot set custom headers).
func extractToken(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		return strings.TrimPrefix(header, "Bearer ")
	}
	if token := c.Query("token"); token != "" {
		return token
	}
	return ""
}
