package storage

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

// Client wraps the DynamoDB client
type Client struct {
	db *dynamodb.Client
}

// NewClient creates a new DynamoDB client
func NewClient(ctx context.Context) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	return &Client{
		db: dynamodb.NewFromConfig(cfg),
	}, nil
}

// NewClientWithEndpoint creates a new DynamoDB client with a custom endpoint (for local testing)
func NewClientWithEndpoint(ctx context.Context, endpoint string) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	return &Client{
		db: dynamodb.NewFromConfig(cfg, func(o *dynamodb.Options) {
			o.BaseEndpoint = aws.String(endpoint)
		}),
	}, nil
}

// DB returns the underlying DynamoDB client
func (c *Client) DB() *dynamodb.Client {
	return c.db
}
