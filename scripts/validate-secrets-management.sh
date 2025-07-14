#!/bin/bash

# OpsSight DevOps Platform - Secrets Management Validation Script
# Comprehensive validation of AWS Secrets Manager integration with Kubernetes

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-west-2}"
CLUSTER_NAME="${CLUSTER_NAME:-opsight-${ENVIRONMENT}}"
NAMESPACE="${NAMESPACE:-opsight-${ENVIRONMENT}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Validation results
VALIDATION_RESULTS=()
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Function to record validation result
record_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [[ "$result" == "PASS" ]]; then
        VALIDATION_RESULTS+=("✅ $test_name: $message")
        success "$test_name: $message"
    else
        VALIDATION_RESULTS+=("❌ $test_name: $message")
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        error "$test_name: $message"
    fi
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Validate secrets management infrastructure for OpsSight platform.

OPTIONS:
    -e, --environment    Environment (staging, production) [default: staging]
    -r, --region         AWS region [default: us-west-2]
    -c, --cluster        EKS cluster name [default: opsight-ENVIRONMENT]
    -n, --namespace      Kubernetes namespace [default: opsight-ENVIRONMENT]
    --detailed           Show detailed validation output
    --fix-issues         Attempt to fix common issues automatically
    -h, --help           Show this help message

EXAMPLES:
    # Basic validation for staging
    $0 --environment staging

    # Detailed validation for production
    $0 --environment production --detailed

    # Validation with automatic fixes
    $0 --environment staging --fix-issues

EOF
}

# Parse command line arguments
DETAILED=false
FIX_ISSUES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            NAMESPACE="opsight-${ENVIRONMENT}"
            CLUSTER_NAME="opsight-${ENVIRONMENT}"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -c|--cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --fix-issues)
            FIX_ISSUES=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Header
echo "=================================================="
echo "🔐 OpsSight Secrets Management Validation"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Cluster: $CLUSTER_NAME"
echo "Namespace: $NAMESPACE"
echo "=================================================="
echo

# 1. Validate AWS Prerequisites
validate_aws_prerequisites() {
    log "Validating AWS prerequisites..."
    
    # Check AWS CLI
    if aws --version &>/dev/null; then
        record_result "AWS CLI" "PASS" "AWS CLI is installed and functional"
    else
        record_result "AWS CLI" "FAIL" "AWS CLI not found or not functional"
        return 1
    fi
    
    # Check AWS credentials
    if aws sts get-caller-identity &>/dev/null; then
        local account_id
        account_id=$(aws sts get-caller-identity --query Account --output text)
        record_result "AWS Credentials" "PASS" "Valid AWS credentials (Account: $account_id)"
    else
        record_result "AWS Credentials" "FAIL" "AWS credentials not configured or invalid"
        return 1
    fi
    
    # Check AWS Secrets Manager access
    if aws secretsmanager list-secrets --region "$AWS_REGION" &>/dev/null; then
        record_result "Secrets Manager Access" "PASS" "Can access AWS Secrets Manager"
    else
        record_result "Secrets Manager Access" "FAIL" "Cannot access AWS Secrets Manager"
        return 1
    fi
}

# 2. Validate Kubernetes Prerequisites
validate_kubernetes_prerequisites() {
    log "Validating Kubernetes prerequisites..."
    
    # Check kubectl
    if kubectl version --client &>/dev/null; then
        record_result "kubectl CLI" "PASS" "kubectl is installed and functional"
    else
        record_result "kubectl CLI" "FAIL" "kubectl not found or not functional"
        return 1
    fi
    
    # Check cluster connectivity
    if kubectl cluster-info &>/dev/null; then
        record_result "Cluster Connectivity" "PASS" "Can connect to Kubernetes cluster"
    else
        record_result "Cluster Connectivity" "FAIL" "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    # Verify correct cluster context
    local current_cluster
    current_cluster=$(kubectl config current-context | grep -o "$CLUSTER_NAME" || echo "")
    if [[ -n "$current_cluster" ]]; then
        record_result "Cluster Context" "PASS" "Connected to correct cluster ($CLUSTER_NAME)"
    else
        current_cluster=$(kubectl config current-context)
        record_result "Cluster Context" "WARN" "May not be connected to expected cluster ($current_cluster vs $CLUSTER_NAME)"
    fi
}

