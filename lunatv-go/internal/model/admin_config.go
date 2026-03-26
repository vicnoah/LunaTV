package model

import (
	"time"

	"gorm.io/datatypes"
)

// AdminConfigModel stores the full site configuration as a single JSON blob.
// There is always exactly one row with Key = "main".
type AdminConfigModel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Key       string         `gorm:"uniqueIndex;size:64;not null" json:"key"` // always "main"
	Config    datatypes.JSON `gorm:"type:json;not null" json:"config"`
	UpdatedAt time.Time      `json:"updated_at"`
	CreatedAt time.Time      `json:"created_at"`
}

func (AdminConfigModel) TableName() string { return "admin_configs" }

// AdminConfig mirrors the TypeScript AdminConfig interface (admin.types.ts).
type AdminConfig struct {
	ConfigSubscription   ConfigSubscription    `json:"ConfigSubscribtion"`
	ConfigFile           string                `json:"ConfigFile"`
	SiteConfig           SiteConfig            `json:"SiteConfig"`
	UserConfig           UserConfigSection     `json:"UserConfig"`
	SourceConfig         []SourceConfigItem    `json:"SourceConfig"`
	CustomCategories     []CustomCategory      `json:"CustomCategories"`
	LiveConfig           []LiveConfigItem      `json:"LiveConfig,omitempty"`
	NetDiskConfig        *NetDiskConfig        `json:"NetDiskConfig,omitempty"`
	AIRecommendConfig    *AIRecommendConfig    `json:"AIRecommendConfig,omitempty"`
	YouTubeConfig        *YouTubeConfig        `json:"YouTubeConfig,omitempty"`
	TVBoxSecurityConfig  *TVBoxSecurityConfig  `json:"TVBoxSecurityConfig,omitempty"`
	TVBoxProxyConfig     *ProxyConfig          `json:"TVBoxProxyConfig,omitempty"`
	VideoProxyConfig     *ProxyConfig          `json:"VideoProxyConfig,omitempty"`
	TelegramAuthConfig   *TelegramAuthConfig   `json:"TelegramAuthConfig,omitempty"`
	OIDCAuthConfig       *OIDCAuthConfig       `json:"OIDCAuthConfig,omitempty"`
	OIDCProviders        []OIDCProvider        `json:"OIDCProviders,omitempty"`
	ShortDramaConfig     *ShortDramaConfig     `json:"ShortDramaConfig,omitempty"`
	DownloadConfig       *DownloadConfig       `json:"DownloadConfig,omitempty"`
	WatchRoomConfig      *WatchRoomConfig      `json:"WatchRoomConfig,omitempty"`
	DoubanConfig         *DoubanConfig         `json:"DoubanConfig,omitempty"`
	CronConfig           *CronConfig           `json:"CronConfig,omitempty"`
	TrustedNetworkConfig *TrustedNetworkConfig `json:"TrustedNetworkConfig,omitempty"`
	DanmuApiConfig       *DanmuApiConfig       `json:"DanmuApiConfig,omitempty"`
	EmbyConfig           *EmbyConfigSection    `json:"EmbyConfig,omitempty"`
}

type ConfigSubscription struct {
	URL        string `json:"URL"`
	AutoUpdate bool   `json:"AutoUpdate"`
	LastCheck  string `json:"LastCheck"`
}

type SiteConfig struct {
	SiteName                string   `json:"SiteName"`
	Announcement            string   `json:"Announcement"`
	SearchDownstreamMaxPage int      `json:"SearchDownstreamMaxPage"`
	SiteInterfaceCacheTime  int      `json:"SiteInterfaceCacheTime"`
	DoubanProxyType         string   `json:"DoubanProxyType"`
	DoubanProxy             string   `json:"DoubanProxy"`
	DoubanImageProxyType    string   `json:"DoubanImageProxyType"`
	DoubanImageProxy        string   `json:"DoubanImageProxy"`
	DisableYellowFilter     bool     `json:"DisableYellowFilter"`
	ShowAdultContent        bool     `json:"ShowAdultContent"`
	FluidSearch             bool     `json:"FluidSearch"`
	EnableWebLive           bool     `json:"EnableWebLive"`
	TMDBApiKey              string   `json:"TMDBApiKey,omitempty"`
	TMDBLanguage            string   `json:"TMDBLanguage,omitempty"`
	EnableTMDBActorSearch   bool     `json:"EnableTMDBActorSearch,omitempty"`
	CustomAdFilterCode      string   `json:"CustomAdFilterCode,omitempty"`
	CustomAdFilterVersion   int      `json:"CustomAdFilterVersion,omitempty"`
	DefaultUserTags         []string `json:"DefaultUserTags,omitempty"`
}

