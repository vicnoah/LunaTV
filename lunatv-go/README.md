# MoonTV (Go Edition)

MoonTV is a self-hosted video aggregation platform.
This directory contains the rewritten Go + React SPA implementation.

---

## What is MoonTV?

MoonTV aggregates content from multiple video sources (custom scrapers, Emby,
live-TV M3U playlists, short-drama feeds, ACG sources, YouTube, and more) into
a single, unified interface.  Features include:

- Unified search across all configured sources
- Douban / TMDB metadata enrichment
- Play-progress sync, favourites, and watch history
- Live TV via M3U playlists
- Emby server integration
- Short drama & ACG catalogue browsing
- TVBox-compatible API
- Watch rooms (shared playback sessions)
- Danmu (bullet comments) from external providers
- AI-powered recommendations
- OIDC & Telegram login
- Trusted-network auto-login (by IP/CIDR)
- Admin panel for users, sources, and site configuration

---

## Quick Start with Docker

```bash
# Copy and edit the env file
cp .env.example .env
$EDITOR .env          # set USERNAME, PASSWORD, JWT_SECRET at minimum

# Run
docker build -t moontv:latest .
docker run -d \
  --name moontv \
  -p 3000:3000 \
  -v moontv-data:/app/data \
  --env-file .env \
  moontv:latest
```

Open http://localhost:3000.

### Docker Compose (recommended)

```yaml
services:
  moontv:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    volumes:
      - moontv-data:/app/data
      - moontv-cache:/app/cache
    restart: unless-stopped

volumes:
  moontv-data:
  moontv-cache:
```

---

## Manual Installation

### Prerequisites

- Go 1.22+
- Node.js 20+
- `gcc` / `musl-dev` (required for CGO / SQLite)

### Build

```bash
# Install dependencies
make install

# Build frontend then backend
make build

# Run
./moontv
```

### Development

Open two terminals:

```bash
# Terminal 1 – Go backend (hot-reloads not included; use air if desired)
make dev-backend

# Terminal 2 – React SPA with HMR
make dev-frontend
```

The backend listens on port 3000; the frontend dev server proxies `/api` to it.

---

## Configuration

All configuration is via environment variables (or a `.env` file in the working
directory).  See `.env.example` for the full list.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP listen port |
| `USERNAME` | yes | – | Owner account username |
| `PASSWORD` | yes | – | Owner account password |
| `JWT_SECRET` | yes | – | Secret used to sign JWT tokens |
| `DATABASE_URL` | no | `moontv.db` | SQLite path, or MySQL/Postgres DSN |
| `NEXT_PUBLIC_SITE_NAME` | no | `MoonTV` | Site display name |
| `ANNOUNCEMENT` | no | – | Banner message shown in the UI |
| `NEXT_PUBLIC_DOUBAN_PROXY_TYPE` | no | – | `http` or `socks5` |
| `NEXT_PUBLIC_DOUBAN_PROXY` | no | – | Proxy URL for Douban requests |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` | no | `server` | `server` or `direct` |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY` | no | – | External image proxy URL |
| `TMDB_API_KEY` | no | – | TMDB v3 API key |
| `NEXT_PUBLIC_DISABLE_YELLOW_FILTER` | no | `false` | Disable content filter |
| `DISABLE_HERO_TRAILER` | no | `false` | Disable hero-banner trailer autoplay |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE` | no | `5` | Max pages fetched per search |
| `VIDEO_CACHE_DIR` | no | `/tmp/video-cache` | Directory for cached video segments |
| `TRUSTED_NETWORK_IPS` | no | – | Comma-separated CIDRs for auto-login |
| `SITE_BASE` | no | – | Public base URL (used for OIDC redirects) |

### Database

MoonTV supports three database backends selected automatically from the DSN
format in `DATABASE_URL`:

| Driver | Example DSN |
|---|---|
| SQLite (default) | `moontv.db` |
| MySQL | `user:pass@tcp(localhost:3306)/moontv?charset=utf8mb4&parseTime=True` |
| PostgreSQL | `host=localhost user=moontv password=secret dbname=moontv sslmode=disable` |

---

## Production Tips

- Run behind a reverse proxy (nginx / Caddy / Traefik) with TLS termination.
- Mount a persistent volume at `/app/data` (SQLite database) and `/app/cache`
  (video cache) when running in Docker.
- Rotate `JWT_SECRET` invalidates all existing sessions; users will need to
  log in again.
- Set `GIN_MODE=release` in production to suppress debug output (the binary
  already defaults to release mode via the Makefile build flags).

---

## License

See [LICENSE](../LICENSE).
