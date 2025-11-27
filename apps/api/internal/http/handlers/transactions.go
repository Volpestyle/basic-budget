package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

type TransactionsHandler struct {
	transactionsRepo *storage.TransactionsRepository
}

func NewTransactionsHandler(transactionsRepo *storage.TransactionsRepository) *TransactionsHandler {
	return &TransactionsHandler{
		transactionsRepo: transactionsRepo,
	}
}

type CreateTransactionRequest struct {
	Type           core.TransactionType `json:"type"`
	CategoryID     string               `json:"category_id"`
	AmountCents    int64                `json:"amount_cents"`
	Currency       string               `json:"currency"`
	Date           string               `json:"date"` // YYYY-MM-DD
	Description    string               `json:"description"`
	Merchant       string               `json:"merchant,omitempty"`
	Tags           []string             `json:"tags,omitempty"`
	IncomeStreamID string               `json:"income_stream_id,omitempty"`
}

type UpdateTransactionRequest struct {
	Type           *core.TransactionType `json:"type,omitempty"`
	CategoryID     *string               `json:"category_id,omitempty"`
	AmountCents    *int64                `json:"amount_cents,omitempty"`
	Date           *string               `json:"date,omitempty"`
	Description    *string               `json:"description,omitempty"`
	Merchant       *string               `json:"merchant,omitempty"`
	Tags           []string              `json:"tags,omitempty"`
	IncomeStreamID *string               `json:"income_stream_id,omitempty"`
}

type ListTransactionsResponse struct {
	Data       []core.Transaction `json:"data"`
	NextCursor string             `json:"next_cursor,omitempty"`
	HasMore    bool               `json:"has_more"`
}

// HandleList handles GET /transactions
func (h *TransactionsHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	// Parse query params
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	categoryID := r.URL.Query().Get("category_id")
	incomeStreamID := r.URL.Query().Get("income_stream_id")
	limitStr := r.URL.Query().Get("limit")
	cursor := r.URL.Query().Get("cursor")

	// Default date range to current month
	if from == "" {
		now := time.Now()
		from = fmt.Sprintf("%d-%02d-01", now.Year(), now.Month())
	}
	if to == "" {
		now := time.Now()
		to = fmt.Sprintf("%d-%02d-31", now.Year(), now.Month())
	}

	var limit int32 = 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = int32(l)
		}
	}

	params := storage.ListTransactionsParams{
		UserID:         userCtx.UserID,
		From:           from,
		To:             to,
		CategoryID:     categoryID,
		IncomeStreamID: incomeStreamID,
		Limit:          limit,
		Cursor:         cursor,
	}

	transactions, nextCursor, err := h.transactionsRepo.List(r.Context(), params)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to list transactions")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, ListTransactionsResponse{
		Data:       transactions,
		NextCursor: nextCursor,
		HasMore:    nextCursor != "",
	})
}

// HandleCreate handles POST /transactions
func (h *TransactionsHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	var req CreateTransactionRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	// Validate required fields
	if req.CategoryID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "category_id is required")
		return
	}
	if req.AmountCents <= 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "amount_cents must be positive")
		return
	}
	if req.Date == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "date is required")
		return
	}

	now := time.Now()
	tx := &core.Transaction{
		ID:             uuid.New().String(),
		UserID:         userCtx.UserID,
		Type:           req.Type,
		CategoryID:     req.CategoryID,
		AmountCents:    req.AmountCents,
		Currency:       req.Currency,
		Date:           req.Date,
		Description:    req.Description,
		Merchant:       req.Merchant,
		Tags:           req.Tags,
		IncomeStreamID: req.IncomeStreamID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if tx.Type == "" {
		tx.Type = core.TransactionTypeExpense
	}
	if tx.Currency == "" {
		tx.Currency = "USD"
	}

	if err := h.transactionsRepo.Create(r.Context(), tx); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to create transaction")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, tx)
}

// HandleUpdate handles PATCH /transactions/:id
func (h *TransactionsHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	txID := chi.URLParam(r, "id")
	if txID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "transaction id is required")
		return
	}

	// The ID from URL is the transaction ID, we need to find by date_tx_id
	// For simplicity, we'll require the full date_tx_id or search by ID
	// In production, you'd want a GSI on transaction ID
	dateTxID := r.URL.Query().Get("date_tx_id")
	if dateTxID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "date_tx_id query param is required")
		return
	}

	var req UpdateTransactionRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	tx, err := h.transactionsRepo.GetByID(r.Context(), userCtx.UserID, dateTxID)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "transaction not found")
		return
	}

	// Verify the transaction ID matches
	if tx.ID != txID {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "transaction not found")
		return
	}

	// Check if date is changing - if so, we need to delete and recreate
	oldDateTxID := tx.DateTxID
	dateChanged := false

	if req.Date != nil && *req.Date != tx.Date {
		dateChanged = true
		tx.Date = *req.Date
	}

	// Update fields if provided
	if req.Type != nil {
		tx.Type = *req.Type
	}
	if req.CategoryID != nil {
		tx.CategoryID = *req.CategoryID
	}
	if req.AmountCents != nil {
		tx.AmountCents = *req.AmountCents
	}
	if req.Description != nil {
		tx.Description = *req.Description
	}
	if req.Merchant != nil {
		tx.Merchant = *req.Merchant
	}
	if req.Tags != nil {
		tx.Tags = req.Tags
	}
	if req.IncomeStreamID != nil {
		tx.IncomeStreamID = *req.IncomeStreamID
	}
	tx.UpdatedAt = time.Now()

	// If date changed, delete old record and create new one
	if dateChanged {
		if err := h.transactionsRepo.Delete(r.Context(), userCtx.UserID, oldDateTxID); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update transaction")
			return
		}
		if err := h.transactionsRepo.Create(r.Context(), tx); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update transaction")
			return
		}
	} else {
		if err := h.transactionsRepo.Update(r.Context(), tx); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update transaction")
			return
		}
	}

	httputil.WriteJSON(w, http.StatusOK, tx)
}

// HandleDelete handles DELETE /transactions/:id
func (h *TransactionsHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	txID := chi.URLParam(r, "id")
	if txID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "transaction id is required")
		return
	}

	dateTxID := r.URL.Query().Get("date_tx_id")
	if dateTxID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "date_tx_id query param is required")
		return
	}

	// Verify ownership
	tx, err := h.transactionsRepo.GetByID(r.Context(), userCtx.UserID, dateTxID)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "transaction not found")
		return
	}

	// Verify the ID matches (extract from date_tx_id)
	parts := strings.Split(dateTxID, "#")
	if len(parts) != 2 || parts[1] != txID {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "transaction not found")
		return
	}

	_ = tx // ownership verified

	if err := h.transactionsRepo.Delete(r.Context(), userCtx.UserID, dateTxID); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to delete transaction")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
