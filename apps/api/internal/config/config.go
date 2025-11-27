package config

import (
	"os"
	"time"
)

type Config struct {
	// DynamoDB
	DynamoDBEndpoint    string
	UsersTable          string
	CategoriesTable     string
	MonthBudgetsTable   string
	TransactionsTable   string
	RecurringRulesTable string
	IncomeStreamsTable  string

	// Auth
	GoogleSecretARN string
	JWTSecret       string
	JWTExpiry       time.Duration

	// Environment
	Environment string
}

func Load() *Config {
	return &Config{
		DynamoDBEndpoint:    getEnv("DYNAMODB_ENDPOINT", ""),
		UsersTable:          getEnv("USERS_TABLE", "basic-budget-users"),
		CategoriesTable:     getEnv("CATEGORIES_TABLE", "basic-budget-categories"),
		MonthBudgetsTable:   getEnv("MONTH_BUDGETS_TABLE", "basic-budget-month-budgets"),
		TransactionsTable:   getEnv("TRANSACTIONS_TABLE", "basic-budget-transactions"),
		RecurringRulesTable: getEnv("RECURRING_RULES_TABLE", "basic-budget-recurring-rules"),
		IncomeStreamsTable:  getEnv("INCOME_STREAMS_TABLE", "basic-budget-income-streams"),
		GoogleSecretARN:     getEnv("GOOGLE_SECRET_ARN", ""),
		JWTSecret:           getEnv("JWT_SECRET", ""),
		JWTExpiry:           time.Hour * 24 * 7, // 7 days
		Environment:         getEnv("ENVIRONMENT", "development"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
