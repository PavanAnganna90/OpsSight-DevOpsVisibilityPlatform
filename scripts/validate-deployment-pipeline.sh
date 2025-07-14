#!/bin/bash

# OpsSight Deployment Pipeline End-to-End Validation Script
# This script performs comprehensive testing of the entire deployment pipeline
# Author: OpsSight Development Team
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure"
HELM_CHART_DIR="$PROJECT_ROOT/helm/opsight"
K8S_MANIFESTS_DIR="$PROJECT_ROOT/k8s"
TEMP_DIR="/tmp/opsight-validation-$$"
LOG_FILE="$TEMP_DIR/validation.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Default values
ENVIRONMENT="${ENVIRONMENT:-staging}"
CLUSTER_NAME="${CLUSTER_NAME:-opsight-eks-cluster}"
AWS_REGION="${AWS_REGION:-us-west-2}"
SKIP_DESTRUCTIVE="${SKIP_DESTRUCTIVE:-true}"
VERBOSE="${VERBOSE:-false}"
TIMEOUT="${TIMEOUT:-300}"

# Functions
print_header() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}  OpsSight Deployment Pipeline Validation${NC}"
    echo -e "${CYAN}  Environment: $ENVIRONMENT${NC}"
    echo -e "${CYAN}  Cluster: $CLUSTER_NAME${NC}"
    echo -e "${CYAN}  Region: $AWS_REGION${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
}

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case "$level" in
        "INFO")  echo -e "${BLUE}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message"; ((WARNINGS++)) ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        "DEBUG") [ "$VERBOSE" = "true" ] && echo -e "${PURPLE}[DEBUG]${NC} $message" ;;
    esac
}

test_result() {
    local test_name="$1"
    local result="$2"
    local details="${3:-}"
    
    ((TOTAL_TESTS++))
    
    if [ "$result" = "PASS" ]; then
        ((PASSED_TESTS++))
        log "SUCCESS" "✅ $test_name"
        [ -n "$details" ] && log "DEBUG" "   Details: $details"
    else
        ((FAILED_TESTS++))
        log "ERROR" "❌ $test_name"
        [ -n "$details" ] && log "ERROR" "   Details: $details"
    fi
}

run_command() {
    local description="$1"
    shift
    local cmd="$*"
    
    log "DEBUG" "Running: $cmd"
    
    if [ "$VERBOSE" = "true" ]; then
        if eval "$cmd"; then
            return 0
        else
            return 1
        fi
    else
        if eval "$cmd" >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    fi
}

wait_for_condition() {
    local description="$1"
    local condition="$2"
    local timeout="$3"
    local interval="${4:-5}"
    
    log "INFO" "Waiting for: $description (timeout: ${timeout}s)"
    
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if eval "$condition" >/dev/null 2>&1; then
            log "SUCCESS" "Condition met: $description"
            return 0
        fi
        sleep "$interval"
        elapsed=$((elapsed + interval))
        [ $((elapsed % 30)) -eq 0 ] && log "DEBUG" "Still waiting for: $description (${elapsed}s elapsed)"
    done
    
    log "ERROR" "Timeout waiting for: $description"
    return 1
}

cleanup() {
    log "INFO" "Cleaning up temporary files..."
    [ -d "$TEMP_DIR" ] && rm -rf "$TEMP_DIR"
}

# Prerequisites validation
validate_prerequisites() {
    log "INFO" "🔍 Validating prerequisites..."
    
    local required_tools=("aws" "kubectl" "helm" "terraform" "jq" "curl")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        test_result "Required tools installed" "FAIL" "Missing: ${missing_tools[*]}"
        log "ERROR" "Please install missing tools: ${missing_tools[*]}"
        exit 1
    else
        test_result "Required tools installed" "PASS" "All required tools available"
    fi
    
    # Validate AWS credentials
    if run_command "AWS credentials check" "aws sts get-caller-identity"; then
        test_result "AWS credentials configured" "PASS"
    else
        test_result "AWS credentials configured" "FAIL"
        exit 1
    fi
    
    # Validate Terraform workspace
    if [ -f "$TERRAFORM_DIR/terraform.tfstate" ] || [ -n "${TF_WORKSPACE:-}" ]; then
        test_result "Terraform state available" "PASS"
    else
        test_result "Terraform state available" "FAIL" "No terraform.tfstate found and TF_WORKSPACE not set"
    fi
}

