# Minimal Production Infrastructure Outputs

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "kubectl_config_command" {
  description = "kubectl config command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.opssight.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.opssight.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.opssight.db_name
}

output "database_connection_string" {
  description = "Database connection string for application configuration"
  value       = "postgresql://${var.database_username}@${aws_db_instance.opssight.endpoint}:${aws_db_instance.opssight.port}/${aws_db_instance.opssight.db_name}"
  sensitive   = true
}

# ElastiCache Outputs
output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = aws_elasticache_replication_group.opssight.primary_endpoint_address
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = aws_elasticache_replication_group.opssight.port
}

output "redis_connection_string" {
  description = "Redis connection string for application configuration"
  value       = "redis://:${var.redis_auth_token}@${aws_elasticache_replication_group.opssight.primary_endpoint_address}:${aws_elasticache_replication_group.opssight.port}"
  sensitive   = true
}

# S3 Outputs
output "s3_application_data_bucket" {
  description = "S3 bucket for application data"
  value       = aws_s3_bucket.application_data.id
}

output "s3_backup_storage_bucket" {
  description = "S3 bucket for backup storage"
  value       = aws_s3_bucket.backup_storage.id
}

# Summary output for easy reference
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    cluster_name    = module.eks.cluster_name
    vpc_id         = module.vpc.vpc_id
    rds_endpoint   = aws_db_instance.opssight.endpoint
    redis_endpoint = aws_elasticache_replication_group.opssight.primary_endpoint_address
    region         = var.aws_region
    environment    = var.environment
  }
  sensitive = true
}