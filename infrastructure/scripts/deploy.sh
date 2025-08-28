#!/bin/bash

# Basic Budget Infrastructure Deployment Script
# Usage: ./scripts/deploy.sh [environment] [action] [stack]
# Examples:
#   ./scripts/deploy.sh dev deploy all
#   ./scripts/deploy.sh prod diff database
#   ./scripts/deploy.sh staging destroy all

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CDK_APP="$ROOT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-dev}"
ACTION="${2:-deploy}"
STACK="${3:-all}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "   Valid environments: dev, staging, prod"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(deploy|destroy|diff|synth|bootstrap)$ ]]; then
    echo -e "${RED}❌ Invalid action: $ACTION${NC}"
    echo -e "   Valid actions: deploy, destroy, diff, synth, bootstrap"
    exit 1
fi

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        log_error "AWS CDK is not installed. Run: npm install -g aws-cdk"
        exit 1
    fi
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

install_dependencies() {
    log_info "Installing NPM dependencies..."
    cd "$CDK_APP"
    npm ci
    log_success "Dependencies installed"
}

validate_configuration() {
    log_info "Validating configuration for environment: $ENVIRONMENT"
    
    # Check if configuration file exists
    CONFIG_FILE="$CDK_APP/lib/config/environment.ts"
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    log_success "Configuration validated"
}

get_stack_names() {
    local env_suffix=$(echo "$ENVIRONMENT" | sed 's/^./\U&/')
    case "$STACK" in
        "all")
            echo "BasicBudget${env_suffix}Database BasicBudget${env_suffix}SupportingServices BasicBudget${env_suffix}Api BasicBudget${env_suffix}PaystubProcessing BasicBudget${env_suffix}Frontend"
            ;;
        "database")
            echo "BasicBudget${env_suffix}Database"
            ;;
        "supporting")
            echo "BasicBudget${env_suffix}SupportingServices"
            ;;
        "api")
            echo "BasicBudget${env_suffix}Api"
            ;;
        "paystub")
            echo "BasicBudget${env_suffix}PaystubProcessing"
            ;;
        "frontend")
            echo "BasicBudget${env_suffix}Frontend"
            ;;
        *)
            echo "$STACK"
            ;;
    esac
}

bootstrap_environment() {
    log_info "Bootstrapping CDK environment for $ENVIRONMENT..."
    cd "$CDK_APP"
    
    cdk bootstrap \
        --context environment="$ENVIRONMENT" \
        --require-approval never
    
    log_success "Environment bootstrapped"
}

run_security_checks() {
    log_info "Running security checks..."
    
    # CDK security analysis
    cd "$CDK_APP"
    if command -v checkov &> /dev/null; then
        log_info "Running Checkov security scan..."
        checkov -d . --framework cloudformation --quiet --soft-fail
    else
        log_warning "Checkov not installed. Consider installing for security scanning."
    fi
    
    log_success "Security checks completed"
}

estimate_costs() {
    log_info "Generating cost estimate for $ENVIRONMENT..."
    
    case "$ENVIRONMENT" in
        "dev")
            log_info "💰 Estimated monthly cost: $50-150"
            log_info "   - Minimal resources, single AZ"
            log_info "   - Aurora Serverless scales to zero"
            ;;
        "staging")
            log_info "💰 Estimated monthly cost: $200-500"
            log_info "   - Production-like setup, multi-AZ"
            log_info "   - Full monitoring and backups"
            ;;
        "prod")
            log_info "💰 Estimated monthly cost: $500-2000"
            log_info "   - Full production setup"
            log_info "   - High availability, disaster recovery"
            ;;
    esac
}

perform_action() {
    local stacks=$(get_stack_names)
    cd "$CDK_APP"
    
    case "$ACTION" in
        "bootstrap")
            bootstrap_environment
            ;;
        "synth")
            log_info "Synthesizing CloudFormation templates..."
            cdk synth \
                --context environment="$ENVIRONMENT" \
                $stacks
            log_success "Templates synthesized"
            ;;
        "diff")
            log_info "Showing differences for $STACK in $ENVIRONMENT..."
            cdk diff \
                --context environment="$ENVIRONMENT" \
                $stacks
            ;;
        "deploy")
            log_info "Deploying $STACK to $ENVIRONMENT..."
            
            # Pre-deployment validation
            cdk synth \
                --context environment="$ENVIRONMENT" \
                --validation \
                $stacks > /dev/null
            
            # Actual deployment
            cdk deploy \
                --context environment="$ENVIRONMENT" \
                --require-approval never \
                --rollback-configuration \
                $stacks
            
            log_success "Deployment completed successfully!"
            
            # Post-deployment actions
            if [ "$STACK" = "all" ] || [ "$STACK" = "frontend" ]; then
                deploy_frontend_assets
            fi
            
            show_deployment_outputs
            ;;
        "destroy")
            log_warning "⚠️  This will destroy $STACK in $ENVIRONMENT!"
            
            if [ "$ENVIRONMENT" = "prod" ]; then
                log_error "Production environment destruction requires manual confirmation"
                echo -n "Are you absolutely sure you want to destroy production resources? (type 'yes' to confirm): "
                read confirmation
                if [ "$confirmation" != "yes" ]; then
                    log_info "Destruction cancelled"
                    exit 0
                fi
            fi
            
            log_info "Destroying $STACK in $ENVIRONMENT..."
            cdk destroy \
                --context environment="$ENVIRONMENT" \
                --force \
                $stacks
            
            log_success "Resources destroyed"
            ;;
    esac
}

