#!/bin/bash

# OpsSight Monitoring Stack Deployment Script
# Deploys Prometheus, Grafana, AlertManager, and Fluent Bit to Kubernetes cluster

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONITORING_DIR="$PROJECT_ROOT/k8s/monitoring"
LOGGING_DIR="$PROJECT_ROOT/k8s/logging"
NAMESPACE="monitoring"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if monitoring directory exists
    if [[ ! -d "$MONITORING_DIR" ]]; then
        print_error "Monitoring manifests directory not found: $MONITORING_DIR"
        exit 1
    fi
    
    # Check if logging directory exists
    if [[ ! -d "$LOGGING_DIR" ]]; then
        print_error "Logging manifests directory not found: $LOGGING_DIR"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to create namespace
create_namespace() {
    print_header "Creating monitoring namespace..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_warning "Namespace '$NAMESPACE' already exists"
    else
        kubectl apply -f "$PROJECT_ROOT/k8s/namespaces/monitoring.yaml"
        print_status "Created namespace '$NAMESPACE'"
    fi
}

# Function to deploy Prometheus
deploy_prometheus() {
    print_header "Deploying Prometheus..."
    
    # Apply RBAC first
    kubectl apply -f "$MONITORING_DIR/prometheus-rbac.yaml"
    print_status "Applied Prometheus RBAC"
    
    # Apply configuration
    kubectl apply -f "$MONITORING_DIR/prometheus-config.yaml"
    print_status "Applied Prometheus configuration"
    
    # Apply alerting rules
    kubectl apply -f "$MONITORING_DIR/prometheus-rules.yaml"
    print_status "Applied Prometheus alerting rules"
    
    # Deploy Prometheus
    kubectl apply -f "$MONITORING_DIR/prometheus-deployment.yaml"
    print_status "Deployed Prometheus"
    
    # Wait for Prometheus to be ready
    print_status "Waiting for Prometheus to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n "$NAMESPACE"
    print_status "Prometheus is ready"
}

# Function to deploy AlertManager
deploy_alertmanager() {
    print_header "Deploying AlertManager..."
    
    # Apply configuration
    kubectl apply -f "$MONITORING_DIR/alertmanager-config.yaml"
    print_status "Applied AlertManager configuration"
    
    # Deploy AlertManager
    kubectl apply -f "$MONITORING_DIR/alertmanager-deployment.yaml"
    print_status "Deployed AlertManager"
    
    # Wait for AlertManager to be ready
    print_status "Waiting for AlertManager to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/alertmanager -n "$NAMESPACE"
    print_status "AlertManager is ready"
}

# Function to deploy Grafana
deploy_grafana() {
    print_header "Deploying Grafana..."
    
    # Apply configuration and dashboards
    kubectl apply -f "$MONITORING_DIR/grafana-config.yaml"
    kubectl apply -f "$MONITORING_DIR/grafana-dashboards.yaml"
    print_status "Applied Grafana configuration and dashboards"
    
    # Deploy Grafana
    kubectl apply -f "$MONITORING_DIR/grafana-deployment.yaml"
    print_status "Deployed Grafana"
    
    # Wait for Grafana to be ready
    print_status "Waiting for Grafana to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n "$NAMESPACE"
    print_status "Grafana is ready"
}

# Function to deploy Fluent Bit
deploy_fluentbit() {
    print_header "Deploying Fluent Bit..."
    
    # Apply RBAC
    kubectl apply -f "$LOGGING_DIR/fluent-bit-rbac.yaml"
    print_status "Applied Fluent Bit RBAC"
    
    # Apply configuration
    kubectl apply -f "$LOGGING_DIR/fluent-bit-config.yaml"
    print_status "Applied Fluent Bit configuration"
    
    # Deploy Fluent Bit DaemonSet
    kubectl apply -f "$LOGGING_DIR/fluent-bit-daemonset.yaml"
    print_status "Deployed Fluent Bit DaemonSet"
    
    # Wait for Fluent Bit pods to be ready
    print_status "Waiting for Fluent Bit pods to be ready..."
    kubectl rollout status daemonset/fluent-bit -n "$NAMESPACE" --timeout=300s
    print_status "Fluent Bit is ready"
}

