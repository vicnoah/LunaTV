package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// AIRecommendService calls an OpenAI-compatible chat completions API to generate
// content recommendations based on a user's watch history.
type AIRecommendService struct {
	apiURL string
	apiKey string
	model  string
	client *http.Client
}

// NewAIRecommendService constructs an AIRecommendService from environment variables.
// Expected env vars: AI_API_URL, AI_API_KEY, AI_MODEL (defaults to "gpt-4o-mini").
func NewAIRecommendService() *AIRecommendService {
	model := os.Getenv("AI_MODEL")
	if model == "" {
		model = "gpt-4o-mini"
	}
	apiURL := os.Getenv("AI_API_URL")
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1"
	}
	return &AIRecommendService{
		apiURL: strings.TrimRight(apiURL, "/"),
		apiKey: os.Getenv("AI_API_KEY"),
		model:  model,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model     string        `json:"model"`
	Messages  []chatMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens,omitempty"`
}

type chatChoice struct {
	Message chatMessage `json:"message"`
}

type chatResponse struct {
	Choices []chatChoice `json:"choices"`
}

// GetRecommendations calls the AI API to get content recommendations based on
// the user's watch history and optional preference string.
// It returns a slice of recommendation maps with keys: title, year, genre, description.
func (s *AIRecommendService) GetRecommendations(watchHistory []string, preferences string) ([]map[string]interface{}, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("AI API key not configured")
	}

	prompt := s.buildPrompt(watchHistory, preferences)

	payload := chatRequest{
		Model: s.model,
		Messages: []chatMessage{
			{
				Role:    "system",
				Content: "You are a helpful movie and TV show recommendation assistant. Recommend titles in the format: 《Title》 (Year) [Genre] - Description",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens: 1024,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshalling AI request: %w", err)
	}

	endpoint := s.apiURL
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint = endpoint + "/chat/completions"
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating AI request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("AI API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading AI response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("decoding AI response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("AI returned no choices")
	}

	content := chatResp.Choices[0].Message.Content
	return parseRecommendations(content), nil
}

// buildPrompt constructs the user prompt from watch history and preferences.
func (s *AIRecommendService) buildPrompt(watchHistory []string, preferences string) string {
	var sb strings.Builder
	if len(watchHistory) > 0 {
		sb.WriteString("Based on my watch history:\n")
		for _, title := range watchHistory {
			sb.WriteString("- ")
			sb.WriteString(title)
			sb.WriteString("\n")
		}
	}
	if preferences != "" {
		sb.WriteString("\nMy preferences: ")
		sb.WriteString(preferences)
		sb.WriteString("\n")
	}
	sb.WriteString("\nPlease recommend 5 movies or TV shows I might enjoy.")
	return sb.String()
}

// parseRecommendations extracts structured recommendation data from the AI's text output.
// It looks for lines matching: 《Title》 (Year) [Genre] - Description
func parseRecommendations(content string) []map[string]interface{} {
	var recs []map[string]interface{}
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		start := strings.Index(line, "《")
		end := strings.Index(line, "》")
		if start < 0 || end < 0 || end <= start {
			continue
		}
		title := line[start+len("《") : end]
		rest := strings.TrimSpace(line[end+len("》"):])

		year := ""
		genre := ""
		description := ""

		if strings.HasPrefix(rest, "(") {
			closeP := strings.Index(rest, ")")
			if closeP > 0 {
				year = rest[1:closeP]
				rest = strings.TrimSpace(rest[closeP+1:])
			}
		}
		if strings.HasPrefix(rest, "[") {
			closeB := strings.Index(rest, "]")
			if closeB > 0 {
				genre = rest[1:closeB]
				rest = strings.TrimSpace(rest[closeB+1:])
			}
		}
		if strings.HasPrefix(rest, "-") {
			description = strings.TrimSpace(rest[1:])
		}

		if title != "" {
			recs = append(recs, map[string]interface{}{
				"title":       title,
				"year":        year,
				"genre":       genre,
				"description": description,
			})
		}
		if len(recs) >= 5 {
			break
		}
	}
	return recs
}