# 3. Validate AWS Secrets Manager Secrets
validate_secrets_manager_secrets() {
    log "Validating AWS Secrets Manager secrets..."
    
    local secrets=(
        "opsight-${ENVIRONMENT}-application-secrets"
        "opsight-${ENVIRONMENT}-database-secrets"
        "opsight-${ENVIRONMENT}-monitoring-secrets"
        "opsight-${ENVIRONMENT}-cicd-secrets"
    )
    
    for secret in "${secrets[@]}"; do
        if aws secretsmanager describe-secret --secret-id "$secret" --region "$AWS_REGION" &>/dev/null; then
            record_result "Secret: $secret" "PASS" "Secret exists and is accessible"
            
            # Check if secret has a value
            if aws secretsmanager get-secret-value --secret-id "$secret" --region "$AWS_REGION" &>/dev/null; then
                record_result "Secret Value: $secret" "PASS" "Secret has a value"
            else
                record_result "Secret Value: $secret" "FAIL" "Secret exists but has no value"
            fi
        else
            record_result "Secret: $secret" "FAIL" "Secret does not exist or is not accessible"
        fi
    done
}

# 4. Validate IAM Roles and Policies
validate_iam_roles() {
    log "Validating IAM roles and policies..."
    
    local role_name="opsight-${ENVIRONMENT}-secrets-manager-role"
    
    if aws iam get-role --role-name "$role_name" &>/dev/null; then
        record_result "IAM Role" "PASS" "Secrets Manager IAM role exists ($role_name)"
        
        # Check trust policy for OIDC
        local trust_policy
        trust_policy=$(aws iam get-role --role-name "$role_name" --query 'Role.AssumeRolePolicyDocument' --output json)
        if echo "$trust_policy" | jq -r '.Statement[].Principal.Federated' | grep -q "oidc.eks"; then
            record_result "OIDC Trust Policy" "PASS" "IAM role has proper OIDC trust policy"
        else
            record_result "OIDC Trust Policy" "FAIL" "IAM role missing OIDC trust policy"
        fi
        
        # Check attached policies
        local policies
        policies=$(aws iam list-attached-role-policies --role-name "$role_name" --query 'AttachedPolicies[].PolicyName' --output text)
        if echo "$policies" | grep -q "secrets-manager-policy"; then
            record_result "IAM Policies" "PASS" "Required policies attached to IAM role"
        else
            record_result "IAM Policies" "FAIL" "Missing required policies on IAM role"
        fi
    else
        record_result "IAM Role" "FAIL" "Secrets Manager IAM role does not exist ($role_name)"
    fi
}

