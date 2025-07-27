# AWS Infrastructure Variables for OpsSight Platform

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "opssight"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_admin_users" {
  description = "List of IAM users to add to EKS admins"
  type        = list(object({
    userarn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}

# Database Variables
variable "database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "opssight"
}

variable "database_username" {
  description = "Username for the PostgreSQL database"
  type        = string
  default     = "opssight_user"
}

variable "database_password" {
  description = "Password for the PostgreSQL database"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.database_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

# Redis Variables
variable "redis_auth_token" {
  description = "Auth token for Redis cluster"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.redis_auth_token) >= 16
    error_message = "Redis auth token must be at least 16 characters long."
  }
}

# Domain and SSL Variables
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "opssight.dev"
}

variable "create_route53_zone" {
  description = "Whether to create a Route53 hosted zone"
  type        = bool
  default     = false
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for ALB"
  type        = string
  default     = ""
}

# Monitoring Variables
variable "enable_cloudwatch_monitoring" {
  description = "Enable CloudWatch monitoring and alerting"
  type        = bool
  default     = true
}

variable "enable_container_insights" {
  description = "Enable Container Insights for EKS"
  type        = bool
  default     = true
}

# Security Variables
variable "enable_pod_security_policy" {
  description = "Enable Pod Security Policy for EKS"
  type        = bool
  default     = true
}

variable "enable_network_policy" {
  description = "Enable Kubernetes Network Policies"
  type        = bool
  default     = true
}

# Backup Variables
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for RDS"
  type        = bool
  default     = true
}

# Scaling Variables
variable "min_worker_nodes" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 2
}

variable "max_worker_nodes" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10
}

variable "desired_worker_nodes" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
}

# Cost Optimization Variables
variable "enable_spot_instances" {
  description = "Enable spot instances for non-critical workloads"
  type        = bool
  default     = true
}

variable "spot_instance_percentage" {
  description = "Percentage of worker nodes to run on spot instances"
  type        = number
  default     = 50
  
  validation {
    condition     = var.spot_instance_percentage >= 0 && var.spot_instance_percentage <= 100
    error_message = "Spot instance percentage must be between 0 and 100."
  }
}

# Compliance Variables
variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest for all data stores"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "enable_access_logging" {
  description = "Enable access logging for ALB and other services"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

# Tagging Variables
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "cost_center" {
  description = "Cost center for billing purposes"
  type        = string
  default     = "engineering"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "devops-team"
}

# Local variables for computed values
locals {
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Owner       = var.owner
    },
    var.additional_tags
  )

  # Conditional sizing based on environment
  instance_sizes = var.environment == "production" ? {
    eks_node_instance_type = "t3.large"
    rds_instance_class     = "db.t3.large"
    redis_node_type        = "cache.t3.medium"
  } : {
    eks_node_instance_type = "t3.medium"
    rds_instance_class     = "db.t3.micro"
    redis_node_type        = "cache.t3.micro"
  }

  # Conditional resource counts based on environment
  resource_counts = var.environment == "production" ? {
    min_nodes     = 3
    max_nodes     = 20
    desired_nodes = 5
    rds_allocated_storage = 100
    backup_retention = 30
  } : {
    min_nodes     = 1
    max_nodes     = 5
    desired_nodes = 2
    rds_allocated_storage = 20
    backup_retention = 7
  }
}