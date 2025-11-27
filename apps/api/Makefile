.PHONY: build clean test lint run initdb

# Build the Lambda binary for ARM64 Linux
build:
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap ./cmd/api

# Clean build artifacts
clean:
	rm -rf bin/

# Run tests
test:
	go test -v ./...

# Run linter
lint:
	golangci-lint run ./...

# Build for local development (native architecture)
build-local:
	go build -o bin/api ./cmd/api

# Run locally (loads .env then .env.local if present)
run:
	@if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	if [ -f .env.local ]; then set -a && . ./.env.local && set +a; fi && \
	go run ./cmd/api

# Initialize local DynamoDB tables
initdb:
	@if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	if [ -f .env.local ]; then set -a && . ./.env.local && set +a; fi && \
	go run ./cmd/initdb
