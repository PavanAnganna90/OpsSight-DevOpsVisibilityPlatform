# OpsSight Production Secrets Management

This document outlines the secure secrets management strategy for the OpsSight DevOps Platform in production environments.

## Overview

The production environment uses **External Secrets Operator** with **AWS Secrets Manager** to securely manage sensitive configuration data. This approach ensures:

- **Security**: Secrets are stored in AWS Secrets Manager, not in Git or Kubernetes manifests
- **Rotation**: Automatic secret rotation capabilities
- **Audit**: Full audit trail of secret access and modifications
- **Compliance**: Meets enterprise security requirements

## Architecture

```
AWS Secrets Manager → External Secrets Operator → Kubernetes Secrets → Application Pods
```

## Prerequisites

### 1. AWS Secrets Manager Setup

Create the following secrets in AWS Secrets Manager in the `us-west-2` region:

#### Database Secrets (`opssight/production/database`)
```json
{
  "username": "opssight_prod_user",
  "password": "SECURE_DATABASE_PASSWORD",
  "host": "opssight-prod-db.cluster-xyz.us-west-2.rds.amazonaws.com",
  "database": "opssight_production"
}
```

#### Application Secrets (`opssight/production/app`)
```json
{
  "secret_key": "SECURE_64_CHAR_SECRET_KEY_FOR_SESSIONS",
  "jwt_secret": "SECURE_64_CHAR_JWT_SECRET_KEY", 
  "encryption_key": "SECURE_32_CHAR_ENCRYPTION_KEY",
  "mfa_secret_key": "SECURE_32_CHAR_MFA_SECRET_KEY"
}
```

#### Redis Secrets (`opssight/production/redis`)
```json
{
  "password": "SECURE_REDIS_PASSWORD",
  "host": "opssight-prod-redis.cluster-xyz.cache.amazonaws.com"
}
```

#### External Services (`opssight/production/external-services`)
```json
{
  "slack_webhook_url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
  "github_token": "ghp_XXXXXXXXXXXXXXXXXXXXXXXXX",
  "smtp_password": "SECURE_SMTP_PASSWORD",
  "smtp_username": "opssight@company.com",
  "oauth_client_secret": "SECURE_OAUTH_CLIENT_SECRET"
}
```

### 2. IAM Role Configuration

Create an IAM role with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-west-2:ACCOUNT_ID:secret:opssight/production/*"
      ]
    }
  ]
}
```

### 3. EKS Service Account Setup

Create the service account with IAM role annotation:

```bash
# Update the role ARN in external-secrets.yaml
sed -i 's/ACCOUNT_ID/123456789012/g' external-secrets.yaml

# Apply the external secrets configuration
kubectl apply -f external-secrets.yaml
```

## Deployment

### 1. Install External Secrets Operator

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io

# Install External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

### 2. Deploy OpsSight with External Secrets

```bash
# Apply the production configuration
kubectl apply -k k8s/overlays/production/

# Verify external secrets are created
kubectl get externalsecrets -n opssight-production

# Verify Kubernetes secrets are populated
kubectl get secrets -n opssight-production
```

## Secret Categories

### Database Secrets
- **Purpose**: Database connection credentials
- **Source**: `opssight/production/database` in AWS Secrets Manager
- **Target**: `opssight-database-secrets` Kubernetes Secret
- **Refresh**: Every 1 hour

### Application Secrets  
- **Purpose**: Application-level secrets (JWT, session keys, encryption)
- **Source**: `opssight/production/app` in AWS Secrets Manager
- **Target**: `opssight-app-secrets` Kubernetes Secret
- **Refresh**: Every 1 hour

### Redis Secrets
- **Purpose**: Redis connection credentials
- **Source**: `opssight/production/redis` in AWS Secrets Manager  
- **Target**: `opssight-redis-secrets` Kubernetes Secret
- **Refresh**: Every 1 hour

### External Service Secrets
- **Purpose**: Third-party service credentials (Slack, GitHub, SMTP)
- **Source**: `opssight/production/external-services` in AWS Secrets Manager
- **Target**: `opssight-external-services` Kubernetes Secret
- **Refresh**: Every 1 hour

## Security Best Practices

### 1. Secret Rotation
- **Database passwords**: Rotate every 90 days
- **API keys**: Rotate every 30 days
- **JWT secrets**: Rotate every 180 days
- **Encryption keys**: Rotate annually

### 2. Access Control
- Use IAM roles with least privilege principle
- Enable CloudTrail for audit logging
- Use resource-based policies in Secrets Manager

### 3. Monitoring
- Monitor secret access via CloudTrail
- Set up alerts for secret modifications
- Track External Secrets Operator health

## Troubleshooting

### External Secret Not Syncing

```bash
# Check External Secret status
kubectl describe externalsecret opssight-app-secrets -n opssight-production

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets

# Verify AWS credentials
kubectl get secret aws-secret -n opssight-production -o yaml
```

### Invalid AWS Credentials

```bash
# Test AWS access
aws secretsmanager get-secret-value \
  --secret-id opssight/production/app \
  --region us-west-2

# Check service account annotations
kubectl describe sa external-secrets-sa -n opssight-production
```

### Secret Not Available in Pod

```bash
# Check if Kubernetes secret exists
kubectl get secret opssight-app-secrets -n opssight-production

# Verify secret content (be careful - this exposes secrets)
kubectl get secret opssight-app-secrets -n opssight-production -o yaml

# Check pod secret mounts
kubectl describe pod <pod-name> -n opssight-production
```

## Disaster Recovery

### 1. Backup Strategy
- AWS Secrets Manager automatic backups
- Cross-region replication enabled
- Infrastructure as Code for secret structure

### 2. Recovery Procedures
```bash
# Recreate External Secrets configuration
kubectl apply -f external-secrets.yaml

# Force secret refresh
kubectl annotate externalsecret opssight-app-secrets \
  force-sync=$(date +%s) -n opssight-production
```

## Compliance

### SOC 2 Requirements
- ✅ Encryption in transit and at rest
- ✅ Access logging and monitoring  
- ✅ Principle of least privilege
- ✅ Regular access reviews

### GDPR Compliance
- ✅ Data encryption
- ✅ Access controls
- ✅ Audit trails
- ✅ Data retention policies

## Migration from Static Secrets

If migrating from static secrets in Git:

1. **Create secrets in AWS Secrets Manager** (see Prerequisites)
2. **Deploy External Secrets Operator** (see Deployment)
3. **Update application deployments** to reference new secret names
4. **Remove static secrets** from Git repository
5. **Verify application functionality**
6. **Monitor for any issues**

## Maintenance

### Weekly Tasks
- [ ] Review CloudTrail logs for secret access
- [ ] Verify External Secrets Operator health
- [ ] Check secret synchronization status

### Monthly Tasks  
- [ ] Review and rotate API keys
- [ ] Update IAM policies if needed
- [ ] Test disaster recovery procedures

### Quarterly Tasks
- [ ] Rotate database passwords
- [ ] Review access permissions
- [ ] Update documentation

## Support

For issues with secrets management:

1. **Check troubleshooting section** in this document
2. **Review External Secrets Operator logs**
3. **Verify AWS Secrets Manager access**
4. **Contact DevOps team** for assistance

## References

- [External Secrets Operator Documentation](https://external-secrets.io/)
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [EKS IAM Roles for Service Accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)