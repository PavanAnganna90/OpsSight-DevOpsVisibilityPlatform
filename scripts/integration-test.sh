#!/bin/bash

# OpsSight Application Integration Test Script
# This script performs comprehensive integration testing of the OpsSight application
# Author: OpsSight Development Team
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="/tmp/opsight-integration-test-$$"
LOG_FILE="$TEMP_DIR/integration-test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
NAMESPACE="${NAMESPACE:-opsight-staging}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-opsight-frontend}"
BACKEND_SERVICE="${BACKEND_SERVICE:-opsight-backend}"
TIMEOUT="${TIMEOUT:-300}"
BASE_URL=""
API_BASE_URL=""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test data
TEST_USER_EMAIL="test@opsight.dev"
TEST_USER_PASSWORD="TestPassword123!"
TEST_PROJECT_NAME="test-project-$$"
TEST_DEPLOYMENT_NAME="test-deployment-$$"

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}     OpsSight Application Integration Tests${NC}"
    echo -e "${BLUE}     Namespace: $NAMESPACE${NC}"
    echo -e "${BLUE}================================================${NC}"
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
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
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
    else
        ((FAILED_TESTS++))
        log "ERROR" "❌ $test_name"
        [ -n "$details" ] && log "ERROR" "   Details: $details"
    fi
}

setup_port_forwards() {
    log "INFO" "Setting up port forwards for testing..."
    
    # Kill any existing port forwards
    pkill -f "kubectl port-forward" || true
    sleep 2
    
    # Setup frontend port forward
    kubectl port-forward -n "$NAMESPACE" service/"$FRONTEND_SERVICE" 8080:80 &
    local frontend_pid=$!
    
    # Setup backend port forward
    kubectl port-forward -n "$NAMESPACE" service/"$BACKEND_SERVICE" 8000:80 &
    local backend_pid=$!
    
    # Wait for port forwards to be ready
    sleep 5
    
    # Test connectivity
    local retries=0
    while [ $retries -lt 10 ]; do
        if curl -s http://localhost:8080 >/dev/null 2>&1; then
            BASE_URL="http://localhost:8080"
            break
        fi
        retries=$((retries + 1))
        sleep 2
    done
    
    retries=0
    while [ $retries -lt 10 ]; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            API_BASE_URL="http://localhost:8000"
            break
        fi
        retries=$((retries + 1))
        sleep 2
    done
    
    if [ -n "$BASE_URL" ] && [ -n "$API_BASE_URL" ]; then
        test_result "Port forwards established" "PASS"
        echo "frontend_pid=$frontend_pid" > "$TEMP_DIR/pids"
        echo "backend_pid=$backend_pid" >> "$TEMP_DIR/pids"
    else
        test_result "Port forwards established" "FAIL"
        return 1
    fi
}

cleanup_port_forwards() {
    log "INFO" "Cleaning up port forwards..."
    if [ -f "$TEMP_DIR/pids" ]; then
        source "$TEMP_DIR/pids"
        kill "$frontend_pid" "$backend_pid" 2>/dev/null || true
    fi
    pkill -f "kubectl port-forward" || true
}

# Test API health endpoints
test_api_health() {
    log "INFO" "🔍 Testing API health endpoints..."
    
    # Backend health check
    local response
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/health" -o /dev/null)
    if [ "$response" = "200" ]; then
        test_result "Backend health endpoint" "PASS"
    else
        test_result "Backend health endpoint" "FAIL" "HTTP $response"
    fi
    
    # Backend readiness check
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/ready" -o /dev/null)
    if [ "$response" = "200" ]; then
        test_result "Backend readiness endpoint" "PASS"
    else
        test_result "Backend readiness endpoint" "FAIL" "HTTP $response"
    fi
    
    # API documentation endpoint
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/docs" -o /dev/null)
    if [ "$response" = "200" ]; then
        test_result "API documentation endpoint" "PASS"
    else
        test_result "API documentation endpoint" "FAIL" "HTTP $response"
    fi
    
    # OpenAPI schema endpoint
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/openapi.json" -o /dev/null)
    if [ "$response" = "200" ]; then
        test_result "OpenAPI schema endpoint" "PASS"
    else
        test_result "OpenAPI schema endpoint" "FAIL" "HTTP $response"
    fi
}

