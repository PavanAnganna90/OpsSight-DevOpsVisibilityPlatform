#!/bin/bash

# OpsSight Production Infrastructure Deployment Script
# This script deploys the complete production infrastructure for OpsSight

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME=${DOMAIN_NAME:-opssight.dev}
PROJECT_NAME=${PROJECT_NAME:-opssight}
TERRAFORM_STATE_BUCKET=${TERRAFORM_STATE_BUCKET:-opssight-terraform-state}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools
    command -v terraform >/dev/null 2>&1 || missing_tools+=("terraform")
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing_tools+=("helm")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install the missing tools and run this script again."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Function to create Terraform state backend
setup_terraform_backend() {
    print_status "Setting up Terraform state backend..."
    
    # Create S3 bucket for Terraform state
    if ! aws s3 ls "s3://${TERRAFORM_STATE_BUCKET}" >/dev/null 2>&1; then
        print_status "Creating S3 bucket for Terraform state: ${TERRAFORM_STATE_BUCKET}"
        aws s3 mb "s3://${TERRAFORM_STATE_BUCKET}" --region "${AWS_REGION}"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "${TERRAFORM_STATE_BUCKET}" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "${TERRAFORM_STATE_BUCKET}" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
    fi
    
    # Create DynamoDB table for state locking
    if ! aws dynamodb describe-table --table-name terraform-locks >/dev/null 2>&1; then
        print_status "Creating DynamoDB table for Terraform state locking..."
        aws dynamodb create-table \
            --table-name terraform-locks \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "${AWS_REGION}"
        
        # Wait for table to be active
        aws dynamodb wait table-exists --table-name terraform-locks --region "${AWS_REGION}"
    fi
    
    print_success "Terraform backend configured!"
}

# Function to deploy infrastructure with Terraform
deploy_infrastructure() {
    print_status "Deploying AWS infrastructure with Terraform..."
    
    cd infrastructure/aws
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Create terraform.tfvars if it doesn't exist
    if [ ! -f terraform.tfvars ]; then
        print_status "Creating terraform.tfvars from example..."
        cp terraform.tfvars.example terraform.tfvars
        
        print_warning "Please edit terraform.tfvars with your specific values before continuing."
        read -p "Press Enter to continue after editing terraform.tfvars..."
    fi
    
    # Plan the deployment
    print_status "Planning Terraform deployment..."
    terraform plan -out=tfplan -var="environment=${ENVIRONMENT}"
    
    # Apply the deployment
    print_status "Applying Terraform deployment..."
    terraform apply tfplan
    
    # Save outputs
    terraform output -json > terraform-outputs.json
    
    print_success "Infrastructure deployed successfully!"
    
    cd ../..
}

# Function to configure kubectl
configure_kubectl() {
    print_status "Configuring kubectl for EKS cluster..."
    
    local cluster_name="${PROJECT_NAME}-${ENVIRONMENT}"
    
    # Update kubeconfig
    aws eks update-kubeconfig --region "${AWS_REGION}" --name "${cluster_name}"
    
    # Verify connection
    if kubectl cluster-info >/dev/null 2>&1; then
        print_success "Successfully connected to EKS cluster!"
    else
        print_error "Failed to connect to EKS cluster"
        exit 1
    fi
}

# Function to install essential cluster components
install_cluster_components() {
    print_status "Installing essential cluster components..."
    
    # Add Helm repositories
    print_status "Adding Helm repositories..."
    helm repo add aws-load-balancer-controller https://aws.github.io/eks-charts
    helm repo add jetstack https://charts.jetstack.io
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install AWS Load Balancer Controller
    print_status "Installing AWS Load Balancer Controller..."
    helm upgrade --install aws-load-balancer-controller aws-load-balancer-controller/aws-load-balancer-controller \
        --namespace kube-system \
        --set clusterName="${PROJECT_NAME}-${ENVIRONMENT}" \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller \
        --wait
    
    # Install cert-manager
    print_status "Installing cert-manager..."
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version v1.13.0 \
        --set installCRDs=true \
        --wait
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager
    kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager-webhook -n cert-manager
    kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
    
    print_success "Essential cluster components installed!"
}

# Function to deploy certificate management
deploy_certificate_management() {
    print_status "Deploying certificate management..."
    
    # Apply cert-manager configurations
    kubectl apply -f k8s/security/cert-manager-setup.yaml
    
    # Wait for ClusterIssuers to be ready
    print_status "Waiting for ClusterIssuers to be ready..."
    sleep 30
    
    print_success "Certificate management deployed!"
}

