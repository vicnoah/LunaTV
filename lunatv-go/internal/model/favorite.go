package model

import "time"

// Favorite stores a user's saved/bookmarked video.
// Composite unique index on (user_id, source_key, video_id) mirrors
// the Redis key pattern: u:{userName}:fav:{source}+{id}.
type Favorite struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        uint      `gorm:"index;not null;uniqueIndex:idx_fav_unique" json:"user_id"`
	SourceKey     string    `gorm:"size:128;not null;uniqueIndex:idx_fav_unique" json:"source"`
	VideoID       string    `gorm:"size:256;not null;uniqueIndex:idx_fav_unique" json:"id"`
	Title         string    `gorm:"size:512" json:"title"`
	SourceName    string    `gorm:"size:256" json:"source_name"`
	Year          string    `gorm:"size:16" json:"year"`
	Cover         string    `gorm:"size:1024" json:"cover"`
	TotalEpisodes int       `gorm:"default:0" json:"total_episodes"`
	SearchTitle   string    `gorm:"size:512" json:"search_title"`
	Origin        string    `gorm:"size:32" json:"origin,omitempty"`
	ContentType   string    `gorm:"size:64" json:"type,omitempty"`
	ReleaseDate   string    `gorm:"size:16" json:"releaseDate,omitempty"`
	Remarks       string    `gorm:"size:256" json:"remarks,omitempty"`
	SavedAt       time.Time `json:"save_time"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
