import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import type { Construct } from 'constructs'

export interface Tables {
  users: dynamodb.Table
  categories: dynamodb.Table
  monthBudgets: dynamodb.Table
  transactions: dynamodb.Table
  recurringRules: dynamodb.Table
  incomeStreams: dynamodb.Table
}

export class StorageStack extends cdk.Stack {
  public readonly tables: Tables

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Users table - simple key-value
    const users = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'basic-budget-users',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    // Categories table
    const categories = new dynamodb.Table(this, 'CategoriesTable', {
      tableName: 'basic-budget-categories',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'category_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    // Month budgets table
    const monthBudgets = new dynamodb.Table(this, 'MonthBudgetsTable', {
      tableName: 'basic-budget-month-budgets',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'month_category', type: dynamodb.AttributeType.STRING }, // e.g., "2025-11#cat-123"
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    // Transactions table with GSI for category queries
    const transactions = new dynamodb.Table(this, 'TransactionsTable', {
      tableName: 'basic-budget-transactions',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date_tx_id', type: dynamodb.AttributeType.STRING }, // e.g., "2025-11-23#tx-123"
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    transactions.addGlobalSecondaryIndex({
      indexName: 'category-date-index',
      partitionKey: { name: 'user_category', type: dynamodb.AttributeType.STRING }, // e.g., "user-123#cat-456"
      sortKey: { name: 'date_tx_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    })

    // Recurring rules table
    const recurringRules = new dynamodb.Table(this, 'RecurringRulesTable', {
      tableName: 'basic-budget-recurring-rules',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'recurring_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    // Income streams table
    const incomeStreams = new dynamodb.Table(this, 'IncomeStreamsTable', {
      tableName: 'basic-budget-income-streams',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'income_stream_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    this.tables = {
      users,
      categories,
      monthBudgets,
      transactions,
      recurringRules,
      incomeStreams,
    }

    // Outputs
    new cdk.CfnOutput(this, 'UsersTableName', { value: users.tableName })
    new cdk.CfnOutput(this, 'CategoriesTableName', { value: categories.tableName })
    new cdk.CfnOutput(this, 'MonthBudgetsTableName', { value: monthBudgets.tableName })
    new cdk.CfnOutput(this, 'TransactionsTableName', { value: transactions.tableName })
    new cdk.CfnOutput(this, 'RecurringRulesTableName', { value: recurringRules.tableName })
    new cdk.CfnOutput(this, 'IncomeStreamsTableName', { value: incomeStreams.tableName })
  }
}
