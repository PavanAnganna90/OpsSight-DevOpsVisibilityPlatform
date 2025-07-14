# OpsSight Deployment Guide

This guide covers the complete CI/CD pipeline and deployment process for the OpsSight DevOps visibility platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Deployment Process](#deployment-process)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## Overview

OpsSight uses a comprehensive CI/CD pipeline built on GitHub Actions with the following key features:

- **Automated Testing**: Unit, integration, E2E, and security tests
- **Multi-Environment Support**: Development, staging, and production environments
- **Containerized Deployment**: Docker-based deployments with health checks
- **Security Scanning**: Vulnerability scanning and compliance checks
- **Performance Monitoring**: Lighthouse CI and performance testing
- **Automated Rollbacks**: Automatic rollback on deployment failures

## Prerequisites

### Required Tools

- **Docker**: Container runtime for building and running applications
- **Docker Compose**: Multi-container application orchestration
- **Node.js 20+**: JavaScript runtime for building the application
- **Git**: Version control system

### Required Secrets

Configure the following secrets in your GitHub repository:

#### GitHub Secrets

```bash
# Container Registry
GITHUB_TOKEN          # Automatically provided by GitHub

# Security Scanning
SNYK_TOKEN            # Snyk security scanning
SECURITY_SLACK_WEBHOOK # Security alerts Slack webhook

# Notifications
SLACK_WEBHOOK         # General deployment notifications
SLACK_WEBHOOK_URL     # Slack webhook for notifications

# Monitoring (Optional)
CODECOV_TOKEN         # Code coverage reporting
```

#### Environment Variables

```bash
# Application Configuration
NODE_ENV                    # Environment (development, staging, production)
NEXT_PUBLIC_APP_NAME        # Application name
NEXT_PUBLIC_APP_VERSION     # Application version
NEXT_PUBLIC_APP_ENV         # Environment identifier

# Security Configuration
JWT_SECRET                  # JWT signing secret (32+ characters)
SESSION_SECRET             # Session encryption secret (32+ characters)
ALLOWED_ORIGINS            # CORS allowed origins

# Database Configuration
DATABASE_URL               # PostgreSQL connection string
REDIS_URL                  # Redis connection string

# External Services
GRAFANA_API_URL           # Grafana API endpoint
PROMETHEUS_URL            # Prometheus metrics endpoint
SENTRY_DSN               # Error tracking DSN
```

## Environment Configuration

### Development Environment

```bash
# Local development setup
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/opssight_dev
REDIS_URL=redis://localhost:6379
COOKIE_SECURE=false
```

### Staging Environment

```bash
# Staging environment setup
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.opssight.com
DATABASE_URL=postgresql://staging_user:staging_pass@staging-host:5432/opssight_staging
REDIS_URL=redis://staging-redis:6379
COOKIE_SECURE=true
```

### Production Environment

```bash
# Production environment setup
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://opssight.com
DATABASE_URL=postgresql://prod_user:prod_pass@prod-host:5432/opssight_production
REDIS_URL=redis://prod-redis:6379
COOKIE_SECURE=true
RATE_LIMIT_MAX_REQUESTS=1000
```

## CI/CD Pipeline

### Pipeline Overview

The CI/CD pipeline consists of multiple workflows:

1. **Main CI/CD Pipeline** (`.github/workflows/ci.yml`)
2. **Security Scanning** (`.github/workflows/security-scan.yml`)

### Main CI/CD Workflow

#### Trigger Events

- **Push**: To `main` and `develop` branches
- **Pull Request**: To `main` and `develop` branches
- **Release**: When a release is published

#### Pipeline Stages

1. **Code Quality & Security Analysis**
   - ESLint with SARIF output
   - TypeScript type checking
   - Prettier format check
   - npm audit security check
   - Dependency vulnerability scan

2. **Test Suite**
   - Unit tests with coverage
   - Integration tests
   - Security tests
   - Coverage reporting to Codecov

3. **End-to-End Tests**
   - Playwright E2E tests
   - Cross-browser testing
   - Accessibility testing
   - Performance testing

4. **Build & Security Scan**
   - Docker image build and push
   - Container vulnerability scanning (Trivy)
   - Multi-platform builds
   - Build artifact caching

5. **Deployment**
   - **Staging**: Automatic deployment from `develop` branch
   - **Production**: Deployment from releases
   - Health checks and smoke tests
   - Slack notifications

6. **Post-Deployment**
   - Lighthouse performance audits
   - OWASP ZAP security scanning
   - Performance monitoring

7. **Cleanup**
   - Old container image cleanup
   - Resource optimization

### Security Scanning Workflow

#### Daily Security Scans

- **Dependency Vulnerability Scan**: npm audit and Snyk
- **Container Security Scan**: Trivy and Docker Scout
- **Code Security Analysis**: CodeQL and Semgrep
- **Secret Scanning**: TruffleHog and GitLeaks
- **Compliance Check**: OWASP Dependency Check

#### Security Notifications

- Slack alerts for security failures
- GitHub Issues for tracking vulnerabilities
- Weekly security reports

## Deployment Process

### Local Development

```bash
# Start development environment
npm run dev

# Or with Docker
npm run docker:up:dev
```

### Staging Deployment

Staging deployments are **automatic** when code is pushed to the `develop` branch:

1. Code is pushed to `develop` branch
2. CI/CD pipeline runs all tests and quality checks
3. Docker image is built and pushed to registry
4. Automatic deployment to staging environment
5. Health checks and smoke tests
6. Slack notification of deployment status

### Production Deployment

Production deployments are triggered by **creating a release**:

1. Create a new release on GitHub
2. CI/CD pipeline builds and tests the release
3. Docker image is tagged with release version
4. Manual approval required for production deployment
5. Blue-green deployment with health checks
6. Automatic rollback on failure
7. Post-deployment monitoring and alerts

### Manual Deployment

Use the deployment script for manual deployments:

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Custom deployment
./.github/scripts/deploy.sh --environment production --tag v1.0.0
```

### Deployment Script Features

- **Health Checks**: Comprehensive application health monitoring
- **Rollback**: Automatic rollback on deployment failure
- **Backup**: Creates backup before deployment
- **Notifications**: Slack notifications for deployment status
- **Smoke Tests**: Validates critical application endpoints

## Monitoring & Maintenance

### Health Monitoring

The application provides comprehensive health endpoints:

- **`/api/health`**: Detailed health status with dependency checks
- **Health Check Levels**: healthy, degraded, unhealthy
- **Metrics**: Memory usage, response time, uptime, dependency status

### Performance Monitoring

- **Lighthouse CI**: Automated performance audits
- **Core Web Vitals**: Performance metrics tracking
- **Bundle Analysis**: JavaScript bundle size monitoring

### Security Monitoring

- **Daily Scans**: Automated vulnerability scanning
- **Real-time Alerts**: Security event notifications
- **Compliance Tracking**: OWASP Top 10 compliance monitoring

### Log Management

- **Structured Logging**: JSON-formatted application logs
- **Log Aggregation**: Centralized log collection with Loki
- **Error Tracking**: Sentry integration for error monitoring

## Troubleshooting

### Common Issues

#### Deployment Failures

1. **Health Check Failures**
   ```bash
   # Check application logs
   npm run docker:logs
   
   # Test health endpoint
   curl -f http://localhost:3000/api/health
   ```

2. **Container Build Failures**
   ```bash
   # Build container locally
   npm run docker:build
   
   # Check for dependency issues
   npm audit
   ```

3. **Environment Configuration Issues**
   ```bash
   # Validate environment variables
   npm run ci:validate
   
   # Check environment file
   cat .env.production
   ```

#### Performance Issues

1. **Slow Application Startup**
   - Check memory limits in Docker configuration
   - Verify database connectivity
   - Review application logs for errors

2. **High Memory Usage**
   - Monitor container resource usage
   - Check for memory leaks in application code
   - Adjust container memory limits

#### Security Issues

1. **Vulnerability Alerts**
   - Review security scan results in GitHub Security tab
   - Update dependencies with known vulnerabilities
   - Apply security patches promptly

2. **Authentication Failures**
   - Verify JWT secret configuration
   - Check session configuration
   - Review authentication middleware logs

### Debugging Commands

```bash
# Check application status
npm run health-check

# Run comprehensive tests
npm run ci:test

# Check security status
npm run test:security

# Validate configuration
npm run ci:validate

# Check Docker container status
docker ps
docker logs opssight-frontend

# Monitor resource usage
docker stats

# Check application logs
npm run docker:logs
```

### Emergency Procedures

#### Rollback Deployment

```bash
# Automatic rollback (if deployment script was used)
# Rollback is automatic on failure

# Manual rollback
docker-compose down
docker-compose up -d # Will use previous image

# Rollback to specific version
TAG=v1.0.0 npm run deploy:production
```

#### Incident Response

1. **Identify the Issue**
   - Check health endpoints
   - Review application logs
   - Monitor performance metrics

2. **Immediate Actions**
   - Scale down if resource issues
   - Rollback if deployment-related
   - Enable maintenance mode if needed

3. **Resolution**
   - Apply fixes to codebase
   - Test in staging environment
   - Deploy fix to production

4. **Post-Incident**
   - Document lessons learned
   - Update monitoring and alerting
   - Review and improve processes

## Best Practices

### Development Workflow

1. **Feature Branches**: Use feature branches for development
2. **Pull Requests**: All changes go through pull request review
3. **Testing**: Write tests for all new features
4. **Security**: Regular security scanning and updates

### Deployment Best Practices

1. **Staging First**: Always deploy to staging before production
2. **Health Checks**: Implement comprehensive health checks
3. **Monitoring**: Monitor all deployments closely
4. **Rollback Plan**: Always have a rollback plan ready

### Security Best Practices

1. **Secrets Management**: Use proper secret management
2. **Regular Updates**: Keep dependencies updated
3. **Security Scanning**: Regular vulnerability scanning
4. **Access Control**: Implement proper access controls

## Support

For deployment support and troubleshooting:

1. Check the application logs and health endpoints
2. Review the CI/CD pipeline logs in GitHub Actions
3. Consult this documentation for common issues
4. Contact the development team for complex issues

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Security Best Practices](docs/security-guide.md) 