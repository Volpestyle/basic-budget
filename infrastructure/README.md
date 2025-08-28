# Basic Budget Infrastructure

This directory contains the AWS CDK infrastructure code for the Basic Budget application, implementing a production-ready, cost-optimized, and secure cloud architecture.

## Architecture Overview

The infrastructure consists of 5 main stacks deployed across multiple environments:

### 🗄️ Database Stack
- **VPC** with public/private/database subnets across multiple AZs
- **RDS Aurora Serverless v2** (PostgreSQL) with auto-scaling
- **RDS Proxy** for connection pooling
- **VPC Flow Logs** for security monitoring
- **Secrets Manager** for database credentials

### 🚀 API Stack  
- **Lambda Functions** (Node.js) for Hono API backend
- **API Gateway HTTP API v2** with JWT authorization
- **Lambda Authorizer** for authentication
- **Dead Letter Queues** for error handling
- **X-Ray Tracing** for observability

### 🌐 Frontend Stack
- **S3 Bucket** for React app hosting
- **CloudFront Distribution** with caching and security headers
- **Origin Access Identity** for secure S3 access
- **Route 53** DNS records (optional)
- **Real User Monitoring** (production only)

### 📄 Paystub Processing Stack
- **Lambda Function** (Go) in container for document processing
- **S3 Bucket** for temporary file storage with lifecycle policies
- **SQS Queues** for async processing with DLQ
- **EventBridge** for scheduled batch processing
- **High memory allocation** (3GB+) for complex processing

### 🛠️ Supporting Services Stack
- **ElastiCache Redis** cluster for caching
- **CloudWatch** dashboards and alarms
- **SNS Topics** for notifications
- **AWS Backup** vault for disaster recovery
- **Cost monitoring** and budgets

## Environment Configurations

### Development (`dev`)
- **Cost**: $50-150/month
- **Features**: Single AZ, minimal resources, basic monitoring
- **Database**: t4g.medium, 0.5-1 ACU
- **Cache**: t3.micro, 1 node
- **Lambda**: 512MB memory

### Staging (`staging`)  
- **Cost**: $200-500/month
- **Features**: Multi-AZ, production-like, full monitoring, WAF
- **Database**: t4g.large, 0.5-4 ACU
- **Cache**: t3.small, 2 nodes with Multi-AZ
- **Lambda**: 1024MB memory

### Production (`prod`)
- **Cost**: $500-2000/month
- **Features**: High availability, disaster recovery, enhanced monitoring
- **Database**: r6g.large, 1-16 ACU, Performance Insights
- **Cache**: r6g.large, 3 nodes with Multi-AZ
- **Lambda**: 2048MB memory, reserved concurrency

## Prerequisites

1. **Node.js 18+** and npm
2. **AWS CLI** configured with appropriate credentials
3. **AWS CDK** installed globally: `npm install -g aws-cdk`
4. **Proper IAM permissions** for CDK deployment

## Quick Start

### 1. Install Dependencies
```bash
cd infrastructure
npm install
```

### 2. Configure Environment
Update account IDs and domain names in `lib/config/environment.ts`:

```typescript
export const getEnvironmentConfig = (environment: string): EnvironmentConfig => {
  // Update these values for your AWS accounts
  const accounts = {
    dev: '123456789012',
    staging: '123456789012', 
    prod: '987654321098'
  };
  // ... rest of config
};
```

### 3. Bootstrap CDK (First Time Only)
```bash
# Development
npm run bootstrap -- --context environment=dev

# Staging  
npm run bootstrap -- --context environment=staging

# Production
npm run bootstrap -- --context environment=prod
```

### 4. Deploy Infrastructure

#### Using NPM Scripts (Recommended)
```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging  

# Deploy to production
npm run deploy:prod
```

#### Using Deploy Script
```bash
# Deploy all stacks to development
./scripts/deploy.sh dev deploy all

# Deploy only API stack to staging
./scripts/deploy.sh staging deploy api

# Show differences for production
./scripts/deploy.sh prod diff all
```

#### Using CDK Directly
```bash
# Deploy all stacks
cdk deploy --all --context environment=dev

# Deploy specific stack
cdk deploy BasicBudgetDevDatabase --context environment=dev
```

## Stack Dependencies

Stacks must be deployed in the correct order due to dependencies:

```
1. DatabaseStack (VPC, RDS, Security Groups)
2. SupportingServicesStack (Redis, Monitoring) 
3. ApiStack (Lambda, API Gateway)
4. PaystubProcessingStack (Go Lambda, SQS)
5. FrontendStack (S3, CloudFront)
```

The deployment scripts handle these dependencies automatically.

## Key Features

### 🔒 Security
- **Encryption**: At rest and in transit for all data
- **VPC Isolation**: Private subnets for databases and Lambda
- **WAF Protection**: Rate limiting and common attack prevention
- **Secrets Management**: AWS Secrets Manager for all credentials
- **IAM Least Privilege**: Granular permissions for all roles

