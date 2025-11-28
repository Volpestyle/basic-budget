package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken    = errors.New("invalid token")
	ErrTokenExpired    = errors.New("token expired")
	ErrInvalidAudience = errors.New("invalid audience")
	ErrInvalidIssuer   = errors.New("invalid issuer")
)

// GoogleClaims represents the claims from a Google ID token
type GoogleClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Locale        string `json:"locale"`
	jwt.RegisteredClaims
}

// GoogleTokenInfo represents the response from Google's tokeninfo endpoint
type GoogleTokenInfo struct {
	Aud           string `json:"aud"`
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Locale        string `json:"locale"`
	Exp           string `json:"exp"`
}

// GoogleVerifier verifies Google ID tokens
type GoogleVerifier struct {
	clientID   string
	httpClient *http.Client
}

// NewGoogleVerifier creates a new Google token verifier
func NewGoogleVerifier(clientID string) *GoogleVerifier {
	return &GoogleVerifier{
		clientID: clientID,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// VerifyIDToken verifies a Google ID token and returns the claims
// Uses Google's tokeninfo endpoint for simplicity and reliability
func (v *GoogleVerifier) VerifyIDToken(ctx context.Context, idToken string) (*GoogleTokenInfo, error) {
	// Use Google's tokeninfo endpoint to verify the token
	url := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("verifying token: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, ErrInvalidToken
	}

	var tokenInfo GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&tokenInfo); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	// Verify audience matches our client ID
	if tokenInfo.Aud != v.clientID {
		return nil, ErrInvalidAudience
	}

	return &tokenInfo, nil
}

// ExtractBearerToken extracts the token from an Authorization header
func ExtractBearerToken(authHeader string) (string, error) {
	if authHeader == "" {
		return "", errors.New("authorization header required")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", errors.New("invalid authorization header format")
	}

	return parts[1], nil
}
