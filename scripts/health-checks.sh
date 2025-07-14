#!/bin/bash

# ==============================================================================
# OpsSight Production Health Checks
# ==============================================================================
# Comprehensive health validation for production deployments
# More thorough than smoke tests - validates production readiness
# ==============================================================================

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Configuration
BASE_URL="${1:-https://opssight.dev}"
TIMEOUT=45
MAX_RETRIES=5
RETRY_DELAY=15
HEALTH_CHECK_INTERVAL=10
HEALTH_CHECK_DURATION=120  # 2 minutes of sustained health checks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_critical() {
    echo -e "${PURPLE}[CRITICAL]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Test result tracking
CRITICAL_TESTS_PASSED=0
CRITICAL_TESTS_FAILED=0
WARNING_TESTS=0
FAILED_CRITICAL_TESTS=()
WARNING_TESTS_LIST=()

# Performance metrics
RESPONSE_TIMES=()
ERROR_RATES=()

# Health check execution wrapper
run_health_check() {
    local test_name="$1"
    local test_function="$2"
    local test_level="${3:-critical}"  # critical, warning, info
    
    log_info "Running health check: $test_name"
    
    if $test_function; then
        log_success "✓ $test_name"
        if [[ "$test_level" == "critical" ]]; then
            ((CRITICAL_TESTS_PASSED++))
        fi
        return 0
    else
        if [[ "$test_level" == "critical" ]]; then
            log_critical "✗ $test_name [CRITICAL FAILURE]"
            FAILED_CRITICAL_TESTS+=("$test_name")
            ((CRITICAL_TESTS_FAILED++))
        else
            log_warning "⚠ $test_name [WARNING]"
            WARNING_TESTS_LIST+=("$test_name")
            ((WARNING_TESTS++))
        fi
        return 1
    fi
}

# Enhanced HTTP request wrapper with performance tracking
http_request_with_metrics() {
    local url="$1"
    local expected_status="${2:-200}"
    local max_attempts="$MAX_RETRIES"
    
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    
    for ((i=1; i<=max_attempts; i++)); do
        local start_time=$(date +%s%N)
        
        local response=$(curl -s -w "\n%{http_code}\n%{time_total}\n%{time_connect}\n%{time_starttransfer}" \
                        --max-time $TIMEOUT "$url" 2>/dev/null || echo -e "\n000\n0\n0\n0")
        
        local end_time=$(date +%s%N)
        local body=$(echo "$response" | head -n -4)
        local status=$(echo "$response" | tail -n 4 | head -n 1)
        local time_total=$(echo "$response" | tail -n 3 | head -n 1)
        local time_connect=$(echo "$response" | tail -n 2 | head -n 1)
        local time_starttransfer=$(echo "$response" | tail -n 1)
        
        if [[ "$status" == "$expected_status" ]]; then
            ((successful_requests++))
            total_time=$(echo "$total_time + $time_total" | bc -l 2>/dev/null || echo "$total_time")
            RESPONSE_TIMES+=("$time_total")
            
            log_info "✓ HTTP $status - Response: ${time_total}s, Connect: ${time_connect}s, TTFB: ${time_starttransfer}s"
            echo "$body"
            return 0
        else
            ((failed_requests++))
            log_warning "✗ HTTP $status (expected $expected_status) - Attempt $i/$max_attempts"
            
            if [[ $i -lt $max_attempts ]]; then
                log_info "Retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    local error_rate=$(echo "scale=2; $failed_requests / ($successful_requests + $failed_requests) * 100" | bc -l 2>/dev/null || echo "100")
    ERROR_RATES+=("$error_rate")
    
    log_error "All attempts failed for $url (Error rate: ${error_rate}%)"
    return 1
}

# ==============================================================================
# Critical Health Check Functions
# ==============================================================================

