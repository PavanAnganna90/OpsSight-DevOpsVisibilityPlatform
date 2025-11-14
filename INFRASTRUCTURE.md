# OpsSight Platform - Infrastructure Guide

## 🏗️ Infrastructure Overview

OpsSight is a production-ready DevOps visibility platform with comprehensive infrastructure automation, monitoring, and deployment capabilities.

## 🚀 Quick Start

### 1. Development Environment Setup
```bash
# Automated setup (recommended)
./scripts/setup-dev-environment.sh

# Manual setup
docker-compose up -d
```

### 2. Validate Infrastructure
```bash
# Run comprehensive validation
./scripts/validate-infrastructure.sh

# Quick validation
./scripts/validate-infrastructure.sh --quick
```

## 🐳 Docker Configuration

### Services Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   API Module    │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Node.js)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 3001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         ▼                         │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Monitoring    │
│   Port: 5432    │    │   Port: 6379    │    │   Stack         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Available Configurations

| Configuration | Purpose | Command |
|---------------|---------|---------|
| `docker-compose.yml` | Production deployment | `docker-compose up -d` |
| `docker-compose.dev.yml` | Development with hot reload | `docker-compose -f docker-compose.dev.yml up -d` |
| `docker-compose.prod.yml` | Production with optimizations | `docker-compose -f docker-compose.prod.yml up -d` |
| `docker-compose.test.yml` | Testing environment | `docker-compose -f docker-compose.test.yml up -d` |

## 📊 Monitoring Stack

### Prometheus Configuration
- **Endpoint**: http://localhost:9090
- **Configuration**: `monitoring/prometheus/prometheus.yml`
- **Alerts**: `monitoring/prometheus/alert_rules.yml`
- **Retention**: 15 days

### Grafana Dashboards
- **Endpoint**: http://localhost:3001 (admin/admin)
- **Dashboards**:
  - Application Performance: `monitoring/grafana/provisioning/dashboards/enhanced-application.json`
  - Infrastructure Metrics: `monitoring/grafana/provisioning/dashboards/backend.json`
  - Business Metrics: `monitoring/grafana/provisioning/dashboards/overview.json`

### AlertManager
- **Endpoint**: http://localhost:9093
- **Configuration**: `monitoring/alertmanager/enhanced-config.yml`
- **Notification Channels**:
  - Email alerts for critical issues
  - Slack integration for team notifications
  - PagerDuty for on-call escalation

## 🔧 Service Endpoints

### Core Services
| Service | URL | Health Check | Purpose |
|---------|-----|--------------|---------|
| Frontend | http://localhost:3000 | `/` | User interface |
| Backend API | http://localhost:8000 | `/api/v1/health` | Core API services |
| API Module | http://localhost:3001 | `/health` | Additional API features |
| API Documentation | http://localhost:8000/docs | `/docs` | Interactive API docs |

### Infrastructure Services
| Service | URL | Credentials | Purpose |
|---------|-----|-------------|---------|
| Prometheus | http://localhost:9090 | None | Metrics collection |
| Grafana | http://localhost:3001 | admin/admin | Dashboards |
| AlertManager | http://localhost:9093 | None | Alert routing |
| PostgreSQL | localhost:5432 | postgres/postgres | Primary database |
| Redis | localhost:6379 | None | Caching layer |

## 🔒 Security Configuration

### Environment Variables
```bash
# Backend Security
JWT_SECRET_KEY=<strong-secret-key>
SECRET_KEY=<app-secret-key>
CSRF_SECRET=<csrf-secret>

# Database Security
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port/db

# External APIs
GITHUB_CLIENT_ID=<github-oauth-id>
GITHUB_CLIENT_SECRET=<github-oauth-secret>
```

### SSL/TLS Configuration
- Development: Self-signed certificates in `ssl/`
- Production: Use Let's Encrypt or corporate certificates
- Configuration: `nginx/nginx.conf`

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows
- **Enhanced CI/CD**: `.github/workflows/enhanced-ci-cd.yml`
- **Security Scanning**: `.github/workflows/security-scan.yml`
- **Performance Testing**: `.github/workflows/test.yml`

### Deployment Stages
1. **Code Quality & Linting**
   - Python: black, isort, flake8, mypy
   - TypeScript: eslint, prettier
   - Security: bandit, safety

