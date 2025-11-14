# OpsSight Production Deployment Guide

## 🚀 Complete Production Infrastructure Setup

This guide covers the complete production deployment of OpsSight DevOps Platform with enterprise-grade infrastructure, monitoring, and security.

## 📋 Prerequisites

### Required Tools
- **Terraform** >= 1.0
- **AWS CLI** >= 2.0
- **kubectl** >= 1.28
- **Helm** >= 3.12
- **jq** for JSON processing

### AWS Requirements
- AWS Account with appropriate permissions
- IAM user with programmatic access
- Route53 hosted zone (optional, for custom domain)
- ACM SSL certificate (recommended)

### Domain Requirements
- Domain name registered (e.g., `opssight.dev`)
- DNS management access
- SSL certificate (can be auto-generated with Let's Encrypt)

## 🏗️ Infrastructure Architecture

### AWS Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │   Route53   │────│     ALB      │────│   EKS       │    │
│  │    DNS      │    │ Load Balancer│    │  Cluster    │    │
│  └─────────────┘    └──────────────┘    └─────────────┘    │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │     RDS     │    │ ElastiCache  │    │     S3      │    │
│  │ PostgreSQL  │    │    Redis     │    │   Storage   │    │
│  └─────────────┘    └──────────────┘    └─────────────┘    │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │ CloudWatch  │    │     KMS      │    │   Secrets   │    │
│  │   Logs      │    │ Encryption   │    │  Manager    │    │
│  └─────────────┘    └──────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   EKS Cluster Components                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │  Ingress    │────│   Frontend   │────│   Backend   │    │
│  │ Controller  │    │   (Next.js)  │    │  (FastAPI)  │    │
│  └─────────────┘    └──────────────┘    └─────────────┘    │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │ Prometheus  │────│   Grafana    │────│ AlertManager│    │
│  │ Monitoring  │    │  Dashboard   │    │   Alerts    │    │
│  └─────────────┘    └──────────────┘    └─────────────┘    │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │ Cert-Manager│────│  Let's       │────│  External   │    │
│  │   SSL/TLS   │    │  Encrypt     │    │   Secrets   │    │
│  └─────────────┘    └──────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Deployment Steps

### 1. Quick Deployment (Automated)

For a complete automated deployment:

```bash
# Clone the repository
git clone <your-repo-url>
cd opssight-platform

# Set environment variables
export ENVIRONMENT=production
export AWS_REGION=us-east-1
export DOMAIN_NAME=opssight.dev
export PROJECT_NAME=opssight

# Run the automated deployment script
./scripts/deploy-production-infrastructure.sh
```

### 2. Manual Step-by-Step Deployment

#### Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Verify credentials
aws sts get-caller-identity
```

#### Step 2: Prepare Terraform Variables

```bash
# Copy and edit Terraform variables
cd infrastructure/aws
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your specific values
vim terraform.tfvars
```

**Key variables to configure:**
```hcl
aws_region = "us-east-1"
project_name = "opssight"
environment = "production"
domain_name = "opssight.dev"
database_password = "your-secure-password"
redis_auth_token = "your-secure-redis-token"
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xyz"
```

#### Step 3: Deploy Infrastructure

```bash
# Initialize and apply Terraform
terraform init
terraform plan
terraform apply

# Save outputs for later use
terraform output -json > terraform-outputs.json
```

#### Step 4: Configure Kubernetes Access

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name opssight-production

# Verify connection
kubectl cluster-info
```

#### Step 5: Install Cluster Components

```bash
# Add Helm repositories
helm repo add aws-load-balancer-controller https://aws.github.io/eks-charts
helm repo add jetstack https://charts.jetstack.io
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install AWS Load Balancer Controller
helm upgrade --install aws-load-balancer-controller aws-load-balancer-controller/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=opssight-production

# Install cert-manager
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

#### Step 6: Deploy SSL Certificates

```bash
# Apply certificate configurations
kubectl apply -f k8s/security/cert-manager-setup.yaml

# Verify certificates
kubectl get certificates -n opsight
```

#### Step 7: Deploy Monitoring

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Apply Prometheus configuration
kubectl apply -f k8s/monitoring/advanced-prometheus-config.yaml

# Install monitoring stack
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values helm/opsight/values-production.yaml
```

#### Step 8: Deploy Application

```bash
# Create application namespace
kubectl create namespace opsight

# Deploy OpsSight using Helm
helm upgrade --install opsight ./helm/opsight \
  --namespace opsight \
  --values helm/opsight/values-production.yaml \
  --set ingress.hosts[0].host=opssight.dev
```

## 🔒 Security Configuration

### SSL/TLS Setup

The deployment includes automated SSL certificate management:

- **Let's Encrypt Integration**: Automatic certificate issuance and renewal
- **DNS-01 Challenge**: For wildcard certificates using Route53
- **HTTP-01 Challenge**: For standard certificates via ALB
- **Certificate Monitoring**: Automated alerts for expiring certificates

### Network Security

- **Network Policies**: Restrict pod-to-pod communication
- **Security Groups**: AWS-level network access control
- **Pod Security Standards**: Kubernetes security contexts
- **RBAC**: Role-based access control for all components

### Secrets Management

- **AWS Secrets Manager**: Centralized secret storage
- **External Secrets Operator**: Kubernetes secret synchronization
- **Encryption at Rest**: All data encrypted with KMS
- **Rotation**: Automated secret rotation

## 📊 Monitoring & Observability

### Metrics Collection

- **Prometheus**: Time-series metrics collection
- **Node Exporter**: System-level metrics
- **cAdvisor**: Container metrics
- **Application Metrics**: Custom OpsSight metrics

### Visualization

- **Grafana**: Comprehensive dashboards
- **Pre-built Dashboards**: Application, infrastructure, and business metrics
- **Custom Dashboards**: OpsSight-specific visualizations

### Alerting

- **AlertManager**: Intelligent alert routing
- **Slack Integration**: Real-time notifications
- **Email Alerts**: Critical issue notifications
- **PagerDuty**: On-call escalation (configurable)

### Alert Rules

```yaml
# Application Alerts
- High Error Rate (> 5% for 5 minutes)
- High Response Time (> 2 seconds for 10 minutes)
- Application Down (> 1 minute)
- High Memory Usage (> 90% for 5 minutes)
- High CPU Usage (> 80% for 10 minutes)

# Infrastructure Alerts
- Node Down (> 5 minutes)
- High Node CPU/Memory (> 85% for 10 minutes)
- High Disk Usage (> 90% for 5 minutes)
- Database Connection Failed (> 2 minutes)
- Certificate Expiring (< 7 days)
```

## 🚀 Scaling & Performance

### Horizontal Pod Autoscaling

```yaml
Frontend:
  Min Replicas: 3
  Max Replicas: 20
  CPU Target: 70%
  Memory Target: 80%

Backend:
  Min Replicas: 5
  Max Replicas: 30
  CPU Target: 70%
  Memory Target: 80%
```

### Cluster Autoscaling

```yaml
Node Groups:
  General:
    Min Nodes: 3
    Max Nodes: 20
    Instance Types: [t3.large, t3.xlarge]
  
  Monitoring:
    Min Nodes: 2
    Max Nodes: 5
    Instance Types: [t3.large]
    Taints: monitoring=true:NoSchedule
```

### Database Scaling

- **RDS Multi-AZ**: High availability setup
- **Read Replicas**: Read traffic distribution
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Performance monitoring

## 💾 Backup & Disaster Recovery

### Database Backups

```yaml
Automated Backups:
  Frequency: Daily
  Retention: 30 days (production), 7 days (staging)
  Cross-Region: Enabled
  Point-in-Time Recovery: Enabled

Manual Backups:
  Pre-deployment: Automated
  On-demand: Available via scripts
```

### Application Data

```yaml
S3 Backup:
  Application Data: Daily sync
  Configuration: Versioned storage
  Logs: 90-day retention
  Metrics: 1-year retention
```

### Disaster Recovery

```yaml
RTO (Recovery Time Objective): 30 minutes
RPO (Recovery Point Objective): 15 minutes

Recovery Procedures:
  1. Database restore from backup
  2. Application redeployment
  3. DNS failover (if needed)
  4. Data consistency verification
```

## 🔧 Operations & Maintenance

### Daily Operations

```bash
# Check cluster health
kubectl get nodes
kubectl get pods -A --field-selector=status.phase!=Running

# Check application logs
kubectl logs -f deployment/opsight-backend -n opsight

# Check monitoring
kubectl port-forward service/grafana 3000:80 -n monitoring
```

### Maintenance Windows

```yaml
Scheduled Maintenance:
  Frequency: Monthly (first Sunday, 2-6 AM UTC)
  Activities:
    - Security updates
    - Certificate renewals
    - Database maintenance
    - Backup verification

Emergency Maintenance:
  Critical security patches
  Service outage resolution
  Data corruption recovery
```

### Update Procedures

```bash
# Application updates
helm upgrade opsight ./helm/opsight \
  --namespace opsight \
  --values helm/opsight/values-production.yaml \
  --set image.tag=v1.2.0

# Infrastructure updates
cd infrastructure/aws
terraform plan
terraform apply

# Kubernetes updates
# Follow AWS EKS update procedures
```

## 📈 Cost Optimization

### Resource Optimization

- **Right-sizing**: Regular resource usage analysis
- **Spot Instances**: 50% of non-critical workloads
- **Reserved Instances**: Core infrastructure components
- **Storage Optimization**: S3 lifecycle policies

### Monitoring Costs

- **AWS Cost Explorer**: Daily cost monitoring
- **Resource Tagging**: Granular cost attribution
- **Budget Alerts**: Proactive cost management
- **Usage Reports**: Monthly optimization reviews

## 🚨 Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n opsight

# Check resource constraints
kubectl top nodes
kubectl top pods -n opsight

# Check events
kubectl get events -n opsight --sort-by='.lastTimestamp'
```

#### SSL Certificate Issues

```bash
# Check certificate status
kubectl get certificates -n opsight
kubectl describe certificate opssight-production-tls -n opsight

# Check cert-manager logs
kubectl logs -f deployment/cert-manager -n cert-manager
```

#### Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it deployment/opsight-backend -n opsight -- \
  python -c "import psycopg2; psycopg2.connect('postgresql://...')"

# Check security group rules
aws ec2 describe-security-groups --group-ids <db-security-group>
```

#### Load Balancer Issues

```bash
# Check ALB status
kubectl get ingress -n opsight
kubectl describe ingress opsight-ingress -n opsight

# Check ALB controller logs
kubectl logs -f deployment/aws-load-balancer-controller -n kube-system
```

### Emergency Procedures

#### Application Rollback

```bash
# Rollback to previous version
helm rollback opsight -n opsight

# Check rollback status
helm status opsight -n opsight
```

#### Database Recovery

```bash
# Point-in-time recovery (AWS RDS)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier opssight-production \
  --target-db-instance-identifier opssight-recovery \
  --restore-time 2023-10-01T10:00:00Z
```

## 📞 Support & Contacts

### Escalation Path

1. **Level 1**: Development Team
2. **Level 2**: DevOps Team
3. **Level 3**: Infrastructure Team
4. **Level 4**: AWS Support (Enterprise)

### Monitoring Contacts

- **Slack**: #opssight-alerts
- **Email**: devops@opssight.dev
- **PagerDuty**: Production incidents only
- **Phone**: Emergency escalation

### Documentation

- **Runbooks**: `docs/runbooks/`
- **Architecture**: `docs/architecture/`
- **APIs**: `docs/api/`
- **Troubleshooting**: `docs/troubleshooting/`

## 🎯 Success Metrics

### Availability Targets

- **Uptime**: 99.9% (8.77 hours downtime/year)
- **Response Time**: < 500ms (95th percentile)
- **Error Rate**: < 0.1%

### Performance Targets

- **Page Load Time**: < 2 seconds
- **API Response Time**: < 200ms
- **Database Query Time**: < 100ms

### Operational Metrics

- **Deployment Frequency**: Daily
- **Lead Time**: < 1 hour
- **MTTR**: < 30 minutes
- **Change Failure Rate**: < 5%

---

## 🎉 Congratulations!

You now have a fully deployed, production-ready OpsSight DevOps Platform with:

✅ **Enterprise-grade infrastructure** on AWS  
✅ **Kubernetes orchestration** with EKS  
✅ **Automated SSL certificate management**  
✅ **Comprehensive monitoring and alerting**  
✅ **High availability and auto-scaling**  
✅ **Security best practices**  
✅ **Backup and disaster recovery**  
✅ **CI/CD pipeline integration**  

Your platform is ready to support your DevOps workflows at scale!