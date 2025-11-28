package httputil

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
)

type contextKey string

const userContextKey contextKey = "user"

// UserContext represents the authenticated user in the request context
type UserContext struct {
	UserID      string
	Email       string
	DisplayName string
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

// WriteJSON writes a JSON response
func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		if err := json.NewEncoder(w).Encode(data); err != nil {
			log.Printf("failed to encode response: %v", err)
		}
	}
}

// WriteError writes an error response
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, ErrorResponse{
		Error: message,
		Code:  code,
	})
}

// ReadJSON reads JSON from a request body
func ReadJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// GetUserFromContext retrieves the user from the request context
func GetUserFromContext(ctx context.Context) *UserContext {
	user, ok := ctx.Value(userContextKey).(*UserContext)
	if !ok {
		return nil
	}
	return user
}

// SetUserInContext adds user context to request context
func SetUserInContext(ctx context.Context, user *UserContext) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}
