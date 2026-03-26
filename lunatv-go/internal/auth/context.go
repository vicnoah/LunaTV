package auth

import (
	"github.com/gin-gonic/gin"

	"moontv/internal/model"
)

// Role constants mirror the values stored in model.User.Role.
const (
	RoleOwner = "owner"
	RoleAdmin = "admin"
	RoleUser  = "user"
)

const (
	userKey     = "auth_user"
	usernameKey = "auth_username"
)

func setUserContext(c *gin.Context, user *model.User) {
	c.Set(userKey, user)
	c.Set(usernameKey, user.Username)
}

func GetUser(c *gin.Context) *model.User {
	if v, exists := c.Get(userKey); exists {
		if user, ok := v.(*model.User); ok {
			return user
		}
	}
	return nil
}

func GetUsername(c *gin.Context) string {
	return c.GetString(usernameKey)
}

func IsOwner(c *gin.Context) bool {
	user := GetUser(c)
	return user != nil && user.Role == RoleOwner
}

func IsAdmin(c *gin.Context) bool {
	user := GetUser(c)
	return user != nil && (user.Role == RoleAdmin || user.Role == RoleOwner)
}
