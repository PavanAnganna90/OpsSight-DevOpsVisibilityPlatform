# Staging Environment Configuration for OpsSight

# General Configuration
environment = "staging"
aws_region  = "us-west-2"
owner       = "OpsSight Staging Team"

# Networking
vpc_cidr = "10.1.0.0/16"
private_subnet_cidrs = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
public_subnet_cidrs  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]

# EKS Configuration
kubernetes_version = "1.28"
node_instance_types = ["t3.medium", "t3.large"]
node_group_min_size = 2
node_group_max_size = 8
node_group_desired_size = 3
node_disk_size = 50

# Staging EKS admin users
eks_admin_users = [
  {
    userarn  = "arn:aws:iam::ACCOUNT_ID:user/staging-admin"
    username = "staging-admin"
    groups   = ["system:masters"]
  },
  {
    userarn  = "arn:aws:iam::ACCOUNT_ID:user/developer-1"
    username = "developer-1"
    groups   = ["system:masters"]
  }
]

# Database Configuration
db_instance_class = "db.t3.small"
db_allocated_storage = 20
db_max_allocated_storage = 100
db_name = "opssight_staging"
db_username = "opssight_user"

# Redis Configuration
redis_node_type = "cache.t3.micro"

# DNS and SSL
manage_dns = true
domain_name = "staging.opssight.dev"

# Security Configuration
allowed_cidr_blocks = [
  "10.0.0.0/8",    # Internal networks
  "172.16.0.0/12", # Corporate VPN
  "0.0.0.0/0"      # Public access for testing
]

enable_cluster_encryption = true
enable_database_encryption = true
enable_deletion_protection = false  # Allow easy teardown

# Monitoring and Logging
enable_cloudwatch_logs = true
log_retention_days = 7

# Backup Configuration
backup_retention_period = 7

# Environment-specific configuration
environment_config = {
  node_min_size = 1
  node_max_size = 8
  node_desired_size = 3
  db_instance_class = "db.t3.small"
  redis_node_type = "cache.t3.micro"
  enable_spot_instances = true
}

# Cost Optimization
enable_cost_allocation_tags = true

scheduled_scaling = {
  scale_down_cron = "0 19 * * MON-FRI"  # Scale down at 7 PM weekdays
  scale_up_cron   = "0 9 * * MON-FRI"   # Scale up at 9 AM weekdays
  min_size        = 1
  max_size        = 3
}