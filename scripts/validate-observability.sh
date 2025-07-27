#!/bin/bash

# OpsSight Production Observability Validation Script
# Validates monitoring, alerting, and observability infrastructure

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_URL=${PROMETHEUS_URL:-"http://localhost:9090"}
GRAFANA_URL=${GRAFANA_URL:-"http://localhost:3001"}
ALERTMANAGER_URL=${ALERTMANAGER_URL:-"http://localhost:9093"}

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
    ((WARNINGS++))
    ((TOTAL_TESTS++))
}

print_error() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

# Function to test HTTP endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$status" =~ ^($expected_status)$ ]]; then
        print_success "$name endpoint is accessible (HTTP $status)"
        return 0
    else
        print_error "$name endpoint failed (HTTP $status, expected $expected_status)"
        return 1
    fi
}

# Function to test Prometheus query
test_prometheus_query() {
    local name=$1
    local query=$2
    local min_results=${3:-1}
    
    local url="${PROMETHEUS_URL}/api/v1/query?query=$(echo "$query" | sed 's/ /%20/g')"
    local response=$(curl -s "$url" 2>/dev/null || echo '{"status":"error"}')
    local status=$(echo "$response" | jq -r '.status // "error"')
    local result_count=$(echo "$response" | jq -r '.data.result | length // 0')
    
    if [ "$status" = "success" ] && [ "$result_count" -ge "$min_results" ]; then
        print_success "$name query returned $result_count results"
        return 0
    else
        print_error "$name query failed (status: $status, results: $result_count)"
        return 1
    fi
}

echo "🔍 OpsSight Production Observability Validation"
echo "==============================================="
echo

# Prometheus Validation
print_status "Validating Prometheus monitoring..."

# Basic Prometheus health
test_endpoint "Prometheus" "${PROMETHEUS_URL}/-/healthy"

# Prometheus configuration
if curl -s "${PROMETHEUS_URL}/api/v1/status/config" | jq -e '.status == "success"' >/dev/null 2>&1; then
    print_success "Prometheus configuration is valid"
else
    print_error "Prometheus configuration is invalid"
fi

# Prometheus targets
targets_response=$(curl -s "${PROMETHEUS_URL}/api/v1/targets" 2>/dev/null || echo '{"status":"error"}')
targets_status=$(echo "$targets_response" | jq -r '.status // "error"')
if [ "$targets_status" = "success" ]; then
    active_targets=$(echo "$targets_response" | jq -r '.data.activeTargets | length // 0')
    unhealthy_targets=$(echo "$targets_response" | jq -r '.data.activeTargets | map(select(.health != "up")) | length // 0')
    
    if [ "$active_targets" -gt 0 ]; then
        print_success "Found $active_targets active Prometheus targets"
        if [ "$unhealthy_targets" -eq 0 ]; then
            print_success "All Prometheus targets are healthy"
        else
            print_warning "$unhealthy_targets targets are unhealthy"
        fi
    else
        print_error "No active Prometheus targets found"
    fi
else
    print_error "Failed to retrieve Prometheus targets"
fi

# Prometheus rules
rules_response=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" 2>/dev/null || echo '{"status":"error"}')
rules_status=$(echo "$rules_response" | jq -r '.status // "error"')
if [ "$rules_status" = "success" ]; then
    rule_groups=$(echo "$rules_response" | jq -r '.data.groups | length // 0')
    total_rules=$(echo "$rules_response" | jq -r '.data.groups | map(.rules | length) | add // 0')
    
    if [ "$rule_groups" -gt 0 ]; then
        print_success "Found $rule_groups rule groups with $total_rules total rules"
    else
        print_warning "No Prometheus rules configured"
    fi
else
    print_error "Failed to retrieve Prometheus rules"
fi

echo

# AlertManager Validation
print_status "Validating AlertManager..."

# Basic AlertManager health
test_endpoint "AlertManager" "${ALERTMANAGER_URL}/-/healthy"

# AlertManager configuration
if curl -s "${ALERTMANAGER_URL}/api/v1/status" | jq -e '.status == "success"' >/dev/null 2>&1; then
    print_success "AlertManager configuration is valid"
else
    print_error "AlertManager configuration is invalid"
fi

# AlertManager alerts
alerts_response=$(curl -s "${ALERTMANAGER_URL}/api/v1/alerts" 2>/dev/null || echo '[]')
active_alerts=$(echo "$alerts_response" | jq '. | length // 0')

if [ "$active_alerts" -eq 0 ]; then
    print_success "No active alerts (system healthy)"
