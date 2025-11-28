package storage

import (
	"context"
	"errors"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/jamesvolpe/basic-budget/apps/api/internal/core"
)

var ErrTransactionNotFound = errors.New("transaction not found")

type TransactionsRepository struct {
	client    *Client
	tableName string
}

func NewTransactionsRepository(client *Client, tableName string) *TransactionsRepository {
	return &TransactionsRepository{
		client:    client,
		tableName: tableName,
	}
}

type ListTransactionsParams struct {
	UserID         string
	From           string // YYYY-MM-DD
	To             string // YYYY-MM-DD
	CategoryID     string
	IncomeStreamID string
	Limit          int32
	Cursor         string
}

func (r *TransactionsRepository) List(ctx context.Context, params ListTransactionsParams) ([]core.Transaction, string, error) {
	limit := params.Limit
	if limit == 0 {
		limit = 50
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("user_id = :uid AND date_tx_id BETWEEN :from AND :to"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":uid":  &types.AttributeValueMemberS{Value: params.UserID},
			":from": &types.AttributeValueMemberS{Value: params.From},
			":to":   &types.AttributeValueMemberS{Value: params.To + "\uffff"}, // Include all transactions on the "to" date
		},
		Limit:            aws.Int32(limit),
		ScanIndexForward: aws.Bool(false), // Most recent first
	}

	// Add filter expressions if needed
	var filterParts []string
	if params.CategoryID != "" {
		filterParts = append(filterParts, "category_id = :catId")
		input.ExpressionAttributeValues[":catId"] = &types.AttributeValueMemberS{Value: params.CategoryID}
	}
	if params.IncomeStreamID != "" {
		filterParts = append(filterParts, "income_stream_id = :streamId")
		input.ExpressionAttributeValues[":streamId"] = &types.AttributeValueMemberS{Value: params.IncomeStreamID}
	}

	if len(filterParts) > 0 {
		filter := filterParts[0]
		for i := 1; i < len(filterParts); i++ {
			filter = filter + " AND " + filterParts[i]
		}
		input.FilterExpression = aws.String(filter)
	}

	result, err := r.client.db.Query(ctx, input)
	if err != nil {
		return nil, "", err
	}

	transactions := make([]core.Transaction, 0, len(result.Items))
	for _, item := range result.Items {
		var tx core.Transaction
		if err := attributevalue.UnmarshalMap(item, &tx); err != nil {
			return nil, "", err
		}
		transactions = append(transactions, tx)
	}

	var nextCursor string
	if result.LastEvaluatedKey != nil {
		// Encode cursor from LastEvaluatedKey
		if sk, ok := result.LastEvaluatedKey["date_tx_id"].(*types.AttributeValueMemberS); ok {
			nextCursor = sk.Value
		}
	}

	return transactions, nextCursor, nil
}

func (r *TransactionsRepository) GetByID(ctx context.Context, userID, dateTxID string) (*core.Transaction, error) {
	result, err := r.client.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":    &types.AttributeValueMemberS{Value: userID},
			"date_tx_id": &types.AttributeValueMemberS{Value: dateTxID},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, ErrTransactionNotFound
	}

	var tx core.Transaction
	if err := attributevalue.UnmarshalMap(result.Item, &tx); err != nil {
		return nil, err
	}

	return &tx, nil
}

func (r *TransactionsRepository) Create(ctx context.Context, tx *core.Transaction) error {
	// Set composite keys
	tx.DateTxID = fmt.Sprintf("%s#%s", tx.Date, tx.ID)
	tx.UserCategory = fmt.Sprintf("%s#%s", tx.UserID, tx.CategoryID)

	item, err := attributevalue.MarshalMap(tx)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id) AND attribute_not_exists(date_tx_id)"),
	})

	return err
}

func (r *TransactionsRepository) Update(ctx context.Context, tx *core.Transaction) error {
	// Update composite keys
	tx.DateTxID = fmt.Sprintf("%s#%s", tx.Date, tx.ID)
	tx.UserCategory = fmt.Sprintf("%s#%s", tx.UserID, tx.CategoryID)

	item, err := attributevalue.MarshalMap(tx)
	if err != nil {
		return err
	}

	_, err = r.client.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})

	return err
}

func (r *TransactionsRepository) Delete(ctx context.Context, userID, dateTxID string) error {
	_, err := r.client.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id":    &types.AttributeValueMemberS{Value: userID},
			"date_tx_id": &types.AttributeValueMemberS{Value: dateTxID},
		},
	})

	return err
}

// GetMonthSummary returns aggregated data for a month
func (r *TransactionsRepository) GetMonthSummary(ctx context.Context, userID, month string) (income, expenses int64, byCategory map[string]int64, err error) {
	from := month + "-01"
	to := month + "-31"

	params := ListTransactionsParams{
		UserID: userID,
		From:   from,
		To:     to,
		Limit:  1000, // Get all transactions for the month
	}

	transactions, _, err := r.List(ctx, params)
	if err != nil {
		return 0, 0, nil, err
	}

	byCategory = make(map[string]int64)

	for _, tx := range transactions {
		switch tx.Type {
		case core.TransactionTypeIncome:
			income += tx.AmountCents
		case core.TransactionTypeExpense:
			expenses += tx.AmountCents
			byCategory[tx.CategoryID] += tx.AmountCents
		}
	}

	return income, expenses, byCategory, nil
}
