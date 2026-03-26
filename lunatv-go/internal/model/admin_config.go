package model

import (
	"time"

	"gorm.io/datatypes"
)

// AdminConfigModel stores the full site configuration as a single JSON blob.
type AdminConfigModel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Key       string         `gorm:"uniqueIndex;size:64;not null" json:"key"`
	Config    datatypes.JSON `gorm:"type:json;not null" json:"config"`
	UpdatedAt time.Time      `json:"updated_at"`
	CreatedAt time.Time      `json:"created_at"`
}

func (AdminConfigModel) TableName() string { return "admin_configs" }

// AdminConfig mirrors the TypeScript AdminConfig interface.
type AdminConfig struct {
	SiteConfig         SiteConfig          `json:"SiteConfig"`
	UserConfig         UserConfigSection   `json:"UserConfig"`
	TelegramAuthConfig *TelegramAuthConfig `json:"TelegramAuthConfig,omitempty"`
	OIDCAuthConfig     *OIDCAuthConfig     `json:"OIDCAuthConfig,omitempty"`
	OIDCProviders      []OIDCProvider      `json:"OIDCProviders,omitempty"`
}

type SiteConfig struct {
	SiteName        string   `json:"SiteName"`
	DefaultUserTags []string `json:"DefaultUserTags,omitempty"`
}

type UserConfigSection struct {
	AllowRegister *bool       `json:"AllowRegister,omitempty"`
	Users         []UserEntry `json:"Users"`
}

type UserEntry struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	Banned   bool   `json:"banned,omitempty"`
	OIDCSub  string `json:"oidcSub,omitempty"`
}

type TelegramAuthConfig struct {
	Enabled      bool   `json:"enabled"`
	BotToken     string `json:"botToken"`
	BotUsername  string `json:"botUsername"`
	AutoRegister bool   `json:"autoRegister"`
}

type OIDCAuthConfig struct {
	Enabled               bool   `json:"enabled"`
	EnableRegistration    bool   `json:"enableRegistration"`
	AuthorizationEndpoint string `json:"authorizationEndpoint"`
	TokenEndpoint         string `json:"tokenEndpoint"`
	UserInfoEndpoint      string `json:"userInfoEndpoint"`
	ClientID              string `json:"clientId"`
	ClientSecret          string `json:"clientSecret"`
	MinTrustLevel         int    `json:"minTrustLevel"`
}

type OIDCProvider struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	Enabled               bool   `json:"enabled"`
	EnableRegistration    bool   `json:"enableRegistration"`
	AuthorizationEndpoint string `json:"authorizationEndpoint"`
	TokenEndpoint         string `json:"tokenEndpoint"`
	UserInfoEndpoint      string `json:"userInfoEndpoint"`
	ClientID              string `json:"clientId"`
	ClientSecret          string `json:"clientSecret"`
	MinTrustLevel         int    `json:"minTrustLevel"`
}
