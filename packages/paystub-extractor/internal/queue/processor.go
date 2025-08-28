package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/basic-budget/paystub-extractor/internal/extractor"
	"github.com/basic-budget/paystub-extractor/internal/models"
)

// Message represents a queue message
type Message struct {
	ID          string          `json:"id"`
	Data        []byte          `json:"data"`
	ContentType string          `json:"content_type"`
	Metadata    json.RawMessage `json:"metadata"`
	Timestamp   time.Time       `json:"timestamp"`
}

// Processor handles async queue processing
type Processor struct {
	extractor    *extractor.Service
	config       Config
	workers      int
	wg           sync.WaitGroup
	stopCh       chan struct{}
	messages     chan Message
	results      map[string]*models.ProcessingRequest
	resultsMu    sync.RWMutex
}

// Config contains processor configuration
type Config struct {
	QueueURL          string
	MaxWorkers        int
	PollInterval      time.Duration
	VisibilityTimeout time.Duration
}

// NewProcessor creates a new queue processor
func NewProcessor(extractor *extractor.Service, config Config) *Processor {
	if config.MaxWorkers == 0 {
		config.MaxWorkers = 5
	}
	if config.PollInterval == 0 {
		config.PollInterval = 10 * time.Second
	}
	if config.VisibilityTimeout == 0 {
		config.VisibilityTimeout = 5 * time.Minute
	}

	return &Processor{
		extractor: extractor,
		config:    config,
		workers:   config.MaxWorkers,
		stopCh:    make(chan struct{}),
		messages:  make(chan Message, config.MaxWorkers*2),
		results:   make(map[string]*models.ProcessingRequest),
	}
}

// Start begins processing queue messages
func (p *Processor) Start(ctx context.Context) error {
	log.Printf("Starting queue processor with %d workers", p.workers)

	// Start workers
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}

	// Start polling for messages
	go p.pollMessages(ctx)

	// Wait for stop signal
	<-p.stopCh

	// Stop accepting new messages
	close(p.messages)

	// Wait for workers to finish
	p.wg.Wait()

	log.Println("Queue processor stopped")
	return nil
}

// Stop stops the queue processor
func (p *Processor) Stop() {
	close(p.stopCh)
}

// worker processes messages from the queue
func (p *Processor) worker(id int) {
	defer p.wg.Done()
	
	log.Printf("Worker %d started", id)
	
	for msg := range p.messages {
		p.processMessage(msg)
	}
	
	log.Printf("Worker %d stopped", id)
}

// processMessage processes a single message
func (p *Processor) processMessage(msg Message) {
	log.Printf("Processing message %s", msg.ID)
	
	// Create processing request
	request := &models.ProcessingRequest{
		ID:          msg.ID,
		Status:      "processing",
		FileType:    msg.ContentType,
		FileSize:    int64(len(msg.Data)),
		CreatedAt:   msg.Timestamp,
		UpdatedAt:   time.Now(),
	}

	// Store request
	p.resultsMu.Lock()
	p.results[msg.ID] = request
	p.resultsMu.Unlock()

	// Process the data
	start := time.Now()
	result, err := p.extractor.Extract(msg.Data, msg.ContentType)
	
	// Update request
	request.UpdatedAt = time.Now()
	now := time.Now()
	request.CompletedAt = &now
	
	if err != nil {
		request.Status = "failed"
		request.Error = err.Error()
		log.Printf("Failed to process message %s: %v", msg.ID, err)
	} else {
		request.Status = "completed"
		result.ProcessedAt = time.Now()
		result.ProcessingTimeMs = time.Since(start).Milliseconds()
		request.Result = result
		log.Printf("Successfully processed message %s in %v", msg.ID, time.Since(start))
	}

	// In a real implementation, this would send results to a storage system
	// or notify the client through a webhook/notification service
}

// pollMessages polls for new messages (simplified for demo)
func (p *Processor) pollMessages(ctx context.Context) {
	ticker := time.NewTicker(p.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-p.stopCh:
			return
		case <-ticker.C:
			// In a real implementation, this would poll from SQS, RabbitMQ, etc.
			// For now, this is a placeholder
			log.Println("Polling for messages...")
		}
	}
}

// SubmitJob submits a job for async processing
func (p *Processor) SubmitJob(data []byte, contentType string, metadata map[string]interface{}) (string, error) {
	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("failed to marshal metadata: %w", err)
	}

	msg := Message{
		ID:          fmt.Sprintf("job-%d", time.Now().UnixNano()),
		Data:        data,
		ContentType: contentType,
		Metadata:    metaJSON,
		Timestamp:   time.Now(),
	}

	select {
	case p.messages <- msg:
		return msg.ID, nil
	case <-time.After(5 * time.Second):
		return "", fmt.Errorf("timeout submitting job")
	}
}

// GetResult retrieves the result of a processed job
func (p *Processor) GetResult(jobID string) (*models.ProcessingRequest, bool) {
	p.resultsMu.RLock()
	defer p.resultsMu.RUnlock()
	
	result, exists := p.results[jobID]
	return result, exists
}