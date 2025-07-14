# OpsSight DevOps Platform - Secrets Manager Module
# AWS Secrets Manager integration for secure secrets management

# Random password generation for database and application secrets
resource "random_password" "database_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "session_secret" {
  length  = 32
  special = false
}

# Application Secrets
resource "aws_secretsmanager_secret" "application_secrets" {
  name                    = "${var.name_prefix}-application-secrets"
  description             = "Application secrets for OpsSight platform"
  recovery_window_in_days = var.recovery_window_in_days

  replica {
    region = var.replica_region
  }

  tags = merge(var.tags, {
    Name        = "${var.name_prefix}-application-secrets"
    Type        = "secrets-manager"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "application_secrets" {
  secret_id = aws_secretsmanager_secret.application_secrets.id
  secret_string = jsonencode({
    JWT_SECRET_KEY              = random_password.jwt_secret.result
    SESSION_SECRET              = random_password.session_secret.result
    GITHUB_CLIENT_ID           = var.github_client_id
    GITHUB_CLIENT_SECRET       = var.github_client_secret
    GITHUB_WEBHOOK_SECRET      = var.github_webhook_secret
    DATABASE_URL               = "postgresql://${var.database_username}:${random_password.database_password.result}@${var.database_host}:${var.database_port}/${var.database_name}"
    PROMETHEUS_USERNAME        = var.prometheus_username
    PROMETHEUS_PASSWORD        = var.prometheus_password
    GRAFANA_ADMIN_PASSWORD     = var.grafana_admin_password
    ALERTMANAGER_WEBHOOK_URL   = var.alertmanager_webhook_url
    SLACK_BOT_TOKEN           = var.slack_bot_token
    SLACK_WEBHOOK_URL         = var.slack_webhook_url
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Database Secrets
resource "aws_secretsmanager_secret" "database_secrets" {
  name                    = "${var.name_prefix}-database-secrets"
  description             = "Database credentials for OpsSight platform"
  recovery_window_in_days = var.recovery_window_in_days

  replica {
    region = var.replica_region
  }

  tags = merge(var.tags, {
    Name        = "${var.name_prefix}-database-secrets"
    Type        = "secrets-manager"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "database_secrets" {
  secret_id = aws_secretsmanager_secret.database_secrets.id
  secret_string = jsonencode({
    username = var.database_username
    password = random_password.database_password.result
    host     = var.database_host
    port     = var.database_port
    dbname   = var.database_name
    engine   = "postgres"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Monitoring Secrets
resource "aws_secretsmanager_secret" "monitoring_secrets" {
  name                    = "${var.name_prefix}-monitoring-secrets"
  description             = "Monitoring system credentials and API keys"
  recovery_window_in_days = var.recovery_window_in_days

  replica {
    region = var.replica_region
  }

  tags = merge(var.tags, {
    Name        = "${var.name_prefix}-monitoring-secrets"
    Type        = "secrets-manager"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "monitoring_secrets" {
  secret_id = aws_secretsmanager_secret.monitoring_secrets.id
  secret_string = jsonencode({
    GRAFANA_ADMIN_USER         = "admin"
    GRAFANA_ADMIN_PASSWORD     = var.grafana_admin_password
    PROMETHEUS_USERNAME        = var.prometheus_username
    PROMETHEUS_PASSWORD        = var.prometheus_password
    ALERTMANAGER_WEBHOOK_URL   = var.alertmanager_webhook_url
    SLACK_API_URL             = var.slack_webhook_url
    PAGERDUTY_INTEGRATION_KEY = var.pagerduty_integration_key
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# CI/CD Secrets
resource "aws_secretsmanager_secret" "cicd_secrets" {
  name                    = "${var.name_prefix}-cicd-secrets"
  description             = "CI/CD pipeline secrets and API keys"
  recovery_window_in_days = var.recovery_window_in_days

  replica {
    region = var.replica_region
  }

  tags = merge(var.tags, {
    Name        = "${var.name_prefix}-cicd-secrets"
    Type        = "secrets-manager"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "cicd_secrets" {
  secret_id = aws_secretsmanager_secret.cicd_secrets.id
  secret_string = jsonencode({
    GITHUB_TOKEN              = var.github_token
    DOCKER_HUB_USERNAME      = var.docker_hub_username
    DOCKER_HUB_TOKEN         = var.docker_hub_token
    AWS_ACCESS_KEY_ID        = var.cicd_aws_access_key_id
    AWS_SECRET_ACCESS_KEY    = var.cicd_aws_secret_access_key
    COSIGN_PRIVATE_KEY       = var.cosign_private_key
    COSIGN_PASSWORD          = var.cosign_password
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# IAM Policy for Secrets Manager Access
resource "aws_iam_policy" "secrets_manager_policy" {
  name        = "${var.name_prefix}-secrets-manager-policy"
  description = "Policy for accessing Secrets Manager secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.application_secrets.arn,
          aws_secretsmanager_secret.database_secrets.arn,
          aws_secretsmanager_secret.monitoring_secrets.arn,
          aws_secretsmanager_secret.cicd_secrets.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:ListSecrets"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "secretsmanager:ResourceTag/Environment" = var.environment
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-secrets-manager-policy"
    Type = "iam-policy"
  })
}

# IAM Role for EKS Service Accounts to access Secrets Manager
resource "aws_iam_role" "secrets_manager_role" {
  name = "${var.name_prefix}-secrets-manager-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.eks_oidc_issuer}:sub" = [
              "system:serviceaccount:default:secrets-manager-sa",
              "system:serviceaccount:opsight-staging:secrets-manager-sa",
              "system:serviceaccount:opsight-production:secrets-manager-sa",
              "system:serviceaccount:monitoring:secrets-manager-sa"
            ]
            "${var.eks_oidc_issuer}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-secrets-manager-role"
    Type = "iam-role"
  })
}

# Attach Secrets Manager policy to role
resource "aws_iam_role_policy_attachment" "secrets_manager_policy_attachment" {
  policy_arn = aws_iam_policy.secrets_manager_policy.arn
  role       = aws_iam_role.secrets_manager_role.name
}

# Secret rotation for database passwords (optional)
resource "aws_secretsmanager_secret_rotation" "database_rotation" {
  count           = var.enable_automatic_rotation ? 1 : 0
  secret_id       = aws_secretsmanager_secret.database_secrets.id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = var.rotation_days
  }

  depends_on = [aws_secretsmanager_secret_version.database_secrets]
}

# KMS Key for Secrets Manager encryption (optional)
resource "aws_kms_key" "secrets_manager_key" {
  count                   = var.enable_kms_encryption ? 1 : 0
  description             = "KMS key for Secrets Manager encryption"
  deletion_window_in_days = 7

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow use of the key for Secrets Manager"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-secrets-manager-key"
    Type = "kms-key"
  })
}

resource "aws_kms_alias" "secrets_manager_key_alias" {
  count         = var.enable_kms_encryption ? 1 : 0
  name          = "alias/${var.name_prefix}-secrets-manager"
  target_key_id = aws_kms_key.secrets_manager_key[0].key_id
} 