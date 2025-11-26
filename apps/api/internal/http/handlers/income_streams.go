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

type IncomeStreamsHandler struct {
	incomeStreamsRepo *storage.IncomeStreamsRepository
}

func NewIncomeStreamsHandler(incomeStreamsRepo *storage.IncomeStreamsRepository) *IncomeStreamsHandler {
	return &IncomeStreamsHandler{
		incomeStreamsRepo: incomeStreamsRepo,
	}
}

type CreateIncomeStreamRequest struct {
	Name                string                  `json:"name"`
	DefaultCategoryID   string                  `json:"default_category_id,omitempty"`
	Period              core.IncomeStreamPeriod `json:"period"`
	ExpectedAmountCents int64                   `json:"expected_amount_cents"`
}

type UpdateIncomeStreamRequest struct {
	Name                *string                  `json:"name,omitempty"`
	DefaultCategoryID   *string                  `json:"default_category_id,omitempty"`
	Period              *core.IncomeStreamPeriod `json:"period,omitempty"`
	ExpectedAmountCents *int64                   `json:"expected_amount_cents,omitempty"`
	IsActive            *bool                    `json:"is_active,omitempty"`
}

// HandleList handles GET /income-streams
func (h *IncomeStreamsHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	streams, err := h.incomeStreamsRepo.List(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to list income streams")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, streams)
}

// HandleCreate handles POST /income-streams
func (h *IncomeStreamsHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	var req CreateIncomeStreamRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	if req.Name == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "name is required")
		return
	}

	stream := &core.IncomeStream{
		ID:                  uuid.New().String(),
		UserID:              userCtx.UserID,
		Name:                req.Name,
		DefaultCategoryID:   req.DefaultCategoryID,
		Period:              req.Period,
		ExpectedAmountCents: req.ExpectedAmountCents,
		IsActive:            true,
		CreatedAt:           time.Now(),
	}

	if stream.Period == "" {
		stream.Period = core.IncomeStreamPeriodMonthly
	}

	if err := h.incomeStreamsRepo.Create(r.Context(), stream); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to create income stream")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, stream)
}

// HandleUpdate handles PATCH /income-streams/:id
func (h *IncomeStreamsHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	streamID := chi.URLParam(r, "id")
	if streamID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "income stream id is required")
		return
	}

	var req UpdateIncomeStreamRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	stream, err := h.incomeStreamsRepo.GetByID(r.Context(), userCtx.UserID, streamID)
	if err != nil {
		if errors.Is(err, storage.ErrIncomeStreamNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "income stream not found")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get income stream")
		return
	}

	// Update fields if provided
	if req.Name != nil {
		stream.Name = *req.Name
	}
	if req.DefaultCategoryID != nil {
		stream.DefaultCategoryID = *req.DefaultCategoryID
	}
	if req.Period != nil {
		stream.Period = *req.Period
	}
	if req.ExpectedAmountCents != nil {
		stream.ExpectedAmountCents = *req.ExpectedAmountCents
	}
	if req.IsActive != nil {
		stream.IsActive = *req.IsActive
	}

	if err := h.incomeStreamsRepo.Update(r.Context(), stream); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update income stream")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, stream)
}

// HandleDelete handles DELETE /income-streams/:id
func (h *IncomeStreamsHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	streamID := chi.URLParam(r, "id")
	if streamID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "income stream id is required")
		return
	}

	// Verify ownership
	_, err := h.incomeStreamsRepo.GetByID(r.Context(), userCtx.UserID, streamID)
	if err != nil {
		if errors.Is(err, storage.ErrIncomeStreamNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "income stream not found")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get income stream")
		return
	}

	if err := h.incomeStreamsRepo.Delete(r.Context(), userCtx.UserID, streamID); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to delete income stream")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
