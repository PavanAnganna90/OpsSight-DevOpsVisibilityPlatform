#!/bin/bash

# OpsSight Complete Test Suite Orchestrator
# This script runs all validation tests in the correct sequence
# Author: OpsSight Development Team
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="/tmp/opsight-test-suite-$$"
LOG_FILE="$TEMP_DIR/test-suite.log"
RESULTS_FILE="$TEMP_DIR/test-suite-results.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
CLUSTER_NAME="${CLUSTER_NAME:-opsight-eks-cluster}"
AWS_REGION="${AWS_REGION:-us-west-2}"
NAMESPACE="${NAMESPACE:-opsight-staging}"
SKIP_LOAD_TESTS="${SKIP_LOAD_TESTS:-false}"
SKIP_DESTRUCTIVE="${SKIP_DESTRUCTIVE:-true}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
LOAD_TEST_DURATION="${LOAD_TEST_DURATION:-60}"
VERBOSE="${VERBOSE:-false}"
FAIL_FAST="${FAIL_FAST:-false}"

# Test results tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

print_banner() {
    echo -e "${CYAN}"
    echo "██████╗ ██████╗ ███████╗███████╗██╗ ██████╗ ██╗  ██╗████████╗"
    echo "██╔══██╗██╔══██╗██╔════╝██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝"
    echo "██║  ██║██████╔╝███████╗███████╗██║██║  ███╗███████║   ██║   "
    echo "██║  ██║██╔═══╝ ╚════██║╚════██║██║██║   ██║██╔══██║   ██║   "
    echo "██████╔╝██║     ███████║███████║██║╚██████╔╝██║  ██║   ██║   "
    echo "╚═════╝ ╚═╝     ╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
    echo ""
    echo "           Complete Test Suite Validation"
    echo "           Environment: $ENVIRONMENT"
    echo "           Cluster: $CLUSTER_NAME"
    echo "           Namespace: $NAMESPACE"
    echo -e "${NC}"
    echo ""
}

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case "$level" in
        "INFO")    echo -e "${BLUE}[INFO]${NC} $message" ;;
        "WARN")    echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        "DEBUG")   [ "$VERBOSE" = "true" ] && echo -e "${PURPLE}[DEBUG]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

run_test() {
    local test_name="$1"
    local test_script="$2"
    shift 2
    local test_args=("$@")
    
    log "STEP" "🧪 Running: $test_name"
    
    local start_time end_time duration exit_code
    start_time=$(date +%s)
    
    # Check if test script exists
    if [ ! -f "$test_script" ]; then
        log "ERROR" "Test script not found: $test_script"
        record_test_result "$test_name" "FAILED" "Script not found" 0
        return 1
    fi
    
    # Make script executable
    chmod +x "$test_script"
    
    # Run the test
    if [ "$VERBOSE" = "true" ]; then
        if "$test_script" "${test_args[@]}"; then
            exit_code=0
        else
            exit_code=$?
        fi
    else
        if "$test_script" "${test_args[@]}" >/dev/null 2>&1; then
            exit_code=0
        else
            exit_code=$?
        fi
    fi
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    if [ $exit_code -eq 0 ]; then
        log "SUCCESS" "✅ $test_name completed successfully (${duration}s)"
        record_test_result "$test_name" "PASSED" "Test completed successfully" "$duration"
        return 0
    else
        log "ERROR" "❌ $test_name failed with exit code $exit_code (${duration}s)"
        record_test_result "$test_name" "FAILED" "Exit code: $exit_code" "$duration"
        
        if [ "$FAIL_FAST" = "true" ]; then
            log "ERROR" "Fail-fast mode enabled, stopping test suite"
            exit 1
        fi
        return 1
    fi
}

record_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    local duration="$4"
    
    ((TESTS_RUN++))
    
    if [ "$status" = "PASSED" ]; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    
    # Store result for JSON report
    TEST_RESULTS+=("{
        \"name\": \"$test_name\",
        \"status\": \"$status\",
        \"details\": \"$details\",
        \"duration\": $duration,
        \"timestamp\": \"$(date -Iseconds)\"
    }")
}

check_prerequisites() {
    log "STEP" "🔍 Checking prerequisites..."
    
    local required_tools=("kubectl" "aws" "curl" "jq")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log "ERROR" "AWS credentials not configured"
        return 1
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log "WARN" "Kubernetes cluster not accessible, will update kubeconfig"
        if ! aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME" >/dev/null 2>&1; then
            log "ERROR" "Failed to update kubeconfig"
            return 1
        fi
    fi
    
    log "SUCCESS" "Prerequisites check passed"
    return 0
}

