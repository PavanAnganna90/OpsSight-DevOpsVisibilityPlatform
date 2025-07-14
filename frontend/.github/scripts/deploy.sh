#!/bin/bash

# OpsSight Deployment Script
# Automated deployment with health checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-opssight}"
TAG="${TAG:-latest}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/api/health}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-300}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-30}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-10}"

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

# Error handling
error_exit() {
    log_error "$1"
    exit 1
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        if [ "${ROLLBACK_ON_FAILURE:-true}" == "true" ]; then
            log_info "Initiating rollback..."
            rollback_deployment
        fi
    fi
    exit $exit_code
}

trap cleanup EXIT

# Function to check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local tools=("docker" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "$tool is required but not installed"
        fi
    done
    
    log_success "All prerequisites are installed"
}

# Function to validate environment variables
validate_environment() {
    log_info "Validating environment configuration..."
    
    local required_vars=("ENVIRONMENT" "REGISTRY" "IMAGE_NAME" "TAG")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error_exit "Required environment variable $var is not set"
        fi
    done
    
    log_success "Environment configuration validated"
}

# Function to pull the latest Docker image
pull_image() {
    local image_url="$REGISTRY/$IMAGE_NAME:$TAG"
    log_info "Pulling Docker image: $image_url"
    
    if ! docker pull "$image_url"; then
        error_exit "Failed to pull Docker image: $image_url"
    fi
    
    log_success "Docker image pulled successfully"
}

# Function to stop existing containers
stop_existing_containers() {
    log_info "Stopping existing containers..."
    
    local container_name="opssight-$ENVIRONMENT"
    if docker ps -q -f "name=$container_name" | grep -q .; then
        log_info "Stopping container: $container_name"
        docker stop "$container_name" || log_warning "Failed to stop container $container_name"
        docker rm "$container_name" || log_warning "Failed to remove container $container_name"
    fi
    
    log_success "Existing containers stopped"
}

# Function to backup current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    local backup_tag="backup-$(date +%Y%m%d-%H%M%S)"
    local current_image=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "opssight" | head -n1)
    
    if [ -n "$current_image" ]; then
        docker tag "$current_image" "$REGISTRY/$IMAGE_NAME:$backup_tag"
        log_success "Backup created with tag: $backup_tag"
        echo "$backup_tag" > "/tmp/opssight-backup-tag"
    else
        log_warning "No current deployment found to backup"
    fi
}

# Function to start new deployment
start_deployment() {
    local image_url="$REGISTRY/$IMAGE_NAME:$TAG"
    local container_name="opssight-$ENVIRONMENT"
    
    log_info "Starting new deployment: $container_name"
    
    # Determine which docker-compose files to use
    local compose_files="-f docker-compose.yml"
    case "$ENVIRONMENT" in
        "production")
            compose_files="$compose_files -f docker-compose.prod.yml"
            ;;
        "staging")
            compose_files="$compose_files -f docker-compose.dev.yml"
            ;;
        "development")
            compose_files="$compose_files -f docker-compose.dev.yml"
            ;;
    esac
    
    # Set environment variables for docker-compose
    export COMPOSE_PROJECT_NAME="opssight-$ENVIRONMENT"
    export IMAGE_TAG="$TAG"
    
    # Start the services
    if ! docker-compose $compose_files up -d; then
        error_exit "Failed to start deployment"
    fi
    
    log_success "Deployment started successfully"
}

# Function to perform health checks
health_check() {
    log_info "Performing health checks..."
    
    local attempts=0
    local max_attempts=$HEALTH_CHECK_RETRIES
    
    while [ $attempts -lt $max_attempts ]; do
        log_info "Health check attempt $((attempts + 1))/$max_attempts"
        
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            local response=$(curl -s "$HEALTH_CHECK_URL")
            local status=$(echo "$response" | jq -r '.status // "unknown"')
            
            if [ "$status" == "healthy" ]; then
                log_success "Health check passed - service is healthy"
                return 0
            elif [ "$status" == "degraded" ]; then
                log_warning "Service is degraded but functional"
                return 0
            else
                log_warning "Service status: $status"
            fi
        else
            log_warning "Health check failed - service not responding"
        fi
        
        attempts=$((attempts + 1))
        if [ $attempts -lt $max_attempts ]; then
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    error_exit "Health checks failed after $max_attempts attempts"
}

# Function to run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    local base_url="${HEALTH_CHECK_URL%/api/health}"
    local endpoints=(
        "/"
        "/dashboard"
        "/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="$base_url$endpoint"
        log_info "Testing endpoint: $url"
        
        if ! curl -f -s "$url" > /dev/null; then
            error_exit "Smoke test failed for endpoint: $url"
        fi
    done
    
    log_success "All smoke tests passed"
}

# Function to rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    if [ -f "/tmp/opssight-backup-tag" ]; then
        local backup_tag=$(cat "/tmp/opssight-backup-tag")
        log_info "Rolling back to backup: $backup_tag"
        
        # Stop current deployment
        stop_existing_containers
        
        # Start backup deployment
        TAG="$backup_tag" start_deployment
        
        # Verify rollback
        if health_check; then
            log_success "Rollback completed successfully"
        else
            log_error "Rollback failed - manual intervention required"
        fi
    else
        log_error "No backup found for rollback"
    fi
}

# Function to cleanup old images
cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    
    # Remove unused images older than 7 days
    docker image prune -a -f --filter "until=168h" || log_warning "Failed to cleanup old images"
    
    log_success "Cleanup completed"
}

# Function to send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local payload="{\"text\":\"🚀 OpsSight Deployment Update\",\"attachments\":[{\"color\":\"$([ "$status" == "success" ] && echo "good" || echo "danger")\",\"fields\":[{\"title\":\"Environment\",\"value\":\"$ENVIRONMENT\",\"short\":true},{\"title\":\"Status\",\"value\":\"$status\",\"short\":true},{\"title\":\"Message\",\"value\":\"$message\",\"short\":false}]}]}"
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification"
    fi
}

# Main deployment function
deploy() {
    log_info "Starting OpsSight deployment to $ENVIRONMENT environment"
    log_info "Image: $REGISTRY/$IMAGE_NAME:$TAG"
    
    # Send start notification
    send_notification "started" "Deployment initiated for $ENVIRONMENT environment"
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    backup_current_deployment
    pull_image
    stop_existing_containers
    start_deployment
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    # Verify deployment
    health_check
    run_smoke_tests
    
    # Cleanup
    cleanup_old_images
    
    # Send success notification
    send_notification "success" "Deployment completed successfully for $ENVIRONMENT environment"
    
    log_success "Deployment completed successfully!"
    log_info "Application is running at: $HEALTH_CHECK_URL"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Target environment (staging, production) [default: staging]"
    echo "  -t, --tag           Docker image tag [default: latest]"
    echo "  -r, --registry      Docker registry URL [default: ghcr.io]"
    echo "  -u, --health-url    Health check URL [default: http://localhost:3000/api/health]"
    echo "  --no-rollback       Disable automatic rollback on failure"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT         Target environment"
    echo "  TAG                 Docker image tag"
    echo "  REGISTRY            Docker registry URL"
    echo "  HEALTH_CHECK_URL    Health check URL"
    echo "  SLACK_WEBHOOK_URL   Slack webhook for notifications"
    echo ""
    echo "Examples:"
    echo "  $0 --environment production --tag v1.0.0"
    echo "  $0 -e staging -t latest"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -u|--health-url)
            HEALTH_CHECK_URL="$2"
            shift 2
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE="false"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run the deployment
deploy 