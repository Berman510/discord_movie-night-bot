# Watch Party Bot Infrastructure
# This creates the ECS infrastructure for the Discord bot

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Configure via backend.hcl file
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Common tags for all resources
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Repository  = "discord_movie-night-bot"
  }
}

# Data sources to reference existing dashboard infrastructure
data "aws_vpc" "main" {
  tags = {
    Name = "watchparty-dashboard-vpc"
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Type = "Public"
  }
}

data "aws_security_group" "ecs_tasks" {
  filter {
    name   = "group-name"
    values = ["watchparty-dashboard-ecs-tasks-*"]
  }
}

data "aws_ecs_cluster" "main" {
  cluster_name = "watchparty-dashboard-cluster"
}

# Reference existing IAM roles from dashboard
data "aws_iam_role" "ecs_task_execution" {
  name = "watchparty-dashboard-ecs-task-execution"
}

data "aws_iam_role" "ecs_task" {
  name = "watchparty-dashboard-ecs-task"
}

# Reference existing database secrets
data "aws_secretsmanager_secret" "db_credentials_beta" {
  name = "watchparty-dashboard/beta/database"
}

# Production secrets (disabled for beta-only deployment)
# data "aws_secretsmanager_secret" "db_credentials_prod" {
#   name = "${var.dashboard_project_name}/prod/database"
# }

data "aws_secretsmanager_secret" "ws_beta" {
  name = "watchparty-dashboard/beta/ws"
}

data "aws_secretsmanager_secret" "db_beta" {
  name = "watchparty-dashboard/beta/database"
}

# Add bot secrets access to existing ECS task execution role
resource "aws_iam_role_policy" "bot_secrets_access" {
  name = "watchparty-bot-secrets-access"
  role = data.aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.bot_secrets_beta.arn,
          data.aws_secretsmanager_secret.ws_beta.arn,
          data.aws_secretsmanager_secret.db_beta.arn,
          # Add production secrets when enabled
          # aws_secretsmanager_secret.bot_secrets_prod.arn,
          # data.aws_secretsmanager_secret.ws_prod.arn,
          # data.aws_secretsmanager_secret.db_prod.arn,
        ]
      }
    ]
  })
}

# data "aws_secretsmanager_secret" "ws_prod" {
#   name = "${var.dashboard_project_name}/prod/websocket"
# }

# ECR Repository for Bot
resource "aws_ecr_repository" "bot" {
  name                 = "${var.project_name}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ecr"
  })
}