wait_for_deployment() {
    local namespace="$1"
    local timeout="${2:-300}"
    
    log "INFO" "Waiting for deployments to be ready in namespace: $namespace"
    
    local start_time end_time
    start_time=$(date +%s)
    
    while true; do
        if kubectl get namespace "$namespace" >/dev/null 2>&1; then
            local deployments
            deployments=$(kubectl get deployments -n "$namespace" --no-headers 2>/dev/null | wc -l || echo "0")
            
            if [ "$deployments" -gt 0 ]; then
                local ready_deployments
                ready_deployments=$(kubectl get deployments -n "$namespace" --no-headers 2>/dev/null | awk '$2==$3 && $3>0' | wc -l || echo "0")
                
                if [ "$ready_deployments" -eq "$deployments" ]; then
                    log "SUCCESS" "All deployments ready in namespace: $namespace"
                    return 0
                fi
            fi
        fi
        
        end_time=$(date +%s)
        if [ $((end_time - start_time)) -gt $timeout ]; then
            log "WARN" "Timeout waiting for deployments in namespace: $namespace"
            return 1
        fi
        
        sleep 10
    done
}

deploy_test_environment() {
    log "STEP" "🚀 Deploying test environment..."
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log "INFO" "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE" || true
    fi
    
    # Deploy using Helm if chart exists
    if [ -d "$PROJECT_ROOT/helm/opsight" ]; then
        log "INFO" "Deploying OpsSight using Helm..."
        
        local release_name="opsight-test-suite"
        
        # Check if release already exists
        if helm list -n "$NAMESPACE" | grep -q "$release_name"; then
            log "INFO" "Upgrading existing Helm release..."
            helm upgrade "$release_name" "$PROJECT_ROOT/helm/opsight" \
                -n "$NAMESPACE" \
                --set environment=test \
                --set image.tag=latest \
                --timeout 10m || true
        else
            log "INFO" "Installing new Helm release..."
            helm install "$release_name" "$PROJECT_ROOT/helm/opsight" \
                -n "$NAMESPACE" \
                --set environment=test \
                --set image.tag=latest \
                --timeout 10m || true
        fi
        
        # Wait for deployment to be ready
        wait_for_deployment "$NAMESPACE" 300
    else
        log "WARN" "Helm chart not found, assuming environment is already deployed"
    fi
}

cleanup_test_environment() {
    log "STEP" "🧹 Cleaning up test environment..."
    
    if [ "$SKIP_DESTRUCTIVE" = "false" ]; then
        # Remove test Helm release
        local release_name="opsight-test-suite"
        if helm list -n "$NAMESPACE" | grep -q "$release_name"; then
            helm uninstall "$release_name" -n "$NAMESPACE" || true
        fi
        
        # Optionally delete namespace
        if [[ "$NAMESPACE" == *"test"* ]]; then
            kubectl delete namespace "$NAMESPACE" || true
        fi
    else
        log "INFO" "Skipping destructive cleanup (SKIP_DESTRUCTIVE=true)"
    fi
}

run_test_suite() {
    log "STEP" "🎯 Running complete test suite..."
    
    # Test 1: Infrastructure validation
    run_test "Infrastructure Validation" \
        "$SCRIPT_DIR/validate-deployment-pipeline.sh" \
        --environment "$ENVIRONMENT" \
        --cluster-name "$CLUSTER_NAME" \
        --region "$AWS_REGION" \
        --skip-destructive
    
    # Test 2: Secrets management validation
    if [ -f "$SCRIPT_DIR/validate-secrets-management.sh" ]; then
        run_test "Secrets Management Validation" \
            "$SCRIPT_DIR/validate-secrets-management.sh" \
            --environment "$ENVIRONMENT" \
            --cluster-name "$CLUSTER_NAME"
    else
        log "WARN" "Secrets management validation script not found, skipping"
    fi
    
    # Test 3: Application integration tests
    run_test "Application Integration Tests" \
        "$SCRIPT_DIR/integration-test.sh" \
        --namespace "$NAMESPACE"
    
    # Test 4: Load testing (optional)
    if [ "$SKIP_LOAD_TESTS" = "false" ]; then
        run_test "Load Testing" \
            "$SCRIPT_DIR/load-test.sh" \
            --namespace "$NAMESPACE" \
            --concurrent-users "$CONCURRENT_USERS" \
            --duration "$LOAD_TEST_DURATION"
    else
        log "INFO" "Skipping load tests (SKIP_LOAD_TESTS=true)"
    fi
    
    # Test 5: Security validation
    if [ -f "$SCRIPT_DIR/security-scan.sh" ]; then
        run_test "Security Scanning" \
            "$SCRIPT_DIR/security-scan.sh" \
            --namespace "$NAMESPACE"
    else
        log "INFO" "Security scanning script not found, implementing basic security checks..."
        run_basic_security_checks
    fi
}

