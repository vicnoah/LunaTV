package model

import "time"

// TelegramToken stores a short-lived login token for the Telegram magic-link flow.
type TelegramToken struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Token            string    `gorm:"uniqueIndex;size:128;not null" json:"token"`
	TelegramUsername string    `gorm:"size:128;not null" json:"telegram_username"`
	BaseURL          string    `gorm:"size:512" json:"base_url"`
	ExpiresAt        time.Time `json:"expires_at"`
	CreatedAt        time.Time `json:"created_at"`
}
