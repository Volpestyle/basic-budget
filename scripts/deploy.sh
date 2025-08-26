#!/bin/bash

# Basic Budget Deployment Script
# Usage: ./scripts/deploy.sh [environment] [stack]
# Environment: dev, staging, prod (default: dev)
# Stack: all, infrastructure, frontend, api, paystub (default: all)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-dev}
STACK=${2:-all}
AWS_REGION=${AWS_REGION:-us-east-1}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
fi

# Validate stack
if [[ ! "$STACK" =~ ^(all|infrastructure|frontend|api|paystub)$ ]]; then
    error "Invalid stack: $STACK. Must be all, infrastructure, frontend, api, or paystub."
fi

log "Starting deployment for environment: $ENVIRONMENT, stack: $STACK"
log "AWS Region: $AWS_REGION"
log "Root directory: $ROOT_DIR"

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
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20 or later."
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        warn "CDK CLI not found globally. Will use local version."
    fi
    
    # Check Go (for paystub service)
    if [[ "$STACK" == "all" || "$STACK" == "paystub" ]] && ! command -v go &> /dev/null; then
        error "Go is not installed. Required for paystub service deployment."
    fi
    
    # Check Bun (for API service)
    if [[ "$STACK" == "all" || "$STACK" == "api" ]] && ! command -v bun &> /dev/null; then
        warn "Bun is not installed. Using npm for API deployment."
    fi
    
    log "Prerequisites check completed"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure for $ENVIRONMENT..."
    
    cd "$ROOT_DIR/infrastructure"
    
    # Install dependencies
    log "Installing CDK dependencies..."
    npm ci
    
    # Build TypeScript
    log "Building CDK application..."
    npm run build
    
    # Bootstrap CDK (if needed)
    log "Bootstrapping CDK..."
    npx cdk bootstrap --context environment=$ENVIRONMENT
    
    # Deploy all infrastructure stacks
    log "Deploying CDK stacks..."
    npx cdk deploy --all \
        --context environment=$ENVIRONMENT \
        --require-approval never \
        --outputs-file outputs.json
    
    # Save outputs for other deployments
    if [[ -f outputs.json ]]; then
        cp outputs.json "$ROOT_DIR/.deployment-outputs-$ENVIRONMENT.json"
        log "Infrastructure deployment outputs saved"
    fi
    
    log "Infrastructure deployment completed"
}

# Deploy frontend
deploy_frontend() {
    log "Deploying frontend for $ENVIRONMENT..."
    
    cd "$ROOT_DIR/packages/web"
    
    # Check if package.json exists
    if [[ ! -f package.json ]]; then
        error "Frontend package.json not found. Please create the React application first."
    fi
    
    # Install dependencies
    log "Installing frontend dependencies..."
    npm ci
    
    # Get API URL from infrastructure outputs
    API_URL=""
    if [[ -f "$ROOT_DIR/.deployment-outputs-$ENVIRONMENT.json" ]]; then
        API_URL=$(jq -r ".\"BasicBudgetInfrastructure-$ENVIRONMENT\".ApiEndpoint // empty" "$ROOT_DIR/.deployment-outputs-$ENVIRONMENT.json")
    fi
    
    # Build application
    log "Building frontend application..."
    REACT_APP_API_URL=${API_URL:-"https://api.basic-budget.local"} \
    REACT_APP_ENVIRONMENT=$ENVIRONMENT \
    REACT_APP_VERSION=$(git rev-parse HEAD 2>/dev/null || echo "unknown") \
    NODE_ENV=production \
    npm run build
    
    # Get S3 bucket and CloudFront distribution from CloudFormation
    BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "basic-budget-frontend-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
        --output text)
    
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "basic-budget-frontend-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
        --output text)
    
    # Deploy to S3
    log "Uploading to S3 bucket: $BUCKET_NAME"
    aws s3 sync ./build/ s3://$BUCKET_NAME/ --delete \
        --cache-control "public,max-age=31536000" \
        --exclude "*.html"
    
    # Upload HTML files with no-cache policy
    aws s3 sync ./build/ s3://$BUCKET_NAME/ \
        --cache-control "public,max-age=0,must-revalidate" \
        --include "*.html"
    
    # Create CloudFront invalidation
    log "Creating CloudFront invalidation..."
    aws cloudfront create-invalidation \
        --distribution-id $DISTRIBUTION_ID \
        --paths "/*"
    
    log "Frontend deployment completed"
}

