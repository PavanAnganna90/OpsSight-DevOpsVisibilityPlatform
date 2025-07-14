# OpsSight DevOps Platform - Infrastructure

This directory contains the Infrastructure as Code (IaC) configuration for the OpsSight DevOps visibility platform using Terraform on AWS.

## Prerequisites

Before deploying the infrastructure, ensure you have:

1. **Terraform** (>= 1.0) installed
2. **AWS CLI** configured with appropriate credentials
3. **AWS Account** with sufficient permissions
4. **S3 Bucket** for Terraform state storage (optional but recommended)

## Directory Structure

```
infrastructure/
├── main.tf                     # Main Terraform configuration
├── variables.tf                # Variable definitions
├── outputs.tf                  # Output values
├── terraform.tfvars.example    # Example configuration
├── modules/                    # Terraform modules
│   ├── vpc/                    # VPC and networking
│   ├── iam/                    # IAM roles and policies
│   ├── security-groups/        # Security groups for all components
│   └── eks/                    # EKS cluster and node groups
└── README.md                   # This file
```

## Quick Start

### 1. Configure Variables

Copy the example configuration and customize for your environment:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific values:
- AWS region
- Network CIDR blocks
- Instance sizes
- Environment name

### 2. Initialize Terraform

#### With S3 Backend (Recommended)

First, create an S3 bucket for state storage:

```bash
aws s3 mb s3://your-opsight-terraform-state-bucket
```

Then initialize with backend configuration:

```bash
terraform init \
  -backend-config="bucket=your-opsight-terraform-state-bucket" \
  -backend-config="key=infrastructure/terraform.tfstate" \
  -backend-config="region=us-west-2"
```

#### Without S3 Backend (Local State)

```bash
terraform init
```

### 3. Plan and Apply

Review the planned changes:

```bash
terraform plan
```

Apply the infrastructure:

```bash
terraform apply
```

## Modules

### VPC Module (`modules/vpc/`)

Creates a secure, multi-tier VPC with:
- Public subnets for load balancers
- Private subnets for application workloads
- Database subnets for RDS
- NAT gateways for outbound internet access
- VPC Flow Logs for security monitoring

### IAM Module (`modules/iam/`)

Sets up IAM roles and policies for:
- EKS cluster service role
- EKS node group role
- Application service role (with OIDC)
- AWS Load Balancer Controller role

### Security Groups Module (`modules/security-groups/`)

Creates security groups for:
- EKS cluster control plane
- EKS worker nodes
- Database access
- Application Load Balancer

### EKS Module (`modules/eks/`)

Deploys a production-ready EKS cluster with:
- Managed Kubernetes control plane
- Auto-scaling node groups (on-demand and spot)
- Essential add-ons (VPC CNI, CoreDNS, kube-proxy, EBS CSI)
- KMS encryption for secrets
- CloudWatch logging integration
- OIDC provider for service accounts

## Security Considerations

### Production Deployment

When deploying to production:

1. **Restrict CIDR blocks**: Update `allowed_cidr_blocks` in `terraform.tfvars`
2. **Enable encryption**: All resources use encryption by default
3. **Review IAM policies**: Follow principle of least privilege
4. **Enable logging**: VPC Flow Logs and CloudWatch are configured
5. **Use larger instance sizes**: Update database and node instance types

### Access Control

The infrastructure follows AWS security best practices:
- Private subnets for application workloads
- Network ACLs and security groups for traffic control
- IAM roles with minimal required permissions
- Encryption at rest and in transit

## Environment Management

### Multiple Environments

Deploy separate environments by using different:
- Terraform workspaces, or
- Separate state files with different backend configurations
- Different variable files

Example for staging environment:

```bash
# Using workspace
terraform workspace new staging
terraform apply -var-file="staging.tfvars"

# Or using separate backend
terraform init \
  -backend-config="key=staging/terraform.tfstate"
terraform apply -var-file="staging.tfvars"
```

## Cost Optimization

### Development Environments

For cost savings in non-production:
- Enable spot instances: `enable_spot_instances = true`
- Use smaller instance types
- Reduce backup retention: `backup_retention_days = 3`
- Single AZ deployment (modify subnet configurations)

### Monitoring Costs

Resources created will incur AWS charges:
- NAT Gateways (~$45/month per gateway)
- EKS cluster (~$73/month)
- EC2 instances (varies by type and usage)
- RDS instances (varies by type and storage)

## Outputs

After deployment, Terraform outputs important values:
- VPC ID and subnet IDs
- IAM role ARNs
- Security group IDs
- Load balancer DNS names (when added)

View outputs:

```bash
terraform output
```

## Next Steps

After deploying the infrastructure:

1. **Set up GitHub Actions workflows** (Subtask 20.3)
2. **Create Kubernetes manifests and Helm charts** (Subtask 20.4)
3. **Configure monitoring and observability** (Subtask 20.5)
4. **Implement secrets management** (Subtask 20.6)
5. **Perform end-to-end testing** (Subtask 20.7)

## Troubleshooting

### Common Issues

1. **Insufficient AWS permissions**
   - Ensure AWS credentials have EC2, VPC, IAM, and EKS permissions

2. **Resource limits**
   - Check AWS service quotas (VPCs, EIPs, etc.)

3. **State lock issues**
   - If using S3 backend, enable DynamoDB table for state locking

4. **CIDR conflicts**
   - Ensure VPC CIDR doesn't conflict with existing networks

### Cleanup

To destroy the infrastructure:

```bash
terraform destroy
```

**Warning**: This will permanently delete all resources. Ensure you have backups of any important data.

## Support

For issues with the infrastructure:
1. Check AWS CloudFormation console for detailed error messages
2. Review Terraform logs with `TF_LOG=DEBUG`
3. Consult AWS documentation for service-specific requirements

## Security Notice

This configuration is designed for educational and development purposes. For production deployments:
- Review all security configurations
- Implement additional monitoring and alerting
- Follow your organization's security policies
- Consider using AWS Config for compliance monitoring 