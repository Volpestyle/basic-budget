package storage

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
)

type BudgetsRepository struct {
	client    *Client
	tableName string
}

func NewBudgetsRepository(client *Client, tableName string) *BudgetsRepository {
	return &BudgetsRepository{
		client:    client,
		tableName: tableName,
	}
}

func (r *BudgetsRepository) GetByMonth(ctx context.Context, userID, month string) ([]core.MonthBudget, error) {
	result, err := r.client.db.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("user_id = :uid AND begins_with(month_category, :month)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":uid":   &types.AttributeValueMemberS{Value: userID},
			":month": &types.AttributeValueMemberS{Value: month + "#"},
		},
	})
	if err != nil {
		return nil, err
	}

	budgets := make([]core.MonthBudget, 0, len(result.Items))
	for _, item := range result.Items {
		var budget core.MonthBudget
		if err := attributevalue.UnmarshalMap(item, &budget); err != nil {
			return nil, err
		}
		budgets = append(budgets, budget)
	}

	return budgets, nil
}

func (r *BudgetsRepository) Upsert(ctx context.Context, budget *core.MonthBudget) error {
	// Set composite key
	budget.MonthCategory = fmt.Sprintf("%s#%s", budget.Month, budget.CategoryID)

	item, err := attributevalue.MarshalMap(budget)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})

	return err
}

func (r *BudgetsRepository) BulkUpsert(ctx context.Context, budgets []core.MonthBudget) error {
	for _, budget := range budgets {
		if err := r.Upsert(ctx, &budget); err != nil {
			return err
		}
	}
	return nil
}

func (r *BudgetsRepository) Delete(ctx context.Context, userID, monthCategory string) error {
	_, err := r.client.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":        &types.AttributeValueMemberS{Value: userID},
			"month_category": &types.AttributeValueMemberS{Value: monthCategory},
		},
	})

	return err
}
