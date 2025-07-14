#!/bin/bash

set -euo pipefail

# OpsSight Infrastructure Deployment Script
# Comprehensive infrastructure deployment using Terraform

# Configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-opssight}"
TERRAFORM_VERSION="${TERRAFORM_VERSION:-1.6.0}"
PLAN_FILE="terraform-${ENVIRONMENT}.plan"
STATE_BUCKET="${STATE_BUCKET:-${PROJECT_NAME}-terraform-state-${AWS_REGION}}"
STATE_KEY="${STATE_KEY:-infrastructure/${ENVIRONMENT}/terraform.tfstate}"
FORCE_APPLY="${FORCE_APPLY:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
trap 'handle_error $? $LINENO' ERR

handle_error() {
    local exit_code=$1
    local line_number=$2
    log_error "Script failed with exit code $exit_code at line $line_number"
    
    # Show Terraform logs if available
    if [[ -f "terraform.log" ]]; then
        log_error "Recent Terraform logs:"
        tail -20 terraform.log
    fi
    
    # Cleanup
    cleanup
    exit $exit_code
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "$PLAN_FILE" 2>/dev/null || true
    rm -f terraform.log 2>/dev/null || true
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    for tool in terraform aws jq; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check Terraform version
    local terraform_version=$(terraform version -json | jq -r '.terraform_version')
    if [[ "$terraform_version" != "$TERRAFORM_VERSION"* ]]; then
        log_warning "Terraform version mismatch. Expected: $TERRAFORM_VERSION, Found: $terraform_version"
    fi
    
    # Check AWS authentication
    if ! aws sts get-caller-identity &>/dev/null; then
        log_error "AWS authentication failed. Please configure AWS credentials."
        exit 1
    fi
    
    # Check environment file exists
    local env_file="environments/${ENVIRONMENT}.tfvars"
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi
    
    # Validate required environment variables
    local required_vars=(
        "TF_VAR_github_client_id"
        "TF_VAR_github_client_secret"
        "TF_VAR_grafana_admin_password"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    log_success "Prerequisites validated"
}

# Setup Terraform backend
setup_backend() {
    log_info "Setting up Terraform backend..."
    
    # Create S3 bucket for state if it doesn't exist
    if ! aws s3 ls "s3://$STATE_BUCKET" &>/dev/null; then
        log_info "Creating S3 bucket for Terraform state: $STATE_BUCKET"
        aws s3 mb "s3://$STATE_BUCKET" --region "$AWS_REGION"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$STATE_BUCKET" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$STATE_BUCKET" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        # Block public access
        aws s3api put-public-access-block \
            --bucket "$STATE_BUCKET" \
            --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    fi
    
    # Create DynamoDB table for state locking
    local lock_table="${STATE_BUCKET}-lock"
    if ! aws dynamodb describe-table --table-name "$lock_table" &>/dev/null; then
        log_info "Creating DynamoDB table for state locking: $lock_table"
        aws dynamodb create-table \
            --table-name "$lock_table" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
            --region "$AWS_REGION"
        
        # Wait for table to be active
        aws dynamodb wait table-exists --table-name "$lock_table" --region "$AWS_REGION"
    fi
    
    log_success "Backend setup completed"
}

# Initialize Terraform
terraform_init() {
    log_info "Initializing Terraform..."
    
    # Enable detailed logging
    export TF_LOG=INFO
    export TF_LOG_PATH=terraform.log
    
    terraform init \
        -backend-config="bucket=$STATE_BUCKET" \
        -backend-config="key=$STATE_KEY" \
        -backend-config="region=$AWS_REGION" \
        -backend-config="dynamodb_table=${STATE_BUCKET}-lock" \
        -backend-config="encrypt=true" \
        -reconfigure
    
    log_success "Terraform initialized"
}

# Validate Terraform configuration
terraform_validate() {
    log_info "Validating Terraform configuration..."
    
    terraform validate
    terraform fmt -check -recursive
    
    log_success "Terraform configuration is valid"
}

# Plan Terraform deployment
terraform_plan() {
    log_info "Planning Terraform deployment for environment: $ENVIRONMENT"
    
    terraform plan \
        -var-file="environments/${ENVIRONMENT}.tfvars" \
        -out="$PLAN_FILE" \
        -detailed-exitcode
    
    local plan_exit_code=$?
    
    case $plan_exit_code in
        0)
            log_info "No changes detected"
            return 0
            ;;
        1)
            log_error "Terraform plan failed"
            return 1
            ;;
        2)
            log_info "Changes detected and planned"
            return 2
            ;;
    esac
}

