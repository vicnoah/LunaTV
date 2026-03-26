package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

const youtubeAPIBase = "https://www.googleapis.com/youtube/v3"

// YouTubeService proxies searches to the YouTube Data API v3.
type YouTubeService struct {
	apiKey     string
	httpClient *http.Client
}

// NewYouTubeService constructs a YouTubeService from the YOUTUBE_API_KEY env var.
func NewYouTubeService() *YouTubeService {
	return &YouTubeService{
		apiKey:     os.Getenv("YOUTUBE_API_KEY"),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// Search queries the YouTube Data API v3 search endpoint.
// Returns the raw decoded JSON body on success.
func (s *YouTubeService) Search(query string, maxResults int) (map[string]interface{}, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("YouTube API key not configured")
	}
	if maxResults <= 0 {
		maxResults = 20
	}
	if maxResults > 50 {
		maxResults = 50
	}

	params := url.Values{}
	params.Set("key", s.apiKey)
	params.Set("q", query)
	params.Set("type", "video")
	params.Set("part", "snippet")
	params.Set("maxResults", fmt.Sprintf("%d", maxResults))

	reqURL := fmt.Sprintf("%s/search?%s", youtubeAPIBase, params.Encode())

	resp, err := s.httpClient.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("YouTube API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading YouTube response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("YouTube API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decoding YouTube response: %w", err)
	}
	return result, nil
}