2. **Testing**
   - Backend: pytest with coverage
   - Frontend: Jest with React Testing Library
   - API Module: Jest with Supertest
   - Integration: Full stack testing

3. **Security Scanning**
   - Trivy vulnerability scanning
   - CodeQL analysis
   - Dependency review

4. **Build & Push**
   - Multi-platform Docker images
   - Container vulnerability scanning
   - Registry push to GHCR

5. **Deployment**
   - Staging deployment
   - Production deployment with blue-green strategy
   - Smoke tests and validation

## 📈 Performance Characteristics

### Response Time Targets
- API endpoints: < 200ms (95th percentile)
- Health checks: < 50ms
- Database queries: < 100ms
- Cache operations: < 10ms

### Throughput Capabilities
- Concurrent users: 1,000+
- API requests/second: 500+
- Database connections: 100
- Cache hit ratio: > 95%

### Resource Requirements

#### Development Environment
- CPU: 2+ cores
- Memory: 4GB+ RAM
- Storage: 10GB+ available
- Network: Broadband internet

#### Production Environment
- CPU: 4+ cores per service
- Memory: 8GB+ RAM per service
- Storage: 100GB+ SSD
- Network: Low latency, high bandwidth

## 🔄 Data Persistence

### Database Schema
- Primary: PostgreSQL with ACID compliance
- Migrations: Alembic for schema versioning
- Backups: Daily automated backups
- Replication: Master-slave configuration (production)

### Cache Strategy
- Redis for session storage
- Application-level caching
- CDN for static assets
- Cache invalidation strategies

### Volume Management
```bash
# Persistent volumes
- postgres_data      # Database files
- redis_data         # Cache persistence
- prometheus_data    # Metrics storage
- grafana_data       # Dashboard configs
- alertmanager_data  # Alert state
```

## 🛠️ Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker daemon
docker info

# Check ports
netstat -tulpn | grep :3000

# Check logs
docker-compose logs [service-name]
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Monitor database
docker-compose exec db psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Monitor cache
docker-compose exec redis redis-cli info memory
```

#### Network Connectivity
```bash
# Test internal networking
docker-compose exec backend ping frontend

# Test external connectivity
docker-compose exec backend curl -I https://api.github.com
```

### Health Check Endpoints
```bash
# Comprehensive health check
curl http://localhost:8000/api/v1/health

# Service readiness
curl http://localhost:8000/api/v1/health/readiness

# Liveness probe
curl http://localhost:8000/api/v1/health/liveness

# Startup probe
curl http://localhost:8000/api/v1/health/startup
```

## 📚 Additional Resources

### Scripts
- `scripts/setup-dev-environment.sh` - Automated development setup
- `scripts/validate-infrastructure.sh` - Infrastructure validation
- `scripts/deploy-production.sh` - Production deployment
- `scripts/backup-restore.sh` - Data backup and recovery

### Documentation
- `docs/deployment-guide.md` - Detailed deployment instructions
- `docs/monitoring-setup.md` - Monitoring configuration
- `docs/security-guide.md` - Security best practices
- `docs/troubleshooting.md` - Common issues and solutions

### Configuration Files
- `docker-compose.*.yml` - Service orchestration
- `monitoring/` - Prometheus, Grafana, AlertManager configs
- `k8s/` - Kubernetes manifests
- `infrastructure/` - Terraform configurations

## 🤝 Contributing

### Infrastructure Changes
1. Update relevant configuration files
2. Test changes in development environment
3. Run validation scripts
4. Update documentation
5. Submit PR with detailed description

### Monitoring Updates
1. Update Prometheus scrape configs
2. Add/modify alert rules
3. Update Grafana dashboards
4. Test alerting workflows
5. Document changes

## 📞 Support

### Infrastructure Team
- Email: infrastructure@opssight.dev
- Slack: #infrastructure
- On-call: PagerDuty integration

### Emergency Procedures
1. Check status page: https://status.opssight.dev
2. Review Grafana dashboards
3. Check AlertManager for active alerts
4. Follow runbook procedures
5. Escalate to on-call if needed

---

**OpsSight Infrastructure Team** | *Building reliable, scalable DevOps platforms*