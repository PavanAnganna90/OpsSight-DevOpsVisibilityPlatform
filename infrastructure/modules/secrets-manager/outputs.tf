# OpsSight DevOps Platform - Secrets Manager Module Outputs

# Secret ARNs for reference by other modules
output "application_secrets_arn" {
  description = "ARN of the application secrets in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.application_secrets.arn
}

output "database_secrets_arn" {
  description = "ARN of the database secrets in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.database_secrets.arn
}

output "monitoring_secrets_arn" {
  description = "ARN of the monitoring secrets in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.monitoring_secrets.arn
}

output "cicd_secrets_arn" {
  description = "ARN of the CI/CD secrets in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.cicd_secrets.arn
}

# Secret Names for Kubernetes and applications
output "application_secrets_name" {
  description = "Name of the application secrets for use in applications"
  value       = aws_secretsmanager_secret.application_secrets.name
}

output "database_secrets_name" {
  description = "Name of the database secrets for use in applications"
  value       = aws_secretsmanager_secret.database_secrets.name
}

output "monitoring_secrets_name" {
  description = "Name of the monitoring secrets for use in applications"
  value       = aws_secretsmanager_secret.monitoring_secrets.name
}

output "cicd_secrets_name" {
  description = "Name of the CI/CD secrets for use in applications"
  value       = aws_secretsmanager_secret.cicd_secrets.name
}

# IAM Role for Kubernetes Service Accounts
output "secrets_manager_role_arn" {
  description = "ARN of the IAM role for accessing Secrets Manager from Kubernetes"
  value       = aws_iam_role.secrets_manager_role.arn
}

output "secrets_manager_role_name" {
  description = "Name of the IAM role for accessing Secrets Manager from Kubernetes"
  value       = aws_iam_role.secrets_manager_role.name
}

# Secrets Manager Policy
output "secrets_manager_policy_arn" {
  description = "ARN of the IAM policy for Secrets Manager access"
  value       = aws_iam_policy.secrets_manager_policy.arn
}

# KMS Key (if enabled)
output "secrets_manager_kms_key_id" {
  description = "ID of the KMS key used for Secrets Manager encryption"
  value       = var.enable_kms_encryption ? aws_kms_key.secrets_manager_key[0].key_id : null
}

output "secrets_manager_kms_key_arn" {
  description = "ARN of the KMS key used for Secrets Manager encryption"
  value       = var.enable_kms_encryption ? aws_kms_key.secrets_manager_key[0].arn : null
}

output "secrets_manager_kms_alias" {
  description = "Alias of the KMS key used for Secrets Manager encryption"
  value       = var.enable_kms_encryption ? aws_kms_alias.secrets_manager_key_alias[0].name : null
}

# Generated Passwords (for reference, not exposed in logs)
output "database_password_version" {
  description = "Version ID of the database password for tracking rotations"
  value       = aws_secretsmanager_secret_version.database_secrets.version_id
  sensitive   = true
}

output "jwt_secret_version" {
  description = "Version ID of the JWT secret for tracking rotations"
  value       = aws_secretsmanager_secret_version.application_secrets.version_id
  sensitive   = true
}

# Service Account Configuration for Kubernetes
output "service_account_annotations" {
  description = "Annotations to apply to Kubernetes service accounts for IRSA"
  value = {
    "eks.amazonaws.com/role-arn" = aws_iam_role.secrets_manager_role.arn
  }
}

# Environment Variables for Applications
output "environment_variables" {
  description = "Environment variables for applications to access secrets"
  value = {
    APPLICATION_SECRETS_ARN = aws_secretsmanager_secret.application_secrets.arn
    DATABASE_SECRETS_ARN    = aws_secretsmanager_secret.database_secrets.arn
    MONITORING_SECRETS_ARN  = aws_secretsmanager_secret.monitoring_secrets.arn
    CICD_SECRETS_ARN       = aws_secretsmanager_secret.cicd_secrets.arn
    AWS_REGION             = aws_secretsmanager_secret.application_secrets.replica[0].region
  }
}

# Rotation Configuration
output "rotation_enabled" {
  description = "Whether automatic rotation is enabled for secrets"
  value       = var.enable_automatic_rotation
}

output "rotation_lambda_arn" {
  description = "ARN of the Lambda function used for secret rotation"
  value       = var.enable_automatic_rotation ? var.rotation_lambda_arn : null
} 