type UserConfigSection struct {
	AllowRegister            *bool          `json:"AllowRegister,omitempty"`
	AutoCleanupInactiveUsers *bool          `json:"AutoCleanupInactiveUsers,omitempty"`
	InactiveUserDays         *int           `json:"InactiveUserDays,omitempty"`
	Users                    []UserEntry    `json:"Users"`
	Tags                     []UserTagEntry `json:"Tags,omitempty"`
}

type UserEntry struct {
	Username            string          `json:"username"`
	Role                string          `json:"role"` // user | admin | owner
	Banned              bool            `json:"banned,omitempty"`
	EnabledApis         []string        `json:"enabledApis,omitempty"`
	Tags                []string        `json:"tags,omitempty"`
	CreatedAt           *int64          `json:"createdAt,omitempty"`
	TVBoxToken          string          `json:"tvboxToken,omitempty"`
	TVBoxEnabledSources []string        `json:"tvboxEnabledSources,omitempty"`
	ShowAdultContent    *bool           `json:"showAdultContent,omitempty"`
	OIDCSub             string          `json:"oidcSub,omitempty"`
	EmbyConfig          *UserEmbyConfig `json:"embyConfig,omitempty"`
}

type UserEmbyConfig struct {
	Sources []EmbySource `json:"sources"`
}

// EmbySource describes a single Emby server connection.
type EmbySource struct {
	Key                 string   `json:"key"`
	Name                string   `json:"name"`
	Enabled             bool     `json:"enabled"`
	ServerURL           string   `json:"ServerURL"`
	ApiKey              string   `json:"ApiKey,omitempty"`
	Username            string   `json:"Username,omitempty"`
	Password            string   `json:"Password,omitempty"`
	UserID              string   `json:"UserId,omitempty"`
	AuthToken           string   `json:"AuthToken,omitempty"`
	Libraries           []string `json:"Libraries,omitempty"`
	LastSyncTime        *int64   `json:"LastSyncTime,omitempty"`
	ItemCount           *int     `json:"ItemCount,omitempty"`
	IsDefault           bool     `json:"isDefault,omitempty"`
	IsPublic            bool     `json:"isPublic,omitempty"`
	RemoveEmbyPrefix    bool     `json:"removeEmbyPrefix,omitempty"`
	AppendMediaSourceID bool     `json:"appendMediaSourceId,omitempty"`
	TranscodeMp4        bool     `json:"transcodeMp4,omitempty"`
	ProxyPlay           bool     `json:"proxyPlay,omitempty"`
}

type UserTagEntry struct {
	Name             string   `json:"name"`
	EnabledApis      []string `json:"enabledApis"`
	ShowAdultContent *bool    `json:"showAdultContent,omitempty"`
}

type SourceConfigItem struct {
	Key      string `json:"key"`
	Name     string `json:"name"`
	API      string `json:"api"`
	Detail   string `json:"detail,omitempty"`
	From     string `json:"from"` // config | custom
	Disabled bool   `json:"disabled,omitempty"`
	IsAdult  bool   `json:"is_adult,omitempty"`
	Type     string `json:"type,omitempty"` // vod | shortdrama
	Weight   *int   `json:"weight,omitempty"`
}

type CustomCategory struct {
	Name     string `json:"name,omitempty"`
	Type     string `json:"type"` // movie | tv
	Query    string `json:"query"`
	From     string `json:"from"` // config | custom
	Disabled bool   `json:"disabled,omitempty"`
}

type LiveConfigItem struct {
	Key           string `json:"key"`
	Name          string `json:"name"`
	URL           string `json:"url"`
	UA            string `json:"ua,omitempty"`
	EPG           string `json:"epg,omitempty"`
	IsTVBox       bool   `json:"isTvBox,omitempty"`
	From          string `json:"from"` // config | custom
	ChannelNumber *int   `json:"channelNumber,omitempty"`
	Disabled      bool   `json:"disabled,omitempty"`
}

type NetDiskConfig struct {
	Enabled           bool     `json:"enabled"`
	PansouURL         string   `json:"pansouUrl"`
	Timeout           int      `json:"timeout"`
	EnabledCloudTypes []string `json:"enabledCloudTypes"`
}

