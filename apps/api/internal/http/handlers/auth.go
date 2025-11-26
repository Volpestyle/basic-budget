package handlers

import (
	"errors"
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
}

func NewAuthHandler(
	googleVerifier *auth.GoogleVerifier,
	jwtManager *auth.JWTManager,
	usersRepo *storage.UsersRepository,
) *AuthHandler {
	return &AuthHandler{
		googleVerifier: googleVerifier,
		jwtManager:     jwtManager,
		usersRepo:      usersRepo,
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
