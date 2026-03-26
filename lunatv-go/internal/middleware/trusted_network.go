package middleware

import (
	"encoding/json"
	"net"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/auth"
	"moontv/internal/model"
)

// TrustedNetwork returns middleware that auto-authenticates requests from
// trusted IP ranges without requiring a password. Trusted IPs are read from
// the TRUSTED_NETWORK_IPS environment variable (comma-separated CIDRs or
// exact IPs) and, optionally, from the admin config stored in db.
//
// When a request originates from a trusted IP and is not already
// authenticated, the middleware resolves (or creates) the owner account and
// injects it into the Gin context so downstream handlers see an authenticated
// user.
func TrustedNetwork(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip if already authenticated via JWT / session.
		if auth.GetUser(c) != nil {
			c.Next()
			return
		}

		clientIP := getClientIP(c)
		trustedRanges := getTrustedIPs(db)

		if isIPTrusted(clientIP, trustedRanges) {
			owner := getOrCreateOwner(db)
			if owner != nil {
				c.Set("auth_user", owner)
				c.Set("auth_username", owner.Username)
			}
		}

		c.Next()
	}
}

// getClientIP returns the real client IP, honouring X-Forwarded-For and
// X-Real-IP proxy headers before falling back to RemoteAddr.
func getClientIP(c *gin.Context) string {
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	if cfIP := c.GetHeader("CF-Connecting-IP"); cfIP != "" {
		return strings.TrimSpace(cfIP)
	}
	ip, _, err := net.SplitHostPort(c.Request.RemoteAddr)
	if err != nil {
		return c.Request.RemoteAddr
	}
	return ip
}

// isIPTrusted reports whether clientIP is covered by any entry in
// trustedRanges. Each entry may be a CIDR block or an exact IP address.
// The special value "*" matches any IP.
func isIPTrusted(clientIP string, trustedRanges []string) bool {
	ip := net.ParseIP(clientIP)
	if ip == nil {
		return false
	}
	for _, entry := range trustedRanges {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if entry == "*" {
			return true
		}
		if strings.Contains(entry, "/") {
			_, network, err := net.ParseCIDR(entry)
			if err == nil && network.Contains(ip) {
				return true
			}
		} else {
			if clientIP == entry {
				return true
			}
		}
	}
	return false
}

// getTrustedIPs aggregates trusted IP ranges from the TRUSTED_NETWORK_IPS
// environment variable and from the admin config row in db.
func getTrustedIPs(db *gorm.DB) []string {
	var ips []string

	// Environment variable takes precedence and is always included.
	if envIPs := os.Getenv("TRUSTED_NETWORK_IPS"); envIPs != "" {
		for _, ip := range strings.Split(envIPs, ",") {
			if trimmed := strings.TrimSpace(ip); trimmed != "" {
				ips = append(ips, trimmed)
			}
		}
	}

	// Also read from TrustedNetworkConfig stored in the admin_configs table.
	if db != nil {
		var cfg model.AdminConfigModel
		if err := db.Where("key = ?", "TrustedNetworkConfig").First(&cfg).Error; err == nil {
			var tnCfg struct {
				Enabled    bool     `json:"enabled"`
				TrustedIPs []string `json:"trustedIPs"`
			}
			if jsonErr := json.Unmarshal(cfg.Config, &tnCfg); jsonErr == nil && tnCfg.Enabled {
				ips = append(ips, tnCfg.TrustedIPs...)
			}
		}
	}

	return ips
}

// getOrCreateOwner returns the owner user from db, or nil when none exists.
func getOrCreateOwner(db *gorm.DB) *model.User {
	var owner model.User
	err := db.Where("role = ?", "owner").First(&owner).Error
	if err == nil {
		return &owner
	}
	// No owner found — return nil; caller will skip auto-login.
	return nil
}
