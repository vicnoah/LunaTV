package handler

import "moontv/internal/service"

// fetchAndDecodeSubscription delegates to the service layer.
// The TypeScript original uses bs58 to decode the raw response; here we return
// the raw content and let the frontend handle any further decoding if needed.
func fetchAndDecodeSubscription(url string) (string, error) {
	return service.FetchConfigSubscription(url)
}
