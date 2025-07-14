# OpsSight DevOps Platform - Terraform Variables
# Configurable parameters for infrastructure deployment

# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "opsight"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# AWS Configuration
variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-west-2"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the infrastructure"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.kubernetes_version))
    error_message = "Kubernetes version must be in format X.Y (e.g., 1.28)."
  }
}

variable "node_group_instance_types" {
  description = "EC2 instance types for EKS node groups"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "node_group_scaling_config" {
  description = "EKS node group scaling configuration"
  type = object({
    desired_size = number
    max_size     = number
    min_size     = number
  })
  default = {
    desired_size = 2
    max_size     = 5
    min_size     = 1
  }
  validation {
    condition = (
      var.node_group_scaling_config.min_size >= 1 &&
      var.node_group_scaling_config.min_size <= var.node_group_scaling_config.desired_size &&
      var.node_group_scaling_config.desired_size <= var.node_group_scaling_config.max_size &&
      var.node_group_scaling_config.max_size <= 20
    )
    error_message = "Scaling config must satisfy: 1 <= min_size <= desired_size <= max_size <= 20."
  }
}

variable "eks_endpoint_public_access" {
  description = "Enable public access to EKS cluster API endpoint"
  type        = bool
  default     = true
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

# Application Configuration
variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus, Grafana)"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Secrets Management Configuration
variable "secrets_replica_region" {
  description = "Region for secrets replication (disaster recovery)"
  type        = string
  default     = "us-east-1"
}

# Database Configuration for Secrets
variable "database_username" {
  description = "Username for the database connection"
  type        = string
  default     = "opsight_user"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_username))
    error_message = "Database username must start with a letter and contain only alphanumeric characters and underscores."
  }
}

variable "database_host" {
  description = "Database host endpoint"
  type        = string
  default     = "postgres.opsight-staging.svc.cluster.local"
}

variable "database_port" {
  description = "Database port number"
  type        = number
  default     = 5432
}

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "opsight"
}

# GitHub OAuth Configuration
variable "github_client_id" {
  description = "GitHub OAuth application client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth application client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_webhook_secret" {
  description = "GitHub webhook secret for validating webhook payloads"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token for API access"
  type        = string
  default     = ""
  sensitive   = true
}

# Monitoring Configuration
variable "prometheus_username" {
  description = "Username for Prometheus authentication"
  type        = string
  default     = "prometheus"
}

variable "prometheus_password" {
  description = "Password for Prometheus authentication"
  type        = string
  default     = ""
  sensitive   = true
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  default     = ""
  sensitive   = true
}

variable "alertmanager_webhook_url" {
  description = "Webhook URL for AlertManager notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "slack_bot_token" {
  description = "Slack bot token for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key for critical alerts"
  type        = string
  default     = ""
  sensitive   = true
}

# CI/CD Configuration
variable "docker_hub_username" {
  description = "Docker Hub username for container registry"
  type        = string
  default     = ""
}

variable "docker_hub_token" {
  description = "Docker Hub access token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cicd_aws_access_key_id" {
  description = "AWS access key ID for CI/CD operations"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cicd_aws_secret_access_key" {
  description = "AWS secret access key for CI/CD operations"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cosign_private_key" {
  description = "Cosign private key for container image signing"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cosign_password" {
  description = "Password for Cosign private key"
  type        = string
  default     = ""
  sensitive   = true
}

# Security Configuration
variable "enable_automatic_rotation" {
  description = "Enable automatic rotation for database passwords"
  type        = bool
  default     = false
}

variable "rotation_lambda_arn" {
  description = "ARN of Lambda function for secret rotation"
  type        = string
  default     = ""
}

variable "rotation_days" {
  description = "Number of days between automatic rotations"
  type        = number
  default     = 30
  validation {
    condition     = var.rotation_days >= 1 && var.rotation_days <= 365
    error_message = "Rotation days must be between 1 and 365."
  }
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for secrets"
  type        = bool
  default     = true
} 