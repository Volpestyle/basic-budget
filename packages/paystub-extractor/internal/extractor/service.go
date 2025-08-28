package extractor

import (
	"bytes"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/basic-budget/paystub-extractor/internal/models"
	"github.com/basic-budget/paystub-extractor/internal/ocr"
	"github.com/basic-budget/paystub-extractor/internal/patterns"
	"github.com/basic-budget/paystub-extractor/pkg/confidence"
)

// Service handles paystub extraction
type Service struct {
	config        Config
	ocrClient     *ocr.Client
	cache         *Cache
	patternMatcher *patterns.Matcher
}

// Config contains service configuration
type Config struct {
	EnableOCR         bool
	CacheEnabled      bool
	MaxFileSize       int64
	ProcessingTimeout time.Duration
}

// NewService creates a new extractor service
func NewService(config Config) (*Service, error) {
	s := &Service{
		config: config,
		patternMatcher: patterns.NewMatcher(),
	}

	// Initialize OCR if enabled
	if config.EnableOCR {
		ocrClient, err := ocr.NewClient()
		if err != nil {
			return nil, fmt.Errorf("failed to initialize OCR: %w", err)
		}
		s.ocrClient = ocrClient
	}

	// Initialize cache if enabled
	if config.CacheEnabled {
		s.cache = NewCache(100, 15*time.Minute)
	}

	return s, nil
}

// Extract extracts paystub data from a file
func (s *Service) Extract(data []byte, contentType string) (*models.PaystubData, error) {
	// Check cache
	if s.cache != nil {
		if cached := s.cache.Get(data); cached != nil {
			return cached, nil
		}
	}

	// Determine extraction method
	var text string
	var err error

	switch {
	case strings.Contains(contentType, "pdf"):
		text, err = s.extractFromPDF(data)
	case strings.Contains(contentType, "image"):
		text, err = s.extractFromImage(data)
	default:
		return nil, fmt.Errorf("unsupported file type: %s", contentType)
	}

	if err != nil {
		return nil, fmt.Errorf("extraction failed: %w", err)
	}

	// Parse extracted text
	result := s.parsePaystub(text)

	// Store in cache
	if s.cache != nil && result.OverallConfidence > 0.7 {
		s.cache.Set(data, result)
	}

	return result, nil
}

// extractFromPDF extracts text from PDF
func (s *Service) extractFromPDF(data []byte) (string, error) {
	// First try direct text extraction
	text, err := extractPDFText(data)
	if err == nil && len(strings.TrimSpace(text)) > 100 {
		return text, nil
	}

	// Fall back to OCR if enabled and text extraction failed
	if s.ocrClient != nil {
		return s.ocrClient.ProcessPDF(data)
	}

	if text == "" {
		return "", fmt.Errorf("PDF appears to be scanned and OCR is disabled")
	}

	return text, nil
}

// extractFromImage extracts text from an image
func (s *Service) extractFromImage(data []byte) (string, error) {
	if s.ocrClient == nil {
		return "", fmt.Errorf("OCR is required for image processing but is disabled")
	}
	return s.ocrClient.ProcessImage(data)
}

// parsePaystub parses paystub data from text
func (s *Service) parsePaystub(text string) *models.PaystubData {
	result := &models.PaystubData{
		RawText: text,
		TaxDeductions: []models.Deduction{},
		BenefitDeductions: []models.Deduction{},
		OtherDeductions: []models.Deduction{},
	}

	// Detect provider
	result.Provider = s.detectProvider(text)

	// Extract monetary values
	s.extractMonetaryValues(text, result)

	// Extract dates
	s.extractDates(text, result)

	// Extract deductions
	s.extractDeductions(text, result)

	// Extract employee/employer info
	s.extractEntityInfo(text, result)

	// Detect pay frequency
	result.PayFrequency = s.detectPayFrequency(result)

	// Calculate overall confidence
	result.OverallConfidence = s.calculateOverallConfidence(result)

	return result
}

// detectProvider detects the paystub provider
func (s *Service) detectProvider(text string) string {
	textLower := strings.ToLower(text)
	
	providers := map[string][]string{
		"ADP": {"adp", "automatic data processing", "adp.com"},
		"Paychex": {"paychex", "paychex.com"},
		"Workday": {"workday", "workday.com"},
		"Gusto": {"gusto", "gusto.com"},
		"Paylocity": {"paylocity", "paylocity.com"},
		"Paycor": {"paycor", "paycor.com"},
	}

	for provider, keywords := range providers {
		for _, keyword := range keywords {
			if strings.Contains(textLower, keyword) {
				return provider
			}
		}
	}

	return "Generic"
}

