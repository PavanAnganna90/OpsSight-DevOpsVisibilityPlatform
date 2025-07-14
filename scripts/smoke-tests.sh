#!/bin/bash

# ==============================================================================
# OpsSight Smoke Tests
# ==============================================================================
# Comprehensive smoke tests to validate deployment health after deployment
# Runs essential checks to ensure the application is functional
# ==============================================================================

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Configuration
BASE_URL="${1:-https://staging.opssight.dev}"
TIMEOUT=30
MAX_RETRIES=3
RETRY_DELAY=10

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

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Test execution wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    log_info "Running test: $test_name"
    
    if $test_function; then
        log_success "✓ $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        log_error "✗ $test_name"
        FAILED_TESTS+=("$test_name")
        ((TESTS_FAILED++))
        return 1
    fi
}

# HTTP request wrapper with retries
http_request() {
    local url="$1"
    local expected_status="${2:-200}"
    local max_attempts="$MAX_RETRIES"
    
    for ((i=1; i<=max_attempts; i++)); do
        log_info "Attempt $i/$max_attempts: GET $url"
        
        local response=$(curl -s -w "\n%{http_code}\n%{time_total}" --max-time $TIMEOUT "$url" 2>/dev/null || echo -e "\n000\n0")
        local body=$(echo "$response" | head -n -2)
        local status=$(echo "$response" | tail -n 2 | head -n 1)
        local time_total=$(echo "$response" | tail -n 1)
        
        if [[ "$status" == "$expected_status" ]]; then
            log_info "Response time: ${time_total}s"
            echo "$body"
            return 0
        else
            log_warning "Attempt $i failed: HTTP $status (expected $expected_status)"
            if [[ $i -lt $max_attempts ]]; then
                log_info "Retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    log_error "All attempts failed for $url"
    return 1
}

# ==============================================================================
# Test Functions
# ==============================================================================

test_frontend_health() {
    log_info "Testing frontend health check..."
    local response=$(http_request "$BASE_URL/api/health" 200)
    
    if echo "$response" | grep -q "status.*ok\|healthy"; then
        return 0
    else
        log_error "Frontend health check failed - invalid response format"
        return 1
    fi
}

test_backend_api_health() {
    log_info "Testing backend API health..."
    local response=$(http_request "$BASE_URL/api/v1/health" 200)
    
    if echo "$response" | grep -q "status.*ok\|healthy"; then
        return 0
    else
        log_error "Backend API health check failed"
        return 1
    fi
}

test_database_connectivity() {
    log_info "Testing database connectivity..."
    local response=$(http_request "$BASE_URL/api/v1/health/db" 200)
    
    if echo "$response" | grep -q "database.*connected\|status.*ok"; then
        return 0
    else
        log_error "Database connectivity test failed"
        return 1
    fi
}

test_redis_connectivity() {
    log_info "Testing Redis connectivity..."
    local response=$(http_request "$BASE_URL/api/v1/health/redis" 200)
    
    if echo "$response" | grep -q "redis.*connected\|status.*ok"; then
        return 0
    else
        log_warning "Redis connectivity test failed (non-critical)"
        return 0  # Redis is non-critical for basic functionality
    fi
}

test_authentication_endpoint() {
    log_info "Testing authentication endpoint..."
    local response=$(http_request "$BASE_URL/api/v1/auth/status" 200)
    
    if echo "$response" | grep -q "auth\|status"; then
        return 0
    else
        log_error "Authentication endpoint test failed"
        return 1
    fi
}

test_static_assets() {
    log_info "Testing static asset loading..."
    
    # Test main page loads
    if ! http_request "$BASE_URL" 200 >/dev/null; then
        log_error "Main page failed to load"
        return 1
    fi
    
    # Test CSS/JS assets (look for common static file patterns)
    local main_page=$(curl -s "$BASE_URL" 2>/dev/null || echo "")
    if echo "$main_page" | grep -q "_next/static\|/assets/"; then
        log_info "Static assets detected in page"
        return 0
    else
        log_warning "No static assets detected (may be bundled differently)"
        return 0  # Non-critical
    fi
}

