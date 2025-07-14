# Production Environment Configuration for OpsSight

# General Configuration
environment = "production"
aws_region  = "us-west-2"
owner       = "OpsSight Production Team"

# Networking
vpc_cidr = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# EKS Configuration
kubernetes_version = "1.28"
node_instance_types = ["t3.large", "t3.xlarge"]
node_group_min_size = 3
node_group_max_size = 20
node_group_desired_size = 6
node_disk_size = 100

# Production-specific EKS admin users
eks_admin_users = [
  {
    userarn  = "arn:aws:iam::ACCOUNT_ID:user/prod-admin-1"
    username = "prod-admin-1"
    groups   = ["system:masters"]
  },
  {
    userarn  = "arn:aws:iam::ACCOUNT_ID:user/prod-admin-2"
    username = "prod-admin-2"
    groups   = ["system:masters"]
  }
]

# Database Configuration
db_instance_class = "db.r5.large"
db_allocated_storage = 100
db_max_allocated_storage = 1000
db_name = "opssight_prod"
db_username = "opssight_admin"

# Redis Configuration
redis_node_type = "cache.r5.large"

# DNS and SSL
manage_dns = true
domain_name = "opssight.dev"

# Security Configuration
allowed_cidr_blocks = [
  "10.0.0.0/8",    # Internal networks
  "172.16.0.0/12", # Corporate VPN
  "0.0.0.0/0"      # Public access (restrict as needed)
]

enable_cluster_encryption = true
enable_database_encryption = true
enable_deletion_protection = true

# Monitoring and Logging
enable_cloudwatch_logs = true
log_retention_days = 30

# Backup Configuration
backup_retention_period = 30

# Environment-specific configuration
environment_config = {
  node_min_size = 3
  node_max_size = 20
  node_desired_size = 6
  db_instance_class = "db.r5.large"
  redis_node_type = "cache.r5.large"
  enable_spot_instances = true
}

# Cost Optimization
enable_cost_allocation_tags = true

scheduled_scaling = {
  scale_down_cron = "0 20 * * MON-FRI"  # Scale down at 8 PM weekdays
  scale_up_cron   = "0 8 * * MON-FRI"   # Scale up at 8 AM weekdays
  min_size        = 2
  max_size        = 6
}