# OpsSight Platform Deployment Guide

Comprehensive guide for deploying the OpsSight DevOps Platform to AWS using EKS, Terraform, and automated CI/CD pipelines.

## 🏗️ Architecture Overview

The OpsSight Platform is deployed on AWS using:
- **EKS (Elastic Kubernetes Service)** for container orchestration
- **RDS PostgreSQL** for primary database
- **ElastiCache Redis** for caching and session storage
- **Application Load Balancer** for traffic distribution
- **Terraform** for infrastructure as code
- **GitHub Actions** for CI/CD automation

## 📋 Prerequisites

### Required Tools
- AWS CLI (v2.0+)
- Terraform (v1.5+)
- kubectl (v1.28+)
- Docker (v20.0+)
- Helm (v3.0+)
- GitHub CLI (optional)

### AWS Requirements
- AWS Account with appropriate permissions
- IAM user with programmatic access
- Route53 hosted zone (optional for custom domain)

### Local Development Setup
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip && sudo mv terraform /usr/local/bin/

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/opssight-platform
cd opssight-platform

# Configure AWS credentials
aws configure
# or use environment variables:
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-west-2"
```

### 2. Infrastructure Deployment

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Copy and customize variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan -var-file="terraform.tfvars"

# Apply infrastructure (creates EKS cluster, RDS, Redis, etc.)
terraform apply -var-file="terraform.tfvars"
```

### 3. Application Deployment

```bash
# Use the deployment script
./scripts/deploy.sh -e staging -a apply -y

# Or deploy manually:
# Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name opssight-staging-eks

# Deploy using Helm
helm upgrade --install opssight ./helm/opssight \
  --namespace opssight \
  --create-namespace \
  --set environment=staging
```

## 🌍 Environment Configuration

### Development Environment
```bash
# Deploy development environment
./scripts/deploy.sh -e dev -a apply

# Configuration:
# - Single node EKS cluster
# - db.t3.micro RDS instance
# - cache.t3.micro Redis
# - No SSL/custom domain
```

### Staging Environment
```bash
# Deploy staging environment
./scripts/deploy.sh -e staging -a apply

# Configuration:
# - Multi-node EKS cluster
# - db.t3.medium RDS instance
# - cache.t3.small Redis
# - SSL with self-signed certificates
```

### Production Environment
```bash
# Deploy production environment
./scripts/deploy.sh -e production -a apply

# Configuration:
# - High-availability EKS cluster (3+ nodes)
# - db.r6g.large RDS instance with Multi-AZ
# - cache.r6g.large Redis with clustering
# - SSL with valid certificates
# - Enhanced monitoring and alerting
```

## 🔧 Configuration Details

### Terraform Variables

Key variables in `terraform.tfvars`:

```hcl
# General Configuration
project_name = "opssight"
environment  = "production"
aws_region   = "us-west-2"

# EKS Configuration
kubernetes_version      = "1.28"
node_instance_types     = ["m5.large", "m5.xlarge"]
node_group_min_size     = 3
node_group_max_size     = 20
node_group_desired_size = 5

# Database Configuration
db_instance_class       = "db.r6g.large"
db_allocated_storage    = 500
db_max_allocated_storage = 2000
db_password             = "secure-password-here"

# Redis Configuration
redis_node_type  = "cache.r6g.large"
redis_auth_token = "secure-redis-token"

# DNS Configuration
manage_dns  = true
domain_name = "yourdomain.com"

# Security Configuration
allowed_cidr_blocks        = ["10.0.0.0/8"]
enable_deletion_protection = true
backup_retention_period    = 30
```

### Application Configuration

Environment-specific values are configured via Helm values:

```yaml
# values-production.yaml
replicaCount:
  frontend: 3
  backend: 5

image:
  repository: your-account.dkr.ecr.us-west-2.amazonaws.com
  tag: production-latest

resources:
  frontend:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  backend:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
```

## 🔄 CI/CD Pipeline

The platform uses GitHub Actions for automated deployment:

### Workflow Triggers
- **Push to main**: Deploy to production
- **Push to develop**: Deploy to staging
- **Pull Request**: Run tests and create preview environment

### Pipeline Stages
1. **Security Scan**: Trivy vulnerability scanning
2. **Frontend Tests**: Jest, ESLint, Prettier, E2E tests
3. **Backend Tests**: Pytest, Black, isort, mypy, security scans
4. **Build Images**: Multi-platform Docker builds
5. **Deploy Staging**: Automatic deployment to staging
6. **Deploy Production**: Manual approval required

### Environment Secrets

