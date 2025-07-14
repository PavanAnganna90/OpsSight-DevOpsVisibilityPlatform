# EKS Module Variables
# Variable definitions following cursor development standards

variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.kubernetes_version))
    error_message = "Kubernetes version must be in format X.Y (e.g., 1.28)."
  }
}

# Networking Variables
variable "private_subnet_ids" {
  description = "List of private subnet IDs for the EKS cluster"
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets are required for high availability."
  }
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the EKS cluster"
  type        = list(string)
  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "At least 2 public subnets are required for high availability."
  }
}

# Security Group Variables
variable "cluster_security_group_id" {
  description = "Security group ID for the EKS cluster"
  type        = string
}

variable "node_security_group_id" {
  description = "Security group ID for EKS worker nodes"
  type        = string
}

# IAM Variables
variable "cluster_service_role_arn" {
  description = "ARN of the IAM role for the EKS cluster service"
  type        = string
}

variable "node_group_role_arn" {
  description = "ARN of the IAM role for EKS node groups"
  type        = string
}

# Node Group Configuration
variable "node_group_instance_types" {
  description = "List of instance types for the EKS node group"
  type        = list(string)
  default     = ["t3.medium"]
  validation {
    condition     = length(var.node_group_instance_types) > 0
    error_message = "At least one instance type must be specified."
  }
}

variable "node_group_scaling_config" {
  description = "Scaling configuration for the main node group"
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

variable "spot_node_group_scaling_config" {
  description = "Scaling configuration for the spot node group"
  type = object({
    desired_size = number
    max_size     = number
    min_size     = number
  })
  default = {
    desired_size = 1
    max_size     = 10
    min_size     = 0
  }
  validation {
    condition = (
      var.spot_node_group_scaling_config.min_size >= 0 &&
      var.spot_node_group_scaling_config.min_size <= var.spot_node_group_scaling_config.desired_size &&
      var.spot_node_group_scaling_config.desired_size <= var.spot_node_group_scaling_config.max_size &&
      var.spot_node_group_scaling_config.max_size <= 50
    )
    error_message = "Spot scaling config must satisfy: 0 <= min_size <= desired_size <= max_size <= 50."
  }
}

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "spot_instance_types" {
  description = "List of instance types for spot instances"
  type        = list(string)
  default     = ["t3.medium", "t3a.medium", "m5.large", "m5a.large"]
}

variable "node_disk_size" {
  description = "Disk size in GB for EKS worker nodes"
  type        = number
  default     = 20
  validation {
    condition     = var.node_disk_size >= 20 && var.node_disk_size <= 1000
    error_message = "Node disk size must be between 20 and 1000 GB."
  }
}

# Cluster Configuration
variable "endpoint_public_access" {
  description = "Enable public access to the EKS cluster endpoint"
  type        = bool
  default     = true
}

variable "public_access_cidrs" {
  description = "CIDR blocks that can access the public API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_log_types" {
  description = "List of control plane log types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  validation {
    condition = alltrue([
      for log_type in var.cluster_log_types :
      contains(["api", "audit", "authenticator", "controllerManager", "scheduler"], log_type)
    ])
    error_message = "Invalid log type. Valid types: api, audit, authenticator, controllerManager, scheduler."
  }
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

# Bootstrap and User Data
variable "bootstrap_arguments" {
  description = "Additional arguments for the EKS bootstrap script"
  type        = string
  default     = ""
}

# Tags
variable "tags" {
  description = "A map of tags to assign to all resources"
  type        = map(string)
  default     = {}
} 