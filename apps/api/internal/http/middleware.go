package http

import (
	"net/http"

	"github.com/jamesvolpe/basic-budget/apps/api/internal/auth"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/httputil"
)

// AuthMiddleware creates middleware that validates JWT tokens
func AuthMiddleware(jwtManager *auth.JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, err := auth.ExtractBearerToken(r.Header.Get("Authorization"))
			if err != nil {
				httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", err.Error())
				return
			}

			claims, err := jwtManager.Verify(token)
			if err != nil {
				httputil.WriteError(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
				return
			}

			// Add user context to request
			userCtx := &httputil.UserContext{
				UserID:      claims.UserID,
				Email:       claims.Email,
				DisplayName: claims.DisplayName,
			}

			ctx := httputil.SetUserInContext(r.Context(), userCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
