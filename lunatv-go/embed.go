package moontv

import "embed"

// StaticFiles holds the compiled frontend SPA served by the Go binary.
// web/dist is populated by running `npm run build` inside the web/ directory.
//
//go:embed web/dist
var StaticFiles embed.FS
