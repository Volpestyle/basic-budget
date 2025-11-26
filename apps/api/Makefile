.PHONY: build clean test lint

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
