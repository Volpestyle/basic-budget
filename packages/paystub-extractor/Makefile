.PHONY: help build run test clean docker-build docker-run docker-stop lambda-build deps

# Variables
APP_NAME := paystub-extractor
DOCKER_IMAGE := basic-budget/paystub-extractor
LAMBDA_IMAGE := basic-budget/paystub-extractor-lambda
GO_FILES := $(shell find . -name '*.go' -type f)

# Default target
help:
	@echo "Available commands:"
	@echo "  make deps          - Download Go dependencies"
	@echo "  make build         - Build the application"
	@echo "  make run           - Run the application locally"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make docker-build  - Build Docker image"
	@echo "  make docker-run    - Run application in Docker"
	@echo "  make docker-stop   - Stop Docker containers"
	@echo "  make lambda-build  - Build Lambda deployment image"
	@echo "  make lambda-deploy - Deploy to AWS Lambda (requires AWS CLI)"

# Download dependencies
deps:
	go mod download
	go mod tidy

# Build the application
build: deps
	CGO_ENABLED=1 go build -o bin/$(APP_NAME) .

# Run locally
run: build
	./bin/$(APP_NAME)

# Run with hot reload (requires air)
dev:
	@which air > /dev/null || go install github.com/cosmtrek/air@latest
	air

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html
	docker-compose down -v

# Docker commands
docker-build:
	docker build -t $(DOCKER_IMAGE):latest .

docker-run: docker-build
	docker-compose up -d

docker-stop:
	docker-compose down

docker-logs:
	docker-compose logs -f paystub-extractor

# Lambda deployment
lambda-build:
	docker build -f Dockerfile.lambda -t $(LAMBDA_IMAGE):latest .

lambda-package: lambda-build
	@echo "Creating Lambda deployment package..."
	docker create --name lambda-extract $(LAMBDA_IMAGE):latest
	docker cp lambda-extract:/app/bootstrap ./bootstrap
	zip -9 lambda-deployment.zip bootstrap
	docker rm lambda-extract
	rm bootstrap
	@echo "Lambda package created: lambda-deployment.zip"

# Deploy to AWS Lambda (requires AWS CLI configured)
lambda-deploy: lambda-package
	@echo "Deploying to AWS Lambda..."
	aws lambda update-function-code \
		--function-name paystub-extractor \
		--zip-file fileb://lambda-deployment.zip \
		--region us-east-1
	@echo "Deployment complete"

# Benchmarks
benchmark:
	go test -bench=. -benchmem ./...

# Format code
fmt:
	go fmt ./...
	gofmt -s -w $(GO_FILES)

# Lint code (requires golangci-lint)
lint:
	@which golangci-lint > /dev/null || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $$(go env GOPATH)/bin
	golangci-lint run

# Security scan (requires gosec)
security:
	@which gosec > /dev/null || go install github.com/securego/gosec/v2/cmd/gosec@latest
	gosec ./...

# All checks before commit
pre-commit: fmt lint test security
	@echo "All checks passed!"