# Deploy API
deploy_api() {
    log "Deploying API for $ENVIRONMENT..."
    
    cd "$ROOT_DIR/packages/api"
    
    # Check if package.json exists
    if [[ ! -f package.json ]]; then
        error "API package.json not found. Please create the API service first."
    fi
    
    # Install dependencies and build
    if command -v bun &> /dev/null; then
        log "Building API with Bun..."
        bun install --frozen-lockfile
        bun run build
    else
        log "Building API with npm..."
        npm ci
        npm run build
    fi
    
    # Create deployment package
    log "Creating deployment package..."
    rm -rf deployment-package
    mkdir -p deployment-package
    
    # Copy built files and dependencies
    cp -r dist/* deployment-package/ 2>/dev/null || echo "No dist files to copy"
    cp package.json deployment-package/
    
    cd deployment-package
    npm install --production --no-package-lock
    
    # Create ZIP file
    zip -r ../api-deployment.zip . -x "*.git*" "*.DS_Store*"
    cd ..
    
    # Get Lambda function name
    FUNCTION_NAME=$(aws cloudformation describe-stacks \
        --stack-name "basic-budget-api-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionArn`].OutputValue' \
        --output text | cut -d':' -f7)
    
    # Update Lambda function
    log "Updating Lambda function: $FUNCTION_NAME"
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://api-deployment.zip
    
    # Wait for update to complete
    aws lambda wait function-updated-v2 --function-name $FUNCTION_NAME
    
    # Clean up
    rm -rf deployment-package api-deployment.zip
    
    log "API deployment completed"
}

# Deploy paystub service
deploy_paystub() {
    log "Deploying paystub service for $ENVIRONMENT..."
    
    cd "$ROOT_DIR/packages/paystub-extractor"
    
    # Check if Go module exists
    if [[ ! -f go.mod ]]; then
        error "Go module not found. Please create the paystub service first."
    fi
    
    # Build Go binary
    log "Building Go binary..."
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
        -ldflags="-w -s -X main.version=$(git rev-parse HEAD 2>/dev/null || echo unknown) -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -o bootstrap ./cmd/lambda
    
    # Create Dockerfile
    cat > Dockerfile << 'EOF'
FROM public.ecr.aws/lambda/provided:al2-x86_64

# Copy the binary
COPY bootstrap ${LAMBDA_RUNTIME_DIR}

# Set the CMD to your handler
CMD [ "bootstrap" ]
EOF
    
    # Get ECR repository URI
    REPO_URI=$(aws cloudformation describe-stacks \
        --stack-name "basic-budget-paystub-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryUri`].OutputValue' \
        --output text)
    
    # Login to ECR
    log "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $REPO_URI
    
    # Build and push Docker image
    IMAGE_TAG="$(git rev-parse HEAD 2>/dev/null || echo unknown)-$ENVIRONMENT"
    
    log "Building Docker image..."
    docker build -t paystub-extractor:latest .
    docker tag paystub-extractor:latest $REPO_URI:$IMAGE_TAG
    docker tag paystub-extractor:latest $REPO_URI:latest
    
    log "Pushing image to ECR..."
    docker push $REPO_URI:$IMAGE_TAG
    docker push $REPO_URI:latest
    
    # Get Lambda function name
    FUNCTION_NAME=$(aws cloudformation describe-stacks \
        --stack-name "basic-budget-paystub-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`PaystubLambdaArn`].OutputValue' \
        --output text | cut -d':' -f7)
    
    # Update Lambda function
    log "Updating Lambda function: $FUNCTION_NAME"
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --image-uri $REPO_URI:$IMAGE_TAG
    
    # Wait for update to complete
    aws lambda wait function-updated-v2 --function-name $FUNCTION_NAME
    
    # Clean up
    rm -f bootstrap Dockerfile
    
    log "Paystub service deployment completed"
}

# Get deployment status
get_deployment_status() {
    log "Getting deployment status for $ENVIRONMENT..."
    
    # Check if infrastructure exists
    if aws cloudformation describe-stacks --stack-name "basic-budget-infrastructure-$ENVIRONMENT" &>/dev/null; then
        info "✅ Infrastructure stack exists"
        
        # Get stack outputs
        if [[ -f "$ROOT_DIR/.deployment-outputs-$ENVIRONMENT.json" ]]; then
            APP_URL=$(jq -r ".\"BasicBudgetInfrastructure-$ENVIRONMENT\".ApplicationUrl // \"Not available\"" "$ROOT_DIR/.deployment-outputs-$ENVIRONMENT.json")
            API_URL=$(jq -r ".\"BasicBudgetInfrastructure-$ENVIRONMENT\".ApiEndpoint // \"Not available\"" "$ROOT_DIR/.deployment-outputs-$ENVIRONMENT.json")
            
            info "📱 Application URL: $APP_URL"
            info "🚀 API URL: $API_URL"
        fi
    else
        warn "❌ Infrastructure stack does not exist"
    fi
}

# Main deployment logic
main() {
    check_prerequisites
    
    case $STACK in
        "all")
            deploy_infrastructure
            deploy_frontend
            deploy_api
            deploy_paystub
            ;;
        "infrastructure")
            deploy_infrastructure
            ;;
        "frontend")
            deploy_frontend
            ;;
        "api")
            deploy_api
            ;;
        "paystub")
            deploy_paystub
            ;;
    esac
    
    get_deployment_status
    log "🎉 Deployment completed successfully!"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT

# Run main function
main