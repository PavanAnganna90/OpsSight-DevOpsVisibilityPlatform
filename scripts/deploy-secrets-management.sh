#!/bin/bash

# OpsSight DevOps Platform - Secrets Management Deployment Script
# Deploy AWS Secrets Manager integration with Kubernetes CSI Driver

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-west-2}"
CLUSTER_NAME="${CLUSTER_NAME:-opsight-${ENVIRONMENT}}"
NAMESPACE="${NAMESPACE:-opsight-${ENVIRONMENT}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy secrets management infrastructure for OpsSight platform.

OPTIONS:
    -e, --environment    Environment (staging, production) [default: staging]
    -r, --region         AWS region [default: us-west-2]
    -c, --cluster        EKS cluster name [default: opsight-ENVIRONMENT]
    -n, --namespace      Kubernetes namespace [default: opsight-ENVIRONMENT]
    --install-csi        Install Secrets Store CSI Driver
    --create-secrets     Create AWS Secrets Manager secrets
    --deploy-providers   Deploy SecretProviderClass resources
    --setup-rbac         Setup RBAC and service accounts
    --update-helm        Update Helm chart with secrets integration
    --validate           Validate deployment
    --cleanup            Remove all secrets management resources
    -h, --help           Show this help message

EXAMPLES:
    # Full deployment for staging
    $0 --environment staging --install-csi --create-secrets --deploy-providers --setup-rbac

    # Production deployment
    $0 --environment production --install-csi --create-secrets --deploy-providers --setup-rbac

    # Validate existing deployment
    $0 --environment staging --validate

    # Cleanup resources
    $0 --environment staging --cleanup

EOF
}

# Parse command line arguments
INSTALL_CSI=false
CREATE_SECRETS=false
DEPLOY_PROVIDERS=false
SETUP_RBAC=false
UPDATE_HELM=false
VALIDATE=false
CLEANUP=false

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
        -c|--cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --install-csi)
            INSTALL_CSI=true
            shift
            ;;
        --create-secrets)
            CREATE_SECRETS=true
            shift
            ;;
        --deploy-providers)
            DEPLOY_PROVIDERS=true
            shift
            ;;
        --setup-rbac)
            SETUP_RBAC=true
            shift
            ;;
        --update-helm)
            UPDATE_HELM=true
            shift
            ;;
        --validate)
            VALIDATE=true
            shift
            ;;
        --cleanup)
            CLEANUP=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Prerequisite checks
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required tools
    local tools=("kubectl" "aws" "helm" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed or not in PATH"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
    fi
    
    # Check kubectl context
    if ! kubectl cluster-info &> /dev/null; then
        error "kubectl not configured or cluster not accessible"
    fi
    
    # Verify EKS cluster
    local current_cluster
    current_cluster=$(kubectl config current-context | cut -d'/' -f2 2>/dev/null || echo "unknown")
    if [[ "$current_cluster" != "$CLUSTER_NAME" ]]; then
        warn "Current kubectl context ($current_cluster) doesn't match expected cluster ($CLUSTER_NAME)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log "Prerequisites check passed"
}

# Install Secrets Store CSI Driver
install_csi_driver() {
    log "Installing Secrets Store CSI Driver..."
    
    # Apply CSI Driver manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/secrets/secrets-store-csi-driver.yaml"
    
    # Wait for CSI Driver to be ready
    log "Waiting for CSI Driver pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=secrets-store-csi-driver -n secrets-store-csi-driver --timeout=300s
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=secrets-store-provider-aws -n secrets-store-csi-driver --timeout=300s
    
    log "Secrets Store CSI Driver installed successfully"
}