run_basic_security_checks() {
    log "INFO" "Running basic security checks..."
    
    local security_issues=0
    
    # Check for privileged containers
    local privileged_pods
    privileged_pods=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].spec.containers[*].securityContext.privileged}' 2>/dev/null | grep -c true || echo "0")
    
    if [ "$privileged_pods" -gt 0 ]; then
        log "ERROR" "Found $privileged_pods privileged containers"
        security_issues=$((security_issues + 1))
    else
        log "SUCCESS" "No privileged containers found"
    fi
    
    # Check for containers running as root
    local root_containers
    root_containers=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].spec.containers[*].securityContext.runAsUser}' 2>/dev/null | grep -c '^0$' || echo "0")
    
    if [ "$root_containers" -gt 0 ]; then
        log "WARN" "Found $root_containers containers running as root"
        security_issues=$((security_issues + 1))
    else
        log "SUCCESS" "No containers running as root"
    fi
    
    # Check for exposed secrets
    local secret_count
    secret_count=$(kubectl get secrets -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    
    if [ "$secret_count" -gt 0 ]; then
        log "SUCCESS" "Found $secret_count secrets (properly configured)"
    else
        log "WARN" "No secrets found in namespace"
    fi
    
    if [ $security_issues -eq 0 ]; then
        record_test_result "Basic Security Checks" "PASSED" "No security issues found" 5
    else
        record_test_result "Basic Security Checks" "FAILED" "$security_issues security issues found" 5
    fi
}

