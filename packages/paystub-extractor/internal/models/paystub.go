package models

import (
	"time"
)

// PayFrequency represents how often an employee is paid
type PayFrequency string

const (
	FrequencyWeekly     PayFrequency = "weekly"
	FrequencyBiWeekly   PayFrequency = "biweekly"
	FrequencySemiMonthly PayFrequency = "semi_monthly"
	FrequencyMonthly    PayFrequency = "monthly"
	FrequencyUnknown    PayFrequency = "unknown"
)

// ExtractedField represents a single extracted value with confidence
type ExtractedField struct {
	Value      interface{} `json:"value"`
	Confidence float64     `json:"confidence"` // 0.0 to 1.0
	Source     string      `json:"source"`     // "ocr", "pdf_text", "pattern"
	Location   *Location   `json:"location,omitempty"`
}

// Location represents where in the document a field was found
type Location struct {
	Page   int     `json:"page"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// Money represents a monetary amount
type Money struct {
	Amount   float64  `json:"amount"`
	Currency string   `json:"currency"`
}

// Deduction represents a single deduction from pay
type Deduction struct {
	Name        string  `json:"name"`
	Amount      Money   `json:"amount"`
	YTD         *Money  `json:"ytd,omitempty"`
	Category    string  `json:"category"` // "tax", "benefit", "retirement", "other"
	Confidence  float64 `json:"confidence"`
}

// PaystubData represents extracted paystub information
type PaystubData struct {
	// Core pay information
	GrossPay    *ExtractedField `json:"gross_pay"`
	NetPay      *ExtractedField `json:"net_pay"`
	
	// Pay period information
	PayPeriodStart *time.Time    `json:"pay_period_start,omitempty"`
	PayPeriodEnd   *time.Time    `json:"pay_period_end,omitempty"`
	PayDate        *time.Time    `json:"pay_date,omitempty"`
	PayFrequency   PayFrequency  `json:"pay_frequency"`
	
	// Employee information
	EmployeeName    string `json:"employee_name,omitempty"`
	EmployeeID      string `json:"employee_id,omitempty"`
	
	// Employer information
	EmployerName    string `json:"employer_name,omitempty"`
	
	// Deductions
	TaxDeductions     []Deduction `json:"tax_deductions"`
	BenefitDeductions []Deduction `json:"benefit_deductions"`
	OtherDeductions   []Deduction `json:"other_deductions"`
	
	// YTD totals
	YTDGrossPay *Money `json:"ytd_gross_pay,omitempty"`
	YTDNetPay   *Money `json:"ytd_net_pay,omitempty"`
	YTDTaxes    *Money `json:"ytd_taxes,omitempty"`
	
	// Metadata
	Provider          string    `json:"provider"` // "ADP", "Paychex", "Workday", "Generic"
	OverallConfidence float64   `json:"overall_confidence"`
	ProcessedAt       time.Time `json:"processed_at"`
	ProcessingTimeMs  int64     `json:"processing_time_ms"`
	
	// Raw text for debugging
	RawText string `json:"raw_text,omitempty"`
}

// ProcessingRequest represents an async processing request
type ProcessingRequest struct {
	ID          string    `json:"id"`
	Status      string    `json:"status"` // "pending", "processing", "completed", "failed"
	FileType    string    `json:"file_type"`
	FileName    string    `json:"file_name"`
	FileSize    int64     `json:"file_size"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Result      *PaystubData `json:"result,omitempty"`
	Error       string    `json:"error,omitempty"`
}