# OpsSight Production Environment Configuration
# Terraform variables file for production deployment

# Basic Configuration
project_name = "opssight"
environment  = "production"
aws_region   = "us-east-1"

# Networking Configuration
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = [
  "10.0.1.0/24",  # us-east-1a
  "10.0.2.0/24",  # us-east-1b
  "10.0.3.0/24"   # us-east-1c
]
private_subnet_cidrs = [
  "10.0.10.0/24", # us-east-1a
  "10.0.20.0/24", # us-east-1b
  "10.0.30.0/24"  # us-east-1c
]
database_subnet_cidrs = [
  "10.0.100.0/24", # us-east-1a
  "10.0.200.0/24", # us-east-1b
  "10.0.300.0/24"  # us-east-1c
]

# Security Configuration
allowed_cidr_blocks = [
  "0.0.0.0/0"  # Production - restrict this to specific IPs/ranges
]
enable_vpc_flow_logs = true

# EKS Configuration
kubernetes_version = "1.28"
eks_endpoint_public_access = true
node_group_instance_types = ["m5.large", "m5.xlarge"]
node_group_scaling_config = {
  desired_size = 6
  max_size     = 20
  min_size     = 3
}
enable_spot_instances = false

# Database Configuration
database_username = "opssight"
database_host     = "opssight-production-db.cluster-xxxxx.us-east-1.rds.amazonaws.com"
database_port     = "5432"
database_name     = "opssight_production"

# Secrets Management
secrets_replica_region = "us-west-2"
enable_automatic_rotation = true
rotation_days = 30
enable_kms_encryption = true

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