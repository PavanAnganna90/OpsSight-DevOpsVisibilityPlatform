#!/bin/bash

# Production Application Deployment Script
# Deploys OpsSight application to production EKS cluster

set -euo pipefail

# Configuration
CLUSTER_NAME="opssight-production"
REGION="us-east-1"
NAMESPACE="opssight-production"
DEPLOYMENT_DIR="k8s/overlays/production"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl."
        exit 1
    fi
    
    # Check if aws cli is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install AWS CLI."
        exit 1
    fi
    
    # Check if kustomize is installed
    if ! command -v kustomize &> /dev/null; then
        log_error "kustomize is not installed. Please install kustomize."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install helm."
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Configure kubectl
configure_kubectl() {
    log_info "Configuring kubectl for EKS cluster..."
    
    # Update kubeconfig
    aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME" --alias "$CLUSTER_NAME"
    
    # Test connection
    if kubectl cluster-info --context "$CLUSTER_NAME" &> /dev/null; then
        log_success "Successfully connected to cluster $CLUSTER_NAME"
    else
        log_error "Failed to connect to cluster $CLUSTER_NAME"
        exit 1
    fi
    
    # Set default context
    kubectl config use-context "$CLUSTER_NAME"
}

# Wait for cluster to be ready
wait_for_cluster() {
    log_info "Waiting for EKS cluster to be active..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local status=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$REGION" --query 'cluster.status' --output text)
        
        if [ "$status" = "ACTIVE" ]; then
            log_success "EKS cluster is active"
            break
        elif [ "$status" = "FAILED" ] || [ "$status" = "DELETING" ]; then
            log_error "EKS cluster is in failed state: $status"
            exit 1
        else
            log_info "Cluster status: $status (attempt $attempt/$max_attempts)"
            sleep 30
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Cluster did not become active within expected time"
        exit 1
    fi
}

# Install cert-manager
install_cert_manager() {
    log_info "Installing cert-manager..."
    
    # Add cert-manager helm repository
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Create cert-manager namespace
    kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -
    
    # Install cert-manager
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --version v1.13.2 \
        --set installCRDs=true \
        --wait
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s
    
    log_success "cert-manager installed successfully"
}

# Install ingress controller
install_ingress_controller() {
    log_info "Installing AWS Load Balancer Controller..."
    
    # Create service account
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: aws-load-balancer-controller
  name: aws-load-balancer-controller
  namespace: kube-system
EOF
    
    # Add helm repository
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    
    # Install AWS Load Balancer Controller
    helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName="$CLUSTER_NAME" \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller \
        --wait
    
    log_success "AWS Load Balancer Controller installed successfully"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    # Create monitoring namespace
    kubectl apply -f k8s/namespaces/monitoring.yaml
    
    # Deploy Prometheus
    kubectl apply -f k8s/monitoring/prometheus-rbac.yaml
    kubectl apply -f k8s/monitoring/prometheus-config.yaml
    kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
    
    # Deploy Grafana
    kubectl apply -f k8s/monitoring/grafana-config.yaml
    kubectl apply -f k8s/monitoring/grafana-dashboards.yaml
    kubectl apply -f k8s/monitoring/grafana-deployment.yaml
    
    # Deploy AlertManager
    kubectl apply -f k8s/monitoring/alertmanager-config.yaml
    kubectl apply -f k8s/monitoring/alertmanager-deployment.yaml
    
    # Wait for monitoring stack to be ready
    kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=300s
    kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s
    
    log_success "Monitoring stack deployed successfully"
}

# Deploy application
deploy_application() {
    log_info "Deploying OpsSight application..."
    
    # Build and apply kustomization
    kustomize build "$DEPLOYMENT_DIR" | kubectl apply -f -
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=progressing deployment -l app=opssight-backend -n "$NAMESPACE" --timeout=600s
    kubectl wait --for=condition=progressing deployment -l app=opssight-frontend -n "$NAMESPACE" --timeout=600s
    
    # Wait for all pods to be ready
    kubectl wait --for=condition=ready pod -l app=opssight-backend -n "$NAMESPACE" --timeout=600s
    kubectl wait --for=condition=ready pod -l app=opssight-frontend -n "$NAMESPACE" --timeout=600s
    
    log_success "Application deployed successfully"
}

# Configure SSL certificates
configure_ssl() {
    log_info "Configuring SSL certificates..."
    
    # Apply cert-manager cluster issuer
    kubectl apply -f k8s/security/cert-manager-setup.yaml
    
    # Wait for cluster issuer to be ready
    sleep 30
    
    log_success "SSL certificates configured"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check namespace
    kubectl get namespace "$NAMESPACE"
    
    # Check deployments
    kubectl get deployments -n "$NAMESPACE"
    
    # Check pods
    kubectl get pods -n "$NAMESPACE"
    
    # Check services
    kubectl get services -n "$NAMESPACE"
    
    # Check ingress
    kubectl get ingress -n "$NAMESPACE"
    
    # Get application URLs
    log_info "Getting application URLs..."
    local ingress_host=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")
    
    if [ "$ingress_host" != "Pending..." ]; then
        log_success "Application is available at: https://$ingress_host"
    else
        log_warning "Ingress is still provisioning. Check again in a few minutes."
    fi
    
    log_success "Deployment verification completed"
}

# Generate deployment summary
generate_summary() {
    log_info "Generating deployment summary..."
    
    cat > deployment-summary.txt <<EOF
OpsSight Production Deployment Summary
=====================================

Deployment Date: $(date)
Cluster: $CLUSTER_NAME
Region: $REGION
Namespace: $NAMESPACE

Infrastructure Status:
- VPC: $(terraform output -json 2>/dev/null | jq -r '.vpc_id.value // "N/A"')
- EKS Cluster: $CLUSTER_NAME
- RDS Database: $(terraform output -json 2>/dev/null | jq -r '.rds_endpoint.value // "N/A"')
- Redis Cache: $(terraform output -json 2>/dev/null | jq -r '.elasticache_endpoint.value // "N/A"')

Application Components:
- Backend Pods: $(kubectl get pods -n "$NAMESPACE" -l app=opssight-backend --no-headers 2>/dev/null | wc -l || echo "0")
- Frontend Pods: $(kubectl get pods -n "$NAMESPACE" -l app=opssight-frontend --no-headers 2>/dev/null | wc -l || echo "0")
- Services: $(kubectl get services -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")

Monitoring:
- Prometheus: $(kubectl get pods -n monitoring -l app=prometheus --no-headers 2>/dev/null | grep -c Running || echo "0") pods running
- Grafana: $(kubectl get pods -n monitoring -l app=grafana --no-headers 2>/dev/null | grep -c Running || echo "0") pods running

Access URLs:
- Application: https://$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")
- Grafana: https://$(kubectl get ingress -n monitoring -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")

Next Steps:
1. Configure DNS records
2. Set up production monitoring alerts
3. Configure backup procedures
4. Execute production health checks
EOF
    
    log_success "Deployment summary saved to deployment-summary.txt"
    cat deployment-summary.txt
}

# Main deployment function
main() {
    log_info "Starting production deployment for OpsSight..."
    
    check_prerequisites
    wait_for_cluster
    configure_kubectl
    install_cert_manager
    install_ingress_controller
    deploy_monitoring
    deploy_application
    configure_ssl
    verify_deployment
    generate_summary
    
    log_success "Production deployment completed successfully!"
    log_info "Please review deployment-summary.txt for details"
}

# Error handling
trap 'log_error "Deployment failed on line $LINENO. Exit code: $?"' ERR

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi