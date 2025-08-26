package extractor

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// PaystubData represents the extracted paystub information
type PaystubData struct {
	GrossPay      float64                `json:"gross_pay"`
	NetPay        float64                `json:"net_pay"`
	PayPeriodStart string                `json:"pay_period_start"`
	PayPeriodEnd   string                `json:"pay_period_end"`
	PayDate       string                 `json:"pay_date,omitempty"`
	PayFrequency  string                 `json:"pay_frequency"`
	Employer      EmployerInfo           `json:"employer"`
	Employee      EmployeeInfo           `json:"employee"`
	Earnings      []EarningItem          `json:"earnings"`
	Deductions    []DeductionItem        `json:"deductions"`
	Taxes         []TaxItem              `json:"taxes"`
	YTD           map[string]float64     `json:"ytd,omitempty"`
	Confidence    float64                `json:"confidence_score"`
	RawText       string                 `json:"-"` // Store for debugging
}

// EmployerInfo contains employer details
type EmployerInfo struct {
	Name    string `json:"name"`
	Address string `json:"address,omitempty"`
	EIN     string `json:"ein,omitempty"`
}

// EmployeeInfo contains employee details
type EmployeeInfo struct {
	Name       string `json:"name"`
	EmployeeID string `json:"employee_id,omitempty"`
	SSNLast4   string `json:"ssn_last4,omitempty"`
}

// EarningItem represents an earning line item
type EarningItem struct {
	Description string  `json:"description"`
	Hours       float64 `json:"hours,omitempty"`
	Rate        float64 `json:"rate,omitempty"`
	Amount      float64 `json:"amount"`
}

// DeductionItem represents a deduction
type DeductionItem struct {
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	PreTax      bool    `json:"pre_tax"`
}

// TaxItem represents a tax withholding
type TaxItem struct {
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
}

// ExtractFromText processes raw text from PDF and extracts paystub data
func ExtractFromText(text string) (*PaystubData, error) {
	if text == "" {
		return nil, fmt.Errorf("empty text provided")
	}

	data := &PaystubData{
		RawText:    text,
		Earnings:   []EarningItem{},
		Deductions: []DeductionItem{},
		Taxes:      []TaxItem{},
		YTD:        make(map[string]float64),
	}

	// Normalize text for better pattern matching
	normalizedText := normalizeText(text)
	lines := strings.Split(normalizedText, "\n")

	// Extract monetary values
	data.GrossPay = extractMoneyValue(normalizedText, "gross pay", "gross wages", "total earnings", "gross")
	data.NetPay = extractMoneyValue(normalizedText, "net pay", "net wages", "take home", "net amount", "net")

	// Extract dates
	data.PayPeriodStart, data.PayPeriodEnd = extractPayPeriodDates(normalizedText)
	data.PayDate = extractDate(normalizedText, "pay date", "payment date", "check date")

	// Extract employer info
	data.Employer = extractEmployerInfo(lines)

	// Extract employee info
	data.Employee = extractEmployeeInfo(lines)

	// Extract earnings details
	data.Earnings = extractEarnings(lines)

	// Extract deductions
	data.Deductions = extractDeductions(lines)

	// Extract taxes
	data.Taxes = extractTaxes(lines)

	// Extract YTD values
	data.YTD = extractYTDValues(normalizedText)

	// Detect pay frequency
	data.PayFrequency = detectPayFrequency(data.PayPeriodStart, data.PayPeriodEnd, normalizedText)

	// Calculate confidence score
	data.Confidence = calculateConfidence(data)

	// Validate extracted data
	if err := validateExtractedData(data); err != nil {
		return data, fmt.Errorf("validation failed: %w", err)
	}

	return data, nil
}

// normalizeText cleans and normalizes the input text
func normalizeText(text string) string {
	// Remove excessive whitespace
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	// Normalize line breaks
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	// Remove non-printable characters except newlines
	text = regexp.MustCompile(`[^\x20-\x7E\n]+`).ReplaceAllString(text, "")
	return strings.TrimSpace(text)
}

