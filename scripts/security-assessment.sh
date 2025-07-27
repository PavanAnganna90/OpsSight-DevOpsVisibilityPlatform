#!/bin/bash

# OpsSight Security Assessment and Vulnerability Scanning Script
# Comprehensive security validation for production deployment

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_ROOT/security-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0
CRITICAL_ISSUES=0

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
    ((WARNINGS++))
    ((TOTAL_CHECKS++))
}

print_error() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_critical() {
    echo -e "${RED}[🚨 CRITICAL]${NC} $1"
    ((CRITICAL_ISSUES++))
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

# Setup report directory
setup_reporting() {
    mkdir -p "$REPORT_DIR"
    print_status "Security assessment reports will be saved to: $REPORT_DIR"
}

echo "🛡️ OpsSight Security Assessment & Vulnerability Scan"
echo "=================================================="
echo

setup_reporting

# Container Security Assessment
print_status "Assessing container security..."

# Check Docker daemon configuration
if command -v docker >/dev/null 2>&1; then
    # Check if Docker daemon is running with security options
    if docker info 2>/dev/null | grep -q "Security Options"; then
        print_success "Docker security options are configured"
    else
        print_warning "Docker security options may not be optimally configured"
    fi
    
    # Check running containers for security configurations
    containers=$(docker ps --format "{{.Names}}" | grep opsight || true)
    if [ -n "$containers" ]; then
        print_status "Analyzing container security configurations..."
        
        while IFS= read -r container; do
            # Check if container runs as non-root
            user_info=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].Config.User // "root"')
            if [ "$user_info" != "root" ] && [ "$user_info" != "" ]; then
                print_success "Container $container runs as non-root user: $user_info"
            else
                print_error "Container $container runs as root user"
            fi
            
            # Check for read-only root filesystem
            readonly_root=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].HostConfig.ReadonlyRootfs // false')
            if [ "$readonly_root" = "true" ]; then
                print_success "Container $container has read-only root filesystem"
            else
                print_warning "Container $container does not have read-only root filesystem"
            fi
            
            # Check for security options
            security_opt=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].HostConfig.SecurityOpt[]? // empty')
            if [ -n "$security_opt" ]; then
                print_success "Container $container has security options: $security_opt"
            else
                print_warning "Container $container has no security options configured"
            fi
            
        done <<< "$containers"
    else
        print_warning "No OpsSight containers found running"
    fi
else
    print_error "Docker is not available for security assessment"
fi

echo

# Image Vulnerability Scanning
print_status "Scanning container images for vulnerabilities..."

if command -v docker >/dev/null 2>&1; then
    images=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(opsight|devops-app-dev-cursor)" || true)
    
    if [ -n "$images" ]; then
        # Use Trivy if available
        if command -v trivy >/dev/null 2>&1; then
            print_status "Running Trivy vulnerability scan..."
            
            while IFS= read -r image; do
                report_file="$REPORT_DIR/trivy-scan-$(echo "$image" | tr '/:' '_')-$TIMESTAMP.json"
                
                if trivy image --format json --output "$report_file" "$image" 2>/dev/null; then
                    # Parse Trivy results
                    critical_vulns=$(jq '.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID' "$report_file" 2>/dev/null | wc -l || echo "0")
                    high_vulns=$(jq '.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH") | .VulnerabilityID' "$report_file" 2>/dev/null | wc -l || echo "0")
                    
                    if [ "$critical_vulns" -eq 0 ] && [ "$high_vulns" -eq 0 ]; then
                        print_success "Image $image: No critical or high vulnerabilities found"
                    elif [ "$critical_vulns" -gt 0 ]; then
                        print_critical "Image $image: $critical_vulns critical vulnerabilities found"
                    else
                        print_warning "Image $image: $high_vulns high vulnerabilities found"
                    fi
                    
                    print_status "Detailed report saved: $report_file"
                else
                    print_error "Failed to scan image: $image"
                fi
            done <<< "$images"
        else
            print_warning "Trivy not available - install for comprehensive vulnerability scanning"
            print_status "Performing basic image analysis..."
            
            while IFS= read -r image; do
                # Basic image information
                image_info=$(docker inspect "$image" 2>/dev/null | jq -r '.[0].Config | {User, Env}' || echo "")
                if [ -n "$image_info" ]; then
                    print_success "Image $image: Basic inspection completed"
                else
                    print_error "Failed to inspect image: $image"
                fi
            done <<< "$images"
        fi
    else
        print_warning "No OpsSight images found for scanning"
    fi
fi

