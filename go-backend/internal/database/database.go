package database

import (
	"fmt"
	"lunatv-be/internal/config"
	"lunatv-be/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Connect initializes the database connection.
func Connect(cfg config.DatabaseConfig) error {
	var (
		db  *gorm.DB
		err error
	)

	switch cfg.Type {
	case "sqlite":
		db, err = gorm.Open(sqlite.Open(cfg.ConnectionString), &gorm.Config{})
	case "mysql":
		db, err = gorm.Open(mysql.Open(cfg.ConnectionString), &gorm.Config{})
	case "postgresql":
		db, err = gorm.Open(postgres.Open(cfg.ConnectionString), &gorm.Config{})
	default:
		return fmt.Errorf("unsupported database type: %s", cfg.Type)
	}

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate the User schema
	if err = db.AutoMigrate(&models.User{}); err != nil {
		return fmt.Errorf("failed to auto-migrate database: %w", err)
	}

	DB = db
	return nil
}
