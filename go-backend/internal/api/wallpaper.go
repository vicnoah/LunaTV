package api

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

// WallpaperResponse defines the structure of the JSON response for the wallpaper API.
type WallpaperResponse struct {
	URL       string `json:"url"`
	Copyright string `json:"copyright"`
	Title     string `json:"title"`
	Source    string `json:"source"`
}

// BingImage represents the structure of an image object from the Bing API response.
type BingImage struct {
	URL       string `json:"url"`
	Copyright string `json:"copyright"`
	Title     string `json:"title"`
}

// BingAPIResponse defines the structure of the top-level JSON object from the Bing API.
type BingAPIResponse struct {
	Images []BingImage `json:"images"`
}

// handleGetWallpaper fetches a random wallpaper from Bing or a fallback source.
func handleGetWallpaper(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET method is allowed", http.StatusMethodNotAllowed)
		return
	}

	// Use the picsum fallback as a default in case of any errors
	sendPicsumResponse := func() {
		picsumURL := fmt.Sprintf("https://picsum.photos/1920/1080?random=%d", time.Now().UnixNano())
		response := WallpaperResponse{
			URL:       picsumURL,
			Copyright: "Lorem Picsum - Free random images",
			Title:     "Random Photo",
			Source:    "picsum",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}

	// 70% chance to use Bing
	if rand.Float32() < 0.7 {
		// Fetch from Bing
		randomIdx := rand.Intn(8) // 0-7
		bingURL := fmt.Sprintf("https://www.bing.com/HPImageArchive.aspx?format=js&idx=%d&n=1&mkt=zh-CN", randomIdx)

		resp, err := http.Get(bingURL)
		if err != nil {
			sendPicsumResponse()
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			sendPicsumResponse()
			return
		}

		var bingResponse BingAPIResponse
		if err := json.NewDecoder(resp.Body).Decode(&bingResponse); err != nil {
			sendPicsumResponse()
			return
		}

		if len(bingResponse.Images) > 0 {
			image := bingResponse.Images[0]
			response := WallpaperResponse{
				URL:       "https://www.bing.com" + image.URL,
				Copyright: image.Copyright,
				Title:     image.Title,
				Source:    "bing",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	// Fallback to picsum if Bing fails or is not chosen
	sendPicsumResponse()
}
