#!/bin/bash

# GitHub OIDC Setup Script for AWS
# This script creates the necessary IAM roles for GitHub Actions to deploy to AWS
# Usage: ./scripts/setup-github-oidc.sh [github-repo] [environments...]
# Example: ./scripts/setup-github-oidc.sh "username/basic-budget" "dev" "staging" "prod"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Default values
GITHUB_REPO=${1:-""}
ENVIRONMENTS=("${@:2}")
AWS_REGION=${AWS_REGION:-us-east-1}

# Validate inputs
if [[ -z "$GITHUB_REPO" ]]; then
    error "GitHub repository not specified. Usage: $0 <github-repo> [environments...]"
fi

if [[ ${#ENVIRONMENTS[@]} -eq 0 ]]; then
    ENVIRONMENTS=("dev" "staging" "prod")
    warn "No environments specified. Using default: ${ENVIRONMENTS[*]}"
fi

log "Setting up GitHub OIDC for repository: $GITHUB_REPO"
log "Environments: ${ENVIRONMENTS[*]}"
log "AWS Region: $AWS_REGION"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid."
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        error "jq is not installed. Please install it first."
    fi
    
    log "Prerequisites check completed"
}

# Create OIDC Identity Provider
create_oidc_provider() {
    log "Creating GitHub OIDC Identity Provider..."
    
    local oidc_url="https://token.actions.githubusercontent.com"
    local thumbprint="6938fd4d98bab03faadb97b34396831e3780aea1"
    
    # Check if OIDC provider already exists
    if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com" &>/dev/null; then
        log "GitHub OIDC provider already exists"
    else
        log "Creating GitHub OIDC provider..."
        aws iam create-open-id-connect-provider \
            --url "$oidc_url" \
            --client-id-list "sts.amazonaws.com" \
            --thumbprint-list "$thumbprint" \
            --tags Key=Project,Value=basic-budget Key=Purpose,Value=github-actions
        
        log "GitHub OIDC provider created"
    fi
}

# Create IAM role for infrastructure deployment
create_infrastructure_role() {
    local environment=$1
    local role_name="basic-budget-infrastructure-deploy-$environment"
    
    log "Creating infrastructure deployment role: $role_name"
    
    # Trust policy for GitHub Actions
    local trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:$GITHUB_REPO:*"
        }
      }
    }
  ]
}
EOF
)
    
    # Create role
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "$trust_policy" \
        --description "GitHub Actions role for Basic Budget infrastructure deployment ($environment)" \
        --tags Key=Project,Value=basic-budget Key=Environment,Value=$environment Key=Purpose,Value=github-actions \
        --max-session-duration 3600 || true
    
    # Attach necessary policies for CDK deployment
    local policies=(
        "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess"
        "arn:aws:iam::aws:policy/IAMFullAccess"
        "arn:aws:iam::aws:policy/AmazonS3FullAccess"
        "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
        "arn:aws:iam::aws:policy/AmazonVPCFullAccess"
        "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
        "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
        "arn:aws:iam::aws:policy/AmazonAPIGatewayFullAccess"
        "arn:aws:iam::aws:policy/CloudFrontFullAccess"
        "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
        "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
        "arn:aws:iam::aws:policy/AmazonSSMFullAccess"
        "arn:aws:iam::aws:policy/CloudWatchFullAccess"
        "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
    )
    
    for policy in "${policies[@]}"; do
        aws iam attach-role-policy \
            --role-name "$role_name" \
            --policy-arn "$policy" || true
    done
    
    # Create inline policy for additional permissions
    local inline_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "ssm:GetParameter",
        "ssm:PutParameter",
        "ssm:GetParameters",
        "ssm:DeleteParameter",
        "logs:*",
        "cloudwatch:*",
        "events:*",
        "sns:*",
        "textract:*",
        "comprehend:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)
    
    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "AdditionalPermissions" \
        --policy-document "$inline_policy"
    
    log "Infrastructure deployment role created: $role_name"
}

# Create IAM role for frontend deployment
create_frontend_role() {
    local environment=$1
    local role_name="basic-budget-frontend-deploy-$environment"
    
    log "Creating frontend deployment role: $role_name"
    
    # Trust policy for GitHub Actions
    local trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:$GITHUB_REPO:*"
        }
      }
    }
  ]
}
EOF
)
    
    # Create role
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "$trust_policy" \
        --description "GitHub Actions role for Basic Budget frontend deployment ($environment)" \
        --tags Key=Project,Value=basic-budget Key=Environment,Value=$environment Key=Purpose,Value=github-actions \
        --max-session-duration 3600 || true
    
    # Create inline policy for S3 and CloudFront access
    local inline_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:ListStackResources"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/basic-budget-frontend-$environment/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::basic-budget-frontend-$environment-*",
        "arn:aws:s3:::basic-budget-frontend-$environment-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)
    
    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "FrontendDeploymentPolicy" \
        --policy-document "$inline_policy"
    
    log "Frontend deployment role created: $role_name"
}

# Create IAM role for API deployment
create_api_role() {
    local environment=$1
    local role_name="basic-budget-api-deploy-$environment"
    
    log "Creating API deployment role: $role_name"
    
    # Trust policy for GitHub Actions
    local trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:$GITHUB_REPO:*"
        }
      }
    }
  ]
}
EOF
)
    
    # Create role
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "$trust_policy" \
        --description "GitHub Actions role for Basic Budget API deployment ($environment)" \
        --tags Key=Project,Value=basic-budget Key=Environment,Value=$environment Key=Purpose,Value=github-actions \
        --max-session-duration 3600 || true
    
    # Create inline policy for Lambda access
    local inline_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:ListStackResources"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/basic-budget-api-$environment/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:PublishVersion",
        "lambda:UpdateAlias",
        "lambda:CreateAlias",
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:basic-budget-api-$environment"
    }
  ]
}
EOF
)
    
    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "ApiDeploymentPolicy" \
        --policy-document "$inline_policy"
    
    log "API deployment role created: $role_name"
}

