# OpsSight DevOps Platform - EKS Module
# EKS cluster configuration following cursor development standards

# EKS Cluster
# Reason: Creates the managed Kubernetes control plane
resource "aws_eks_cluster" "main" {
  name     = "${var.name_prefix}-cluster"
  role_arn = var.cluster_service_role_arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(var.private_subnet_ids, var.public_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = var.endpoint_public_access
    public_access_cidrs     = var.endpoint_public_access ? var.public_access_cidrs : []
    security_group_ids      = [var.cluster_security_group_id]
  }

  # Logging configuration for cluster audit and API server logs
  enabled_cluster_log_types = var.cluster_log_types

  # Encryption configuration for secrets
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-cluster"
    Type = "eks-cluster"
  })

  # Reason: Ensure cluster is deleted before dependencies
  depends_on = [
    aws_cloudwatch_log_group.eks_cluster,
  ]
}

# KMS Key for EKS encryption
# Reason: Encrypts Kubernetes secrets at rest
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key for ${var.name_prefix}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-kms-key"
    Type = "kms-key"
  })
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.name_prefix}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# CloudWatch Log Group for EKS cluster logs
# Reason: Centralized logging for cluster audit and API server
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.name_prefix}-cluster/cluster"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-cluster-logs"
    Type = "log-group"
  })
}

# OIDC Identity Provider
# Reason: Enables IAM roles for Kubernetes service accounts
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-oidc"
    Type = "oidc-provider"
  })
}

# EKS Add-ons
# Reason: Essential cluster components for networking and storage

# VPC CNI add-on for pod networking
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
  resolve_conflicts = "OVERWRITE"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-vpc-cni-addon"
    Type = "eks-addon"
  })
}

# CoreDNS add-on for DNS resolution
resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"
  resolve_conflicts = "OVERWRITE"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-coredns-addon"
    Type = "eks-addon"
  })

  depends_on = [aws_eks_node_group.main]
}

# kube-proxy add-on for network proxy
resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"
  resolve_conflicts = "OVERWRITE"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-kube-proxy-addon"
    Type = "eks-addon"
  })
}

# EBS CSI Driver add-on for persistent storage
resource "aws_eks_addon" "ebs_csi_driver" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "aws-ebs-csi-driver"
  resolve_conflicts = "OVERWRITE"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ebs-csi-driver-addon"
    Type = "eks-addon"
  })
}

# Data source for EKS cluster auth
# Reason: Required for updating kubeconfig
data "aws_eks_cluster" "main" {
  name = aws_eks_cluster.main.name
}

data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
} 