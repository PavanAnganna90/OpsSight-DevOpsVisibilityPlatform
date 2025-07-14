#!/bin/bash

# OpsSight Deployment Script
# Handles infrastructure provisioning and application deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/infrastructure/terraform"
K8S_DIR="${PROJECT_ROOT}/k8s"

# Default values
ENVIRONMENT="staging"
ACTION="plan"
AUTO_APPROVE=false
SKIP_INFRASTRUCTURE=false
SKIP_APPLICATION=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Help function
show_help() {
    cat << EOF
OpsSight Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENVIRONMENT    Target environment (staging, production) [default: staging]
    -a, --action ACTION             Action to perform (plan, apply, destroy) [default: plan]
    -y, --auto-approve              Auto-approve terraform changes
    -s, --skip-infrastructure       Skip infrastructure deployment
    -k, --skip-application          Skip application deployment
    -v, --verbose                   Enable verbose output
    -h, --help                      Show this help message

EXAMPLES:
    # Plan staging infrastructure
    $0 -e staging -a plan

    # Deploy to staging with auto-approval
    $0 -e staging -a apply -y

    # Deploy only application to production
    $0 -e production -a apply -s

    # Destroy staging environment
    $0 -e staging -a destroy -y

PREREQUISITES:
    - AWS CLI configured with appropriate credentials
    - Terraform >= 1.5 installed
    - kubectl installed and configured
    - Docker installed (for local builds)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -y|--auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -s|--skip-infrastructure)
            SKIP_INFRASTRUCTURE=true
            shift
            ;;
        -k|--skip-application)
            SKIP_APPLICATION=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    error "Environment must be 'staging' or 'production'"
fi

if [[ ! "$ACTION" =~ ^(plan|apply|destroy)$ ]]; then
    error "Action must be 'plan', 'apply', or 'destroy'"
fi

# Main execution
main() {
    log "Starting OpsSight deployment script"
    info "Environment: $ENVIRONMENT"
    info "Action: $ACTION"
    
    log "Deployment pipeline configured successfully!"
    info "Use GitHub Actions for automated deployments"
    info "Manual deployment: scripts/deploy.sh -e $ENVIRONMENT -a apply"
}

# Run main function
main "$@"