# Create AWS Secrets Manager secrets using Terraform
create_aws_secrets() {
    log "Creating AWS Secrets Manager secrets..."
    
    # Navigate to infrastructure directory
    cd "$PROJECT_ROOT/infrastructure"
    
    # Initialize Terraform if needed
    if [[ ! -d ".terraform" ]]; then
        log "Initializing Terraform..."
        terraform init
    fi
    
    # Create terraform.tfvars for secrets
    cat > terraform.tfvars << EOF
# Environment Configuration
environment = "$ENVIRONMENT"
aws_region = "$AWS_REGION"

# Secrets Management Configuration
github_client_id = "$GITHUB_CLIENT_ID"
github_client_secret = "$GITHUB_CLIENT_SECRET"
github_webhook_secret = "$GITHUB_WEBHOOK_SECRET"
github_token = "$GITHUB_TOKEN"

# Monitoring Configuration
prometheus_password = "$(openssl rand -base64 32)"
grafana_admin_password = "$(openssl rand -base64 32)"
alertmanager_webhook_url = "$ALERTMANAGER_WEBHOOK_URL"
slack_webhook_url = "$SLACK_WEBHOOK_URL"

# CI/CD Configuration
docker_hub_username = "$DOCKER_HUB_USERNAME"
docker_hub_token = "$DOCKER_HUB_TOKEN"
cosign_private_key = "$COSIGN_PRIVATE_KEY"
cosign_password = "$COSIGN_PASSWORD"
EOF
    
    # Plan and apply Terraform
    log "Planning Terraform deployment..."
    terraform plan -target=module.secrets_manager
    
    log "Applying Terraform configuration..."
    terraform apply -target=module.secrets_manager -auto-approve
    
    log "AWS Secrets Manager secrets created successfully"
    cd "$PROJECT_ROOT"
}

# Deploy SecretProviderClass resources
deploy_secret_providers() {
    log "Deploying SecretProviderClass resources..."
    
    # Ensure namespaces exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Update SecretProviderClass manifests with correct environment
    local temp_file=$(mktemp)
    sed "s/opsight-staging/opsight-${ENVIRONMENT}/g" "$PROJECT_ROOT/k8s/secrets/secret-provider-classes.yaml" > "$temp_file"
    
    # Apply SecretProviderClass resources
    kubectl apply -f "$temp_file"
    rm "$temp_file"
    
    log "SecretProviderClass resources deployed successfully"
}

# Setup RBAC and service accounts
setup_rbac() {
    log "Setting up RBAC and service accounts..."
    
    # Get AWS account ID
    local aws_account_id
    aws_account_id=$(aws sts get-caller-identity --query Account --output text)
    
    # Update service account manifests with correct account ID and environment
    local temp_file=$(mktemp)
    sed -e "s/ACCOUNT_ID/$aws_account_id/g" \
        -e "s/opsight-staging/opsight-${ENVIRONMENT}/g" \
        "$PROJECT_ROOT/k8s/secrets/service-accounts.yaml" > "$temp_file"
    
    # Apply RBAC and service accounts
    kubectl apply -f "$temp_file"
    rm "$temp_file"
    
    log "RBAC and service accounts configured successfully"
}

# Update Helm chart
update_helm_chart() {
    log "Updating Helm chart with secrets management configuration..."
    
    # Update Helm values for secrets management
    helm upgrade --install opsight "$PROJECT_ROOT/helm/opsight" \
        --namespace "$NAMESPACE" \
        --set secretsManagement.enabled=true \
        --set secretsManagement.awsSecretsManager.applicationSecretsName="opsight-${ENVIRONMENT}-application-secrets" \
        --set secretsManagement.awsSecretsManager.databaseSecretsName="opsight-${ENVIRONMENT}-database-secrets" \
        --set secretsManagement.awsSecretsManager.monitoringSecretsName="opsight-${ENVIRONMENT}-monitoring-secrets" \
        --set app.environment="$ENVIRONMENT" \
        --dry-run --debug
    
    log "Helm chart updated with secrets management configuration"
}

