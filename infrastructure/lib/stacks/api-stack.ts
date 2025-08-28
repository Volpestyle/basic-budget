import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
import { SecurityConstruct } from '../constructs/security';

export interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  wafWebAcl?: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigatewayv2.CfnApi;
  public readonly apiFunction: lambda.Function;
  public readonly authFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Security construct
    const security = new SecurityConstruct(this, 'Security', {
      config: props.config
    });

    // JWT Secret for authentication
    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: `basic-budget/${props.config.environment}/jwt-secret`,
      description: `JWT signing secret for ${props.config.environment} environment`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\\'',
        passwordLength: 64
      }
    });

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      layerVersionName: `basic-budget-${props.config.environment}-shared`,
      code: lambda.Code.fromAsset('layers/shared'), // You'll need to create this
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Shared utilities and dependencies'
    });

    // JWT Authorizer Lambda Function
    this.authFunction = new lambda.Function(this, 'AuthorizerFunction', {
      functionName: `basic-budget-${props.config.environment}-authorizer`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/authorizer'), // You'll need to create this
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        JWT_SECRET_ARN: jwtSecret.secretArn,
        NODE_ENV: props.config.environment
      },
      role: security.lambdaExecutionRole,
      layers: [sharedLayer],
      logRetention: props.config.monitoring.retentionDays as logs.RetentionDays,
      tracing: props.config.monitoring.enableXRay 
        ? lambda.Tracing.ACTIVE 
        : lambda.Tracing.DISABLED
    });

    // Grant access to JWT secret
    jwtSecret.grantRead(this.authFunction);

    // Main API Lambda Function
    this.apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: `basic-budget-${props.config.environment}-api`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/api'), // You'll need to create this
      timeout: cdk.Duration.seconds(props.config.lambda.timeout),
      memorySize: props.config.lambda.memorySize,
      reservedConcurrentExecutions: props.config.lambda.reservedConcurrency,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      environment: {
        NODE_ENV: props.config.environment,
        DATABASE_PROXY_ENDPOINT: cdk.aws_ssm.StringParameter.valueFromLookup(
          this, `/basic-budget/${props.config.environment}/database-proxy-endpoint`
        ),
        DATABASE_SECRET_ARN: cdk.aws_ssm.StringParameter.valueFromLookup(
          this, `/basic-budget/${props.config.environment}/database-secret-arn`
        ),
        JWT_SECRET_ARN: jwtSecret.secretArn,
        REDIS_ENDPOINT: cdk.aws_ssm.StringParameter.valueFromLookup(
          this, `/basic-budget/${props.config.environment}/redis-endpoint`
        ),
        LOG_LEVEL: props.config.environment === 'prod' ? 'info' : 'debug'
      },
      role: security.apiLambdaRole,
      layers: [sharedLayer],
      logRetention: props.config.monitoring.retentionDays as logs.RetentionDays,
      tracing: props.config.monitoring.enableXRay 
        ? lambda.Tracing.ACTIVE 
        : lambda.Tracing.DISABLED,
      deadLetterQueueEnabled: true,
      onFailure: new cdk.aws_lambda_destinations.SqsDestination(
        new cdk.aws_sqs.Queue(this, 'ApiDLQ', {
          queueName: `basic-budget-${props.config.environment}-api-dlq`,
          retentionPeriod: cdk.Duration.days(14)
        })
      )
    });

    // Grant database and secrets access
    const databaseSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'DatabaseSecret', 
      `basic-budget/${props.config.environment}/database`
    );
    databaseSecret.grantRead(this.apiFunction);
    jwtSecret.grantRead(this.apiFunction);

    // API Gateway HTTP API v2 (using CFN construct for more control)
    this.api = new apigatewayv2.CfnApi(this, 'HttpApi', {
      name: `basic-budget-${props.config.environment}-api`,
      description: `Basic Budget API - ${props.config.environment}`,
      protocolType: 'HTTP',
      corsConfiguration: {
        allowOrigins: props.config.environment === 'prod' 
          ? ['https://basicbudget.com'] 
          : ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent'
        ],
        maxAge: 86400
      }
    });

    // Lambda integration
    const lambdaIntegration = new apigatewayv2.CfnIntegration(this, 'LambdaIntegration', {
      apiId: this.api.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.apiFunction.functionArn}/invocations`,
      payloadFormatVersion: '2.0'
    });

    // Lambda authorizer
    const authorizer = new apigatewayv2.CfnAuthorizer(this, 'JWTAuthorizer', {
      apiId: this.api.ref,
      authorizerType: 'REQUEST',
      name: `basic-budget-${props.config.environment}-jwt-authorizer`,
      authorizerUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.authFunction.functionArn}/invocations`,
      identitySource: ['$request.header.Authorization'],
      authorizerResultTtlInSeconds: 300
    });

    // API Routes
    new apigatewayv2.CfnRoute(this, 'ProxyRoute', {
      apiId: this.api.ref,
      routeKey: 'ANY /{proxy+}',
      target: `integrations/${lambdaIntegration.ref}`,
      authorizerId: authorizer.ref
    });

    // Health check route without authorization
    new apigatewayv2.CfnRoute(this, 'HealthRoute', {
      apiId: this.api.ref,
      routeKey: 'GET /health',
      target: `integrations/${lambdaIntegration.ref}`
    });

    // Grant API Gateway permission to invoke Lambda
    this.apiFunction.addPermission('ApiGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.ref}/*/*`
    });

    this.authFunction.addPermission('ApiGatewayInvokeAuth', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.ref}/*/*`
    });

    // API Stage
    const stage = new apigatewayv2.CfnStage(this, 'ApiStage', {
      apiId: this.api.ref,
      stageName: props.config.environment,
      autoDeploy: true,
      defaultRouteSettings: {
        throttlingRateLimit: props.config.apiGateway.throttleRateLimit,
        throttlingBurstLimit: props.config.apiGateway.throttleBurstLimit
      }
    });

    // CloudWatch Log Group for API Gateway
    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/basic-budget-${props.config.environment}`,
      retention: props.config.monitoring.retentionDays as logs.RetentionDays,
      removalPolicy: props.config.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY
    });

    // Associate WAF if enabled
    if (props.wafWebAcl) {
      new cdk.aws_wafv2.CfnWebACLAssociation(this, 'ApiWafAssociation', {
        webAclArn: props.wafWebAcl,
        resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.ref}/stages/${stage.stageName}`
      });
    }

    // CloudWatch Alarms
    if (props.config.monitoring.enableDetailedMonitoring) {
      // API Gateway 4XX errors
      new cdk.aws_cloudwatch.Alarm(this, 'Api4XXErrorAlarm', {
        alarmName: `api-4xx-errors-${props.config.environment}`,
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiId: this.api.ref
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
      });

      // API Gateway 5XX errors
      new cdk.aws_cloudwatch.Alarm(this, 'Api5XXErrorAlarm', {
        alarmName: `api-5xx-errors-${props.config.environment}`,
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiId: this.api.ref
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
      });

      // API Gateway latency
      new cdk.aws_cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
        alarmName: `api-latency-${props.config.environment}`,
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiId: this.api.ref
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 5000, // 5 seconds
        evaluationPeriods: 3,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    // SSM Parameters for other stacks
    new cdk.aws_ssm.StringParameter(this, 'ApiEndpointParameter', {
      parameterName: `/basic-budget/${props.config.environment}/api-endpoint`,
      stringValue: `https://${this.api.ref}.execute-api.${this.region}.amazonaws.com/${stage.stageName}`
    });

    new cdk.aws_ssm.StringParameter(this, 'ApiIdParameter', {
      parameterName: `/basic-budget/${props.config.environment}/api-id`,
      stringValue: this.api.ref
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `https://${this.api.ref}.execute-api.${this.region}.amazonaws.com/${stage.stageName}`,
      exportName: `basic-budget-${props.config.environment}-api-endpoint`
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.ref,
      exportName: `basic-budget-${props.config.environment}-api-id`
    });

    new cdk.CfnOutput(this, 'ApiFunctionName', {
      value: this.apiFunction.functionName,
      exportName: `basic-budget-${props.config.environment}-api-function-name`
    });

    // Apply tags
    Object.entries(props.config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}