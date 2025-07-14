# Terraform Outputs for OpsSight Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnets
}

# EKS Cluster Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_primary_security_group_id" {
  description = "Cluster security group that was created by Amazon EKS for the cluster"
  value       = module.eks.cluster_primary_security_group_id
}

# EKS Node Group Outputs
output "eks_managed_node_groups" {
  description = "Map of attribute maps for all EKS managed node groups created"
  value       = module.eks.eks_managed_node_groups
}

output "eks_managed_node_groups_autoscaling_group_names" {
  description = "List of the autoscaling group names created by EKS managed node groups"
  value       = module.eks.eks_managed_node_groups_autoscaling_group_names
}

# Database Outputs
output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = module.db.db_instance_endpoint
  sensitive   = true
}

output "db_instance_name" {
  description = "RDS instance name"
  value       = module.db.db_instance_name
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = module.db.db_instance_port
}

output "db_instance_username" {
  description = "RDS instance root username"
  value       = module.db.db_instance_username
  sensitive   = true
}

output "db_subnet_group_id" {
  description = "RDS subnet group ID"
  value       = module.db.db_subnet_group_id
}

# Redis Outputs
output "redis_cluster_id" {
  description = "Redis cluster ID"
  value       = aws_elasticache_replication_group.redis.id
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  sensitive   = true
}

# Load Balancer Outputs
output "load_balancer_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

# DNS and SSL Outputs
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.manage_dns ? aws_route53_zone.main[0].zone_id : null
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = var.manage_dns ? aws_acm_certificate.main[0].arn : null
}

# S3 Outputs
output "alb_logs_bucket_id" {
  description = "ID of the S3 bucket for ALB logs"
  value       = aws_s3_bucket.alb_logs.id
}

output "alb_logs_bucket_arn" {
  description = "ARN of the S3 bucket for ALB logs"
  value       = aws_s3_bucket.alb_logs.arn
}

# KMS Outputs
output "eks_kms_key_arn" {
  description = "ARN of the KMS key used for EKS encryption"
  value       = aws_kms_key.eks.arn
}

output "rds_kms_key_arn" {
  description = "ARN of the KMS key used for RDS encryption"
  value       = aws_kms_key.rds.arn
}

# Configuration for kubectl
output "kubectl_config" {
  description = "kubectl config command to connect to the cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_id}"
}

# Environment Information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

# Resource Tags
output "common_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}

# Cost Estimation
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown (approximate)"
  value = {
    eks_cluster    = "~$75/month"
    eks_nodes      = "~$${var.node_group_desired_size * (var.node_instance_types[0] == "t3.medium" ? 30 : 60)}/month"
    rds_instance   = "~$${var.db_instance_class == "db.t3.micro" ? 15 : 50}/month"
    redis_cluster  = "~$${var.redis_node_type == "cache.t3.micro" ? 15 : 30}/month"
    load_balancer  = "~$25/month"
    data_transfer  = "~$20-50/month"
    storage        = "~$10-30/month"
    total_estimate = "~$${75 + (var.node_group_desired_size * (var.node_instance_types[0] == "t3.medium" ? 30 : 60)) + (var.db_instance_class == "db.t3.micro" ? 15 : 50) + (var.redis_node_type == "cache.t3.micro" ? 15 : 30) + 25 + 35 + 20}/month"
  }
}

# Monitoring and Observability
output "cloudwatch_log_groups" {
  description = "CloudWatch log groups created"
  value = {
    eks_cluster = "/aws/eks/${module.eks.cluster_id}/cluster"
    vpc_flow_logs = module.vpc.vpc_flow_log_cloudwatch_log_group_name
  }
}

# Security Information
output "security_summary" {
  description = "Security configuration summary"
  value = {
    cluster_encryption_enabled = var.enable_cluster_encryption
    database_encryption_enabled = var.enable_database_encryption
    vpc_flow_logs_enabled = true
    security_groups_count = 4
    kms_keys_created = 2
    deletion_protection_enabled = var.enable_deletion_protection
  }
}