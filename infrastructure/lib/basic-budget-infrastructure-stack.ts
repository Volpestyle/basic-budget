import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { DatabaseStack } from './stacks/database-stack';
import { ApiStack } from './stacks/api-stack';
import { FrontendStack } from './stacks/frontend-stack';
import { PaystubStack } from './stacks/paystub-stack';

export interface BasicBudgetInfrastructureStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class BasicBudgetInfrastructureStack extends cdk.Stack {
  public readonly databaseStack: DatabaseStack;
  public readonly apiStack: ApiStack;
  public readonly frontendStack: FrontendStack;
  public readonly paystubStack: PaystubStack;

  constructor(scope: Construct, id: string, props: BasicBudgetInfrastructureStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Database Stack - Core infrastructure (VPC, RDS)
    this.databaseStack = new DatabaseStack(this, 'Database', {
      stackName: `basic-budget-database-${config.environment}`,
      config,
      env: {
        account: config.account,
        region: config.region,
      },
      description: `Basic Budget Database Stack for ${config.environment}`,
    });

    // API Stack - Lambda functions and API Gateway
    this.apiStack = new ApiStack(this, 'Api', {
      stackName: `basic-budget-api-${config.environment}`,
      config,
      vpc: this.databaseStack.vpc,
      databaseSecret: this.databaseStack.secret,
      rdsProxyEndpoint: this.databaseStack.proxy.endpoint,
      env: {
        account: config.account,
        region: config.region,
      },
      description: `Basic Budget API Stack for ${config.environment}`,
    });

    // Frontend Stack - S3 + CloudFront
    this.frontendStack = new FrontendStack(this, 'Frontend', {
      stackName: `basic-budget-frontend-${config.environment}`,
      config,
      env: {
        account: config.account,
        region: config.region,
      },
      description: `Basic Budget Frontend Stack for ${config.environment}`,
    });

    // Paystub Stack - Go Lambda service for document processing
    this.paystubStack = new PaystubStack(this, 'Paystub', {
      stackName: `basic-budget-paystub-${config.environment}`,
      config,
      vpc: this.databaseStack.vpc,
      env: {
        account: config.account,
        region: config.region,
      },
      description: `Basic Budget Paystub Processing Stack for ${config.environment}`,
    });

    // Stack dependencies
    this.apiStack.addDependency(this.databaseStack);
    this.paystubStack.addDependency(this.databaseStack);

    // Cross-stack references and outputs
    new cdk.CfnOutput(this, 'EnvironmentName', {
      value: config.environment,
      description: 'Environment name',
      exportName: `basic-budget-${config.environment}-environment`,
    });

    new cdk.CfnOutput(this, 'Region', {
      value: config.region,
      description: 'AWS Region',
      exportName: `basic-budget-${config.environment}-region`,
    });

    // Application URL
    const appUrl = config.domainName 
      ? `https://${config.environment === 'prod' ? '' : config.environment + '.'}${config.domainName}`
      : `https://${this.frontendStack.distribution.distributionDomainName}`;

    new cdk.CfnOutput(this, 'ApplicationUrl', {
      value: appUrl,
      description: 'Application URL',
      exportName: `basic-budget-${config.environment}-app-url`,
    });

    // API URL
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.apiStack.api.url || 'Not available',
      description: 'API Gateway endpoint',
      exportName: `basic-budget-${config.environment}-api-endpoint`,
    });

    // Global tags for all resources
    cdk.Tags.of(this).add('Project', 'basic-budget');
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}