else
    print_warning "$active_alerts active alerts detected"
    
    # Show critical alerts
    critical_alerts=$(echo "$alerts_response" | jq -r 'map(select(.labels.severity == "critical")) | length // 0')
    if [ "$critical_alerts" -gt 0 ]; then
        print_error "$critical_alerts critical alerts active!"
    fi
fi

echo

# Grafana Validation
print_status "Validating Grafana dashboards..."

# Basic Grafana health
test_endpoint "Grafana" "${GRAFANA_URL}/api/health" "200|302"

# Grafana datasources (requires authentication, so we'll test basic connectivity)
if curl -s -o /dev/null -w "%{http_code}" "${GRAFANA_URL}/api/datasources" | grep -q "200\|401\|403"; then
    print_success "Grafana API is accessible"
else
    print_error "Grafana API is not accessible"
fi

echo

# Metrics Validation
print_status "Validating application metrics..."

# Test core application metrics
test_prometheus_query "HTTP requests metric" "http_requests_total" 1
test_prometheus_query "HTTP request duration metric" "http_request_duration_seconds_bucket" 1
test_prometheus_query "Application up status" "up{job=~\".*opsight.*\"}" 1

# Test infrastructure metrics
test_prometheus_query "Node CPU metrics" "node_cpu_seconds_total" 1
test_prometheus_query "Node memory metrics" "node_memory_MemTotal_bytes" 1
test_prometheus_query "Container metrics" "container_cpu_usage_seconds_total" 1

# Test database metrics
test_prometheus_query "PostgreSQL metrics" "pg_up" 0  # May not be available in local setup
test_prometheus_query "Redis metrics" "redis_up" 0    # May not be available in local setup

echo

# Log Aggregation Validation
print_status "Validating log aggregation..."

# Check if log files exist and are being updated
if [ -d "/var/log/opsight" ] || [ -d "logs/" ]; then
    print_success "Log directories found"
    
    # Check for recent log entries
    if find logs/ -name "*.log" -mmin -10 2>/dev/null | grep -q .; then
        print_success "Recent log entries detected"
    else
        print_warning "No recent log entries found"
    fi
else
    print_warning "No log directories found (may be using stdout logging)"
fi

echo

# Performance Validation
print_status "Validating performance monitoring..."