// extractMoneyValue finds monetary values associated with given keywords
func extractMoneyValue(text string, keywords ...string) float64 {
	text = strings.ToLower(text)
	
	// Common money patterns
	moneyPatterns := []string{
		`\$\s*([0-9,]+\.?[0-9]*)`,           // $1,234.56
		`([0-9,]+\.[0-9]{2})`,                // 1,234.56
		`\b([0-9]+\.[0-9]{2})\b`,            // 1234.56
	}

	for _, keyword := range keywords {
		// Look for keyword followed by money amount
		for _, pattern := range moneyPatterns {
			re := regexp.MustCompile(keyword + `[:\s]*` + pattern)
			if matches := re.FindStringSubmatch(text); len(matches) > 1 {
				return parseMoneyString(matches[len(matches)-1])
			}
		}

		// Look for money amount followed by keyword
		for _, pattern := range moneyPatterns {
			re := regexp.MustCompile(pattern + `\s*` + keyword)
			if matches := re.FindStringSubmatch(text); len(matches) > 1 {
				return parseMoneyString(matches[1])
			}
		}
	}

	return 0.0
}

// parseMoneyString converts a money string to float64
func parseMoneyString(s string) float64 {
	// Remove currency symbols and spaces
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, ",", "")
	s = strings.TrimSpace(s)
	
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0.0
	}
	return val
}

// extractPayPeriodDates extracts pay period start and end dates
func extractPayPeriodDates(text string) (string, string) {
	text = strings.ToLower(text)
	
	// Common date patterns
	datePatterns := []string{
		`(\d{1,2}/\d{1,2}/\d{4})`,           // MM/DD/YYYY
		`(\d{1,2}-\d{1,2}-\d{4})`,           // MM-DD-YYYY
		`(\d{4}-\d{2}-\d{2})`,               // YYYY-MM-DD
		`([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})`, // Jan 1, 2024
	}

	// Look for "pay period" followed by date range
	for _, pattern := range datePatterns {
		rangePattern := pattern + `\s*[-–to]+\s*` + pattern
		re := regexp.MustCompile(`pay period[:\s]*` + rangePattern)
		if matches := re.FindStringSubmatch(text); len(matches) >= 3 {
			return normalizeDate(matches[1]), normalizeDate(matches[2])
		}
	}

	// Look for "period beginning" and "period ending"
	startDate := extractDate(text, "period beginning", "period start", "from")
	endDate := extractDate(text, "period ending", "period end", "through", "to")
	
	return startDate, endDate
}

// extractDate extracts a single date associated with keywords
func extractDate(text string, keywords ...string) string {
	text = strings.ToLower(text)
	
	datePatterns := []string{
		`(\d{1,2}/\d{1,2}/\d{4})`,
		`(\d{1,2}-\d{1,2}-\d{4})`,
		`(\d{4}-\d{2}-\d{2})`,
		`([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})`,
	}

	for _, keyword := range keywords {
		for _, pattern := range datePatterns {
			re := regexp.MustCompile(keyword + `[:\s]*` + pattern)
			if matches := re.FindStringSubmatch(text); len(matches) > 1 {
				return normalizeDate(matches[1])
			}
		}
	}

	return ""
}

// normalizeDate converts various date formats to YYYY-MM-DD
func normalizeDate(dateStr string) string {
	dateStr = strings.TrimSpace(dateStr)
	
	// Try parsing common formats
	formats := []string{
		"01/02/2006",
		"1/2/2006",
		"01-02-2006",
		"1-2-2006",
		"2006-01-02",
		"Jan 2, 2006",
		"Jan 2 2006",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t.Format("2006-01-02")
		}
	}

	return dateStr // Return original if can't parse
}

