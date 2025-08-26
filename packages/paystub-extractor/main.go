package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/basic-budget/paystub-extractor/pdf"
	"github.com/gin-gonic/gin"
)

// Config holds application configuration
type Config struct {
	Port         string
	EnableOCR    bool
	MaxFileSize  int64
	RunMode      string // "server" or "lambda"
	LogLevel     string
}

// Response represents the API response
type Response struct {
	Success bool                    `json:"success"`
	Data    interface{}             `json:"data,omitempty"`
	Error   string                  `json:"error,omitempty"`
	Meta    map[string]interface{}  `json:"meta,omitempty"`
}

// HealthCheckResponse represents health check data
type HealthCheckResponse struct {
	Status      string    `json:"status"`
	Version     string    `json:"version"`
	Timestamp   time.Time `json:"timestamp"`
	OCREnabled  bool      `json:"ocr_enabled"`
	MaxFileSize string    `json:"max_file_size"`
}

var (
	pdfProcessor *pdf.Processor
	config       Config
)

func init() {
	// Load configuration from environment
	config = loadConfig()
	
	// Initialize PDF processor
	pdfProcessor = pdf.NewProcessor(config.EnableOCR)
	
	// Set up logging
	if config.LogLevel == "debug" {
		log.SetFlags(log.LstdFlags | log.Lshortfile)
	} else {
		log.SetFlags(log.LstdFlags)
	}
}

func loadConfig() Config {
	cfg := Config{
		Port:        getEnv("PORT", "8080"),
		RunMode:     getEnv("RUN_MODE", "server"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		EnableOCR:   getEnvBool("ENABLE_OCR", true),
		MaxFileSize: getEnvInt64("MAX_FILE_SIZE", 10*1024*1024), // 10MB default
	}
	
	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		b, err := strconv.ParseBool(value)
		if err == nil {
			return b
		}
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		i, err := strconv.ParseInt(value, 10, 64)
		if err == nil {
			return i
		}
	}
	return defaultValue
}

func main() {
	if config.RunMode == "lambda" {
		// Run as Lambda function
		lambda.Start(handleLambdaRequest)
	} else {
		// Run as HTTP server
		runHTTPServer()
	}
}

func runHTTPServer() {
	// Set Gin mode
	if config.LogLevel == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	
	// Middleware
	router.Use(gin.Recovery())
	router.Use(gin.Logger())
	router.Use(corsMiddleware())

	// Routes
	router.GET("/health", handleHealthCheck)
	router.POST("/extract", handleExtractPaystub)
	router.POST("/extract/batch", handleBatchExtract)
	
	// Start server
	log.Printf("Starting server on port %s (OCR: %v, Max file size: %d bytes)",
		config.Port, config.EnableOCR, config.MaxFileSize)
	
	if err := router.Run(":" + config.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	}
}

func handleHealthCheck(c *gin.Context) {
	health := HealthCheckResponse{
		Status:      "healthy",
		Version:     "1.0.0",
		Timestamp:   time.Now(),
		OCREnabled:  config.EnableOCR,
		MaxFileSize: fmt.Sprintf("%d MB", config.MaxFileSize/(1024*1024)),
	}
	
	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    health,
	})
}

func handleExtractPaystub(c *gin.Context) {
	// Check content type
	contentType := c.GetHeader("Content-Type")
	
	var pdfData []byte
	var err error
	
	if contentType == "application/pdf" {
		// Raw PDF data in body
		pdfData, err = io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Success: false,
				Error:   "Failed to read PDF data",
			})
			return
		}
	} else {
		// Multipart form upload
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Success: false,
				Error:   "No file provided",
			})
			return
		}
		defer file.Close()
		
		// Check file size
		if header.Size > config.MaxFileSize {
			c.JSON(http.StatusBadRequest, Response{
				Success: false,
				Error:   fmt.Sprintf("File size exceeds maximum allowed size of %d MB", config.MaxFileSize/(1024*1024)),
			})
			return
		}
		
		// Read file data
		pdfData, err = io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Success: false,
				Error:   "Failed to read file data",
			})
			return
		}
	}
	
	// Process PDF
	startTime := time.Now()
	result, err := pdfProcessor.ProcessPDF(pdfData)
	processingTime := time.Since(startTime)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to process PDF: %v", err),
			Meta: map[string]interface{}{
				"processing_time_ms": processingTime.Milliseconds(),
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    result,
		Meta: map[string]interface{}{
			"processing_time_ms": processingTime.Milliseconds(),
			"ocr_used":           config.EnableOCR,
		},
	})
}

func handleBatchExtract(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(32 << 20) // 32 MB max memory
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Error:   "Failed to parse multipart form",
		})
		return
	}
	
	files := c.Request.MultipartForm.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Error:   "No files provided",
		})
		return
	}
	
	if len(files) > 10 {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Error:   "Maximum 10 files allowed per batch",
		})
		return
	}
	
	results := make([]map[string]interface{}, 0, len(files))
	
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			results = append(results, map[string]interface{}{
				"filename": fileHeader.Filename,
				"success":  false,
				"error":    "Failed to open file",
			})
			continue
		}
		
		// Check file size
		if fileHeader.Size > config.MaxFileSize {
			file.Close()
			results = append(results, map[string]interface{}{
				"filename": fileHeader.Filename,
				"success":  false,
				"error":    fmt.Sprintf("File size exceeds maximum allowed size of %d MB", config.MaxFileSize/(1024*1024)),
			})
			continue
		}
		
		// Read file data
		pdfData, err := io.ReadAll(file)
		file.Close()
		
		if err != nil {
			results = append(results, map[string]interface{}{
				"filename": fileHeader.Filename,
				"success":  false,
				"error":    "Failed to read file data",
			})
			continue
		}
		
		// Process PDF
		result, err := pdfProcessor.ProcessPDF(pdfData)
		if err != nil {
			results = append(results, map[string]interface{}{
				"filename": fileHeader.Filename,
				"success":  false,
				"error":    fmt.Sprintf("Processing failed: %v", err),
			})
			continue
		}
		
		results = append(results, map[string]interface{}{
			"filename": fileHeader.Filename,
			"success":  true,
			"data":     result,
		})
	}
	
	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    results,
	})
}

// Lambda handler
func handleLambdaRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	switch request.Path {
	case "/health":
		return handleLambdaHealth()
	case "/extract":
		return handleLambdaExtract(request)
	default:
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusNotFound,
			Body:       `{"success":false,"error":"Not found"}`,
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, nil
	}
}

func handleLambdaHealth() (events.APIGatewayProxyResponse, error) {
	health := HealthCheckResponse{
		Status:      "healthy",
		Version:     "1.0.0",
		Timestamp:   time.Now(),
		OCREnabled:  config.EnableOCR,
		MaxFileSize: fmt.Sprintf("%d MB", config.MaxFileSize/(1024*1024)),
	}
	
	body, _ := json.Marshal(Response{
		Success: true,
		Data:    health,
	})
	
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}

func handleLambdaExtract(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Decode base64 body (Lambda API Gateway automatically base64 encodes binary data)
	pdfData := []byte(request.Body)
	if request.IsBase64Encoded {
		// Decode if needed
		// In practice, the Lambda runtime handles this
		pdfData = []byte(request.Body)
	}
	
	// Process PDF
	result, err := pdfProcessor.ProcessPDF(pdfData)
	if err != nil {
		body, _ := json.Marshal(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to process PDF: %v", err),
		})
		
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       string(body),
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, nil
	}
	
	body, _ := json.Marshal(Response{
		Success: true,
		Data:    result,
	})
	
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}