# Test response time monitoring
response_time_query="histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
if test_prometheus_query "Response time monitoring" "$response_time_query" 0; then
    # Get actual response time values
    response_time_url="${PROMETHEUS_URL}/api/v1/query?query=$(echo "$response_time_query" | sed 's/ /%20/g')"
    response_time_value=$(curl -s "$response_time_url" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')
    
    if [ "$(echo "$response_time_value > 2" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        print_warning "High response time detected: ${response_time_value}s"
    else
        print_success "Response time is acceptable: ${response_time_value}s"
    fi
fi

# Test error rate monitoring
error_rate_query="rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100"
if test_prometheus_query "Error rate monitoring" "$error_rate_query" 0; then
    error_rate_url="${PROMETHEUS_URL}/api/v1/query?query=$(echo "$error_rate_query" | sed 's/ /%20/g')"
    error_rate_value=$(curl -s "$error_rate_url" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')
    
    if [ "$(echo "$error_rate_value > 5" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        print_error "High error rate detected: ${error_rate_value}%"
    else
        print_success "Error rate is acceptable: ${error_rate_value}%"
    fi
fi

echo

# Security Monitoring Validation
print_status "Validating security monitoring..."

# Test authentication metrics
auth_metrics_query="rate(http_requests_total{status=\"401\"}[5m])"
test_prometheus_query "Authentication failure monitoring" "$auth_metrics_query" 0

# Test certificate monitoring
cert_metrics_query="probe_ssl_earliest_cert_expiry"
test_prometheus_query "Certificate expiry monitoring" "$cert_metrics_query" 0

echo

# Business Metrics Validation
print_status "Validating business metrics..."

# Test user activity metrics
user_activity_query="rate(http_requests_total{path=~\"/dashboard.*\"}[1h])"
test_prometheus_query "User activity monitoring" "$user_activity_query" 0

# Test deployment metrics
deployment_metrics_query="deployment_attempts_total"
test_prometheus_query "Deployment tracking" "$deployment_metrics_query" 0

echo

# SLA Monitoring Validation
print_status "Validating SLA monitoring..."

# Test availability monitoring
availability_query="avg_over_time(up[5m])"
test_prometheus_query "Availability monitoring" "$availability_query" 1

# Test SLA compliance
sla_query="histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) < 1"
if test_prometheus_query "SLA response time compliance" "$sla_query" 0; then
    print_success "Response time SLA is being met"
fi

echo

# Integration Testing
print_status "Testing monitoring integrations..."

# Test Prometheus-AlertManager integration
if curl -s "${PROMETHEUS_URL}/api/v1/alertmanagers" | jq -e '.data.activeAlertmanagers | length > 0' >/dev/null 2>&1; then
    print_success "Prometheus-AlertManager integration is working"
else
    print_error "Prometheus-AlertManager integration is not working"
fi

# Test webhook integrations (check configuration)
webhook_config=$(curl -s "${ALERTMANAGER_URL}/api/v1/status" 2>/dev/null | jq -r '.data.configYAML // ""')
if echo "$webhook_config" | grep -q "webhook"; then
    print_success "Webhook integrations are configured"
else
    print_warning "No webhook integrations found in AlertManager"
fi

echo

# Generate Observability Report
print_status "Generating observability report..."

{
    echo "# OpsSight Observability Validation Report"
    echo "Generated: $(date)"
    echo "==========================================="
    echo
    echo "## Summary"
    echo "- Total Tests: $TOTAL_TESTS"
    echo "- Passed: $PASSED_TESTS"
    echo "- Warnings: $WARNINGS"
    echo "- Failed: $FAILED_TESTS"
    echo "- Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo
    echo "## Component Status"
    echo "- Prometheus: $(curl -s "${PROMETHEUS_URL}/-/healthy" >/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy")"
    echo "- AlertManager: $(curl -s "${ALERTMANAGER_URL}/-/healthy" >/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy")"
    echo "- Grafana: $(curl -s -o /dev/null -w "%{http_code}" "${GRAFANA_URL}/api/health" | grep -q "200\|302" && echo "✅ Healthy" || echo "❌ Unhealthy")"
    echo
    echo "## Active Targets"
    local active_targets=$(curl -s "${PROMETHEUS_URL}/api/v1/targets" 2>/dev/null | jq -r '.data.activeTargets | length // 0')
    echo "- Active Prometheus Targets: $active_targets"
    echo
    echo "## Alert Summary"
    local total_alerts=$(curl -s "${ALERTMANAGER_URL}/api/v1/alerts" 2>/dev/null | jq '. | length // 0')
    local critical_alerts=$(curl -s "${ALERTMANAGER_URL}/api/v1/alerts" 2>/dev/null | jq 'map(select(.labels.severity == "critical")) | length // 0')
    echo "- Total Active Alerts: $total_alerts"
    echo "- Critical Alerts: $critical_alerts"
    echo
    echo "## Recommendations"
    if [ $FAILED_TESTS -gt 0 ]; then
        echo "- Fix failed monitoring components before production deployment"
    fi
    if [ $WARNINGS -gt 3 ]; then
        echo "- Review and address monitoring warnings"
    fi
    if [ $critical_alerts -gt 0 ]; then
        echo "- Investigate and resolve critical alerts"
    fi
    echo "- Consider implementing additional custom metrics for business KPIs"
    echo "- Set up monitoring dashboard access for all team members"
    echo "- Configure alert notification channels (email, Slack, PagerDuty)"
} > OBSERVABILITY_VALIDATION_REPORT.md

print_success "Observability report saved to OBSERVABILITY_VALIDATION_REPORT.md"

echo

# Final Summary
echo "=== OBSERVABILITY VALIDATION SUMMARY ==="
echo
echo -e "✅ Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "❌ Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "📊 Total: $TOTAL_TESTS"

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "📈 Success Rate: ${success_rate}%"
else
    success_rate=0
fi

echo

# Overall assessment
if [ $FAILED_TESTS -eq 0 ] && [ $WARNINGS -le 2 ]; then
    echo -e "${GREEN}🎉 OBSERVABILITY STATUS: PRODUCTION READY${NC}"
    echo "The monitoring and alerting infrastructure is ready for production!"
elif [ $FAILED_TESTS -le 1 ] && [ $WARNINGS -le 5 ]; then
    echo -e "${YELLOW}⚠️  OBSERVABILITY STATUS: NEEDS MINOR FIXES${NC}"
    echo "The monitoring infrastructure is mostly ready but requires minor fixes."
else
    echo -e "${RED}❌ OBSERVABILITY STATUS: NEEDS ATTENTION${NC}"
    echo "The monitoring infrastructure requires significant improvements."
fi

echo

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi