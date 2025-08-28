# Basic Budget Infrastructure Deployment Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed: `npm install -g aws-cdk`
- Docker installed (for Go Lambda containers)

### 2. Initial Setup

```bash
# Clone and navigate to infrastructure
cd /Users/jamesvolpe/web/basic-budget/infrastructure

# Install dependencies
npm install

# Configure your AWS account ID and domains
# Edit lib/config/environment.ts and update:
# - Account IDs for dev/staging/prod
# - Domain names (optional)
# - Certificate ARNs (optional)

# Bootstrap CDK (first time only)
npm run bootstrap -- --context environment=dev
```

### 3. Deploy to Development

```bash
# Option 1: Use npm script (recommended)
npm run deploy:dev

# Option 2: Use deployment script
./scripts/deploy.sh dev deploy all

# Option 3: Use CDK directly
cdk deploy --all --context environment=dev
```

## Environment Configurations

| Environment | Cost/Month | Features | Resources |
|-------------|------------|----------|-----------|
| **Dev** | $50-150 | Single AZ, basic monitoring | t4g.medium DB, t3.micro cache |
| **Staging** | $200-500 | Multi-AZ, full monitoring, WAF | t4g.large DB, t3.small cache |
| **Prod** | $500-2000 | HA, disaster recovery, enhanced monitoring | r6g.large DB, r6g.large cache |

## Stack Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │      API        │    │   Paystub       │
│                 │    │                 │    │  Processing     │
│ • S3 Hosting    │    │ • Lambda (Hono) │    │ • Go Lambda     │
│ • CloudFront    │    │ • API Gateway   │    │ • S3 Storage    │
│ • Route53       │    │ • JWT Auth      │    │ • SQS Queues    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Supporting    │    │    Security     │
│                 │    │   Services      │    │                 │
│ • RDS Aurora    │    │ • Redis Cache   │    │ • WAF           │
│ • VPC           │    │ • Monitoring    │    │ • Secrets Mgr   │
│ • RDS Proxy     │    │ • Backup Vault  │    │ • IAM Roles     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Deployment Order

Stacks are deployed in dependency order:

1. **DatabaseStack** - VPC, RDS, Security Groups
2. **SupportingServicesStack** - Redis, Monitoring, Backups  
3. **ApiStack** - Lambda, API Gateway, Authorizers
4. **PaystubProcessingStack** - Go Lambda, SQS, S3
5. **FrontendStack** - S3, CloudFront, DNS

## Key Outputs

After deployment, access these resources:

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

The GitHub Actions workflow (`.github/workflows/deploy.yml`) provides:

- **Automated deployment** on push to main/develop
- **Security scanning** with Checkov
- **Multi-environment** support (dev/staging/prod)
- **Health checks** post-deployment
- **Rollback** capability on failures

### Required GitHub Secrets:
```
AWS_ACCESS_KEY_ID       # AWS access key
AWS_SECRET_ACCESS_KEY   # AWS secret key
AWS_ACCOUNT_ID         # AWS account ID  
ALARM_EMAIL            # Email for alerts
```

## Management Commands

### Deployment
```bash
# Deploy all stacks
./scripts/deploy.sh dev deploy all

# Deploy single stack
./scripts/deploy.sh dev deploy api

# Show differences
./scripts/deploy.sh dev diff all

# Destroy environment  
./scripts/deploy.sh dev destroy all
```

### Monitoring
```bash
# View logs
aws logs tail /aws/lambda/basic-budget-dev-api --follow

# Check API health
curl https://{api-id}.execute-api.us-east-1.amazonaws.com/dev/health

# View dashboard
# Check CloudWatch console for "BasicBudget-dev" dashboard
```

### Rollback
```bash
# Rollback to previous version
./scripts/rollback.sh dev all previous

# Rollback to specific commit
./scripts/rollback.sh dev api abc123def
```

## Security Features

- **Encryption**: All data encrypted at rest and in transit
- **VPC Isolation**: Database and Lambda in private subnets
- **WAF Protection**: Rate limiting and attack prevention
- **Secrets Management**: AWS Secrets Manager for credentials
- **IAM Least Privilege**: Granular permissions
- **CloudTrail**: Audit logging enabled

## Cost Optimization

- **Aurora Serverless**: Auto-scaling and pause capability
- **Lambda**: Pay-per-execution with reserved concurrency
- **CloudFront**: Caching reduces origin requests
- **S3 Lifecycle**: Auto-delete temporary files
- **Cost Alarms**: Budget monitoring in production

## Monitoring & Alerting

- **CloudWatch Dashboards**: Custom metrics and KPIs
- **X-Ray Tracing**: End-to-end request tracing
- **Custom Alarms**: Error rates, latency, utilization
- **Health Checks**: Automated service verification
- **SNS Notifications**: Email alerts for critical issues

## Disaster Recovery

- **Automated Backups**: RDS and application data
- **Cross-AZ Deployment**: High availability
- **Blue-Green Deployments**: Zero-downtime updates
- **Rollback Scripts**: Quick recovery from failures

## Troubleshooting

### Common Issues

1. **"Bootstrap required"**
   ```bash
   cdk bootstrap --context environment=dev
   ```

2. **"SSM Parameter not found"**
   ```bash
   # Deploy database stack first
   ./scripts/deploy.sh dev deploy database
   ```

3. **"Permission denied on scripts"**
   ```bash
   chmod +x scripts/*.sh
   ```

4. **Lambda deployment fails**
   ```bash
   # Ensure Docker is running for Go Lambda
   docker ps
   ```

### Debug Commands

```bash
# Show CDK differences
cdk diff --context environment=dev

# Synthesize templates
cdk synth --context environment=dev

# View stack events
aws cloudformation describe-stack-events \
  --stack-name BasicBudgetDevDatabase

# Check Lambda logs
aws logs tail /aws/lambda/basic-budget-dev-api --follow
```

## Production Checklist

Before deploying to production:

- [ ] Update account IDs in `lib/config/environment.ts`
- [ ] Configure domain names and certificates
- [ ] Set up monitoring email alerts
- [ ] Review security settings
- [ ] Test in staging environment
- [ ] Configure backup and retention policies
- [ ] Set up cost monitoring alerts
- [ ] Review IAM permissions
- [ ] Enable CloudTrail logging
- [ ] Configure disaster recovery procedures

## Support

For issues:
1. Check this deployment guide
2. Review CloudWatch logs and alarms
3. Examine CloudFormation events
4. Contact the platform team

---

🚀 **Ready to deploy? Start with development environment:**
```bash
npm run deploy:dev
```