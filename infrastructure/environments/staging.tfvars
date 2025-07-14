# OpsSight Staging Environment Configuration
# Terraform variables file for staging deployment

# Basic Configuration
project_name = "opssight"
environment  = "staging"
aws_region   = "us-east-1"

# Networking Configuration
vpc_cidr = "10.1.0.0/16"
public_subnet_cidrs = [
  "10.1.1.0/24",  # us-east-1a
  "10.1.2.0/24",  # us-east-1b
]
private_subnet_cidrs = [
  "10.1.10.0/24", # us-east-1a
  "10.1.20.0/24", # us-east-1b
]
database_subnet_cidrs = [
  "10.1.100.0/24", # us-east-1a
  "10.1.200.0/24", # us-east-1b
]

# Security Configuration
allowed_cidr_blocks = [
  "0.0.0.0/0"  # Staging - can be more permissive
]
enable_vpc_flow_logs = false

# EKS Configuration
kubernetes_version = "1.28"
eks_endpoint_public_access = true
node_group_instance_types = ["t3.medium", "t3.large"]
node_group_scaling_config = {
  desired_size = 2
  max_size     = 6
  min_size     = 1
}
enable_spot_instances = true  # Cost optimization for staging

# Database Configuration
database_username = "opssight"
database_host     = "opssight-staging-db.cluster-xxxxx.us-east-1.rds.amazonaws.com"
database_port     = "5432"
database_name     = "opssight_staging"

# Secrets Management
secrets_replica_region = "us-west-2"
enable_automatic_rotation = false  # Disable for staging
rotation_days = 90
enable_kms_encryption = false  # Cost optimization

# GitHub Integration (set via environment variables)
github_client_id      = ""  # Set via TF_VAR_github_client_id
github_client_secret  = ""  # Set via TF_VAR_github_client_secret
github_webhook_secret = ""  # Set via TF_VAR_github_webhook_secret
github_token         = ""  # Set via TF_VAR_github_token

# Monitoring Configuration
prometheus_username      = "admin"
prometheus_password      = ""  # Set via TF_VAR_prometheus_password
grafana_admin_password   = ""  # Set via TF_VAR_grafana_admin_password
alertmanager_webhook_url = ""  # Set via TF_VAR_alertmanager_webhook_url
slack_bot_token         = ""  # Set via TF_VAR_slack_bot_token
slack_webhook_url       = ""  # Set via TF_VAR_slack_webhook_url
pagerduty_integration_key = ""  # Set via TF_VAR_pagerduty_integration_key

# CI/CD Configuration
docker_hub_username        = "opssight"
docker_hub_token          = ""  # Set via TF_VAR_docker_hub_token
cicd_aws_access_key_id    = ""  # Set via TF_VAR_cicd_aws_access_key_id
cicd_aws_secret_access_key = ""  # Set via TF_VAR_cicd_aws_secret_access_key
cosign_private_key        = ""  # Set via TF_VAR_cosign_private_key
cosign_password           = ""  # Set via TF_VAR_cosign_password

# Additional Configuration
rotation_lambda_arn = ""