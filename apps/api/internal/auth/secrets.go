package auth

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// GoogleOAuthSecret represents the structure of the Google OAuth secret
type GoogleOAuthSecret struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
}

// SecretsManager handles fetching secrets from AWS Secrets Manager
type SecretsManager struct {
	client *secretsmanager.Client
}

// NewSecretsManager creates a new secrets manager
func NewSecretsManager(ctx context.Context) (*SecretsManager, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("loading AWS config: %w", err)
	}

	return &SecretsManager{
		client: secretsmanager.NewFromConfig(cfg),
	}, nil
}

// GetGoogleOAuthSecret fetches the Google OAuth credentials from Secrets Manager
func (m *SecretsManager) GetGoogleOAuthSecret(ctx context.Context, secretARN string) (*GoogleOAuthSecret, error) {
	result, err := m.client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretARN),
	})
	if err != nil {
		return nil, fmt.Errorf("getting secret value: %w", err)
	}

	var secret GoogleOAuthSecret
	if err := json.Unmarshal([]byte(*result.SecretString), &secret); err != nil {
		return nil, fmt.Errorf("unmarshaling secret: %w", err)
	}

	return &secret, nil
}
