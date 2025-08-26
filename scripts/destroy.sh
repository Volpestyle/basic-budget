#!/bin/bash

# Basic Budget Infrastructure Destruction Script
# Usage: ./scripts/destroy.sh [environment]
# Environment: dev, staging, prod (default: dev)
# 
# WARNING: This script will destroy all infrastructure resources!
# Use with extreme caution, especially in production environments.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-dev}
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

# Warning for production
if [[ "$ENVIRONMENT" == "prod" ]]; then
    warn "⚠️  WARNING: You are about to destroy PRODUCTION infrastructure!"
    warn "This action is IRREVERSIBLE and will result in:"
    warn "- Complete data loss"
    warn "- Service downtime"
    warn "- Potential revenue impact"
    echo ""
    read -p "Type 'DELETE-PRODUCTION' to confirm: " confirmation
    if [[ "$confirmation" != "DELETE-PRODUCTION" ]]; then
        error "Production destruction cancelled"
    fi
fi

log "Starting infrastructure destruction for environment: $ENVIRONMENT"
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
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        warn "CDK CLI not found globally. Will use local version."
    fi
    
    log "Prerequisites check completed"
}

# Empty S3 buckets
empty_s3_buckets() {
    log "Emptying S3 buckets..."
    
    # Get bucket names from CloudFormation stacks
    local buckets=()
    
    # Frontend bucket
    if aws cloudformation describe-stacks --stack-name "basic-budget-frontend-$ENVIRONMENT" &>/dev/null; then
        FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
            --stack-name "basic-budget-frontend-$ENVIRONMENT" \
            --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [[ -n "$FRONTEND_BUCKET" && "$FRONTEND_BUCKET" != "None" ]]; then
            buckets+=("$FRONTEND_BUCKET")
        fi
    fi
    
    # Paystub temp bucket
    if aws cloudformation describe-stacks --stack-name "basic-budget-paystub-$ENVIRONMENT" &>/dev/null; then
        PAYSTUB_BUCKET=$(aws cloudformation describe-stacks \
            --stack-name "basic-budget-paystub-$ENVIRONMENT" \
            --query 'Stacks[0].Outputs[?OutputKey==`TempBucketName`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [[ -n "$PAYSTUB_BUCKET" && "$PAYSTUB_BUCKET" != "None" ]]; then
            buckets+=("$PAYSTUB_BUCKET")
        fi
    fi
    
    # Empty each bucket
    for bucket in "${buckets[@]}"; do
        if aws s3api head-bucket --bucket "$bucket" &>/dev/null; then
            log "Emptying S3 bucket: $bucket"
            aws s3 rm "s3://$bucket" --recursive
            
            # Remove all versions if versioning is enabled
            aws s3api list-object-versions --bucket "$bucket" \
                --output json --query 'Versions[].{Key:Key,VersionId:VersionId}' \
                | jq -r '.[] | "--key \(.Key) --version-id \(.VersionId)"' \
                | xargs -I {} aws s3api delete-object --bucket "$bucket" {} 2>/dev/null || true
            
            # Remove delete markers
            aws s3api list-object-versions --bucket "$bucket" \
                --output json --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' \
                | jq -r '.[] | "--key \(.Key) --version-id \(.VersionId)"' \
                | xargs -I {} aws s3api delete-object --bucket "$bucket" {} 2>/dev/null || true
        fi
    done
    
    log "S3 buckets emptied"
}

# Delete ECR images
clean_ecr_repositories() {
    log "Cleaning ECR repositories..."
    
    local repo_name="basic-budget-paystub-$ENVIRONMENT"
    
    if aws ecr describe-repositories --repository-names "$repo_name" &>/dev/null; then
        log "Cleaning ECR repository: $repo_name"
        
        # List and delete all images
        local image_ids=$(aws ecr list-images --repository-name "$repo_name" \
            --query 'imageIds[*]' --output json)
        
        if [[ "$image_ids" != "[]" ]]; then
            aws ecr batch-delete-image \
                --repository-name "$repo_name" \
                --image-ids "$image_ids"
        fi
    fi
    
    log "ECR repositories cleaned"
}

# Disable CloudFront distributions (speed up deletion)
disable_cloudfront() {
    log "Disabling CloudFront distributions..."
    
    if aws cloudformation describe-stacks --stack-name "basic-budget-frontend-$ENVIRONMENT" &>/dev/null; then
        DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
            --stack-name "basic-budget-frontend-$ENVIRONMENT" \
            --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [[ -n "$DISTRIBUTION_ID" && "$DISTRIBUTION_ID" != "None" ]]; then
            log "Disabling CloudFront distribution: $DISTRIBUTION_ID"
            
            # Get current distribution config
            local etag=$(aws cloudfront get-distribution-config \
                --id "$DISTRIBUTION_ID" --query 'ETag' --output text)
            
            local config=$(aws cloudfront get-distribution-config \
                --id "$DISTRIBUTION_ID" --query 'DistributionConfig')
            
            # Update config to disable distribution
            local updated_config=$(echo "$config" | jq '.Enabled = false')
            
            # Update distribution
            aws cloudfront update-distribution \
                --id "$DISTRIBUTION_ID" \
                --distribution-config "$updated_config" \
                --if-match "$etag" >/dev/null
            
            log "CloudFront distribution disabled (deletion will be faster)"
        fi
    fi
}

# Delete RDS snapshots (to avoid retention)
delete_rds_snapshots() {
    if [[ "$ENVIRONMENT" != "prod" ]]; then
        log "Deleting RDS snapshots for non-production environment..."
        
        local cluster_id="basic-budget-$ENVIRONMENT"
        
        # Delete manual snapshots
        aws rds describe-db-cluster-snapshots \
            --db-cluster-identifier "$cluster_id" \
            --snapshot-type manual \
            --query 'DBClusterSnapshots[].DBClusterSnapshotIdentifier' \
            --output text | tr '\t' '\n' | while read -r snapshot_id; do
            if [[ -n "$snapshot_id" && "$snapshot_id" != "None" ]]; then
                log "Deleting RDS snapshot: $snapshot_id"
                aws rds delete-db-cluster-snapshot \
                    --db-cluster-snapshot-identifier "$snapshot_id" >/dev/null || true
            fi
        done
    fi
}

# Destroy infrastructure using CDK
destroy_infrastructure() {
    log "Destroying CDK infrastructure..."
    
    cd "$ROOT_DIR/infrastructure"
    
    # Install dependencies if needed
    if [[ ! -d node_modules ]]; then
        log "Installing CDK dependencies..."
        npm ci
    fi
    
    # Build TypeScript
    npm run build
    
    # Destroy all stacks
    log "Destroying CDK stacks..."
    npx cdk destroy --all \
        --context environment=$ENVIRONMENT \
        --force
    
    log "CDK infrastructure destroyed"
}

# Clean up local files
cleanup_local_files() {
    log "Cleaning up local deployment files..."
    
    rm -f "$ROOT_DIR/.deployment-outputs-$ENVIRONMENT.json"
    rm -f "$ROOT_DIR/infrastructure/outputs.json"
    rm -f "$ROOT_DIR/infrastructure/cdk.out"
    
    log "Local files cleaned up"
}

# Main destruction logic
main() {
    check_prerequisites
    
    warn "🗑️  Starting destruction of $ENVIRONMENT environment..."
    warn "This will destroy all resources and cannot be undone!"
    
    if [[ "$ENVIRONMENT" != "prod" ]]; then
        read -p "Type '$ENVIRONMENT' to confirm destruction: " confirmation
        if [[ "$confirmation" != "$ENVIRONMENT" ]]; then
            error "Destruction cancelled"
        fi
    fi
    
    # Pre-destruction cleanup
    empty_s3_buckets
    clean_ecr_repositories
    disable_cloudfront
    delete_rds_snapshots
    
    # Wait a moment for resources to be ready for deletion
    log "Waiting for resources to be ready for deletion..."
    sleep 10
    
    # Destroy infrastructure
    destroy_infrastructure
    
    # Post-destruction cleanup
    cleanup_local_files
    
    log "🎉 Infrastructure destruction completed successfully!"
    log "All resources for $ENVIRONMENT environment have been removed."
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        warn "🚨 PRODUCTION ENVIRONMENT HAS BEEN DESTROYED"
        warn "All data and resources have been permanently deleted!"
    fi
}

# Handle script interruption
trap 'error "Destruction interrupted"' INT

# Final confirmation
echo ""
warn "⚠️  FINAL WARNING ⚠️"
warn "You are about to PERMANENTLY DELETE all infrastructure for: $ENVIRONMENT"
warn "This includes:"
warn "  - All databases and data"
warn "  - All Lambda functions"
warn "  - All S3 buckets and files"
warn "  - All CloudFront distributions"
warn "  - All networking resources"
warn ""
read -p "Are you absolutely sure? Type 'DESTROY' to continue: " final_confirmation

if [[ "$final_confirmation" != "DESTROY" ]]; then
    log "Destruction cancelled. No resources were modified."
    exit 0
fi

# Run main function
main