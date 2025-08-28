# Multi-stage build for minimal Lambda container
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the binary with optimizations for size
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o paystub-extractor \
    cmd/server/main.go

# Runtime stage - using Lambda base image
FROM public.ecr.aws/lambda/provided:al2

# Install runtime dependencies
RUN yum install -y \
    tesseract \
    tesseract-langpack-eng \
    poppler-utils \
    ImageMagick \
    && yum clean all \
    && rm -rf /var/cache/yum

# Copy binary from builder
COPY --from=builder /app/paystub-extractor /var/task/paystub-extractor

# Lambda handler configuration
ENV PORT=8080
ENV ENABLE_OCR=true
ENV CACHE_ENABLED=true
ENV MAX_FILE_SIZE=10485760
ENV PROCESSING_TIMEOUT_SECONDS=30

# Lambda runtime interface
COPY lambda-entrypoint.sh /var/task/
RUN chmod +x /var/task/lambda-entrypoint.sh

ENTRYPOINT ["/var/task/lambda-entrypoint.sh"]