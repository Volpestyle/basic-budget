# Paystub Extractor API Documentation

## Overview
The Paystub Extractor service provides REST endpoints for extracting structured data from paystub PDFs. It supports both text-based PDFs and scanned documents (via OCR).

## Base URL
- Local: `http://localhost:8080`
- Lambda: Configure via API Gateway

## Endpoints

### Health Check
Check service status and configuration.

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2024-01-20T10:30:00Z",
    "ocr_enabled": true,
    "max_file_size": "10 MB"
  }
}
```

### Extract Paystub Data
Extract structured data from a single PDF.

```http
POST /extract
Content-Type: multipart/form-data
```

**Request:**
- Form field: `file` - PDF file to process

**Alternative Request (Raw PDF):**
```http
POST /extract
Content-Type: application/pdf

[Binary PDF data]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gross_pay": 2375.00,
    "net_pay": 1592.06,
    "pay_period_start": "2024-01-01",
    "pay_period_end": "2024-01-15",
    "pay_date": "2024-01-20",
    "pay_frequency": "semi-monthly",
    "employer": {
      "name": "ACME Corporation",
      "address": "123 Main St, New York, NY",
      "ein": "12-3456789"
    },
    "employee": {
      "name": "John Doe",
      "employee_id": "EMP12345",
      "ssn_last4": "6789"
    },
    "earnings": [
      {
        "description": "regular",
        "hours": 80.0,
        "rate": 25.0,
        "amount": 2000.00
      },
      {
        "description": "overtime",
        "hours": 10.0,
        "rate": 37.50,
        "amount": 375.00
      }
    ],
    "deductions": [
      {
        "description": "401k",
        "amount": 118.75,
        "pre_tax": true
      },
      {
        "description": "health insurance",
        "amount": 150.00,
        "pre_tax": true
      }
    ],
    "taxes": [
      {
        "description": "federal tax",
        "amount": 237.50
      },
      {
        "description": "state tax",
        "amount": 95.00
      },
      {
        "description": "social security tax",
        "amount": 147.25
      },
      {
        "description": "medicare tax",
        "amount": 34.44
      }
    ],
    "ytd": {
      "gross": 24999.99,
      "net": 17850.00,
      "federal": 3750.00
    },
    "confidence_score": 0.85
  },
  "meta": {
    "processing_time_ms": 245,
    "ocr_used": false
  }
}
```

### Batch Extract
Process multiple PDFs in a single request.

```http
POST /extract/batch
Content-Type: multipart/form-data
```

**Request:**
- Form field: `files[]` - Multiple PDF files (max 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "filename": "paystub1.pdf",
      "success": true,
      "data": { /* Same structure as single extract */ }
    },
    {
      "filename": "paystub2.pdf",
      "success": false,
      "error": "Unable to extract meaningful data"
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "No file provided"
}
```

### 413 Payload Too Large
```json
{
  "success": false,
  "error": "File size exceeds maximum allowed size of 10 MB"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to process PDF: [error details]",
  "meta": {
    "processing_time_ms": 1250
  }
}
```

## Usage Examples

### cURL
```bash
# Single file extraction
curl -X POST http://localhost:8080/extract \
  -F "file=@paystub.pdf" \
  -H "Accept: application/json"

# Batch extraction
curl -X POST http://localhost:8080/extract/batch \
  -F "files=@paystub1.pdf" \
  -F "files=@paystub2.pdf" \
  -H "Accept: application/json"

# Raw PDF upload
curl -X POST http://localhost:8080/extract \
  -H "Content-Type: application/pdf" \
  --data-binary "@paystub.pdf"
```

### JavaScript (Fetch API)
```javascript
// Single file
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('http://localhost:8080/extract', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data);
```

### Python
```python
import requests

# Single file
with open('paystub.pdf', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:8080/extract', files=files)
    
result = response.json()
print(result['data'])
```

## Configuration

Environment variables:
- `PORT`: Server port (default: 8080)
- `ENABLE_OCR`: Enable OCR for scanned documents (default: true)
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10485760)
- `RUN_MODE`: "server" or "lambda" (default: server)
- `LOG_LEVEL`: "info" or "debug" (default: info)

## Pay Frequency Detection

The service automatically detects pay frequency using:
1. Explicit mentions in the document (e.g., "Bi-Weekly", "Monthly")
2. Date range analysis:
   - 7 days = Weekly
   - 14-15 days = Biweekly or Semi-monthly (checks date patterns)
   - 28-31 days = Monthly

## Confidence Score

The confidence score (0-1) indicates extraction quality based on:
- Presence of essential fields (gross/net pay)
- Date information completeness
- Employee/employer information
- Earnings and deductions detail
- Overall data consistency

Scores above 0.7 are generally reliable.

## OCR Support

When enabled, the service will:
1. First attempt text extraction from the PDF
2. If confidence is low (<0.5), perform OCR using Tesseract
3. Combine both extraction methods for best results

OCR requires these tools to be installed:
- Tesseract OCR
- One of: pdftoppm (recommended), ImageMagick, or Ghostscript

## Rate Limits

- Single extraction: No limit
- Batch extraction: Maximum 10 files per request
- File size: Configurable via MAX_FILE_SIZE (default 10MB)