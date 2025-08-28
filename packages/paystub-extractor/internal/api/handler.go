package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/basic-budget/paystub-extractor/internal/extractor"
	"github.com/basic-budget/paystub-extractor/internal/models"
	"github.com/basic-budget/paystub-extractor/internal/queue"
	"github.com/google/uuid"
)

// Handler manages HTTP endpoints
type Handler struct {
	extractorService *extractor.Service
	queueProcessor   *queue.Processor
	logger          *log.Logger
	maxUploadSize   int64
	requests        map[string]*models.ProcessingRequest // In-memory store for demo
}

// HandlerConfig contains handler configuration
type HandlerConfig struct {
	ExtractorService *extractor.Service
	QueueProcessor   *queue.Processor
	Logger          *log.Logger
	MaxUploadSize   int64
}

// NewHandler creates a new API handler
func NewHandler(config HandlerConfig) *Handler {
	return &Handler{
		extractorService: config.ExtractorService,
		queueProcessor:   config.QueueProcessor,
		logger:          config.Logger,
		maxUploadSize:   config.MaxUploadSize,
		requests:        make(map[string]*models.ProcessingRequest),
	}
}

// HealthCheck handles health check requests
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := map[string]interface{}{
		"status": "healthy",
		"timestamp": time.Now().UTC(),
		"service": "paystub-extractor",
		"capabilities": map[string]bool{
			"pdf_extraction": true,
			"ocr": h.extractorService.IsOCREnabled(),
			"async_processing": h.queueProcessor != nil,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Extract handles synchronous extraction requests
func (h *Handler) Extract(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form
	r.Body = http.MaxBytesReader(w, r.Body, h.maxUploadSize)
	if err := r.ParseMultipartForm(h.maxUploadSize); err != nil {
		h.sendError(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	// Get uploaded file
	file, header, err := r.FormFile("file")
	if err != nil {
		h.sendError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file data
	data, err := io.ReadAll(file)
	if err != nil {
		h.sendError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Determine file type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}

	h.logger.Printf("Processing file: %s (size: %d, type: %s)", header.Filename, len(data), contentType)

	// Extract paystub data
	start := time.Now()
	result, err := h.extractorService.Extract(data, contentType)
	if err != nil {
		h.logger.Printf("Extraction failed: %v", err)
		h.sendError(w, fmt.Sprintf("Extraction failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Add processing metadata
	result.ProcessedAt = time.Now()
	result.ProcessingTimeMs = time.Since(start).Milliseconds()

	// Send response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ExtractAsync handles asynchronous extraction requests
func (h *Handler) ExtractAsync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form
	r.Body = http.MaxBytesReader(w, r.Body, h.maxUploadSize)
	if err := r.ParseMultipartForm(h.maxUploadSize); err != nil {
		h.sendError(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	// Get uploaded file
	file, header, err := r.FormFile("file")
	if err != nil {
		h.sendError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file data
	data, err := io.ReadAll(file)
	if err != nil {
		h.sendError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Determine file type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}

	// Create processing request
	request := &models.ProcessingRequest{
		ID:       uuid.New().String(),
		Status:   "pending",
		FileType: contentType,
		FileName: header.Filename,
		FileSize: int64(len(data)),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Store request
	h.requests[request.ID] = request

	// Process async (in production, this would go to a queue)
	go h.processAsync(request, data, contentType)

	// Return request ID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"id": request.ID,
		"status": request.Status,
		"message": "Processing started",
	})
}

// GetStatus returns the status of an async processing request
func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract ID from path
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		h.sendError(w, "Invalid request ID", http.StatusBadRequest)
		return
	}
	id := parts[len(parts)-1]

	// Find request
	request, ok := h.requests[id]
	if !ok {
		h.sendError(w, "Request not found", http.StatusNotFound)
		return
	}

	// Return status
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(request)
}

// processAsync processes a request asynchronously
func (h *Handler) processAsync(request *models.ProcessingRequest, data []byte, contentType string) {
	// Update status
	request.Status = "processing"
	request.UpdatedAt = time.Now()

	// Process
	start := time.Now()
	result, err := h.extractorService.Extract(data, contentType)
	
	// Update request
	request.UpdatedAt = time.Now()
	now := time.Now()
	request.CompletedAt = &now
	
	if err != nil {
		request.Status = "failed"
		request.Error = err.Error()
	} else {
		request.Status = "completed"
		result.ProcessedAt = time.Now()
		result.ProcessingTimeMs = time.Since(start).Milliseconds()
		request.Result = result
	}
}

// sendError sends an error response
func (h *Handler) sendError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}