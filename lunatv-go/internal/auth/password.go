package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"

	"golang.org/x/crypto/scrypt"
)

// Scrypt parameters must match the original TypeScript implementation so that
// hashes created by the Node.js app can be verified here (and vice-versa).
//
// Original values (src/lib/password.ts):
//   N = 16384, r = 8, p = 1, keyLen = 64 bytes
const (
	scryptN    = 16384
	scryptR    = 8
	scryptP    = 1
	saltLen    = 16
	keyLen     = 64 // 64 bytes — matches KEY_LENGTH in the TypeScript source
)

// HashPassword hashes a password using scrypt and returns "salt:hash" where
// both components are lower-case hex strings.
func HashPassword(password string) (string, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generating salt: %w", err)
	}
	hash, err := scrypt.Key([]byte(password), salt, scryptN, scryptR, scryptP, keyLen)
	if err != nil {
		return "", fmt.Errorf("hashing password: %w", err)
	}
	return hex.EncodeToString(salt) + ":" + hex.EncodeToString(hash), nil
}

// VerifyPassword checks password against a stored scrypt hash (format "salt:hash").
// It also accepts plain-text stored values for legacy compatibility.
func VerifyPassword(password, stored string) (bool, error) {
	parts := strings.SplitN(stored, ":", 2)
	if len(parts) != 2 {
		// Legacy plain-text format: direct constant-time comparison.
		return subtle.ConstantTimeCompare([]byte(password), []byte(stored)) == 1, nil
	}

	// Validate that the parts look like a proper scrypt record before trying to
	// decode, so callers get a clear error rather than a hex decode failure.
	if len(parts[0]) != saltLen*2 || len(parts[1]) != keyLen*2 {
		return false, errors.New("invalid hash format")
	}

	salt, err := hex.DecodeString(parts[0])
	if err != nil {
		return false, fmt.Errorf("decoding salt: %w", err)
	}
	expectedHash, err := hex.DecodeString(parts[1])
	if err != nil {
		return false, fmt.Errorf("decoding hash: %w", err)
	}
	hash, err := scrypt.Key([]byte(password), salt, scryptN, scryptR, scryptP, keyLen)
	if err != nil {
		return false, fmt.Errorf("hashing password: %w", err)
	}
	return subtle.ConstantTimeCompare(hash, expectedHash) == 1, nil
}

// VerifyMasterPassword checks a password against the PASSWORD environment
// variable used in single-user (localStorage) mode.
func VerifyMasterPassword(password string) bool {
	masterPassword := os.Getenv("PASSWORD")
	if masterPassword == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(password), []byte(masterPassword)) == 1
}
