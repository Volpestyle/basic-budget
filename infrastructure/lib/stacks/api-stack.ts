import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as authorizers from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

export interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.Vpc;
  databaseSecret: secretsmanager.Secret;
  rdsProxyEndpoint: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigatewayv2.HttpApi;
  public readonly lambdaFunction: lambda.Function;
  public readonly jwtAuthorizer: authorizers.HttpJwtAuthorizer;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, vpc, databaseSecret, rdsProxyEndpoint } = props;

    // JWT Secret for authentication
    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: `basic-budget-${config.environment}-jwt-secret`,
      description: 'JWT secret for Basic Budget API authentication',
      generateSecretString: {
        secretStringTemplate: '{}',
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\\'',
        passwordLength: 64,
      },
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'ApiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        SecretsManagerPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
              ],
              resources: [
                databaseSecret.secretArn,
                jwtSecret.secretArn,
              ],
            }),
          ],
        }),
        RDSProxyPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds-db:connect',
              ],
              resources: [`arn:aws:rds-db:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:dbuser:*/basic-budget-api`],
            }),
          ],
        }),
      },
    });

    // Lambda function for API
    this.lambdaFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: `basic-budget-api-${config.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../packages/api', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              'npm install',
              'npm run build',
              'cp -R dist/* /asset-output/',
              'cp package.json /asset-output/',
              'cd /asset-output && npm install --production',
            ].join(' && '),
          ],
        },
      }),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(config.lambda.timeout),
      memorySize: config.lambda.memorySize,
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        NODE_ENV: config.environment,
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        JWT_SECRET_ARN: jwtSecret.secretArn,
        RDS_PROXY_ENDPOINT: rdsProxyEndpoint,
        LOG_LEVEL: config.environment === 'prod' ? 'warn' : 'debug',
      },
      logGroup: new logs.LogGroup(this, 'ApiLogGroup', {
        logGroupName: `/aws/lambda/basic-budget-api-${config.environment}`,
        retention: config.monitoring.logRetentionDays,
        removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
      deadLetterQueueEnabled: true,
      reservedConcurrentExecutions: config.environment === 'prod' ? 100 : 10,
    });

    // JWT Authorizer
    this.jwtAuthorizer = new authorizers.HttpJwtAuthorizer('JwtAuthorizer', {
      jwtAudience: [`basic-budget-${config.environment}`],
      jwtIssuer: `https://basic-budget-${config.environment}.auth.amazonaws.com`, // Update with your auth provider
    });

    // API Gateway v2
    this.api = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `basic-budget-api-${config.environment}`,
      description: `Basic Budget API for ${config.environment} environment`,
      corsPreflight: {
        allowCredentials: true,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: config.environment === 'prod' 
          ? [config.domainName ? `https://${config.domainName}` : '*']
          : ['*'],
        maxAge: cdk.Duration.days(1),
      },
      defaultAuthorizer: this.jwtAuthorizer,
    });

    // Lambda integration
    const lambdaIntegration = new integrations.HttpLambdaIntegration('ApiIntegration', this.lambdaFunction, {
      payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
    });

    // Routes
    const routes = [
      { method: apigatewayv2.HttpMethod.GET, path: '/api/health' },
      { method: apigatewayv2.HttpMethod.GET, path: '/api/budgets' },
      { method: apigatewayv2.HttpMethod.POST, path: '/api/budgets' },
      { method: apigatewayv2.HttpMethod.GET, path: '/api/budgets/{id}' },
      { method: apigatewayv2.HttpMethod.PUT, path: '/api/budgets/{id}' },
      { method: apigatewayv2.HttpMethod.DELETE, path: '/api/budgets/{id}' },
      { method: apigatewayv2.HttpMethod.GET, path: '/api/transactions' },
      { method: apigatewayv2.HttpMethod.POST, path: '/api/transactions' },
      { method: apigatewayv2.HttpMethod.GET, path: '/api/transactions/{id}' },
      { method: apigatewayv2.HttpMethod.PUT, path: '/api/transactions/{id}' },
      { method: apigatewayv2.HttpMethod.DELETE, path: '/api/transactions/{id}' },
      { method: apigatewayv2.HttpMethod.GET, path: '/api/categories' },
      { method: apigatewayv2.HttpMethod.POST, path: '/api/categories' },
    ];

    // Health check route without authorization
    this.api.addRoutes({
      path: '/api/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // Protected routes with JWT authorization
    routes.filter(route => route.path !== '/api/health').forEach(route => {
      this.api.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: lambdaIntegration,
        authorizer: this.jwtAuthorizer,
      });
    });

    // Custom domain (if configured)
    if (config.domainName && config.certificateArn) {
      const domainName = new apigatewayv2.DomainName(this, 'ApiDomain', {
        domainName: `api.${config.environment === 'prod' ? '' : config.environment + '.'}${config.domainName}`,
        certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
          this,
          'ApiCertificate',
          config.certificateArn
        ),
      });

      new apigatewayv2.ApiMapping(this, 'ApiMapping', {
        api: this.api,
        domainName: domainName,
      });
    }

    // API Gateway logging
    const apiLogGroup = new logs.LogGroup(this, 'ApiAccessLogGroup', {
      logGroupName: `/aws/apigateway/basic-budget-${config.environment}`,
      retention: config.monitoring.logRetentionDays,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const stage = this.api.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    if (stage) {
      stage.accessLogSettings = {
        destinationArn: apiLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: '$context.requestId',
          ip: '$context.identity.sourceIp',
          caller: '$context.identity.caller',
          user: '$context.identity.user',
          requestTime: '$context.requestTime',
          httpMethod: '$context.httpMethod',
          resourcePath: '$context.resourcePath',
          status: '$context.status',
          protocol: '$context.protocol',
          responseLength: '$context.responseLength',
          errorMessage: '$context.error.message',
          errorMessageString: '$context.error.messageString',
          integrationErrorMessage: '$context.integrationErrorMessage',
          integrationLatency: '$context.integrationLatency',
          responseLatency: '$context.responseLatency',
        }),
      };
    }

    // IAM role for GitHub Actions deployment
    const deploymentRole = new iam.Role(this, 'ApiDeploymentRole', {
      roleName: `basic-budget-api-deploy-${config.environment}`,
      assumedBy: new iam.WebIdentityPrincipal(
        `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': 'repo:*/basic-budget:*', // Update with your GitHub repo
          },
        }
      ),
      inlinePolicies: {
        LambdaDeploymentPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:UpdateFunctionCode',
                'lambda:UpdateFunctionConfiguration',
                'lambda:GetFunction',
                'lambda:PublishVersion',
                'lambda:UpdateAlias',
                'lambda:CreateAlias',
              ],
              resources: [this.lambdaFunction.functionArn],
            }),
          ],
        }),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url!,
      description: 'API Gateway URL',
      exportName: `basic-budget-${config.environment}-api-url`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.lambdaFunction.functionArn,
      description: 'API Lambda Function ARN',
      exportName: `basic-budget-${config.environment}-api-lambda-arn`,
    });

    new cdk.CfnOutput(this, 'ApiDeploymentRoleArn', {
      value: deploymentRole.roleArn,
      description: 'GitHub Actions API Deployment Role ARN',
      exportName: `basic-budget-${config.environment}-api-deploy-role`,
    });

    // Tags
    cdk.Tags.of(this).add('Stack', 'API');
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}