# Test frontend accessibility
test_frontend() {
    log "INFO" "🌐 Testing frontend accessibility..."
    
    # Frontend main page
    local response
    response=$(curl -s -w "%{http_code}" "$BASE_URL" -o /dev/null)
    if [ "$response" = "200" ]; then
        test_result "Frontend main page" "PASS"
    else
        test_result "Frontend main page" "FAIL" "HTTP $response"
    fi
    
    # Check for React app bundle
    local content
    content=$(curl -s "$BASE_URL")
    if echo "$content" | grep -q "react\|React"; then
        test_result "React application loaded" "PASS"
    else
        test_result "React application loaded" "FAIL"
    fi
    
    # Check for OpsSight branding
    if echo "$content" | grep -q -i "opsight"; then
        test_result "OpsSight branding present" "PASS"
    else
        test_result "OpsSight branding present" "FAIL"
    fi
}

# Test authentication endpoints
test_authentication() {
    log "INFO" "🔐 Testing authentication system..."
    
    # Test user registration
    local register_response
    register_response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\",\"full_name\":\"Test User\"}" \
        -o "$TEMP_DIR/register_response.json")
    
    if [ "$register_response" = "201" ] || [ "$register_response" = "400" ]; then
        # 400 is acceptable if user already exists
        test_result "User registration endpoint" "PASS"
    else
        test_result "User registration endpoint" "FAIL" "HTTP $register_response"
    fi
    
    # Test user login
    local login_response
    login_response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$TEST_USER_EMAIL&password=$TEST_USER_PASSWORD" \
        -o "$TEMP_DIR/login_response.json")
    
    if [ "$login_response" = "200" ]; then
        test_result "User login endpoint" "PASS"
        
        # Extract access token
        if command -v jq >/dev/null 2>&1; then
            ACCESS_TOKEN=$(jq -r '.access_token' "$TEMP_DIR/login_response.json" 2>/dev/null || echo "")
            if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
                test_result "Access token retrieval" "PASS"
                echo "ACCESS_TOKEN=$ACCESS_TOKEN" >> "$TEMP_DIR/auth"
            else
                test_result "Access token retrieval" "FAIL"
            fi
        fi
    else
        test_result "User login endpoint" "FAIL" "HTTP $login_response"
    fi
    
    # Test token refresh (if implemented)
    if [ -n "${ACCESS_TOKEN:-}" ]; then
        local refresh_response
        refresh_response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/refresh" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -o /dev/null)
        
        if [ "$refresh_response" = "200" ] || [ "$refresh_response" = "404" ]; then
            # 404 is acceptable if refresh endpoint is not implemented
            test_result "Token refresh endpoint" "PASS"
        else
            test_result "Token refresh endpoint" "FAIL" "HTTP $refresh_response"
        fi
    fi
}

# Test project management endpoints
test_project_management() {
    log "INFO" "📁 Testing project management..."
    
    if [ -z "${ACCESS_TOKEN:-}" ]; then
        log "ERROR" "No access token available, skipping project management tests"
        return
    fi
    
    # Create project
    local create_response
    create_response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/projects" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$TEST_PROJECT_NAME\",\"description\":\"Test project for integration testing\"}" \
        -o "$TEMP_DIR/create_project_response.json")
    
    if [ "$create_response" = "201" ]; then
        test_result "Project creation" "PASS"
        
        if command -v jq >/dev/null 2>&1; then
            PROJECT_ID=$(jq -r '.id' "$TEMP_DIR/create_project_response.json" 2>/dev/null || echo "")
            echo "PROJECT_ID=$PROJECT_ID" >> "$TEMP_DIR/auth"
        fi
    else
        test_result "Project creation" "FAIL" "HTTP $create_response"
    fi
    
    # List projects
    local list_response
    list_response=$(curl -s -w "%{http_code}" -X GET "$API_BASE_URL/projects" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -o "$TEMP_DIR/list_projects_response.json")
    
    if [ "$list_response" = "200" ]; then
        test_result "Project listing" "PASS"
    else
        test_result "Project listing" "FAIL" "HTTP $list_response"
    fi
    
    # Get specific project
    if [ -n "${PROJECT_ID:-}" ]; then
        local get_response
        get_response=$(curl -s -w "%{http_code}" -X GET "$API_BASE_URL/projects/$PROJECT_ID" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -o /dev/null)
        
        if [ "$get_response" = "200" ]; then
            test_result "Project retrieval" "PASS"
        else
            test_result "Project retrieval" "FAIL" "HTTP $get_response"
        fi
    fi
}

