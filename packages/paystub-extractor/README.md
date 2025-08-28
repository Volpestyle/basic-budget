# Paystub Extractor Microservice

A high-performance Go microservice for extracting structured data from paystub PDFs and images. Optimized for AWS Lambda deployment with support for OCR, pattern matching, and confidence scoring.

## Features

- **PDF Text Extraction**: Direct text extraction from native PDFs
- **OCR Support**: Tesseract-based OCR for scanned PDFs and images
- **Multi-Provider Support**: Pre-configured patterns for ADP, Paychex, Workday, Gusto, and generic formats
- **Confidence Scoring**: Each extracted field includes confidence scores
- **Async Processing**: Queue-based async processing for large files
- **Caching**: In-memory caching for repeated pattern matching
- **Lambda Optimized**: Small binary size and fast cold starts

## API Endpoints

### Health Check
```
GET /health
```

Returns service health status and capabilities.

### Extract (Synchronous)
```
POST /api/v1/extract
Content-Type: multipart/form-data

Form Data:
- file: The paystub file (PDF, PNG, JPG)
```

Returns extracted paystub data immediately.

### Extract (Asynchronous)
```
POST /api/v1/extract/async
Content-Type: multipart/form-data

Form Data:
- file: The paystub file

Response:
{
  "id": "job-id",
  "status": "pending",
  "message": "Processing started"
}
```

### Check Status
```
GET /api/v1/status/{job-id}
```

Returns the status and results of an async processing job.

## Response Format

```json
{
  "gross_pay": {
    "value": {
      "amount": 5000.00,
      "currency": "USD"
    },
    "confidence": 0.95,
    "source": "pdf_text"
  },
  "net_pay": {
    "value": {
      "amount": 3750.00,
      "currency": "USD"
    },
    "confidence": 0.95,
    "source": "pdf_text"
  },
  "pay_period_start": "2024-01-01T00:00:00Z",
  "pay_period_end": "2024-01-15T00:00:00Z",
  "pay_date": "2024-01-19T00:00:00Z",
  "pay_frequency": "biweekly",
  "employee_name": "John Doe",
  "employer_name": "Acme Corp",
  "tax_deductions": [
    {
      "name": "Federal Income Tax",
      "amount": {"amount": 750.00, "currency": "USD"},
      "category": "tax",
      "confidence": 0.9
    }
  ],
  "benefit_deductions": [
    {
      "name": "Health Insurance",
      "amount": {"amount": 200.00, "currency": "USD"},
      "category": "benefit",
      "confidence": 0.85
    }
  ],
  "ytd_gross_pay": {"amount": 50000.00, "currency": "USD"},
  "provider": "ADP",
  "overall_confidence": 0.88,
  "processed_at": "2024-01-20T10:30:00Z",
  "processing_time_ms": 450
}
```

## Local Development

### Prerequisites

- Go 1.21+
- Tesseract OCR (`brew install tesseract` on macOS)
- ImageMagick (`brew install imagemagick` for PDF support)

### Running Locally

```bash
# Install dependencies
go mod download

# Run the server
go run cmd/server/main.go

# Or build and run
go build -o paystub-extractor cmd/server/main.go
./paystub-extractor
```

### Environment Variables

- `PORT`: Server port (default: 8080)
- `ENABLE_OCR`: Enable OCR processing (default: true)
- `CACHE_ENABLED`: Enable result caching (default: true)
- `MAX_FILE_SIZE`: Maximum upload file size in bytes (default: 10MB)
- `PROCESSING_TIMEOUT_SECONDS`: Processing timeout (default: 30)
- `QUEUE_ENABLED`: Enable async queue processing (default: false)

## Docker Deployment

### Build Image

```bash
docker build -t paystub-extractor .
```

### Run Container

```bash
docker run -p 8080:8080 \
  -e ENABLE_OCR=true \
  -e CACHE_ENABLED=true \
  paystub-extractor
```

## AWS Lambda Deployment

The service is optimized for AWS Lambda container deployment:

### Build for Lambda

```bash
# Build the Lambda-optimized container
docker build -t paystub-extractor-lambda .

# Tag for ECR
docker tag paystub-extractor-lambda:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/paystub-extractor:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/paystub-extractor:latest
```

### Lambda Configuration

- Memory: 1024 MB (recommended for OCR operations)
- Timeout: 60 seconds
- Environment Variables: Set as needed
- Container image: Use the ECR image URL

### API Gateway Integration

Configure API Gateway with:
- Binary media types: `application/pdf`, `image/png`, `image/jpeg`
- Integration timeout: 30 seconds
- Payload size: 10 MB

## Performance Optimization

### Caching Strategy

The service implements multi-level caching:
1. **Pattern Cache**: Compiled regex patterns cached at startup
2. **Result Cache**: Extracted results cached for 15 minutes (configurable)
3. **Provider Detection Cache**: Provider identification cached per document hash

### Cold Start Optimization

- Minimal dependencies
- Compiled binary with `-ldflags="-w -s"` for size reduction
- Lazy initialization of OCR client
- Pre-warmed Lambda recommended for production

### Concurrent Processing

- Configurable worker pool for async processing
- Non-blocking API endpoints
- Graceful shutdown with request draining

## Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...

# Benchmark extraction
go test -bench=. ./internal/extractor
```

## Sample Request

```bash
# Extract from PDF
curl -X POST http://localhost:8080/api/v1/extract \
  -F "file=@sample_paystub.pdf"

# Async processing
curl -X POST http://localhost:8080/api/v1/extract/async \
  -F "file=@large_paystub.pdf"

# Check status
curl http://localhost:8080/api/v1/status/job-123
```

## Architecture

```
┌─────────────┐
│   Client    │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  API Handler│
└─────┬───────┘
      │
      ├────────────────┬──────────────┐
      ▼                ▼              ▼
┌──────────┐    ┌──────────┐   ┌──────────┐
│Extractor │    │   OCR    │   │  Cache   │
│ Service  │───▶│  Client  │   │  Layer   │
└──────────┘    └──────────┘   └──────────┘
      │
      ▼
┌──────────┐
│ Pattern  │
│ Matcher  │
└──────────┘
```

## Supported Paystub Formats

### Providers
- ADP
- Paychex
- Workday
- Gusto
- Paylocity
- Paycor
- Generic formats

### Extracted Fields
- Gross and Net Pay
- Pay Period (start/end dates)
- Pay Date
- Pay Frequency
- Employee Information
- Employer Information
- Tax Deductions (Federal, State, FICA, Medicare)
- Benefit Deductions (Health, Dental, Vision, 401k)
- YTD Totals
- Hours and Rates (when available)

## License

MIT