// extractEmployerInfo extracts employer details from text
func extractEmployerInfo(lines []string) EmployerInfo {
	info := EmployerInfo{}
	
	for i, line := range lines {
		lineLower := strings.ToLower(line)
		
		// Look for employer name
		if strings.Contains(lineLower, "employer") || strings.Contains(lineLower, "company") {
			// The name might be on the same line or the next line
			if colonIdx := strings.Index(line, ":"); colonIdx > -1 {
				info.Name = strings.TrimSpace(line[colonIdx+1:])
			} else if i+1 < len(lines) {
				info.Name = strings.TrimSpace(lines[i+1])
			}
		}

		// Look for EIN
		if einMatch := regexp.MustCompile(`\b\d{2}-\d{7}\b`).FindString(line); einMatch != "" {
			info.EIN = einMatch
		}

		// First non-empty lines often contain company info
		if i < 5 && info.Name == "" && len(line) > 0 && !strings.Contains(lineLower, "paystub") && !strings.Contains(lineLower, "earnings statement") {
			// Check if line looks like a company name (capitalized, not all numbers)
			if regexp.MustCompile(`^[A-Z]`).MatchString(line) && !regexp.MustCompile(`^\d+$`).MatchString(line) {
				info.Name = strings.TrimSpace(line)
			}
		}
	}

	return info
}

// extractEmployeeInfo extracts employee details from text
func extractEmployeeInfo(lines []string) EmployeeInfo {
	info := EmployeeInfo{}
	
	for i, line := range lines {
		lineLower := strings.ToLower(line)
		
		// Look for employee name
		if strings.Contains(lineLower, "employee name") || strings.Contains(lineLower, "employee:") {
			if colonIdx := strings.Index(line, ":"); colonIdx > -1 {
				info.Name = strings.TrimSpace(line[colonIdx+1:])
			} else if i+1 < len(lines) {
				info.Name = strings.TrimSpace(lines[i+1])
			}
		}

		// Look for employee ID
		if strings.Contains(lineLower, "employee id") || strings.Contains(lineLower, "emp id") {
			if match := regexp.MustCompile(`\b[A-Z0-9]{4,}\b`).FindString(line); match != "" {
				info.EmployeeID = match
			}
		}

		// Look for SSN (last 4 digits)
		if strings.Contains(lineLower, "ssn") || strings.Contains(lineLower, "social") {
			if match := regexp.MustCompile(`\*{3,}-?\d{4}\b|\bXXX-XX-\d{4}\b`).FindString(line); match != "" {
				info.SSNLast4 = regexp.MustCompile(`\d{4}`).FindString(match)
			}
		}
	}

	return info
}

// extractEarnings extracts earning line items
func extractEarnings(lines []string) []EarningItem {
	earnings := []EarningItem{}
	inEarningsSection := false
	
	earningKeywords := []string{"regular", "overtime", "bonus", "commission", "tips", "holiday", "vacation", "sick", "pto"}
	
	for _, line := range lines {
		lineLower := strings.ToLower(line)
		
		// Check if we're in earnings section
		if strings.Contains(lineLower, "earnings") || strings.Contains(lineLower, "wages") {
			inEarningsSection = true
			continue
		}
		
		// Check if we've left earnings section
		if inEarningsSection && (strings.Contains(lineLower, "deductions") || strings.Contains(lineLower, "taxes")) {
			inEarningsSection = false
			continue
		}
		
		// Look for earning items
		for _, keyword := range earningKeywords {
			if strings.Contains(lineLower, keyword) {
				item := EarningItem{Description: keyword}
				
				// Extract hours, rate, and amount
				if hoursMatch := regexp.MustCompile(`(\d+\.?\d*)\s*h(?:ou)?rs?`).FindStringSubmatch(line); len(hoursMatch) > 1 {
					item.Hours, _ = strconv.ParseFloat(hoursMatch[1], 64)
				}
				
				if rateMatch := regexp.MustCompile(`\$?(\d+\.?\d*)\s*/\s*h(?:ou)?r?`).FindStringSubmatch(line); len(rateMatch) > 1 {
					item.Rate, _ = strconv.ParseFloat(rateMatch[1], 64)
				}
				
				// Extract amount (rightmost money value usually)
				moneyValues := regexp.MustCompile(`\$?(\d+,?\d*\.?\d{0,2})`).FindAllStringSubmatch(line, -1)
				if len(moneyValues) > 0 {
					item.Amount = parseMoneyString(moneyValues[len(moneyValues)-1][1])
				}
				
				if item.Amount > 0 {
					earnings = append(earnings, item)
					break
				}
			}
		}
	}
	
	return earnings
}