Configure these secrets in GitHub repository settings:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Database
DB_PASSWORD

# Redis
REDIS_AUTH_TOKEN

# Monitoring
SLACK_WEBHOOK          # For deployment notifications
GRAFANA_API_KEY        # For dashboard management
```

## 📊 Monitoring and Observability

### Prometheus Metrics
- Application performance metrics
- Infrastructure monitoring
- Custom business metrics
- Kubernetes cluster metrics

### Grafana Dashboards
- **OpsSight Overview**: Application health and performance
- **Kubernetes Cluster**: Infrastructure metrics
- **Database Monitoring**: PostgreSQL performance
- **Performance Monitoring**: Response times and throughput

### Alerting Rules
- High error rates (>5%)
- Response time degradation (>2 seconds)
- Database connection issues
- Node resource exhaustion
- Pod crash loops

### Log Aggregation
- Centralized logging with Loki
- Application logs from frontend and backend
- Infrastructure logs from EKS
- Database and Redis logs

## 🔐 Security Considerations

### Network Security
- VPC with private subnets for EKS nodes
- Security groups with minimal required access
- Network policies for pod-to-pod communication
- VPC Flow Logs for traffic monitoring

### Data Protection
- Encryption at rest for RDS and EBS volumes
- Encryption in transit with TLS
- KMS key management for encryption
- Regular automated backups

### Access Control
- IAM roles and policies following least privilege
- Kubernetes RBAC for service accounts
- Pod security policies
- Secret management with AWS Secrets Manager

### Compliance
- OWASP Top 10 security controls
- Regular security scanning with Trivy
- Vulnerability management
- Security audit logging

## 🛠️ Troubleshooting

### Common Issues

#### EKS Cluster Access Issues
```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name opssight-production-eks

# Verify access
kubectl get nodes

# Check IAM permissions
aws sts get-caller-identity
```

#### Application Deployment Failures
```bash
# Check pod status
kubectl get pods -n opssight

# View pod logs
kubectl logs -n opssight deployment/backend

# Describe pod for events
kubectl describe pod -n opssight <pod-name>
```

#### Database Connection Issues
```bash
# Check RDS status in AWS Console
# Verify security group rules
# Test connection from EKS:
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h your-rds-endpoint -U postgres -d opssight
```

#### Performance Issues
```bash
# Check resource utilization
kubectl top nodes
kubectl top pods -n opssight

# Review Grafana dashboards
# Check Prometheus metrics
# Review application logs for slow queries
```

### Debugging Commands

```bash
# Terraform debugging
export TF_LOG=DEBUG
terraform plan -var-file="terraform.tfvars"

# Kubernetes debugging
kubectl get events --sort-by='.metadata.creationTimestamp'
kubectl describe node <node-name>
kubectl logs -n kube-system -l k8s-app=aws-load-balancer-controller

# Application debugging
kubectl exec -n opssight deployment/backend -- env
kubectl port-forward -n opssight svc/frontend 3000:3000
```

## 📈 Scaling and Performance

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: opssight
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Cluster Autoscaler
The EKS cluster is configured with cluster autoscaler to automatically scale nodes based on resource demands.

### Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling with PgBouncer
- Query optimization and indexing
- Automated storage scaling

## 🔄 Disaster Recovery

### Backup Strategy
- **RDS**: Automated daily backups with 30-day retention
- **Application Data**: Kubernetes volume snapshots
- **Configuration**: Git-based infrastructure as code
- **Secrets**: AWS Secrets Manager with cross-region replication

### Recovery Procedures
1. **Infrastructure Recovery**: Terraform state restoration and re-deployment
2. **Database Recovery**: RDS point-in-time recovery or snapshot restoration
3. **Application Recovery**: Container image re-deployment from ECR
4. **Data Recovery**: Volume snapshot restoration

### Testing
- Monthly disaster recovery drills
- Automated backup verification
- Cross-region failover testing
- Recovery time objective (RTO): 2 hours
- Recovery point objective (RPO): 1 hour

## 📞 Support and Maintenance

### Regular Maintenance Tasks
- Monthly EKS version updates
- Weekly security patch reviews
- Daily backup verification
- Quarterly load testing
- Annual disaster recovery testing

### Support Contacts
- **Infrastructure Issues**: DevOps Team
- **Application Issues**: Development Team
- **Security Issues**: Security Team
- **On-call**: PagerDuty integration

### Documentation Updates
This documentation should be updated whenever:
- Infrastructure changes are made
- New deployment procedures are introduced
- Security configurations are modified
- Monitoring and alerting rules change

## 📚 Additional Resources

- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintained By**: DevOps Team