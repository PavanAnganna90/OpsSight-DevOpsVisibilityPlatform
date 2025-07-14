# EKS Module Outputs
# Output values for EKS resources following cursor development standards

# Cluster Information
output "cluster_id" {
  description = "Name/ID of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "Endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  description = "Kubernetes version of the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

# OIDC Provider Information
output "cluster_oidc_issuer_url" {
  description = "The URL of the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC Provider for IAM roles for service accounts"
  value       = aws_iam_openid_connect_provider.eks.arn
}

# Node Group Information
output "node_group_arn" {
  description = "ARN of the main EKS node group"
  value       = aws_eks_node_group.main.arn
}

output "node_group_status" {
  description = "Status of the main EKS node group"
  value       = aws_eks_node_group.main.status
}

output "spot_node_group_arn" {
  description = "ARN of the spot EKS node group"
  value       = var.enable_spot_instances ? aws_eks_node_group.spot[0].arn : null
}

output "spot_node_group_status" {
  description = "Status of the spot EKS node group"
  value       = var.enable_spot_instances ? aws_eks_node_group.spot[0].status : null
}

# Encryption Information
output "cluster_encryption_config" {
  description = "Configuration block for cluster encryption"
  value       = aws_eks_cluster.main.encryption_config
}

output "kms_key_id" {
  description = "KMS key ID used for cluster encryption"
  value       = aws_kms_key.eks.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN used for cluster encryption"
  value       = aws_kms_key.eks.arn
}

# Kubectl Configuration
output "kubeconfig" {
  description = "Kubectl configuration for accessing the cluster"
  value = {
    apiVersion      = "v1"
    kind            = "Config"
    current-context = "terraform"
    contexts = [{
      name = "terraform"
      context = {
        cluster = "terraform"
        user    = "terraform"
      }
    }]
    clusters = [{
      name = "terraform"
      cluster = {
        certificate-authority-data = aws_eks_cluster.main.certificate_authority[0].data
        server                     = aws_eks_cluster.main.endpoint
      }
    }]
    users = [{
      name = "terraform"
      user = {
        token = data.aws_eks_cluster_auth.main.token
      }
    }]
  }
  sensitive = true
}

# Add-on Information
output "cluster_addons" {
  description = "Map of cluster add-on names to add-on properties"
  value = {
    vpc_cni = {
      arn     = aws_eks_addon.vpc_cni.arn
      status  = aws_eks_addon.vpc_cni.status
      version = aws_eks_addon.vpc_cni.addon_version
    }
    coredns = {
      arn     = aws_eks_addon.coredns.arn
      status  = aws_eks_addon.coredns.status
      version = aws_eks_addon.coredns.addon_version
    }
    kube_proxy = {
      arn     = aws_eks_addon.kube_proxy.arn
      status  = aws_eks_addon.kube_proxy.status
      version = aws_eks_addon.kube_proxy.addon_version
    }
    ebs_csi_driver = {
      arn     = aws_eks_addon.ebs_csi_driver.arn
      status  = aws_eks_addon.ebs_csi_driver.status
      version = aws_eks_addon.ebs_csi_driver.addon_version
    }
  }
}

# CloudWatch Information
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group for cluster logs"
  value       = aws_cloudwatch_log_group.eks_cluster.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group for cluster logs"
  value       = aws_cloudwatch_log_group.eks_cluster.arn
} 