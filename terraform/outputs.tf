# Outputs for Watch Party Bot Infrastructure

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.bot.repository_url
}

output "bot_beta_service_name" {
  description = "Name of the beta bot ECS service"
  value       = aws_ecs_service.bot_beta.name
}

# output "bot_prod_service_name" {
#   description = "Name of the production bot ECS service"
#   value       = aws_ecs_service.bot_prod.name
# }

output "bot_beta_log_group" {
  description = "CloudWatch log group for beta bot"
  value       = aws_cloudwatch_log_group.bot_beta.name
}

# output "bot_prod_log_group" {
#   description = "CloudWatch log group for production bot"
#   value       = aws_cloudwatch_log_group.bot_prod.name
# }

output "bot_beta_secrets_arn" {
  description = "ARN of the beta bot secrets"
  value       = aws_secretsmanager_secret.bot_secrets_beta.arn
  sensitive   = true
}

# output "bot_prod_secrets_arn" {
#   description = "ARN of the production bot secrets"
#   value       = aws_secretsmanager_secret.bot_secrets_prod.arn
#   sensitive   = true
# }

output "monitoring_instance_ip" {
  description = "Public IP of the monitoring instance"
  value       = var.enable_monitoring_instance ? aws_eip.monitoring[0].public_ip : null
}

output "monitoring_instance_id" {
  description = "ID of the monitoring instance"
  value       = var.enable_monitoring_instance ? aws_instance.monitoring[0].id : null
}

output "pebblehost_beta_branch" {
  description = "Recommended PebbleHost branch for beta environment"
  value       = var.pebblehost_beta_branch
}

# output "pebblehost_prod_branch" {
#   description = "Recommended PebbleHost branch for production environment"
#   value       = var.pebblehost_prod_branch
# }
