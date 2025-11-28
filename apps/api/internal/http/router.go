package http

import (
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/jamesvolpe/basic-budget/apps/api/internal/auth"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/http/handlers"
)

type RouterConfig struct {
	JWTManager *auth.JWTManager

	// Handlers
	AuthHandler          *handlers.AuthHandler
	UsersHandler         *handlers.UsersHandler
	CategoriesHandler    *handlers.CategoriesHandler
	BudgetsHandler       *handlers.BudgetsHandler
	TransactionsHandler  *handlers.TransactionsHandler
	IncomeStreamsHandler *handlers.IncomeStreamsHandler
	RecurringHandler     *handlers.RecurringHandler
	SummaryHandler       *handlers.SummaryHandler
}

func NewRouter(cfg RouterConfig) *chi.Mux {
	r := chi.NewRouter()

	// Middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Post("/auth/google", cfg.AuthHandler.HandleGoogleAuth)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(AuthMiddleware(cfg.JWTManager))

			// User
			r.Get("/me", cfg.UsersHandler.HandleGetMe)
			r.Patch("/me", cfg.UsersHandler.HandleUpdateMe)

			// Categories
			r.Get("/categories", cfg.CategoriesHandler.HandleList)
			r.Post("/categories", cfg.CategoriesHandler.HandleCreate)
			r.Patch("/categories/{id}", cfg.CategoriesHandler.HandleUpdate)
			r.Delete("/categories/{id}", cfg.CategoriesHandler.HandleDelete)

			// Budgets
			r.Get("/budgets/{month}", cfg.BudgetsHandler.HandleGetByMonth)
			r.Put("/budgets/{month}", cfg.BudgetsHandler.HandleUpsert)

			// Transactions
			r.Get("/transactions", cfg.TransactionsHandler.HandleList)
			r.Post("/transactions", cfg.TransactionsHandler.HandleCreate)
			r.Patch("/transactions/{id}", cfg.TransactionsHandler.HandleUpdate)
			r.Delete("/transactions/{id}", cfg.TransactionsHandler.HandleDelete)

			// Income Streams
			r.Get("/income-streams", cfg.IncomeStreamsHandler.HandleList)
			r.Post("/income-streams", cfg.IncomeStreamsHandler.HandleCreate)
			r.Patch("/income-streams/{id}", cfg.IncomeStreamsHandler.HandleUpdate)
			r.Delete("/income-streams/{id}", cfg.IncomeStreamsHandler.HandleDelete)

			// Recurring Rules
			r.Get("/recurring", cfg.RecurringHandler.HandleList)
			r.Post("/recurring", cfg.RecurringHandler.HandleCreate)
			r.Patch("/recurring/{id}", cfg.RecurringHandler.HandleUpdate)
			r.Delete("/recurring/{id}", cfg.RecurringHandler.HandleDelete)

			// Summary / Analytics
			r.Get("/summary/month/{month}", cfg.SummaryHandler.HandleMonthSummary)
			r.Get("/summary/cashflow", cfg.SummaryHandler.HandleCashflow)
		})
	})

	return r
}