deploy_frontend_assets() {
    log_info "Deploying frontend assets..."
    
    # Get S3 bucket name from CDK outputs
    FRONTEND_BUCKET=$(aws ssm get-parameter \
        --name "/basic-budget/$ENVIRONMENT/frontend-bucket" \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$FRONTEND_BUCKET" ]; then
        FRONTEND_DIR="$ROOT_DIR/../mock"  # Adjust path as needed
        
        if [ -d "$FRONTEND_DIR" ]; then
            cd "$FRONTEND_DIR"
            
            # Install dependencies and build
            npm ci
            VITE_API_ENDPOINT=$(aws ssm get-parameter \
                --name "/basic-budget/$ENVIRONMENT/api-endpoint" \
                --query 'Parameter.Value' \
                --output text 2>/dev/null || echo "")
            VITE_ENVIRONMENT="$ENVIRONMENT"
            
            export VITE_API_ENDPOINT VITE_ENVIRONMENT
            npm run build
            
            # Deploy to S3
            aws s3 sync dist/ "s3://$FRONTEND_BUCKET/" --delete
            
            # Invalidate CloudFront
            DISTRIBUTION_ID=$(aws ssm get-parameter \
                --name "/basic-budget/$ENVIRONMENT/distribution-id" \
                --query 'Parameter.Value' \
                --output text 2>/dev/null || echo "")
            
            if [ -n "$DISTRIBUTION_ID" ]; then
                aws cloudfront create-invalidation \
                    --distribution-id "$DISTRIBUTION_ID" \
                    --paths "/*" > /dev/null
                log_success "Frontend deployed and CloudFront invalidated"
            fi
        fi
    fi
}

show_deployment_outputs() {
    log_info "Deployment outputs:"
    
    # Get key outputs from SSM parameters
    API_ENDPOINT=$(aws ssm get-parameter \
        --name "/basic-budget/$ENVIRONMENT/api-endpoint" \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "Not available")
    
    WEBSITE_URL=$(aws ssm get-parameter \
        --name "/basic-budget/$ENVIRONMENT/website-url" \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "Not available")
    
    DASHBOARD_URL="https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=BasicBudget-$ENVIRONMENT"
    
    echo -e "${GREEN}"
    echo "🚀 Deployment Summary:"
    echo "├── Environment: $ENVIRONMENT"
    echo "├── API Endpoint: $API_ENDPOINT"
    echo "├── Website URL: $WEBSITE_URL" 
    echo "├── CloudWatch Dashboard: $DASHBOARD_URL"
    echo "└── Region: $AWS_REGION"
    echo -e "${NC}"
}

run_health_checks() {
    if [ "$ACTION" = "deploy" ]; then
        log_info "Running health checks..."
        
        API_ENDPOINT=$(aws ssm get-parameter \
            --name "/basic-budget/$ENVIRONMENT/api-endpoint" \
            --query 'Parameter.Value' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$API_ENDPOINT" ]; then
            # Wait for API to be ready
            for i in {1..30}; do
                if curl -s "$API_ENDPOINT/health" | grep -q "ok\|healthy\|success" 2>/dev/null; then
                    log_success "API health check passed"
                    break
                fi
                log_info "Waiting for API to be ready... ($i/30)"
                sleep 10
            done
        fi
    fi
}

cleanup_on_error() {
    log_error "An error occurred during deployment"
    
    if [ "$ACTION" = "deploy" ]; then
        log_info "Consider running: ./scripts/deploy.sh $ENVIRONMENT diff $STACK"
        log_info "Or check CloudFormation console for detailed error information"
    fi
    
    exit 1
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🏗️  Basic Budget Infrastructure Deployment"
    echo "=========================================="
    echo -e "${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "Action: $ACTION"
    echo "Stack: $STACK"
    echo ""
    
    # Trap errors
    trap cleanup_on_error ERR
    
    check_dependencies
    
    cd "$CDK_APP"
    install_dependencies
    validate_configuration
    
    if [ "$ACTION" != "bootstrap" ]; then
        run_security_checks
        estimate_costs
    fi
    
    perform_action
    run_health_checks
    
    log_success "Operation completed successfully! 🎉"
}

# Show help if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Basic Budget Infrastructure Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [action] [stack]"
    echo ""
    echo "Environments:"
    echo "  dev      - Development environment (default)"
    echo "  staging  - Staging environment"
    echo "  prod     - Production environment"
    echo ""
    echo "Actions:"
    echo "  deploy     - Deploy infrastructure (default)"
    echo "  destroy    - Destroy infrastructure"
    echo "  diff       - Show differences"
    echo "  synth      - Synthesize CloudFormation"
    echo "  bootstrap  - Bootstrap CDK environment"
    echo ""
    echo "Stacks:"
    echo "  all        - All stacks (default)"
    echo "  database   - Database stack only"
    echo "  api        - API stack only"
    echo "  frontend   - Frontend stack only"
    echo "  paystub    - Paystub processing stack only"
    echo "  supporting - Supporting services stack only"
    echo ""
    echo "Examples:"
    echo "  $0 dev deploy all"
    echo "  $0 prod diff database"
    echo "  $0 staging destroy frontend"
    echo ""
    exit 0
fi

# Run main function
main "$@"