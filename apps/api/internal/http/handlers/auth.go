package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/jamesvolpe/basic-budget/apps/api/internal/auth"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/storage"
)

type AuthHandler struct {
	googleVerifier *auth.GoogleVerifier
	jwtManager     *auth.JWTManager
	usersRepo      *storage.UsersRepository
	categoriesRepo *storage.CategoriesRepository
}

func NewAuthHandler(
	googleVerifier *auth.GoogleVerifier,
	jwtManager *auth.JWTManager,
	usersRepo *storage.UsersRepository,
	categoriesRepo *storage.CategoriesRepository,
) *AuthHandler {
	return &AuthHandler{
		googleVerifier: googleVerifier,
		jwtManager:     jwtManager,
		usersRepo:      usersRepo,
		categoriesRepo: categoriesRepo,
	}
}

type GoogleAuthRequest struct {
	IDToken string `json:"id_token"`
}

type AuthResponse struct {
	Token string     `json:"token"`
	User  *core.User `json:"user"`
}

// HandleGoogleAuth handles POST /auth/google
func (h *AuthHandler) HandleGoogleAuth(w http.ResponseWriter, r *http.Request) {
	var req GoogleAuthRequest
	if err := httputil.ReadJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	if req.IDToken == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_request", "id_token is required")
		return
	}

	// Verify the Google ID token
	tokenInfo, err := h.googleVerifier.VerifyIDToken(r.Context(), req.IDToken)
	if err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, "invalid_token", "invalid Google token")
		return
	}

	// Find or create user
	user, err := h.usersRepo.GetByGoogleSub(r.Context(), tokenInfo.Sub)
	if err != nil {
		if errors.Is(err, storage.ErrUserNotFound) {
			// Create new user
			user = &core.User{
				ID:              uuid.New().String(),
				GoogleSub:       tokenInfo.Sub,
				Email:           tokenInfo.Email,
				DisplayName:     tokenInfo.Name,
				AvatarURL:       tokenInfo.Picture,
				DefaultCurrency: "USD",
				Locale:          tokenInfo.Locale,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			}

			if user.Locale == "" {
				user.Locale = "en-US"
			}

			if err := h.usersRepo.Create(r.Context(), user); err != nil {
				httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to create user")
				return
			}

			// Best-effort seed default categories for new users
			if err := h.seedDefaultCategories(r.Context(), user.ID); err != nil {
				log.Printf("failed to seed default categories for user %s: %v", user.ID, err)
			}
		} else {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to find user")
			return
		}
	} else {
		// Update user info from Google
		user.Email = tokenInfo.Email
		user.DisplayName = tokenInfo.Name
		user.AvatarURL = tokenInfo.Picture
		user.UpdatedAt = time.Now()

		if err := h.usersRepo.Update(r.Context(), user); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to update user")
			return
		}
	}

	// Generate JWT
	token, err := h.jwtManager.Generate(user.ID, user.Email, user.DisplayName)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to generate token")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, AuthResponse{
		Token: token,
		User:  user,
	})
}

func (h *AuthHandler) seedDefaultCategories(ctx context.Context, userID string) error {
	// Skip if user already has categories
	if cats, err := h.categoriesRepo.List(ctx, userID); err == nil && len(cats) > 0 {
		return nil
	}

	now := time.Now()
	categories := []struct {
		name  string
		typ   core.CategoryType
		color string
		icon  string
	}{
		{name: "Living", typ: core.CategoryTypeExpense, color: "#22c55e", icon: "home"},
		{name: "Employment", typ: core.CategoryTypeIncome, color: "#0ea5e9", icon: "briefcase"},
		{name: "Travel", typ: core.CategoryTypeExpense, color: "#f97316", icon: "plane"},
		{name: "Food", typ: core.CategoryTypeExpense, color: "#f59e0b", icon: "utensils"},
		{name: "Amenities", typ: core.CategoryTypeExpense, color: "#8b5cf6", icon: "sparkles"},
		{name: "Fun", typ: core.CategoryTypeExpense, color: "#ec4899", icon: "music"},
	}

	for idx, cat := range categories {
		category := &core.Category{
			ID:         uuid.New().String(),
			UserID:     userID,
			Name:       cat.name,
			Type:       cat.typ,
			Color:      cat.color,
			Icon:       cat.icon,
			SortOrder:  idx + 1,
			IsArchived: false,
			CreatedAt:  now,
		}
		if err := h.categoriesRepo.Create(ctx, category); err != nil {
			return err
		}
	}

	return nil
}
