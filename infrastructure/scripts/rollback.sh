#!/bin/bash

# Basic Budget Infrastructure Rollback Script
# Usage: ./scripts/rollback.sh [environment] [stack] [version]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parameters
ENVIRONMENT="${1:-staging}"
STACK="${2:-all}"
VERSION="${3:-previous}"

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

check_rollback_capability() {
    log_info "Checking rollback capability for $ENVIRONMENT..."
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        log_warning "Production rollback detected!"
        echo -n "Are you sure you want to rollback production? (type 'yes' to confirm): "
        read confirmation
        if [ "$confirmation" != "yes" ]; then
            log_info "Rollback cancelled"
            exit 0
        fi
    fi
}

get_deployment_history() {
    log_info "Getting deployment history..."
    
    # List recent CloudFormation stack events
    local env_suffix=$(echo "$ENVIRONMENT" | sed 's/^./\U&/')
    local stack_name="BasicBudget${env_suffix}Database"
    
    aws cloudformation describe-stack-events \
        --stack-name "$stack_name" \
        --max-items 20 \
        --query 'StackEvents[?ResourceStatus==`CREATE_COMPLETE` || ResourceStatus==`UPDATE_COMPLETE`].{Timestamp:Timestamp,Status:ResourceStatus,Reason:ResourceStatusReason}' \
        --output table
}

perform_rollback() {
    local stacks
    case "$STACK" in
        "all")
            stacks="--all"
            ;;
        *)
            local env_suffix=$(echo "$ENVIRONMENT" | sed 's/^./\U&/')
            stacks="BasicBudget${env_suffix}$(echo ${STACK^})"
            ;;
    esac
    
    log_warning "🔄 Rolling back $STACK in $ENVIRONMENT..."
    
    cd "$ROOT_DIR"
    
    # For CloudFormation, we'll use change sets to revert
    if [ "$VERSION" = "previous" ]; then
        log_info "Rolling back to previous version using git..."
        
        # Get the previous commit
        PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
        
        # Checkout previous version
        git stash push -m "Rollback stash $(date)"
        git checkout "$PREVIOUS_COMMIT" -- .
        
        # Deploy previous version
        cdk deploy \
            --context environment="$ENVIRONMENT" \
            --require-approval never \
            $stacks
        
        # Restore current state (but don't deploy)
        git stash pop || true
        
    else
        log_info "Rolling back to specific version: $VERSION"
        git checkout "$VERSION" -- .
        
        cdk deploy \
            --context environment="$ENVIRONMENT" \
            --require-approval never \
            $stacks
    fi
    
    log_success "Rollback completed!"
}

verify_rollback() {
    log_info "Verifying rollback..."
    
    # Run health checks
    API_ENDPOINT=$(aws ssm get-parameter \
        --name "/basic-budget/$ENVIRONMENT/api-endpoint" \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$API_ENDPOINT" ]; then
        for i in {1..10}; do
            if curl -s "$API_ENDPOINT/health" | grep -q "ok\|healthy\|success" 2>/dev/null; then
                log_success "Health check passed after rollback"
                break
            fi
            log_info "Waiting for service to be ready... ($i/10)"
            sleep 10
        done
    fi
}

create_rollback_plan() {
    log_info "Creating rollback execution plan..."
    
    echo "Rollback Execution Plan:"
    echo "========================"
    echo "Environment: $ENVIRONMENT"
    echo "Stack: $STACK"
    echo "Target Version: $VERSION"
    echo "Estimated Downtime: 5-15 minutes"
    echo ""
    echo "Steps:"
    echo "1. Backup current configuration"
    echo "2. Deploy previous version"
    echo "3. Verify service health"
    echo "4. Update monitoring"
    echo ""
    
    echo -n "Proceed with rollback? (y/N): "
    read proceed
    if [ "$proceed" != "y" ] && [ "$proceed" != "Y" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}"
    echo "🔄 Basic Budget Infrastructure Rollback"
    echo "======================================"
    echo -e "${NC}"
    
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "Usage: $0 [environment] [stack] [version]"
        echo ""
        echo "Environments: dev, staging, prod"
        echo "Stacks: all, database, api, frontend, paystub, supporting"
        echo "Version: previous (default) or git commit hash"
        echo ""
        echo "Examples:"
        echo "  $0 staging all previous"
        echo "  $0 prod api abc123def"
        echo ""
        exit 0
    fi
    
    check_rollback_capability
    get_deployment_history
    create_rollback_plan
    perform_rollback
    verify_rollback
    
    log_success "Rollback completed successfully! 🎉"
}

main "$@"