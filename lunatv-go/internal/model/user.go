package model

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// User represents a LunaTV account.
// Role is one of: owner, admin, user.
type User struct {
	ID                  uint           `gorm:"primaryKey" json:"id"`
	Username            string         `gorm:"uniqueIndex;size:64;not null" json:"username"`
	PasswordHash        string         `gorm:"size:256;not null" json:"-"`
	Role                string         `gorm:"size:16;default:user" json:"role"`
	Banned              bool           `gorm:"default:false" json:"banned"`
	Tags                datatypes.JSON `gorm:"type:json" json:"tags"`
	EnabledApis         datatypes.JSON `gorm:"type:json" json:"enabled_apis"`
	ShowAdultContent    bool           `gorm:"default:false" json:"show_adult_content"`
	OIDCSub             string         `gorm:"size:256;index" json:"oidc_sub,omitempty"`
	TVBoxToken          string         `gorm:"size:128" json:"tvbox_token,omitempty"`
	TVBoxSources        datatypes.JSON `gorm:"type:json" json:"tvbox_sources,omitempty"`
	EmbyConfig          datatypes.JSON `gorm:"type:json" json:"emby_config,omitempty"`
	LoginCount          int            `gorm:"default:0" json:"login_count"`
	LastLoginAt         *time.Time     `json:"last_login_at,omitempty"`
	FirstLoginAt        *time.Time     `json:"first_login_at,omitempty"`
	ContinuousLoginDays int            `gorm:"default:0" json:"continuous_login_days"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}