health_check_application_uptime() {
    log_info "Checking application uptime and basic availability..."
    
    local response=$(http_request_with_metrics "$BASE_URL" 200)
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    # Check if the response contains expected content
    if echo "$response" | grep -qi "opssight\|dashboard\|loading\|<html"; then
        log_success "Application is serving content"
        return 0
    else
        log_error "Application returned unexpected content"
        return 1
    fi
}

health_check_api_endpoints() {
    log_info "Validating critical API endpoints..."
    
    # Health endpoint
    local health_response=$(http_request_with_metrics "$BASE_URL/api/v1/health" 200)
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    # Check health response structure
    if echo "$health_response" | grep -q "status.*ok\|healthy"; then
        log_success "API health endpoint responding correctly"
    else
        log_error "API health endpoint returned invalid response"
        return 1
    fi
    
    # Authentication status endpoint
    if ! http_request_with_metrics "$BASE_URL/api/v1/auth/status" 200 >/dev/null; then
        log_error "Authentication endpoint not responding"
        return 1
    fi
    
    return 0
}

health_check_database_performance() {
    log_info "Checking database connectivity and performance..."
    
    local db_response=$(http_request_with_metrics "$BASE_URL/api/v1/health/db" 200)
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    # Parse response time from health check
    if echo "$db_response" | grep -q "response_time\|latency"; then
        local db_latency=$(echo "$db_response" | grep -o '"response_time":[0-9.]*' | cut -d':' -f2)
        if [[ -n "$db_latency" ]]; then
            log_info "Database response time: ${db_latency}ms"
            
            # Check if database response time is acceptable (< 500ms)
            if (( $(echo "$db_latency < 500" | bc -l 2>/dev/null || echo "0") )); then
                log_success "Database performance within acceptable limits"
            else
                log_warning "Database response time high: ${db_latency}ms"
            fi
        fi
    fi
    
    return 0
}

health_check_memory_and_resources() {
    log_info "Checking application resource usage..."
    
    local metrics_response=$(http_request_with_metrics "$BASE_URL/api/v1/metrics/system" 200)
    if [[ $? -ne 0 ]]; then
        log_warning "System metrics endpoint not available"
        return 0  # Non-critical
    fi
    
    # Check for memory usage indicators
    if echo "$metrics_response" | grep -q "memory\|cpu\|load"; then
        log_success "System metrics are being collected"
        
        # Extract memory usage if available
        local memory_usage=$(echo "$metrics_response" | grep -o '"memory_usage":[0-9.]*' | cut -d':' -f2)
        if [[ -n "$memory_usage" ]]; then
            log_info "Memory usage: ${memory_usage}%"
            
            if (( $(echo "$memory_usage < 85" | bc -l 2>/dev/null || echo "0") )); then
                log_success "Memory usage within normal limits"
            else
                log_warning "High memory usage detected: ${memory_usage}%"
            fi
        fi
    fi
    
    return 0
}

