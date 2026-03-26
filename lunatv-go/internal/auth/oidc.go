package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// OIDCDiscovery holds the subset of the OpenID Connect discovery document
// fields that the auth system uses.
type OIDCDiscovery struct {
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserinfoEndpoint      string `json:"userinfo_endpoint"`
	JWKsURI               string `json:"jwks_uri"`
}

// OIDCDiscover fetches the OIDC discovery document from the issuer's
// well-known configuration endpoint.
func OIDCDiscover(issuerURL string) (*OIDCDiscovery, error) {
	wellKnownURL := strings.TrimRight(issuerURL, "/") + "/.well-known/openid-configuration"
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(wellKnownURL)
	if err != nil {
		return nil, fmt.Errorf("fetching discovery document: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discovery endpoint returned %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading discovery response: %w", err)
	}
	var discovery OIDCDiscovery
	if err := json.Unmarshal(body, &discovery); err != nil {
		return nil, fmt.Errorf("parsing discovery document: %w", err)
	}
	return &discovery, nil
}

// OIDCExchangeCode exchanges an authorization code for tokens using the
// standard OAuth 2.0 authorization_code grant. The returned map contains the
// raw token endpoint response (access_token, id_token, etc.).
func OIDCExchangeCode(tokenURL, code, redirectURI, clientID, clientSecret string) (map[string]interface{}, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest(http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("building token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, body)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing token response: %w", err)
	}
	return result, nil
}

// OIDCGetUserInfo fetches user information from the userinfo endpoint using
// the provided access token.
func OIDCGetUserInfo(userInfoURL, accessToken string) (map[string]interface{}, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodGet, userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("building userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading userinfo response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo endpoint returned %d: %s", resp.StatusCode, body)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing userinfo response: %w", err)
	}
	return result, nil
}

// OIDCBuildAuthURL constructs the authorization URL that the browser should be
// redirected to when initiating an OIDC login flow.
func OIDCBuildAuthURL(authURL, clientID, redirectURI, state, nonce string, scopes []string) string {
	params := url.Values{}
	params.Set("client_id", clientID)
	params.Set("redirect_uri", redirectURI)
	params.Set("response_type", "code")
	params.Set("scope", strings.Join(scopes, " "))
	params.Set("state", state)
	if nonce != "" {
		params.Set("nonce", nonce)
	}

	separator := "?"
	if strings.Contains(authURL, "?") {
		separator = "&"
	}
	return authURL + separator + params.Encode()
}