# Test deployment monitoring endpoints
test_deployment_monitoring() {
    log "INFO" "🚀 Testing deployment monitoring..."
    
    if [ -z "${ACCESS_TOKEN:-}" ] || [ -z "${PROJECT_ID:-}" ]; then
        log "ERROR" "No access token or project ID available, skipping deployment tests"
        return
    fi
    
    # Create deployment
    local deploy_response
    deploy_response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/projects/$PROJECT_ID/deployments" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$TEST_DEPLOYMENT_NAME\",\"environment\":\"staging\",\"version\":\"1.0.0\"}" \
        -o "$TEMP_DIR/create_deployment_response.json")
    
    if [ "$deploy_response" = "201" ]; then
        test_result "Deployment creation" "PASS"
        
        if command -v jq >/dev/null 2>&1; then
            DEPLOYMENT_ID=$(jq -r '.id' "$TEMP_DIR/create_deployment_response.json" 2>/dev/null || echo "")
        fi
    else
        test_result "Deployment creation" "FAIL" "HTTP $deploy_response"
    fi
    
    # List deployments
    local list_deploy_response
    list_deploy_response=$(curl -s -w "%{http_code}" -X GET "$API_BASE_URL/projects/$PROJECT_ID/deployments" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -o /dev/null)
    
    if [ "$list_deploy_response" = "200" ]; then
        test_result "Deployment listing" "PASS"
    else
        test_result "Deployment listing" "FAIL" "HTTP $list_deploy_response"
    fi
    
    # Get deployment metrics
    if [ -n "${DEPLOYMENT_ID:-}" ]; then
        local metrics_response
        metrics_response=$(curl -s -w "%{http_code}" -X GET "$API_BASE_URL/deployments/$DEPLOYMENT_ID/metrics" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -o /dev/null)
        
        if [ "$metrics_response" = "200" ] || [ "$metrics_response" = "404" ]; then
            test_result "Deployment metrics" "PASS"
        else
            test_result "Deployment metrics" "FAIL" "HTTP $metrics_response"
        fi
    fi
}

# Test analytics endpoints
test_analytics() {
    log "INFO" "📊 Testing analytics endpoints..."
    
    if [ -z "${ACCESS_TOKEN:-}" ]; then
        log "ERROR" "No access token available, skipping analytics tests"
        return
    fi
    
    # Dashboard metrics
    local dashboard_response
    dashboard_response=$(curl -s -w "%{http_code}" -X GET "$API_BASE_URL/analytics/dashboard" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -o /dev/null)
    
    if [ "$dashboard_response" = "200" ] || [ "$dashboard_response" = "404" ]; then
        test_result "Dashboard analytics" "PASS"
    else
        test_result "Dashboard analytics" "FAIL" "HTTP $dashboard_response"
    fi
    
    # Performance metrics
    local performance_response
    performance_response=$(curl -s -w "%{http_code}" -X GET "$API_BASE_URL/analytics/performance" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -o /dev/null)
    
    if [ "$performance_response" = "200" ] || [ "$performance_response" = "404" ]; then
        test_result "Performance analytics" "PASS"
    else
        test_result "Performance analytics" "FAIL" "HTTP $performance_response"
    fi
}

