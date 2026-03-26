// Package service implements business-logic helpers for the LunaTV Go backend.
package service

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

// FetchConfigSubscription fetches a remote config subscription URL and returns
// the raw response body as a string. The TypeScript implementation decodes the
// response with bs58 (Base58); that step is handled by the caller (handler layer)
// which receives the raw content and forwards it to the frontend unchanged.
//
// If the remote URL returns a non-2xx status this function returns an error.
func FetchConfigSubscription(subscriptionURL string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(subscriptionURL)
	if err != nil {
		return "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("请求失败: %d %s", resp.StatusCode, resp.Status)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10 MB limit
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}
	return string(body), nil
}
