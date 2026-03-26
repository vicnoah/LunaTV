.PHONY: build dev-backend dev-frontend test clean install docker check

# Production build: compile frontend then embed it in the Go binary.
build: frontend-build
	CGO_ENABLED=1 go build -ldflags="-s -w" -o moontv ./cmd/moontv

# Build the React SPA into web/dist.
frontend-build:
	cd web && npm install && npm run build

# Run the Go backend in development mode (SQLite, permissive defaults).
dev-backend:
	DATABASE_URL=dev.db JWT_SECRET=devsecret PASSWORD=admin USERNAME=admin go run ./cmd/moontv

# Run the frontend dev server with HMR.
dev-frontend:
	cd web && npm run dev

# Run all Go tests.
test:
	go test ./...

# Install all dependencies (Go + Node).
install:
	go mod download
	cd web && npm install

# Remove build artifacts and dev databases.
clean:
	rm -f moontv dev.db
	cd web && rm -rf dist node_modules

# Build the Docker image.
docker:
	docker build -t moontv:latest .

# Quick static analysis without CGO.
check:
	go vet ./...
