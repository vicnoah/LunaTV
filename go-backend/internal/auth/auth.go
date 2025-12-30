package auth

import (
	"fmt"
	"lunatv-be/internal/config"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims defines the structure of the JWT claims.
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a new JWT for a given user ID.
func GenerateJWT(userID uint, cfg config.JWTConfig) (string, error) {
	lifespan, err := time.ParseDuration(cfg.TokenLifespan)
	if err != nil {
		return "", fmt.Errorf("invalid token lifespan duration: %w", err)
	}

	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(lifespan)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.Secret))
}

// ValidateJWT parses and validates a JWT string.
// If the token is valid, it returns the claims.
func ValidateJWT(tokenString string, cfg config.JWTConfig) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Make sure the signing method is what we expect
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
