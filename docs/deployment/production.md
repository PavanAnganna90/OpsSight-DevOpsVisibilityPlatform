# Production Deployment Guide

## 🎯 Overview

This guide provides comprehensive instructions for deploying OpsSight DevOps Platform to production environments. It covers infrastructure setup, security configuration, performance optimization, and operational considerations.

## 🏗️ Production Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Production Environment                      │
├─────────────────────────────────────────────────────────────────────┤
│                          Load Balancer                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  NGINX/HAProxy/CloudFlare - SSL Termination & Routing     │    │
│  └─────────────────────────┬───────────────────────────────────┘    │
│                             │                                       │
│  ┌─────────────────────────┼───────────────────────────────────┐    │
│  │          Application Tier          │          Monitoring    │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  │  Frontend App   │ │   Backend API   │ │    Grafana      │    │
│  │  │   (3+ nodes)    │ │   (3+ nodes)    │ │  + Prometheus   │    │
│  │  │                 │ │                 │ │   + Loki        │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  └─────────────────────────┼───────────────────────────────────┘    │
│                             │                                       │
│  ┌─────────────────────────┼───────────────────────────────────┐    │
│  │              Data Tier              │      Cache Tier       │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  │   PostgreSQL    │ │     Redis       │ │      MinIO      │    │
│  │  │   (Primary +    │ │   (Cluster)     │ │   (Object       │    │
│  │  │    Replicas)    │ │                 │ │    Storage)     │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### Infrastructure Requirements

