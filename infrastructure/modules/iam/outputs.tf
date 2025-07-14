# IAM Module Outputs

output "eks_cluster_service_role_arn" {
  description = "ARN of the EKS cluster service role"
  value       = aws_iam_role.eks_cluster_service_role.arn
}

output "eks_cluster_service_role_name" {
  description = "Name of the EKS cluster service role"
  value       = aws_iam_role.eks_cluster_service_role.name
}

output "eks_node_group_role_arn" {
  description = "ARN of the EKS node group role"
  value       = aws_iam_role.eks_node_group_role.arn
}

output "eks_node_group_role_name" {
  description = "Name of the EKS node group role"
  value       = aws_iam_role.eks_node_group_role.name
}

output "application_service_role_arn" {
  description = "ARN of the application service role"
  value       = aws_iam_role.application_service_role.arn
}

output "application_service_role_name" {
  description = "Name of the application service role"
  value       = aws_iam_role.application_service_role.name
}

output "load_balancer_controller_role_arn" {
  description = "ARN of the Load Balancer Controller role"
  value       = aws_iam_role.load_balancer_controller_role.arn
}

output "load_balancer_controller_role_name" {
  description = "Name of the Load Balancer Controller role"
  value       = aws_iam_role.load_balancer_controller_role.name
}

output "application_service_policy_arn" {
  description = "ARN of the application service policy"
  value       = aws_iam_policy.application_service_policy.arn
}

output "load_balancer_controller_policy_arn" {
  description = "ARN of the Load Balancer Controller policy"
  value       = aws_iam_policy.load_balancer_controller_policy.arn
} 