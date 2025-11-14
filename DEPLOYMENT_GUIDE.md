# OpsSight Platform - Production Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites
- Docker & Docker Compose installed
- Domain name configured (optional for local)
- SSL certificates (Let's Encrypt recommended)
- Basic server admin knowledge

### 1. Local Production Testing (Start Here)

```bash
# Clone and prepare
cd /Users/pavan/Desktop/Devops-app-dev-cursor

# Set up production environment
cp .env.production .env.prod
# Edit .env.prod with your actual values

# Deploy locally for testing
./deploy-production.sh basic
```

**Access URLs:**
- Frontend: http://localhost
- API: http://localhost:8000
- Monitoring: http://localhost:3001

### 2. Cloud Deployment Options

#### **Option A: AWS (Recommended for Scale)**

**Cost:** $50-200/month depending on usage

**Steps:**
```bash
# 1. Install AWS CLI
aws configure

# 2. Deploy infrastructure
cd infrastructure/
terraform init
terraform apply -var-file="environments/production.tfvars"

# 3. Deploy application
# EKS (Kubernetes) - Best for scalability
kubectl apply -f k8s/production/

# OR ECS (Docker) - Simpler setup
ecs-cli compose --file docker-compose.prod.yml service up
```

**Best for:**
- High traffic (1000+ users)
- Need auto-scaling
- Enterprise features
- Global distribution

#### **Option B: DigitalOcean (Recommended for Startups)**

**Cost:** $20-100/month

**Steps:**
```bash
# 1. Create droplet (Ubuntu 22.04, 4GB RAM minimum)
doctl compute droplet create opssight-prod \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --region nyc1

# 2. Deploy
scp -r . root@your-droplet-ip:/opt/opssight/
ssh root@your-droplet-ip
cd /opt/opssight
./scripts/setup-server.sh
./deploy-production.sh full
```

**Best for:**
- Startups/small teams
- Predictable costs
- Simple management
- Good performance

#### **Option C: Linode/Vultr (Budget Option)**

**Cost:** $10-50/month

Similar to DigitalOcean but more budget-friendly.

#### **Option D: Heroku (Easiest)**

**Cost:** $25-100/month

```bash
# 1. Install Heroku CLI
heroku create opssight-production

# 2. Configure buildpacks
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python

# 3. Deploy
git push heroku main
```

**Best for:**
- Rapid prototyping
- No DevOps overhead
- Quick demos

### 3. Self-Hosted (On-Premises)

**Requirements:**
- Ubuntu 22.04 or CentOS 8
- 8GB RAM minimum
- 100GB SSD storage
- Static IP address

```bash
# 1. Server setup
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
docker-compose --version

# 2. Deploy
git clone <your-repo>
cd opssight-platform
./deploy-production.sh full
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Domain name configured
- [ ] DNS records set up
- [ ] SSL certificates obtained
- [ ] Environment variables configured
- [ ] Database backup strategy
- [ ] Monitoring configured

### Production Deployment
- [ ] Deploy to staging first
- [ ] Run health checks
- [ ] Performance testing
- [ ] Security scanning
- [ ] Load testing
- [ ] Backup verification

### Post-Deployment
- [ ] Monitor system metrics
- [ ] Test all features
- [ ] Verify SSL certificates
- [ ] Check alert notifications
- [ ] Document access credentials
- [ ] Set up automated backups

## 🛠️ Specific Deployment Commands

### For AWS
```bash
# Complete AWS deployment
cd infrastructure/
terraform init
terraform apply

# Deploy to EKS
aws eks update-kubeconfig --name opssight-cluster
kubectl apply -f k8s/production/

# Set up monitoring
./monitoring/setup-monitoring.sh
```

### For DigitalOcean
```bash
# Create and configure droplet
doctl compute droplet create opssight-prod --size s-4vcpu-8gb
doctl compute droplet list

# Deploy application
./scripts/deploy-to-digitalocean.sh <droplet-ip>
```

### For Google Cloud
```bash
# Set up GKE cluster
gcloud container clusters create opssight-cluster \
  --num-nodes=3 \
  --machine-type=e2-standard-4

# Deploy application
kubectl apply -f k8s/production/
```

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# Copy and edit these
cp .env.production .env.prod

# Critical variables to update:
DOMAIN=your-domain.com
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET_KEY=your-jwt-secret
GITHUB_CLIENT_ID=your-github-oauth-id
GITHUB_CLIENT_SECRET=your-github-oauth-secret
```

### SSL Configuration
```bash
# Using Let's Encrypt (recommended)
certbot --nginx -d your-domain.com

# Or upload custom certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

## 📊 Monitoring Setup

After deployment, set up monitoring:

```bash
# Deploy monitoring stack
./monitoring/setup-monitoring.sh

# Access monitoring dashboards
# Grafana: https://your-domain.com:3001
# Prometheus: https://your-domain.com:9090
```

## 🚨 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :8000
```

**Docker issues:**
```bash
# Restart Docker
sudo systemctl restart docker
docker system prune -a
```

**SSL certificate issues:**
```bash
# Renew certificates
certbot renew
nginx -t && nginx -s reload
```

**Performance issues:**
```bash
# Check system resources
htop
docker stats
df -h
```

## 💰 Cost Estimates

| Provider | Small (100 users) | Medium (1k users) | Large (10k+ users) |
|----------|-------------------|-------------------|-------------------|
| **DigitalOcean** | $20/month | $60/month | $200/month |
| **AWS** | $50/month | $150/month | $500/month |
| **Google Cloud** | $45/month | $140/month | $450/month |
| **Azure** | $55/month | $160/month | $520/month |
| **Heroku** | $50/month | $200/month | $800/month |

## 🎯 Recommended Deployment for Different Use Cases

### **Startup/MVP** → DigitalOcean
- Simple setup
- Predictable costs
- Good performance
- Easy scaling

### **Enterprise** → AWS/Azure
- Advanced features
- Compliance tools
- Global presence
- Enterprise support

### **Development Team** → Local + Staging on Cloud
- Local development
- Cloud staging environment
- CI/CD pipeline

### **Quick Demo** → Heroku
- Zero DevOps
- Instant deployment
- Easy sharing

## 📞 Support & Next Steps

1. **Choose your deployment option** based on needs/budget
2. **Follow the specific guide** for your chosen platform
3. **Test thoroughly** in staging before production
4. **Set up monitoring** and alerts
5. **Plan backup and disaster recovery**

**Need help?** The deployment scripts include detailed logging and error handling to guide you through any issues.