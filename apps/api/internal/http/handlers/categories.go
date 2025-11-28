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

type CategoriesHandler struct {
	categoriesRepo *storage.CategoriesRepository
}

func NewCategoriesHandler(categoriesRepo *storage.CategoriesRepository) *CategoriesHandler {
	return &CategoriesHandler{
		categoriesRepo: categoriesRepo,
	}
}

type CreateCategoryRequest struct {
	Name      string            `json:"name"`
	Type      core.CategoryType `json:"type"`
	Color     string            `json:"color"`
	Icon      string            `json:"icon"`
	SortOrder int               `json:"sort_order"`
}

type UpdateCategoryRequest struct {
	Name       *string `json:"name,omitempty"`
	Color      *string `json:"color,omitempty"`
	Icon       *string `json:"icon,omitempty"`
	SortOrder  *int    `json:"sort_order,omitempty"`
	IsArchived *bool   `json:"is_archived,omitempty"`
}

// HandleList handles GET /categories
func (h *CategoriesHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	categories, err := h.categoriesRepo.List(r.Context(), userCtx.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to list categories")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, categories)
}

// HandleCreate handles POST /categories
func (h *CategoriesHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	var req CreateCategoryRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	if req.Name == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "name is required")
		return
	}

	category := &core.Category{
		ID:         uuid.New().String(),
		UserID:     userCtx.UserID,
		Name:       req.Name,
		Type:       req.Type,
		Color:      req.Color,
		Icon:       req.Icon,
		SortOrder:  req.SortOrder,
		IsArchived: false,
		CreatedAt:  time.Now(),
	}

	if category.Type == "" {
		category.Type = core.CategoryTypeExpense
	}

	if err := h.categoriesRepo.Create(r.Context(), category); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to create category")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, category)
}

// HandleUpdate handles PATCH /categories/:id
func (h *CategoriesHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	categoryID := chi.URLParam(r, "id")
	if categoryID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "category id is required")
		return
	}

	var req UpdateCategoryRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	category, err := h.categoriesRepo.GetByID(r.Context(), userCtx.UserID, categoryID)
	if err != nil {
		if errors.Is(err, storage.ErrCategoryNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "category not found")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get category")
		return
	}

	// Update fields if provided
	if req.Name != nil {
		category.Name = *req.Name
	}
	if req.Color != nil {
		category.Color = *req.Color
	}
	if req.Icon != nil {
		category.Icon = *req.Icon
	}
	if req.SortOrder != nil {
		category.SortOrder = *req.SortOrder
	}
	if req.IsArchived != nil {
		category.IsArchived = *req.IsArchived
	}

	if err := h.categoriesRepo.Update(r.Context(), category); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update category")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, category)
}

// HandleDelete handles DELETE /categories/:id (soft delete - archive)
func (h *CategoriesHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userCtx := httputil.GetUserFromContext(r.Context())
	if userCtx == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}

	categoryID := chi.URLParam(r, "id")
	if categoryID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "category id is required")
		return
	}

	category, err := h.categoriesRepo.GetByID(r.Context(), userCtx.UserID, categoryID)
	if err != nil {
		if errors.Is(err, storage.ErrCategoryNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "category not found")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to get category")
		return
	}

	// Soft delete - just archive
	category.IsArchived = true

	if err := h.categoriesRepo.Update(r.Context(), category); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to archive category")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, category)
}