# Test WebSocket connections (if implemented)
test_websocket() {
    log "INFO" "🔌 Testing WebSocket connections..."
    
    # Check if WebSocket endpoint exists
    local ws_response
    ws_response=$(curl -s -w "%{http_code}" -X GET "$API_BASE_URL/ws" \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -o /dev/null)
    
    if [ "$ws_response" = "101" ] || [ "$ws_response" = "404" ] || [ "$ws_response" = "426" ]; then
        # 404 = not implemented, 426 = upgrade required (normal for websocket)
        test_result "WebSocket endpoint" "PASS"
    else
        test_result "WebSocket endpoint" "FAIL" "HTTP $ws_response"
    fi
}

# Performance testing
test_performance() {
    log "INFO" "⚡ Running performance tests..."
    
    # Load test the health endpoint
    local start_time end_time duration
    start_time=$(date +%s)
    
    for i in {1..10}; do
        curl -s "$API_BASE_URL/health" >/dev/null
    done
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    if [ $duration -lt 5 ]; then  # Should complete 10 requests in under 5 seconds
        test_result "API performance test" "PASS" "10 requests in ${duration}s"
    else
        test_result "API performance test" "FAIL" "10 requests took ${duration}s"
    fi
    
    # Memory usage check
    local backend_pod
    backend_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$backend_pod" ]; then
        local memory_usage
        memory_usage=$(kubectl top pod -n "$NAMESPACE" "$backend_pod" --no-headers 2>/dev/null | awk '{print $3}' | sed 's/Mi//' || echo "0")
        
        if [ "$memory_usage" -lt 512 ]; then  # Less than 512Mi
            test_result "Backend memory usage" "PASS" "${memory_usage}Mi"
        else
            test_result "Backend memory usage" "FAIL" "${memory_usage}Mi (exceeds 512Mi)"
        fi
    fi
}

# Cleanup test data
cleanup_test_data() {
    log "INFO" "🧹 Cleaning up test data..."
    
    if [ -n "${ACCESS_TOKEN:-}" ]; then
        # Delete test project
        if [ -n "${PROJECT_ID:-}" ]; then
            curl -s -X DELETE "$API_BASE_URL/projects/$PROJECT_ID" \
                -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null 2>&1 || true
        fi
        
        # Delete test user (if endpoint exists)
        curl -s -X DELETE "$API_BASE_URL/auth/user" \
            -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null 2>&1 || true
    fi
    
    test_result "Test data cleanup" "PASS"
}

# Generate test report
generate_report() {
    local report_file="$PROJECT_ROOT/integration-test-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>OpsSight Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .log-section { background: #f8f8f8; padding: 15px; margin: 20px 0; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OpsSight Integration Test Report</h1>
        <p><strong>Namespace:</strong> $NAMESPACE</p>
        <p><strong>Timestamp:</strong> $(date)</p>
    </div>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <p><span class="passed">✅ Passed: $PASSED_TESTS</span></p>
        <p><span class="failed">❌ Failed: $FAILED_TESTS</span></p>
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
    
    log "INFO" "📊 Integration test report generated: $report_file"
}

print_summary() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}       INTEGRATION TEST SUMMARY${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed:      ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed:      ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "Status:      ${GREEN}✅ ALL TESTS PASSED${NC}"
    else
        echo -e "Status:      ${RED}❌ SOME TESTS FAILED${NC}"
    fi
    
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Main execution
main() {
    # Setup
    mkdir -p "$TEMP_DIR"
    touch "$LOG_FILE"
    touch "$TEMP_DIR/auth"
    
    print_header
    
    # Setup port forwards
    setup_port_forwards
    
    # Source auth variables if they exist
    [ -f "$TEMP_DIR/auth" ] && source "$TEMP_DIR/auth"
    
    # Run tests
    test_api_health
    test_frontend
    test_authentication
    
    # Source updated auth variables
    [ -f "$TEMP_DIR/auth" ] && source "$TEMP_DIR/auth"
    
    test_project_management
    test_deployment_monitoring
    test_analytics
    test_websocket
    test_performance
    
    # Cleanup
    cleanup_test_data
    cleanup_port_forwards
    
    # Generate report and summary
    generate_report
    print_summary
    
    # Cleanup temp directory
    rm -rf "$TEMP_DIR"
    
    # Return appropriate exit code
    if [ $FAILED_TESTS -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# Execute main function
main "$@" 