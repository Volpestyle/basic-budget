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

var ErrRecurringRuleNotFound = errors.New("recurring rule not found")

type RecurringRepository struct {
	client    *Client
	tableName string
}

func NewRecurringRepository(client *Client, tableName string) *RecurringRepository {
	return &RecurringRepository{
		client:    client,
		tableName: tableName,
	}
}

func (r *RecurringRepository) List(ctx context.Context, userID string) ([]core.RecurringRule, error) {
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

	rules := make([]core.RecurringRule, 0, len(result.Items))
	for _, item := range result.Items {
		var rule core.RecurringRule
		if err := attributevalue.UnmarshalMap(item, &rule); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}

	return rules, nil
}

func (r *RecurringRepository) GetByID(ctx context.Context, userID, ruleID string) (*core.RecurringRule, error) {
	result, err := r.client.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":      &types.AttributeValueMemberS{Value: userID},
			"recurring_id": &types.AttributeValueMemberS{Value: ruleID},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, ErrRecurringRuleNotFound
	}

	var rule core.RecurringRule
	if err := attributevalue.UnmarshalMap(result.Item, &rule); err != nil {
		return nil, err
	}

	return &rule, nil
}

func (r *RecurringRepository) Create(ctx context.Context, rule *core.RecurringRule) error {
	item, err := attributevalue.MarshalMap(rule)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id) AND attribute_not_exists(recurring_id)"),
	})

	return err
}

func (r *RecurringRepository) Update(ctx context.Context, rule *core.RecurringRule) error {
	item, err := attributevalue.MarshalMap(rule)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})

	return err
}

func (r *RecurringRepository) Delete(ctx context.Context, userID, ruleID string) error {
	_, err := r.client.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":      &types.AttributeValueMemberS{Value: userID},
			"recurring_id": &types.AttributeValueMemberS{Value: ruleID},
		},
	})

	return err
}

// ListDue returns all recurring rules that are due (next_occurrence <= today)
func (r *RecurringRepository) ListDue(ctx context.Context, today string) ([]core.RecurringRule, error) {
	result, err := r.client.db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(r.tableName),
		FilterExpression: aws.String("next_occurrence <= :today AND is_active = :active"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":today":  &types.AttributeValueMemberS{Value: today},
			":active": &types.AttributeValueMemberBOOL{Value: true},
		},
	})
	if err != nil {
		return nil, err
	}

	rules := make([]core.RecurringRule, 0, len(result.Items))
	for _, item := range result.Items {
		var rule core.RecurringRule
		if err := attributevalue.UnmarshalMap(item, &rule); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}

	return rules, nil
}
