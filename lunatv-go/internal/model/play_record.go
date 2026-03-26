package model

import "time"

// PlayRecord stores a user's watch history entry.
// Composite unique index on (user_id, source_key, video_id) mirrors
// the Redis key pattern: u:{userName}:play:{source}+{id}.
type PlayRecord struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	UserID           uint      `gorm:"index;not null;uniqueIndex:idx_play_unique" json:"user_id"`
	SourceKey        string    `gorm:"size:128;not null;uniqueIndex:idx_play_unique" json:"source"`
	VideoID          string    `gorm:"size:256;not null;uniqueIndex:idx_play_unique" json:"id"`
	Title            string    `gorm:"size:512" json:"title"`
	SourceName       string    `gorm:"size:256" json:"source_name"`
	Cover            string    `gorm:"size:1024" json:"cover"`
	Year             string    `gorm:"size:16" json:"year"`
	EpisodeIndex     int       `gorm:"default:1" json:"index"`
	TotalEpisodes    int       `gorm:"default:1" json:"total_episodes"`
	OriginalEpisodes int       `gorm:"default:0" json:"original_episodes,omitempty"`
	PlayTime         float64   `gorm:"default:0" json:"play_time"`
	TotalTime        float64   `gorm:"default:0" json:"total_time"`
	SearchTitle      string    `gorm:"size:512" json:"search_title"`
	Remarks          string    `gorm:"size:256" json:"remarks,omitempty"`
	DoubanID         int64     `gorm:"default:0" json:"douban_id,omitempty"`
	ContentType      string    `gorm:"size:32" json:"type,omitempty"`
	SavedAt          time.Time `json:"save_time"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (PlayRecord) TableName() string { return "play_records" }
