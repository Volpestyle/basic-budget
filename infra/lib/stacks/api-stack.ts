import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import type { Construct } from 'constructs'
import type { Tables } from './storage-stack.js'

interface ApiStackProps extends cdk.StackProps {
  tables: Tables
  frontendOrigins?: string[]
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.HttpApi
  public readonly apiFunction: lambda.Function

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const { tables } = props

    const allowOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      ...(props.frontendOrigins ?? []),
    ]

    // Secret for Google OAuth client secret
    const googleSecret = new secretsmanager.Secret(this, 'GoogleOAuthSecret', {
      secretName: 'basic-budget/google-oauth',
      description: 'Google OAuth client credentials for Basic Budget',
    })

    // Lambda function for the API
    this.apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: 'basic-budget-api',
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset('../apps/api/bin', {
        // Will be populated after Go build
      }),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        USERS_TABLE: tables.users.tableName,
        CATEGORIES_TABLE: tables.categories.tableName,
        MONTH_BUDGETS_TABLE: tables.monthBudgets.tableName,
        TRANSACTIONS_TABLE: tables.transactions.tableName,
        RECURRING_RULES_TABLE: tables.recurringRules.tableName,
        INCOME_STREAMS_TABLE: tables.incomeStreams.tableName,
        GOOGLE_SECRET_ARN: googleSecret.secretArn,
      },
    })

    // Grant DynamoDB permissions
    tables.users.grantReadWriteData(this.apiFunction)
    tables.categories.grantReadWriteData(this.apiFunction)
    tables.monthBudgets.grantReadWriteData(this.apiFunction)
    tables.transactions.grantReadWriteData(this.apiFunction)
    tables.recurringRules.grantReadWriteData(this.apiFunction)
    tables.incomeStreams.grantReadWriteData(this.apiFunction)

    // Grant secret read access
    googleSecret.grantRead(this.apiFunction)

    // HTTP API
    this.api = new apigateway.HttpApi(this, 'HttpApi', {
      apiName: 'basic-budget-api',
      description: 'Basic Budget API',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.PATCH,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins,
        maxAge: cdk.Duration.hours(24),
      },
    })

    // Lambda integration
    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      this.apiFunction
    )

    // Routes - all go to the same Lambda
    this.api.addRoutes({
      path: '/api/v1/{proxy+}',
      methods: [apigateway.HttpMethod.ANY],
      integration: lambdaIntegration,
    })

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url ?? 'undefined',
      description: 'API Gateway URL',
    })

    new cdk.CfnOutput(this, 'GoogleSecretArn', {
      value: googleSecret.secretArn,
      description: 'ARN for Google OAuth secret - add client_id and client_secret',
    })
  }
}
