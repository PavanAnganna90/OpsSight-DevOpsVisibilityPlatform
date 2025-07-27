#!/bin/bash

# OpsSight Current Deployment Validation Script
# Validates the currently running local deployment

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if a service is healthy
check_service_health() {
    local service_name=$1
    local health_url=$2
    local expected_response=$3
    
    if curl -s "$health_url" | grep -q "$expected_response"; then
        print_success "$service_name is healthy"
        return 0
    else
        print_error "$service_name health check failed"
        return 1
    fi
}

echo "🚀 OpsSight Current Deployment Validation"
echo "=========================================="
echo

# Docker Services Validation
print_status "Validating Docker services..."
docker_services=("frontend" "backend" "prometheus" "grafana" "alertmanager" "redis" "db")
for service in "${docker_services[@]}"; do
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$service" | grep -q "healthy\|Up"; then
        print_success "Docker service $service is running"
    else
        print_error "Docker service $service is not healthy"
    fi
done

echo

# Application Endpoints Validation
print_status "Validating application endpoints..."

# Backend health
check_service_health "Backend API" "http://localhost:8000/health" "healthy"

# Frontend health
check_service_health "Frontend App" "http://localhost:3000/api/health" "ok"

# Backend API v1
if curl -s http://localhost:8000/api/v1/health | grep -q "healthy"; then
    print_success "Backend API v1 is accessible"
else
    print_error "Backend API v1 is not accessible"
fi

# Frontend main page
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    print_success "Frontend main page is accessible"
else
    print_error "Frontend main page is not accessible"
fi

echo

# Monitoring Stack Validation
print_status "Validating monitoring stack..."

