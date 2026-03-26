package service

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"
)

const (
	calendarBaseURL = "https://g.manmankan.com/dy2013"
	calendarTimeout = 30 * time.Second
)

// CalendarItem represents a single upcoming movie or TV release.
type CalendarItem struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Type        string `json:"type"` // "movie" | "tv"
	ReleaseDate string `json:"releaseDate"`
	Region      string `json:"region"`
	Genre       string `json:"genre"`
	Director    string `json:"director"`
	Actors      string `json:"actors"`
	CoverURL    string `json:"coverUrl,omitempty"`
}

// CalendarFilters holds the distinct filter values available in the calendar.
type CalendarFilters struct {
	Regions []string `json:"regions"`
	Genres  []string `json:"genres"`
}

// CalendarResult is the payload returned by GetReleaseCalendar.
type CalendarResult struct {
	Items   []CalendarItem  `json:"items"`
	Total   int             `json:"total"`
	HasMore bool            `json:"hasMore"`
	Filters CalendarFilters `json:"filters"`
}

// CalendarQuery carries optional filter / pagination parameters.
type CalendarQuery struct {
	Type       string // "movie" | "tv" | ""
	Region     string
	Genre      string
	DateFrom   string
	DateTo     string
	Limit      int
	Offset     int
	ForceRefresh bool
}

// GetReleaseCalendar fetches the upcoming-release calendar from ManManKan and
// applies the filters and pagination specified by q.
func GetReleaseCalendar(q CalendarQuery) (*CalendarResult, error) {
	items, err := scrapeCalendar()
	if err != nil {
		return nil, fmt.Errorf("release calendar scrape: %w", err)
	}

	// Apply filters.
	filtered := make([]CalendarItem, 0, len(items))
	for _, item := range items {
		if q.Type != "" && item.Type != q.Type {
			continue
		}
		if q.Region != "" && q.Region != "全部" && !strings.Contains(item.Region, q.Region) {
			continue
		}
		if q.Genre != "" && q.Genre != "全部" && !strings.Contains(item.Genre, q.Genre) {
			continue
		}
		if q.DateFrom != "" && item.ReleaseDate < q.DateFrom {
			continue
		}
		if q.DateTo != "" && item.ReleaseDate > q.DateTo {
			continue
		}
		filtered = append(filtered, item)
	}

	total := len(filtered)
	start := q.Offset
	if start > total {
		start = total
	}
	end := total
	hasMore := false
	if q.Limit > 0 {
		end = start + q.Limit
		if end > total {
			end = total
		}
		hasMore = end < total
	}
	page := filtered[start:end]

	filters := buildFilters(items)
	return &CalendarResult{
		Items:   page,
		Total:   total,
		HasMore: hasMore,
		Filters: filters,
	}, nil
}

// scrapeCalendar downloads and parses both the movie and TV pages.
func scrapeCalendar() ([]CalendarItem, error) {
	client := &http.Client{Timeout: calendarTimeout}

	movies, err := fetchPage(client, calendarBaseURL+"/index.php?m=movie&type=1")
	if err != nil {
		slog.Warn("release-calendar: movie page fetch failed", "err", err)
	}

	tvShows, err := fetchPage(client, calendarBaseURL+"/index.php?m=tv&type=2")
	if err != nil {
		slog.Warn("release-calendar: tv page fetch failed", "err", err)
	}

	all := make([]CalendarItem, 0, len(movies)+len(tvShows))
	all = append(all, movies...)
	all = append(all, tvShows...)
	return all, nil
}

// fetchPage downloads one HTML page and parses CalendarItems from it.
func fetchPage(client *http.Client, url string) ([]CalendarItem, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	itemType := "movie"
	if strings.Contains(url, "m=tv") {
		itemType = "tv"
	}
	return parseCalendarHTML(string(body), itemType), nil
}