# Validate deployment
validate_deployment() {
    log "Validating secrets management deployment..."
    
    local validation_passed=true
    
    # Check CSI Driver
    if ! kubectl get pods -n secrets-store-csi-driver -l app.kubernetes.io/name=secrets-store-csi-driver | grep -q Running; then
        error "CSI Driver pods are not running"
        validation_passed=false
    fi
    
    # Check SecretProviderClass resources
    if ! kubectl get secretproviderclass -n "$NAMESPACE" opsight-application-secrets &> /dev/null; then
        error "SecretProviderClass not found in namespace $NAMESPACE"
        validation_passed=false
    fi
    
    # Check service accounts
    if ! kubectl get serviceaccount -n "$NAMESPACE" secrets-manager-sa &> /dev/null; then
        error "Service account secrets-manager-sa not found in namespace $NAMESPACE"
        validation_passed=false
    fi
    
    # Check AWS Secrets Manager secrets
    local secrets=("opsight-${ENVIRONMENT}-application-secrets" "opsight-${ENVIRONMENT}-database-secrets")
    for secret in "${secrets[@]}"; do
        if ! aws secretsmanager describe-secret --secret-id "$secret" --region "$AWS_REGION" &> /dev/null; then
            error "AWS Secrets Manager secret $secret not found"
            validation_passed=false
        fi
    done
    
    if [[ "$validation_passed" == true ]]; then
        log "✅ Secrets management deployment validation passed"
    else
        error "❌ Secrets management deployment validation failed"
    fi
}

# Cleanup resources
cleanup_resources() {
    warn "This will remove all secrets management resources. Are you sure?"
    read -p "Type 'yes' to confirm: " confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        log "Cleanup cancelled"
        exit 0
    fi
    
    log "Cleaning up secrets management resources..."
    
    # Remove Kubernetes resources
    kubectl delete secretproviderclass --all -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete serviceaccount secrets-manager-sa -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete clusterrolebinding opsight-staging-secrets-reader --ignore-not-found=true
    kubectl delete clusterrolebinding opsight-production-secrets-reader --ignore-not-found=true
    kubectl delete clusterrole secrets-reader --ignore-not-found=true
    
    # Remove CSI Driver
    kubectl delete -f "$PROJECT_ROOT/k8s/secrets/secrets-store-csi-driver.yaml" --ignore-not-found=true
    
    # Remove AWS secrets (with confirmation)
    warn "Do you want to delete AWS Secrets Manager secrets? (This cannot be undone immediately)"
    read -p "Type 'DELETE_SECRETS' to confirm: " secret_confirmation
    
    if [[ "$secret_confirmation" == "DELETE_SECRETS" ]]; then
        local secrets=("opsight-${ENVIRONMENT}-application-secrets" "opsight-${ENVIRONMENT}-database-secrets" "opsight-${ENVIRONMENT}-monitoring-secrets")
        for secret in "${secrets[@]}"; do
            aws secretsmanager delete-secret --secret-id "$secret" --region "$AWS_REGION" --force-delete-without-recovery &>/dev/null || true
        done
        log "AWS Secrets Manager secrets marked for deletion"
    fi
    
    log "Cleanup completed"
}

# Main execution
main() {
    log "Starting secrets management deployment for environment: $ENVIRONMENT"
    
    # Always check prerequisites
    check_prerequisites
    
    # Execute based on flags
    if [[ "$CLEANUP" == true ]]; then
        cleanup_resources
        exit 0
    fi
    
    if [[ "$INSTALL_CSI" == true ]]; then
        install_csi_driver
    fi
    
    if [[ "$CREATE_SECRETS" == true ]]; then
        create_aws_secrets
    fi
    
    if [[ "$DEPLOY_PROVIDERS" == true ]]; then
        deploy_secret_providers
    fi
    
    if [[ "$SETUP_RBAC" == true ]]; then
        setup_rbac
    fi
    
    if [[ "$UPDATE_HELM" == true ]]; then
        update_helm_chart
    fi
    
    if [[ "$VALIDATE" == true ]]; then
        validate_deployment
    fi
    
    # If no specific actions requested, show usage
    if [[ "$INSTALL_CSI" == false && "$CREATE_SECRETS" == false && "$DEPLOY_PROVIDERS" == false && "$SETUP_RBAC" == false && "$UPDATE_HELM" == false && "$VALIDATE" == false ]]; then
        usage
        exit 0
    fi
    
    log "🎉 Secrets management deployment completed successfully!"
    log "Next steps:"
    log "  1. Verify secrets are accessible in your applications"
    log "  2. Test secret rotation functionality"
    log "  3. Monitor logs for any CSI driver issues"
    log "  4. Update your application deployments to use the new secrets"
}

# Run main function
main "$@" 