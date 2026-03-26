package model

import (
	"time"

	"gorm.io/datatypes"
)

// SkipSegment is stored as JSON within SkipConfig.Segments.
// It mirrors the TypeScript SkipSegment interface from types.ts.
type SkipSegment struct {
	Start           float64 `json:"start"`
	End             float64 `json:"end"`
	Type            string  `json:"type"` // opening | ending
	Title           string  `json:"title,omitempty"`
	AutoSkip        bool    `json:"autoSkip"`
	AutoNextEpisode bool    `json:"autoNextEpisode,omitempty"`
	Mode            string  `json:"mode,omitempty"` // absolute | remaining
	RemainingTime   float64 `json:"remainingTime,omitempty"`
}

// SkipConfig stores per-user, per-video intro/outro skip segments.
// Composite unique index on (user_id, source_key, video_id) mirrors
// the Redis key pattern: u:{userName}:skip:{source}+{id}.
type SkipConfig struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index;not null;uniqueIndex:idx_skip_unique" json:"user_id"`
	SourceKey string         `gorm:"size:128;not null;uniqueIndex:idx_skip_unique" json:"source"`
	VideoID   string         `gorm:"size:256;not null;uniqueIndex:idx_skip_unique" json:"id"`
	Title     string         `gorm:"size:512" json:"title"`
	Segments  datatypes.JSON `gorm:"type:json;not null" json:"segments"`
	UpdatedAt time.Time      `json:"updated_time"`
	CreatedAt time.Time      `json:"created_at"`
}
