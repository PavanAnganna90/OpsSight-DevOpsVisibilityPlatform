# OpsSight Platform - Installation Guide

Comprehensive installation guide for OpsSight DevOps Platform across different environments and deployment scenarios.

## 📋 System Requirements

### Minimum Requirements
- **CPU**: 4 cores (8 recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 50GB SSD (100GB recommended)
- **OS**: Ubuntu 20.04 LTS, macOS 10.15+, or Windows 10/11

### Recommended Production Setup
- **CPU**: 8+ cores
- **RAM**: 32GB+
- **Storage**: 500GB+ SSD
- **Network**: 1Gbps connection
- **Load Balancer**: NGINX or cloud LB

## 🛠️ Installation Methods

### Method 1: Docker Development Setup (Recommended)

Perfect for local development and testing.

#### Prerequisites

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/opssight-platform
cd opssight-platform

# 2. Create environment file
cp env.example .env

# 3. Configure environment variables
nano .env  # Edit as needed

# 4. Start services
make start

# 5. Wait for services to be ready
make health-check
```

#### Verify Installation

```bash
# Check all services are running
docker-compose ps

# Access the platform
curl http://localhost:3000  # Frontend
curl http://localhost:8000/health  # Backend
curl http://localhost:3001  # Monitoring
```

### Method 2: Native Development Setup

For developers who prefer running services natively.

#### Backend Setup

```bash
# 1. Install Python dependencies
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2. Install and start PostgreSQL
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/

# 3. Install and start Redis
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis
brew services start redis

# Windows
# Download from https://github.com/microsoftarchive/redis/releases

# 4. Setup database
createuser -s opssight_user
createdb -O opssight_user opssight_dev
psql -U opssight_user -d opssight_dev -c "ALTER USER opssight_user PASSWORD 'password';"

# 5. Run migrations
alembic upgrade head

# 6. Start backend
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup

```bash
# 1. Install Node.js 18+
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@18

# Windows
# Download from https://nodejs.org/

# 2. Install dependencies
cd frontend
npm install

# 3. Start development server
npm run dev
```

#### Monitoring Setup (Optional)

```bash
# Start monitoring stack
cd monitoring
./start-monitoring.sh
```

### Method 3: Kubernetes Production Deployment

For production environments using Kubernetes.

#### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm (optional)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify cluster access
kubectl cluster-info
```

#### Deployment Steps

```bash
# 1. Create namespace
kubectl create namespace opssight

# 2. Create secrets
kubectl create secret generic opssight-secrets \
  --from-literal=database-url="postgresql://user:pass@postgres:5432/opssight" \
  --from-literal=redis-url="redis://redis:6379/0" \
  --from-literal=secret-key="your-secret-key" \
  --namespace=opssight

# 3. Deploy using Kustomize
kubectl apply -k k8s/production

# 4. Wait for deployment
kubectl wait --for=condition=available --timeout=600s deployment --all -n opssight

# 5. Get service URLs
kubectl get ingress -n opssight
```

### Method 4: Cloud Provider Deployment

#### AWS ECS/Fargate

```bash
# 1. Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 2. Configure AWS credentials
aws configure

# 3. Deploy infrastructure
cd infrastructure/aws
terraform init
terraform plan
terraform apply

# 4. Deploy application
aws ecs update-service --cluster opssight --service opssight-backend --force-new-deployment
aws ecs update-service --cluster opssight --service opssight-frontend --force-new-deployment
```

#### Google Cloud Run

```bash
# 1. Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 2. Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy services
gcloud run deploy opssight-backend \
  --image gcr.io/YOUR_PROJECT_ID/opssight-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

gcloud run deploy opssight-frontend \
  --image gcr.io/YOUR_PROJECT_ID/opssight-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Azure Container Instances

```bash
# 1. Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 2. Login to Azure
az login

# 3. Create resource group
az group create --name opssight-rg --location eastus

# 4. Deploy containers
az container create \
  --resource-group opssight-rg \
  --name opssight-backend \
  --image opssight/backend:latest \
  --dns-name-label opssight-backend \
  --ports 8000

az container create \
  --resource-group opssight-rg \
  --name opssight-frontend \
  --image opssight/frontend:latest \
  --dns-name-label opssight-frontend \
  --ports 3000
```

## ⚙️ Configuration

### Environment Variables

#### Required Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/opssight
POSTGRES_USER=opssight_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=opssight_dev

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secure-secret-key-min-32-chars
JWT_SECRET_KEY=another-super-secure-jwt-key-here
ENCRYPTION_KEY=base64-encoded-32-byte-encryption-key

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_secret

# Application Settings
ENVIRONMENT=development  # development, staging, production
DEBUG=true
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

#### Optional Variables

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-app-password
SMTP_TLS=true

# Monitoring
PROMETHEUS_ENABLED=true
JAEGER_ENABLED=false
LOKI_URL=http://localhost:3100

# External Integrations
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
WEBHOOK_SECRET=webhook-signing-secret

# Performance
WORKERS=4
MAX_REQUESTS=1000
TIMEOUT=30
CACHE_TTL=300

# Security
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
SESSION_TIMEOUT=3600
```

### SSL/TLS Configuration

#### Development (Self-signed)

```bash
# Generate self-signed certificates
mkdir ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

#### Production (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/

# Set up auto-renewal
echo "0 2 * * * certbot renew --quiet" | sudo crontab -
```

### Database Configuration

#### PostgreSQL Optimization

```sql
-- Create optimized database configuration
-- Add to postgresql.conf

# Memory Settings
shared_buffers = 1GB                    # 25% of RAM
effective_cache_size = 3GB              # 75% of RAM
work_mem = 16MB                         # Per operation
maintenance_work_mem = 512MB            # Maintenance operations

# Connection Settings
max_connections = 100                   # Adjust based on needs
idle_in_transaction_session_timeout = 60000

# Performance Settings
random_page_cost = 1.1                 # SSD optimization
effective_io_concurrency = 200         # SSD optimization
default_statistics_target = 100        # Query planning

# WAL Settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

#### Database Initialization

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE USER opssight_user WITH ENCRYPTED PASSWORD 'secure_password';
CREATE DATABASE opssight_prod OWNER opssight_user;
GRANT ALL PRIVILEGES ON DATABASE opssight_prod TO opssight_user;
\q
EOF

# Run migrations
cd backend
alembic upgrade head

# Load seed data (optional)
python scripts/seed_data.py
```

### Redis Configuration

```bash
# Create Redis configuration
sudo tee /etc/redis/redis.conf << EOF
# Network
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 300

# Memory
maxmemory 1gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
# requirepass your_redis_password

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
EOF

# Restart Redis
sudo systemctl restart redis-server
```

## 🔒 Security Configuration

### Firewall Setup

```bash
# Configure UFW (Ubuntu/Debian)
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5432/tcp   # Block external DB access
sudo ufw deny 6379/tcp   # Block external Redis access
```

### Application Security

```bash
# Set proper file permissions
chmod 600 .env*
chmod 700 ssl/
chmod 600 ssl/*

# Create non-root user for services
sudo useradd -m -s /bin/bash opssight
sudo usermod -aG docker opssight
```

### Secret Management

```bash
# Generate secure keys
python -c "import secrets; print(secrets.token_urlsafe(32))"  # SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"  # JWT_SECRET_KEY
python -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())"  # ENCRYPTION_KEY
```

## 📊 Monitoring Setup

### Basic Monitoring

```bash
# Start monitoring stack
cd monitoring
./start-monitoring.sh

# Verify services
curl http://localhost:9090/-/ready    # Prometheus
curl http://localhost:3001/api/health # Grafana
curl http://localhost:3100/ready     # Loki
```

### Production Monitoring

```bash
# Configure external Grafana
export GRAFANA_CLOUD_URL=https://your-org.grafana.net
export GRAFANA_CLOUD_API_KEY=your-api-key

# Configure alert notifications
cat > alertmanager/config.yml << EOF
global:
  smtp_smarthost: 'smtp.company.com:587'
  smtp_from: 'alerts@company.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts'
EOF
```

## 🚨 Troubleshooting

### Common Installation Issues

#### Docker Permission Issues

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify docker access
docker run hello-world
```

#### Port Conflicts

```bash
# Check what's using ports
sudo netstat -tlnp | grep :3000
sudo lsof -i :3000

# Kill conflicting processes
sudo kill -9 PID
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U opssight_user -d opssight_dev -h localhost -c "SELECT 1;"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### Memory Issues

```bash
# Check available memory
free -h

# Optimize for low memory
export WORKERS=2
export MAX_REQUESTS=500
```

### Performance Optimization

#### Backend Performance

```bash
# Use production ASGI server
pip install gunicorn uvicorn[standard]

# Start with optimized settings
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Frontend Performance

```bash
# Build optimized frontend
cd frontend
npm run build
npm run start  # Production server
```

#### Database Performance

```bash
# Analyze slow queries
sudo tail -f /var/log/postgresql/postgresql-*.log | grep "slow"

# Update database statistics
sudo -u postgres psql -d opssight_prod -c "ANALYZE;"
```

## 📚 Next Steps

After successful installation:

1. **[Configuration Guide](./configuration.md)** - Advanced configuration options
2. **[First Steps](./first-steps.md)** - Initial platform setup
3. **[Development Setup](../development/setup.md)** - Development environment
4. **[Production Deployment](../deployment/production.md)** - Production deployment
5. **[Security Guide](../operations/security-ops.md)** - Security hardening

## 🆘 Support

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review logs: `make logs` or `docker-compose logs -f`
3. Search existing [GitHub issues](https://github.com/your-org/opssight-platform/issues)
4. Create a new issue with:
   - OS and version
   - Installation method used
   - Error messages and logs
   - Steps to reproduce

---

**✅ Installation complete! Your OpsSight platform is ready.**