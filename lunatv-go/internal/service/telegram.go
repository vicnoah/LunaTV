package service

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"
)

const telegramAPIBase = "https://api.telegram.org"

// SendTelegramMessage delivers text to a Telegram chat via the Bot API.
// chatID may be a numeric ID (as a string) or a @username.
func SendTelegramMessage(botToken, chatID, message string) error {
	url := fmt.Sprintf("%s/bot%s/sendMessage", telegramAPIBase, botToken)

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       message,
		"parse_mode": "Markdown",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("telegram: marshal payload: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("telegram: send message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("telegram: send message returned HTTP %d", resp.StatusCode)
	}
	return nil
}

// SendMagicLink delivers a one-time login link to the given Telegram chat.
func SendMagicLink(botToken, chatID, magicLink string) error {
	message := fmt.Sprintf("🔐 *LunaTV 登录链接*\n\n点击下方链接完成登录：\n\n%s\n\n⏰ 此链接将在 5 分钟后过期", magicLink)
	return SendTelegramMessage(botToken, chatID, message)
}

// VerifyTelegramWidgetData validates data submitted by the Telegram Login
// Widget using the standard HMAC-SHA256 verification algorithm.
//
// The algorithm:
//  1. Remove the "hash" key from data; keep its value.
//  2. Sort remaining key-value pairs alphabetically by key.
//  3. Join them as "key=value\n" (no trailing newline after the last pair).
//  4. Compute HMAC-SHA256 with SHA256(botToken) as the key.
//  5. Compare hex digest against the provided hash (constant-time).
func VerifyTelegramWidgetData(data map[string]string, botToken string) bool {
	providedHash, ok := data["hash"]
	if !ok {
		return false
	}

	// Build sorted "key=value" pairs without the hash entry.
	keys := make([]string, 0, len(data)-1)
	for k := range data {
		if k != "hash" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, k+"="+data[k])
	}
	checkString := strings.Join(parts, "\n")

	// Key = SHA-256(botToken)
	h := sha256.New()
	h.Write([]byte(botToken))
	secretKey := h.Sum(nil)

	mac := hmac.New(sha256.New, secretKey)
	mac.Write([]byte(checkString))
	expectedHash := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(expectedHash), []byte(providedHash))
}

// SetWebhook registers webhookURL as the destination for bot updates.
func SetWebhook(botToken, webhookURL string) error {
	url := fmt.Sprintf("%s/bot%s/setWebhook", telegramAPIBase, botToken)

	payload := map[string]interface{}{
		"url":             webhookURL,
		"allowed_updates": []string{"message"},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("telegram: marshal setWebhook payload: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("telegram: setWebhook: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("telegram: setWebhook returned HTTP %d", resp.StatusCode)
	}
	return nil
}

// GetWebhookURL returns the currently registered webhook URL for the bot.
// Returns an empty string when no webhook is set.
func GetWebhookURL(botToken string) (string, error) {
	url := fmt.Sprintf("%s/bot%s/getWebhookInfo", telegramAPIBase, botToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return "", fmt.Errorf("telegram: getWebhookInfo: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		OK     bool `json:"ok"`
		Result struct {
			URL string `json:"url"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("telegram: decode getWebhookInfo: %w", err)
	}
	return result.Result.URL, nil
}