# Infrastructure validation
validate_infrastructure() {
    log "INFO" "🏗️  Validating infrastructure..."
    
    cd "$TERRAFORM_DIR"
    
    # Terraform plan
    if run_command "Terraform plan" "terraform plan -detailed-exitcode"; then
        local exit_code=$?
        if [ $exit_code -eq 0 ]; then
            test_result "Infrastructure up-to-date" "PASS" "No changes required"
        elif [ $exit_code -eq 2 ]; then
            test_result "Infrastructure drift detected" "FAIL" "Changes required"
        fi
    else
        test_result "Terraform plan execution" "FAIL"
    fi
    
    # Validate key AWS resources
    local vpc_id
    vpc_id=$(terraform output -raw vpc_id 2>/dev/null || echo "")
    if [ -n "$vpc_id" ] && aws ec2 describe-vpcs --vpc-ids "$vpc_id" >/dev/null 2>&1; then
        test_result "VPC exists" "PASS" "VPC ID: $vpc_id"
    else
        test_result "VPC exists" "FAIL"
    fi
    
    local cluster_name
    cluster_name=$(terraform output -raw cluster_name 2>/dev/null || echo "$CLUSTER_NAME")
    if aws eks describe-cluster --name "$cluster_name" >/dev/null 2>&1; then
        test_result "EKS cluster exists" "PASS" "Cluster: $cluster_name"
    else
        test_result "EKS cluster exists" "FAIL"
    fi
    
    cd "$PROJECT_ROOT"
}

