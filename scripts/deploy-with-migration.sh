#!/bin/bash

set -euo pipefail

# OpsSight Platform Deployment with Automated Database Migration
# This script handles safe deployment with database migrations

# Configuration
NAMESPACE="${NAMESPACE:-production}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
MIGRATION_TIMEOUT="${MIGRATION_TIMEOUT:-600}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"

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
trap 'handle_error $? $LINENO' ERR

handle_error() {
    local exit_code=$1
    local line_number=$2
    log_error "Script failed with exit code $exit_code at line $line_number"
    
    # If migration job exists, show its logs
    if kubectl get job migration-${IMAGE_TAG} -n ${NAMESPACE} >/dev/null 2>&1; then
        log_error "Migration job logs:"
        kubectl logs job/migration-${IMAGE_TAG} -n ${NAMESPACE} --tail=50
    fi
    
    # Show recent events
    log_error "Recent cluster events:"
    kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -10
    
    exit $exit_code
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    for tool in kubectl helm; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check kubectl context
    current_context=$(kubectl config current-context)
    log_info "Current kubectl context: $current_context"
    
    # Check namespace exists
    if ! kubectl get namespace ${NAMESPACE} >/dev/null 2>&1; then
        log_error "Namespace ${NAMESPACE} does not exist"
        exit 1
    fi
    
    # Check required secrets exist
    for secret in opssight-secrets; do
        if ! kubectl get secret $secret -n ${NAMESPACE} >/dev/null 2>&1; then
            log_error "Required secret $secret not found in namespace ${NAMESPACE}"
            exit 1
        fi
    done
    
    log_success "Prerequisites validated"
}

# Create database backup
create_database_backup() {
    log_info "Creating database backup..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    # Create backup job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: ${backup_name}
  namespace: ${NAMESPACE}
  labels:
    app: opssight
    component: backup
    type: pre-deployment
spec:
  ttlSecondsAfterFinished: 86400  # Clean up after 24 hours
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: backup
        image: postgres:15-alpine
        command:
        - /bin/bash
        - -c
        - |
          echo "Creating database backup: ${backup_name}"
          pg_dump "\$DATABASE_URL" > /tmp/${backup_name}.sql
          echo "Backup size: \$(wc -c < /tmp/${backup_name}.sql) bytes"
          echo "Backup created successfully"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: opssight-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"
EOF
    
    # Wait for backup to complete
    log_info "Waiting for backup to complete..."
    kubectl wait --for=condition=complete job/${backup_name} -n ${NAMESPACE} --timeout=300s
    
    if kubectl get job ${backup_name} -n ${NAMESPACE} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' | grep -q True; then
        log_success "Database backup completed: ${backup_name}"
    else
        log_error "Database backup failed"
        kubectl logs job/${backup_name} -n ${NAMESPACE}
        exit 1
    fi
}

# Run database migration
run_migration() {
    log_info "Running database migration..."
    
    local migration_job="migration-${IMAGE_TAG}"
    
    # Create migration job from template
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: ${migration_job}
  namespace: ${NAMESPACE}
  labels:
    app: opssight
    component: migration
    type: deployment
    image-tag: "${IMAGE_TAG}"
spec:
  ttlSecondsAfterFinished: 3600  # Keep for 1 hour for debugging
  activeDeadlineSeconds: ${MIGRATION_TIMEOUT}
  template:
    metadata:
      labels:
        app: opssight
        component: migration
        job-type: deployment-migration
    spec:
      restartPolicy: Never
      serviceAccountName: opssight-migration
      containers:
      - name: migration
        image: ghcr.io/opssight/backend:${IMAGE_TAG}
        command:
        - /bin/bash
        - -c
        - |
          set -euo pipefail
          
          echo "=== Deployment Migration Job ==="
          echo "Image: ghcr.io/opssight/backend:${IMAGE_TAG}"
          echo "Started at: \$(date)"
          
          # Check current migration status
          echo "Current migration status:"
          python -m alembic current || echo "No migrations applied yet"
          
          # Show pending migrations
          echo "Pending migrations:"
          python -m alembic heads
          
          # Run migrations
          echo "Running database migrations..."
          python -m alembic upgrade head
          
          # Verify migration success
          echo "Migration completed. Current status:"
          python -m alembic current
          
          # Run basic health checks
          echo "Running post-migration health checks..."
          python -c "
          import asyncio
          from app.db.database import engine
          from sqlalchemy import text
          
          async def health_check():
              async with engine.begin() as conn:
                  result = await conn.execute(text('SELECT 1'))
                  print('✓ Database connectivity: OK')
                  
                  # Check critical tables
                  tables = ['users', 'teams', 'projects', 'roles']
                  for table in tables:
                      try:
                          result = await conn.execute(text(f'SELECT count(*) FROM {table}'))
                          count = result.scalar()
                          print(f'✓ Table {table}: {count} records')
                      except Exception as e:
                          print(f'✗ Table {table}: Error - {e}')
                          raise
          
          asyncio.run(health_check())
          "
          
          echo "=== Migration completed successfully at \$(date) ==="
        
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: opssight-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: opssight-secrets
              key: redis-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: opssight-secrets
              key: secret-key
        - name: ENVIRONMENT
          value: "production"
        - name: PYTHONPATH
          value: "/app"
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: false
EOF
    
    # Wait for migration to complete
    log_info "Waiting for migration to complete (timeout: ${MIGRATION_TIMEOUT}s)..."
    
    if kubectl wait --for=condition=complete job/${migration_job} -n ${NAMESPACE} --timeout=${MIGRATION_TIMEOUT}s; then
        log_success "Database migration completed successfully"
        
        # Show migration logs for verification
        log_info "Migration logs:"
        kubectl logs job/${migration_job} -n ${NAMESPACE} --tail=20
    else
        log_error "Database migration failed or timed out"
        
        # Show migration logs for debugging
        kubectl logs job/${migration_job} -n ${NAMESPACE} --tail=50
        
        # Show job status
        kubectl describe job/${migration_job} -n ${NAMESPACE}
        
        exit 1
    fi
}

