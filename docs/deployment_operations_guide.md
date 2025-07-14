# OpsSight DevOps Platform - Deployment & Operations Guide

## Overview

This comprehensive guide covers the deployment and operations of the OpsSight DevOps Platform across different environments, from local development to production Kubernetes clusters.

## 🏗️ Architecture Overview

### System Components

```mermaid
graph TB
    A[Load Balancer] --> B[Frontend - Next.js]
    A --> C[Backend - FastAPI]
    
    C --> D[PostgreSQL Database]
    C --> E[Redis Cache]
    C --> F[Prometheus Metrics]
    
    G[Grafana] --> F
    H[AlertManager] --> I[Notifications]
    
    J[Jaeger] --> K[Distributed Tracing]
    L[ELK Stack] --> M[Log Aggregation]
    
    N[GitHub] --> O[CI/CD Pipeline]
    O --> P[Container Registry]
    P --> Q[Kubernetes Cluster]
```

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.11, PostgreSQL, Redis
- **Monitoring**: Prometheus, Grafana, Jaeger, ELK Stack
- **Infrastructure**: Kubernetes, Docker, Terraform, Helm
- **CI/CD**: GitHub Actions, Docker, Kubernetes

## 🚀 Quick Start Deployment

### Prerequisites
- Docker and Docker Compose
- Kubernetes cluster (for production)
- PostgreSQL 15+ and Redis 7+
- Node.js 20+ and Python 3.11+

### Local Development Setup

#### 1. Clone and Setup
```bash
# Clone repository
git clone https://github.com/your-org/opssight-platform.git
cd opssight-platform

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d
```

#### 2. Initialize Database
```bash
# Run database migrations
cd backend
alembic upgrade head

# Seed initial data (optional)
python scripts/seed_data.py
```

#### 3. Access Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## 🐳 Docker Deployment

### Production Docker Setup

#### 1. Build Production Images
```bash
# Build backend image
docker build -f backend/Dockerfile -t opssight/backend:latest backend/

# Build frontend image
docker build -f frontend/Dockerfile -t opssight/frontend:latest frontend/
```

#### 2. Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    image: opssight/frontend:latest
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    image: opssight/backend:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/opssight
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=opssight
      - POSTGRES_USER=opssight
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### 3. Deploy Production Stack
```bash
# Deploy production environment
docker-compose -f docker-compose.prod.yml up -d

# Check service health
docker-compose -f docker-compose.prod.yml ps
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (v1.25+)
- Helm 3.10+
- kubectl configured
- NGINX Ingress Controller
- cert-manager (for TLS)

### 1. Namespace Setup
```bash
# Create namespace
kubectl create namespace opssight

# Set default namespace
kubectl config set-context --current --namespace=opssight
```

### 2. Secrets Management
```bash
# Create secrets
kubectl create secret generic opssight-secrets \
  --from-literal=database-url="postgresql://user:pass@postgres:5432/opssight" \
  --from-literal=redis-url="redis://redis:6379" \
  --from-literal=secret-key="${SECRET_KEY}" \
  --from-literal=github-token="${GITHUB_TOKEN}"

# Create TLS certificates (if using cert-manager)
kubectl apply -f k8s/certificates/
```

### 3. Deploy with Helm
```bash
# Add Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install dependencies
helm install postgresql bitnami/postgresql \
  --set auth.postgresPassword=${POSTGRES_PASSWORD} \
  --set auth.database=opssight

helm install redis bitnami/redis \
  --set auth.enabled=false

# Deploy OpsSight platform
helm install opssight ./helm/opssight \
  --values ./helm/opssight/values-production.yaml
```

### 4. Verify Deployment
```bash
# Check pod status
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress

# View logs
kubectl logs -l app=opssight-backend --tail=50
```

### 5. Scaling
```bash
# Scale backend
kubectl scale deployment opssight-backend --replicas=3

# Scale frontend
kubectl scale deployment opssight-frontend --replicas=2

# Auto-scaling (HPA)
kubectl apply -f k8s/hpa/
```

## 🌍 Multi-Environment Setup

### Environment Configuration

#### Development
```yaml
# values-development.yaml
environment: development
replicaCount: 1
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

ingress:
  enabled: false

monitoring:
  enabled: true
  debug: true
```

#### Staging
```yaml
# values-staging.yaml
environment: staging
replicaCount: 2
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

ingress:
  enabled: true
  hosts:
    - staging.opssight.dev

monitoring:
  enabled: true
  retention: "7d"
```

#### Production
```yaml
# values-production.yaml
environment: production
replicaCount: 3
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"

ingress:
  enabled: true
  tls:
    enabled: true
  hosts:
    - opssight.dev
    - api.opssight.dev

monitoring:
  enabled: true
  retention: "30d"
  alerting: true

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Environment Deployment
```bash
# Deploy to staging
helm upgrade --install opssight-staging ./helm/opssight \
  --namespace opssight-staging \
  --values ./helm/opssight/values-staging.yaml

# Deploy to production
helm upgrade --install opssight-prod ./helm/opssight \
  --namespace opssight-production \
  --values ./helm/opssight/values-production.yaml
```

## 🔧 Infrastructure as Code

### Terraform Setup

#### 1. AWS Infrastructure
```bash
cd infrastructure/

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan -var-file="environments/production.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/production.tfvars"
```

#### 2. Infrastructure Components
```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  
  environment = var.environment
  cidr_block  = var.vpc_cidr
}

module "eks" {
  source = "./modules/eks"
  
  cluster_name = "${var.project_name}-${var.environment}"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
}

module "rds" {
  source = "./modules/rds"
  
  instance_class = var.db_instance_class
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids
}
```

