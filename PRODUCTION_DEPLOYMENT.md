# OpsSight Platform - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the OpsSight DevOps Visibility Platform to production for small-scale deployments (100-1000 users).

## Prerequisites

- **Server Requirements**: 4-8GB RAM, 2-4 CPU cores, 50GB+ storage
- **Domain Name**: Registered domain with DNS access
- **SSL Certificate**: Automatic setup with Let's Encrypt included
- **Email Service**: SMTP server for notifications
- **Docker & Docker Compose**: Latest versions installed

## Quick Start (TL;DR)

```bash
# 1. Clone and configure
git clone <repository>
cd opssight-platform

# 2. Set up environment
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
# Edit environment files with your values

# 3. Set up SSL
./scripts/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com

# 4. Deploy
docker-compose -f docker-compose.production.yml up -d

# 5. Verify
curl https://yourdomain.com/api/v1/health
```

## Detailed Setup Instructions

### Step 1: Environment Configuration

#### Backend Environment Setup

1. Copy the production environment template:
```bash
cp backend/.env.production.example backend/.env.production
```

2. Edit `backend/.env.production` with your values:

```bash
# Database Configuration
DATABASE_URL=postgresql://opssight_prod:YOUR_SECURE_PASSWORD@postgres:5432/opssight_prod
DB_PASSWORD=YOUR_SECURE_PASSWORD

# Redis Configuration  
REDIS_PASSWORD=YOUR_SECURE_REDIS_PASSWORD

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET_KEY=YOUR_SECURE_JWT_SECRET_32_CHARS_MIN

# Domain URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
BACKEND_WS_URL=wss://yourdomain.com

# OAuth Providers (optional - configure as needed)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_USERNAME=your_smtp_user
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM=noreply@yourdomain.com

# Monitoring (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

#### Frontend Environment Setup

1. Copy the frontend environment template:
```bash
cp frontend/.env.production.example frontend/.env.production
```

2. Edit `frontend/.env.production`:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
NEXT_PUBLIC_BACKEND_URL=https://yourdomain.com

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=YOUR_SECURE_NEXTAUTH_SECRET

# OAuth Redirect URLs
NEXT_PUBLIC_GITHUB_REDIRECT_URI=https://yourdomain.com/auth/github/callback
```

### Step 2: SSL/HTTPS Setup

The platform includes an automated SSL setup script using Let's Encrypt:

```bash
# Production certificates
./scripts/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com

# For testing (staging certificates)
./scripts/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com --staging
```

This script will:
- Configure Nginx with SSL/TLS settings
- Obtain Let's Encrypt certificates
- Set up automatic certificate renewal

### Step 3: Database Initialization

Create the required directories and initialize the database:

```bash
# Create data directories
sudo mkdir -p /opt/opssight/{data,logs,backups}/{postgres,redis,prometheus,grafana}
sudo chown -R $USER:$USER /opt/opssight

# Initialize database (first run)
docker-compose -f docker-compose.production.yml up -d postgres redis
sleep 30
docker-compose -f docker-compose.production.yml exec backend python -m alembic upgrade head
```

### Step 4: Production Deployment

Deploy all services:

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### Step 5: Verification

Verify your deployment:

```bash
# Health checks
curl https://yourdomain.com/api/v1/health
curl https://yourdomain.com/health

# Check monitoring
curl https://yourdomain.com:9090  # Prometheus
curl https://yourdomain.com:3001  # Grafana
```

## Monitoring Setup

### Prometheus & Grafana

The deployment includes comprehensive monitoring:

- **Prometheus**: Metrics collection at `:9090`
- **Grafana**: Dashboards at `:3001` (admin/admin - change immediately)
- **Alertmanager**: Alert routing at `:9093`

### Default Dashboards

Import the provided Grafana dashboards:
1. Login to Grafana (http://yourdomain.com:3001)
2. Go to Dashboards > Import
3. Upload JSON files from `monitoring/grafana/dashboards/`

### Alert Configuration

Alerts are configured for:
- Application health (API, Frontend)
- Infrastructure (CPU, Memory, Disk)
- Database performance
- Security events
- SSL certificate expiry

## Backup Strategy

### Automated Backups

The platform includes automated database backups:

```bash
# Manual backup
./scripts/backup/backup.sh

# Test backup system
./scripts/backup/backup.sh test

# Restore from backup
./scripts/backup/restore.sh --file /opt/opssight/backups/backup_file.sql.gz.enc
```

### Backup Configuration

Configure automatic backups in your crontab:

```bash
# Edit crontab
crontab -e

# Add backup schedule (every 6 hours)
0 */6 * * * /path/to/opssight/scripts/backup/backup.sh

# Add SSL renewal (monthly)
0 2 1 * * /path/to/opssight/scripts/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com --force
```

## Maintenance

### Updates

To update the application:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Run database migrations
docker-compose -f docker-compose.production.yml exec backend python -m alembic upgrade head
```

### Log Management

View and manage logs:

```bash
# View all logs
docker-compose -f docker-compose.production.yml logs

# View specific service logs
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs frontend

# Follow logs
docker-compose -f docker-compose.production.yml logs -f

# Rotate logs (run weekly)
docker system prune -f
```

### Performance Tuning

For optimal performance:

1. **Database**: Tune PostgreSQL settings in `docker-compose.production.yml`
2. **Redis**: Adjust memory limits based on usage
3. **Nginx**: Configure caching and compression
4. **Application**: Monitor and adjust worker processes

## Security

### Security Checklist

- [ ] Change all default passwords
- [ ] Configure firewall rules
- [ ] Set up SSL certificates
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up monitoring alerts
- [ ] Regular security updates

### Firewall Configuration

```bash
# Ubuntu/Debian with ufw
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000       # Block direct frontend access
sudo ufw deny 8000       # Block direct backend access
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**:
   ```bash
   # Check certificate status
   ./scripts/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com --force
   ```

2. **Database Connection Issues**:
   ```bash
   # Check database logs
   docker-compose -f docker-compose.production.yml logs postgres
   
   # Test connection
   docker-compose -f docker-compose.production.yml exec postgres pg_isready
   ```

3. **High Memory Usage**:
   ```bash
   # Check container resource usage
   docker stats
   
   # Restart services if needed
   docker-compose -f docker-compose.production.yml restart
   ```

### Health Checks

Use the built-in health check endpoints:

- **Backend API**: `https://yourdomain.com/api/v1/health`
- **Frontend**: `https://yourdomain.com/health`
- **Database**: `https://yourdomain.com/api/v1/health/db`
- **Cache**: `https://yourdomain.com/api/v1/health/redis`

## Support

### Documentation

- **API Documentation**: `https://yourdomain.com/docs`
- **Monitoring**: `https://yourdomain.com:3001`
- **Runbooks**: `docs/runbooks/`

### Getting Help

1. Check the logs first
2. Review this deployment guide
3. Check the monitoring dashboards
4. Contact support with specific error messages

## Production Scaling

As your usage grows, consider:

1. **Horizontal Scaling**: Add more application instances
2. **Database Scaling**: Set up read replicas
3. **CDN**: Add content delivery network
4. **Load Balancing**: Implement proper load balancing
5. **Microservices**: Split monolith into services

## Cost Optimization

For small-scale deployments:

- **Single Server**: Start with one powerful server
- **Managed Services**: Use managed PostgreSQL/Redis
- **CDN**: Only add when needed
- **Monitoring**: Use built-in monitoring initially

---

**Congratulations!** Your OpsSight Platform is now running in production. Monitor the dashboards and set up alerts to ensure smooth operation.