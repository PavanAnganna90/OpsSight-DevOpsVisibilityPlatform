# Secrets Management System

## Overview

The OpsSight platform implements enterprise-grade secrets management using AWS Secrets Manager integrated with Kubernetes through the Secrets Store CSI Driver. This approach provides secure, auditable, and rotatable secret management for all platform components.

## Architecture

### Components

1. **AWS Secrets Manager**: Central secret storage with encryption, rotation, and audit capabilities
2. **Secrets Store CSI Driver**: Kubernetes CSI driver for mounting secrets as volumes
3. **AWS Secrets Manager CSI Provider**: AWS-specific provider for the CSI driver
4. **IRSA (IAM Roles for Service Accounts)**: Secure AWS authentication from Kubernetes
5. **SecretProviderClass**: Kubernetes CRD defining secret mappings

### Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Kubernetes    │    │  AWS Secrets    │
│      Pod        │    │  CSI Driver     │    │    Manager      │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │  Volume   │  │◄───┤  │ CSI Node  │  │◄───┤  │  Secret   │  │
│  │  Mount    │  │    │  │  Driver   │  │    │  │   Store   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │ Env Vars  │  │◄───┤  │Secret     │  │    │  │ Encryption│  │
│  │from Secret│  │    │  │Object     │  │    │  │    KMS    │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ Service Account │    │SecretProvider   │    │   IAM Role      │
    │   with IRSA     │    │     Class       │    │  with Policies  │
    │   Annotations   │    │                 │    │                 │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Secret Categories

### 1. Application Secrets
- JWT secret keys
- Session secrets
- GitHub OAuth credentials
- Database connection strings
- Third-party API keys

### 2. Database Secrets
- PostgreSQL connection details
- Database credentials
- Connection pool configurations

### 3. Monitoring Secrets
- Grafana admin credentials
- Prometheus authentication
- AlertManager webhook URLs
- PagerDuty integration keys

### 4. CI/CD Secrets
- Docker Hub credentials
- Container signing keys
- Build environment secrets

## Deployment

### Prerequisites

1. EKS cluster with OIDC provider enabled
2. AWS Secrets Manager access
3. Terraform for infrastructure provisioning
4. kubectl and helm configured

### Quick Start

```bash
# Full deployment for staging environment
./scripts/deploy-secrets-management.sh \
  --environment staging \
  --install-csi \
  --create-secrets \
  --deploy-providers \
  --setup-rbac

# Validate the deployment
./scripts/deploy-secrets-management.sh \
  --environment staging \
  --validate
```

### Step-by-Step Deployment

#### 1. Install Secrets Store CSI Driver

```bash
./scripts/deploy-secrets-management.sh --install-csi
```

This installs:
- CSI Driver DaemonSet
- AWS Secrets Manager Provider
- Required RBAC resources
- CSIDriver custom resource

#### 2. Create AWS Secrets Manager Secrets

```bash
# Set required environment variables
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"
export GITHUB_WEBHOOK_SECRET="your-webhook-secret"

./scripts/deploy-secrets-management.sh --create-secrets
```

#### 3. Deploy SecretProviderClass Resources

```bash
./scripts/deploy-secrets-management.sh --deploy-providers
```

#### 4. Setup RBAC and Service Accounts

```bash
./scripts/deploy-secrets-management.sh --setup-rbac
```

## Configuration

### AWS Secrets Manager Secret Structure

#### Application Secrets
```json
{
  "JWT_SECRET_KEY": "base64-encoded-jwt-secret",
  "SESSION_SECRET": "session-encryption-key",
  "GITHUB_CLIENT_ID": "github-oauth-client-id",
  "GITHUB_CLIENT_SECRET": "github-oauth-client-secret",
  "GITHUB_WEBHOOK_SECRET": "webhook-verification-secret",
  "DATABASE_URL": "postgresql://user:pass@host:port/db",
  "SLACK_BOT_TOKEN": "xoxb-slack-bot-token",
  "SLACK_WEBHOOK_URL": "https://hooks.slack.com/webhook-url"
}
```

#### Database Secrets
```json
{
  "username": "postgres_user",
  "password": "secure-database-password",
  "host": "database-host.amazonaws.com",
  "port": "5432",
  "dbname": "opsight",
  "engine": "postgres"
}
```

### Helm Chart Integration

```yaml
# values.yaml
secretsManagement:
  enabled: true
  provider: aws
  serviceAccountName: secrets-manager-sa
  region: us-west-2
  secretProviderClasses:
    application: opsight-application-secrets
    database: opsight-database-secrets
    monitoring: opsight-monitoring-secrets
```

### Application Integration

#### Environment Variables from Secrets

```yaml
env:
- name: JWT_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: opsight-application-secrets
      key: JWT_SECRET_KEY
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: opsight-application-secrets
      key: DATABASE_URL
```

#### Volume Mounts for File-Based Secrets

```yaml
volumeMounts:
- name: secrets-store
  mountPath: "/mnt/secrets-store"
  readOnly: true

volumes:
- name: secrets-store
  csi:
    driver: secrets-store.csi.k8s.io
    readOnly: true
    volumeAttributes:
      secretProviderClass: "opsight-application-secrets"
```