# Kubernetes cluster validation
validate_kubernetes() {
    log "INFO" "☸️  Validating Kubernetes cluster..."
    
    # Update kubeconfig
    if run_command "Update kubeconfig" "aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME"; then
        test_result "Kubeconfig updated" "PASS"
    else
        test_result "Kubeconfig updated" "FAIL"
        return 1
    fi
    
    # Cluster connectivity
    if run_command "Cluster connectivity" "kubectl cluster-info"; then
        test_result "Kubernetes API accessible" "PASS"
    else
        test_result "Kubernetes API accessible" "FAIL"
        return 1
    fi
    
    # Node readiness
    local ready_nodes
    ready_nodes=$(kubectl get nodes --no-headers 2>/dev/null | grep -c "Ready" || echo "0")
    if [ "$ready_nodes" -gt 0 ]; then
        test_result "Nodes ready" "PASS" "$ready_nodes nodes ready"
    else
        test_result "Nodes ready" "FAIL"
    fi
    
    # System pods
    local system_pods_ready
    system_pods_ready=$(kubectl get pods -n kube-system --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    local total_system_pods
    total_system_pods=$(kubectl get pods -n kube-system --no-headers 2>/dev/null | wc -l || echo "1")
    
    if [ "$system_pods_ready" -eq "$total_system_pods" ] && [ "$total_system_pods" -gt 0 ]; then
        test_result "System pods running" "PASS" "$system_pods_ready/$total_system_pods pods running"
    else
        test_result "System pods running" "FAIL" "$system_pods_ready/$total_system_pods pods running"
    fi
    
    # AWS Load Balancer Controller
    if kubectl get deployment -n kube-system aws-load-balancer-controller >/dev/null 2>&1; then
        local alb_ready
        alb_ready=$(kubectl get deployment -n kube-system aws-load-balancer-controller -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [ "$alb_ready" -gt 0 ]; then
            test_result "AWS Load Balancer Controller ready" "PASS"
        else
            test_result "AWS Load Balancer Controller ready" "FAIL"
        fi
    else
        test_result "AWS Load Balancer Controller installed" "FAIL"
    fi
    
    # EBS CSI Driver
    if kubectl get daemonset -n kube-system ebs-csi-node >/dev/null 2>&1; then
        test_result "EBS CSI Driver installed" "PASS"
    else
        test_result "EBS CSI Driver installed" "FAIL"
    fi
}

# Secrets management validation
validate_secrets_management() {
    log "INFO" "🔐 Validating secrets management..."
    
    # Run dedicated secrets validation script
    if [ -f "$SCRIPT_DIR/validate-secrets-management.sh" ]; then
        if "$SCRIPT_DIR/validate-secrets-management.sh" --environment "$ENVIRONMENT" --quiet; then
            test_result "Secrets management validation" "PASS"
        else
            test_result "Secrets management validation" "FAIL"
        fi
    else
        log "WARN" "Secrets validation script not found"
        
        # Basic secrets validation
        if kubectl get csidriver secrets-store.csi.k8s.io >/dev/null 2>&1; then
            test_result "Secrets Store CSI Driver installed" "PASS"
        else
            test_result "Secrets Store CSI Driver installed" "FAIL"
        fi
    fi
}

# Application deployment testing
test_application_deployment() {
    log "INFO" "🚀 Testing application deployment..."
    
    local test_namespace="opsight-test-$$"
    local cleanup_namespace=true
    
    # Create test namespace
    if run_command "Create test namespace" "kubectl create namespace $test_namespace"; then
        test_result "Test namespace created" "PASS" "Namespace: $test_namespace"
    else
        test_result "Test namespace created" "FAIL"
        return 1
    fi
    
    # Deploy using Helm
    cd "$HELM_CHART_DIR"
    
    local release_name="opsight-test-$$"
    if run_command "Helm install" "helm install $release_name . -n $test_namespace --set environment=test --set image.tag=latest --timeout ${TIMEOUT}s"; then
        test_result "Helm deployment" "PASS"
    else
        test_result "Helm deployment" "FAIL"
        cleanup_namespace=false
    fi
    
    # Wait for pods to be ready
    if wait_for_condition "All pods ready" "kubectl get pods -n $test_namespace --no-headers | grep -v Completed | grep -qv 'Running\|Succeeded'" "$TIMEOUT"; then
        test_result "Application pods ready" "FAIL" "Timeout waiting for pods"
    else
        local running_pods
        running_pods=$(kubectl get pods -n $test_namespace --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        test_result "Application pods ready" "PASS" "$running_pods pods running"
    fi
    
    # Test service connectivity
    local frontend_service
    frontend_service=$(kubectl get service -n "$test_namespace" -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$frontend_service" ]; then
        if run_command "Frontend service port-forward" "timeout 10 kubectl port-forward service/$frontend_service 8080:80 -n $test_namespace &"; then
            sleep 2
            if curl -s http://localhost:8080 >/dev/null; then
                test_result "Frontend service connectivity" "PASS"
            else
                test_result "Frontend service connectivity" "FAIL"
            fi
            pkill -f "kubectl port-forward" || true
        else
            test_result "Frontend service port-forward" "FAIL"
        fi
    else
        test_result "Frontend service exists" "FAIL"
    fi
    
    # Test horizontal pod autoscaler
    if kubectl get hpa -n "$test_namespace" >/dev/null 2>&1; then
        test_result "HPA configured" "PASS"
    else
        test_result "HPA configured" "FAIL"
    fi
    
    # Cleanup test deployment
    if [ "$cleanup_namespace" = true ]; then
        if run_command "Cleanup test deployment" "helm uninstall $release_name -n $test_namespace && kubectl delete namespace $test_namespace"; then
            test_result "Test deployment cleanup" "PASS"
        else
            test_result "Test deployment cleanup" "FAIL"
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# Monitoring validation
validate_monitoring() {
    log "INFO" "📊 Validating monitoring stack..."
    
    # Check monitoring namespace
    if kubectl get namespace monitoring >/dev/null 2>&1; then
        test_result "Monitoring namespace exists" "PASS"
    else
        test_result "Monitoring namespace exists" "FAIL"
        return 1
    fi
    
    # Prometheus
    if kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus >/dev/null 2>&1; then
        local prometheus_ready
        prometheus_ready=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        if [ "$prometheus_ready" -gt 0 ]; then
            test_result "Prometheus running" "PASS"
        else
            test_result "Prometheus running" "FAIL"
        fi
    else
        test_result "Prometheus installed" "FAIL"
    fi
    
    # Grafana
    if kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana >/dev/null 2>&1; then
        local grafana_ready
        grafana_ready=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        if [ "$grafana_ready" -gt 0 ]; then
            test_result "Grafana running" "PASS"
        else
            test_result "Grafana running" "FAIL"
        fi
    else
        test_result "Grafana installed" "FAIL"
    fi
    
    # AlertManager
    if kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager >/dev/null 2>&1; then
        test_result "AlertManager installed" "PASS"
    else
        test_result "AlertManager installed" "FAIL"
    fi
    
    # ServiceMonitors
    local service_monitors
    service_monitors=$(kubectl get servicemonitors -n monitoring 2>/dev/null | wc -l || echo "0")
    if [ "$service_monitors" -gt 1 ]; then  # More than header line
        test_result "ServiceMonitors configured" "PASS" "$((service_monitors - 1)) ServiceMonitors found"
    else
        test_result "ServiceMonitors configured" "FAIL"
    fi
}

# CI/CD pipeline testing
test_cicd_pipeline() {
    log "INFO" "🔄 Validating CI/CD pipeline configuration..."
    
    # Check GitHub Actions workflows
    local workflows_dir="$PROJECT_ROOT/.github/workflows"
    if [ -d "$workflows_dir" ]; then
        local workflow_count
        workflow_count=$(find "$workflows_dir" -name "*.yml" -o -name "*.yaml" | wc -l)
        if [ "$workflow_count" -gt 0 ]; then
            test_result "GitHub Actions workflows present" "PASS" "$workflow_count workflows found"
        else
            test_result "GitHub Actions workflows present" "FAIL"
        fi
    else
        test_result "GitHub Actions workflows directory" "FAIL"
    fi
    
    # Validate workflow syntax (basic YAML validation)
    if [ -d "$workflows_dir" ]; then
        local yaml_valid=true
        for workflow_file in "$workflows_dir"/*.{yml,yaml}; do
            [ -f "$workflow_file" ] || continue
            if ! python3 -c "import yaml; yaml.safe_load(open('$workflow_file'))" 2>/dev/null; then
                yaml_valid=false
                log "ERROR" "Invalid YAML syntax in: $(basename "$workflow_file")"
            fi
        done
        
        if [ "$yaml_valid" = true ]; then
            test_result "Workflow YAML syntax valid" "PASS"
        else
            test_result "Workflow YAML syntax valid" "FAIL"
        fi
    fi
    
    # Check for required workflow files
    local required_workflows=("ci.yml" "build-and-push.yml" "deploy-staging.yml" "deploy-production.yml" "infrastructure.yml")
    for workflow in "${required_workflows[@]}"; do
        if [ -f "$workflows_dir/$workflow" ]; then
            test_result "Workflow file: $workflow" "PASS"
        else
            test_result "Workflow file: $workflow" "FAIL"
        fi
    done
}

# Security testing
validate_security() {
    log "INFO" "🛡️  Validating security configuration..."
    
    # RBAC validation
    if kubectl auth can-i list pods --as=system:serviceaccount:default:default >/dev/null 2>&1; then
        test_result "RBAC overly permissive" "FAIL" "Default service account has excessive permissions"
    else
        test_result "RBAC properly configured" "PASS"
    fi
    
    # Network policies (if enabled)
    local network_policies
    network_policies=$(kubectl get networkpolicies --all-namespaces 2>/dev/null | wc -l || echo "0")
    if [ "$network_policies" -gt 1 ]; then  # More than header line
        test_result "Network policies configured" "PASS" "$((network_policies - 1)) policies found"
    else
        log "WARN" "No network policies found - consider implementing network segmentation"
    fi
    
    # Pod security standards
    local pods_with_security_context
    pods_with_security_context=$(kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.securityContext}' 2>/dev/null | grep -c runAsNonRoot || echo "0")
    if [ "$pods_with_security_context" -gt 0 ]; then
        test_result "Pod security contexts configured" "PASS"
    else
        test_result "Pod security contexts configured" "FAIL"
    fi
    
    # Check for privileged containers
    local privileged_containers
    privileged_containers=$(kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].securityContext.privileged}' 2>/dev/null | grep -c true || echo "0")
    if [ "$privileged_containers" -eq 0 ]; then
        test_result "No privileged containers" "PASS"
    else
        test_result "Privileged containers found" "FAIL" "$privileged_containers privileged containers"
    fi
}

# Performance testing
performance_test() {
    log "INFO" "⚡ Running basic performance tests..."
    
    # Resource usage check
    local node_cpu_usage
    node_cpu_usage=$(kubectl top nodes 2>/dev/null | tail -n +2 | awk '{sum+=$3} END {print sum}' || echo "0")
    if [ "$node_cpu_usage" -lt 80 ]; then
        test_result "Node CPU usage acceptable" "PASS" "${node_cpu_usage}% average usage"
    else
        test_result "Node CPU usage high" "FAIL" "${node_cpu_usage}% average usage"
    fi
    
    # Memory usage check
    local node_memory_usage
    node_memory_usage=$(kubectl top nodes 2>/dev/null | tail -n +2 | awk '{sum+=$5} END {print sum}' || echo "0")
    if [ "$node_memory_usage" -lt 80 ]; then
        test_result "Node memory usage acceptable" "PASS" "${node_memory_usage}% average usage"
    else
        test_result "Node memory usage high" "FAIL" "${node_memory_usage}% average usage"
    fi
    
    # Pod resource limits
    local pods_without_limits
    pods_without_limits=$(kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].resources.limits}' 2>/dev/null | grep -c null || echo "0")
    if [ "$pods_without_limits" -eq 0 ]; then
        test_result "All pods have resource limits" "PASS"
    else
        test_result "Pods without resource limits" "FAIL" "$pods_without_limits pods without limits"
    fi
}

# Generate test report
generate_report() {
    local report_file="$PROJECT_ROOT/validation-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>OpsSight Deployment Pipeline Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        .log-section { background: #f8f8f8; padding: 15px; margin: 20px 0; border-radius: 5px; font-family: monospace; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OpsSight Deployment Pipeline Validation Report</h1>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>Cluster:</strong> $CLUSTER_NAME</p>
        <p><strong>Region:</strong> $AWS_REGION</p>
        <p><strong>Timestamp:</strong> $(date)</p>
    </div>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <p><span class="passed">✅ Passed: $PASSED_TESTS</span></p>
        <p><span class="failed">❌ Failed: $FAILED_TESTS</span></p>
        <p><span class="warning">⚠️  Warnings: $WARNINGS</span></p>
        <p><strong>Total Tests: $TOTAL_TESTS</strong></p>
        <p><strong>Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%</strong></p>
    </div>
    
    <div class="log-section">
        <h2>Detailed Log</h2>
        <pre>$(cat "$LOG_FILE")</pre>
    </div>
</body>
</html>
EOF
    
    log "INFO" "📊 Test report generated: $report_file"
}

# Print final summary
print_summary() {
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}           VALIDATION SUMMARY${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo -e "Total Tests: ${WHITE}$TOTAL_TESTS${NC}"
    echo -e "Passed:      ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed:      ${RED}$FAILED_TESTS${NC}"
    echo -e "Warnings:    ${YELLOW}$WARNINGS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "Status:      ${GREEN}✅ ALL TESTS PASSED${NC}"
        echo -e "Success Rate: ${GREEN}$(( PASSED_TESTS * 100 / TOTAL_TESTS ))%${NC}"
    else
        echo -e "Status:      ${RED}❌ SOME TESTS FAILED${NC}"
        echo -e "Success Rate: ${YELLOW}$(( PASSED_TESTS * 100 / TOTAL_TESTS ))%${NC}"
    fi
    
    echo -e "${CYAN}================================================${NC}"
    echo ""
    
    if [ $FAILED_TESTS -gt 0 ]; then
        log "ERROR" "Validation completed with failures. Check the detailed log at: $LOG_FILE"
        return 1
    else
        log "SUCCESS" "All validations passed successfully!"
        return 0
    fi
}

# Help function
show_help() {
    cat << EOF
OpsSight Deployment Pipeline End-to-End Validation Script

Usage: $0 [OPTIONS]

OPTIONS:
    --environment ENV       Environment to test (staging|production) [default: staging]
    --cluster-name NAME     EKS cluster name [default: opsight-eks-cluster]
    --region REGION         AWS region [default: us-west-2]
    --timeout SECONDS       Timeout for operations [default: 300]
    --skip-destructive      Skip destructive tests [default: true]
    --verbose               Enable verbose output [default: false]
    --help                  Show this help message

EXAMPLES:
    $0                                    # Run with defaults
    $0 --environment production          # Test production environment
    $0 --verbose --timeout 600           # Verbose mode with extended timeout
    $0 --cluster-name my-cluster         # Test specific cluster

EXIT CODES:
    0    All tests passed
    1    Some tests failed
    2    Critical error (missing prerequisites, etc.)

EOF
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --cluster-name)
                CLUSTER_NAME="$2"
                shift 2
                ;;
            --region)
                AWS_REGION="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --skip-destructive)
                SKIP_DESTRUCTIVE="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 2
                ;;
        esac
    done
    
    # Setup
    mkdir -p "$TEMP_DIR"
    touch "$LOG_FILE"
    trap cleanup EXIT
    
    print_header
    
    # Run validation tests
    validate_prerequisites
    validate_infrastructure
    validate_kubernetes
    validate_secrets_management
    test_application_deployment
    validate_monitoring
    test_cicd_pipeline
    validate_security
    performance_test
    
    # Generate report and summary
    generate_report
    print_summary
}

# Execute main function
main "$@" 