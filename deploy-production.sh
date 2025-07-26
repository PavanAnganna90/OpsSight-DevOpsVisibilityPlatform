#!/bin/bash

# OpsSight Platform - Enhanced Production Deployment Script
# Comprehensive production deployment with monitoring, security, and backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.prod"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${SCRIPT_DIR}/backups"
SSL_DIR="${SCRIPT_DIR}/ssl"

# Functions
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

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check available disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
    MIN_SPACE=$((10 * 1024 * 1024)) # 10GB in KB
    
    if [ "$AVAILABLE_SPACE" -lt "$MIN_SPACE" ]; then
        log_error "Insufficient disk space. At least 10GB required."
        exit 1
    fi
    
    log_success "System requirements check passed"
}

check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Please copy .env.prod.template to .env.prod and update the values"
        exit 1
    fi
    
    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check required environment variables
    REQUIRED_VARS=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET_KEY"
        "DOMAIN_NAME"
        "GRAFANA_ADMIN_PASSWORD"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check for default/weak passwords
    if [[ "$POSTGRES_PASSWORD" == "your_secure_database_password_here" ]]; then
        log_error "Please change the default POSTGRES_PASSWORD in $ENV_FILE"
        exit 1
    fi
    
    if [[ "$JWT_SECRET_KEY" == "your_super_secret_jwt_key_change_in_production" ]]; then
        log_error "Please change the default JWT_SECRET_KEY in $ENV_FILE"
        exit 1
    fi
    
    log_success "Environment configuration check passed"
}

setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    mkdir -p "$SSL_DIR"
    
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        log_warning "SSL certificates not found. Generating self-signed certificates for testing..."
        
        # Generate self-signed certificate for testing
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/key.pem" \
            -out "$SSL_DIR/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN_NAME:-localhost}"
        
        log_warning "Self-signed certificate generated. For production, please use proper SSL certificates."
        log_info "Consider using Let's Encrypt: https://letsencrypt.org/"
    else
        log_success "SSL certificates found"
    fi
}

backup_data() {
    log_info "Creating backup before deployment..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Backup current data if containers are running
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_info "Creating database backup..."
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "${POSTGRES_USER:-opssight}" "${POSTGRES_DB:-opssight_prod}" > "$BACKUP_DIR/database-$(date +%Y%m%d-%H%M%S).sql"
    fi
    
    # Backup configuration files
    tar -czf "$BACKUP_FILE" \
        --exclude="node_modules" \
        --exclude="*.log" \
        --exclude=".git" \
        . 2>/dev/null || true
    
    log_success "Backup created: $BACKUP_FILE"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build images with proper tags
    docker-compose -f "$COMPOSE_FILE" build --no-cache --parallel
    
    # Tag images for registry if needed
    docker tag opssight-backend:latest "${DOCKER_REGISTRY:-localhost}/opssight-backend:$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
    docker tag opssight-frontend:latest "${DOCKER_REGISTRY:-localhost}/opssight-frontend:$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
    
    log_success "Docker images built successfully"
}

run_security_checks() {
    log_info "Running security checks..."
    
    # Check for exposed ports
    log_info "Checking for exposed ports..."
    EXPOSED_PORTS=$(docker-compose -f "$COMPOSE_FILE" config | grep -E "^\s*-\s*[0-9]" | grep -v "127.0.0.1" || true)
    if [ -n "$EXPOSED_PORTS" ]; then
        log_warning "Found publicly exposed ports:"
        echo "$EXPOSED_PORTS"
    fi
    
    # Check container security
    log_info "Running container security scan..."
    if command -v trivy &> /dev/null; then
        trivy image opssight-backend:latest || log_warning "Backend security scan found issues"
        trivy image opssight-frontend:latest || log_warning "Frontend security scan found issues"
    else
        log_warning "Trivy not installed. Skipping container security scan."
    fi
    
    log_success "Security checks completed"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Stop existing services
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Pull latest base images
    docker-compose -f "$COMPOSE_FILE" pull postgres redis grafana prometheus
    
    # Start core services first
    log_info "Starting core services (database, cache)..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for core services to be healthy
    log_info "Waiting for core services to be ready..."
    sleep 30
    
    # Start application services
    log_info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d backend frontend
    
    # Wait for application services
    sleep 30
    
    # Start monitoring services
    log_info "Starting monitoring services..."
    docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana
    
    log_success "All services deployed"
}