// extractDeductions extracts deduction items
func extractDeductions(lines []string) []DeductionItem {
	deductions := []DeductionItem{}
	inDeductionsSection := false
	
	deductionKeywords := []string{"401k", "403b", "insurance", "health", "dental", "vision", "life", "disability", "fsa", "hsa", "union", "garnishment"}
	preTaxKeywords := []string{"401k", "403b", "health", "dental", "vision", "fsa", "hsa", "pre-tax", "pretax"}
	
	for _, line := range lines {
		lineLower := strings.ToLower(line)
		
		// Check if we're in deductions section
		if strings.Contains(lineLower, "deduction") {
			inDeductionsSection = true
			continue
		}
		
		// Check if we've left deductions section
		if inDeductionsSection && strings.Contains(lineLower, "net pay") {
			inDeductionsSection = false
			continue
		}
		
		// Look for deduction items
		for _, keyword := range deductionKeywords {
			if strings.Contains(lineLower, keyword) {
				item := DeductionItem{Description: keyword}
				
				// Check if pre-tax
				for _, preTax := range preTaxKeywords {
					if strings.Contains(lineLower, preTax) {
						item.PreTax = true
						break
					}
				}
				
				// Extract amount (rightmost money value usually)
				moneyValues := regexp.MustCompile(`\$?(\d+,?\d*\.?\d{0,2})`).FindAllStringSubmatch(line, -1)
				if len(moneyValues) > 0 {
					item.Amount = parseMoneyString(moneyValues[len(moneyValues)-1][1])
				}
				
				if item.Amount > 0 {
					deductions = append(deductions, item)
					break
				}
			}
		}
	}
	
	return deductions
}

// extractTaxes extracts tax items
func extractTaxes(lines []string) []TaxItem {
	taxes := []TaxItem{}
	
	taxKeywords := []string{
		"federal", "fed", "state", "local", "city", "fica", "social security", 
		"medicare", "sdi", "sui", "futa", "suta", "withholding",
	}
	
	for _, line := range lines {
		lineLower := strings.ToLower(line)
		
		for _, keyword := range taxKeywords {
			if strings.Contains(lineLower, keyword) && strings.Contains(lineLower, "tax") {
				item := TaxItem{Description: keyword + " tax"}
				
				// Extract amount
				moneyValues := regexp.MustCompile(`\$?(\d+,?\d*\.?\d{0,2})`).FindAllStringSubmatch(line, -1)
				if len(moneyValues) > 0 {
					item.Amount = parseMoneyString(moneyValues[len(moneyValues)-1][1])
				}
				
				if item.Amount > 0 {
					taxes = append(taxes, item)
					break
				}
			}
		}
	}
	
	return taxes
}

// extractYTDValues extracts year-to-date values
func extractYTDValues(text string) map[string]float64 {
	ytd := make(map[string]float64)
	text = strings.ToLower(text)
	
	// Look for YTD section
	ytdPattern := regexp.MustCompile(`ytd|year[\s-]to[\s-]date`)
	if !ytdPattern.MatchString(text) {
		return ytd
	}
	
	// Common YTD categories
	categories := []string{"gross", "net", "federal", "state", "fica", "medicare", "401k", "deductions"}
	
	for _, category := range categories {
		pattern := regexp.MustCompile(category + `[\s\w]*ytd[:\s]*\$?(\d+,?\d*\.?\d{0,2})`)
		if matches := pattern.FindStringSubmatch(text); len(matches) > 1 {
			ytd[category] = parseMoneyString(matches[1])
		}
	}
	
	return ytd
}