// extractMonetaryValues extracts monetary amounts from text
func (s *Service) extractMonetaryValues(text string, result *models.PaystubData) {
	// Patterns for different monetary formats
	patterns := map[string]*regexp.Regexp{
		"gross_pay": regexp.MustCompile(`(?i)gross\s*pay[:\s]*\$?([\d,]+\.?\d{0,2})`),
		"net_pay": regexp.MustCompile(`(?i)net\s*pay[:\s]*\$?([\d,]+\.?\d{0,2})`),
		"ytd_gross": regexp.MustCompile(`(?i)ytd\s*gross[:\s]*\$?([\d,]+\.?\d{0,2})`),
		"ytd_net": regexp.MustCompile(`(?i)ytd\s*net[:\s]*\$?([\d,]+\.?\d{0,2})`),
	}

	// Extract gross pay
	if match := patterns["gross_pay"].FindStringSubmatch(text); len(match) > 1 {
		if amount := parseAmount(match[1]); amount > 0 {
			result.GrossPay = &models.ExtractedField{
				Value: models.Money{Amount: amount, Currency: "USD"},
				Confidence: 0.9,
				Source: "pattern",
			}
		}
	}

	// Extract net pay
	if match := patterns["net_pay"].FindStringSubmatch(text); len(match) > 1 {
		if amount := parseAmount(match[1]); amount > 0 {
			result.NetPay = &models.ExtractedField{
				Value: models.Money{Amount: amount, Currency: "USD"},
				Confidence: 0.9,
				Source: "pattern",
			}
		}
	}

	// Extract YTD values
	if match := patterns["ytd_gross"].FindStringSubmatch(text); len(match) > 1 {
		if amount := parseAmount(match[1]); amount > 0 {
			result.YTDGrossPay = &models.Money{Amount: amount, Currency: "USD"}
		}
	}

	if match := patterns["ytd_net"].FindStringSubmatch(text); len(match) > 1 {
		if amount := parseAmount(match[1]); amount > 0 {
			result.YTDNetPay = &models.Money{Amount: amount, Currency: "USD"}
		}
	}
}

// extractDates extracts date information from text
func (s *Service) extractDates(text string, result *models.PaystubData) {
	// Common date patterns
	datePatterns := []*regexp.Regexp{
		regexp.MustCompile(`(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})`),
		regexp.MustCompile(`(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})`),
		regexp.MustCompile(`([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})`),
	}

	// Look for pay period
	periodPattern := regexp.MustCompile(`(?i)pay\s*period[:\s]*([^-]+)-([^\n]+)`)
	if match := periodPattern.FindStringSubmatch(text); len(match) > 2 {
		if start := parseDate(match[1]); start != nil {
			result.PayPeriodStart = start
		}
		if end := parseDate(match[2]); end != nil {
			result.PayPeriodEnd = end
		}
	}

	// Look for pay date
	payDatePattern := regexp.MustCompile(`(?i)pay\s*date[:\s]*([^\n]+)`)
	if match := payDatePattern.FindStringSubmatch(text); len(match) > 1 {
		if date := parseDate(match[1]); date != nil {
			result.PayDate = date
		}
	}
}

// extractDeductions extracts tax and benefit deductions
func (s *Service) extractDeductions(text string, result *models.PaystubData) {
	lines := strings.Split(text, "\n")
	
	// Tax keywords
	taxKeywords := []string{"federal", "state", "local", "fica", "medicare", "social security", "sdi", "sui", "futa", "suta", "tax"}
	
	// Benefit keywords
	benefitKeywords := []string{"health", "dental", "vision", "life", "401k", "403b", "retirement", "pension", "insurance", "hsa", "fsa"}
	
	deductionPattern := regexp.MustCompile(`([A-Za-z\s]+)[:\s]+\$?([\d,]+\.?\d{0,2})`)
	
	for _, line := range lines {
		if match := deductionPattern.FindStringSubmatch(line); len(match) > 2 {
			name := strings.TrimSpace(match[1])
			amount := parseAmount(match[2])
			
			if amount > 0 {
				nameLower := strings.ToLower(name)
				
				// Categorize deduction
				var category string
				if containsAny(nameLower, taxKeywords) {
					category = "tax"
					result.TaxDeductions = append(result.TaxDeductions, models.Deduction{
						Name: name,
						Amount: models.Money{Amount: amount, Currency: "USD"},
						Category: category,
						Confidence: 0.8,
					})
				} else if containsAny(nameLower, benefitKeywords) {
					category = "benefit"
					result.BenefitDeductions = append(result.BenefitDeductions, models.Deduction{
						Name: name,
						Amount: models.Money{Amount: amount, Currency: "USD"},
						Category: category,
						Confidence: 0.8,
					})
				}
			}
		}
	}
}

