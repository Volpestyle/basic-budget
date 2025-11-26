package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

type BudgetsHandler struct {
	budgetsRepo *storage.BudgetsRepository
}

func NewBudgetsHandler(budgetsRepo *storage.BudgetsRepository) *BudgetsHandler {
	return &BudgetsHandler{
		budgetsRepo: budgetsRepo,
	}
}

type BudgetItem struct {
	CategoryID         string `json:"category_id"`
	PlannedAmountCents int64  `json:"planned_amount_cents"`
}

type UpsertBudgetsRequest struct {
	Budgets []BudgetItem `json:"budgets"`
}

// HandleGetByMonth handles GET /budgets/:month
func (h *BudgetsHandler) HandleGetByMonth(w http.ResponseWriter, r *http.Request) {
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

	budgets, err := h.budgetsRepo.GetByMonth(r.Context(), userCtx.UserID, month)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get budgets")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, budgets)
}

// HandleUpsert handles PUT /budgets/:month
func (h *BudgetsHandler) HandleUpsert(w http.ResponseWriter, r *http.Request) {
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

	var req UpsertBudgetsRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	budgets := make([]core.MonthBudget, 0, len(req.Budgets))
	for _, item := range req.Budgets {
		budgets = append(budgets, core.MonthBudget{
			ID:                 uuid.New().String(),
			UserID:             userCtx.UserID,
			Month:              month,
			CategoryID:         item.CategoryID,
			PlannedAmountCents: item.PlannedAmountCents,
		})
	}

	if err := h.budgetsRepo.BulkUpsert(r.Context(), budgets); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to upsert budgets")
		return
	}

	// Return the updated budgets
	updatedBudgets, err := h.budgetsRepo.GetByMonth(r.Context(), userCtx.UserID, month)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get updated budgets")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updatedBudgets)
}