# Create IAM role for paystub service deployment
create_paystub_role() {
    local environment=$1
    local role_name="basic-budget-paystub-deploy-$environment"
    
    log "Creating paystub service deployment role: $role_name"
    
    # Trust policy for GitHub Actions
    local trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:$GITHUB_REPO:*"
        }
      }
    }
  ]
}
EOF
)
    
    # Create role
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "$trust_policy" \
        --description "GitHub Actions role for Basic Budget paystub service deployment ($environment)" \
        --tags Key=Project,Value=basic-budget Key=Environment,Value=$environment Key=Purpose,Value=github-actions \
        --max-session-duration 3600 || true
    
    # Create inline policy for ECR and Lambda access
    local inline_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:ListStackResources"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/basic-budget-paystub-$environment/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetAuthorizationToken",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": [
        "arn:aws:ecr:*:*:repository/basic-budget-paystub-$environment",
        "*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:basic-budget-paystub-processor-$environment"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:basic-budget-paystub-processing-$environment"
    }
  ]
}
EOF
)
    
    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "PaystubDeploymentPolicy" \
        --policy-document "$inline_policy"
    
    log "Paystub service deployment role created: $role_name"
}

# Generate GitHub repository secrets configuration
generate_github_secrets() {
    log "Generating GitHub repository secrets configuration..."
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    
    cat > github-secrets.txt << EOF
# GitHub Repository Secrets for $GITHUB_REPO
# Add these secrets to your GitHub repository settings

AWS_REGION=$AWS_REGION

EOF
    
    for env in "${ENVIRONMENTS[@]}"; do
        cat >> github-secrets.txt << EOF
# $env environment
AWS_DEPLOYMENT_ROLE_ARN_$(echo $env | tr '[:lower:]' '[:upper:]')=arn:aws:iam::$account_id:role/basic-budget-infrastructure-deploy-$env
AWS_FRONTEND_DEPLOYMENT_ROLE_ARN_$(echo $env | tr '[:lower:]' '[:upper:]')=arn:aws:iam::$account_id:role/basic-budget-frontend-deploy-$env
AWS_API_DEPLOYMENT_ROLE_ARN_$(echo $env | tr '[:lower:]' '[:upper:]')=arn:aws:iam::$account_id:role/basic-budget-api-deploy-$env
AWS_PAYSTUB_DEPLOYMENT_ROLE_ARN_$(echo $env | tr '[:lower:]' '[:upper:]')=arn:aws:iam::$account_id:role/basic-budget-paystub-deploy-$env

EOF
    done
    
    cat >> github-secrets.txt << EOF
# Repository Variables (these can be set as environment variables instead of secrets)
# For each environment, set these as repository variables:

EOF
    
    for env in "${ENVIRONMENTS[@]}"; do
        cat >> github-secrets.txt << EOF
# Variables for $env environment
AWS_DEPLOYMENT_ROLE_ARN=arn:aws:iam::$account_id:role/basic-budget-infrastructure-deploy-$env
AWS_FRONTEND_DEPLOYMENT_ROLE_ARN=arn:aws:iam::$account_id:role/basic-budget-frontend-deploy-$env
AWS_API_DEPLOYMENT_ROLE_ARN=arn:aws:iam::$account_id:role/basic-budget-api-deploy-$env
AWS_PAYSTUB_DEPLOYMENT_ROLE_ARN=arn:aws:iam::$account_id:role/basic-budget-paystub-deploy-$env

EOF
    done
    
    log "GitHub secrets configuration saved to github-secrets.txt"
}

# Generate deployment summary
generate_summary() {
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    
    log "🎉 GitHub OIDC setup completed successfully!"
    echo ""
    info "📋 Summary:"
    info "  • GitHub Repository: $GITHUB_REPO"
    info "  • AWS Account: $account_id"
    info "  • AWS Region: $AWS_REGION"
    info "  • Environments: ${ENVIRONMENTS[*]}"
    echo ""
    info "📁 Created IAM Roles:"
    for env in "${ENVIRONMENTS[@]}"; do
        info "  • basic-budget-infrastructure-deploy-$env"
        info "  • basic-budget-frontend-deploy-$env"
        info "  • basic-budget-api-deploy-$env"
        info "  • basic-budget-paystub-deploy-$env"
    done
    echo ""
    warn "📝 Next Steps:"
    warn "  1. Review github-secrets.txt for the secrets to add to your repository"
    warn "  2. Add the secrets to your GitHub repository settings"
    warn "  3. Create environment protection rules in GitHub (recommended for staging/prod)"
    warn "  4. Test the deployment workflows"
    echo ""
    info "🔗 Useful Links:"
    info "  • GitHub Repository Settings: https://github.com/$GITHUB_REPO/settings"
    info "  • GitHub Secrets: https://github.com/$GITHUB_REPO/settings/secrets/actions"
    info "  • GitHub Environments: https://github.com/$GITHUB_REPO/settings/environments"
}

# Main setup logic
main() {
    check_prerequisites
    
    # Create OIDC Identity Provider
    create_oidc_provider
    
    # Create IAM roles for each environment
    for env in "${ENVIRONMENTS[@]}"; do
        log "Setting up roles for $env environment..."
        create_infrastructure_role "$env"
        create_frontend_role "$env"
        create_api_role "$env"
        create_paystub_role "$env"
    done
    
    # Generate GitHub configuration
    generate_github_secrets
    generate_summary
}

# Handle script interruption
trap 'error "Setup interrupted"' INT

# Run main function
main