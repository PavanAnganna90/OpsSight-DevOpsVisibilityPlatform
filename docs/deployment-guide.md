# Deployment Guide

This guide covers deploying the OpsSight DevOps Platform to various environments, from development to production.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Cloud Deployment](#cloud-deployment)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring Setup](#monitoring-setup)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)

## Overview

The OpsSight platform supports multiple deployment strategies:

- **Development**: Local development with hot reload
- **Docker**: Containerized deployment for consistent environments
- **Kubernetes**: Scalable orchestration for production workloads
- **Cloud**: Managed services on AWS, Azure, or GCP
- **Hybrid**: On-premises with cloud integrations

## Prerequisites

### System Requirements

- **CPU**: 2+ cores (4+ recommended for production)
- **Memory**: 4GB RAM minimum (8GB+ recommended)
- **Storage**: 20GB+ available space
- **Network**: Internet access for external integrations

### Software Dependencies

- **Node.js**: 18+ with npm 8+
- **Python**: 3.9+ with pip
- **Docker**: 20.10+ with Docker Compose
- **Git**: 2.30+
- **Kubernetes**: 1.25+ (for K8s deployment)

### External Services

- **GitHub OAuth App**: For authentication
- **PostgreSQL**: Database (can be containerized)
- **Redis**: Caching and session storage
- **SMTP Server**: Email notifications (optional)

## Environment Configuration

### Environment Variables

#### Frontend (.env.local)
```bash
# Application
NEXT_PUBLIC_APP_NAME=OpsSight
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=production

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com/ws

# Authentication
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
NEXT_PUBLIC_AUTH_CALLBACK_URL=https://your-domain.com/auth/callback

# Feature Flags
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# External Services
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

#### Backend (.env)
```bash
# Application
APP_NAME=OpsSight Backend
APP_VERSION=1.0.0
APP_ENV=production
DEBUG=false

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/opsight
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# External APIs
KUBERNETES_CONFIG_PATH=/path/to/kubeconfig
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
GRAFANA_API_KEY=your_grafana_api_key

# Email Configuration
SMTP_SERVER=smtp.your-domain.com
SMTP_PORT=587
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_EMAIL=noreply@your-domain.com

# Security
SECRET_KEY=your_secret_key
ALLOWED_HOSTS=your-domain.com,api.your-domain.com
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=INFO
```

### Secrets Management

#### Development
```bash
# Copy template files
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local

# Edit configuration files
nano .env
nano frontend/.env.local
```

#### Production
Use secure secret management:

**AWS Secrets Manager**
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "opsight/production/github-oauth" \
  --secret-string '{"client_id":"xxx","client_secret":"yyy"}'
```

**Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: opsight-secrets
type: Opaque
data:
  github-client-id: <base64-encoded-value>
  github-client-secret: <base64-encoded-value>
  jwt-secret: <base64-encoded-value>
```

## Local Development

### Quick Start
```bash
# Clone repository
git clone https://github.com/your-org/opsight-devops-platform.git
cd opsight-devops-platform

# Setup environment
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && pip install -r requirements.txt && cd ..

# Start development servers
npm run dev:all
```

### Development Workflow

1. **Frontend Development**
   ```bash
   cd frontend
   npm run dev        # Start Next.js dev server
   npm run storybook  # Start Storybook
   npm run test:watch # Run tests in watch mode
   ```

2. **Backend Development**
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   python -m pytest --watch  # Run tests in watch mode
   ```

3. **Database Setup**
   ```bash
   # Start PostgreSQL with Docker
   docker run -d --name opsight-db \
     -e POSTGRES_DB=opsight \
     -e POSTGRES_USER=opsight \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 postgres:15

   # Run migrations
   cd backend
   alembic upgrade head
   ```

## Docker Deployment

### Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://opsight:password@db:5432/opsight
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=opsight
      - POSTGRES_USER=opsight
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Production Docker Setup

```bash
# Build production images
docker build -t opsight-frontend:latest ./frontend
docker build -t opsight-backend:latest ./backend

# Push to registry
docker tag opsight-frontend:latest your-registry/opsight-frontend:latest
docker push your-registry/opsight-frontend:latest

docker tag opsight-backend:latest your-registry/opsight-backend:latest
docker push your-registry/opsight-backend:latest
```

## Kubernetes Deployment

### Namespace Setup

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: opsight
  labels:
    name: opsight
```

### ConfigMap and Secrets

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opsight-config
  namespace: opsight
data:
  NEXT_PUBLIC_API_BASE_URL: "https://api.your-domain.com/api/v1"
  DATABASE_URL: "postgresql://opsight:password@postgres:5432/opsight"
  REDIS_URL: "redis://redis:6379/0"
```

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: opsight-secrets
  namespace: opsight
type: Opaque
data:
  github-client-id: <base64-encoded>
  github-client-secret: <base64-encoded>
  jwt-secret: <base64-encoded>
```

### Application Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opsight-frontend
  namespace: opsight
spec:
  replicas: 3
  selector:
    matchLabels:
      app: opsight-frontend
  template:
    metadata:
      labels:
        app: opsight-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/opsight-frontend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: opsight-config
        - secretRef:
            name: opsight-secrets
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### Service and Ingress

```yaml
# k8s/frontend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: opsight-frontend-service
  namespace: opsight
spec:
  selector:
    app: opsight-frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opsight-ingress
  namespace: opsight
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - your-domain.com
    - api.your-domain.com
    secretName: opsight-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: opsight-frontend-service
            port:
              number: 80
  - host: api.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: opsight-backend-service
            port:
              number: 80
```

### Deployment Commands

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n opsight
kubectl get services -n opsight
kubectl get ingress -n opsight

# View logs
kubectl logs -f deployment/opsight-frontend -n opsight
kubectl logs -f deployment/opsight-backend -n opsight
```

## Cloud Deployment

### AWS EKS Deployment

```bash
# Create EKS cluster
eksctl create cluster --name opsight-cluster --region us-west-2

# Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name opsight-cluster

# Deploy application
kubectl apply -f k8s/
```

### AWS RDS Setup

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier opsight-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username opsight \
  --master-user-password your-password \
  --allocated-storage 20
```

### Azure Container Instances

```bash
# Create resource group
az group create --name opsight-rg --location eastus

# Create container group
az container create \
  --resource-group opsight-rg \
  --name opsight-app \
  --image your-registry/opsight-frontend:latest \
  --dns-name-label opsight-app \
  --ports 3000
```

### Google Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy opsight-frontend \
  --image gcr.io/your-project/opsight-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

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
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd frontend && npm ci
    
    - name: Run tests
      run: |
        cd frontend
        npm run test:ci
        npm run lint
        npm run type-check
    
    - name: Build application
      run: |
        cd frontend
        npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Build and push Docker images
      run: |
        docker build -t opsight-frontend:${{ github.sha }} ./frontend
        docker build -t opsight-backend:${{ github.sha }} ./backend
        
        docker tag opsight-frontend:${{ github.sha }} ${{ secrets.ECR_REGISTRY }}/opsight-frontend:${{ github.sha }}
        docker tag opsight-backend:${{ github.sha }} ${{ secrets.ECR_REGISTRY }}/opsight-backend:${{ github.sha }}
        
        docker push ${{ secrets.ECR_REGISTRY }}/opsight-frontend:${{ github.sha }}
        docker push ${{ secrets.ECR_REGISTRY }}/opsight-backend:${{ github.sha }}
    
    - name: Deploy to EKS
      run: |
        aws eks update-kubeconfig --region us-west-2 --name opsight-cluster
        kubectl set image deployment/opsight-frontend frontend=${{ secrets.ECR_REGISTRY }}/opsight-frontend:${{ github.sha }} -n opsight
        kubectl set image deployment/opsight-backend backend=${{ secrets.ECR_REGISTRY }}/opsight-backend:${{ github.sha }} -n opsight
        kubectl rollout status deployment/opsight-frontend -n opsight
        kubectl rollout status deployment/opsight-backend -n opsight
```

### Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

# Configuration
REGISTRY="${REGISTRY:-your-registry}"
TAG="${TAG:-latest}"
NAMESPACE="${NAMESPACE:-opsight}"

echo "🚀 Deploying OpsSight to $NAMESPACE namespace..."

# Build images
echo "📦 Building Docker images..."
docker build -t $REGISTRY/opsight-frontend:$TAG ./frontend
docker build -t $REGISTRY/opsight-backend:$TAG ./backend

# Push images
echo "📤 Pushing images to registry..."
docker push $REGISTRY/opsight-frontend:$TAG
docker push $REGISTRY/opsight-backend:$TAG

# Deploy to Kubernetes
echo "🎯 Deploying to Kubernetes..."
kubectl apply -f k8s/
kubectl set image deployment/opsight-frontend frontend=$REGISTRY/opsight-frontend:$TAG -n $NAMESPACE
kubectl set image deployment/opsight-backend backend=$REGISTRY/opsight-backend:$TAG -n $NAMESPACE

# Wait for rollout
echo "⏳ Waiting for deployment rollout..."
kubectl rollout status deployment/opsight-frontend -n $NAMESPACE
kubectl rollout status deployment/opsight-backend -n $NAMESPACE

echo "✅ Deployment completed successfully!"
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'opsight-frontend'
    static_configs:
    - targets: ['opsight-frontend-service:3000']
    metrics_path: '/api/metrics'
    
  - job_name: 'opsight-backend'
    static_configs:
    - targets: ['opsight-backend-service:8000']
    metrics_path: '/metrics'
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "OpsSight Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{handler}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

## Security Considerations

### SSL/TLS Configuration

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.11.0/cert-manager.yaml

# Create cluster issuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Security Headers

```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    
    location / {
        proxy_pass http://opsight-frontend-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

1. **Pod Not Starting**
   ```bash
   # Check pod status
   kubectl describe pod <pod-name> -n opsight
   
   # Check logs
   kubectl logs <pod-name> -n opsight
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   kubectl exec -it <backend-pod> -n opsight -- psql $DATABASE_URL
   ```

3. **Image Pull Errors**
   ```bash
   # Check image pull secrets
   kubectl get secrets -n opsight
   
   # Create image pull secret
   kubectl create secret docker-registry regcred \
     --docker-server=your-registry \
     --docker-username=your-username \
     --docker-password=your-password \
     -n opsight
   ```

### Health Checks

```bash
# Check application health
curl -f http://your-domain.com/health

# Check API health
curl -f http://api.your-domain.com/api/v1/health

# Check database connectivity
kubectl exec -it <backend-pod> -n opsight -- python -c "
import psycopg2
conn = psycopg2.connect('$DATABASE_URL')
print('Database connection successful')
"
```

### Logs and Debugging

```bash
# View application logs
kubectl logs -f deployment/opsight-frontend -n opsight
kubectl logs -f deployment/opsight-backend -n opsight

# Access pod shell
kubectl exec -it <pod-name> -n opsight -- /bin/bash

# Port forward for debugging
kubectl port-forward service/opsight-frontend-service 3000:80 -n opsight
```

## Support

For deployment issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [GitHub issues](https://github.com/your-org/opsight-devops-platform/issues)
3. Consult the [documentation](../README.md)
4. Contact the development team

---

This deployment guide provides comprehensive instructions for deploying OpsSight in various environments. For specific cloud provider configurations or advanced setups, refer to the respective documentation sections.