## Security Features

### 1. Encryption
- **At Rest**: All secrets encrypted with AWS KMS
- **In Transit**: TLS encryption for all API communications
- **In Memory**: Secrets only exist in pod memory when needed

### 2. Access Control
- **RBAC**: Kubernetes role-based access control
- **IRSA**: IAM roles mapped to service accounts
- **Least Privilege**: Minimal permissions per component

### 3. Audit & Compliance
- **CloudTrail**: All secret access logged
- **Kubernetes Events**: CSI driver operations audited
- **Secret Rotation**: Automatic rotation capabilities

### 4. Network Security
- **Network Policies**: Restrict pod-to-pod communication
- **Private Endpoints**: VPC endpoints for AWS services
- **TLS Verification**: Certificate validation enforced

## Operations

### Secret Rotation

#### Automatic Rotation
```yaml
# In SecretProviderClass
spec:
  parameters:
    rotation:
      enabled: "true"
      pollInterval: "2m"
```

#### Manual Rotation
```bash
# Rotate application secrets
aws secretsmanager update-secret \
  --secret-id opsight-staging-application-secrets \
  --secret-string file://new-secrets.json

# Force pod restart to pick up new secrets
kubectl rollout restart deployment/opsight-backend
```

### Monitoring

#### Key Metrics
- Secret retrieval success/failure rates
- CSI driver pod health
- Secret rotation completion
- Authentication failures

#### Alerting Rules
```yaml
# Prometheus alerting rules
groups:
- name: secrets-management
  rules:
  - alert: SecretRetrievalFailed
    expr: increase(secrets_store_csi_driver_errors_total[5m]) > 0
    for: 2m
    annotations:
      summary: "Secret retrieval failed"
      
  - alert: CSIDriverDown
    expr: up{job="secrets-store-csi-driver"} == 0
    for: 1m
    annotations:
      summary: "Secrets Store CSI Driver is down"
```

### Troubleshooting

#### Common Issues

1. **Secret Not Found**
   ```bash
   # Check AWS Secrets Manager
   aws secretsmanager describe-secret --secret-id secret-name
   
   # Check SecretProviderClass
   kubectl describe secretproviderclass secret-provider-class-name
   ```

2. **Permission Denied**
   ```bash
   # Check service account annotations
   kubectl describe sa secrets-manager-sa
   
   # Check IAM role trust policy
   aws iam get-role --role-name secrets-manager-role
   ```

3. **CSI Driver Issues**
   ```bash
   # Check CSI driver logs
   kubectl logs -n secrets-store-csi-driver -l app.kubernetes.io/name=secrets-store-csi-driver
   
   # Check AWS provider logs
   kubectl logs -n secrets-store-csi-driver -l app.kubernetes.io/name=secrets-store-provider-aws
   ```

#### Debug Commands

```bash
# Verify CSI driver installation
kubectl get pods -n secrets-store-csi-driver

# Check SecretProviderClass status
kubectl get secretproviderclass -A

# Verify service account IRSA configuration
kubectl describe sa secrets-manager-sa -n opsight-staging

# Test AWS credentials from pod
kubectl run debug --image=amazon/aws-cli --rm -it --restart=Never \
  --serviceaccount=secrets-manager-sa \
  -- aws sts get-caller-identity

# Check secret object creation
kubectl get secrets -n opsight-staging | grep opsight
```

## Best Practices

### 1. Secret Management
- Use different secrets per environment
- Implement regular rotation schedules
- Minimize secret exposure time
- Use specific IAM policies per secret category

### 2. Application Design
- Gracefully handle secret rotation
- Cache secrets appropriately
- Validate secret format and content
- Implement circuit breakers for secret retrieval

### 3. Monitoring & Alerting
- Monitor secret access patterns
- Alert on rotation failures
- Track authentication metrics
- Set up compliance dashboards

### 4. Disaster Recovery
- Cross-region secret replication
- Backup and restore procedures
- Emergency access procedures
- Recovery time objectives defined

## Development Workflow

### Local Development
```bash
# Use local environment files for development
cp .env.example .env
# Edit .env with development values

# For production-like testing, use development secrets
export ENVIRONMENT=development
./scripts/deploy-secrets-management.sh --create-secrets
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Deploy Secrets
  run: |
    ./scripts/deploy-secrets-management.sh \
      --environment ${{ env.ENVIRONMENT }} \
      --deploy-providers \
      --setup-rbac
  env:
    GITHUB_CLIENT_ID: ${{ secrets.GITHUB_CLIENT_ID }}
    GITHUB_CLIENT_SECRET: ${{ secrets.GITHUB_CLIENT_SECRET }}
```

## Support

### Documentation
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/)
- [IRSA Documentation](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)

### Team Contacts
- **Platform Team**: For infrastructure and CSI driver issues
- **Security Team**: For IAM policies and secret rotation
- **DevOps Team**: For deployment and operational issues

For additional support, please refer to the project's issue tracker or internal documentation. 