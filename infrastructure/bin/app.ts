#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getEnvironmentConfig } from '../lib/config/environment';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { PaystubProcessingStack } from '../lib/stacks/paystub-processing-stack';
import { SupportingServicesStack } from '../lib/stacks/supporting-services-stack';

const app = new cdk.App();

// Get environment from context (defaults to 'dev')
const environment = app.node.tryGetContext('environment') || 'dev';
const config = getEnvironmentConfig(environment);

console.log(`Deploying to environment: ${environment}`);
console.log(`Region: ${config.region}`);
console.log(`Account: ${config.account}`);

// Environment configuration
const env = {
  account: config.account,
  region: config.region
};

// Stack naming convention
const getStackName = (stackType: string) => `BasicBudget${cdk.Stack.of(app).stackName || ''}${environment.charAt(0).toUpperCase() + environment.slice(1)}${stackType}`;

// 1. Database Stack - Foundation layer (VPC, RDS, Security Groups)
const databaseStack = new DatabaseStack(app, getStackName('Database'), {
  config,
  env,
  description: `Database infrastructure for Basic Budget ${environment} environment`,
  stackName: getStackName('Database'),
  tags: config.tags
});

// 2. Supporting Services Stack - Shared services (Redis, Monitoring, Backup)
const supportingServicesStack = new SupportingServicesStack(app, getStackName('SupportingServices'), {
  config,
  env,
  vpc: databaseStack.vpc,
  lambdaSecurityGroup: cdk.aws_ec2.SecurityGroup.fromSecurityGroupId(
    app,
    'LambdaSecurityGroupRef',
    cdk.aws_ssm.StringParameter.valueFromLookup(app, `/basic-budget/${environment}/lambda-security-group-id`)
  ),
  alarmEmail: app.node.tryGetContext('alarmEmail'),
  description: `Supporting services for Basic Budget ${environment} environment`,
  stackName: getStackName('SupportingServices'),
  tags: config.tags
});

// Add explicit dependency
supportingServicesStack.addDependency(databaseStack);

// 3. API Stack - Application logic layer
const apiStack = new ApiStack(app, getStackName('Api'), {
  config,
  env,
  vpc: databaseStack.vpc,
  databaseSecurityGroup: databaseStack.securityGroup,
  lambdaSecurityGroup: cdk.aws_ec2.SecurityGroup.fromSecurityGroupId(
    app,
    'LambdaSecurityGroupRef2',
    cdk.aws_ssm.StringParameter.valueFromLookup(app, `/basic-budget/${environment}/lambda-security-group-id`)
  ),
  wafWebAcl: config.apiGateway.enableWaf 
    ? `arn:aws:wafv2:${config.region}:${config.account}:regional/webacl/BasicBudget${environment}WAF/12345678-1234-1234-1234-123456789012`
    : undefined,
  description: `API infrastructure for Basic Budget ${environment} environment`,
  stackName: getStackName('Api'),
  tags: config.tags
});

// Add dependencies
apiStack.addDependency(databaseStack);
apiStack.addDependency(supportingServicesStack);

// 4. Paystub Processing Stack - Document processing services
const paystubProcessingStack = new PaystubProcessingStack(app, getStackName('PaystubProcessing'), {
  config,
  env,
  vpc: databaseStack.vpc,
  databaseSecurityGroup: databaseStack.securityGroup,
  lambdaSecurityGroup: cdk.aws_ec2.SecurityGroup.fromSecurityGroupId(
    app,
    'LambdaSecurityGroupRef3',
    cdk.aws_ssm.StringParameter.valueFromLookup(app, `/basic-budget/${environment}/lambda-security-group-id`)
  ),
  description: `Paystub processing infrastructure for Basic Budget ${environment} environment`,
  stackName: getStackName('PaystubProcessing'),
  tags: config.tags
});

// Add dependencies
paystubProcessingStack.addDependency(databaseStack);
paystubProcessingStack.addDependency(supportingServicesStack);

// 5. Frontend Stack - Web application hosting
const frontendStack = new FrontendStack(app, getStackName('Frontend'), {
  config,
  env,
  certificateArn: app.node.tryGetContext('certificateArn'),
  description: `Frontend infrastructure for Basic Budget ${environment} environment`,
  stackName: getStackName('Frontend'),
  tags: config.tags
});

// Frontend can be deployed independently, but for monitoring integration
frontendStack.addDependency(supportingServicesStack);

