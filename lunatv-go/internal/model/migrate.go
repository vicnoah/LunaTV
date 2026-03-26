package model

import "gorm.io/gorm"

// AutoMigrate creates or updates all tables to match the current model definitions.
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&User{},
		&PlayRecord{},
		&Favorite{},
		&SearchHistory{},
		&SkipConfig{},
		&AdminConfigModel{},
		&CacheEntry{},
	)
}
