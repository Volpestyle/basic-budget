package extractor

import (
	"testing"
)

func TestExtractFromText(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		expectedGross  float64
		expectedNet    float64
		expectedFreq   string
		shouldError    bool
	}{
		{
			name: "Basic paystub with clear values",
			input: `
				ACME Corporation
				123 Main St, New York, NY 10001
				
				Employee: John Doe
				Employee ID: EMP12345
				
				Pay Period: 01/01/2024 - 01/15/2024
				Pay Date: 01/20/2024
				
				EARNINGS
				Regular Hours: 80.00 @ $25.00 = $2,000.00
				Overtime: 10.00 @ $37.50 = $375.00
				
				Gross Pay: $2,375.00
				
				DEDUCTIONS
				Federal Tax: $237.50
				State Tax: $95.00
				Social Security: $147.25
				Medicare: $34.44
				401k: $118.75
				Health Insurance: $150.00
				
				Net Pay: $1,592.06
			`,
			expectedGross: 2375.00,
			expectedNet:   1592.06,
			expectedFreq:  "semi-monthly",
			shouldError:   false,
		},
		{
			name: "Monthly paystub with YTD values",
			input: `
				TechCorp Inc
				Employee Name: Jane Smith
				
				Period Beginning: 03/01/2024
				Period Ending: 03/31/2024
				
				Current		YTD
				Gross Wages: $8,333.33	$24,999.99
				
				Federal Tax: $1,250.00	$3,750.00
				State Tax: $416.67		$1,250.01
				FICA: $516.66			$1,549.98
				
				Net Amount: $5,950.00	$17,850.00
			`,
			expectedGross: 8333.33,
			expectedNet:   5950.00,
			expectedFreq:  "monthly",
			shouldError:   false,
		},
		{
			name: "Weekly paystub",
			input: `
				Pay Period: 06/10/2024 to 06/16/2024
				
				Gross Pay: 1000.00
				Total Deductions: 250.00
				Net Pay: 750.00
			`,
			expectedGross: 1000.00,
			expectedNet:   750.00,
			expectedFreq:  "weekly",
			shouldError:   false,
		},
		{
			name: "Empty input",
			input: "",
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ExtractFromText(tt.input)
			
			if tt.shouldError {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}
			
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}
			
			if result.GrossPay != tt.expectedGross {
				t.Errorf("GrossPay = %v, want %v", result.GrossPay, tt.expectedGross)
			}
			
			if result.NetPay != tt.expectedNet {
				t.Errorf("NetPay = %v, want %v", result.NetPay, tt.expectedNet)
			}
			
			if result.PayFrequency != tt.expectedFreq {
				t.Errorf("PayFrequency = %v, want %v", result.PayFrequency, tt.expectedFreq)
			}
		})
	}
}

func TestParseMoneyString(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
	}{
		{"$1,234.56", 1234.56},
		{"1234.56", 1234.56},
		{"$1234", 1234.00},
		{"1,234", 1234.00},
		{"$  1,234.56  ", 1234.56},
		{"invalid", 0.00},
		{"", 0.00},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseMoneyString(tt.input)
			if result != tt.expected {
				t.Errorf("parseMoneyString(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestNormalizeDate(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"01/15/2024", "2024-01-15"},
		{"1/5/2024", "2024-01-05"},
		{"2024-01-15", "2024-01-15"},
		{"Jan 15, 2024", "2024-01-15"},
		{"invalid", "invalid"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := normalizeDate(tt.input)
			if result != tt.expected {
				t.Errorf("normalizeDate(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestDetectPayFrequency(t *testing.T) {
	tests := []struct {
		name      string
		startDate string
		endDate   string
		text      string
		expected  string
	}{
		{
			name:      "Weekly from dates",
			startDate: "2024-01-01",
			endDate:   "2024-01-07",
			text:      "",
			expected:  "weekly",
		},
		{
			name:      "Biweekly from dates",
			startDate: "2024-01-01",
			endDate:   "2024-01-14",
			text:      "",
			expected:  "biweekly",
		},
		{
			name:      "Monthly from dates",
			startDate: "2024-01-01",
			endDate:   "2024-01-31",
			text:      "",
			expected:  "monthly",
		},
		{
			name:      "Semi-monthly from dates",
			startDate: "2024-01-01",
			endDate:   "2024-01-15",
			text:      "",
			expected:  "semi-monthly",
		},
		{
			name:      "Explicit weekly",
			startDate: "",
			endDate:   "",
			text:      "Pay Frequency: Weekly",
			expected:  "weekly",
		},
		{
			name:      "Explicit biweekly",
			startDate: "",
			endDate:   "",
			text:      "Paid bi-weekly",
			expected:  "biweekly",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detectPayFrequency(tt.startDate, tt.endDate, tt.text)
			if result != tt.expected {
				t.Errorf("detectPayFrequency() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestCalculateConfidence(t *testing.T) {
	tests := []struct {
		name     string
		data     *PaystubData
		minScore float64
		maxScore float64
	}{
		{
			name: "Complete data",
			data: &PaystubData{
				GrossPay:       2000.00,
				NetPay:         1500.00,
				PayPeriodStart: "2024-01-01",
				PayPeriodEnd:   "2024-01-15",
				Employer:       EmployerInfo{Name: "ACME Corp"},
				Employee:       EmployeeInfo{Name: "John Doe"},
				Earnings:       []EarningItem{{Description: "Regular", Amount: 2000}},
				Deductions:     []DeductionItem{{Description: "Tax", Amount: 500}},
				PayFrequency:   "biweekly",
			},
			minScore: 0.9,
			maxScore: 1.0,
		},
		{
			name: "Minimal data",
			data: &PaystubData{
				GrossPay: 2000.00,
				NetPay:   1500.00,
			},
			minScore: 0.3,
			maxScore: 0.5,
		},
		{
			name:     "Empty data",
			data:     &PaystubData{},
			minScore: 0.0,
			maxScore: 0.1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := calculateConfidence(tt.data)
			if score < tt.minScore || score > tt.maxScore {
				t.Errorf("calculateConfidence() = %v, want between %v and %v", 
					score, tt.minScore, tt.maxScore)
			}
		})
	}
}

func BenchmarkExtractFromText(b *testing.B) {
	input := `
		ACME Corporation
		Employee: John Doe
		Pay Period: 01/01/2024 - 01/15/2024
		Gross Pay: $2,375.00
		Net Pay: $1,592.06
		Federal Tax: $237.50
		State Tax: $95.00
	`
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = ExtractFromText(input)
	}
}