var (
	reTitleBlock  = regexp.MustCompile(`(?s)<dl class="(?:twlist-block|dis_none)">(.*?)</dl>`)
	reTitleText   = regexp.MustCompile(`<div class="dd-d1"><a[^>]*title="[^"]*">([^<]+)</a></div>`)
	reDirector    = regexp.MustCompile(`<div>导演：([^<]*)</div>`)
	reRegion      = regexp.MustCompile(`<div>地区：<a[^>]*>([^<]*)</a></div>`)
	reGenreBlock  = regexp.MustCompile(`<div>类型：(.*?)</div>`)
	reDate        = regexp.MustCompile(`<div>上映时间：(\d{4}/\d{2}/\d{2})</div>`)
	reActors      = regexp.MustCompile(`<div class="dd-d2">主演：(.*?)</div>`)
	reDataOrig    = regexp.MustCompile(`<img[^>]*data-original=["']([^"']+)["']`)
	reSrc         = regexp.MustCompile(`<img[^>]*src=["']([^"']+)["']`)
	reStripTags   = regexp.MustCompile(`<[^>]+>`)
	reSanitizeID  = regexp.MustCompile(`[^\w\x{4e00}-\x{9fa5}]`)
)

// parseCalendarHTML extracts CalendarItems from raw HTML, keeping only
// entries whose release date is today or in the future.
func parseCalendarHTML(html, itemType string) []CalendarItem {
	today := time.Now().Format("2006-01-02")
	var items []CalendarItem

	for _, m := range reTitleBlock.FindAllStringSubmatch(html, -1) {
		block := m[1]

		titleM := reTitleText.FindStringSubmatch(block)
		dateM := reDate.FindStringSubmatch(block)
		if titleM == nil || dateM == nil {
			continue
		}

		title := strings.TrimSpace(titleM[1])
		dateStr := strings.ReplaceAll(dateM[1], "/", "-")
		if dateStr < today {
			continue
		}

		director := "未知"
		if dm := reDirector.FindStringSubmatch(block); dm != nil {
			director = strings.TrimSpace(dm[1])
		}

		region := "未知"
		if rm := reRegion.FindStringSubmatch(block); rm != nil {
			region = strings.TrimSpace(rm[1])
		}

		genre := "未知"
		if gm := reGenreBlock.FindStringSubmatch(block); gm != nil {
			genre = strings.TrimSpace(reStripTags.ReplaceAllString(gm[1], ""))
		}

		actors := "未知"
		if am := reActors.FindStringSubmatch(block); am != nil {
			actors = strings.TrimSpace(reStripTags.ReplaceAllString(am[1], ""))
		}

		coverURL := ""
		if dm := reDataOrig.FindStringSubmatch(block); dm != nil {
			coverURL = dm[1]
		} else if sm := reSrc.FindStringSubmatch(block); sm != nil {
			coverURL = sm[1]
		}
		if strings.HasPrefix(coverURL, "//") {
			coverURL = "https:" + coverURL
		}
		if strings.Contains(coverURL, "loadimg.gif") {
			coverURL = ""
		}

		id := itemType + "_" + dateStr + "_" + sanitizeID(title)
		items = append(items, CalendarItem{
			ID:          id,
			Title:       title,
			Type:        itemType,
			ReleaseDate: dateStr,
			Region:      region,
			Genre:       genre,
			Director:    director,
			Actors:      actors,
			CoverURL:    coverURL,
		})
	}

	return items
}

// sanitizeID removes special characters for use in item IDs.
func sanitizeID(s string) string {
	result := reSanitizeID.ReplaceAllString(s, "")
	if len(result) > 20 {
		result = result[:20]
	}
	return result
}

// buildFilters derives distinct region and genre values from all items.
func buildFilters(items []CalendarItem) CalendarFilters {
	regionSet := map[string]bool{}
	genreSet := map[string]bool{}
	for _, item := range items {
		regionSet[item.Region] = true
		for _, g := range strings.Split(item.Genre, "/") {
			g = strings.TrimSpace(g)
			if g != "" {
				genreSet[g] = true
			}
		}
	}
	filters := CalendarFilters{}
	for r := range regionSet {
		filters.Regions = append(filters.Regions, r)
	}
	for g := range genreSet {
		filters.Genres = append(filters.Genres, g)
	}
	return filters
}

// MarshalCalendarResult serialises a CalendarResult to JSON bytes.
func MarshalCalendarResult(r *CalendarResult) ([]byte, error) {
	return json.Marshal(r)
}