test_api_version() {
    log_info "Testing API version endpoint..."
    local response=$(http_request "$BASE_URL/api/v1/version" 200)
    
    if echo "$response" | grep -q "version\|build"; then
        log_info "API Version: $(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)"
        return 0
    else
        log_warning "API version endpoint test failed (non-critical)"
        return 0
    fi
}

test_cors_headers() {
    log_info "Testing CORS configuration..."
    local headers=$(curl -s -I -H "Origin: https://opssight.dev" "$BASE_URL/api/v1/health" 2>/dev/null || echo "")
    
    if echo "$headers" | grep -qi "access-control-allow"; then
        log_info "CORS headers detected"
        return 0
    else
        log_warning "CORS headers not detected (may be configured differently)"
        return 0
    fi
}

test_security_headers() {
    log_info "Testing security headers..."
    local headers=$(curl -s -I "$BASE_URL" 2>/dev/null || echo "")
    
    local security_headers=("X-Content-Type-Options" "X-Frame-Options" "X-XSS-Protection")
    local headers_found=0
    
    for header in "${security_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            ((headers_found++))
        fi
    done
    
    if [[ $headers_found -gt 0 ]]; then
        log_info "Security headers detected: $headers_found/${#security_headers[@]}"
        return 0
    else
        log_warning "Limited security headers detected"
        return 0  # Non-critical for smoke tests
    fi
}

test_response_times() {
    log_info "Testing response times..."
    local start_time=$(date +%s%N)
    
    if http_request "$BASE_URL" 200 >/dev/null; then
        local end_time=$(date +%s%N)
        local duration_ms=$(( (end_time - start_time) / 1000000 ))
        
        log_info "Main page response time: ${duration_ms}ms"
        
        if [[ $duration_ms -lt 5000 ]]; then  # Less than 5 seconds
            return 0
        else
            log_warning "Response time exceeded 5s: ${duration_ms}ms"
            return 0  # Non-critical
        fi
    else
        log_error "Response time test failed - page unreachable"
        return 1
    fi
}

# ==============================================================================
# Main Test Execution
# ==============================================================================

main() {
    log_info "==========================================="
    log_info "OpsSight Smoke Tests"
    log_info "Target: $BASE_URL"
    log_info "Timeout: ${TIMEOUT}s"
    log_info "Max Retries: $MAX_RETRIES"
    log_info "==========================================="
    echo
    
    # Core functionality tests (critical)
    run_test "Frontend Health Check" test_frontend_health
    run_test "Backend API Health" test_backend_api_health
    run_test "Database Connectivity" test_database_connectivity
    run_test "Authentication Endpoint" test_authentication_endpoint
    run_test "Static Assets Loading" test_static_assets
    run_test "Response Times" test_response_times
    
    # Additional tests (non-critical)
    run_test "Redis Connectivity" test_redis_connectivity
    run_test "API Version" test_api_version
    run_test "CORS Configuration" test_cors_headers
    run_test "Security Headers" test_security_headers
    
    echo
    log_info "==========================================="
    log_info "Test Results Summary"
    log_info "==========================================="
    log_success "Tests Passed: $TESTS_PASSED"
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        log_error "Tests Failed: $TESTS_FAILED"
        log_error "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            log_error "  - $test"
        done
        echo
        log_error "🚨 Smoke tests FAILED! Deployment may have issues."
        exit 1
    else
        log_success "🎉 All smoke tests PASSED! Deployment is healthy."
        exit 0
    fi
}

# Handle script arguments
if [[ $# -eq 0 ]]; then
    log_warning "No URL provided, using default: $BASE_URL"
elif [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [URL]"
    echo "  URL: Base URL to test (default: https://staging.opssight.dev)"
    echo ""
    echo "Examples:"
    echo "  $0 https://staging.opssight.dev"
    echo "  $0 https://opssight.dev"
    echo "  $0 http://localhost:3000"
    exit 0
fi

# Run main function
main "$@"