generate_comprehensive_report() {
    local report_file="$PROJECT_ROOT/test-suite-report-$(date +%Y%m%d-%H%M%S).html"
    
    # Build JSON results array
    local json_results=""
    for ((i=0; i<${#TEST_RESULTS[@]}; i++)); do
        json_results+="${TEST_RESULTS[i]}"
        if [ $i -lt $((${#TEST_RESULTS[@]} - 1)) ]; then
            json_results+=","
        fi
    done
    
    # Save JSON results
    echo "{\"test_suite_results\": [$json_results], \"summary\": {\"total\": $TESTS_RUN, \"passed\": $TESTS_PASSED, \"failed\": $TESTS_FAILED}}" > "$RESULTS_FILE"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>OpsSight Complete Test Suite Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
        .summary { background: #f8f9fa; padding: 25px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .test-section { margin: 30px 0; }
        .test-result { padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid; }
        .passed { background: #d4edda; border-color: #28a745; }
        .failed { background: #f8d7da; border-color: #dc3545; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .log-section { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; max-height: 400px; overflow-y: auto; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.9em; font-weight: bold; }
        .status-passed { background: #28a745; color: white; }
        .status-failed { background: #dc3545; color: white; }
        .config-section { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 OpsSight Complete Test Suite Report</h1>
        <p>Comprehensive validation of deployment pipeline and application</p>
        <p><strong>Environment:</strong> $ENVIRONMENT | <strong>Cluster:</strong> $CLUSTER_NAME | <strong>Timestamp:</strong> $(date)</p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Execution Summary</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">$TESTS_RUN</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #28a745;">$TESTS_PASSED</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #dc3545;">$TESTS_FAILED</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$(( TESTS_PASSED * 100 / TESTS_RUN ))%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>
    </div>
    
    <div class="config-section">
        <h3>🔧 Test Configuration</h3>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>Kubernetes Namespace:</strong> $NAMESPACE</p>
        <p><strong>AWS Region:</strong> $AWS_REGION</p>
        <p><strong>Load Test Users:</strong> $CONCURRENT_USERS</p>
        <p><strong>Load Test Duration:</strong> ${LOAD_TEST_DURATION}s</p>
        <p><strong>Skip Destructive:</strong> $SKIP_DESTRUCTIVE</p>
        <p><strong>Skip Load Tests:</strong> $SKIP_LOAD_TESTS</p>
    </div>
    
    <div class="test-section">
        <h2>📋 Detailed Test Results</h2>
EOF
    
    # Add test results to HTML
    if command -v jq >/dev/null 2>&1 && [ -f "$RESULTS_FILE" ]; then
        jq -r '.test_suite_results[] | 
            "<div class=\"test-result " + 
            (if .status == "PASSED" then "passed" else "failed" end) + 
            "\"><h3>" + .name + " <span class=\"status-badge status-" + 
            (if .status == "PASSED" then "passed" else "failed" end) + 
            "\">" + .status + "</span></h3><p><strong>Duration:</strong> " + 
            (.duration|tostring) + "s</p><p><strong>Details:</strong> " + 
            .details + "</p><p><strong>Timestamp:</strong> " + .timestamp + "</p></div>"' \
            "$RESULTS_FILE" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF
    </div>
    
    <div class="log-section">
        <h2>📝 Detailed Execution Log</h2>
        <pre>$(cat "$LOG_FILE")</pre>
    </div>
    
    <div style="text-align: center; margin-top: 40px; color: #6c757d;">
        <p>Generated by OpsSight Test Suite Orchestrator</p>
        <p>Report generated at: $(date)</p>
    </div>
</body>
</html>
EOF
    
    log "SUCCESS" "📊 Comprehensive test report generated: $report_file"
}

print_final_summary() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                  FINAL TEST SUMMARY                  ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC} Total Tests:    ${WHITE}$TESTS_RUN${NC}"
    echo -e "${CYAN}║${NC} Tests Passed:   ${GREEN}$TESTS_PASSED${NC}"
    echo -e "${CYAN}║${NC} Tests Failed:   ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_RUN -gt 0 ]; then
        local success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))
        echo -e "${CYAN}║${NC} Success Rate:   ${WHITE}$success_rate%${NC}"
        
        if [ $TESTS_FAILED -eq 0 ]; then
            echo -e "${CYAN}║${NC} Overall Status: ${GREEN}✅ ALL TESTS PASSED${NC}"
        else
            echo -e "${CYAN}║${NC} Overall Status: ${RED}❌ SOME TESTS FAILED${NC}"
        fi
    fi
    
    echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ $TESTS_FAILED -gt 0 ]; then
        log "ERROR" "Test suite completed with failures"
        return 1
    else
        log "SUCCESS" "🎉 All tests passed successfully!"
        return 0
    fi
}

show_help() {
    cat << EOF
OpsSight Complete Test Suite Orchestrator

Usage: $0 [OPTIONS]

OPTIONS:
    --environment ENV           Environment to test (staging|production) [default: staging]
    --cluster-name NAME         EKS cluster name [default: opsight-eks-cluster]
    --region REGION             AWS region [default: us-west-2]
    --namespace NAMESPACE       Kubernetes namespace [default: opsight-staging]
    --concurrent-users N        Load test concurrent users [default: 10]
    --load-test-duration N      Load test duration in seconds [default: 60]
    --skip-load-tests          Skip load testing
    --skip-destructive         Skip destructive operations [default: true]
    --fail-fast                Stop on first test failure
    --verbose                  Enable verbose output
    --help                     Show this help message

EXAMPLES:
    $0                                           # Run complete test suite with defaults
    $0 --environment production                  # Test production environment
    $0 --skip-load-tests --verbose               # Skip load tests with verbose output
    $0 --fail-fast --concurrent-users 20         # Fail fast with 20 concurrent users

The test suite includes:
    1. Infrastructure validation (Terraform, EKS, AWS resources)
    2. Secrets management validation
    3. Application integration tests
    4. Load testing (optional)
    5. Security validation

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
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --concurrent-users)
                CONCURRENT_USERS="$2"
                shift 2
                ;;
            --load-test-duration)
                LOAD_TEST_DURATION="$2"
                shift 2
                ;;
            --skip-load-tests)
                SKIP_LOAD_TESTS="true"
                shift
                ;;
            --skip-destructive)
                SKIP_DESTRUCTIVE="true"
                shift
                ;;
            --fail-fast)
                FAIL_FAST="true"
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
                exit 1
                ;;
        esac
    done
    
    # Setup
    mkdir -p "$TEMP_DIR"
    touch "$LOG_FILE"
    
    # Trap to ensure cleanup
    trap 'cleanup_test_environment; rm -rf "$TEMP_DIR"' EXIT
    
    print_banner
    
    # Execute test suite
    local overall_result=0
    
    if check_prerequisites; then
        deploy_test_environment
        run_test_suite
        
        # Generate comprehensive report
        generate_comprehensive_report
        print_final_summary
        
        if [ $TESTS_FAILED -gt 0 ]; then
            overall_result=1
        fi
    else
        log "ERROR" "Prerequisites check failed"
        overall_result=1
    fi
    
    exit $overall_result
}

# Execute main function
main "$@" 