health_check_ssl_certificate() {
    log_info "Validating SSL certificate..."
    
    if [[ "$BASE_URL" =~ ^https:// ]]; then
        local domain=$(echo "$BASE_URL" | sed 's|https://||' | cut -d'/' -f1)
        
        local cert_info=$(echo | timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
        
        if [[ -n "$cert_info" ]]; then
            local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
            local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [[ $days_until_expiry -gt 30 ]]; then
                log_success "SSL certificate valid for $days_until_expiry days"
            elif [[ $days_until_expiry -gt 0 ]]; then
                log_warning "SSL certificate expires in $days_until_expiry days"
            else
                log_critical "SSL certificate has expired!"
                return 1
            fi
        else
            log_warning "Could not validate SSL certificate"
        fi
    else
        log_info "HTTP endpoint - SSL check skipped"
    fi
    
    return 0
}

health_check_sustained_load() {
    log_info "Running sustained load test for ${HEALTH_CHECK_DURATION}s..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + HEALTH_CHECK_DURATION))
    local success_count=0
    local failure_count=0
    local total_response_time=0
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local request_start=$(date +%s%N)
        
        if http_request_with_metrics "$BASE_URL/api/v1/health" 200 >/dev/null; then
            ((success_count++))
        else
            ((failure_count++))
        fi
        
        local request_end=$(date +%s%N)
        local request_time=$(( (request_end - request_start) / 1000000 ))
        total_response_time=$((total_response_time + request_time))
        
        sleep $HEALTH_CHECK_INTERVAL
        
        # Progress indicator
        local elapsed=$(($(date +%s) - start_time))
        local progress=$((elapsed * 100 / HEALTH_CHECK_DURATION))
        echo -ne "\r${BLUE}[INFO]${NC} Sustained load test progress: ${progress}%"
    done
    
    echo  # New line after progress indicator
    
    local total_requests=$((success_count + failure_count))
    local success_rate=$(echo "scale=2; $success_count / $total_requests * 100" | bc -l 2>/dev/null || echo "0")
    local avg_response_time=$(echo "scale=2; $total_response_time / $total_requests" | bc -l 2>/dev/null || echo "0")
    
    log_info "Sustained load test results:"
    log_info "  Total requests: $total_requests"
    log_info "  Success rate: ${success_rate}%"
    log_info "  Average response time: ${avg_response_time}ms"
    
    if (( $(echo "$success_rate >= 95" | bc -l 2>/dev/null || echo "0") )); then
        log_success "Sustained load test passed (${success_rate}% success rate)"
        return 0
    else
        log_critical "Sustained load test failed (${success_rate}% success rate < 95%)"
        return 1
    fi
}

# ==============================================================================
# Non-Critical Health Checks
# ==============================================================================

health_check_monitoring_endpoints() {
    log_info "Checking monitoring and metrics endpoints..."
    
    # Prometheus metrics endpoint
    if http_request_with_metrics "$BASE_URL/metrics" 200 >/dev/null; then
        log_success "Prometheus metrics endpoint available"
    else
        log_warning "Prometheus metrics endpoint not available"
    fi
    
    # Application metrics
    if http_request_with_metrics "$BASE_URL/api/v1/metrics" 200 >/dev/null; then
        log_success "Application metrics endpoint available"
    else
        log_warning "Application metrics endpoint not available"
    fi
    
    return 0
}

health_check_security_headers() {
    log_info "Validating security headers and configuration..."
    
    local headers=$(curl -s -I "$BASE_URL" 2>/dev/null || echo "")
    
    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
    )
    
    local headers_found=0
    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            ((headers_found++))
            log_success "✓ $header header present"
        else
            log_warning "✗ $header header missing"
        fi
    done
    
    if [[ $headers_found -ge 3 ]]; then
        log_success "Security headers: $headers_found/${#required_headers[@]} present"
        return 0
    else
        log_warning "Insufficient security headers: $headers_found/${#required_headers[@]}"
        return 1
    fi
}

# ==============================================================================
# Performance Analysis
# ==============================================================================

analyze_performance_metrics() {
    log_info "Analyzing performance metrics..."
    
    if [[ ${#RESPONSE_TIMES[@]} -gt 0 ]]; then
        local total_time=0
        local min_time=${RESPONSE_TIMES[0]}
        local max_time=${RESPONSE_TIMES[0]}
        
        for time in "${RESPONSE_TIMES[@]}"; do
            total_time=$(echo "$total_time + $time" | bc -l 2>/dev/null || echo "$total_time")
            if (( $(echo "$time < $min_time" | bc -l 2>/dev/null || echo "0") )); then
                min_time=$time
            fi
            if (( $(echo "$time > $max_time" | bc -l 2>/dev/null || echo "0") )); then
                max_time=$time
            fi
        done
        
        local avg_time=$(echo "scale=3; $total_time / ${#RESPONSE_TIMES[@]}" | bc -l 2>/dev/null || echo "0")
        
        log_info "Performance Summary:"
        log_info "  Average response time: ${avg_time}s"
        log_info "  Minimum response time: ${min_time}s"
        log_info "  Maximum response time: ${max_time}s"
        log_info "  Total requests measured: ${#RESPONSE_TIMES[@]}"
        
        if (( $(echo "$avg_time < 2.0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "Average response time is excellent (< 2s)"
        elif (( $(echo "$avg_time < 5.0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "Average response time is acceptable (< 5s)"
        else
            log_warning "Average response time is high (> 5s)"
        fi
    fi
}

# ==============================================================================
# Main Health Check Execution
# ==============================================================================

main() {
    log_info "=============================================================="
    log_info "OpsSight Production Health Checks"
    log_info "Target: $BASE_URL"
    log_info "Timeout: ${TIMEOUT}s | Max Retries: $MAX_RETRIES"
    log_info "Sustained Load Duration: ${HEALTH_CHECK_DURATION}s"
    log_info "=============================================================="
    echo
    
    # Critical health checks (must pass for production readiness)
    log_info "🔴 CRITICAL HEALTH CHECKS"
    run_health_check "Application Uptime" health_check_application_uptime critical
    run_health_check "API Endpoints" health_check_api_endpoints critical
    run_health_check "Database Performance" health_check_database_performance critical
    run_health_check "SSL Certificate" health_check_ssl_certificate critical
    run_health_check "Sustained Load Test" health_check_sustained_load critical
    
    echo
    
    # Non-critical health checks (warnings only)
    log_info "🟡 MONITORING & SECURITY CHECKS"
    run_health_check "Memory and Resources" health_check_memory_and_resources warning
    run_health_check "Monitoring Endpoints" health_check_monitoring_endpoints warning
    run_health_check "Security Headers" health_check_security_headers warning
    
    echo
    
    # Performance analysis
    analyze_performance_metrics
    
    echo
    log_info "=============================================================="
    log_info "Health Check Results Summary"
    log_info "=============================================================="
    log_success "Critical Tests Passed: $CRITICAL_TESTS_PASSED"
    
    if [[ $WARNING_TESTS -gt 0 ]]; then
        log_warning "Warning Tests: $WARNING_TESTS"
        log_warning "Warning Issues:"
        for test in "${WARNING_TESTS_LIST[@]}"; do
            log_warning "  - $test"
        done
    fi
    
    if [[ $CRITICAL_TESTS_FAILED -gt 0 ]]; then
        log_critical "Critical Tests Failed: $CRITICAL_TESTS_FAILED"
        log_critical "CRITICAL FAILURES:"
        for test in "${FAILED_CRITICAL_TESTS[@]}"; do
            log_critical "  - $test"
        done
        echo
        log_critical "🚨 HEALTH CHECK FAILED! Production deployment has CRITICAL issues."
        log_critical "🛑 Recommend immediate rollback or hotfix."
        exit 1
    else
        log_success "🎉 All critical health checks PASSED!"
        if [[ $WARNING_TESTS -gt 0 ]]; then
            log_warning "⚠️  Some non-critical issues detected - monitor closely."
        else
            log_success "✨ Perfect health - all checks passed!"
        fi
        log_success "🚀 Production deployment is HEALTHY and ready."
        exit 0
    fi
}

# Handle script arguments and help
if [[ $# -eq 0 ]]; then
    log_warning "No URL provided, using default: $BASE_URL"
elif [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [URL]"
    echo "  URL: Base URL to health check (default: https://opssight.dev)"
    echo ""
    echo "This script performs comprehensive production health checks including:"
    echo "  - Application uptime and availability"
    echo "  - API endpoint validation"
    echo "  - Database performance testing"
    echo "  - SSL certificate validation"
    echo "  - Sustained load testing"
    echo "  - Security and monitoring validation"
    echo ""
    echo "Examples:"
    echo "  $0 https://opssight.dev"
    echo "  $0 https://green.opssight.dev"
    echo "  $0 https://staging.opssight.dev"
    exit 0
fi

# Verify required tools
for tool in curl bc date openssl; do
    if ! command -v $tool &> /dev/null; then
        log_error "Required tool '$tool' is not installed"
        exit 1
    fi
done

# Run main function
main "$@"