// detectPayFrequency analyzes dates and text to determine pay frequency
func detectPayFrequency(startDate, endDate, text string) string {
	text = strings.ToLower(text)
	
	// Check for explicit frequency mentions - but be careful about substrings
	// Check bi-weekly/biweekly before weekly
	if strings.Contains(text, "bi-weekly") || strings.Contains(text, "biweekly") {
		return "biweekly"
	}
	if strings.Contains(text, "semi-monthly") || strings.Contains(text, "semimonthly") {
		return "semi-monthly"
	}
	// Check weekly only if not part of bi-weekly
	if strings.Contains(text, "weekly") && !strings.Contains(text, "bi") {
		return "weekly"
	}
	if strings.Contains(text, "monthly") && !strings.Contains(text, "semi") {
		return "monthly"
	}
	
	// Try to infer from date range
	if startDate != "" && endDate != "" {
		start, err1 := time.Parse("2006-01-02", startDate)
		end, err2 := time.Parse("2006-01-02", endDate)
		
		if err1 == nil && err2 == nil {
			days := int(end.Sub(start).Hours()/24) + 1 // Include both start and end dates
			
			switch {
			case days >= 6 && days <= 8:
				return "weekly"
			case days == 14 || days == 15:
				// Check if it's semi-monthly (1st-15th or 16th-end of month)
				if (start.Day() == 1 && end.Day() == 15) || (start.Day() == 16 && end.Day() >= 28) {
					return "semi-monthly"
				}
				return "biweekly"
			case days >= 13 && days <= 16:
				// Additional check for semi-monthly pattern
				if start.Day() == 1 || start.Day() == 16 {
					return "semi-monthly"
				}
				return "biweekly"
			case days >= 28 && days <= 31:
				return "monthly"
			}
		}
	}
	
	return "unknown"
}

// calculateConfidence calculates a confidence score for the extraction
func calculateConfidence(data *PaystubData) float64 {
	score := 0.0
	maxScore := 0.0
	
	// Check for essential fields
	if data.GrossPay > 0 {
		score += 20
	}
	maxScore += 20
	
	if data.NetPay > 0 {
		score += 20
	}
	maxScore += 20
	
	if data.PayPeriodStart != "" && data.PayPeriodEnd != "" {
		score += 15
	}
	maxScore += 15
	
	if data.Employer.Name != "" {
		score += 10
	}
	maxScore += 10
	
	if data.Employee.Name != "" {
		score += 10
	}
	maxScore += 10
	
	if len(data.Earnings) > 0 {
		score += 10
	}
	maxScore += 10
	
	if len(data.Deductions) > 0 || len(data.Taxes) > 0 {
		score += 10
	}
	maxScore += 10
	
	if data.PayFrequency != "unknown" {
		score += 5
	}
	maxScore += 5
	
	if maxScore == 0 {
		return 0
	}
	
	return score / maxScore
}

// validateExtractedData performs basic validation on extracted data
func validateExtractedData(data *PaystubData) error {
	// Check if we have minimum required data
	if data.GrossPay == 0 && data.NetPay == 0 {
		return fmt.Errorf("unable to extract pay amounts")
	}
	
	// Validate that net pay doesn't exceed gross pay
	if data.NetPay > 0 && data.GrossPay > 0 && data.NetPay > data.GrossPay {
		// Sometimes they might be swapped
		data.GrossPay, data.NetPay = data.NetPay, data.GrossPay
	}
	
	// Validate date formats
	if data.PayPeriodStart != "" {
		if _, err := time.Parse("2006-01-02", data.PayPeriodStart); err != nil {
			// Try to fix the date format
			data.PayPeriodStart = normalizeDate(data.PayPeriodStart)
		}
	}
	
	if data.PayPeriodEnd != "" {
		if _, err := time.Parse("2006-01-02", data.PayPeriodEnd); err != nil {
			data.PayPeriodEnd = normalizeDate(data.PayPeriodEnd)
		}
	}
	
	return nil
}