# Apply Terraform changes
terraform_apply() {
    log_info "Applying Terraform changes..."
    
    if [[ "$FORCE_APPLY" != "true" ]]; then
        # Show plan summary
        terraform show -no-color "$PLAN_FILE" | head -50
        
        echo ""
        read -p "Do you want to apply these changes? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "Deployment cancelled by user"
            return 0
        fi
    fi
    
    terraform apply "$PLAN_FILE"
    
    log_success "Terraform changes applied successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Get cluster name from Terraform outputs
    local cluster_name=$(terraform output -raw eks_cluster_id 2>/dev/null || echo "")
    
    if [[ -n "$cluster_name" ]]; then
        # Update kubeconfig
        aws eks update-kubeconfig --region "$AWS_REGION" --name "$cluster_name"
        
        # Check cluster status
        kubectl cluster-info
        
        # Check node status
        kubectl get nodes -o wide
        
        # Check system pods
        kubectl get pods -n kube-system
        
        log_success "EKS cluster is operational"
    fi
    
    # Verify other resources
    terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value)"'
    
    log_success "Deployment verification completed"
}

# Generate deployment summary
generate_summary() {
    log_info "Generating deployment summary..."
    
    local summary_file="deployment-summary-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$summary_file" << EOF
{
  "deployment": {
    "environment": "$ENVIRONMENT",
    "project": "$PROJECT_NAME",
    "region": "$AWS_REGION",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "terraform_version": "$(terraform version -json | jq -r '.terraform_version')",
    "aws_account": "$(aws sts get-caller-identity --query Account --output text)",
    "user": "$(aws sts get-caller-identity --query Arn --output text)"
  },
  "resources": $(terraform output -json 2>/dev/null || echo '{}'),
  "state": {
    "bucket": "$STATE_BUCKET",
    "key": "$STATE_KEY",
    "region": "$AWS_REGION"
  }
}
EOF
    
    log_success "Deployment summary saved to: $summary_file"
}

# Main deployment function
main() {
    log_info "=== OpsSight Infrastructure Deployment ==="
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    log_info "Project: $PROJECT_NAME"
    log_info "Timestamp: $(date)"
    
    # Change to infrastructure directory
    cd "$(dirname "$0")/../infrastructure"
    
    validate_prerequisites
    setup_backend
    terraform_init
    terraform_validate
    
    if terraform_plan; then
        local plan_result=$?
        if [[ $plan_result -eq 2 ]] || [[ "$FORCE_APPLY" == "true" ]]; then
            terraform_apply
            verify_deployment
            generate_summary
        fi
    fi
    
    cleanup
    log_success "=== Deployment completed successfully ==="
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy OpsSight infrastructure using Terraform

OPTIONS:
    -e, --environment ENV    Environment to deploy (staging|production) [default: staging]
    -r, --region REGION      AWS region [default: us-east-1]
    -p, --project PROJECT    Project name [default: opssight]
    -f, --force             Force apply without confirmation
    -h, --help              Show this help message

EXAMPLES:
    $0                              Deploy to staging
    $0 -e production               Deploy to production
    $0 -e staging -r us-west-2     Deploy to staging in us-west-2
    $0 -f -e production            Force deploy to production

ENVIRONMENT VARIABLES:
    ENVIRONMENT                    Same as -e/--environment
    AWS_REGION                     Same as -r/--region
    PROJECT_NAME                   Same as -p/--project
    FORCE_APPLY                    Same as -f/--force
    STATE_BUCKET                   S3 bucket for Terraform state
    
    # Required secrets (set via environment variables):
    TF_VAR_github_client_id        GitHub OAuth client ID
    TF_VAR_github_client_secret    GitHub OAuth client secret
    TF_VAR_grafana_admin_password  Grafana admin password
    TF_VAR_slack_webhook_url       Slack webhook URL (optional)
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_APPLY="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
fi

# Run main function
main "$@"