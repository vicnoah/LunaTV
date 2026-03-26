package model

import "time"

// CacheEntry is a generic key/value cache with optional TTL.
// The Key column mirrors any Redis cache key used in the original app.
type CacheEntry struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Key       string     `gorm:"uniqueIndex;size:512;not null" json:"key"`
	Value     string     `gorm:"type:text" json:"value"`
	ExpiresAt *time.Time `gorm:"index" json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// IsExpired returns true if the entry has a TTL that has already passed.
func (c *CacheEntry) IsExpired() bool {
	return c.ExpiresAt != nil && c.ExpiresAt.Before(time.Now())
}