# Function to deploy monitoring stack
deploy_monitoring() {
    print_status "Deploying monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Prometheus configuration
    kubectl apply -f k8s/monitoring/advanced-prometheus-config.yaml
    
    # Install Prometheus stack
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --values helm/opsight/values-production.yaml \
        --set prometheus.prometheusSpec.configMaps[0]=prometheus-advanced-config \
        --set prometheus.prometheusSpec.ruleFiles[0]=/etc/prometheus/rules/*.yml \
        --wait
    
    print_success "Monitoring stack deployed!"
}

# Function to deploy OpsSight application
deploy_application() {
    print_status "Deploying OpsSight application..."
    
    # Create application namespace
    kubectl create namespace opsight --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy using Helm
    helm upgrade --install opsight ./helm/opsight \
        --namespace opsight \
        --values helm/opsight/values-production.yaml \
        --set global.environment="${ENVIRONMENT}" \
        --set ingress.hosts[0].host="${DOMAIN_NAME}" \
        --wait
    
    print_success "OpsSight application deployed!"
}

# Function to run post-deployment checks
run_post_deployment_checks() {
    print_status "Running post-deployment checks..."
    
    # Check all pods are running
    print_status "Checking pod status..."
    kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
    
    # Check ingress status
    print_status "Checking ingress status..."
    kubectl get ingress -n opsight
    
    # Check certificate status
    print_status "Checking certificate status..."
    kubectl get certificates -n opsight
    
    # Test application endpoints
    print_status "Testing application endpoints..."
    local app_url="https://${DOMAIN_NAME}"
    
    if curl -k -s "${app_url}/health" >/dev/null; then
        print_success "Application health check passed!"
    else
        print_warning "Application health check failed - this may be normal if DNS is still propagating"
    fi
    
    print_success "Post-deployment checks completed!"
}

# Function to display deployment summary
display_summary() {
    print_success "🎉 Production deployment completed successfully!"
    echo
    echo "=== DEPLOYMENT SUMMARY ==="
    echo "Environment: ${ENVIRONMENT}"
    echo "AWS Region: ${AWS_REGION}"
    echo "Domain: ${DOMAIN_NAME}"
    echo "Project: ${PROJECT_NAME}"
    echo
    echo "=== ACCESS INFORMATION ==="
    echo "Application URL: https://${DOMAIN_NAME}"
    echo "API URL: https://api.${DOMAIN_NAME}"
    echo "Grafana: https://grafana.${DOMAIN_NAME}"
    echo "Prometheus: https://prometheus.${DOMAIN_NAME}"
    echo
    echo "=== USEFUL COMMANDS ==="
    echo "Check pods: kubectl get pods -n opsight"
    echo "Check services: kubectl get services -n opsight"
    echo "Check ingress: kubectl get ingress -n opsight"
    echo "Check certificates: kubectl get certificates -n opsight"
    echo "View logs: kubectl logs -f deployment/opsight-backend -n opsight"
    echo "Port forward: kubectl port-forward service/opsight-frontend 3000:3000 -n opsight"
    echo
    echo "=== MONITORING ==="
    echo "Prometheus: kubectl port-forward service/prometheus-server 9090:80 -n monitoring"
    echo "Grafana: kubectl port-forward service/grafana 3001:80 -n monitoring"
    echo "AlertManager: kubectl port-forward service/alertmanager 9093:9093 -n monitoring"
    echo
    print_warning "Note: DNS propagation may take up to 24 hours. If the domain is not accessible,"
    print_warning "you can use port-forwarding or the ALB DNS name in the meantime."
}

# Main deployment function
main() {
    echo "🚀 OpsSight Production Infrastructure Deployment"
    echo "=============================================="
    echo
    
    # Confirm deployment
    read -p "This will deploy the complete production infrastructure. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled."
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    setup_terraform_backend
    deploy_infrastructure
    configure_kubectl
    install_cluster_components
    deploy_certificate_management
    deploy_monitoring
    deploy_application
    run_post_deployment_checks
    display_summary
    
    print_success "🎉 Production deployment completed successfully!"
}

# Handle script interruption
cleanup() {
    print_warning "Deployment interrupted. You may need to clean up resources manually."
    exit 1
}

trap cleanup INT TERM

# Run main function
main "$@"