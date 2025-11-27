package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func main() {
	ctx := context.Background()

	endpoint := os.Getenv("DYNAMODB_ENDPOINT")
	if endpoint == "" {
		endpoint = "http://localhost:8000"
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	client := dynamodb.NewFromConfig(cfg, func(o *dynamodb.Options) {
		o.BaseEndpoint = aws.String(endpoint)
	})

	fmt.Printf("Resetting tables at %s...\n\n", endpoint)

	tableNames := []string{
		"basic-budget-users",
		"basic-budget-categories",
		"basic-budget-month-budgets",
		"basic-budget-transactions",
		"basic-budget-recurring-rules",
		"basic-budget-income-streams",
	}

	waiter := dynamodb.NewTableNotExistsWaiter(client)
	for _, name := range tableNames {
		_, err := client.DeleteTable(ctx, &dynamodb.DeleteTableInput{
			TableName: aws.String(name),
		})
		var notFound *types.ResourceNotFoundException
		switch {
		case err == nil:
			fmt.Printf("- Dropping %s...\n", name)
		case errors.As(err, &notFound):
			fmt.Printf("- %s did not exist, skipping drop\n", name)
			continue
		default:
			fmt.Printf("! %s (delete error: %v)\n", name, err)
		}

		if err := waiter.Wait(ctx, &dynamodb.DescribeTableInput{TableName: aws.String(name)}, 30*time.Second); err != nil {
			fmt.Printf("! %s (wait for delete failed: %v)\n", name, err)
		}
	}

	fmt.Println("\nCreating tables...")
	tables := []struct {
		name       string
		keySchema  []types.KeySchemaElement
		attributes []types.AttributeDefinition
		gsi        []types.GlobalSecondaryIndex
	}{
		{
			name: "basic-budget-users",
			keySchema: []types.KeySchemaElement{
				{AttributeName: aws.String("user_id"), KeyType: types.KeyTypeHash},
			},
			attributes: []types.AttributeDefinition{
				{AttributeName: aws.String("user_id"), AttributeType: types.ScalarAttributeTypeS},
			},
		},
		{
			name: "basic-budget-categories",
			keySchema: []types.KeySchemaElement{
				{AttributeName: aws.String("user_id"), KeyType: types.KeyTypeHash},
				{AttributeName: aws.String("category_id"), KeyType: types.KeyTypeRange},
			},
			attributes: []types.AttributeDefinition{
				{AttributeName: aws.String("user_id"), AttributeType: types.ScalarAttributeTypeS},
				{AttributeName: aws.String("category_id"), AttributeType: types.ScalarAttributeTypeS},
			},
		},
		{
			name: "basic-budget-month-budgets",
			keySchema: []types.KeySchemaElement{
				{AttributeName: aws.String("user_id"), KeyType: types.KeyTypeHash},
				{AttributeName: aws.String("month_category"), KeyType: types.KeyTypeRange},
			},
			attributes: []types.AttributeDefinition{
				{AttributeName: aws.String("user_id"), AttributeType: types.ScalarAttributeTypeS},
				{AttributeName: aws.String("month_category"), AttributeType: types.ScalarAttributeTypeS},
			},
		},
		{
			name: "basic-budget-transactions",
			keySchema: []types.KeySchemaElement{
				{AttributeName: aws.String("user_id"), KeyType: types.KeyTypeHash},
				{AttributeName: aws.String("date_tx_id"), KeyType: types.KeyTypeRange},
			},
			attributes: []types.AttributeDefinition{
				{AttributeName: aws.String("user_id"), AttributeType: types.ScalarAttributeTypeS},
				{AttributeName: aws.String("date_tx_id"), AttributeType: types.ScalarAttributeTypeS},
				{AttributeName: aws.String("user_category"), AttributeType: types.ScalarAttributeTypeS},
			},
			gsi: []types.GlobalSecondaryIndex{
				{
					IndexName: aws.String("category-date-index"),
					KeySchema: []types.KeySchemaElement{
						{AttributeName: aws.String("user_category"), KeyType: types.KeyTypeHash},
						{AttributeName: aws.String("date_tx_id"), KeyType: types.KeyTypeRange},
					},
					Projection: &types.Projection{ProjectionType: types.ProjectionTypeAll},
				},
			},
		},
		{
			name: "basic-budget-recurring-rules",
			keySchema: []types.KeySchemaElement{
				{AttributeName: aws.String("user_id"), KeyType: types.KeyTypeHash},
				{AttributeName: aws.String("recurring_id"), KeyType: types.KeyTypeRange},
			},
			attributes: []types.AttributeDefinition{
				{AttributeName: aws.String("user_id"), AttributeType: types.ScalarAttributeTypeS},
				{AttributeName: aws.String("recurring_id"), AttributeType: types.ScalarAttributeTypeS},
			},
		},
		{
			name: "basic-budget-income-streams",
			keySchema: []types.KeySchemaElement{
				{AttributeName: aws.String("user_id"), KeyType: types.KeyTypeHash},
				{AttributeName: aws.String("income_stream_id"), KeyType: types.KeyTypeRange},
			},
			attributes: []types.AttributeDefinition{
				{AttributeName: aws.String("user_id"), AttributeType: types.ScalarAttributeTypeS},
				{AttributeName: aws.String("income_stream_id"), AttributeType: types.ScalarAttributeTypeS},
			},
		},
	}

	for _, table := range tables {
		input := &dynamodb.CreateTableInput{
			TableName:            aws.String(table.name),
			KeySchema:            table.keySchema,
			AttributeDefinitions: table.attributes,
			BillingMode:          types.BillingModePayPerRequest,
		}

		if len(table.gsi) > 0 {
			input.GlobalSecondaryIndexes = table.gsi
		}

		_, err := client.CreateTable(ctx, input)
		if err != nil {
			// Check if table already exists
			fmt.Printf("- %s (already exists or error: %v)\n", table.name, err)
		} else {
			fmt.Printf("✓ Created %s\n", table.name)
		}
	}

	fmt.Println("\nDone!")
}
