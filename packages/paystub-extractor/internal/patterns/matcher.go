package patterns

import (
	"regexp"
	"strings"
)

// Provider represents a paystub provider
type Provider struct {
	Name     string
	Patterns []Pattern
}

// Pattern represents a matching pattern
type Pattern struct {
	Name       string
	Regex      *regexp.Regexp
	FieldType  string // "gross_pay", "net_pay", "deduction", etc.
	Confidence float64
}

// Matcher handles pattern matching for different providers
type Matcher struct {
	providers map[string]*Provider
}

// NewMatcher creates a new pattern matcher
func NewMatcher() *Matcher {
	m := &Matcher{
		providers: make(map[string]*Provider),
	}
	
	m.initializeProviders()
	return m
}

// initializeProviders sets up provider-specific patterns
func (m *Matcher) initializeProviders() {
	// ADP patterns
	m.providers["ADP"] = &Provider{
		Name: "ADP",
		Patterns: []Pattern{
			{
				Name:       "gross_pay",
				Regex:      regexp.MustCompile(`(?i)gross\s*earnings[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "gross_pay",
				Confidence: 0.95,
			},
			{
				Name:       "net_pay",
				Regex:      regexp.MustCompile(`(?i)net\s*pay[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "net_pay",
				Confidence: 0.95,
			},
			{
				Name:       "federal_tax",
				Regex:      regexp.MustCompile(`(?i)federal\s*income\s*tax[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "tax",
				Confidence: 0.9,
			},
			{
				Name:       "pay_period",
				Regex:      regexp.MustCompile(`(?i)pay\s*period[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*-\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})`),
				FieldType:  "date_range",
				Confidence: 0.9,
			},
		},
	}

	// Paychex patterns
	m.providers["Paychex"] = &Provider{
		Name: "Paychex",
		Patterns: []Pattern{
			{
				Name:       "gross_pay",
				Regex:      regexp.MustCompile(`(?i)total\s*gross[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "gross_pay",
				Confidence: 0.95,
			},
			{
				Name:       "net_pay",
				Regex:      regexp.MustCompile(`(?i)net\s*amount[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "net_pay",
				Confidence: 0.95,
			},
			{
				Name:       "employee_id",
				Regex:      regexp.MustCompile(`(?i)employee\s*#[:\s]*([A-Za-z0-9]+)`),
				FieldType:  "employee_id",
				Confidence: 0.85,
			},
		},
	}

	// Workday patterns
	m.providers["Workday"] = &Provider{
		Name: "Workday",
		Patterns: []Pattern{
			{
				Name:       "gross_pay",
				Regex:      regexp.MustCompile(`(?i)gross\s*pay[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "gross_pay",
				Confidence: 0.95,
			},
			{
				Name:       "net_pay",
				Regex:      regexp.MustCompile(`(?i)net\s*pay[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "net_pay",
				Confidence: 0.95,
			},
			{
				Name:       "pay_date",
				Regex:      regexp.MustCompile(`(?i)payment\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})`),
				FieldType:  "pay_date",
				Confidence: 0.9,
			},
		},
	}

	// Gusto patterns
	m.providers["Gusto"] = &Provider{
		Name: "Gusto",
		Patterns: []Pattern{
			{
				Name:       "gross_pay",
				Regex:      regexp.MustCompile(`(?i)gross\s*wages[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "gross_pay",
				Confidence: 0.95,
			},
			{
				Name:       "net_pay",
				Regex:      regexp.MustCompile(`(?i)take[\s-]*home[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "net_pay",
				Confidence: 0.95,
			},
		},
	}

	// Generic patterns (fallback)
	m.providers["Generic"] = &Provider{
		Name: "Generic",
		Patterns: []Pattern{
			// Gross pay variations
			{
				Name:       "gross_pay_1",
				Regex:      regexp.MustCompile(`(?i)gross\s*(?:pay|earnings?|wages?|salary)[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "gross_pay",
				Confidence: 0.8,
			},
			{
				Name:       "gross_pay_2",
				Regex:      regexp.MustCompile(`(?i)total\s*(?:gross|earnings?)[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "gross_pay",
				Confidence: 0.8,
			},
			// Net pay variations
			{
				Name:       "net_pay_1",
				Regex:      regexp.MustCompile(`(?i)net\s*(?:pay|amount|wages?)[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "net_pay",
				Confidence: 0.8,
			},
			{
				Name:       "net_pay_2",
				Regex:      regexp.MustCompile(`(?i)take[\s-]*home\s*(?:pay|amount)?[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "net_pay",
				Confidence: 0.8,
			},
			// Common tax patterns
			{
				Name:       "federal_tax",
				Regex:      regexp.MustCompile(`(?i)federal\s*(?:income\s*)?(?:tax|withholding)[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "tax",
				Confidence: 0.75,
			},
			{
				Name:       "state_tax",
				Regex:      regexp.MustCompile(`(?i)state\s*(?:income\s*)?(?:tax|withholding)[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "tax",
				Confidence: 0.75,
			},
			{
				Name:       "fica",
				Regex:      regexp.MustCompile(`(?i)(?:fica|social\s*security)[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "tax",
				Confidence: 0.75,
			},
			{
				Name:       "medicare",
				Regex:      regexp.MustCompile(`(?i)medicare[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "tax",
				Confidence: 0.75,
			},
			// Benefit patterns
			{
				Name:       "health_insurance",
				Regex:      regexp.MustCompile(`(?i)(?:health|medical)\s*(?:insurance|ins\.?)?[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "benefit",
				Confidence: 0.7,
			},
			{
				Name:       "dental",
				Regex:      regexp.MustCompile(`(?i)dental\s*(?:insurance|ins\.?)?[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "benefit",
				Confidence: 0.7,
			},
			{
				Name:       "vision",
				Regex:      regexp.MustCompile(`(?i)vision\s*(?:insurance|ins\.?)?[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "benefit",
				Confidence: 0.7,
			},
			{
				Name:       "401k",
				Regex:      regexp.MustCompile(`(?i)401\s*k[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "retirement",
				Confidence: 0.75,
			},
			// Date patterns
			{
				Name:       "pay_period",
				Regex:      regexp.MustCompile(`(?i)(?:pay\s*)?period[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*[-–]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})`),
				FieldType:  "date_range",
				Confidence: 0.8,
			},
			{
				Name:       "pay_date",
				Regex:      regexp.MustCompile(`(?i)(?:pay|payment)\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})`),
				FieldType:  "pay_date",
				Confidence: 0.8,
			},
			// YTD patterns
			{
				Name:       "ytd_gross",
				Regex:      regexp.MustCompile(`(?i)ytd\s*gross[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "ytd_gross",
				Confidence: 0.85,
			},
			{
				Name:       "ytd_net",
				Regex:      regexp.MustCompile(`(?i)ytd\s*net[:\s]*\$?([\d,]+\.?\d{0,2})`),
				FieldType:  "ytd_net",
				Confidence: 0.85,
			},
		},
	}
}

// MatchProvider attempts to match text against provider patterns
func (m *Matcher) MatchProvider(text string, providerName string) map[string]MatchResult {
	provider, exists := m.providers[providerName]
	if !exists {
		provider = m.providers["Generic"]
	}

	results := make(map[string]MatchResult)
	
	for _, pattern := range provider.Patterns {
		if matches := pattern.Regex.FindAllStringSubmatch(text, -1); len(matches) > 0 {
			results[pattern.Name] = MatchResult{
				Pattern:    pattern,
				Matches:    matches,
				Confidence: pattern.Confidence,
			}
		}
	}

	return results
}

// DetectProvider attempts to detect the provider from text
func (m *Matcher) DetectProvider(text string) string {
	textLower := strings.ToLower(text)
	
	// Check for provider indicators
	indicators := map[string][]string{
		"ADP": {"adp", "automatic data processing", "adp.com", "adp workforce"},
		"Paychex": {"paychex", "paychex.com", "paychex flex"},
		"Workday": {"workday", "workday.com", "powered by workday"},
		"Gusto": {"gusto", "gusto.com", "gustohq"},
		"Paylocity": {"paylocity", "paylocity.com"},
		"Paycor": {"paycor", "paycor.com"},
	}

	for provider, keywords := range indicators {
		for _, keyword := range keywords {
			if strings.Contains(textLower, keyword) {
				return provider
			}
		}
	}

	return "Generic"
}

// MatchResult represents a pattern match result
type MatchResult struct {
	Pattern    Pattern
	Matches    [][]string
	Confidence float64
}

// GetBestMatch returns the best match from multiple results
func GetBestMatch(results map[string]MatchResult, fieldType string) *MatchResult {
	var best *MatchResult
	var bestConfidence float64
	
	for _, result := range results {
		if result.Pattern.FieldType == fieldType && result.Confidence > bestConfidence {
			r := result
			best = &r
			bestConfidence = result.Confidence
		}
	}
	
	return best
}