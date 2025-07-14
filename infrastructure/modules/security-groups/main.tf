# OpsSight DevOps Platform - Security Groups Module
# Security groups for EKS cluster components following cursor development standards

# EKS Cluster Security Group
# Reason: Controls network access for the EKS control plane
resource "aws_security_group" "eks_cluster" {
  name_prefix = "${var.name_prefix}-eks-cluster-"
  vpc_id      = var.vpc_id
  description = "Security group for EKS cluster control plane"

  # Ingress rules for cluster communication
  ingress {
    description = "HTTPS traffic from nodes"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  # Egress rules - allow all outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-cluster-sg"
    Type = "security-group"
    Purpose = "eks-cluster"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# EKS Node Group Security Group
# Reason: Controls network access for worker nodes
resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.name_prefix}-eks-nodes-"
  vpc_id      = var.vpc_id
  description = "Security group for EKS node groups"

  # Ingress rules for node communication
  ingress {
    description = "Node to node communication"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "HTTPS from cluster"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  ingress {
    description = "Kubelet API from cluster"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  # Egress rules - allow all outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-nodes-sg"
    Type = "security-group"
    Purpose = "eks-nodes"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Database Security Group
# Reason: Controls access to RDS instances from application workloads
resource "aws_security_group" "database" {
  name_prefix = "${var.name_prefix}-database-"
  vpc_id      = var.vpc_id
  description = "Security group for database access"

  # Ingress rules for database access
  ingress {
    description = "PostgreSQL from EKS nodes"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  # Egress rules - minimal outbound access
  egress {
    description = "HTTPS for patches/updates"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-database-sg"
    Type = "security-group"
    Purpose = "database"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Application Load Balancer Security Group
# Reason: Controls inbound traffic to the ALB from internet
resource "aws_security_group" "alb" {
  name_prefix = "${var.name_prefix}-alb-"
  vpc_id      = var.vpc_id
  description = "Security group for Application Load Balancer"

  # Ingress rules for web traffic
  ingress {
    description = "HTTP traffic from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "HTTPS traffic from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  # Egress rules to reach EKS nodes
  egress {
    description = "HTTP to EKS nodes"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    description = "HTTP to EKS nodes (standard ports)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    description = "HTTPS to EKS nodes (standard ports)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-alb-sg"
    Type = "security-group"
    Purpose = "load-balancer"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Additional ingress rule for ALB to nodes communication
# Reason: Separate resource to avoid circular dependency issues
resource "aws_security_group_rule" "alb_to_nodes" {
  type                     = "ingress"
  from_port                = 30000
  to_port                  = 32767
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.eks_nodes.id
  description              = "ALB to node group communication"
}

# Additional ingress rule for standard HTTP/HTTPS from ALB
resource "aws_security_group_rule" "alb_to_nodes_http" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.eks_nodes.id
  description              = "ALB to nodes HTTP"
}

resource "aws_security_group_rule" "alb_to_nodes_https" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.eks_nodes.id
  description              = "ALB to nodes HTTPS"
} 