#### Minimum System Requirements
- **CPU**: 8 cores (16 vCPUs recommended)
- **RAM**: 16GB (32GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **Network**: 1Gbps connection
- **Operating System**: Ubuntu 20.04 LTS or CentOS 8+

#### Recommended Production Setup
- **Application Servers**: 3+ nodes (HA setup)
- **Database**: PostgreSQL cluster with read replicas
- **Cache**: Redis cluster (3+ nodes)
- **Load Balancer**: NGINX Plus or cloud load balancer
- **Monitoring**: Dedicated monitoring stack

### Required Software
- Docker 24.0+
- Docker Compose 2.0+
- Kubernetes 1.28+ (for K8s deployment)
- SSL certificates (Let's Encrypt or commercial)

### Network Requirements
- **Inbound Ports**: 80, 443, 22
- **Internal Ports**: 5432 (PostgreSQL), 6379 (Redis), 9090 (Prometheus)
- **Security Groups**: Properly configured for service communication

## 🚀 Deployment Methods

### Method 1: Docker Compose (Recommended for single-node)

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/opssight
sudo chown $USER:$USER /opt/opssight
cd /opt/opssight
```

#### 2. Download and Configure

```bash
# Clone repository
git clone https://github.com/your-org/opssight-platform.git .

# Create production environment file
cp env.example .env.production

# Edit production configuration
nano .env.production
```

#### 3. Production Environment Configuration

```bash
# .env.production
ENVIRONMENT=production
DEBUG=false

# Database Configuration
DATABASE_URL=postgresql://opssight_user:secure_password@postgres:5432/opssight_prod
POSTGRES_USER=opssight_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=opssight_prod

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Security Configuration
SECRET_KEY=your-super-secure-secret-key-here
JWT_SECRET_KEY=another-super-secure-jwt-key-here
ENCRYPTION_KEY=base64-encoded-32-byte-key

# OAuth Configuration
GITHUB_CLIENT_ID=your-github-oauth-app-id
GITHUB_CLIENT_SECRET=your-github-oauth-secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-app-password

# Monitoring Configuration
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=secure-grafana-password

# SSL Configuration
SSL_ENABLED=true
DOMAIN_NAME=opssight.yourcompany.com

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_S3_BUCKET=opssight-backups
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

#### 4. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot certonly --standalone -d opssight.yourcompany.com

# Copy certificates to application directory
sudo cp /etc/letsencrypt/live/opssight.yourcompany.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/opssight.yourcompany.com/privkey.pem ./ssl/
sudo chown $USER:$USER ./ssl/*
```

#### 5. Deploy Application

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Method 2: Kubernetes Deployment

#### 1. Prepare Kubernetes Environment

```bash
# Create namespace
kubectl create namespace opssight

# Create secrets
kubectl create secret generic opssight-secrets \
  --from-literal=database-url="postgresql://user:pass@postgres:5432/opssight" \
  --from-literal=redis-url="redis://redis:6379/0" \
  --from-literal=secret-key="your-secret-key" \
  --from-literal=jwt-secret="your-jwt-secret" \
  --namespace=opssight

# Create SSL certificate secret
kubectl create secret tls opssight-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=opssight
```

#### 2. Deploy using Kustomize

```bash
# Deploy to staging
kubectl apply -k k8s/staging

# Deploy to production
kubectl apply -k k8s/production

# Check deployment status
kubectl get pods -n opssight
kubectl get services -n opssight
kubectl get ingress -n opssight
```

## 🔒 Security Configuration

### 1. Network Security

```bash
# Configure firewall (UFW)
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # Block external database access
sudo ufw deny 6379/tcp  # Block external Redis access

# Configure fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Database Security

```sql
-- Create production database user with limited privileges
CREATE USER opssight_app WITH ENCRYPTED PASSWORD 'secure_password';
CREATE DATABASE opssight_prod OWNER opssight_app;

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE opssight_prod TO opssight_app;
GRANT USAGE ON SCHEMA public TO opssight_app;
GRANT CREATE ON SCHEMA public TO opssight_app;

-- Enable SSL connections only
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';
```

### 3. Application Security

```bash
# Set proper file permissions
chmod 600 .env.production
chmod 700 ssl/
chmod 600 ssl/*

# Configure security headers in NGINX
cat > /etc/nginx/conf.d/security-headers.conf << 'EOF'
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF
```

## ⚡ Performance Optimization

### 1. Database Optimization

```sql
-- Optimize PostgreSQL settings for production
-- Add to postgresql.conf

# Memory settings
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 512MB

# WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_writer_delay = 200ms

# Query optimization
random_page_cost = 1.1
effective_io_concurrency = 200

# Connection settings
max_connections = 200
```

### 2. Redis Optimization

```bash
# Redis configuration for production
cat > /etc/redis/redis.conf << 'EOF'
# Memory settings
maxmemory 4gb
maxmemory-policy allkeys-lru

# Persistence settings
save 900 1
save 300 10
save 60 10000

# Network settings
tcp-keepalive 300
timeout 0

# Security
requirepass your-redis-password
EOF
```

### 3. Application Optimization

```bash
# Set production environment variables
export NODE_ENV=production
export PYTHON_ENV=production
export WORKERS=4
export MAX_REQUESTS=1000
export TIMEOUT=30

# Enable compression
export COMPRESSION_ENABLED=true
export GZIP_LEVEL=6

# Configure caching
export CACHE_TTL=300
export CACHE_MAX_SIZE=1000
```

## 📊 Monitoring Setup

### 1. Application Monitoring

```yaml
# monitoring/docker-compose.prod.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.prod.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
      - '--storage.tsdb.retention.size=50GB'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.prod.yml:/etc/alertmanager/alertmanager.yml
```

### 2. Log Management

```yaml
# Configure Loki for production
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  max_entries_limit_per_query: 5000
  max_streams_per_user: 10000
```

## 💾 Backup and Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/opt/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="opssight_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
docker exec opssight-postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gz" s3://$BACKUP_S3_BUCKET/database/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

### 2. Application Backup

```bash
#!/bin/bash
# backup-application.sh

BACKUP_DIR="/opt/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf "$BACKUP_DIR/config_${DATE}.tar.gz" \
  .env.production \
  docker-compose.prod.yml \
  ssl/ \
  monitoring/

# Backup uploaded files
tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" uploads/

# Upload to S3
aws s3 cp "$BACKUP_DIR/config_${DATE}.tar.gz" s3://$BACKUP_S3_BUCKET/application/
aws s3 cp "$BACKUP_DIR/uploads_${DATE}.tar.gz" s3://$BACKUP_S3_BUCKET/application/

# Clean old local backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 3. Automated Backup Cron

```bash
# Add to crontab
crontab -e

# Database backup every 6 hours
0 */6 * * * /opt/opssight/scripts/backup-database.sh

# Application backup daily at 2 AM
0 2 * * * /opt/opssight/scripts/backup-application.sh

# Log rotation
0 3 * * * docker system prune -f --volumes
```

## 🔄 Health Checks and Monitoring

### 1. Application Health Checks

```bash
#!/bin/bash
# health-check.sh

# Check frontend
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Frontend: OK"
else
    echo "Frontend: FAILED"
    exit 1
fi

# Check backend API
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "Backend: OK"
else
    echo "Backend: FAILED"
    exit 1
fi

# Check database
if docker exec opssight-postgres pg_isready -U $POSTGRES_USER > /dev/null 2>&1; then
    echo "Database: OK"
else
    echo "Database: FAILED"
    exit 1
fi

# Check Redis
if docker exec opssight-redis redis-cli ping > /dev/null 2>&1; then
    echo "Redis: OK"
else
    echo "Redis: FAILED"
    exit 1
fi

echo "All services: OK"
```

### 2. Alerting Configuration

```yaml
# alertmanager/alertmanager.prod.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourcompany.com'
  smtp_auth_username: 'alerts@yourcompany.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'
  - match:
      severity: warning
    receiver: 'warning-alerts'

receivers:
- name: 'web.hook'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#alerts'

- name: 'critical-alerts'
  email_configs:
  - to: 'oncall@yourcompany.com'
    subject: 'CRITICAL: OpsSight Alert'
    body: |
      Alert: {{ .GroupLabels.alertname }}
      Severity: {{ .CommonLabels.severity }}
      Description: {{ .CommonAnnotations.description }}
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#critical-alerts'

- name: 'warning-alerts'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#warnings'
```

## 🚀 Deployment Automation

### 1. Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "Deploying OpsSight Platform to $ENVIRONMENT..."

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Run database migrations
docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Deploy with zero downtime
docker-compose -f docker-compose.prod.yml up -d

# Health check
sleep 30
if ./scripts/health-check.sh; then
    echo "Deployment successful!"
else
    echo "Deployment failed! Rolling back..."
    docker-compose -f docker-compose.prod.yml rollback
    exit 1
fi

# Clean up old images
docker image prune -f

echo "Deployment completed successfully!"
```

### 2. CI/CD Integration

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USER }}
        key: ${{ secrets.PROD_SSH_KEY }}
        script: |
          cd /opt/opssight
          git pull origin main
          ./scripts/deploy.sh production ${{ github.ref_name }}