#### 3. Environment Variables
```bash
# environments/production.tfvars
environment         = "production"
project_name       = "opssight"
vpc_cidr          = "10.0.0.0/16"
db_instance_class = "db.r5.large"
node_instance_type = "m5.large"
node_desired_size  = 3
node_max_size      = 10
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

#### 1. Main CI/CD Pipeline
```yaml
# .github/workflows/cd.yml
name: Continuous Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd backend
          pytest --cov=. --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push Docker images
        run: |
          docker build -t ${{ env.REGISTRY }}/backend:${{ github.sha }} backend/
          docker build -t ${{ env.REGISTRY }}/frontend:${{ github.sha }} frontend/
          docker push ${{ env.REGISTRY }}/backend:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/frontend:${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to staging
        run: |
          helm upgrade opssight-staging ./helm/opssight \
            --set image.tag=${{ github.sha }} \
            --namespace staging
```

#### 2. Security Scanning
```yaml
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.REGISTRY }}/backend:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### Deployment Strategies

#### 1. Blue-Green Deployment
```bash
# Deploy new version (green)
helm install opssight-green ./helm/opssight \
  --set image.tag=new-version \
  --set service.selector.version=green

# Switch traffic
kubectl patch service opssight-backend \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Remove old version (blue)
helm uninstall opssight-blue
```

#### 2. Canary Deployment
```yaml
# Canary deployment with Istio
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: opssight-backend
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 10m}
      - setWeight: 40
      - pause: {duration: 10m}
      - setWeight: 60
      - pause: {duration: 10m}
      - setWeight: 80
      - pause: {duration: 10m}
```

## 📊 Monitoring & Observability

### Prometheus Setup
```yaml
# prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'opssight-backend'
    static_configs:
      - targets: ['opssight-backend:8000']
    metrics_path: '/metrics'

  - job_name: 'opssight-frontend'
    static_configs:
      - targets: ['opssight-frontend:3000']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### Grafana Dashboards
```bash
# Import pre-configured dashboards
kubectl apply -f monitoring/grafana/dashboards/

# Access Grafana
kubectl port-forward svc/grafana 3000:80
```

### Alert Rules
```yaml
# alert_rules.yml
groups:
  - name: opssight.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
```

## 🔐 Security & Compliance

### Security Checklist
- [ ] TLS encryption enabled (cert-manager)
- [ ] Network policies configured
- [ ] RBAC properly configured
- [ ] Secrets encrypted at rest
- [ ] Pod security policies applied
- [ ] Image vulnerability scanning
- [ ] Runtime security monitoring
- [ ] Audit logging enabled

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: opssight-backend-policy
spec:
  podSelector:
    matchLabels:
      app: opssight-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: opssight-frontend
    ports:
    - protocol: TCP
      port: 8000
```

### Pod Security Standards
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: opssight-backend
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: backend
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
```

## 🚨 Disaster Recovery

### Backup Strategy

#### 1. Database Backup
```bash
# Automated PostgreSQL backup
kubectl create job --from=cronjob/postgres-backup postgres-backup-manual

# Manual backup
kubectl exec -it postgres-0 -- pg_dump -U opssight opssight > backup.sql
```

#### 2. Configuration Backup
```bash
# Backup Kubernetes resources
kubectl get all -o yaml > k8s-backup.yaml

# Backup Helm releases
helm list -A -o yaml > helm-backup.yaml
```

### Recovery Procedures

#### 1. Database Recovery
```bash
# Restore from backup
kubectl exec -i postgres-0 -- psql -U opssight opssight < backup.sql

# Verify data integrity
kubectl exec -it postgres-0 -- psql -U opssight -c "SELECT COUNT(*) FROM users;"
```

#### 2. Application Recovery
```bash
# Restore from backup
kubectl apply -f k8s-backup.yaml

# Verify services
kubectl get pods --all-namespaces
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Pod Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name> --previous

# Check resource usage
kubectl top pod <pod-name>
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it <backend-pod> -- python -c "
import psycopg2
conn = psycopg2.connect('postgresql://user:pass@postgres:5432/opssight')
print('Database connection successful')
"

# Check database logs
kubectl logs postgres-0
```

#### 3. Performance Issues
```bash
# Check resource usage
kubectl top nodes
kubectl top pods

# Check metrics
curl http://localhost:8000/metrics | grep http_request_duration

# Check traces
kubectl port-forward svc/jaeger 16686:16686
```

### Debug Commands
```bash
# Get all resources
kubectl get all --all-namespaces

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Check resource quotas
kubectl describe resourcequota

# Check network connectivity
kubectl exec -it <pod> -- nslookup <service-name>
```

## 📋 Operations Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] Tests passing
- [ ] Security scan passed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Monitoring alerts configured

### Deployment
- [ ] Backup current state
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Check monitoring dashboards
- [ ] Verify health checks
- [ ] Deploy to production

### Post-Deployment
- [ ] Verify all services running
- [ ] Check error rates
- [ ] Verify database migrations
- [ ] Test critical user journeys
- [ ] Monitor for 24 hours
- [ ] Update documentation

## 📚 Additional Resources

### Documentation
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Monitoring Tools
- [Prometheus](https://prometheus.io/docs/)
- [Grafana](https://grafana.com/docs/)
- [Jaeger](https://www.jaegertracing.io/docs/)
- [AlertManager](https://prometheus.io/docs/alerting/latest/alertmanager/)

### Support
- **Internal Documentation**: `/docs`
- **Runbooks**: `/runbooks`
- **On-call Guide**: `/oncall`
- **Escalation Matrix**: `/escalation`

---

This deployment and operations guide provides comprehensive coverage for managing the OpsSight platform across all environments. For specific issues or advanced configurations, refer to the individual component documentation.