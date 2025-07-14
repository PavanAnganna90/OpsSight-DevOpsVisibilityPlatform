# OpsSight DevOps Platform - Secrets Manager Module Variables

variable "name_prefix" {
  description = "Prefix for resource names to ensure uniqueness"
  type        = string
  validation {
    condition     = length(var.name_prefix) > 0 && length(var.name_prefix) <= 20
    error_message = "Name prefix must be between 1 and 20 characters."
  }
}

variable "environment" {
  description = "Environment name (staging, production, etc.)"
  type        = string
  validation {
    condition     = contains(["staging", "production", "development"], var.environment)
    error_message = "Environment must be one of: staging, production, development."
  }
}

variable "account_id" {
  description = "AWS Account ID for resource ARNs"
  type        = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.account_id))
    error_message = "Account ID must be a 12-digit number."
  }
}

variable "replica_region" {
  description = "Region for secrets replication (disaster recovery)"
  type        = string
  default     = "us-east-1"
}

variable "recovery_window_in_days" {
  description = "Number of days to retain deleted secrets for recovery"
  type        = number
  default     = 7
  validation {
    condition     = var.recovery_window_in_days >= 7 && var.recovery_window_in_days <= 30
    error_message = "Recovery window must be between 7 and 30 days."
  }
}

variable "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider for service account integration"
  type        = string
}

variable "eks_oidc_issuer" {
  description = "OIDC issuer URL for the EKS cluster (without https://)"
  type        = string
}

# Database Configuration
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
  validation {
    condition     = var.database_port > 0 && var.database_port <= 65535
    error_message = "Database port must be between 1 and 65535."
  }
}

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "opsight"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores."
  }
}

# GitHub OAuth Configuration
variable "github_client_id" {
  description = "GitHub OAuth application client ID"
  type        = string
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth application client secret"
  type        = string
  sensitive   = true
}

variable "github_webhook_secret" {
  description = "GitHub webhook secret for validating webhook payloads"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token for API access"
  type        = string
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
  sensitive   = true
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
}

variable "alertmanager_webhook_url" {
  description = "Webhook URL for AlertManager notifications"
  type        = string
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

variable "tags" {
  description = "Resource tags to apply to all created resources"
  type        = map(string)
  default     = {}
} 