# Function to verify deployment
verify_deployment() {
    print_header "Verifying deployment..."
    
    # Check all pods are running
    echo "Pod status:"
    kubectl get pods -n "$NAMESPACE" -o wide
    
    # Check services
    echo -e "\nService status:"
    kubectl get services -n "$NAMESPACE"
    
    # Check persistent volumes
    echo -e "\nPersistent Volume Claims:"
    kubectl get pvc -n "$NAMESPACE"
    
    # Get access information
    echo -e "\n${GREEN}Access Information:${NC}"
    
    # Prometheus
    PROMETHEUS_PORT=$(kubectl get svc prometheus -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')
    echo "Prometheus: kubectl port-forward -n $NAMESPACE svc/prometheus $PROMETHEUS_PORT:$PROMETHEUS_PORT"
    echo "Then access: http://localhost:$PROMETHEUS_PORT"
    
    # Grafana
    GRAFANA_PORT=$(kubectl get svc grafana -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')
    echo "Grafana: kubectl port-forward -n $NAMESPACE svc/grafana $GRAFANA_PORT:$GRAFANA_PORT"
    echo "Then access: http://localhost:$GRAFANA_PORT"
    echo "Default credentials: admin/opsight"
    
    # AlertManager
    ALERTMANAGER_PORT=$(kubectl get svc alertmanager -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')
    echo "AlertManager: kubectl port-forward -n $NAMESPACE svc/alertmanager $ALERTMANAGER_PORT:$ALERTMANAGER_PORT"
    echo "Then access: http://localhost:$ALERTMANAGER_PORT"
    
    print_status "Deployment verification completed"
}

# Function to clean up deployment
cleanup() {
    print_header "Cleaning up monitoring stack..."
    
    # Delete in reverse order
    kubectl delete -f "$LOGGING_DIR/fluent-bit-daemonset.yaml" --ignore-not-found=true
    kubectl delete -f "$LOGGING_DIR/fluent-bit-config.yaml" --ignore-not-found=true
    kubectl delete -f "$LOGGING_DIR/fluent-bit-rbac.yaml" --ignore-not-found=true
    
    kubectl delete -f "$MONITORING_DIR/grafana-deployment.yaml" --ignore-not-found=true
    kubectl delete -f "$MONITORING_DIR/grafana-dashboards.yaml" --ignore-not-found=true
    kubectl delete -f "$MONITORING_DIR/grafana-config.yaml" --ignore-not-found=true
    
    kubectl delete -f "$MONITORING_DIR/alertmanager-deployment.yaml" --ignore-not-found=true
    kubectl delete -f "$MONITORING_DIR/alertmanager-config.yaml" --ignore-not-found=true
    
    kubectl delete -f "$MONITORING_DIR/prometheus-deployment.yaml" --ignore-not-found=true
    kubectl delete -f "$MONITORING_DIR/prometheus-rules.yaml" --ignore-not-found=true
    kubectl delete -f "$MONITORING_DIR/prometheus-config.yaml" --ignore-not-found=true
    kubectl delete -f "$MONITORING_DIR/prometheus-rbac.yaml" --ignore-not-found=true
    
    print_status "Cleanup completed"
}

# Function to show usage
usage() {
    echo "Usage: $0 [deploy|verify|cleanup|help]"
    echo ""
    echo "Commands:"
    echo "  deploy   - Deploy the complete monitoring stack"
    echo "  verify   - Verify existing deployment status"
    echo "  cleanup  - Remove the monitoring stack"
    echo "  help     - Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  NAMESPACE - Kubernetes namespace (default: monitoring)"
}

# Main execution
main() {
    local command="${1:-deploy}"
    
    case "$command" in
        "deploy")
            print_header "Starting OpsSight Monitoring Stack Deployment"
            check_prerequisites
            create_namespace
            deploy_prometheus
            deploy_alertmanager
            deploy_grafana
            deploy_fluentbit
            verify_deployment
            print_status "Monitoring stack deployment completed successfully!"
            ;;
        "verify")
            print_header "Verifying OpsSight Monitoring Stack"
            verify_deployment
            ;;
        "cleanup")
            print_header "Cleaning up OpsSight Monitoring Stack"
            cleanup
            ;;
        "help"|"-h"|"--help")
            usage
            ;;
        *)
            print_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'print_error "Script interrupted"; exit 1' INT TERM

# Execute main function
main "$@" 