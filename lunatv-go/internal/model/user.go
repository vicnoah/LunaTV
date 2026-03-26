package model

import (
	"time"

	"gorm.io/gorm"
)

// User represents a LunaTV account.
// Role is one of: owner, admin, user.
type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Username     string         `gorm:"uniqueIndex;size:64;not null" json:"username"`
	PasswordHash string         `gorm:"size:256;not null" json:"-"`
	Role         string         `gorm:"size:16;default:user" json:"role"`
	Banned       bool           `gorm:"default:false" json:"banned"`
	OIDCSub      string         `gorm:"size:256;index" json:"oidc_sub,omitempty"`
	LoginCount   int            `gorm:"default:0" json:"login_count"`
	LastLoginAt  *time.Time     `json:"last_login_at,omitempty"`
	FirstLoginAt *time.Time     `json:"first_login_at,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
