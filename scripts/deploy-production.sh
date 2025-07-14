#!/bin/bash
# Production Deployment Script for OpsSight DevOps Platform
# Comprehensive production deployment with safety checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"

# Load environment variables
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
else
    echo "❌ Production environment file not found: $ENV_FILE"
    exit 1
fi

# Default values
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-west-2}"
CLUSTER_NAME="${CLUSTER_NAME:-opsight-production-cluster}"
NAMESPACE="${NAMESPACE:-production}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
MAINTENANCE_MODE="${MAINTENANCE_MODE:-true}"
DRY_RUN="${DRY_RUN:-false}"

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

# Help function
show_help() {
    cat << EOF
Production Deployment Script for OpsSight DevOps Platform

Usage: $0 [OPTIONS]

Options:
    -t, --tag TAG           Docker image tag to deploy (required)
    -s, --skip-backup       Skip database backup
    -m, --no-maintenance    Skip maintenance mode
    -d, --dry-run          Perform dry run without actual deployment
    -h, --help             Show this help message

Environment Variables:
    AWS_REGION             AWS region (default: us-west-2)
    CLUSTER_NAME           EKS cluster name
    NAMESPACE              Kubernetes namespace (default: production)
    ECR_REGISTRY           ECR registry URL

Examples:
    $0 --tag v1.2.3
    $0 --tag v1.2.3 --skip-backup --no-maintenance
    $0 --tag v1.2.3 --dry-run

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -s|--skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            -m|--no-maintenance)
                MAINTENANCE_MODE="false"
                shift
                ;;
            -d|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "aws" "docker" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Validate image tag format
    if [[ ! "$IMAGE_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        log_error "Invalid version tag: $IMAGE_TAG"
        log_error "Production deployments require semantic version tags (e.g., v1.0.0)"
        exit 1
    fi
    
    log_success "Prerequisites validated"
}

# Configure kubectl
configure_kubectl() {
    log_info "Configuring kubectl for cluster: $CLUSTER_NAME"
    
    aws eks update-kubeconfig \
        --name "$CLUSTER_NAME" \
        --region "$AWS_REGION"
    
    # Verify cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Failed to connect to cluster: $CLUSTER_NAME"
        exit 1
    fi
    
    log_success "kubectl configured successfully"
}

# Verify images exist
verify_images() {
    log_info "Verifying container images exist..."
    
    local components=("frontend" "backend")
    for component in "${components[@]}"; do
        log_info "Checking $component image: $IMAGE_TAG"
        
        if ! aws ecr describe-images \
            --repository-name "opsight/$component" \
            --image-ids "imageTag=$IMAGE_TAG" \
            --region "$AWS_REGION" &> /dev/null; then
            log_error "$component image not found: $IMAGE_TAG"
            exit 1
        fi
    done
    
    log_success "All container images verified"
}

# Create database backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "Skipping database backup"
        return 0
    fi
    
    log_info "Creating database backup..."
    
    local backup_name="pre-deployment-$(date +%Y%m%d-%H%M%S)-${IMAGE_TAG#v}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create backup: $backup_name"
        return 0
    fi
    
    kubectl create job "$backup_name" \
        --from=cronjob/db-backup \
        --namespace="$NAMESPACE"
    
    log_info "Waiting for backup to complete..."
    kubectl wait --for=condition=complete \
        --timeout=600s \
        "job/$backup_name" \
        --namespace="$NAMESPACE"
    
    # Verify backup success
    local succeeded=$(kubectl get job "$backup_name" \
        -o jsonpath='{.status.succeeded}' \
        --namespace="$NAMESPACE")
    
    if [[ "$succeeded" != "1" ]]; then
        log_error "Database backup failed"
        kubectl logs "job/$backup_name" --namespace="$NAMESPACE"
        exit 1
    fi
    
    log_success "Database backup completed: $backup_name"
}

# Enable maintenance mode
enable_maintenance() {
    if [[ "$MAINTENANCE_MODE" == "false" ]]; then
        log_warning "Skipping maintenance mode"
        return 0
    fi
    
    log_info "Enabling maintenance mode..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would enable maintenance mode"
        return 0
    fi
    
    kubectl scale deployment maintenance-page \
        --replicas=2 \
        --namespace="$NAMESPACE"
    
    kubectl rollout status deployment/maintenance-page \
        --namespace="$NAMESPACE" \
        --timeout=120s
    
    log_success "Maintenance mode enabled"
}