# Deploy application
deploy_application() {
    log_info "Deploying OpsSight Platform with image tag: ${IMAGE_TAG}"
    
    # Update Helm deployment
    helm upgrade --install opssight-${NAMESPACE} ./helm/opssight \
        --namespace ${NAMESPACE} \
        --values ./helm/opssight/values-${NAMESPACE}.yaml \
        --set image.tag=${IMAGE_TAG} \
        --set migration.enabled=false \
        --wait --timeout=15m
    
    log_success "Application deployment completed"
}

# Verify deployment health
verify_deployment() {
    log_info "Verifying deployment health..."
    
    # Check rollout status
    kubectl rollout status deployment/opssight-backend -n ${NAMESPACE} --timeout=${HEALTH_CHECK_TIMEOUT}s
    kubectl rollout status deployment/opssight-frontend -n ${NAMESPACE} --timeout=${HEALTH_CHECK_TIMEOUT}s
    
    # Check pod health
    log_info "Checking pod status..."
    kubectl get pods -n ${NAMESPACE} -l app=opssight
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=opssight -n ${NAMESPACE} --timeout=${HEALTH_CHECK_TIMEOUT}s
    
    # Run application health checks
    log_info "Running application health checks..."
    
    # Get service endpoint
    local backend_service=$(kubectl get service opssight-backend -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
    
    # Test health endpoint from within cluster
    kubectl run health-check-$(date +%s) --rm -i --restart=Never --image=curlimages/curl:latest -- \
        curl -f -m 30 http://${backend_service}:8000/health
    
    log_success "Deployment health verification completed"
}

# Cleanup old resources
cleanup_old_resources() {
    log_info "Cleaning up old resources..."
    
    # Clean up old backup jobs (older than retention period)
    local cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y%m%d)
    
    kubectl get jobs -n ${NAMESPACE} -l component=backup --no-headers | while read job _; do
        if [[ $job =~ backup-([0-9]{8}) ]]; then
            local job_date=${BASH_REMATCH[1]}
            if [[ $job_date < $cutoff_date ]]; then
                log_info "Deleting old backup job: $job"
                kubectl delete job $job -n ${NAMESPACE}
            fi
        fi
    done
    
    # Clean up old migration jobs (keep last 5)
    kubectl get jobs -n ${NAMESPACE} -l component=migration --sort-by=.metadata.creationTimestamp --no-headers | \
        head -n -5 | while read job _; do
            log_info "Deleting old migration job: $job"
            kubectl delete job $job -n ${NAMESPACE}
        done
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "=== OpsSight Platform Deployment Started ==="
    log_info "Namespace: ${NAMESPACE}"
    log_info "Image Tag: ${IMAGE_TAG}"
    log_info "Timestamp: $(date)"
    
    validate_prerequisites
    create_database_backup
    run_migration
    deploy_application
    verify_deployment
    cleanup_old_resources
    
    log_success "=== Deployment completed successfully ==="
    log_info "Application URL: https://opssight.dev"
    log_info "API URL: https://api.opssight.dev"
    log_info "Monitoring: https://grafana.opssight.dev"
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy OpsSight Platform with automated database migration

OPTIONS:
    -n, --namespace NAMESPACE    Kubernetes namespace (default: production)
    -t, --tag TAG               Docker image tag (default: latest)
    -r, --retention DAYS        Backup retention days (default: 7)
    --migration-timeout SECONDS Migration timeout (default: 600)
    --health-timeout SECONDS    Health check timeout (default: 300)
    -h, --help                  Show this help message

EXAMPLES:
    $0                          Deploy with defaults
    $0 -n staging -t v1.2.3     Deploy to staging with specific tag
    $0 --retention 14           Deploy with 14-day backup retention

ENVIRONMENT VARIABLES:
    NAMESPACE                   Same as -n/--namespace
    IMAGE_TAG                   Same as -t/--tag
    BACKUP_RETENTION_DAYS       Same as -r/--retention
    MIGRATION_TIMEOUT           Same as --migration-timeout
    HEALTH_CHECK_TIMEOUT        Same as --health-timeout
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--retention)
            BACKUP_RETENTION_DAYS="$2"
            shift 2
            ;;
        --migration-timeout)
            MIGRATION_TIMEOUT="$2"
            shift 2
            ;;
        --health-timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"