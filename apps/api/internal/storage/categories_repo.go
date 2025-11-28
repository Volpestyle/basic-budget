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

var ErrCategoryNotFound = errors.New("category not found")

type CategoriesRepository struct {
	client    *Client
	tableName string
}

func NewCategoriesRepository(client *Client, tableName string) *CategoriesRepository {
	return &CategoriesRepository{
		client:    client,
		tableName: tableName,
	}
}

func (r *CategoriesRepository) List(ctx context.Context, userID string) ([]core.Category, error) {
	result, err := r.client.db.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("user_id = :uid"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":uid": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return nil, err
	}

	categories := make([]core.Category, 0, len(result.Items))
	for _, item := range result.Items {
		var category core.Category
		if err := attributevalue.UnmarshalMap(item, &category); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}

	return categories, nil
}

func (r *CategoriesRepository) GetByID(ctx context.Context, userID, categoryID string) (*core.Category, error) {
	result, err := r.client.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":     &types.AttributeValueMemberS{Value: userID},
			"category_id": &types.AttributeValueMemberS{Value: categoryID},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, ErrCategoryNotFound
	}

	var category core.Category
	if err := attributevalue.UnmarshalMap(result.Item, &category); err != nil {
		return nil, err
	}

	return &category, nil
}

func (r *CategoriesRepository) Create(ctx context.Context, category *core.Category) error {
	item, err := attributevalue.MarshalMap(category)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id) AND attribute_not_exists(category_id)"),
	})

	return err
}

func (r *CategoriesRepository) Update(ctx context.Context, category *core.Category) error {
	item, err := attributevalue.MarshalMap(category)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})

	return err
}

func (r *CategoriesRepository) Delete(ctx context.Context, userID, categoryID string) error {
	_, err := r.client.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":     &types.AttributeValueMemberS{Value: userID},
			"category_id": &types.AttributeValueMemberS{Value: categoryID},
		},
	})

	return err
}
