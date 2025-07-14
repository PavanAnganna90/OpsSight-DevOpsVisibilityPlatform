# CI/CD Pipeline Setup Guide

This document outlines the comprehensive CI/CD pipeline setup for OpsSight, implemented using GitHub Actions with modern best practices derived from current industry standards.

## 📋 Table of Contents

- [Overview](#overview)
- [Pipeline Architecture](#pipeline-architecture)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Docker Configuration](#docker-configuration)
- [Deployment Strategy](#deployment-strategy)
- [Environment Management](#environment-management)
- [Security Configuration](#security-configuration)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Troubleshooting](#troubleshooting)

## 🏗️ Overview

The OpsSight CI/CD pipeline is designed to provide:

- **Automated Testing**: Comprehensive test suites for both frontend and backend
- **Security Scanning**: Vulnerability and security analysis
- **Multi-stage Builds**: Optimized Docker images using modern best practices
- **Environment Promotion**: Automated deployments through staging to production
- **Rollback Capabilities**: Quick recovery mechanisms
- **Monitoring Integration**: Health checks and performance monitoring

## 🎯 Pipeline Architecture

```mermaid
graph TD
    A[Code Push/PR] --> B[CI Pipeline]
    B --> C[Backend Tests]
    B --> D[Frontend Tests]
    B --> E[Security Scan]
    C --> F[Docker Build]
    D --> F
    E --> F
    F --> G[Integration Tests]
    G --> H{Main Branch?}
    H -->|Yes| I[Deploy Staging]
    H -->|No| J[End]
    I --> K[Staging Tests]
    K --> L[Manual Approval]
    L --> M[Deploy Production]
    M --> N[Production Tests]
    N --> O[Monitoring]
```

## ⚡ GitHub Actions Workflows

### CI Pipeline (`.github/workflows/ci.yml`)

The CI pipeline runs on every push and pull request, consisting of:

#### 1. Backend Testing
- **Environment**: Ubuntu Latest with PostgreSQL 15 and Redis 7
- **Tools**: Ruff (linting), mypy (type checking), pytest (testing)
- **Coverage**: Codecov integration for coverage tracking
- **Database**: PostgreSQL for integration tests
- **Cache**: Redis for session and caching tests

#### 2. Frontend Testing
- **Environment**: Node.js 20 with PNPM 8
- **Tools**: ESLint (linting), TypeScript (type checking), Vitest (testing)
- **Build**: Production build verification
- **Artifacts**: Build artifacts uploaded for deployment

#### 3. Security Scanning
- **Trivy**: File system vulnerability scanning
- **Semgrep**: Static application security testing (SAST)
- **SARIF**: Results uploaded to GitHub Security tab

#### 4. Docker Build
- **Multi-platform**: AMD64 and ARM64 support
- **Registry**: GitHub Container Registry (GHCR)
- **Caching**: GitHub Actions cache for layer optimization
- **Tagging**: Branch-based and SHA-based tagging

#### 5. Integration Testing
- **Environment**: Docker Compose stack
- **Services**: Full application stack with dependencies
- **Health Checks**: Service readiness verification
- **API Testing**: Basic endpoint validation

### CD Pipeline (`.github/workflows/cd.yml`)

The CD pipeline handles deployment to staging and production:

#### 1. Staging Deployment
- **Trigger**: Successful CI on main branch
- **Environment**: Staging with environment protection
- **Verification**: Smoke tests and health checks
- **Notifications**: Deployment status updates

#### 2. Production Approval
- **Manual Gate**: Required approval for production deployment
- **Reviewers**: Configured in GitHub environment settings
- **Notifications**: Approval request notifications

#### 3. Production Deployment
- **Blue-Green**: Zero-downtime deployment strategy
- **Health Checks**: Comprehensive post-deployment verification
- **Rollback**: Automated rollback on failure
- **Monitoring**: Integration with monitoring systems

## 🐳 Docker Configuration

### Backend Dockerfile

Multi-stage build optimized for FastAPI applications:

```dockerfile
# Stage 1: Dependencies export using Poetry
FROM python:3.11-slim as requirements-stage
WORKDIR /tmp
RUN pip install poetry
COPY ./pyproject.toml ./poetry.lock* /tmp/
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

# Stage 2: Production image
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1
# ... rest of configuration
```

**Key Features:**
- Poetry-based dependency management
- Non-root user for security
- Multi-platform support (AMD64/ARM64)
- Health checks included
- Optimized layer caching

### Frontend Dockerfile

Multi-stage build for Next.js applications:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
# ... build configuration

# Stage 3: Production
FROM node:20-alpine AS production
# ... optimized runtime
```

**Key Features:**
- PNPM for efficient package management
- Standalone output for minimal runtime
- Non-root user security
- Signal handling with dumb-init

## 🚀 Deployment Strategy

### Environment Flow

1. **Development** → 2. **Staging** → 3. **Production**

### Staging Environment
- **Purpose**: Integration testing and stakeholder review
- **Data**: Synthetic test data
- **Scale**: Reduced resource allocation
- **Access**: Internal team and stakeholders

### Production Environment
- **Purpose**: Live user traffic
- **Data**: Real production data with backups
- **Scale**: Full resource allocation with auto-scaling
- **Access**: Public users and monitoring systems

### Deployment Methods

#### Docker Compose (Current)
- Suitable for single-server deployments
- Easy local development reproduction
- Manual scaling

#### Kubernetes (Future)
- Auto-scaling capabilities
- Rolling updates
- Service mesh integration
- Multi-region deployment

## 🔐 Environment Management

### Environment Variables

#### Backend Configuration
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port/db

# Security
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# External Services
AWS_ACCESS_KEY_ID=key
AWS_SECRET_ACCESS_KEY=secret
SENTRY_DSN=https://sentry.io/...

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO
DEBUG=false
```

#### Frontend Configuration
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.opssight.com
NEXT_PUBLIC_APP_NAME=OpsSight
NEXT_PUBLIC_APP_VERSION=1.0.0

# Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=GA-123456789
NEXT_PUBLIC_SENTRY_DSN=https://sentry.io/...

# Feature Flags
NEXT_PUBLIC_FEATURE_DASHBOARD_V2=true
NEXT_PUBLIC_FEATURE_REAL_TIME_UPDATES=true
```

### Secrets Management

#### GitHub Secrets (Current)
- Repository-level secrets for CI/CD
- Environment-specific secrets
- Service account keys

#### External Secret Management (Future)
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

## 🔒 Security Configuration

### Container Security
- **Non-root users**: All containers run as non-privileged users
- **Image scanning**: Trivy vulnerability scanning
- **Base images**: Official, minimal base images
- **Layer optimization**: Minimal attack surface

### Application Security
- **SAST**: Semgrep static analysis
- **Dependency scanning**: Automated dependency vulnerability checks
- **Security headers**: HTTPS enforcement, CSP, HSTS
- **Authentication**: JWT-based with secure defaults

### Infrastructure Security
- **Network isolation**: Service-to-service communication controls
- **Encryption**: Data in transit and at rest
- **Access controls**: Role-based access with least privilege
- **Audit logging**: Comprehensive security event logging

## 📊 Monitoring and Alerting

### Health Checks
- **Application**: `/health` endpoints with dependency checks
- **Infrastructure**: Container and host health monitoring
- **Database**: Connection pool and query performance
- **External services**: Third-party service availability

### Metrics Collection
- **Application metrics**: Custom business metrics
- **Infrastructure metrics**: CPU, memory, disk, network
- **User experience**: Page load times, error rates
- **Security metrics**: Failed authentication attempts, rate limiting

### Alerting Rules
- **Critical**: Service downtime, database failures
- **Warning**: High error rates, performance degradation
- **Info**: Deployment notifications, scaling events

## 🔧 Troubleshooting

### Common Issues

#### CI Pipeline Failures

**Backend Test Failures:**
```bash
# Check test output
pytest tests/ -v --tb=long

# Database connection issues
docker-compose up postgres redis
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test
```

**Frontend Build Failures:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm build
```

**Docker Build Failures:**
```bash
# Build with verbose output
docker build --progress=plain --no-cache .

# Check multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 .
```

#### Deployment Issues

**Service Health Check Failures:**
```bash
# Check service logs
docker-compose logs backend frontend

# Manual health check
curl -f http://localhost:8000/health
```

**Database Migration Issues:**
```bash
# Run migrations manually
alembic upgrade head

# Check migration status
alembic current
alembic history
```

### Debugging Commands

```bash
# Check CI pipeline status
gh workflow run ci.yml --ref main

# View deployment logs
./scripts/deploy.sh staging --dry-run

# Monitor service health
docker-compose exec backend curl http://localhost:80/health
```

### Support Contacts

- **DevOps Team**: devops@opssight.com
- **Security Team**: security@opssight.com
- **On-call Engineer**: +1-555-ON-CALL

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Security Best Practices](./security-best-practices.md)

---

*Last updated: $(date)*
*Version: 1.0.0* 