package model

import "time"

// SearchHistory records each keyword a user has searched.
// The service layer enforces a max of 20 entries per user (oldest deleted first),
// matching the Redis sorted-list behaviour.
type SearchHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	Keyword   string    `gorm:"size:256;not null" json:"keyword"`
	CreatedAt time.Time `json:"created_at"`
}
