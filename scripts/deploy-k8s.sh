#!/bin/bash

# OpsSight Kubernetes Deployment Script
# Reason: Automated deployment script for OpsSight platform on Kubernetes

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-opsight}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
HELM_RELEASE_NAME="${HELM_RELEASE_NAME:-opsight}"
KUBECTL_CONTEXT="${KUBECTL_CONTEXT:-}"

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

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install Helm 3.8+ first."
        exit 1
    fi
    
    # Check kubectl context
    if [[ -n "$KUBECTL_CONTEXT" ]]; then
        kubectl config use-context "$KUBECTL_CONTEXT"
    fi
    
    # Verify cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to deploy using Helm
deploy_helm() {
    log_info "Deploying OpsSight using Helm..."
    
    # Add required Helm repositories
    log_info "Adding Helm repositories..."
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Update chart dependencies
    log_info "Updating chart dependencies..."
    helm dependency update ./helm/opsight
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy based on environment
    local values_file=""
    case "$ENVIRONMENT" in
        "staging")
            values_file="./helm/opsight/values-staging.yaml"
            ;;
        "production")
            values_file="./helm/opsight/values-production.yaml"
            ;;
        *)
            values_file="./helm/opsight/values.yaml"
            ;;
    esac
    
    log_info "Deploying with values file: $values_file"
    
    # Install or upgrade the Helm release
    if helm list -n "$NAMESPACE" | grep -q "$HELM_RELEASE_NAME"; then
        log_info "Upgrading existing Helm release..."
        helm upgrade "$HELM_RELEASE_NAME" ./helm/opsight \
            --namespace "$NAMESPACE" \
            --values "$values_file" \
            --wait \
            --timeout 10m
    else
        log_info "Installing new Helm release..."
        helm install "$HELM_RELEASE_NAME" ./helm/opsight \
            --namespace "$NAMESPACE" \
            --values "$values_file" \
            --wait \
            --timeout 10m \
            --create-namespace
    fi
    
    log_success "Helm deployment completed"
}

# Function to deploy using raw Kubernetes manifests
deploy_manifests() {
    log_info "Deploying OpsSight using Kubernetes manifests..."
    
    # Create namespaces
    kubectl apply -f k8s/namespaces/
    
    # Deploy base manifests
    kubectl apply -f k8s/base/
    
    # Deploy environment-specific manifests
    if [[ -d "k8s/$ENVIRONMENT" ]]; then
        kubectl apply -f "k8s/$ENVIRONMENT/"
    fi
    
    log_success "Manifest deployment completed"
}

# Function to verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment -l app.kubernetes.io/name=opsight -n "$NAMESPACE"
    
    # Check pod status
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=opsight
    
    # Check services
    log_info "Checking services..."
    kubectl get services -n "$NAMESPACE" -l app.kubernetes.io/name=opsight
    
    # Check ingress
    if kubectl get ingress -n "$NAMESPACE" &> /dev/null; then
        log_info "Checking ingress..."
        kubectl get ingress -n "$NAMESPACE"
    fi
    
    log_success "Deployment verification completed"
}

# Function to show deployment status
show_status() {
    log_info "OpsSight Deployment Status:"
    echo
    
    # Show Helm releases
    if command -v helm &> /dev/null; then
        echo "Helm Releases:"
        helm list -n "$NAMESPACE" || true
        echo
    fi
    
    # Show pods
    echo "Pods:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=opsight || true
    echo
    
    # Show services
    echo "Services:"
    kubectl get services -n "$NAMESPACE" -l app.kubernetes.io/name=opsight || true
    echo
    
    # Show ingress
    echo "Ingress:"
    kubectl get ingress -n "$NAMESPACE" || true
    echo
    
    # Show endpoints
    echo "Endpoints:"
    if kubectl get ingress -n "$NAMESPACE" &> /dev/null; then
        local ingress_host=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "Not configured")
        echo "Frontend: https://$ingress_host"
        echo "Backend API: https://$ingress_host/api"
    else
        echo "Ingress not configured. Use port-forward to access services:"
        echo "kubectl port-forward -n $NAMESPACE service/opsight-frontend 3000:3000"
        echo "kubectl port-forward -n $NAMESPACE service/opsight-backend 8000:8000"
    fi
}

# Function to clean up deployment
cleanup() {
    log_warning "Cleaning up OpsSight deployment..."
    
    if [[ "$1" == "helm" ]]; then
        helm uninstall "$HELM_RELEASE_NAME" -n "$NAMESPACE" || true
    else
        kubectl delete -f k8s/base/ || true
        if [[ -d "k8s/$ENVIRONMENT" ]]; then
            kubectl delete -f "k8s/$ENVIRONMENT/" || true
        fi
    fi
    
    # Optionally delete namespace
    read -p "Delete namespace $NAMESPACE? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete namespace "$NAMESPACE" || true
    fi
    
    log_success "Cleanup completed"
}

# Main function
main() {
    local action="${1:-deploy}"
    local method="${2:-helm}"
    
    case "$action" in
        "deploy")
            check_prerequisites
            if [[ "$method" == "helm" ]]; then
                deploy_helm
            else
                deploy_manifests
            fi
            verify_deployment
            show_status
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup "$method"
            ;;
        "verify")
            verify_deployment
            ;;
        *)
            echo "Usage: $0 {deploy|status|cleanup|verify} [helm|manifests]"
            echo
            echo "Commands:"
            echo "  deploy    - Deploy OpsSight (default: helm)"
            echo "  status    - Show deployment status"
            echo "  cleanup   - Remove OpsSight deployment"
            echo "  verify    - Verify deployment health"
            echo
            echo "Methods:"
            echo "  helm      - Use Helm chart (default)"
            echo "  manifests - Use raw Kubernetes manifests"
            echo
            echo "Environment Variables:"
            echo "  NAMESPACE           - Kubernetes namespace (default: opsight)"
            echo "  ENVIRONMENT         - Environment (staging|production, default: staging)"
            echo "  HELM_RELEASE_NAME   - Helm release name (default: opsight)"
            echo "  KUBECTL_CONTEXT     - Kubectl context to use"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 