### 💰 Cost Optimization
- **Aurora Serverless**: Auto-scaling and pause capability
- **Lambda Provisioned Concurrency**: Only for production
- **S3 Lifecycle Policies**: Auto-delete temp files
- **CloudFront Caching**: Reduce origin requests
- **Cost Monitoring**: Alarms for budget thresholds

### 📊 Monitoring & Observability
- **CloudWatch Dashboards**: Custom metrics and KPIs
- **X-Ray Tracing**: End-to-end request tracing
- **Custom Alarms**: Error rates, latency, resource utilization
- **Log Aggregation**: Centralized logging with retention policies
- **Health Checks**: Automated service verification

### 🔄 Disaster Recovery
- **Automated Backups**: RDS and application data
- **Cross-AZ Deployment**: High availability
- **Blue-Green Deployments**: Zero-downtime updates
- **Rollback Capability**: Quick recovery from failures

## Deployment Outputs

After successful deployment, key outputs are available:

```bash
# API Endpoint
aws ssm get-parameter --name "/basic-budget/dev/api-endpoint"

# Website URL  
aws ssm get-parameter --name "/basic-budget/dev/website-url"

# Database Endpoint
aws ssm get-parameter --name "/basic-budget/dev/database-endpoint"

# Redis Endpoint
aws ssm get-parameter --name "/basic-budget/dev/redis-endpoint"
```

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/deploy.yml` provides:

- **Automated Deployment**: On push to main/develop branches
- **Security Scanning**: Checkov for infrastructure security
- **Multi-Environment**: dev/staging/prod deployment
- **Health Checks**: Post-deployment verification
- **Rollback Capability**: Automatic rollback on failure

### Required GitHub Secrets

```
AWS_ACCESS_KEY_ID       # AWS access key
AWS_SECRET_ACCESS_KEY   # AWS secret key  
AWS_ACCOUNT_ID         # AWS account ID
ALARM_EMAIL            # Email for CloudWatch alarms
```

## Management Scripts

### Deploy Script
```bash
./scripts/deploy.sh [environment] [action] [stack]

# Examples
./scripts/deploy.sh dev deploy all
./scripts/deploy.sh prod diff database  
./scripts/deploy.sh staging destroy frontend
```

### Rollback Script
```bash
./scripts/rollback.sh [environment] [stack] [version]

# Examples  
./scripts/rollback.sh staging all previous
./scripts/rollback.sh prod api abc123def
```

## Troubleshooting

### Common Issues

1. **Bootstrap Required**
   ```bash
   # If you see bootstrap errors:
   cdk bootstrap --context environment=dev
   ```

2. **SSM Parameter Not Found**
   ```bash
   # Deploy database stack first:
   ./scripts/deploy.sh dev deploy database
   ```

3. **Lambda Function Too Large**
   ```bash
   # For Go Lambda, ensure Docker is running
   docker ps
   ```

4. **Permission Denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   ```

### Debugging Commands

```bash
# Show CDK diff
cdk diff --context environment=dev

# Synthesize templates  
cdk synth --context environment=dev

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name BasicBudgetDevDatabase

# Check Lambda logs
aws logs tail /aws/lambda/basic-budget-dev-api --follow
```

## Cost Management

### Estimated Costs by Environment

| Component | Dev | Staging | Prod |
|-----------|-----|---------|------|
| Aurora Serverless | $10-30 | $50-150 | $200-800 |
| Lambda | $5-15 | $20-80 | $100-500 |
| ElastiCache | $15-25 | $50-100 | $150-400 |
| CloudFront | $1-5 | $10-30 | $50-200 |
| Other Services | $10-20 | $30-60 | $100-200 |
| **Total** | **$50-150** | **$200-500** | **$500-2000** |

### Cost Optimization Tips

1. **Aurora Serverless**: Automatically pauses when idle (dev/staging)
2. **Lambda Provisioned Concurrency**: Only enabled for production
3. **CloudFront**: Free tier covers most dev/staging usage
4. **S3**: Lifecycle policies auto-delete temporary files
5. **Reserved Instances**: Consider for production workloads

## Security Considerations

### Data Protection
- All data encrypted at rest and in transit
- Secrets stored in AWS Secrets Manager
- Database in private subnets only
- WAF protection for public endpoints

### Access Control
- IAM roles with least privilege
- VPC security groups restrict network access
- API authentication via JWT tokens
- CloudTrail logging for audit trails

### Compliance Features
- VPC Flow Logs for network monitoring
- CloudWatch alarms for security events
- Backup and retention policies
- Resource tagging for governance

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review CloudWatch logs and alarms  
3. Examine CloudFormation stack events
4. Contact the platform team

## Contributing

1. Make changes in feature branches
2. Test in development environment first
3. Update documentation for any config changes
4. Follow the deployment process for staging/prod