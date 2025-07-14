# OpsSight Helm Chart

A comprehensive DevOps visibility platform that provides real-time insights into CI/CD pipelines, infrastructure health, and development workflows.

## Prerequisites

- Kubernetes 1.20+
- Helm 3.8+
- AWS Load Balancer Controller (for ingress)
- PostgreSQL (included as dependency or external)

## Installation

### Add Helm Repository Dependencies

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### Install Chart

```bash
# Install with default values (staging environment)
helm install opsight ./helm/opsight -n opsight --create-namespace

# Install for production
helm install opsight ./helm/opsight -n opsight-production --create-namespace -f helm/opsight/values-production.yaml

# Install for staging
helm install opsight ./helm/opsight -n opsight --create-namespace -f helm/opsight/values-staging.yaml
```

## Configuration

### Key Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `app.environment` | Environment name | `staging` |
| `frontend.enabled` | Enable frontend deployment | `true` |
| `frontend.replicaCount` | Number of frontend replicas | `2` |
| `frontend.image.repository` | Frontend image repository | `opsight/frontend` |
| `frontend.image.tag` | Frontend image tag | `latest` |
| `backend.enabled` | Enable backend deployment | `true` |
| `backend.replicaCount` | Number of backend replicas | `3` |
| `backend.image.repository` | Backend image repository | `opsight/backend` |
| `backend.image.tag` | Backend image tag | `latest` |
| `postgresql.enabled` | Enable PostgreSQL dependency | `true` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `alb` |
| `monitoring.enabled` | Enable monitoring stack | `true` |

### Environment-Specific Values

#### Staging Environment
- Reduced resource allocation for cost optimization
- Single replica deployments
- Smaller persistent volumes
- Shorter metrics retention

#### Production Environment
- High availability with multiple replicas
- Pod anti-affinity rules
- Larger resource allocations
- Extended metrics retention
- Production-grade security settings

### Database Configuration

#### Using Included PostgreSQL (Default)
```yaml
postgresql:
  enabled: true
  auth:
    username: postgres
    database: opsight
    existingSecret: opsight-db-secret
```

#### Using External Database
```yaml
postgresql:
  enabled: false

externalDatabase:
  host: your-db-host.com
  port: 5432
  username: postgres
  database: opsight
  password: your-password
```

### Ingress Configuration

#### AWS Load Balancer Controller
```yaml
ingress:
  enabled: true
  className: alb
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:region:account:certificate/cert-id
  hosts:
    - host: opsight.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
        - path: /api
          pathType: Prefix
          service: backend
```

### Monitoring Configuration

#### Prometheus
```yaml
monitoring:
  prometheus:
    enabled: true
    server:
      retention: "15d"
      resources:
        limits:
          cpu: 1000m
          memory: 2Gi
```

#### Grafana
```yaml
monitoring:
  grafana:
    enabled: true
    adminPassword: your-secure-password
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
```

## Security

### Pod Security Context
```yaml
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
```

### RBAC
The chart creates appropriate RBAC resources including:
- ServiceAccount for application pods
- ClusterRole with minimal required permissions
- ClusterRoleBinding to associate the role with the service account

### Network Policies
Consider implementing network policies to restrict pod-to-pod communication:
```yaml
# Example network policy (not included in chart)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: opsight-network-policy
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: opsight
  policyTypes:
  - Ingress
  - Egress
```

## Scaling

### Horizontal Pod Autoscaling
```yaml
frontend:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

backend:
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 15
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
```

### Vertical Pod Autoscaling
Consider implementing VPA for automatic resource recommendation:
```bash
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/download/vertical-pod-autoscaler-0.13.0/vpa-release.yaml
```

## Backup and Recovery

### Database Backup
```bash
# Create database backup
kubectl exec -n opsight deployment/opsight-postgresql -- pg_dump -U postgres opsight > backup.sql

# Restore database backup
kubectl exec -i -n opsight deployment/opsight-postgresql -- psql -U postgres opsight < backup.sql
```

### Persistent Volume Backup
Use your cloud provider's volume snapshot capabilities or tools like Velero for comprehensive backup solutions.

## Troubleshooting

### Common Issues

#### Pod Startup Issues
```bash
# Check pod status
kubectl get pods -n opsight

# Check pod logs
kubectl logs -n opsight deployment/opsight-backend
kubectl logs -n opsight deployment/opsight-frontend

# Check events
kubectl get events -n opsight --sort-by='.lastTimestamp'
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec -n opsight deployment/opsight-backend -- pg_isready -h opsight-postgresql -p 5432

# Check database logs
kubectl logs -n opsight deployment/opsight-postgresql
```

#### Ingress Issues
```bash
# Check ingress status
kubectl get ingress -n opsight
kubectl describe ingress opsight -n opsight

# Check AWS Load Balancer Controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller
```

### Health Checks
```bash
# Check application health
kubectl exec -n opsight deployment/opsight-backend -- curl -f http://localhost:8000/api/v1/health
kubectl exec -n opsight deployment/opsight-frontend -- curl -f http://localhost:3000/api/health
```

## Upgrading

### Helm Upgrade
```bash
# Upgrade to new version
helm upgrade opsight ./helm/opsight -n opsight

# Upgrade with new values
helm upgrade opsight ./helm/opsight -n opsight -f new-values.yaml

# Rollback if needed
helm rollback opsight 1 -n opsight
```

### Database Migrations
Database migrations are handled automatically by the backend application during startup. The init container ensures the database is ready before the main application starts.

## Uninstallation

```bash
# Uninstall the release
helm uninstall opsight -n opsight

# Clean up namespace (optional)
kubectl delete namespace opsight
```

## Development

### Local Development
```bash
# Template the chart locally
helm template opsight ./helm/opsight -f helm/opsight/values-staging.yaml

# Validate the chart
helm lint ./helm/opsight

# Test installation (dry-run)
helm install opsight ./helm/opsight -n opsight --dry-run --debug
```

### Chart Testing
```bash
# Install chart test dependencies
helm dependency update ./helm/opsight

# Run chart tests
helm test opsight -n opsight
```

## Support

For issues and questions:
- Check the troubleshooting section above
- Review application logs
- Check Kubernetes events
- Consult the project documentation

## License

This chart is licensed under the same license as the OpsSight project. 