// extractEntityInfo extracts employee and employer information
func (s *Service) extractEntityInfo(text string, result *models.PaystubData) {
	// Employee name pattern
	employeePattern := regexp.MustCompile(`(?i)employee[:\s]*([A-Za-z\s]+)`)
	if match := employeePattern.FindStringSubmatch(text); len(match) > 1 {
		result.EmployeeName = strings.TrimSpace(match[1])
	}
	
	// Employee ID pattern
	empIDPattern := regexp.MustCompile(`(?i)emp(?:loyee)?\s*(?:id|#)[:\s]*([A-Za-z0-9]+)`)
	if match := empIDPattern.FindStringSubmatch(text); len(match) > 1 {
		result.EmployeeID = strings.TrimSpace(match[1])
	}
	
	// Employer name - often at the top of the document
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		if i < 5 && len(line) > 5 && !strings.Contains(strings.ToLower(line), "pay") {
			// Likely company name if it's in the first few lines
			result.EmployerName = strings.TrimSpace(line)
			break
		}
	}
}

// detectPayFrequency detects the payment frequency
func (s *Service) detectPayFrequency(result *models.PaystubData) models.PayFrequency {
	if result.PayPeriodStart != nil && result.PayPeriodEnd != nil {
		days := result.PayPeriodEnd.Sub(*result.PayPeriodStart).Hours() / 24
		
		switch {
		case days >= 6 && days <= 8:
			return models.FrequencyWeekly
		case days >= 13 && days <= 15:
			return models.FrequencyBiWeekly
		case days >= 27 && days <= 32:
			return models.FrequencyMonthly
		case days >= 14 && days <= 17:
			return models.FrequencySemiMonthly
		}
	}
	
	// Check for explicit frequency in text
	textLower := strings.ToLower(result.RawText)
	if strings.Contains(textLower, "weekly") && !strings.Contains(textLower, "bi-weekly") {
		return models.FrequencyWeekly
	} else if strings.Contains(textLower, "bi-weekly") || strings.Contains(textLower, "biweekly") {
		return models.FrequencyBiWeekly
	} else if strings.Contains(textLower, "semi-monthly") {
		return models.FrequencySemiMonthly
	} else if strings.Contains(textLower, "monthly") {
		return models.FrequencyMonthly
	}
	
	return models.FrequencyUnknown
}

// calculateOverallConfidence calculates the overall confidence score
func (s *Service) calculateOverallConfidence(result *models.PaystubData) float64 {
	var totalConfidence float64
	var count float64
	
	// Core fields confidence
	if result.GrossPay != nil {
		totalConfidence += result.GrossPay.Confidence
		count++
	}
	if result.NetPay != nil {
		totalConfidence += result.NetPay.Confidence
		count++
	}
	
	// Date confidence
	if result.PayPeriodStart != nil && result.PayPeriodEnd != nil {
		totalConfidence += 0.8
		count++
	}
	
	// Deduction confidence
	if len(result.TaxDeductions) > 0 {
		avgConfidence := 0.0
		for _, d := range result.TaxDeductions {
			avgConfidence += d.Confidence
		}
		totalConfidence += avgConfidence / float64(len(result.TaxDeductions))
		count++
	}
	
	// Provider confidence
	if result.Provider != "Generic" {
		totalConfidence += 0.9
		count++
	}
	
	if count == 0 {
		return 0
	}
	
	return totalConfidence / count
}

// IsOCREnabled returns whether OCR is enabled
func (s *Service) IsOCREnabled() bool {
	return s.ocrClient != nil
}

// Close closes the service
func (s *Service) Close() error {
	if s.ocrClient != nil {
		return s.ocrClient.Close()
	}
	return nil
}

// Helper functions

func parseAmount(s string) float64 {
	// Remove commas and dollar signs
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "$", "")
	s = strings.TrimSpace(s)
	
	var amount float64
	fmt.Sscanf(s, "%f", &amount)
	return amount
}

func parseDate(s string) *time.Time {
	s = strings.TrimSpace(s)
	
	// Try common date formats
	formats := []string{
		"1/2/2006",
		"01/02/2006",
		"2006-01-02",
		"Jan 2, 2006",
		"January 2, 2006",
		"1-2-2006",
		"01-02-2006",
	}
	
	for _, format := range formats {
		if t, err := time.Parse(format, s); err == nil {
			return &t
		}
	}
	
	return nil
}

func containsAny(s string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(s, keyword) {
			return true
		}
	}
	return false
}