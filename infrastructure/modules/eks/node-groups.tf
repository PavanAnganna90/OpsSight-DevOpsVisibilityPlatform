# OpsSight DevOps Platform - EKS Node Groups
# Managed node group configuration following cursor development standards

# Launch Template for Node Groups
# Reason: Provides consistent configuration and user data for worker nodes
resource "aws_launch_template" "eks_nodes" {
  name_prefix   = "${var.name_prefix}-eks-nodes-"
  description   = "Launch template for EKS managed node groups"
  image_id      = data.aws_ssm_parameter.eks_ami_id.value
  instance_type = var.node_group_instance_types[0]

  vpc_security_group_ids = [var.node_security_group_id]

  # User data for EKS node initialization
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    cluster_name        = aws_eks_cluster.main.name
    cluster_endpoint    = aws_eks_cluster.main.endpoint
    cluster_ca_data     = aws_eks_cluster.main.certificate_authority[0].data
    bootstrap_arguments = var.bootstrap_arguments
  }))

  # Block device mapping for root volume
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.node_disk_size
      volume_type          = "gp3"
      encrypted            = true
      delete_on_termination = true
    }
  }

  # Instance metadata configuration for security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.name_prefix}-eks-node"
      Type = "eks-node"
    })
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-node-launch-template"
    Type = "launch-template"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Primary EKS Managed Node Group
# Reason: Provides compute capacity for Kubernetes workloads
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.name_prefix}-main-nodes"
  node_role_arn   = var.node_group_role_arn
  subnet_ids      = var.private_subnet_ids

  # Node group scaling configuration
  scaling_config {
    desired_size = var.node_group_scaling_config.desired_size
    max_size     = var.node_group_scaling_config.max_size
    min_size     = var.node_group_scaling_config.min_size
  }

  # Update configuration for rolling updates
  update_config {
    max_unavailable_percentage = 25
  }

  # Instance configuration
  instance_types = var.node_group_instance_types
  ami_type       = "AL2_x86_64"
  capacity_type  = var.enable_spot_instances ? "SPOT" : "ON_DEMAND"
  disk_size      = var.node_disk_size

  # Launch template association
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }

  # Remote access configuration (disabled for security)
  # remote_access {
  #   ec2_ssh_key = var.ssh_key_name
  #   source_security_group_ids = [var.ssh_security_group_id]
  # }

  # Labels for workload scheduling
  labels = {
    Environment = var.environment
    NodeGroup   = "main"
    WorkloadType = "general"
  }

  # Taints for specialized workloads (none for general purpose nodes)
  # taint {
  #   key    = "dedicated"
  #   value  = "general"
  #   effect = "NO_SCHEDULE"
  # }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-main-node-group"
    Type = "eks-node-group"
  })

  # Reason: Ensure proper ordering of resource creation
  depends_on = [
    aws_eks_cluster.main,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# Spot Instance Node Group (optional)
# Reason: Cost optimization for non-critical workloads
resource "aws_eks_node_group" "spot" {
  count = var.enable_spot_instances ? 1 : 0

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.name_prefix}-spot-nodes"
  node_role_arn   = var.node_group_role_arn
  subnet_ids      = var.private_subnet_ids

  # Spot instances scaling configuration
  scaling_config {
    desired_size = var.spot_node_group_scaling_config.desired_size
    max_size     = var.spot_node_group_scaling_config.max_size
    min_size     = var.spot_node_group_scaling_config.min_size
  }

  # Update configuration for rolling updates
  update_config {
    max_unavailable_percentage = 50  # Higher for spot instances
  }

  # Instance configuration for spot instances
  instance_types = var.spot_instance_types
  ami_type       = "AL2_x86_64"
  capacity_type  = "SPOT"
  disk_size      = var.node_disk_size

  # Launch template association
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }

  # Labels for spot instance identification
  labels = {
    Environment = var.environment
    NodeGroup   = "spot"
    WorkloadType = "batch"
    "kubernetes.io/arch" = "amd64"
  }

  # Taints for spot instances to prevent critical workloads
  taint {
    key    = "spot-instance"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-spot-node-group"
    Type = "eks-node-group"
    CostOptimization = "spot-instances"
  })

  depends_on = [
    aws_eks_cluster.main,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# Data source for EKS optimized AMI
# Reason: Always use the latest EKS optimized AMI for security patches
data "aws_ssm_parameter" "eks_ami_id" {
  name = "/aws/service/eks/optimized-ami/${var.kubernetes_version}/amazon-linux-2/recommended/image_id"
} 