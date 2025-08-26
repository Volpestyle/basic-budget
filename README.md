# Basic Budget - AWS Cloud Infrastructure

A complete, production-ready AWS infrastructure for a full-stack budget management application with automated CI/CD pipelines.

## Architecture Overview

This project implements a modern, scalable, and cost-optimized architecture on AWS using:

### 🏗️ Infrastructure Components

- **Frontend**: React SPA hosted on S3 + CloudFront with caching optimization
- **API**: Bun/Node.js Lambda functions with API Gateway v2 and JWT authentication
- **Database**: RDS Aurora Serverless v2 PostgreSQL with VPC and RDS Proxy
- **Paystub Processing**: Go microservice (containerized Lambda) with S3 and SQS
- **Security**: WAF, CloudTrail, GuardDuty, and comprehensive IAM policies
- **Monitoring**: CloudWatch dashboards, alarms, and centralized logging

### 🌍 Environments

- **dev**: Development environment with minimal resources
- **staging**: Production-like environment for testing
- **prod**: Production environment with high availability and monitoring

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 20+ installed
- Go 1.21+ installed (for paystub service)
- Docker installed (for containerized deployments)
- Bun runtime installed (optional, for API development)

### 1. Clone and Setup

```bash
git clone <your-repo-url> basic-budget
cd basic-budget

# Install infrastructure dependencies
cd infrastructure
npm install
```

### 2. Configure Environments

Edit `/infrastructure/config/environments.ts` to customize:

```typescript
// Update with your domain and certificate ARN (optional)
prod: {
  environment: 'prod',
  region: 'us-east-1',
  domainName: 'basic-budget.com',
  certificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID',
  // ... other settings
}
```

### 3. Setup GitHub OIDC (for CI/CD)

```bash
./scripts/setup-github-oidc.sh "your-username/basic-budget" "dev" "staging" "prod"
```

This creates IAM roles for GitHub Actions deployment and generates the required secrets.

### 4. Deploy Infrastructure

For manual deployment:

```bash
# Deploy all components to dev environment
./scripts/deploy.sh dev all

# Deploy specific components
./scripts/deploy.sh prod infrastructure
./scripts/deploy.sh prod frontend
```

For CI/CD deployment, push to the configured branches:
- `main` branch → Production deployment
- `develop` branch → Staging deployment
- Pull requests → Development validation

## 📁 Project Structure

```
basic-budget/
├── infrastructure/              # AWS CDK Infrastructure
│   ├── config/
│   │   └── environments.ts     # Environment configurations
│   ├── lib/
│   │   ├── stacks/            # CDK Stack definitions
│   │   └── constructs/        # Reusable constructs
│   └── bin/
│       └── infrastructure.ts   # CDK app entry point
├── packages/
│   ├── web/                   # React frontend (create this)
│   ├── api/                   # Bun/Node.js API (create this)
│   └── paystub-extractor/     # Go microservice (create this)
├── .github/workflows/         # CI/CD pipelines
├── scripts/                   # Deployment and utility scripts
└── README.md                  # This file
```

## 🛠️ Infrastructure Details

### Frontend Stack (S3 + CloudFront)

- **S3 Bucket**: Static website hosting with encryption
- **CloudFront**: Global CDN with caching optimization
- **Origin Access Control**: Secure S3 access
- **Custom Domain**: Optional custom domain support
- **Deployment**: Automated CI/CD with cache invalidation

Cost optimization:
- Lifecycle policies for old versions
- Optimized CloudFront caching
- Regional vs global price classes based on environment

### API Stack (Lambda + API Gateway)

- **Lambda Function**: Bun/Node.js runtime with VPC access
- **API Gateway v2**: HTTP API with JWT authorization
- **RDS Proxy**: Connection pooling for database access
- **Secrets Manager**: JWT secrets and database credentials
- **Auto-scaling**: Based on demand with reserved concurrency

Security features:
- VPC isolation
- IAM least-privilege access
- Encrypted environment variables
- CORS configuration

### Database Stack (Aurora Serverless v2)

- **Aurora PostgreSQL**: Serverless v2 with auto-scaling (0.5-16 ACU)
- **VPC**: 3-AZ setup with public/private/database subnets
- **RDS Proxy**: Connection pooling and failover
- **Encryption**: At rest and in transit
- **Backups**: Automated with configurable retention

Cost optimization:
- Serverless scaling to zero
- VPC endpoints to avoid NAT gateway costs
- Appropriate backup retention by environment

### Paystub Stack (Go Lambda + ML Services)

- **Container Lambda**: Go runtime using AWS Lambda base images
- **ECR**: Container image registry with vulnerability scanning
- **SQS**: Asynchronous document processing queue
- **S3**: Temporary file storage with lifecycle policies
- **AWS Textract**: Document text extraction
- **AWS Comprehend**: Text analysis and entity recognition

### Security & Monitoring

- **WAF**: Web Application Firewall with managed rule sets
- **CloudTrail**: Comprehensive audit logging
- **GuardDuty**: Threat detection (production only)
- **AWS Config**: Compliance monitoring (production only)
- **CloudWatch**: Dashboards, alarms, and log aggregation
- **KMS**: Customer-managed encryption keys

## 🔧 Deployment Scripts

### Deploy Script

```bash
# Deploy everything to dev
./scripts/deploy.sh dev all

# Deploy specific components
./scripts/deploy.sh prod infrastructure
./scripts/deploy.sh staging frontend
./scripts/deploy.sh dev api
./scripts/deploy.sh prod paystub

# Get deployment status
./scripts/deploy.sh prod
```

