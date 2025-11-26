package core

import "time"

// User represents a user in the system
type User struct {
	ID              string    `json:"id" dynamodbav:"user_id"`
	GoogleSub       string    `json:"google_sub" dynamodbav:"google_sub"`
	Email           string    `json:"email" dynamodbav:"email"`
	DisplayName     string    `json:"display_name" dynamodbav:"display_name"`
	AvatarURL       string    `json:"avatar_url,omitempty" dynamodbav:"avatar_url,omitempty"`
	DefaultCurrency string    `json:"default_currency" dynamodbav:"default_currency"`
	Locale          string    `json:"locale" dynamodbav:"locale"`
	CreatedAt       time.Time `json:"created_at" dynamodbav:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// CategoryType represents the type of category
type CategoryType string

const (
	CategoryTypeExpense  CategoryType = "expense"
	CategoryTypeIncome   CategoryType = "income"
	CategoryTypeTransfer CategoryType = "transfer"
)

// Category represents a budget category
type Category struct {
	ID         string       `json:"id" dynamodbav:"category_id"`
	UserID     string       `json:"user_id" dynamodbav:"user_id"`
	Name       string       `json:"name" dynamodbav:"name"`
	Type       CategoryType `json:"type" dynamodbav:"type"`
	Color      string       `json:"color" dynamodbav:"color"`
	Icon       string       `json:"icon" dynamodbav:"icon"`
	SortOrder  int          `json:"sort_order" dynamodbav:"sort_order"`
	IsArchived bool         `json:"is_archived" dynamodbav:"is_archived"`
	CreatedAt  time.Time    `json:"created_at" dynamodbav:"created_at"`
}

// MonthBudget represents a budget for a category in a specific month
type MonthBudget struct {
	ID                 string `json:"id" dynamodbav:"id"`
	UserID             string `json:"user_id" dynamodbav:"user_id"`
	Month              string `json:"month" dynamodbav:"month"`                               // YYYY-MM
	CategoryID         string `json:"category_id" dynamodbav:"category_id"`
	MonthCategory      string `json:"-" dynamodbav:"month_category"`                          // Sort key: "2025-11#cat-123"
	PlannedAmountCents int64  `json:"planned_amount_cents" dynamodbav:"planned_amount_cents"`
}

// TransactionType represents the type of transaction
type TransactionType string

const (
	TransactionTypeExpense  TransactionType = "expense"
	TransactionTypeIncome   TransactionType = "income"
	TransactionTypeTransfer TransactionType = "transfer"
)

// Transaction represents a financial transaction
type Transaction struct {
	ID              string          `json:"id" dynamodbav:"id"`
	UserID          string          `json:"user_id" dynamodbav:"user_id"`
	Type            TransactionType `json:"type" dynamodbav:"type"`
	IncomeStreamID  string          `json:"income_stream_id,omitempty" dynamodbav:"income_stream_id,omitempty"`
	RecurringRuleID string          `json:"recurring_rule_id,omitempty" dynamodbav:"recurring_rule_id,omitempty"`
	CategoryID      string          `json:"category_id" dynamodbav:"category_id"`
	AmountCents     int64           `json:"amount_cents" dynamodbav:"amount_cents"`
	Currency        string          `json:"currency" dynamodbav:"currency"`
	Date            string          `json:"date" dynamodbav:"date"` // YYYY-MM-DD
	Description     string          `json:"description" dynamodbav:"description"`
	Merchant        string          `json:"merchant,omitempty" dynamodbav:"merchant,omitempty"`
	Tags            []string        `json:"tags,omitempty" dynamodbav:"tags,omitempty"`
	DateTxID        string          `json:"-" dynamodbav:"date_tx_id"`       // Sort key: "2025-11-23#tx-123"
	UserCategory    string          `json:"-" dynamodbav:"user_category"`    // GSI PK: "user-123#cat-456"
	CreatedAt       time.Time       `json:"created_at" dynamodbav:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" dynamodbav:"updated_at"`
}

// RecurringInterval represents the interval for recurring payments
type RecurringInterval string

const (
	RecurringIntervalMonthly  RecurringInterval = "monthly"
	RecurringIntervalWeekly   RecurringInterval = "weekly"
	RecurringIntervalBiweekly RecurringInterval = "biweekly"
)

// RecurringRule represents a recurring payment rule
type RecurringRule struct {
	ID                   string            `json:"id" dynamodbav:"recurring_id"`
	UserID               string            `json:"user_id" dynamodbav:"user_id"`
	Type                 TransactionType   `json:"type" dynamodbav:"type"`
	Label                string            `json:"label" dynamodbav:"label"`
	CategoryID           string            `json:"category_id" dynamodbav:"category_id"`
	AmountCents          int64             `json:"amount_cents" dynamodbav:"amount_cents"`
	Currency             string            `json:"currency" dynamodbav:"currency"`
	Interval             RecurringInterval `json:"interval" dynamodbav:"interval"`
	DayOfMonth           int               `json:"day_of_month,omitempty" dynamodbav:"day_of_month,omitempty"`
	Weekday              string            `json:"weekday,omitempty" dynamodbav:"weekday,omitempty"`
	StartDate            string            `json:"start_date" dynamodbav:"start_date"`
	EndDate              string            `json:"end_date,omitempty" dynamodbav:"end_date,omitempty"`
	NextOccurrence       string            `json:"next_occurrence" dynamodbav:"next_occurrence"`
	LinkedIncomeStreamID string            `json:"linked_income_stream_id,omitempty" dynamodbav:"linked_income_stream_id,omitempty"`
	IsActive             bool              `json:"is_active" dynamodbav:"is_active"`
	CreatedAt            time.Time         `json:"created_at" dynamodbav:"created_at"`
}

// IncomeStreamPeriod represents the period for income streams
type IncomeStreamPeriod string

const (
	IncomeStreamPeriodMonthly  IncomeStreamPeriod = "monthly"
	IncomeStreamPeriodBiweekly IncomeStreamPeriod = "biweekly"
	IncomeStreamPeriodOnce     IncomeStreamPeriod = "once"
)

// IncomeStream represents an income source
type IncomeStream struct {
	ID                  string             `json:"id" dynamodbav:"income_stream_id"`
	UserID              string             `json:"user_id" dynamodbav:"user_id"`
	Name                string             `json:"name" dynamodbav:"name"`
	DefaultCategoryID   string             `json:"default_category_id,omitempty" dynamodbav:"default_category_id,omitempty"`
	Period              IncomeStreamPeriod `json:"period" dynamodbav:"period"`
	ExpectedAmountCents int64              `json:"expected_amount_cents" dynamodbav:"expected_amount_cents"`
	IsActive            bool               `json:"is_active" dynamodbav:"is_active"`
	CreatedAt           time.Time          `json:"created_at" dynamodbav:"created_at"`
}
