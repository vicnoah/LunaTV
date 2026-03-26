package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	mu          sync.Mutex
	counts      map[string]int
	resets      map[string]time.Time
	limit       int
	window      time.Duration
	lastEvict   time.Time
	evictPeriod time.Duration
}

// RateLimit returns Gin middleware that enforces a per-IP request rate limit.
// At most limit requests are allowed within each window. Excess requests
// receive HTTP 429.
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	rl := &rateLimiter{
		counts:      make(map[string]int),
		resets:      make(map[string]time.Time),
		limit:       limit,
		window:      window,
		lastEvict:   time.Now(),
		evictPeriod: 10 * window, // evict stale entries every 10 windows
	}
	return rl.handler()
}

func (rl *rateLimiter) handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := getClientIP(c)

		rl.mu.Lock()
		now := time.Now()

		// Periodically evict entries whose window has long since expired to
		// prevent unbounded map growth when many distinct IPs are seen.
		if now.Sub(rl.lastEvict) > rl.evictPeriod {
			for k, resetAt := range rl.resets {
				if now.After(resetAt) {
					delete(rl.counts, k)
					delete(rl.resets, k)
				}
			}
			rl.lastEvict = now
		}

		// Reset the counter when the window has expired.
		if resetAt, ok := rl.resets[ip]; !ok || now.After(resetAt) {
			rl.counts[ip] = 0
			rl.resets[ip] = now.Add(rl.window)
		}

		rl.counts[ip]++
		count := rl.counts[ip]
		rl.mu.Unlock()

		if count > rl.limit {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			c.Abort()
			return
		}

		c.Next()
	}
}
