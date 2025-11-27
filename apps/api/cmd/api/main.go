package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	chiadapter "github.com/awslabs/aws-lambda-go-api-proxy/chi"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/auth"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/config"
	httpapi "github.com/jamesvolpe/basic-budget/apps/api/internal/http"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/http/handlers"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

func isLambda() bool {
	return os.Getenv("AWS_LAMBDA_RUNTIME_API") != ""
}

func main() {
	ctx := context.Background()

	// Load config
	cfg := config.Load()

	// Initialize DynamoDB client
	var (
		dbClient *storage.Client
		err      error
	)
	if cfg.DynamoDBEndpoint != "" {
		log.Printf("Using DynamoDB endpoint: %s", cfg.DynamoDBEndpoint)
		dbClient, err = storage.NewClientWithEndpoint(ctx, cfg.DynamoDBEndpoint)
	} else {
		dbClient, err = storage.NewClient(ctx)
	}
	if err != nil {
		log.Fatalf("failed to create DynamoDB client: %v", err)
	}

	// Initialize repositories
	usersRepo := storage.NewUsersRepository(dbClient, cfg.UsersTable)
	categoriesRepo := storage.NewCategoriesRepository(dbClient, cfg.CategoriesTable)
	budgetsRepo := storage.NewBudgetsRepository(dbClient, cfg.MonthBudgetsTable)
	transactionsRepo := storage.NewTransactionsRepository(dbClient, cfg.TransactionsTable)
	incomeStreamsRepo := storage.NewIncomeStreamsRepository(dbClient, cfg.IncomeStreamsTable)
	recurringRepo := storage.NewRecurringRepository(dbClient, cfg.RecurringRulesTable)

	// Get Google OAuth credentials from Secrets Manager
	var googleClientID string
	if cfg.GoogleSecretARN != "" {
		secretsManager, err := auth.NewSecretsManager(ctx)
		if err != nil {
			log.Printf("warning: failed to create secrets manager: %v", err)
		} else {
			secret, err := secretsManager.GetGoogleOAuthSecret(ctx, cfg.GoogleSecretARN)
			if err != nil {
				log.Printf("warning: failed to get Google OAuth secret: %v", err)
			} else {
				googleClientID = secret.ClientID
			}
		}
	}

	// Fallback to environment variable
	if googleClientID == "" {
		googleClientID = os.Getenv("GOOGLE_CLIENT_ID")
	}

	// Initialize auth
	googleVerifier := auth.NewGoogleVerifier(googleClientID)

	// Get JWT secret
	jwtSecret := cfg.JWTSecret
	if jwtSecret == "" {
		jwtSecret = os.Getenv("JWT_SECRET")
	}
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET is required")
	}

	jwtManager := auth.NewJWTManager(jwtSecret, cfg.JWTExpiry)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(googleVerifier, jwtManager, usersRepo, categoriesRepo)
	usersHandler := handlers.NewUsersHandler(usersRepo)
	categoriesHandler := handlers.NewCategoriesHandler(categoriesRepo)
	budgetsHandler := handlers.NewBudgetsHandler(budgetsRepo)
	transactionsHandler := handlers.NewTransactionsHandler(transactionsRepo)
	incomeStreamsHandler := handlers.NewIncomeStreamsHandler(incomeStreamsRepo)
	recurringHandler := handlers.NewRecurringHandler(recurringRepo)
	summaryHandler := handlers.NewSummaryHandler(transactionsRepo, budgetsRepo, recurringRepo, incomeStreamsRepo, categoriesRepo)

	// Create router
	router := httpapi.NewRouter(httpapi.RouterConfig{
		JWTManager:           jwtManager,
		AuthHandler:          authHandler,
		UsersHandler:         usersHandler,
		CategoriesHandler:    categoriesHandler,
		BudgetsHandler:       budgetsHandler,
		TransactionsHandler:  transactionsHandler,
		IncomeStreamsHandler: incomeStreamsHandler,
		RecurringHandler:     recurringHandler,
		SummaryHandler:       summaryHandler,
	})

	// Start server based on environment
	if isLambda() {
		// Running in AWS Lambda
		adapter := chiadapter.New(router)
		lambda.Start(adapter.ProxyWithContext)
	} else {
		// Running locally
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		log.Printf("Starting local server on http://localhost:%s", port)
		log.Fatal(http.ListenAndServe(":"+port, router))
	}
}