### Destroy Script

```bash
# CAREFUL: This destroys all resources
./scripts/destroy.sh dev

# Production requires explicit confirmation
./scripts/destroy.sh prod
```

### GitHub OIDC Setup

```bash
# Setup OIDC for all environments
./scripts/setup-github-oidc.sh "username/repo" "dev" "staging" "prod"

# Setup for specific environments
./scripts/setup-github-oidc.sh "username/repo" "prod"
```

## 🔄 CI/CD Workflows

### Infrastructure Pipeline (`deploy-infrastructure.yml`)
- Validates CDK code and runs security checks
- Deploys infrastructure changes on branch pushes
- Supports manual deployment with environment selection
- Exports deployment outputs for other workflows

### Frontend Pipeline (`deploy-frontend.yml`)
- Builds React application with environment-specific configuration
- Runs tests, linting, and type checking
- Deploys to S3 and invalidates CloudFront cache
- Includes smoke tests after deployment

### API Pipeline (`deploy-api.yml`)
- Builds Bun/Node.js application with production optimizations
- Runs comprehensive test suite and security audits
- Packages and deploys to Lambda with versioning
- Includes integration tests and health checks

### Paystub Pipeline (`deploy-paystub.yml`)
- Builds Go binary with optimizations
- Creates container image and pushes to ECR
- Includes vulnerability scanning
- Deploys to Lambda with SQS integration testing

### CI Pipeline (`ci.yml`)
- Runs on all pull requests
- Path-based change detection
- Parallel testing for all components
- Security scanning with Trivy
- Prevents merge on failures

## 💰 Cost Optimization

### Development Environment (~$15-25/month)
- Aurora Serverless v2: Min 0.5 ACU
- Single NAT Gateway
- Shorter log retention
- No GuardDuty or Config

### Staging Environment (~$30-50/month)
- Aurora Serverless v2: Min 0.5 ACU, Max 4 ACU
- Single NAT Gateway
- Moderate log retention
- Basic monitoring

### Production Environment (~$100-200/month)
- Aurora Serverless v2: Min 1 ACU, Max 16 ACU with read replica
- Multi-AZ NAT Gateways
- Extended log retention
- Full security and monitoring suite
- CloudFront global distribution

### Cost Optimization Features
- Serverless scaling to zero
- VPC endpoints for AWS services
- S3 lifecycle policies
- CloudFront regional pricing for non-prod
- Resource-based retention policies

## 🔒 Security Best Practices

### Network Security
- VPC with isolated database subnets
- Security groups with least-privilege access
- NACLs for additional network protection
- VPC endpoints to avoid internet routing

### Identity & Access Management
- Role-based access with minimal permissions
- Cross-account trust for GitHub Actions
- Service-linked roles where possible
- Regular credential rotation

### Data Protection
- Encryption at rest with customer-managed KMS keys
- Encryption in transit for all connections
- Secrets Manager for sensitive configuration
- Database connection through RDS Proxy

### Monitoring & Compliance
- Comprehensive CloudTrail logging
- Real-time threat detection with GuardDuty
- Compliance monitoring with AWS Config
- Automated alerting for security events

## 📊 Monitoring & Observability

### CloudWatch Dashboards
- Application performance metrics
- Infrastructure health monitoring
- Error rates and latency tracking
- Cost and usage analytics

### Alerting
- Lambda function errors and duration
- Database performance and connections
- CloudFront error rates
- Cost budget alerts

### Logging
- Centralized log aggregation
- Structured logging with JSON format
- Log retention policies by environment
- Log insights for troubleshooting

## 🛡️ Disaster Recovery

### Backup Strategy
- Automated RDS backups with point-in-time recovery
- S3 cross-region replication (production)
- CloudFormation drift detection
- Infrastructure as Code versioning

### High Availability
- Multi-AZ Aurora deployment (production)
- CloudFront global edge locations
- Lambda automatic failover
- RDS Proxy connection management

## 📋 Troubleshooting

### Common Issues

**CDK Deployment Failures**
```bash
# Check CDK context and clear if needed
npx cdk context --clear
npx cdk synth --context environment=dev
```

**Lambda Cold Starts**
```bash
# Increase memory allocation
# Enable provisioned concurrency for critical functions
# Use Lambda layers for common dependencies
```

**Database Connection Issues**
```bash
# Check VPC security groups
# Verify RDS Proxy configuration
# Monitor connection pool metrics
```

**Frontend Deployment Issues**
```bash
# Verify S3 bucket permissions
# Check CloudFront distribution status
# Validate build artifacts
```

### Useful Commands

```bash
# CDK commands
npx cdk diff --context environment=prod
npx cdk deploy --context environment=staging
npx cdk destroy --context environment=dev

# AWS CLI debugging
aws sts get-caller-identity
aws lambda get-function --function-name basic-budget-api-dev
aws rds describe-db-clusters --db-cluster-identifier basic-budget-dev

# Local testing
cd packages/api && bun dev
cd packages/web && npm start
```

## 🤝 Contributing

1. Create feature branches from `develop`
2. Make changes and test locally
3. Run linting and tests: `npm run lint && npm test`
4. Create pull request to `develop`
5. CI/CD will validate changes automatically
6. Merge to `develop` deploys to staging
7. Merge `develop` to `main` deploys to production

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🏷️ Resource Tags

All resources are automatically tagged with:
- `Project: basic-budget`
- `Environment: dev|staging|prod`
- `ManagedBy: CDK`
- Custom environment-specific tags

## 🔗 Useful Links

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Serverless Application Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html)