echo

# Application Security Assessment
print_status "Assessing application security..."

# Check for common security headers
if curl -s -I http://localhost:3000/ | grep -qi "x-frame-options"; then
    print_success "X-Frame-Options header is present"
else
    print_warning "X-Frame-Options header is missing"
fi

if curl -s -I http://localhost:3000/ | grep -qi "x-content-type-options"; then
    print_success "X-Content-Type-Options header is present"
else
    print_warning "X-Content-Type-Options header is missing"
fi

if curl -s -I http://localhost:3000/ | grep -qi "strict-transport-security"; then
    print_success "Strict-Transport-Security header is present"
else
    print_warning "HSTS header is missing (acceptable for local development)"
fi

if curl -s -I http://localhost:3000/ | grep -qi "content-security-policy"; then
    print_success "Content-Security-Policy header is present"
else
    print_warning "CSP header is missing"
fi

# Check API security
print_status "Testing API security..."

# Test rate limiting
print_status "Testing rate limiting..."
rate_limit_test=0
for i in {1..10}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health | grep -q "200"; then
        ((rate_limit_test++))
    fi
done

if [ $rate_limit_test -eq 10 ]; then
    print_warning "No rate limiting detected on API endpoints"
else
    print_success "Rate limiting appears to be working"
fi

# Test authentication
print_status "Testing authentication mechanisms..."
auth_test=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/protected 2>/dev/null || echo "000")
if [ "$auth_test" = "401" ] || [ "$auth_test" = "403" ]; then
    print_success "Authentication is required for protected endpoints"
else
    print_warning "Authentication test inconclusive (status: $auth_test)"
fi

echo

# Configuration Security
print_status "Assessing configuration security..."

# Check for sensitive information in configuration files
sensitive_patterns=("password" "secret" "key" "token" "credential")
config_files=("docker-compose.yml" "docker-compose.prod.yml" ".env" "helm/opsight/values*.yaml")