type AIRecommendConfig struct {
	Enabled            bool     `json:"enabled"`
	APIURL             string   `json:"apiUrl"`
	APIKey             string   `json:"apiKey"`
	Model              string   `json:"model"`
	Temperature        float64  `json:"temperature"`
	MaxTokens          int      `json:"maxTokens"`
	EnableOrchestrator bool     `json:"enableOrchestrator,omitempty"`
	EnableWebSearch    bool     `json:"enableWebSearch,omitempty"`
	TavilyAPIKeys      []string `json:"tavilyApiKeys,omitempty"`
}

type YouTubeConfig struct {
	Enabled           bool     `json:"enabled"`
	APIKey            string   `json:"apiKey"`
	EnableDemo        bool     `json:"enableDemo"`
	MaxResults        int      `json:"maxResults"`
	EnabledRegions    []string `json:"enabledRegions"`
	EnabledCategories []string `json:"enabledCategories"`
}

type TVBoxSecurityConfig struct {
	EnableAuth        bool     `json:"enableAuth"`
	Token             string   `json:"token"`
	EnableIPWhitelist bool     `json:"enableIpWhitelist"`
	AllowedIPs        []string `json:"allowedIPs"`
	EnableRateLimit   bool     `json:"enableRateLimit"`
	RateLimit         int      `json:"rateLimit"`
}

// ProxyConfig is shared by TVBoxProxyConfig and VideoProxyConfig.
type ProxyConfig struct {
	Enabled  bool   `json:"enabled"`
	ProxyURL string `json:"proxyUrl"`
}

type TelegramAuthConfig struct {
	Enabled            bool   `json:"enabled"`
	BotToken           string `json:"botToken"`
	BotUsername        string `json:"botUsername"`
	AutoRegister       bool   `json:"autoRegister"`
	ButtonSize         string `json:"buttonSize"`
	ShowAvatar         bool   `json:"showAvatar"`
	RequestWriteAccess bool   `json:"requestWriteAccess"`
}

// OIDCAuthConfig is the legacy single-provider OIDC config.
type OIDCAuthConfig struct {
	Enabled               bool   `json:"enabled"`
	EnableRegistration    bool   `json:"enableRegistration"`
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorizationEndpoint"`
	TokenEndpoint         string `json:"tokenEndpoint"`
	UserInfoEndpoint      string `json:"userInfoEndpoint"`
	ClientID              string `json:"clientId"`
	ClientSecret          string `json:"clientSecret"`
	ButtonText            string `json:"buttonText"`
	MinTrustLevel         int    `json:"minTrustLevel"`
}

// OIDCProvider supports multiple OIDC providers.
type OIDCProvider struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	Enabled               bool   `json:"enabled"`
	EnableRegistration    bool   `json:"enableRegistration"`
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorizationEndpoint"`
	TokenEndpoint         string `json:"tokenEndpoint"`
	UserInfoEndpoint      string `json:"userInfoEndpoint"`
	ClientID              string `json:"clientId"`
	ClientSecret          string `json:"clientSecret"`
	ButtonText            string `json:"buttonText"`
	MinTrustLevel         int    `json:"minTrustLevel"`
}

type ShortDramaConfig struct {
	PrimaryAPIURL     string `json:"primaryApiUrl"`
	AlternativeAPIURL string `json:"alternativeApiUrl"`
	EnableAlternative bool   `json:"enableAlternative"`
}

type DownloadConfig struct {
	Enabled bool `json:"enabled"`
}

type WatchRoomConfig struct {
	Enabled   bool   `json:"enabled"`
	ServerURL string `json:"serverUrl"`
	AuthKey   string `json:"authKey"`
}

type DoubanConfig struct {
	EnablePuppeteer bool   `json:"enablePuppeteer"`
	Cookies         string `json:"cookies,omitempty"`
}

type CronConfig struct {
	EnableAutoRefresh  bool `json:"enableAutoRefresh"`
	MaxRecordsPerRun   int  `json:"maxRecordsPerRun"`
	OnlyRefreshRecent  bool `json:"onlyRefreshRecent"`
	RecentDays         int  `json:"recentDays"`
	OnlyRefreshOngoing bool `json:"onlyRefreshOngoing"`
}

type TrustedNetworkConfig struct {
	Enabled    bool     `json:"enabled"`
	TrustedIPs []string `json:"trustedIPs"`
}

type DanmuApiConfig struct {
	Enabled      bool   `json:"enabled"`
	UseCustomAPI bool   `json:"useCustomApi"`
	CustomAPIURL string `json:"customApiUrl"`
	CustomToken  string `json:"customToken"`
	Timeout      int    `json:"timeout"`
}

// EmbyConfigSection holds global/shared Emby server sources.
type EmbyConfigSection struct {
	Sources []EmbySource `json:"Sources,omitempty"`
}