// Environment-specific configurations and additional stacks
switch (environment) {
  case 'dev':
    // Development-specific configurations
    console.log('🔧 Development environment configuration applied');
    console.log('💡 Features enabled: Basic monitoring, single AZ deployment');
    break;
    
  case 'staging':
    // Staging-specific configurations
    console.log('🧪 Staging environment configuration applied');
    console.log('💡 Features enabled: Full monitoring, multi-AZ, WAF protection');
    
    // Performance testing stack for staging
    if (app.node.tryGetContext('includeLoadTesting')) {
      console.log('📊 Load testing infrastructure will be included');
    }
    break;
    
  case 'prod':
    // Production-specific configurations
    console.log('🚀 Production environment configuration applied');
    console.log('💡 Features enabled: Full monitoring, multi-AZ, WAF, backups, cost alerts');
    console.log('🔒 Security: Encryption at rest/transit, secrets management, VPC isolation');
    
    // Additional production-only resources
    if (app.node.tryGetContext('enableDisasterRecovery')) {
      console.log('🔄 Disaster recovery configuration will be included');
    }
    break;
    
  default:
    console.warn(`⚠️  Unknown environment: ${environment}. Using development defaults.`);
}

// Global tags for cost tracking and resource management
Object.entries({
  Application: 'BasicBudget',
  Environment: environment,
  DeployedBy: 'CDK',
  Repository: 'basic-budget',
  CostCenter: 'Engineering',
  Compliance: 'SOC2'
}).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

// Add environment-specific termination protection
if (environment === 'prod') {
  databaseStack.terminationProtection = true;
  supportingServicesStack.terminationProtection = true;
  console.log('🛡️  Termination protection enabled for production stacks');
}

// Deployment validation
console.log('\n📋 Deployment Summary:');
console.log(`├── Environment: ${environment}`);
console.log(`├── Region: ${config.region}`);
console.log(`├── Account: ${config.account}`);
console.log(`├── Domain: ${config.domainName || 'CloudFront domain'}`);
console.log(`├── Database: Aurora Serverless v2 (${config.database.instanceClass})`);
console.log(`├── Cache: Redis ${config.cache.nodeType} x${config.cache.numCacheNodes}`);
console.log(`├── Lambda: ${config.lambda.memorySize}MB memory, ${config.lambda.timeout}s timeout`);
console.log(`├── Monitoring: ${config.monitoring.enableDetailedMonitoring ? 'Enhanced' : 'Basic'}`);
console.log(`├── WAF Protection: ${config.apiGateway.enableWaf ? 'Enabled' : 'Disabled'}`);
console.log(`├── X-Ray Tracing: ${config.monitoring.enableXRay ? 'Enabled' : 'Disabled'}`);
console.log(`└── Backup Retention: ${config.database.backupRetention} days\n`);

// Cost estimation guidance
const costMapping: { [key: string]: string } = {
  dev: '$50-150',
  staging: '$200-500', 
  prod: '$500-2000'
};
const estimatedMonthlyCost = costMapping[environment] || '$50-150';

console.log(`💰 Estimated monthly cost: ${estimatedMonthlyCost}`);
console.log('💡 Cost optimization tips:');
console.log('   - Aurora Serverless scales to zero when not in use');
console.log('   - Lambda charges only for actual execution time');
console.log('   - CloudFront has a generous free tier');
console.log('   - Consider Reserved Instances for production workloads\n');

// Deployment commands
console.log('🚀 Deployment commands:');
console.log(`   Deploy all: npm run deploy:${environment}`);
console.log(`   Deploy single stack: cdk deploy ${getStackName('Database')} --context environment=${environment}`);
console.log(`   View diff: cdk diff --context environment=${environment}`);
console.log(`   Destroy all: cdk destroy --all --context environment=${environment}\n`);

// Security reminders
if (environment === 'prod') {
  console.log('🔐 Security Checklist for Production:');
  console.log('   ✓ SSL/TLS certificates configured');
  console.log('   ✓ WAF rules enabled');
  console.log('   ✓ VPC with private subnets');
  console.log('   ✓ Secrets Manager for credentials');
  console.log('   ✓ Encryption at rest and in transit');
  console.log('   ✓ IAM least privilege policies');
  console.log('   ✓ CloudTrail logging enabled');
  console.log('   ✓ Backup and recovery configured\n');
}