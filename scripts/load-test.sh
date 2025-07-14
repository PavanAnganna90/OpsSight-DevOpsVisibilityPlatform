#!/bin/bash

# OpsSight Load Testing Script
# This script performs load testing on the OpsSight application
# Author: OpsSight Development Team
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="/tmp/opsight-load-test-$$"
LOG_FILE="$TEMP_DIR/load-test.log"
RESULTS_FILE="$TEMP_DIR/results.json"

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
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
TEST_DURATION="${TEST_DURATION:-60}"
RAMP_UP_TIME="${RAMP_UP_TIME:-10}"
BASE_URL=""
API_BASE_URL=""

# Test results
TOTAL_REQUESTS=0
SUCCESSFUL_REQUESTS=0
FAILED_REQUESTS=0
AVERAGE_RESPONSE_TIME=0
MAX_RESPONSE_TIME=0
MIN_RESPONSE_TIME=99999

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}        OpsSight Load Testing${NC}"
    echo -e "${BLUE}        Concurrent Users: $CONCURRENT_USERS${NC}"
    echo -e "${BLUE}        Test Duration: ${TEST_DURATION}s${NC}"
    echo -e "${BLUE}        Namespace: $NAMESPACE${NC}"
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
        "WARN") echo -e "${YELLOW}[WARN]${NC} $message" ;;
    esac
}

setup_port_forwards() {
    log "INFO" "Setting up port forwards for load testing..."
    
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
        log "SUCCESS" "Port forwards established"
        echo "frontend_pid=$frontend_pid" > "$TEMP_DIR/pids"
        echo "backend_pid=$backend_pid" >> "$TEMP_DIR/pids"
        return 0
    else
        log "ERROR" "Failed to establish port forwards"
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

# Function to run a single HTTP request and measure response time
run_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local auth_header="${4:-}"
    
    local start_time end_time response_time http_code
    start_time=$(date +%s%3N)  # milliseconds
    
    local curl_cmd="curl -s -w '%{http_code}' -o /dev/null"
    [ -n "$auth_header" ] && curl_cmd="$curl_cmd -H 'Authorization: $auth_header'"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    http_code=$(eval "$curl_cmd" 2>/dev/null || echo "000")
    end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))
    
    echo "$http_code:$response_time"
}

# Function to run concurrent requests
run_concurrent_test() {
    local url="$1"
    local test_name="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    log "INFO" "Running load test: $test_name"
    log "INFO" "URL: $url"
    log "INFO" "Method: $method"
    log "INFO" "Concurrent users: $CONCURRENT_USERS"
    log "INFO" "Duration: ${TEST_DURATION}s"
    
    local pids=()
    local worker_results_dir="$TEMP_DIR/workers"
    mkdir -p "$worker_results_dir"
    
    # Start worker processes
    for ((i=1; i<=CONCURRENT_USERS; i++)); do
        {
            local worker_file="$worker_results_dir/worker_$i.txt"
            local end_time=$(($(date +%s) + TEST_DURATION))
            local request_count=0
            
            # Ramp up gradually
            local delay=$((i * RAMP_UP_TIME / CONCURRENT_USERS))
            sleep "$delay"
            
            while [ $(date +%s) -lt $end_time ]; do
                local result
                result=$(run_request "$url" "$method" "$data")
                echo "$result" >> "$worker_file"
                request_count=$((request_count + 1))
                
                # Small delay to prevent overwhelming the system
                sleep 0.1
            done
            
            echo "WORKER_$i:$request_count" >> "$worker_file"
        } &
        pids+=($!)
    done
    
    # Monitor progress
    local progress_interval=5
    local elapsed=0
    while [ $elapsed -lt $TEST_DURATION ]; do
        sleep $progress_interval
        elapsed=$((elapsed + progress_interval))
        log "INFO" "Test progress: ${elapsed}/${TEST_DURATION}s ($(( elapsed * 100 / TEST_DURATION ))%)"
    done
    
    # Wait for all workers to complete
    log "INFO" "Waiting for workers to complete..."
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    # Aggregate results
    aggregate_results "$worker_results_dir" "$test_name"
}

