package handler

import (
	"crypto/rand"
	"math/big"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"moontv/internal/model"
)

// RegisterAdminUser wires up user-management admin routes.
func RegisterAdminUser(rg *gin.RouterGroup, db *gorm.DB) {
	h := &adminUserHandler{db: db}
	rg.POST("/user", requireAdmin(db), h.UserAction)
	rg.POST("/user-tvbox-token", requireAdmin(db), h.GenerateTVBoxToken)
	rg.DELETE("/user-tvbox-token", requireAdmin(db), h.DeleteTVBoxToken)
}

type adminUserHandler struct{ db *gorm.DB }

// UserAction handles POST /api/admin/user — action-based user management.
func (h *adminUserHandler) UserAction(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}

	action, _ := body["action"].(string)
	if action == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 action 参数"})
		return
	}

	callerName, _, ok := callerUsername(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	operatorRole := callerRole(cfg, callerName)
	if operatorRole == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	// userGroup and batchUpdateUserGroups don't need a targetUsername.
	targetUsername, _ := body["targetUsername"].(string)
	if targetUsername == "" && action != "userGroup" && action != "batchUpdateUserGroups" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少目标用户名"})
		return
	}

	selfActions := map[string]bool{"changePassword": true, "deleteUser": true, "updateUserApis": true,
		"userGroup": true, "updateUserGroups": true, "batchUpdateUserGroups": true}
	if !selfActions[action] && callerName == targetUsername {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无法对自己进行此操作"})
		return
	}

	var targetIdx int = -1
	for i, u := range cfg.UserConfig.Users {
		if u.Username == targetUsername {
			targetIdx = i
			break
		}
	}

	switch action {
	case "add":
		if targetIdx != -1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "用户已存在"})
			return
		}
		pw, _ := body["targetPassword"].(string)
		if pw == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少目标用户密码"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器错误"})
			return
		}
		dbUser := model.User{
			Username:     targetUsername,
			PasswordHash: string(hash),
			Role:         "user",
		}
		if err := h.db.Create(&dbUser).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建用户失败"})
			return
		}
		newEntry := model.UserEntry{Username: targetUsername, Role: "user"}
		if ug, _ := body["userGroup"].(string); ug != "" {
			newEntry.Tags = []string{ug}
		}
		cfg.UserConfig.Users = append(cfg.UserConfig.Users, newEntry)

	case "ban":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role == "admin" && operatorRole != "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅站长可封禁管理员"})
			return
		}
		cfg.UserConfig.Users[targetIdx].Banned = true

	case "unban":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role == "admin" && operatorRole != "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅站长可操作管理员"})
			return
		}
		cfg.UserConfig.Users[targetIdx].Banned = false

	case "setAdmin":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role == "admin" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "该用户已是管理员"})
			return
		}
		if operatorRole != "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅站长可设置管理员"})
			return
		}
		cfg.UserConfig.Users[targetIdx].Role = "admin"

	case "cancelAdmin":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role != "admin" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "目标用户不是管理员"})
			return
		}
		if operatorRole != "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅站长可取消管理员"})
			return
		}
		cfg.UserConfig.Users[targetIdx].Role = "user"

	case "changePassword":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		newPw, _ := body["targetPassword"].(string)
		if newPw == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少新密码"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role == "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "无法修改站长密码"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role == "admin" && operatorRole != "owner" && callerName != targetUsername {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅站长可修改其他管理员密码"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(newPw), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器错误"})
			return
		}
		h.db.Model(&model.User{}).Where("username = ?", targetUsername).Update("password_hash", string(hash))

	case "deleteUser":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		if callerName == targetUsername {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不能删除自己"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role == "admin" && operatorRole != "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅站长可删除管理员"})
			return
		}
		h.db.Where("username = ?", targetUsername).Delete(&model.User{})
		cfg.UserConfig.Users = append(cfg.UserConfig.Users[:targetIdx], cfg.UserConfig.Users[targetIdx+1:]...)

	case "updateUserApis":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		if cfg.UserConfig.Users[targetIdx].Role == "admin" && operatorRole != "owner" && callerName != targetUsername {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅站长可配置其他管理员的采集源"})
			return
		}
		enabledApis := toStringSlice(body["enabledApis"])
		if len(enabledApis) > 0 {
			cfg.UserConfig.Users[targetIdx].EnabledApis = enabledApis
		} else {
			cfg.UserConfig.Users[targetIdx].EnabledApis = nil
		}
		if v, ok := body["showAdultContent"].(bool); ok {
			cfg.UserConfig.Users[targetIdx].ShowAdultContent = &v
		}

	case "userGroup":
		groupAction, _ := body["groupAction"].(string)
		groupName, _ := body["groupName"].(string)
		if cfg.UserConfig.Tags == nil {
			cfg.UserConfig.Tags = []model.UserTagEntry{}
		}
		switch groupAction {
		case "add":
			for _, t := range cfg.UserConfig.Tags {
				if t.Name == groupName {
					c.JSON(http.StatusBadRequest, gin.H{"error": "用户组已存在"})
					return
				}
			}
			newTag := model.UserTagEntry{Name: groupName, EnabledApis: toStringSlice(body["enabledApis"])}
			if v, ok := body["showAdultContent"].(bool); ok {
				newTag.ShowAdultContent = &v
			}
			cfg.UserConfig.Tags = append(cfg.UserConfig.Tags, newTag)
		case "edit":
			found := false
			for i, t := range cfg.UserConfig.Tags {
				if t.Name == groupName {
					cfg.UserConfig.Tags[i].EnabledApis = toStringSlice(body["enabledApis"])
					if v, ok := body["showAdultContent"].(bool); ok {
						cfg.UserConfig.Tags[i].ShowAdultContent = &v
					}
					found = true
					break
				}
			}
			if !found {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户组不存在"})
				return
			}
		case "delete":
			idx := -1
			for i, t := range cfg.UserConfig.Tags {
				if t.Name == groupName {
					idx = i
					break
				}
			}
			if idx == -1 {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户组不存在"})
				return
			}
			cfg.UserConfig.Tags = append(cfg.UserConfig.Tags[:idx], cfg.UserConfig.Tags[idx+1:]...)
			for i := range cfg.UserConfig.Users {
				newTags := make([]string, 0)
				for _, t := range cfg.UserConfig.Users[i].Tags {
					if t != groupName {
						newTags = append(newTags, t)
					}
				}
				cfg.UserConfig.Users[i].Tags = newTags
			}
		}

	case "updateUserGroups":
		if targetIdx == -1 {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		groups := toStringSlice(body["userGroups"])
		if len(groups) > 0 {
			cfg.UserConfig.Users[targetIdx].Tags = groups
		} else {
			cfg.UserConfig.Users[targetIdx].Tags = nil
		}

	case "batchUpdateUserGroups":
		usernames := toStringSlice(body["usernames"])
		if len(usernames) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名列表"})
			return
		}
		groups := toStringSlice(body["userGroups"])
		for _, un := range usernames {
			for i, u := range cfg.UserConfig.Users {
				if u.Username == un {
					if len(groups) > 0 {
						cfg.UserConfig.Users[i].Tags = groups
					} else {
						cfg.UserConfig.Users[i].Tags = nil
					}
				}
			}
		}

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "未知操作"})
		return
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GenerateTVBoxToken handles POST /api/admin/user-tvbox-token.
func (h *adminUserHandler) GenerateTVBoxToken(c *gin.Context) {
	var body struct {
		Username            string   `json:"username"`
		TVBoxEnabledSources []string `json:"tvboxEnabledSources"`
		RegenerateToken     bool     `json:"regenerateToken"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	callerName, _, ok := callerUsername(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	role := callerRole(cfg, callerName)
	if role != "owner" && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	targetIdx := -1
	for i, u := range cfg.UserConfig.Users {
		if u.Username == body.Username {
			targetIdx = i
			break
		}
	}
	if targetIdx == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if role == "admin" && (cfg.UserConfig.Users[targetIdx].Role == "owner" || cfg.UserConfig.Users[targetIdx].Role == "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify admin or owner users"})
		return
	}

	if body.RegenerateToken || cfg.UserConfig.Users[targetIdx].TVBoxToken == "" {
		cfg.UserConfig.Users[targetIdx].TVBoxToken = generateToken(32)
	}
	if body.TVBoxEnabledSources != nil {
		cfg.UserConfig.Users[targetIdx].TVBoxEnabledSources = body.TVBoxEnabledSources
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"token":          cfg.UserConfig.Users[targetIdx].TVBoxToken,
		"enabledSources": cfg.UserConfig.Users[targetIdx].TVBoxEnabledSources,
	})
}

// DeleteTVBoxToken handles DELETE /api/admin/user-tvbox-token.
func (h *adminUserHandler) DeleteTVBoxToken(c *gin.Context) {
	username := c.Query("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	callerName, _, ok := callerUsername(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	cfg, err := adminConfigFromCtx(c, h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
		return
	}

	role := callerRole(cfg, callerName)
	if role != "owner" && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	for i, u := range cfg.UserConfig.Users {
		if u.Username == username {
			if role == "admin" && (u.Role == "owner" || u.Role == "admin") {
				c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify admin or owner users"})
				return
			}
			cfg.UserConfig.Users[i].TVBoxToken = ""
			cfg.UserConfig.Users[i].TVBoxEnabledSources = nil
			break
		}
	}

	if err := saveAdminConfig(h.db, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// generateToken creates a random alphanumeric string of the given length.
func generateToken(length int) string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := range result {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		result[i] = chars[n.Int64()]
	}
	return string(result)
}

// toStringSlice converts an interface{} that might be []interface{} to []string.
func toStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}
	arr, ok := v.([]interface{})
	if !ok {
		return nil
	}
	result := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok {
			result = append(result, s)
		}
	}
	return result
}
