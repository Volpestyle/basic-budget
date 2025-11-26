package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

type SummaryHandler struct {
	transactionsRepo *storage.TransactionsRepository
	budgetsRepo      *storage.BudgetsRepository
	recurringRepo    *storage.RecurringRepository
}

func NewSummaryHandler(
	transactionsRepo *storage.TransactionsRepository,
	budgetsRepo *storage.BudgetsRepository,
	recurringRepo *storage.RecurringRepository,
) *SummaryHandler {
	return &SummaryHandler{
		transactionsRepo: transactionsRepo,
		budgetsRepo:      budgetsRepo,
		recurringRepo:    recurringRepo,
	}
}

type CategoryBreakdown struct {
	CategoryID   string `json:"category_id"`
	SpentCents   int64  `json:"spent_cents"`
	PlannedCents int64  `json:"planned_cents"`
}

type RecurringVsVariable struct {
	RecurringExpensesCents int64 `json:"recurring_expenses_cents"`
	VariableExpensesCents  int64 `json:"variable_expenses_cents"`
}

type MonthSummaryResponse struct {
	Month               string              `json:"month"`
	IncomeTotalCents    int64               `json:"income_total_cents"`
	ExpenseTotalCents   int64               `json:"expense_total_cents"`
	NetCents            int64               `json:"net_cents"`
	CategoryBreakdown   []CategoryBreakdown `json:"category_breakdown"`
	RecurringVsVariable RecurringVsVariable `json:"recurring_vs_variable"`
}

// HandleMonthSummary handles GET /summary/month/:month
func (h *SummaryHandler) HandleMonthSummary(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	month := chi.URLParam(r, "month")
	if month == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "month is required")
		return
	}

	// Get transaction totals
	income, expenses, byCategory, err := h.transactionsRepo.GetMonthSummary(r.Context(), userCtx.UserID, month)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get transaction summary")
		return
	}

	// Get budgets for the month
	budgets, err := h.budgetsRepo.GetByMonth(r.Context(), userCtx.UserID, month)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get budgets")
		return
	}

	// Build budget map
	budgetMap := make(map[string]int64)
	for _, b := range budgets {
		budgetMap[b.CategoryID] = b.PlannedAmountCents
	}

	// Build category breakdown
	categoryBreakdown := make([]CategoryBreakdown, 0)
	for catID, spent := range byCategory {
		categoryBreakdown = append(categoryBreakdown, CategoryBreakdown{
			CategoryID:   catID,
			SpentCents:   spent,
			PlannedCents: budgetMap[catID],
		})
	}

	// Calculate recurring vs variable (simplified - based on whether transaction has recurring_rule_id)
	// In a real app, you'd query transactions with recurring_rule_id set
	from := month + "-01"
	to := month + "-31"

	txParams := storage.ListTransactionsParams{
		UserID: userCtx.UserID,
		From:   from,
		To:     to,
		Limit:  1000,
	}

	transactions, _, err := h.transactionsRepo.List(r.Context(), txParams)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get transactions")
		return
	}

	var recurringExpenses, variableExpenses int64
	for _, tx := range transactions {
		if tx.Type == "expense" {
			if tx.RecurringRuleID != "" {
				recurringExpenses += tx.AmountCents
			} else {
				variableExpenses += tx.AmountCents
			}
		}
	}

	response := MonthSummaryResponse{
		Month:             month,
		IncomeTotalCents:  income,
		ExpenseTotalCents: expenses,
		NetCents:          income - expenses,
		CategoryBreakdown: categoryBreakdown,
		RecurringVsVariable: RecurringVsVariable{
			RecurringExpensesCents: recurringExpenses,
			VariableExpensesCents:  variableExpenses,
		},
	}

	httputil.WriteJSON(w, http.StatusOK, response)
}

type CashflowPeriod struct {
	Period            string `json:"period"` // YYYY-MM or YYYY-Www
	IncomeTotalCents  int64  `json:"income_total_cents"`
	ExpenseTotalCents int64  `json:"expense_total_cents"`
	NetCents          int64  `json:"net_cents"`
}

type CashflowResponse struct {
	Periods []CashflowPeriod `json:"periods"`
}

// HandleCashflow handles GET /summary/cashflow
func (h *SummaryHandler) HandleCashflow(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if from == "" || to == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "from and to are required")
		return
	}

	// Get all transactions in range
	params := storage.ListTransactionsParams{
		UserID: userCtx.UserID,
		From:   from,
		To:     to,
		Limit:  1000,
	}

	transactions, _, err := h.transactionsRepo.List(r.Context(), params)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get transactions")
		return
	}

	// Aggregate by month
	monthData := make(map[string]*CashflowPeriod)
	for _, tx := range transactions {
		// Extract YYYY-MM from date
		if len(tx.Date) >= 7 {
			month := tx.Date[:7]
			if _, ok := monthData[month]; !ok {
				monthData[month] = &CashflowPeriod{Period: month}
			}

			switch tx.Type {
			case "income":
				monthData[month].IncomeTotalCents += tx.AmountCents
			case "expense":
				monthData[month].ExpenseTotalCents += tx.AmountCents
			}
		}
	}

	// Convert to sorted slice
	periods := make([]CashflowPeriod, 0, len(monthData))
	for _, p := range monthData {
		p.NetCents = p.IncomeTotalCents - p.ExpenseTotalCents
		periods = append(periods, *p)
	}

	httputil.WriteJSON(w, http.StatusOK, CashflowResponse{Periods: periods})
}