# Prometheus
if curl -s http://localhost:9090/-/healthy | grep -q "Healthy"; then
    print_success "Prometheus is healthy"
    
    # Check targets
    target_count=$(curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets | length' 2>/dev/null || echo "0")
    if [ "$target_count" -gt 0 ]; then
        print_success "Prometheus has $target_count active targets"
    else
        print_warning "Prometheus has no active targets"
    fi
else
    print_error "Prometheus is not healthy"
fi

# Grafana
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ | grep -q "200\|302"; then
    print_success "Grafana is responding"
else
    print_error "Grafana is not responding"
fi

# AlertManager
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9093/ | grep -q "200"; then
    print_success "AlertManager is responding"
else
    print_error "AlertManager is not responding"
fi

echo

# Infrastructure Code Validation
print_status "Validating infrastructure code..."

# GitHub workflows
workflow_count=$(ls .github/workflows/*.yml 2>/dev/null | wc -l || echo "0")
if [ "$workflow_count" -gt 0 ]; then
    print_success "Found $workflow_count GitHub workflow files"
else
    print_error "No GitHub workflow files found"
fi

# Terraform files
tf_files=$(ls infrastructure/aws/*.tf 2>/dev/null | wc -l || echo "0")
if [ "$tf_files" -gt 0 ]; then
    print_success "Found $tf_files Terraform files"
else
    print_error "No Terraform files found"
fi

# Helm charts
helm_templates=$(ls helm/opsight/templates/*.yaml 2>/dev/null | wc -l || echo "0")
if [ "$helm_templates" -gt 0 ]; then
    print_success "Found $helm_templates Helm template files"
else
    print_error "No Helm template files found"
fi

# Kubernetes manifests
k8s_manifests=$(find k8s -name "*.yaml" 2>/dev/null | wc -l || echo "0")
if [ "$k8s_manifests" -gt 0 ]; then
    print_success "Found $k8s_manifests Kubernetes manifest files"
else
    print_error "No Kubernetes manifest files found"
fi

echo

# Security Configurations
print_status "Validating security configurations..."

# SSL/TLS configurations
if [ -f "k8s/security/cert-manager-setup.yaml" ]; then
    print_success "Certificate manager configuration exists"
else
    print_warning "Certificate manager configuration missing"
fi

# Network policies
network_policies=$(find k8s -name "*network*" 2>/dev/null | wc -l || echo "0")
if [ "$network_policies" -gt 0 ]; then
    print_success "Found $network_policies network policy files"
else
    print_warning "No network policy files found"
fi

# RBAC configurations
rbac_configs=$(find k8s -name "*rbac*" 2>/dev/null | wc -l || echo "0")
if [ "$rbac_configs" -gt 0 ]; then
    print_success "Found $rbac_configs RBAC configuration files"
else
    print_warning "No RBAC configuration files found"
fi

echo

# Database Connectivity
print_status "Validating database connectivity..."

# Test database connection from backend
if docker exec devops-app-dev-cursor-backend-1 python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(
        host=os.getenv('DATABASE_HOST', 'db'),
        port=os.getenv('DATABASE_PORT', '5432'),
        database=os.getenv('DATABASE_NAME', 'opssight'),
        user=os.getenv('DATABASE_USER', 'postgres'),
        password=os.getenv('DATABASE_PASSWORD', 'postgres')
    )
    conn.close()
    print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
" 2>/dev/null | grep -q "successful"; then
    print_success "Database connectivity test passed"
else
    print_error "Database connectivity test failed"
fi

# Test Redis connection
if docker exec devops-app-dev-cursor-backend-1 python -c "
import redis
import os
try:
    r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), port=6379, decode_responses=True)
    r.ping()
    print('Redis connection successful')
except Exception as e:
    print(f'Redis connection failed: {e}')
    exit(1)
" 2>/dev/null | grep -q "successful"; then
    print_success "Redis connectivity test passed"
else
    print_error "Redis connectivity test failed"
fi

echo

# API Tests
print_status "Performing API tests..."

# Test backend health endpoint JSON
if curl -s http://localhost:8000/health | jq -e '.status == "healthy"' >/dev/null 2>&1; then
    print_success "Backend health endpoint returns valid JSON"
else
    print_error "Backend health endpoint test failed"
fi

# Test frontend health endpoint JSON
if curl -s http://localhost:3000/api/health | jq -e '.status == "ok"' >/dev/null 2>&1; then
    print_success "Frontend health endpoint returns valid JSON"
else
    print_error "Frontend health endpoint test failed"
fi

# Test metrics endpoint
if curl -s http://localhost:8000/metrics | grep -q "http_requests_total"; then
    print_success "Metrics endpoint is exposing Prometheus metrics"
else
    print_warning "Metrics endpoint may not be properly configured"
fi

echo

# Generate Summary Report
echo "=== VALIDATION SUMMARY REPORT ==="
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
if [ $FAILED_TESTS -eq 0 ] && [ $WARNINGS -le 3 ]; then
    echo -e "${GREEN}🎉 OVERALL ASSESSMENT: SYSTEM READY${NC}"
    echo "The OpsSight platform is functioning well!"
elif [ $FAILED_TESTS -le 2 ] && [ $WARNINGS -le 5 ]; then
    echo -e "${YELLOW}⚠️  OVERALL ASSESSMENT: NEEDS MINOR FIXES${NC}"
    echo "The platform is mostly ready but requires minor fixes."
else
    echo -e "${RED}❌ OVERALL ASSESSMENT: NEEDS ATTENTION${NC}"
    echo "The platform requires fixes before production deployment."
fi

echo

# Save results
{
    echo "OpsSight Deployment Validation Report"
    echo "Generated: $(date)"
    echo "======================================"
    echo
    echo "Statistics:"
    echo "Passed: $PASSED_TESTS"
    echo "Warnings: $WARNINGS"
    echo "Failed: $FAILED_TESTS"
    echo "Total: $TOTAL_TESTS"
    echo "Success Rate: ${success_rate}%"
} > CURRENT_VALIDATION_REPORT.md

print_success "Validation report saved to CURRENT_VALIDATION_REPORT.md"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi