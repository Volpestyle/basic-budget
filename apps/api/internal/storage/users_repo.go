package storage

import (
	"context"
	"errors"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
)

var ErrUserNotFound = errors.New("user not found")

type UsersRepository struct {
	client    *Client
	tableName string
}

func NewUsersRepository(client *Client, tableName string) *UsersRepository {
	return &UsersRepository{
		client:    client,
		tableName: tableName,
	}
}

func (r *UsersRepository) GetByID(ctx context.Context, userID string) (*core.User, error) {
	result, err := r.client.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, ErrUserNotFound
	}

	var user core.User
	if err := attributevalue.UnmarshalMap(result.Item, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UsersRepository) GetByGoogleSub(ctx context.Context, googleSub string) (*core.User, error) {
	// Use a scan with filter for Google sub (in production, you'd want a GSI)
	result, err := r.client.db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(r.tableName),
		FilterExpression: aws.String("google_sub = :sub"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":sub": &types.AttributeValueMemberS{Value: googleSub},
		},
	})
	if err != nil {
		return nil, err
	}

	if len(result.Items) == 0 {
		return nil, ErrUserNotFound
	}

	var user core.User
	if err := attributevalue.UnmarshalMap(result.Items[0], &user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UsersRepository) Create(ctx context.Context, user *core.User) error {
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id)"),
	})

	return err
}

func (r *UsersRepository) Update(ctx context.Context, user *core.User) error {
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})

	return err
}
