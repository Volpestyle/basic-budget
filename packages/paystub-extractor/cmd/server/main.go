package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/basic-budget/paystub-extractor/internal/api"
	"github.com/basic-budget/paystub-extractor/internal/extractor"
	"github.com/basic-budget/paystub-extractor/internal/queue"
)

func main() {
	// Initialize logger
	logger := log.New(os.Stdout, "[paystub-extractor] ", log.LstdFlags|log.Lshortfile)
	
	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	// Initialize extractor service
	extractorService, err := extractor.NewService(extractor.Config{
		EnableOCR:       getEnvBool("ENABLE_OCR", true),
		CacheEnabled:    getEnvBool("CACHE_ENABLED", true),
		MaxFileSize:     getEnvInt64("MAX_FILE_SIZE", 10*1024*1024), // 10MB default
		ProcessingTimeout: time.Duration(getEnvInt64("PROCESSING_TIMEOUT_SECONDS", 30)) * time.Second,
	})
	if err != nil {
		logger.Fatalf("Failed to initialize extractor service: %v", err)
	}
	defer extractorService.Close()

	// Initialize queue processor if enabled
	var queueProcessor *queue.Processor
	if getEnvBool("QUEUE_ENABLED", false) {
		queueProcessor = queue.NewProcessor(extractorService, queue.Config{
			QueueURL:        os.Getenv("QUEUE_URL"),
			MaxWorkers:      int(getEnvInt64("QUEUE_MAX_WORKERS", 5)),
			PollInterval:    time.Duration(getEnvInt64("QUEUE_POLL_INTERVAL_SECONDS", 10)) * time.Second,
			VisibilityTimeout: time.Duration(getEnvInt64("QUEUE_VISIBILITY_TIMEOUT_SECONDS", 300)) * time.Second,
		})
		
		// Start queue processing in background
		go func() {
			if err := queueProcessor.Start(context.Background()); err != nil {
				logger.Printf("Queue processor error: %v", err)
			}
		}()
	}

	// Initialize API handler
	handler := api.NewHandler(api.HandlerConfig{
		ExtractorService: extractorService,
		QueueProcessor:   queueProcessor,
		Logger:          logger,
		MaxUploadSize:   getEnvInt64("MAX_UPLOAD_SIZE", 10*1024*1024),
	})

	// Setup HTTP server
	mux := http.NewServeMux()
	
	// Health check endpoint
	mux.HandleFunc("/health", handler.HealthCheck)
	
	// API endpoints
	mux.HandleFunc("/api/v1/extract", handler.Extract)
	mux.HandleFunc("/api/v1/extract/async", handler.ExtractAsync)
	mux.HandleFunc("/api/v1/status/", handler.GetStatus)
	
	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      loggingMiddleware(logger, mux),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server
	logger.Printf("Starting server on port %s", port)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if queueProcessor != nil {
		queueProcessor.Stop()
	}

	if err := srv.Shutdown(ctx); err != nil {
		logger.Printf("Server forced to shutdown: %v", err)
	}

	logger.Println("Server exited")
}

// loggingMiddleware logs HTTP requests
func loggingMiddleware(logger *log.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		
		next.ServeHTTP(wrapped, r)
		
		duration := time.Since(start)
		logger.Printf("%s %s - %d (%v)", r.Method, r.URL.Path, wrapped.statusCode, duration)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Helper functions
func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value == "true" || value == "1" || value == "yes"
}

func getEnvInt64(key string, defaultValue int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	var result int64
	fmt.Sscanf(value, "%d", &result)
	if result == 0 {
		return defaultValue
	}
	return result
}