run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for services to be fully ready
    sleep 60
    
    # Check service health
    SERVICES=("postgres" "redis" "backend" "frontend" "prometheus" "grafana")
    FAILED_SERVICES=()
    
    for service in "${SERVICES[@]}"; do
        log_info "Checking health of $service..."
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy\|Up"; then
            log_success "$service is healthy"
        else
            log_error "$service health check failed"
            FAILED_SERVICES+=("$service")
        fi
    done
    
    # Test HTTP endpoints
    log_info "Testing HTTP endpoints..."
    
    # Test frontend
    if curl -sf http://localhost:80 > /dev/null; then
        log_success "Frontend is responding"
    else
        log_error "Frontend health check failed"
        FAILED_SERVICES+=("frontend-http")
    fi
    
    # Test backend API
    if curl -sf http://localhost:8000/health > /dev/null; then
        log_success "Backend API is responding"
    else
        log_error "Backend API health check failed"
        FAILED_SERVICES+=("backend-api")
    fi
    
    # Test Grafana
    if curl -sf http://localhost:3001/api/health > /dev/null; then
        log_success "Grafana is responding"
    else
        log_error "Grafana health check failed"
        FAILED_SERVICES+=("grafana-http")
    fi
    
    if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
        log_success "All health checks passed"
        return 0
    else
        log_error "Health checks failed for: ${FAILED_SERVICES[*]}"
        return 1
    fi
}

show_deployment_info() {
    log_success "Deployment completed successfully!"
    echo
    echo "=== OpsSight Platform Production Deployment ==="
    echo "Frontend:    http://${DOMAIN_NAME:-localhost}"
    echo "Backend API: http://${DOMAIN_NAME:-localhost}:8000"
    echo "Grafana:     http://${DOMAIN_NAME:-localhost}:3001"
    echo "Prometheus:  http://${DOMAIN_NAME:-localhost}:9090"
    echo
    echo "Default Grafana credentials:"
    echo "Username: ${GRAFANA_ADMIN_USER:-admin}"
    echo "Password: ${GRAFANA_ADMIN_PASSWORD}"
    echo
    echo "=== Service Status ==="
    docker-compose -f "$COMPOSE_FILE" ps
    echo
    echo "=== Logs ==="
    echo "View logs with: docker-compose -f $COMPOSE_FILE logs -f [service]"
    echo
    echo "=== Backup Information ==="
    echo "Latest backup: $(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1 || echo 'None')"
    echo
}

cleanup_on_failure() {
    log_error "Deployment failed. Cleaning up..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1 || true)
    if [ -n "$LATEST_BACKUP" ]; then
        log_info "Latest backup available: $LATEST_BACKUP"
        log_info "To restore, run: tar -xzf $LATEST_BACKUP"
    fi
    
    exit 1
}

# Main deployment process
main() {
    log_info "Starting OpsSight Platform production deployment..."
    echo
    
    # Trap errors and cleanup
    trap cleanup_on_failure ERR
    
    # Run deployment steps
    check_requirements
    check_environment
    setup_ssl
    backup_data
    build_images
    run_security_checks
    deploy_services
    
    # Run health checks
    if run_health_checks; then
        show_deployment_info
    else
        log_error "Health checks failed. Please check the logs."
        docker-compose -f "$COMPOSE_FILE" logs --tail=50
        exit 1
    fi
    
    log_success "Production deployment completed successfully!"
}

# Command line options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        backup_data
        ;;
    "health")
        run_health_checks
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "stop")
        log_info "Stopping all services..."
        docker-compose -f "$COMPOSE_FILE" down
        log_success "All services stopped"
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart
        log_success "Services restarted"
        ;;
    "update")
        log_info "Updating deployment..."
        backup_data
        build_images
        docker-compose -f "$COMPOSE_FILE" up -d --force-recreate
        run_health_checks
        log_success "Deployment updated"
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|logs|stop|restart|update}"
        echo
        echo "Commands:"
        echo "  deploy  - Full production deployment (default)"
        echo "  backup  - Create backup of current deployment"
        echo "  health  - Run health checks on deployed services"
        echo "  logs    - View service logs (add service name as second argument)"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  update  - Update deployment with new changes"
        exit 1
        ;;
esac