package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

type RecurringHandler struct {
	recurringRepo *storage.RecurringRepository
}

func NewRecurringHandler(recurringRepo *storage.RecurringRepository) *RecurringHandler {
	return &RecurringHandler{
		recurringRepo: recurringRepo,
	}
}

type CreateRecurringRequest struct {
	Type                 core.TransactionType    `json:"type"`
	Label                string                  `json:"label"`
	CategoryID           string                  `json:"category_id"`
	AmountCents          int64                   `json:"amount_cents"`
	Currency             string                  `json:"currency"`
	Interval             core.RecurringInterval  `json:"interval"`
	DayOfMonth           int                     `json:"day_of_month,omitempty"`
	Weekday              string                  `json:"weekday,omitempty"`
	StartDate            string                  `json:"start_date"`
	EndDate              string                  `json:"end_date,omitempty"`
	LinkedIncomeStreamID string                  `json:"linked_income_stream_id,omitempty"`
}

type UpdateRecurringRequest struct {
	Label                *string                  `json:"label,omitempty"`
	CategoryID           *string                  `json:"category_id,omitempty"`
	AmountCents          *int64                   `json:"amount_cents,omitempty"`
	Interval             *core.RecurringInterval  `json:"interval,omitempty"`
	DayOfMonth           *int                     `json:"day_of_month,omitempty"`
	Weekday              *string                  `json:"weekday,omitempty"`
	EndDate              *string                  `json:"end_date,omitempty"`
	NextOccurrence       *string                  `json:"next_occurrence,omitempty"`
	LinkedIncomeStreamID *string                  `json:"linked_income_stream_id,omitempty"`
	IsActive             *bool                    `json:"is_active,omitempty"`
}

// HandleList handles GET /recurring
func (h *RecurringHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	rules, err := h.recurringRepo.List(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to list recurring rules")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, rules)
}

// HandleCreate handles POST /recurring
func (h *RecurringHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	var req CreateRecurringRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	if req.Label == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "label is required")
		return
	}
	if req.CategoryID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "category_id is required")
		return
	}
	if req.StartDate == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "start_date is required")
		return
	}

	rule := &core.RecurringRule{
		ID:                   uuid.New().String(),
		UserID:               userCtx.UserID,
		Type:                 req.Type,
		Label:                req.Label,
		CategoryID:           req.CategoryID,
		AmountCents:          req.AmountCents,
		Currency:             req.Currency,
		Interval:             req.Interval,
		DayOfMonth:           req.DayOfMonth,
		Weekday:              req.Weekday,
		StartDate:            req.StartDate,
		EndDate:              req.EndDate,
		NextOccurrence:       req.StartDate, // First occurrence is the start date
		LinkedIncomeStreamID: req.LinkedIncomeStreamID,
		IsActive:             true,
		CreatedAt:            time.Now(),
	}

	if rule.Type == "" {
		rule.Type = core.TransactionTypeExpense
	}
	if rule.Currency == "" {
		rule.Currency = "USD"
	}
	if rule.Interval == "" {
		rule.Interval = core.RecurringIntervalMonthly
	}

	if err := h.recurringRepo.Create(r.Context(), rule); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to create recurring rule")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, rule)
}

// HandleUpdate handles PATCH /recurring/:id
func (h *RecurringHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	ruleID := chi.URLParam(r, "id")
	if ruleID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "recurring rule id is required")
		return
	}

	var req UpdateRecurringRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	rule, err := h.recurringRepo.GetByID(r.Context(), userCtx.UserID, ruleID)
	if err != nil {
		if errors.Is(err, storage.ErrRecurringRuleNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "recurring rule not found")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get recurring rule")
		return
	}

	// Update fields if provided
	if req.Label != nil {
		rule.Label = *req.Label
	}
	if req.CategoryID != nil {
		rule.CategoryID = *req.CategoryID
	}
	if req.AmountCents != nil {
		rule.AmountCents = *req.AmountCents
	}
	if req.Interval != nil {
		rule.Interval = *req.Interval
	}
	if req.DayOfMonth != nil {
		rule.DayOfMonth = *req.DayOfMonth
	}
	if req.Weekday != nil {
		rule.Weekday = *req.Weekday
	}
	if req.EndDate != nil {
		rule.EndDate = *req.EndDate
	}
	if req.NextOccurrence != nil {
		rule.NextOccurrence = *req.NextOccurrence
	}
	if req.LinkedIncomeStreamID != nil {
		rule.LinkedIncomeStreamID = *req.LinkedIncomeStreamID
	}
	if req.IsActive != nil {
		rule.IsActive = *req.IsActive
	}

	if err := h.recurringRepo.Update(r.Context(), rule); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update recurring rule")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, rule)
}

// HandleDelete handles DELETE /recurring/:id
func (h *RecurringHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	ruleID := chi.URLParam(r, "id")
	if ruleID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "recurring rule id is required")
		return
	}

	// Verify ownership
	_, err := h.recurringRepo.GetByID(r.Context(), userCtx.UserID, ruleID)
	if err != nil {
		if errors.Is(err, storage.ErrRecurringRuleNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "recurring rule not found")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get recurring rule")
		return
	}

	if err := h.recurringRepo.Delete(r.Context(), userCtx.UserID, ruleID); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to delete recurring rule")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