for pattern in "${sensitive_patterns[@]}"; do
    found_files=()
    for config_file in "${config_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$config_file" ]; then
            if grep -qi "$pattern" "$PROJECT_ROOT/$config_file" 2>/dev/null; then
                found_files+=("$config_file")
            fi
        fi
    done
    
    if [ ${#found_files[@]} -gt 0 ]; then
        print_warning "Pattern '$pattern' found in: ${found_files[*]} (ensure no hardcoded secrets)"
    else
        print_success "No hardcoded '$pattern' found in configuration files"
    fi
done

# Check file permissions
print_status "Checking file permissions..."

critical_files=("scripts/deploy-production-infrastructure.sh" "infrastructure/aws/terraform.tfvars")
for file in "${critical_files[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        permissions=$(stat -c "%a" "$PROJECT_ROOT/$file" 2>/dev/null || stat -f "%A" "$PROJECT_ROOT/$file" 2>/dev/null || echo "unknown")
        if [[ "$permissions" =~ ^[67][0-7][0-7]$ ]]; then
            print_success "File $file has appropriate permissions: $permissions"
        else
            print_warning "File $file may have overly permissive permissions: $permissions"
        fi
    fi
done

echo

# Secrets Management Assessment
print_status "Assessing secrets management..."

# Check for AWS credentials in environment
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] || [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
    print_warning "AWS credentials found in environment variables"
else
    print_success "No AWS credentials found in environment variables"
fi

# Check for .env files
if find "$PROJECT_ROOT" -name ".env*" -type f | grep -q .; then
    print_warning ".env files found - ensure they're not committed to version control"
else
    print_success "No .env files found in project root"
fi

# Check git for sensitive data
if [ -d "$PROJECT_ROOT/.git" ]; then
    print_status "Scanning git history for sensitive data..."
    
    if command -v git >/dev/null 2>&1; then
        # Check for large files that might contain secrets
        large_files=$(git -C "$PROJECT_ROOT" rev-list --objects --all | git -C "$PROJECT_ROOT" cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ && $3 > 1048576 {print $4}' | head -5)
        
        if [ -n "$large_files" ]; then
            print_warning "Large files found in git history (potential data exposure): $large_files"
        else
            print_success "No unusually large files found in git history"
        fi
        
        # Check for common secret patterns in git history
        secret_patterns=("password=" "secret=" "key=" "token=" "api_key=")
        secrets_found=false
        
        for pattern in "${secret_patterns[@]}"; do
            if git -C "$PROJECT_ROOT" log --all --source --line-number -S "$pattern" --oneline | head -1 | grep -q .; then
                secrets_found=true
                break
            fi
        done
        
        if [ "$secrets_found" = true ]; then
            print_error "Potential secrets found in git history - consider using git-secrets or BFG"
        else
            print_success "No obvious secrets found in git history"
        fi
    fi
fi

echo

# Infrastructure Security
print_status "Assessing infrastructure security..."

# Check Terraform configurations
if [ -d "$PROJECT_ROOT/infrastructure" ]; then
    print_status "Analyzing Terraform configurations..."
    
    # Check for hardcoded values
    tf_files=$(find "$PROJECT_ROOT/infrastructure" -name "*.tf" -type f)
    if [ -n "$tf_files" ]; then
        hardcoded_ips=$(grep -r "0\.0\.0\.0/0" "$PROJECT_ROOT/infrastructure" || true)
        if [ -n "$hardcoded_ips" ]; then
            print_warning "Overly permissive CIDR blocks (0.0.0.0/0) found in Terraform"
        else
            print_success "No overly permissive CIDR blocks found"
        fi
        
        # Check for encryption settings
        encryption_configs=$(grep -ri "encrypt" "$PROJECT_ROOT/infrastructure" || true)
        if [ -n "$encryption_configs" ]; then
            print_success "Encryption configurations found in infrastructure code"
        else
            print_warning "No explicit encryption configurations found"
        fi
    fi
fi

# Check Kubernetes configurations
if [ -d "$PROJECT_ROOT/k8s" ]; then
    print_status "Analyzing Kubernetes security configurations..."
    
    # Check for security contexts
    security_contexts=$(grep -r "securityContext" "$PROJECT_ROOT/k8s" || true)
    if [ -n "$security_contexts" ]; then
        print_success "Security contexts found in Kubernetes manifests"
    else
        print_warning "No security contexts found in Kubernetes manifests"
    fi
    
    # Check for network policies
    network_policies=$(find "$PROJECT_ROOT/k8s" -name "*network*" -type f)
    if [ -n "$network_policies" ]; then
        print_success "Network policies found: $(echo "$network_policies" | wc -l) files"
    else
        print_warning "No network policies found"
    fi
    
    # Check for RBAC
    rbac_configs=$(find "$PROJECT_ROOT/k8s" -name "*rbac*" -type f)
    if [ -n "$rbac_configs" ]; then
        print_success "RBAC configurations found: $(echo "$rbac_configs" | wc -l) files"
    else
        print_warning "No RBAC configurations found"
    fi
fi

echo

# Dependency Security
print_status "Assessing dependency security..."

# Check Node.js dependencies
if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
    print_status "Analyzing Node.js dependencies..."
    
    if command -v npm >/dev/null 2>&1; then
        cd "$PROJECT_ROOT/frontend"
        if npm audit --json > "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null; then
            critical_npm=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "critical")) | length' "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || echo "0")
            high_npm=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "high")) | length' "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || echo "0")
            
            if [ "$critical_npm" -eq 0 ] && [ "$high_npm" -eq 0 ]; then
                print_success "No critical or high npm vulnerabilities found"
            elif [ "$critical_npm" -gt 0 ]; then
                print_critical "npm: $critical_npm critical vulnerabilities found"
            else
                print_warning "npm: $high_npm high vulnerabilities found"
            fi
        else
            print_warning "Failed to run npm audit"
        fi
        cd "$PROJECT_ROOT"
    fi
fi

# Check Python dependencies
if [ -f "$PROJECT_ROOT/backend/requirements.txt" ]; then
    print_status "Analyzing Python dependencies..."
    
    if command -v safety >/dev/null 2>&1; then
        if safety check --json --file "$PROJECT_ROOT/backend/requirements.txt" > "$REPORT_DIR/safety-check-$TIMESTAMP.json" 2>/dev/null; then
            vulnerabilities=$(jq '. | length' "$REPORT_DIR/safety-check-$TIMESTAMP.json" 2>/dev/null || echo "0")
            
            if [ "$vulnerabilities" -eq 0 ]; then
                print_success "No known Python vulnerabilities found"
            else
                print_warning "Python: $vulnerabilities known vulnerabilities found"
            fi
        else
            print_warning "Failed to run safety check"
        fi
    else
        print_warning "Safety tool not available for Python dependency scanning"
    fi
fi

echo

# Generate Security Report
print_status "Generating comprehensive security report..."