# 5. Validate Secrets Store CSI Driver
validate_csi_driver() {
    log "Validating Secrets Store CSI Driver..."
    
    # Check if CSI driver namespace exists
    if kubectl get namespace secrets-store-csi-driver &>/dev/null; then
        record_result "CSI Driver Namespace" "PASS" "CSI Driver namespace exists"
    else
        record_result "CSI Driver Namespace" "FAIL" "CSI Driver namespace does not exist"
        return 1
    fi
    
    # Check CSI driver pods
    local csi_pods
    csi_pods=$(kubectl get pods -n secrets-store-csi-driver -l app.kubernetes.io/name=secrets-store-csi-driver --no-headers 2>/dev/null | wc -l)
    if [[ $csi_pods -gt 0 ]]; then
        local ready_pods
        ready_pods=$(kubectl get pods -n secrets-store-csi-driver -l app.kubernetes.io/name=secrets-store-csi-driver --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        if [[ $ready_pods -eq $csi_pods ]]; then
            record_result "CSI Driver Pods" "PASS" "All CSI driver pods are running ($ready_pods/$csi_pods)"
        else
            record_result "CSI Driver Pods" "FAIL" "Some CSI driver pods are not running ($ready_pods/$csi_pods)"
        fi
    else
        record_result "CSI Driver Pods" "FAIL" "No CSI driver pods found"
    fi
    
    # Check AWS provider pods
    local aws_pods
    aws_pods=$(kubectl get pods -n secrets-store-csi-driver -l app.kubernetes.io/name=secrets-store-provider-aws --no-headers 2>/dev/null | wc -l)
    if [[ $aws_pods -gt 0 ]]; then
        local ready_aws_pods
        ready_aws_pods=$(kubectl get pods -n secrets-store-csi-driver -l app.kubernetes.io/name=secrets-store-provider-aws --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        if [[ $ready_aws_pods -eq $aws_pods ]]; then
            record_result "AWS Provider Pods" "PASS" "All AWS provider pods are running ($ready_aws_pods/$aws_pods)"
        else
            record_result "AWS Provider Pods" "FAIL" "Some AWS provider pods are not running ($ready_aws_pods/$aws_pods)"
        fi
    else
        record_result "AWS Provider Pods" "FAIL" "No AWS provider pods found"
    fi
}

# 6. Validate Kubernetes Service Accounts
validate_service_accounts() {
    log "Validating Kubernetes service accounts..."
    
    # Check if namespace exists
    if kubectl get namespace "$NAMESPACE" &>/dev/null; then
        record_result "Application Namespace" "PASS" "Application namespace exists ($NAMESPACE)"
    else
        record_result "Application Namespace" "FAIL" "Application namespace does not exist ($NAMESPACE)"
        if [[ "$FIX_ISSUES" == "true" ]]; then
            kubectl create namespace "$NAMESPACE"
            log "Created namespace $NAMESPACE"
        fi
        return 1
    fi
    
    # Check service accounts
    local service_accounts=("secrets-manager-sa" "database-secrets-sa")
    for sa in "${service_accounts[@]}"; do
        if kubectl get serviceaccount "$sa" -n "$NAMESPACE" &>/dev/null; then
            record_result "Service Account: $sa" "PASS" "Service account exists"
            
            # Check IRSA annotation
            local role_arn
            role_arn=$(kubectl get serviceaccount "$sa" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.eks\.amazonaws\.com/role-arn}' 2>/dev/null || echo "")
            if [[ -n "$role_arn" ]]; then
                record_result "IRSA Annotation: $sa" "PASS" "Has proper IRSA annotation"
            else
                record_result "IRSA Annotation: $sa" "FAIL" "Missing IRSA annotation"
            fi
        else
            record_result "Service Account: $sa" "FAIL" "Service account does not exist"
        fi
    done
}

# 7. Validate SecretProviderClass Resources
validate_secret_provider_classes() {
    log "Validating SecretProviderClass resources..."
    
    local provider_classes=(
        "opsight-application-secrets"
        "opsight-database-secrets"
    )
    
    for spc in "${provider_classes[@]}"; do
        if kubectl get secretproviderclass "$spc" -n "$NAMESPACE" &>/dev/null; then
            record_result "SecretProviderClass: $spc" "PASS" "SecretProviderClass exists"
            
            # Validate configuration
            local provider
            provider=$(kubectl get secretproviderclass "$spc" -n "$NAMESPACE" -o jsonpath='{.spec.provider}' 2>/dev/null || echo "")
            if [[ "$provider" == "aws" ]]; then
                record_result "Provider Config: $spc" "PASS" "Correct provider (aws)"
            else
                record_result "Provider Config: $spc" "FAIL" "Incorrect or missing provider"
            fi
        else
            record_result "SecretProviderClass: $spc" "FAIL" "SecretProviderClass does not exist"
        fi
    done
}

# 8. Validate End-to-End Secret Access
validate_end_to_end_access() {
    log "Validating end-to-end secret access..."
    
    # Create a test pod to validate secret mounting
    local test_pod_name="secrets-test-pod-$$"
    
    cat << EOF | kubectl apply -f - &>/dev/null || true
apiVersion: v1
kind: Pod
metadata:
  name: $test_pod_name
  namespace: $NAMESPACE
spec:
  serviceAccountName: secrets-manager-sa
  containers:
  - name: test
    image: busybox:1.35
    command: ["sleep", "300"]
    volumeMounts:
    - name: secrets-store
      mountPath: "/mnt/secrets-store"
      readOnly: true
  volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: "opsight-application-secrets"
  restartPolicy: Never
EOF
    
    # Wait for pod to be ready
    sleep 10
    
    if kubectl wait --for=condition=ready pod "$test_pod_name" -n "$NAMESPACE" --timeout=60s &>/dev/null; then
        # Check if secrets are mounted
        local secret_files
        secret_files=$(kubectl exec "$test_pod_name" -n "$NAMESPACE" -- ls /mnt/secrets-store 2>/dev/null | wc -l)
        if [[ $secret_files -gt 0 ]]; then
            record_result "End-to-End Secret Access" "PASS" "Secrets successfully mounted in test pod ($secret_files files)"
        else
            record_result "End-to-End Secret Access" "FAIL" "No secrets found in mounted volume"
        fi
    else
        record_result "End-to-End Secret Access" "FAIL" "Test pod failed to start or become ready"
    fi
    
    # Cleanup test pod
    kubectl delete pod "$test_pod_name" -n "$NAMESPACE" &>/dev/null || true
}

# 9. Validate Kubernetes Secrets Generation
validate_kubernetes_secrets() {
    log "Validating Kubernetes secret generation..."
    
    local k8s_secrets=(
        "opsight-application-secrets"
        "opsight-database-secrets"
    )
    
    for secret in "${k8s_secrets[@]}"; do
        if kubectl get secret "$secret" -n "$NAMESPACE" &>/dev/null; then
            record_result "K8s Secret: $secret" "PASS" "Kubernetes secret exists"
            
            # Check if secret has data
            local data_keys
            data_keys=$(kubectl get secret "$secret" -n "$NAMESPACE" -o jsonpath='{.data}' 2>/dev/null | jq -r 'keys[]' 2>/dev/null | wc -l)
            if [[ $data_keys -gt 0 ]]; then
                record_result "K8s Secret Data: $secret" "PASS" "Secret contains data ($data_keys keys)"
            else
                record_result "K8s Secret Data: $secret" "FAIL" "Secret exists but contains no data"
            fi
        else
            record_result "K8s Secret: $secret" "FAIL" "Kubernetes secret does not exist"
        fi
    done
}

# 10. Validate Monitoring Namespace Secrets
validate_monitoring_secrets() {
    log "Validating monitoring namespace secrets..."
    
    if kubectl get namespace monitoring &>/dev/null; then
        record_result "Monitoring Namespace" "PASS" "Monitoring namespace exists"
        
        # Check monitoring service account
        if kubectl get serviceaccount secrets-manager-sa -n monitoring &>/dev/null; then
            record_result "Monitoring Service Account" "PASS" "Monitoring service account exists"
        else
            record_result "Monitoring Service Account" "FAIL" "Monitoring service account does not exist"
        fi
        
        # Check monitoring SecretProviderClass
        if kubectl get secretproviderclass opsight-monitoring-secrets -n monitoring &>/dev/null; then
            record_result "Monitoring SecretProviderClass" "PASS" "Monitoring SecretProviderClass exists"
        else
            record_result "Monitoring SecretProviderClass" "FAIL" "Monitoring SecretProviderClass does not exist"
        fi
    else
        record_result "Monitoring Namespace" "WARN" "Monitoring namespace does not exist (may not be deployed yet)"
    fi
}

# Main validation function
main() {
    log "Starting comprehensive secrets management validation..."
    echo
    
    # Run all validation checks
    validate_aws_prerequisites
    validate_kubernetes_prerequisites
    validate_secrets_manager_secrets
    validate_iam_roles
    validate_csi_driver
    validate_service_accounts
    validate_secret_provider_classes
    validate_end_to_end_access
    validate_kubernetes_secrets
    validate_monitoring_secrets
    
    echo
    echo "=================================================="
    echo "📊 VALIDATION SUMMARY"
    echo "=================================================="
    echo "Total Checks: $TOTAL_CHECKS"
    echo "Failed Checks: $FAILED_CHECKS"
    echo "Success Rate: $(( (TOTAL_CHECKS - FAILED_CHECKS) * 100 / TOTAL_CHECKS ))%"
    echo
    
    if [[ "$DETAILED" == "true" ]]; then
        echo "📋 DETAILED RESULTS:"
        for result in "${VALIDATION_RESULTS[@]}"; do
            echo "$result"
        done
        echo
    fi
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        success "🎉 All validation checks passed! Secrets management is working correctly."
        exit 0
    else
        error "❌ $FAILED_CHECKS validation check(s) failed. Please review and fix the issues."
        exit 1
    fi
}

# Run main function
main "$@" 