```

## 🔧 Maintenance and Updates

### 1. Regular Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash
# maintenance.sh

echo "Starting weekly maintenance..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker system
docker system prune -f --volumes

# Rotate logs
docker-compose -f docker-compose.prod.yml logs --since 7d > /dev/null

# Update SSL certificates
sudo certbot renew --quiet

# Check disk space
df -h | grep -E "/(dev|var|opt)" | awk '$5 >= 80 { print "Warning: " $0 }'

# Database maintenance
docker exec opssight-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "VACUUM ANALYZE;"

# Redis memory optimization
docker exec opssight-redis redis-cli MEMORY PURGE

echo "Weekly maintenance completed!"
```

### 2. Update Procedure

```bash
#!/bin/bash
# update.sh

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Updating OpsSight to version $VERSION..."

# Backup before update
./scripts/backup-database.sh
./scripts/backup-application.sh

# Update application
git fetch --tags
git checkout $VERSION

# Update dependencies
docker-compose -f docker-compose.prod.yml pull

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Restart services
docker-compose -f docker-compose.prod.yml up -d

# Verify update
sleep 30
./scripts/health-check.sh

echo "Update to $VERSION completed successfully!"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
docker logs opssight-postgres

# Test connection
docker exec opssight-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"

# Check connection pool
docker exec opssight-backend python -c "from app.core.database import engine; print(engine.pool.status())"
```

#### 2. Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Optimize memory settings
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in ssl/fullchain.pem -text -noout

# Renew certificate
sudo certbot renew --force-renewal
```

## 📞 Support and Escalation

### Emergency Contacts
- **Primary On-call**: +1-555-123-4567
- **Secondary On-call**: +1-555-765-4321
- **Management Escalation**: management@yourcompany.com

### Monitoring Dashboards
- **Grafana**: https://monitoring.yourcompany.com
- **Prometheus**: https://metrics.yourcompany.com
- **AlertManager**: https://alerts.yourcompany.com

### Log Analysis
- **Application Logs**: `docker-compose logs -f backend`
- **System Logs**: `journalctl -u docker.service`
- **Access Logs**: `tail -f /var/log/nginx/access.log`

---

**Production deployment requires careful planning and testing. Always test in staging environment first!**