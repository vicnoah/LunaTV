package main

import (
	"log/slog"
	"os"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"moontv"
	"moontv/internal/auth"
	"moontv/internal/config"
	"moontv/internal/model"
	"moontv/internal/router"
	"moontv/internal/service"
)

func main() {
	_ = godotenv.Load()

	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg := config.Load()

	db, err := connectDB(cfg)
	if err != nil {
		slog.Error("failed to connect database", "error", err)
		os.Exit(1)
	}

	if err := model.AutoMigrate(db); err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}

	ensureOwnerAccount(db, cfg)

	r := router.SetupRouter(db, moontv.StaticFiles)

	cronSvc := service.NewCronService(db)
	go func() {
		time.Sleep(5 * time.Second)
		if err := cronSvc.Run(); err != nil {
			slog.Error("initial cron run failed", "error", err)
		}
		ticker := time.NewTicker(1 * time.Hour)
		for range ticker.C {
			if err := cronSvc.Run(); err != nil {
				slog.Error("cron run failed", "error", err)
			}
		}
	}()

	slog.Info("MoonTV server starting", "port", cfg.Port, "version", "7.0.0")
	if err := r.Run(":" + cfg.Port); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}

// connectDB opens a GORM connection based on the configured driver.
func connectDB(cfg *config.Config) (*gorm.DB, error) {
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}
	switch cfg.DBDriver {
	case "mysql":
		return gorm.Open(mysql.Open(cfg.DatabaseURL), gormConfig)
	case "postgres":
		return gorm.Open(postgres.Open(cfg.DatabaseURL), gormConfig)
	default:
		return gorm.Open(sqlite.Open(cfg.DatabaseURL), gormConfig)
	}
}

// ensureOwnerAccount creates the owner user if USERNAME/PASSWORD are set and the
// account does not already exist in the database.
func ensureOwnerAccount(db *gorm.DB, cfg *config.Config) {
	if cfg.Username == "" || cfg.Password == "" {
		return
	}

	var user model.User
	if db.Where("username = ?", cfg.Username).First(&user).Error == nil {
		return
	}

	hash, err := auth.HashPassword(cfg.Password)
	if err != nil {
		slog.Error("failed to hash owner password", "error", err)
		return
	}

	owner := model.User{
		Username:     cfg.Username,
		PasswordHash: hash,
		Role:         "owner",
	}
	if err := db.Create(&owner).Error; err != nil {
		slog.Error("failed to create owner account", "error", err)
	} else {
		slog.Info("created owner account", "username", cfg.Username)
	}
}
