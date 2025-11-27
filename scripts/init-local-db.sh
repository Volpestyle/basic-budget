#!/bin/bash
# Initialize DynamoDB Local tables for development

ENDPOINT="http://localhost:8000"
REGION="us-east-1"

# Set dummy credentials for DynamoDB Local
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local

echo "Creating DynamoDB tables..."

# Users table (PK: user_id)
aws dynamodb create-table \
  --table-name basic-budget-users \
  --attribute-definitions AttributeName=user_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  2>/dev/null && echo "✓ Created users table" || echo "- Users table already exists"

# Categories table (PK: user_id, SK: category_id)
aws dynamodb create-table \
  --table-name basic-budget-categories \
  --attribute-definitions AttributeName=user_id,AttributeType=S AttributeName=category_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH AttributeName=category_id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  2>/dev/null && echo "✓ Created categories table" || echo "- Categories table already exists"

# Month budgets table (PK: user_id, SK: month_category)
aws dynamodb create-table \
  --table-name basic-budget-month-budgets \
  --attribute-definitions AttributeName=user_id,AttributeType=S AttributeName=month_category,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH AttributeName=month_category,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  2>/dev/null && echo "✓ Created month-budgets table" || echo "- Month-budgets table already exists"

# Transactions table (PK: user_id, SK: date_tx_id, GSI on user_category)
aws dynamodb create-table \
  --table-name basic-budget-transactions \
  --attribute-definitions AttributeName=user_id,AttributeType=S AttributeName=date_tx_id,AttributeType=S AttributeName=user_category,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH AttributeName=date_tx_id,KeyType=RANGE \
  --global-secondary-indexes '[{"IndexName":"category-date-index","KeySchema":[{"AttributeName":"user_category","KeyType":"HASH"},{"AttributeName":"date_tx_id","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  2>/dev/null && echo "✓ Created transactions table" || echo "- Transactions table already exists"

# Recurring rules table (PK: user_id, SK: recurring_id)
aws dynamodb create-table \
  --table-name basic-budget-recurring-rules \
  --attribute-definitions AttributeName=user_id,AttributeType=S AttributeName=recurring_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH AttributeName=recurring_id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  2>/dev/null && echo "✓ Created recurring-rules table" || echo "- Recurring-rules table already exists"

# Income streams table (PK: user_id, SK: income_stream_id)
aws dynamodb create-table \
  --table-name basic-budget-income-streams \
  --attribute-definitions AttributeName=user_id,AttributeType=S AttributeName=income_stream_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH AttributeName=income_stream_id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  2>/dev/null && echo "✓ Created income-streams table" || echo "- Income-streams table already exists"

echo ""
echo "Done! Tables ready at $ENDPOINT"