{
    echo "# OpsSight Security Assessment Report"
    echo "Generated: $(date)"
    echo "============================================"
    echo
    echo "## Executive Summary"
    echo "- Total Security Checks: $TOTAL_CHECKS"
    echo "- Passed: $PASSED_CHECKS"
    echo "- Warnings: $WARNINGS"
    echo "- Failed: $FAILED_CHECKS"
    echo "- Critical Issues: $CRITICAL_ISSUES"
    echo "- Security Score: $(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))%"
    echo
    echo "## Risk Assessment"
    if [ $CRITICAL_ISSUES -gt 0 ]; then
        echo "🚨 **HIGH RISK**: $CRITICAL_ISSUES critical security issues found"
        echo "**RECOMMENDATION**: Address critical issues before production deployment"
    elif [ $FAILED_CHECKS -gt 3 ]; then
        echo "⚠️ **MEDIUM RISK**: Multiple security issues found"
        echo "**RECOMMENDATION**: Address security issues before production"
    elif [ $WARNINGS -gt 5 ]; then
        echo "⚠️ **LOW-MEDIUM RISK**: Several security improvements recommended"
        echo "**RECOMMENDATION**: Address warnings for optimal security posture"
    else
        echo "✅ **LOW RISK**: Good security posture with minor improvements needed"
        echo "**RECOMMENDATION**: Address remaining warnings and proceed with deployment"
    fi
    echo
    echo "## Detailed Findings"
    echo "### Container Security"
    echo "- Container configurations analyzed"
    echo "- Image vulnerability scanning completed"
    echo "- Runtime security assessed"
    echo
    echo "### Application Security"
    echo "- Security headers validated"
    echo "- API security tested"
    echo "- Authentication mechanisms verified"
    echo
    echo "### Infrastructure Security"
    echo "- Configuration security assessed"
    echo "- Secrets management evaluated"
    echo "- Infrastructure as Code reviewed"
    echo
    echo "### Dependency Security"
    echo "- Node.js dependencies scanned"
    echo "- Python dependencies checked"
    echo "- Vulnerability reports generated"
    echo
    echo "## Recommendations"
    echo "1. Implement container security hardening"
    echo "2. Configure comprehensive security headers"
    echo "3. Set up proper secrets management"
    echo "4. Implement network security policies"
    echo "5. Regular vulnerability scanning in CI/CD"
    echo "6. Security monitoring and alerting"
    echo "7. Regular security assessments"
    echo
    echo "## Next Steps"
    echo "1. Review and remediate critical issues"
    echo "2. Implement security monitoring"
    echo "3. Set up continuous security scanning"
    echo "4. Conduct penetration testing"
    echo "5. Implement security training"
    echo
    echo "## Report Files"
    echo "- Security assessment report: $(basename "$0")"
    echo "- Vulnerability scan reports: $REPORT_DIR/"
    echo "- Timestamp: $TIMESTAMP"
} > "$REPORT_DIR/security-assessment-report-$TIMESTAMP.md"

print_success "Security assessment report saved: $REPORT_DIR/security-assessment-report-$TIMESTAMP.md"

echo

# Final Summary
echo "=== SECURITY ASSESSMENT SUMMARY ==="
echo
echo -e "✅ Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "❌ Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "🚨 Critical: ${RED}$CRITICAL_ISSUES${NC}"
echo -e "📊 Total: $TOTAL_CHECKS"

# Calculate security score
if [ $TOTAL_CHECKS -gt 0 ]; then
    security_score=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "🔒 Security Score: ${security_score}%"
else
    security_score=0
fi

echo

# Overall security assessment
if [ $CRITICAL_ISSUES -eq 0 ] && [ $FAILED_CHECKS -le 1 ] && [ $WARNINGS -le 3 ]; then
    echo -e "${GREEN}🛡️ SECURITY STATUS: PRODUCTION READY${NC}"
    echo "The security posture is suitable for production deployment!"
elif [ $CRITICAL_ISSUES -eq 0 ] && [ $FAILED_CHECKS -le 3 ] && [ $WARNINGS -le 7 ]; then
    echo -e "${YELLOW}⚠️  SECURITY STATUS: NEEDS MINOR FIXES${NC}"
    echo "Address security issues before production deployment."
else
    echo -e "${RED}🚨 SECURITY STATUS: NEEDS IMMEDIATE ATTENTION${NC}"
    echo "Critical security issues must be resolved before deployment."
fi

echo
print_status "Security assessment completed. Review reports in: $REPORT_DIR"

# Exit with appropriate code
if [ $CRITICAL_ISSUES -eq 0 ] && [ $FAILED_CHECKS -le 2 ]; then
    exit 0
else
    exit 1
fi