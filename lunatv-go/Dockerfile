# Stage 1: Build the React SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY web/package*.json ./
RUN npm ci --silent
COPY web/ ./
RUN npm run build

# Stage 2: Build the Go binary
FROM golang:1.22-alpine AS go-builder
WORKDIR /app
RUN apk add --no-cache gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend-builder /app/dist ./web/dist
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o moontv ./cmd/moontv

# Stage 3: Minimal runtime image
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata sqlite
WORKDIR /app
RUN adduser -D -u 1000 moontv \
    && mkdir -p /app/data /app/cache \
    && chown -R moontv:moontv /app
USER moontv
COPY --from=go-builder --chown=moontv:moontv /app/moontv .
EXPOSE 3000
ENV DATABASE_URL=/app/data/moontv.db
ENV VIDEO_CACHE_DIR=/app/cache
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["./moontv"]
