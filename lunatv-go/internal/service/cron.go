package service

import (
	"log/slog"
	"sync"
	"time"

	"gorm.io/gorm"
)

// CronService manages periodic maintenance tasks.
type CronService struct {
	db        *gorm.DB
	isRunning bool
	mu        sync.Mutex
	stats     CronStats
}

// CronStats holds the results of the most recent cron execution.
type CronStats struct {
	LastRun        time.Time `json:"last_run"`
	DurationMS     float64   `json:"duration_ms"`
	UsersCleanedUp int       `json:"users_cleaned_up"`
	RecordsUpdated int       `json:"records_updated"`
	Error          string    `json:"error,omitempty"`
}

// NewCronService creates a CronService backed by db.
func NewCronService(db *gorm.DB) *CronService {
	return &CronService{db: db}
}

// Run executes all maintenance tasks sequentially. It is a no-op when a run is
// already in progress (guards against concurrent scheduler invocations).
func (s *CronService) Run() error {
	s.mu.Lock()
	if s.isRunning {
		s.mu.Unlock()
		slog.Info("cron job skipped: already running")
		return nil
	}
	s.isRunning = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.isRunning = false
		s.mu.Unlock()
	}()

	start := time.Now()
	slog.Info("cron job started")

	stats := CronStats{LastRun: start}

	// 1. Cleanup inactive / soft-deleted users older than 30 days.
	cleaned, err := s.cleanupInactiveUsers()
	if err != nil {
		slog.Warn("cron: user cleanup failed", "err", err)
		stats.Error = err.Error()
	}
	stats.UsersCleanedUp = cleaned

	// 2. Refresh live channels (best-effort).
	if err := s.refreshLiveChannels(); err != nil {
		slog.Warn("cron: live channel refresh failed", "err", err)
	}

	// 3. Update ongoing series play records / episode counts.
	updated, err := s.updateOngoingSeriesRecords()
	if err != nil {
		slog.Warn("cron: records update failed", "err", err)
	}
	stats.RecordsUpdated = updated

	// 4. Cache cleanup.
	if err := s.cleanupCache(); err != nil {
		slog.Warn("cron: cache cleanup failed", "err", err)
	}

	stats.DurationMS = float64(time.Since(start).Milliseconds())
	slog.Info("cron job completed", "duration_ms", stats.DurationMS)

	s.mu.Lock()
	s.stats = stats
	s.mu.Unlock()

	return nil
}

// GetStats returns a snapshot of the most recent execution statistics.
func (s *CronService) GetStats() CronStats {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.stats
}

// cleanupInactiveUsers hard-deletes soft-deleted users whose deletion
// timestamp is older than 30 days.
func (s *CronService) cleanupInactiveUsers() (int, error) {
	cutoff := time.Now().Add(-30 * 24 * time.Hour)
	result := s.db.Exec(
		"DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < ?",
		cutoff,
	)
	if result.Error != nil {
		return 0, result.Error
	}
	return int(result.RowsAffected), nil
}

// refreshLiveChannels is a stub; real implementation would call the live
// channel refresh logic imported from another service package.
func (s *CronService) refreshLiveChannels() error {
	slog.Debug("cron: live channel refresh (stub)")
	return nil
}

// updateOngoingSeriesRecords is a stub; real implementation would iterate
// ongoing-series play records and update episode counts from configured
// scraper sources.
func (s *CronService) updateOngoingSeriesRecords() (int, error) {
	slog.Debug("cron: ongoing series records update (stub)")
	return 0, nil
}

// cleanupCache removes stale cache rows (e.g. release-calendar, video-info)
// that have exceeded their TTL.
func (s *CronService) cleanupCache() error {
	// Purge calendar cache entries older than 24 hours.
	result := s.db.Exec(
		"DELETE FROM cache_entries WHERE expires_at < ?",
		time.Now(),
	)
	if result.Error != nil {
		// Table may not exist in all deployments; log and continue.
		slog.Debug("cron: cache cleanup", "err", result.Error)
	}
	return nil
}