# Deploy component
deploy_component() {
    local component="$1"
    log_info "Deploying $component..."
    
    local image="$ECR_REGISTRY/opsight/$component:$IMAGE_TAG"
    local deployment="$component-deployment"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy $component with image: $image"
        return 0
    fi
    
    # Create deployment backup
    kubectl get deployment "$deployment" \
        --namespace="$NAMESPACE" \
        -o yaml > "$PROJECT_ROOT/backups/$deployment-backup-$(date +%Y%m%d-%H%M%S).yaml"
    
    # Update deployment
    kubectl set image "deployment/$deployment" \
        "$component=$image" \
        --namespace="$NAMESPACE"
    
    # Add deployment annotations
    kubectl annotate "deployment/$deployment" \
        "github.com/version=$IMAGE_TAG" \
        "deployment.kubernetes.io/revision-" \
        --namespace="$NAMESPACE" --overwrite
    
    # Wait for rollout
    kubectl rollout status "deployment/$deployment" \
        --namespace="$NAMESPACE" \
        --timeout=600s
    
    log_success "$component deployed successfully"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local components=("frontend" "backend")
    for component in "${components[@]}"; do
        log_info "Checking $component health..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would run health checks for $component"
            continue
        fi
        
        local service_url=$(kubectl get service "$component-service" \
            --namespace="$NAMESPACE" \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
        
        if [[ -n "$service_url" ]]; then
            # Wait for load balancer
            sleep 30
            
            # Health check with retries
            local retries=5
            for ((i=1; i<=retries; i++)); do
                if curl -f "https://$service_url/health" --max-time 30 &> /dev/null; then
                    log_success "$component health check passed (attempt $i)"
                    break
                elif [[ $i -eq $retries ]]; then
                    log_error "$component health check failed after $retries attempts"
                    return 1
                else
                    log_warning "$component health check failed (attempt $i), retrying..."
                    sleep 30
                fi
            done
        else
            log_warning "$component service endpoint not available for testing"
        fi
    done
    
    log_success "All health checks passed"
}

# Disable maintenance mode
disable_maintenance() {
    if [[ "$MAINTENANCE_MODE" == "false" ]]; then
        return 0
    fi
    
    log_info "Disabling maintenance mode..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would disable maintenance mode"
        return 0
    fi
    
    kubectl scale deployment maintenance-page \
        --replicas=0 \
        --namespace="$NAMESPACE"
    
    log_success "Maintenance mode disabled"
}

# Rollback deployment
rollback_deployment() {
    local component="$1"
    log_error "Rolling back $component deployment..."
    
    kubectl rollout undo "deployment/$component-deployment" \
        --namespace="$NAMESPACE"
    
    kubectl rollout status "deployment/$component-deployment" \
        --namespace="$NAMESPACE" \
        --timeout=300s
    
    log_success "$component rollback completed"
}

# Main deployment function
main() {
    log_info "Starting production deployment for OpsSight Platform"
    log_info "Version: $IMAGE_TAG"
    log_info "Environment: $ENVIRONMENT"
    log_info "Cluster: $CLUSTER_NAME"
    log_info "Namespace: $NAMESPACE"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Create backup directory
    mkdir -p "$PROJECT_ROOT/backups"
    
    # Deployment steps
    validate_prerequisites
    configure_kubectl
    verify_images
    create_backup
    enable_maintenance
    
    # Deploy components
    local components=("backend" "frontend")
    local failed_components=()
    
    for component in "${components[@]}"; do
        if ! deploy_component "$component"; then
            log_error "Failed to deploy $component"
            failed_components+=("$component")
        fi
    done
    
    # Handle failures
    if [[ ${#failed_components[@]} -gt 0 ]]; then
        log_error "Deployment failed for components: ${failed_components[*]}"
        
        # Rollback failed components
        for component in "${failed_components[@]}"; do
            rollback_deployment "$component"
        done
        
        log_error "Production deployment failed and rollback completed"
        exit 1
    fi
    
    # Health checks
    if ! run_health_checks; then
        log_error "Health checks failed, consider rollback"
        exit 1
    fi
    
    disable_maintenance
    
    log_success "🎉 Production deployment completed successfully!"
    log_success "Application is now live with version $IMAGE_TAG"
}

# Error handling
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
        
        # Ensure maintenance mode is disabled on failure
        if [[ "$MAINTENANCE_MODE" == "true" && "$DRY_RUN" == "false" ]]; then
            log_info "Disabling maintenance mode due to failure..."
            disable_maintenance || true
        fi
    fi
}

trap cleanup EXIT

# Parse arguments and run main function
parse_args "$@"
main