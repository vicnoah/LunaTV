package service

// TVBoxConfig is the root config format served to TVBox clients.
type TVBoxConfig struct {
	Spider    string        `json:"spider"`
	WAP       string        `json:"wap,omitempty"`
	Lives     []TVBoxLive   `json:"lives,omitempty"`
	Sites     []TVBoxSite   `json:"sites"`
	Rules     []interface{} `json:"rules,omitempty"`
	Ads       []interface{} `json:"ads,omitempty"`
}

// TVBoxSite represents one video source in TVBox format.
// type: 0=XML, 1=JSON/MacCMS, 3=Spider/JAR
type TVBoxSite struct {
	Key        string `json:"key"`
	Name       string `json:"name"`
	Type       int    `json:"type"`
	API        string `json:"api"`
	Searchable int    `json:"searchable"`
	Filterable int    `json:"filterable"`
	Ext        string `json:"ext,omitempty"`
}

// TVBoxLive represents a live-TV group in TVBox format.
type TVBoxLive struct {
	Group    string         `json:"group"`
	Channels []TVBoxChannel `json:"channels,omitempty"`
	URL      string         `json:"url,omitempty"`
}

// TVBoxChannel is a single live channel entry.
type TVBoxChannel struct {
	Name string   `json:"name"`
	URLs []string `json:"urls"`
}

// SourceConfig is the internal admin representation of a video source.
type SourceConfig struct {
	Key        string `json:"key"`
	Name       string `json:"name"`
	API        string `json:"api"`
	Detail     string `json:"detail,omitempty"`
	Type       int    `json:"type"`       // 0=XML, 1=JSON, 3=JAR
	Searchable bool   `json:"searchable"` // whether TVBox can search it
	IsAdult    bool   `json:"is_adult"`
	Disabled   bool   `json:"disabled"`
}

// LiveChannelConfig is the internal representation of a live channel group.
type LiveChannelConfig struct {
	Group string              `json:"group"`
	URL   string              `json:"url,omitempty"`
	Items []LiveChannelItem   `json:"items,omitempty"`
}

// LiveChannelItem is a single live channel entry.
type LiveChannelItem struct {
	Name string   `json:"name"`
	URLs []string `json:"urls"`
}

// TVBoxService generates TVBox-compatible configuration from admin config sources.
type TVBoxService struct{}

// NewTVBoxService creates a new TVBoxService.
func NewTVBoxService() *TVBoxService {
	return &TVBoxService{}
}

// GenerateConfig builds the TVBox JSON config from admin config sources.
func (s *TVBoxService) GenerateConfig(
	sources []SourceConfig,
	liveChannels []LiveChannelConfig,
	spiderURL string,
) *TVBoxConfig {
	sites := make([]TVBoxSite, 0, len(sources))
	for _, src := range sources {
		if src.Disabled {
			continue
		}
		searchable := 0
		if src.Searchable {
			searchable = 1
		}
		sites = append(sites, TVBoxSite{
			Key:        src.Key,
			Name:       src.Name,
			Type:       src.Type,
			API:        src.API,
			Searchable: searchable,
			Filterable: 1,
		})
	}

	lives := make([]TVBoxLive, 0, len(liveChannels))
	for _, lg := range liveChannels {
		live := TVBoxLive{
			Group: lg.Group,
			URL:   lg.URL,
		}
		for _, ch := range lg.Items {
			live.Channels = append(live.Channels, TVBoxChannel{
				Name: ch.Name,
				URLs: ch.URLs,
			})
		}
		lives = append(lives, live)
	}

	return &TVBoxConfig{
		Spider: spiderURL,
		Sites:  sites,
		Lives:  lives,
	}
}

// GenerateSearchResponse formats search results into the TVBox/MacCMS search response structure.
// Results is a slice of maps with keys: id, title, poster, note, year, area, actor,
// director, desc, type_name, episodes.
func (s *TVBoxService) GenerateSearchResponse(
	query string,
	results []map[string]interface{},
) map[string]interface{} {
	list := make([]map[string]interface{}, 0, len(results))
	for _, r := range results {
		item := map[string]interface{}{
			"vod_id":       strVal(r, "id"),
			"vod_name":     strVal(r, "title"),
			"vod_pic":      strVal(r, "poster"),
			"vod_remarks":  strVal(r, "note"),
			"vod_year":     strVal(r, "year"),
			"vod_area":     strVal(r, "area"),
			"vod_actor":    strVal(r, "actor"),
			"vod_director": strVal(r, "director"),
			"vod_content":  strVal(r, "desc"),
			"type_name":    strVal(r, "type_name"),
		}
		if eps, ok := r["episodes"]; ok && eps != nil {
			item["vod_play_from"] = "LunaTV"
			item["vod_play_url"] = eps
		} else {
			item["vod_play_from"] = ""
			item["vod_play_url"] = ""
		}
		list = append(list, item)
	}

	return map[string]interface{}{
		"code":      1,
		"msg":       "success",
		"page":      1,
		"pagecount": 1,
		"limit":     len(list),
		"total":     len(list),
		"list":      list,
	}
}

// strVal safely reads a string value from a map, returning "" if missing or wrong type.
func strVal(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
