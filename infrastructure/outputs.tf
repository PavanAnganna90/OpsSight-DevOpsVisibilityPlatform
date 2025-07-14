# OpsSight DevOps Platform - Terraform Outputs
# Output values for infrastructure resources

# Account and Region Information
output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = var.aws_region
}

# Project Information
output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "name_prefix" {
  description = "Resource name prefix"
  value       = local.name_prefix
}

# VPC Outputs (will be populated when VPC module is added)
output "vpc_id" {
  description = "ID of the VPC"
  value       = try(module.vpc.vpc_id, null)
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = try(module.vpc.vpc_cidr_block, var.vpc_cidr)
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = try(module.vpc.public_subnet_ids, [])
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = try(module.vpc.private_subnet_ids, [])
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = try(module.vpc.database_subnet_ids, [])
}

output "database_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = try(module.vpc.database_subnet_group_name, null)
}

# Security Group Outputs (will be populated when security groups are added)
output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = try(module.security_groups.eks_cluster_security_group_id, null)
}

output "eks_node_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = try(module.security_groups.eks_node_security_group_id, null)
}

output "database_security_group_id" {
  description = "Security group ID for database"
  value       = try(module.security_groups.database_security_group_id, null)
}

output "application_load_balancer_security_group_id" {
  description = "Security group ID for Application Load Balancer"
  value       = try(module.security_groups.alb_security_group_id, null)
}

# IAM Outputs (will be populated when IAM module is added)
output "eks_cluster_service_role_arn" {
  description = "ARN of the EKS cluster service role"
  value       = try(module.iam.eks_cluster_service_role_arn, null)
}

output "eks_node_group_role_arn" {
  description = "ARN of the EKS node group role"
  value       = try(module.iam.eks_node_group_role_arn, null)
}

output "application_service_role_arn" {
  description = "ARN of the application service role"
  value       = try(module.iam.application_service_role_arn, null)
}

# S3 Outputs (for state and assets)
output "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  value       = try(module.s3.terraform_state_bucket_name, null)
}

output "application_assets_bucket" {
  description = "S3 bucket for application assets"
  value       = try(module.s3.application_assets_bucket_name, null)
}

# EKS Outputs
output "eks_cluster_id" {
  description = "Name/ID of the EKS cluster"
  value       = try(module.eks.cluster_id, null)
}

output "eks_cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = try(module.eks.cluster_arn, null)
}

output "eks_cluster_endpoint" {
  description = "Endpoint URL for the EKS cluster API server"
  value       = try(module.eks.cluster_endpoint, null)
  sensitive   = true
}

output "eks_cluster_version" {
  description = "Kubernetes version of the EKS cluster"
  value       = try(module.eks.cluster_version, null)
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = try(module.eks.cluster_certificate_authority_data, null)
  sensitive   = true
}

output "eks_cluster_oidc_issuer_url" {
  description = "The URL of the OpenID Connect identity provider"
  value       = try(module.eks.cluster_oidc_issuer_url, null)
}

output "eks_oidc_provider_arn" {
  description = "ARN of the OIDC Provider for IAM roles for service accounts"
  value       = try(module.eks.oidc_provider_arn, null)
}

output "eks_node_group_arn" {
  description = "ARN of the main EKS node group"
  value       = try(module.eks.node_group_arn, null)
}

output "eks_node_group_status" {
  description = "Status of the main EKS node group"
  value       = try(module.eks.node_group_status, null)
}

output "eks_kubeconfig" {
  description = "Kubectl configuration for accessing the EKS cluster"
  value       = try(module.eks.kubeconfig, null)
  sensitive   = true
}

# Database Outputs (will be populated when RDS module is added)
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = try(module.rds.db_instance_endpoint, null)
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = try(module.rds.db_instance_port, null)
}

# Monitoring Outputs
output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  value       = try(module.monitoring.cloudwatch_log_group_name, null)
}

# Load Balancer Outputs
output "application_load_balancer_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = try(module.load_balancer.alb_dns_name, null)
}

output "application_load_balancer_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = try(module.load_balancer.alb_zone_id, null)
}

# Common Tags
output "common_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}

# Secrets Manager Outputs
output "application_secrets_arn" {
  description = "ARN of the application secrets in AWS Secrets Manager"
  value       = try(module.secrets_manager.application_secrets_arn, null)
}

output "database_secrets_arn" {
  description = "ARN of the database secrets in AWS Secrets Manager"
  value       = try(module.secrets_manager.database_secrets_arn, null)
}

output "monitoring_secrets_arn" {
  description = "ARN of the monitoring secrets in AWS Secrets Manager"
  value       = try(module.secrets_manager.monitoring_secrets_arn, null)
}

output "cicd_secrets_arn" {
  description = "ARN of the CI/CD secrets in AWS Secrets Manager"
  value       = try(module.secrets_manager.cicd_secrets_arn, null)
}

output "secrets_manager_role_arn" {
  description = "ARN of the IAM role for accessing Secrets Manager from Kubernetes"
  value       = try(module.secrets_manager.secrets_manager_role_arn, null)
}

output "secrets_manager_kms_key_id" {
  description = "ID of the KMS key used for Secrets Manager encryption"
  value       = try(module.secrets_manager.secrets_manager_kms_key_id, null)
  sensitive   = true
}

output "service_account_annotations" {
  description = "Annotations to apply to Kubernetes service accounts for IRSA"
  value       = try(module.secrets_manager.service_account_annotations, {})
} 