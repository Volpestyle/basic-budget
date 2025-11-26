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

var ErrIncomeStreamNotFound = errors.New("income stream not found")

type IncomeStreamsRepository struct {
	client    *Client
	tableName string
}

func NewIncomeStreamsRepository(client *Client, tableName string) *IncomeStreamsRepository {
	return &IncomeStreamsRepository{
		client:    client,
		tableName: tableName,
	}
}

func (r *IncomeStreamsRepository) List(ctx context.Context, userID string) ([]core.IncomeStream, error) {
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

	streams := make([]core.IncomeStream, 0, len(result.Items))
	for _, item := range result.Items {
		var stream core.IncomeStream
		if err := attributevalue.UnmarshalMap(item, &stream); err != nil {
			return nil, err
		}
		streams = append(streams, stream)
	}

	return streams, nil
}

func (r *IncomeStreamsRepository) GetByID(ctx context.Context, userID, streamID string) (*core.IncomeStream, error) {
	result, err := r.client.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":          &types.AttributeValueMemberS{Value: userID},
			"income_stream_id": &types.AttributeValueMemberS{Value: streamID},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, ErrIncomeStreamNotFound
	}

	var stream core.IncomeStream
	if err := attributevalue.UnmarshalMap(result.Item, &stream); err != nil {
		return nil, err
	}

	return &stream, nil
}

func (r *IncomeStreamsRepository) Create(ctx context.Context, stream *core.IncomeStream) error {
	item, err := attributevalue.MarshalMap(stream)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id) AND attribute_not_exists(income_stream_id)"),
	})

	return err
}

func (r *IncomeStreamsRepository) Update(ctx context.Context, stream *core.IncomeStream) error {
	item, err := attributevalue.MarshalMap(stream)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})

	return err
}

func (r *IncomeStreamsRepository) Delete(ctx context.Context, userID, streamID string) error {
	_, err := r.client.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":          &types.AttributeValueMemberS{Value: userID},
			"income_stream_id": &types.AttributeValueMemberS{Value: streamID},
		},
	})

	return err
}
