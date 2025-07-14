# OpsSight DevOps Platform - Main Terraform Configuration
# Infrastructure as Code for AWS deployment

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    # Backend configuration will be provided during terraform init
    # Example: terraform init -backend-config="bucket=opsight-terraform-state"
    #          -backend-config="key=infrastructure/terraform.tfstate"
    #          -backend-config="region=us-west-2"
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      CreatedBy   = "opsight-platform"
    }
  }
}

# Kubernetes Provider Configuration
# Reason: Configure kubectl and Kubernetes resources after EKS cluster creation
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_id]
  }
}

# Helm Provider Configuration  
# Reason: Deploy Helm charts to the EKS cluster
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_id]
    }
  }
}

# Data sources for AWS account information
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Random suffix for unique resource naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Local values for common configurations
locals {
  name_prefix    = "${var.project_name}-${var.environment}"
  name_suffix    = random_string.suffix.result
  vpc_cidr       = var.vpc_cidr
  azs            = slice(data.aws_availability_zones.available.names, 0, 3)
  
  common_tags = {
    Project      = var.project_name
    Environment  = var.environment
    ManagedBy    = "terraform"
    CreatedBy    = "opsight-platform"
    CreatedAt    = timestamp()
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix             = local.name_prefix
  vpc_cidr               = local.vpc_cidr
  public_subnet_cidrs    = var.public_subnet_cidrs
  private_subnet_cidrs   = var.private_subnet_cidrs
  database_subnet_cidrs  = var.database_subnet_cidrs
  availability_zones     = local.azs
  enable_vpc_flow_logs   = var.enable_vpc_flow_logs

  tags = local.common_tags
}

# IAM Module
module "iam" {
  source = "./modules/iam"

  name_prefix     = local.name_prefix
  account_id      = data.aws_caller_identity.current.account_id
  eks_oidc_issuer = module.eks.cluster_oidc_issuer_url

  tags = local.common_tags
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security-groups"

  name_prefix          = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  allowed_cidr_blocks = var.allowed_cidr_blocks

  tags = local.common_tags
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  name_prefix    = local.name_prefix
  environment    = var.environment
  
  # Networking
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  
  # Security Groups
  cluster_security_group_id = module.security_groups.eks_cluster_security_group_id
  node_security_group_id    = module.security_groups.eks_node_security_group_id
  
  # IAM Roles
  cluster_service_role_arn = module.iam.eks_cluster_service_role_arn
  node_group_role_arn     = module.iam.eks_node_group_role_arn
  
  # Configuration
  kubernetes_version         = var.kubernetes_version
  node_group_instance_types = var.node_group_instance_types
  node_group_scaling_config = var.node_group_scaling_config
  enable_spot_instances     = var.enable_spot_instances
  endpoint_public_access    = var.eks_endpoint_public_access
  public_access_cidrs       = var.allowed_cidr_blocks

  tags = local.common_tags

  depends_on = [
    module.vpc,
    module.iam,
    module.security_groups
  ]
}

# Secrets Manager Module
module "secrets_manager" {
  source = "./modules/secrets-manager"

  name_prefix    = local.name_prefix
  environment    = var.environment
  account_id     = data.aws_caller_identity.current.account_id
  replica_region = var.secrets_replica_region

  # EKS Integration
  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_issuer       = module.eks.oidc_issuer

  # Database Configuration
  database_username = var.database_username
  database_host     = var.database_host
  database_port     = var.database_port
  database_name     = var.database_name

  # GitHub OAuth Configuration
  github_client_id      = var.github_client_id
  github_client_secret  = var.github_client_secret
  github_webhook_secret = var.github_webhook_secret
  github_token         = var.github_token

  # Monitoring Configuration
  prometheus_username      = var.prometheus_username
  prometheus_password      = var.prometheus_password
  grafana_admin_password   = var.grafana_admin_password
  alertmanager_webhook_url = var.alertmanager_webhook_url
  slack_bot_token         = var.slack_bot_token
  slack_webhook_url       = var.slack_webhook_url
  pagerduty_integration_key = var.pagerduty_integration_key

  # CI/CD Configuration
  docker_hub_username        = var.docker_hub_username
  docker_hub_token          = var.docker_hub_token
  cicd_aws_access_key_id    = var.cicd_aws_access_key_id
  cicd_aws_secret_access_key = var.cicd_aws_secret_access_key
  cosign_private_key        = var.cosign_private_key
  cosign_password           = var.cosign_password

  # Security Configuration
  enable_automatic_rotation = var.enable_automatic_rotation
  rotation_lambda_arn      = var.rotation_lambda_arn
  rotation_days            = var.rotation_days
  enable_kms_encryption    = var.enable_kms_encryption

  tags = local.common_tags

  depends_on = [
    module.eks
  ]
} 