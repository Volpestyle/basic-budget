package handlers

import (
	"net/http"
	"sort"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

type SummaryHandler struct {
	transactionsRepo  *storage.TransactionsRepository
	budgetsRepo       *storage.BudgetsRepository
	recurringRepo     *storage.RecurringRepository
	incomeStreamsRepo *storage.IncomeStreamsRepository
	categoriesRepo    *storage.CategoriesRepository
}

func NewSummaryHandler(
	transactionsRepo *storage.TransactionsRepository,
	budgetsRepo *storage.BudgetsRepository,
	recurringRepo *storage.RecurringRepository,
	incomeStreamsRepo *storage.IncomeStreamsRepository,
	categoriesRepo *storage.CategoriesRepository,
) *SummaryHandler {
	return &SummaryHandler{
		transactionsRepo:  transactionsRepo,
		budgetsRepo:       budgetsRepo,
		recurringRepo:     recurringRepo,
		incomeStreamsRepo: incomeStreamsRepo,
		categoriesRepo:    categoriesRepo,
	}
}

type CategoryBreakdown struct {
	CategoryID    string `json:"category_id"`
	CategoryName  string `json:"category_name"`
	CategoryColor string `json:"category_color"`
	SpentCents    int64  `json:"spent_cents"`
	PlannedCents  int64  `json:"planned_cents"`
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

	monthStart, err := time.Parse("2006-01-02", month+"-01")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid month format")
		return
	}
	monthEnd := monthStart.AddDate(0, 1, -1)

	// Load categories for display metadata
	categories, err := h.categoriesRepo.List(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get categories")
		return
	}
	categoryMap := make(map[string]core.Category, len(categories))
	for _, c := range categories {
		categoryMap[c.ID] = c
	}

	// Planned income from active income streams (used as fallback when no actual income exists)
	streams, err := h.incomeStreamsRepo.List(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get income streams")
		return
	}

	var plannedIncome int64
	for _, s := range streams {
		if !s.IsActive {
			continue
		}
		startDate, err := time.Parse("2006-01-02", s.StartDate)
		if err != nil {
			continue
		}
		var endDate *time.Time
		if s.EndDate != "" {
			if ed, err := time.Parse("2006-01-02", s.EndDate); err == nil {
				endDate = &ed
			}
		}
		occurrences := countIncomeOccurrences(s.Period, startDate, endDate, monthStart, monthEnd)
		if occurrences > 0 {
			plannedIncome += int64(occurrences) * s.ExpectedAmountCents
		}
	}

	// Planned expenses/income from recurring rules (used as fallback when no actual transactions exist)
	rules, err := h.recurringRepo.List(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get recurring rules")
		return
	}

	recurringPlannedByCategory := make(map[string]int64)
	var recurringPlannedExpenses int64
	for _, rule := range rules {
		if !rule.IsActive {
			continue
		}
		startDate, err := time.Parse("2006-01-02", rule.StartDate)
		if err != nil {
			continue
		}
		var endDate *time.Time
		if rule.EndDate != "" {
			if ed, err := time.Parse("2006-01-02", rule.EndDate); err == nil {
				endDate = &ed
			}
		}
		occurrences := countRecurringOccurrences(rule, startDate, endDate, monthStart, monthEnd)
		if occurrences == 0 {
			continue
		}

		total := int64(occurrences) * rule.AmountCents
		if rule.Type == core.TransactionTypeIncome {
			plannedIncome += total
		} else {
			recurringPlannedExpenses += total
			recurringPlannedByCategory[rule.CategoryID] += total
		}
	}

	// Actual transactions for the month
	txParams := storage.ListTransactionsParams{
		UserID: userCtx.UserID,
		From:   monthStart.Format("2006-01-02"),
		To:     monthEnd.Format("2006-01-02"),
		Limit:  1000,
	}

	transactions, _, err := h.transactionsRepo.List(r.Context(), txParams)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get transactions")
		return
	}

	var income int64
	var expenses int64
	byCategory := make(map[string]int64)
	var recurringExpenseTx int64
	var variableExpenses int64

	for _, tx := range transactions {
		switch tx.Type {
		case core.TransactionTypeIncome:
			income += tx.AmountCents
		case core.TransactionTypeExpense:
			expenses += tx.AmountCents
			byCategory[tx.CategoryID] += tx.AmountCents
			if tx.RecurringRuleID != "" {
				recurringExpenseTx += tx.AmountCents
			} else {
				variableExpenses += tx.AmountCents
			}
		}
	}

	recurringExpenses := recurringExpenseTx + recurringPlannedExpenses
	totalExpenses := recurringExpenses + variableExpenses

	// Fallback to planned income when there are no income transactions
	hasIncomeTransactions := income > 0

	if !hasIncomeTransactions && plannedIncome > 0 {
		income = plannedIncome
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

	// Build category breakdown with stable ordering
	categoryIDs := make(map[string]struct{})
	for catID := range byCategory {
		categoryIDs[catID] = struct{}{}
	}
	for catID := range recurringPlannedByCategory {
		categoryIDs[catID] = struct{}{}
	}
	for catID := range budgetMap {
		categoryIDs[catID] = struct{}{}
	}

	sortedIDs := make([]string, 0, len(categoryIDs))
	for id := range categoryIDs {
		sortedIDs = append(sortedIDs, id)
	}
	sort.Strings(sortedIDs)

	categoryBreakdown := make([]CategoryBreakdown, 0, len(sortedIDs))
	for _, catID := range sortedIDs {
		cat := categoryMap[catID]
		spent := byCategory[catID] + recurringPlannedByCategory[catID]
		categoryBreakdown = append(categoryBreakdown, CategoryBreakdown{
			CategoryID:    catID,
			CategoryName:  cat.Name,
			CategoryColor: cat.Color,
			SpentCents:    spent,
			PlannedCents:  budgetMap[catID],
		})
	}

	// Calculate recurring vs variable (simplified - based on whether transaction has recurring_rule_id)
	response := MonthSummaryResponse{
		Month:             month,
		IncomeTotalCents:  income,
		ExpenseTotalCents: totalExpenses,
		NetCents:          income - totalExpenses,
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

func countIncomeOccurrences(period core.IncomeStreamPeriod, start time.Time, end *time.Time, monthStart, monthEnd time.Time) int {
	// If outside range entirely
	if start.After(monthEnd) || (end != nil && end.Before(monthStart)) {
		return 0
	}

	switch period {
	case core.IncomeStreamPeriodOnce:
		if start.After(monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)) || start.Before(monthStart) {
			return 0
		}
		return 1
	case core.IncomeStreamPeriodMonthly:
		return 1
	case core.IncomeStreamPeriodBiweekly:
		return countOccurrencesEveryNDays(start, end, monthStart, monthEnd, 14)
	default:
		return 0
	}
}

func countRecurringOccurrences(rule core.RecurringRule, start time.Time, end *time.Time, monthStart, monthEnd time.Time) int {
	if start.After(monthEnd) || (end != nil && end.Before(monthStart)) {
		return 0
	}

	switch rule.Interval {
	case core.RecurringIntervalMonthly:
		day := rule.DayOfMonth
		if day <= 0 {
			day = start.Day()
		}
		occDate := time.Date(monthStart.Year(), monthStart.Month(), day, 0, 0, 0, 0, time.UTC)
		lastDay := monthStart.AddDate(0, 1, -1).Day()
		if day > lastDay {
			occDate = time.Date(monthStart.Year(), monthStart.Month(), lastDay, 0, 0, 0, 0, time.UTC)
		}
		if occDate.Before(start) {
			// If the start date is within this month and after the chosen day, count it on the start date
			if start.Year() == monthStart.Year() && start.Month() == monthStart.Month() {
				occDate = time.Date(monthStart.Year(), monthStart.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
			} else {
				return 0
			}
		}
		if end != nil && occDate.After(*end) {
			return 0
		}
		return 1
	case core.RecurringIntervalWeekly:
		weekday := parseWeekday(rule.Weekday)
		if weekday == time.Sunday && rule.Weekday == "" {
			weekday = start.Weekday()
		}
		return countWeeklyOccurrences(start, end, monthStart, monthEnd, weekday, 7)
	case core.RecurringIntervalBiweekly:
		return countOccurrencesEveryNDays(start, end, monthStart, monthEnd, 14)
	default:
		return 0
	}
}

func countOccurrencesEveryNDays(start time.Time, end *time.Time, monthStart, monthEnd time.Time, days int) int {
	occ := start
	// Move forward to the first occurrence not before monthStart
	for occ.Before(monthStart) {
		occ = occ.AddDate(0, 0, days)
		if end != nil && occ.After(*end) {
			return 0
		}
	}

	count := 0
	for !occ.After(monthEnd) {
		if end != nil && occ.After(*end) {
			break
		}
		count++
		occ = occ.AddDate(0, 0, days)
	}
	return count
}

func countWeeklyOccurrences(start time.Time, end *time.Time, monthStart, monthEnd time.Time, weekday time.Weekday, stepDays int) int {
	// Find first occurrence on or after start
	occ := start
	for occ.Weekday() != weekday {
		occ = occ.AddDate(0, 0, 1)
	}
	// Move forward to monthStart
	for occ.Before(monthStart) {
		occ = occ.AddDate(0, 0, stepDays)
	}

	count := 0
	for !occ.After(monthEnd) {
		if end != nil && occ.After(*end) {
			break
		}
		count++
		occ = occ.AddDate(0, 0, stepDays)
	}
	return count
}

func parseWeekday(s string) time.Weekday {
	switch s {
	case "MON":
		return time.Monday
	case "TUE":
		return time.Tuesday
	case "WED":
		return time.Wednesday
	case "THU":
		return time.Thursday
	case "FRI":
		return time.Friday
	case "SAT":
		return time.Saturday
	case "SUN":
		return time.Sunday
	default:
		return time.Sunday
	}
}