# Function to aggregate test results
aggregate_results() {
    local results_dir="$1"
    local test_name="$2"
    
    local total_requests=0
    local successful_requests=0
    local failed_requests=0
    local total_response_time=0
    local max_response_time=0
    local min_response_time=99999
    local response_times=()
    
    # Process worker results
    for worker_file in "$results_dir"/worker_*.txt; do
        [ -f "$worker_file" ] || continue
        
        while IFS=':' read -r http_code response_time; do
            if [[ "$http_code" =~ ^[0-9]+$ ]] && [[ "$response_time" =~ ^[0-9]+$ ]]; then
                total_requests=$((total_requests + 1))
                total_response_time=$((total_response_time + response_time))
                response_times+=("$response_time")
                
                if [ "$response_time" -gt "$max_response_time" ]; then
                    max_response_time="$response_time"
                fi
                
                if [ "$response_time" -lt "$min_response_time" ]; then
                    min_response_time="$response_time"
                fi
                
                if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
                    successful_requests=$((successful_requests + 1))
                else
                    failed_requests=$((failed_requests + 1))
                fi
            fi
        done < "$worker_file"
    done
    
    # Calculate statistics
    local average_response_time=0
    if [ $total_requests -gt 0 ]; then
        average_response_time=$((total_response_time / total_requests))
    fi
    
    local success_rate=0
    if [ $total_requests -gt 0 ]; then
        success_rate=$((successful_requests * 100 / total_requests))
    fi
    
    local requests_per_second=0
    if [ $TEST_DURATION -gt 0 ]; then
        requests_per_second=$((total_requests / TEST_DURATION))
    fi
    
    # Calculate percentiles
    local p95_response_time p99_response_time
    if [ ${#response_times[@]} -gt 0 ]; then
        # Sort response times
        IFS=$'\n' response_times=($(sort -n <<<"${response_times[*]}"))
        
        local p95_index=$(( ${#response_times[@]} * 95 / 100 ))
        local p99_index=$(( ${#response_times[@]} * 99 / 100 ))
        
        p95_response_time=${response_times[$p95_index]:-0}
        p99_response_time=${response_times[$p99_index]:-0}
    else
        p95_response_time=0
        p99_response_time=0
    fi
    
    # Log results
    log "SUCCESS" "=== Load Test Results: $test_name ==="
    log "INFO" "Total Requests: $total_requests"
    log "INFO" "Successful Requests: $successful_requests"
    log "INFO" "Failed Requests: $failed_requests"
    log "INFO" "Success Rate: ${success_rate}%"
    log "INFO" "Requests per Second: $requests_per_second"
    log "INFO" "Average Response Time: ${average_response_time}ms"
    log "INFO" "Min Response Time: ${min_response_time}ms"
    log "INFO" "Max Response Time: ${max_response_time}ms"
    log "INFO" "95th Percentile: ${p95_response_time}ms"
    log "INFO" "99th Percentile: ${p99_response_time}ms"
    
    # Save results to JSON
    cat >> "$RESULTS_FILE" << EOF
{
  "test_name": "$test_name",
  "timestamp": "$(date -Iseconds)",
  "configuration": {
    "concurrent_users": $CONCURRENT_USERS,
    "test_duration": $TEST_DURATION,
    "ramp_up_time": $RAMP_UP_TIME
  },
  "results": {
    "total_requests": $total_requests,
    "successful_requests": $successful_requests,
    "failed_requests": $failed_requests,
    "success_rate": $success_rate,
    "requests_per_second": $requests_per_second,
    "response_times": {
      "average": $average_response_time,
      "min": $min_response_time,
      "max": $max_response_time,
      "p95": $p95_response_time,
      "p99": $p99_response_time
    }
  }
},
EOF
    
    # Update global counters
    TOTAL_REQUESTS=$((TOTAL_REQUESTS + total_requests))
    SUCCESSFUL_REQUESTS=$((SUCCESSFUL_REQUESTS + successful_requests))
    FAILED_REQUESTS=$((FAILED_REQUESTS + failed_requests))
    
    # Performance evaluation
    if [ $success_rate -ge 99 ] && [ $average_response_time -le 1000 ] && [ $p95_response_time -le 2000 ]; then
        log "SUCCESS" "✅ Performance test PASSED for $test_name"
        return 0
    else
        log "ERROR" "❌ Performance test FAILED for $test_name"
        return 1
    fi
}

# Monitor system resources during test
monitor_resources() {
    log "INFO" "Starting resource monitoring..."
    
    local monitor_file="$TEMP_DIR/resources.log"
    
    {
        while true; do
            local timestamp=$(date +%s)
            
            # Get pod resource usage
            if command -v kubectl >/dev/null 2>&1; then
                local frontend_pod backend_pod
                frontend_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
                backend_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
                
                if [ -n "$frontend_pod" ]; then
                    local frontend_cpu frontend_memory
                    frontend_cpu=$(kubectl top pod -n "$NAMESPACE" "$frontend_pod" --no-headers 2>/dev/null | awk '{print $2}' || echo "0m")
                    frontend_memory=$(kubectl top pod -n "$NAMESPACE" "$frontend_pod" --no-headers 2>/dev/null | awk '{print $3}' || echo "0Mi")
                    echo "$timestamp,frontend,$frontend_cpu,$frontend_memory" >> "$monitor_file"
                fi
                
                if [ -n "$backend_pod" ]; then
                    local backend_cpu backend_memory
                    backend_cpu=$(kubectl top pod -n "$NAMESPACE" "$backend_pod" --no-headers 2>/dev/null | awk '{print $2}' || echo "0m")
                    backend_memory=$(kubectl top pod -n "$NAMESPACE" "$backend_pod" --no-headers 2>/dev/null | awk '{print $3}' || echo "0Mi")
                    echo "$timestamp,backend,$backend_cpu,$backend_memory" >> "$monitor_file"
                fi
            fi
            
            sleep 5
        done
    } &
    
    echo $! > "$TEMP_DIR/monitor_pid"
}

stop_monitoring() {
    if [ -f "$TEMP_DIR/monitor_pid" ]; then
        local monitor_pid
        monitor_pid=$(cat "$TEMP_DIR/monitor_pid")
        kill "$monitor_pid" 2>/dev/null || true
        rm -f "$TEMP_DIR/monitor_pid"
    fi
}

# Run all load tests
run_load_tests() {
    log "INFO" "🚀 Starting load tests..."
    
    # Initialize results file
    echo "[" > "$RESULTS_FILE"
    
    # Start resource monitoring
    monitor_resources
    
    local test_passed=0
    local test_failed=0
    
    # Test 1: Frontend static content
    log "INFO" "Test 1: Frontend static content load test"
    if run_concurrent_test "$BASE_URL" "Frontend Static Content"; then
        test_passed=$((test_passed + 1))
    else
        test_failed=$((test_failed + 1))
    fi
    
    sleep 10  # Cool down between tests
    
    # Test 2: Backend health endpoint
    log "INFO" "Test 2: Backend health endpoint load test"
    if run_concurrent_test "$API_BASE_URL/health" "Backend Health Endpoint"; then
        test_passed=$((test_passed + 1))
    else
        test_failed=$((test_failed + 1))
    fi
    
    sleep 10
    
    # Test 3: API documentation endpoint
    log "INFO" "Test 3: API documentation load test"
    if run_concurrent_test "$API_BASE_URL/docs" "API Documentation"; then
        test_passed=$((test_passed + 1))
    else
        test_failed=$((test_failed + 1))
    fi
    
    sleep 10
    
    # Test 4: Mixed workload (if authentication is available)
    log "INFO" "Test 4: Mixed API workload test"
    # This would include a mix of different API endpoints
    # For now, we'll test the OpenAPI schema endpoint
    if run_concurrent_test "$API_BASE_URL/openapi.json" "OpenAPI Schema"; then
        test_passed=$((test_passed + 1))
    else
        test_failed=$((test_failed + 1))
    fi
    
    # Stop monitoring
    stop_monitoring
    
    # Close JSON array
    sed -i '$ s/,$//' "$RESULTS_FILE"  # Remove last comma
    echo "]" >> "$RESULTS_FILE"
    
    log "INFO" "Load testing completed"
    log "INFO" "Tests Passed: $test_passed"
    log "INFO" "Tests Failed: $test_failed"
    
    return $test_failed
}

# Generate comprehensive report
generate_report() {
    local report_file="$PROJECT_ROOT/load-test-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>OpsSight Load Testing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .test-result { margin: 20px 0; padding: 15px; border-radius: 5px; }
        .passed { background: #e8f5e8; }
        .failed { background: #ffe8e8; }
        .chart { width: 100%; height: 300px; margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        .log-section { background: #f8f8f8; padding: 15px; margin: 20px 0; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OpsSight Load Testing Report</h1>
        <p><strong>Namespace:</strong> $NAMESPACE</p>
        <p><strong>Concurrent Users:</strong> $CONCURRENT_USERS</p>
        <p><strong>Test Duration:</strong> ${TEST_DURATION}s</p>
        <p><strong>Timestamp:</strong> $(date)</p>
    </div>
    
    <div class="summary">
        <h2>Overall Summary</h2>
        <p><strong>Total Requests:</strong> $TOTAL_REQUESTS</p>
        <p><strong>Successful Requests:</strong> $SUCCESSFUL_REQUESTS</p>
        <p><strong>Failed Requests:</strong> $FAILED_REQUESTS</p>
        <p><strong>Overall Success Rate:</strong> $(( SUCCESSFUL_REQUESTS * 100 / TOTAL_REQUESTS ))%</p>
    </div>
    
    <h2>Test Results</h2>
    <div id="test-results">
EOF
    
    # Process test results from JSON
    if command -v jq >/dev/null 2>&1 && [ -f "$RESULTS_FILE" ]; then
        jq -r '.[] | "<div class=\"test-result\"><h3>" + .test_name + "</h3><p>Success Rate: " + (.results.success_rate|tostring) + "%</p><p>Avg Response Time: " + (.results.response_times.average|tostring) + "ms</p><p>Requests/sec: " + (.results.requests_per_second|tostring) + "</p></div>"' "$RESULTS_FILE" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF
    </div>
    
    <div class="log-section">
        <h2>Detailed Log</h2>
        <pre>$(cat "$LOG_FILE")</pre>
    </div>
</body>
</html>
EOF
    
    log "INFO" "📊 Load test report generated: $report_file"
}

print_summary() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}        LOAD TEST SUMMARY${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "Configuration:"
    echo -e "  Concurrent Users: $CONCURRENT_USERS"
    echo -e "  Test Duration: ${TEST_DURATION}s"
    echo -e "  Ramp Up Time: ${RAMP_UP_TIME}s"
    echo ""
    echo -e "Results:"
    echo -e "  Total Requests: $TOTAL_REQUESTS"
    echo -e "  Successful: ${GREEN}$SUCCESSFUL_REQUESTS${NC}"
    echo -e "  Failed: ${RED}$FAILED_REQUESTS${NC}"
    
    if [ $TOTAL_REQUESTS -gt 0 ]; then
        local success_rate=$((SUCCESSFUL_REQUESTS * 100 / TOTAL_REQUESTS))
        echo -e "  Success Rate: $success_rate%"
        
        if [ $success_rate -ge 95 ]; then
            echo -e "  Status: ${GREEN}✅ LOAD TEST PASSED${NC}"
        else
            echo -e "  Status: ${RED}❌ LOAD TEST FAILED${NC}"
        fi
    fi
    
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

show_help() {
    cat << EOF
OpsSight Load Testing Script

Usage: $0 [OPTIONS]

OPTIONS:
    --namespace NAMESPACE       Kubernetes namespace [default: opsight-staging]
    --concurrent-users N        Number of concurrent users [default: 10]
    --duration SECONDS          Test duration in seconds [default: 60]
    --ramp-up SECONDS          Ramp up time in seconds [default: 10]
    --help                     Show this help message

EXAMPLES:
    $0                                    # Run with defaults
    $0 --concurrent-users 20 --duration 120   # 20 users for 2 minutes
    $0 --namespace opsight-production     # Test production namespace

EOF
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --concurrent-users)
                CONCURRENT_USERS="$2"
                shift 2
                ;;
            --duration)
                TEST_DURATION="$2"
                shift 2
                ;;
            --ramp-up)
                RAMP_UP_TIME="$2"
                shift 2
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
    
    print_header
    
    # Setup port forwards
    if ! setup_port_forwards; then
        log "ERROR" "Failed to setup port forwards"
        exit 1
    fi
    
    # Run load tests
    local test_result=0
    if ! run_load_tests; then
        test_result=1
    fi
    
    # Cleanup
    cleanup_port_forwards
    
    # Generate report and summary
    generate_report
    print_summary
    
    # Cleanup temp directory
    rm -rf "$TEMP_DIR"
    
    exit $test_result
}

# Execute main function
main "$@" 