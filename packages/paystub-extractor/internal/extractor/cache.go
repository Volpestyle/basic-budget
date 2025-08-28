package extractor

import (
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"

	"github.com/basic-budget/paystub-extractor/internal/models"
)

// CacheEntry represents a cache entry
type CacheEntry struct {
	Data      *models.PaystubData
	ExpiresAt time.Time
}

// Cache provides in-memory caching for processed paystubs
type Cache struct {
	mu       sync.RWMutex
	entries  map[string]*CacheEntry
	maxSize  int
	ttl      time.Duration
}

// NewCache creates a new cache
func NewCache(maxSize int, ttl time.Duration) *Cache {
	c := &Cache{
		entries: make(map[string]*CacheEntry),
		maxSize: maxSize,
		ttl:     ttl,
	}
	
	// Start cleanup goroutine
	go c.cleanup()
	
	return c
}

// Get retrieves a cached result
func (c *Cache) Get(data []byte) *models.PaystubData {
	key := c.hash(data)
	
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	entry, exists := c.entries[key]
	if !exists {
		return nil
	}
	
	// Check if expired
	if time.Now().After(entry.ExpiresAt) {
		return nil
	}
	
	return entry.Data
}

// Set stores a result in cache
func (c *Cache) Set(data []byte, result *models.PaystubData) {
	key := c.hash(data)
	
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// Check cache size
	if len(c.entries) >= c.maxSize {
		// Remove oldest entry (simple FIFO for now)
		c.evictOldest()
	}
	
	c.entries[key] = &CacheEntry{
		Data:      result,
		ExpiresAt: time.Now().Add(c.ttl),
	}
}

// hash generates a hash key for cache
func (c *Cache) hash(data []byte) string {
	h := sha256.New()
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}

// evictOldest removes the oldest cache entry
func (c *Cache) evictOldest() {
	var oldestKey string
	var oldestTime time.Time
	
	for key, entry := range c.entries {
		if oldestKey == "" || entry.ExpiresAt.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.ExpiresAt
		}
	}
	
	if oldestKey != "" {
		delete(c.entries, oldestKey)
	}
}

// cleanup periodically removes expired entries
func (c *Cache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		
		for key, entry := range c.entries {
			if now.After(entry.ExpiresAt) {
				delete(c.entries, key)
			}
		}
		
		c.mu.Unlock()
	}
}