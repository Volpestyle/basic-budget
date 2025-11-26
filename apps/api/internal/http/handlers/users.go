package handlers

import (
	"net/http"
	"time"

	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

type UsersHandler struct {
	usersRepo *storage.UsersRepository
}

func NewUsersHandler(usersRepo *storage.UsersRepository) *UsersHandler {
	return &UsersHandler{
		usersRepo: usersRepo,
	}
}

type UpdateUserRequest struct {
	DefaultCurrency *string `json:"default_currency,omitempty"`
	Locale          *string `json:"locale,omitempty"`
	DisplayName     *string `json:"display_name,omitempty"`
}

// HandleGetMe handles GET /me
func (h *UsersHandler) HandleGetMe(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	user, err := h.usersRepo.GetByID(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get user")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, user)
}

// HandleUpdateMe handles PATCH /me
func (h *UsersHandler) HandleUpdateMe(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	var req UpdateUserRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	user, err := h.usersRepo.GetByID(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get user")
		return
	}

	// Update fields if provided
	if req.DefaultCurrency != nil {
		user.DefaultCurrency = *req.DefaultCurrency
	}
	if req.Locale != nil {
		user.Locale = *req.Locale
	}
	if req.DisplayName != nil {
		user.DisplayName = *req.DisplayName
	}
	user.UpdatedAt = time.Now()

	if err := h.usersRepo.Update(r.Context(), user); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update user")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, user)
}
