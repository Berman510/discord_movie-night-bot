# ECS Resources for Watch Party Bot

# Bot Secrets - Beta Environment
resource "aws_secretsmanager_secret" "bot_secrets_beta" {
  name                    = "${var.project_name}/beta/secrets"
  description             = "Discord bot secrets for ${var.project_name} (beta)"
  recovery_window_in_days = 0

  tags = merge(local.common_tags, { Name = "${var.project_name}-beta-secrets" })
}

resource "aws_secretsmanager_secret_version" "bot_secrets_beta" {
  secret_id = aws_secretsmanager_secret.bot_secrets_beta.id
  secret_string = jsonencode({
    discord_token           = var.bot_discord_token_beta
    client_id              = var.bot_client_id_beta
    guild_id               = var.bot_guild_id_beta
    omdb_api_key           = var.bot_omdb_api_key_beta
    log_level              = var.bot_log_level_beta
    log_colors             = var.bot_log_colors_beta
    db_migrations_enabled  = var.bot_db_migrations_enabled_beta
    imdb_cache_enabled     = var.bot_imdb_cache_enabled_beta
    imdb_cache_ttl_days    = var.bot_imdb_cache_ttl_days_beta
    imdb_cache_max_rows    = var.bot_imdb_cache_max_rows_beta
    watchparty_ws_enabled  = var.bot_watchparty_ws_enabled_beta
    watchparty_ws_url      = var.bot_watchparty_ws_url_beta
  })
}

# Bot Secrets - Production Environment
resource "aws_secretsmanager_secret" "bot_secrets_prod" {
  name                    = "${var.project_name}/prod/secrets"
  description             = "Discord bot secrets for ${var.project_name} (production)"
  recovery_window_in_days = 0

  tags = merge(local.common_tags, { Name = "${var.project_name}-prod-secrets" })
}

resource "aws_secretsmanager_secret_version" "bot_secrets_prod" {
  secret_id = aws_secretsmanager_secret.bot_secrets_prod.id
  secret_string = jsonencode({
    discord_token = var.bot_discord_token_prod
    client_id     = var.bot_client_id_prod
    guild_id      = var.bot_guild_id_prod
    omdb_api_key  = var.bot_omdb_api_key_prod
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "bot_beta" {
  name              = "/ecs/${var.project_name}-beta"
  retention_in_days = 7

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-beta-logs"
    Environment = "beta"
  })
}

# Production log group
resource "aws_cloudwatch_log_group" "bot_prod" {
  name              = "/ecs/${var.project_name}-prod"
  retention_in_days = 14

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-prod-logs"
    Environment = "production"
  })
}

# Bot Task Definition - Beta
resource "aws_ecs_task_definition" "bot_beta" {
  family                   = "${var.project_name}-beta"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.bot_cpu
  memory                   = var.bot_memory
  execution_role_arn       = data.aws_iam_role.ecs_task_execution.arn
  task_role_arn            = data.aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "bot"
      image = "${aws_ecr_repository.bot.repository_url}:${var.bot_image_tag_beta}"

      environment = [
        { name = "NODE_ENV", value = "production" }
      ]

      secrets = [
        # Bot-specific secrets
        {
          name      = "DISCORD_TOKEN"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:discord_token::"
        },
        {
          name      = "CLIENT_ID"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:client_id::"
        },
        {
          name      = "GUILD_ID"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:guild_id::"
        },
        {
          name      = "OMDB_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:omdb_api_key::"
        },
        {
          name      = "LOG_LEVEL"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:log_level::"
        },
        {
          name      = "LOG_COLORS"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:log_colors::"
        },
        {
          name      = "DB_MIGRATIONS_ENABLED"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:db_migrations_enabled::"
        },
        {
          name      = "IMDB_CACHE_ENABLED"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:imdb_cache_enabled::"
        },
        {
          name      = "IMDB_CACHE_TTL_DAYS"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:imdb_cache_ttl_days::"
        },
        {
          name      = "IMDB_CACHE_MAX_ROWS"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:imdb_cache_max_rows::"
        },
        {
          name      = "WATCHPARTY_WS_ENABLED"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:watchparty_ws_enabled::"
        },
        {
          name      = "WATCHPARTY_WS_URL"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_beta.arn}:watchparty_ws_url::"
        },
        # Shared secrets from dashboard infrastructure
        {
          name      = "WATCHPARTY_WS_TOKEN"
          valueFrom = "${data.aws_secretsmanager_secret.ws_beta.arn}:token::"
        },
        {
          name      = "DB_HOST"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_beta.arn}:host::"
        },
        {
          name      = "DB_USER"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_beta.arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_beta.arn}:password::"
        },
        {
          name      = "DB_NAME"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_beta.arn}:dbname::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.bot_beta.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-beta-task"
    Environment = "beta"
  })
}

# Production task definition
resource "aws_ecs_task_definition" "bot_prod" {
  family                   = "${var.project_name}-prod"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.bot_cpu
  memory                   = var.bot_memory
  execution_role_arn       = data.aws_iam_role.ecs_task_execution.arn
  task_role_arn            = data.aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "bot"
      image = "${aws_ecr_repository.bot.repository_url}:${var.bot_image_tag_prod}"

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "LOG_COLORS", value = "false" },
        { name = "DB_MIGRATIONS_ENABLED", value = "true" },
        { name = "IMDB_CACHE_ENABLED", value = "true" },
        { name = "IMDB_CACHE_TTL_DAYS", value = "90" },
        { name = "IMDB_CACHE_MAX_ROWS", value = "10000" },
        { name = "WATCHPARTY_WS_ENABLED", value = "true" },
        { name = "WATCHPARTY_WS_URL", value = "wss://watchparty.${var.domain_name}/socket" }
      ]

      secrets = [
        {
          name      = "DISCORD_TOKEN"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_prod.arn}:discord_token::"
        },
        {
          name      = "CLIENT_ID"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_prod.arn}:client_id::"
        },
        {
          name      = "GUILD_ID"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_prod.arn}:guild_id::"
        },
        {
          name      = "OMDB_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.bot_secrets_prod.arn}:omdb_api_key::"
        },
        {
          name      = "WATCHPARTY_WS_TOKEN"
          valueFrom = "${data.aws_secretsmanager_secret.ws_prod.arn}:token::"
        },
        {
          name      = "DB_HOST"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_prod.arn}:host::"
        },
        {
          name      = "DB_USER"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_prod.arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_prod.arn}:password::"
        },
        {
          name      = "DB_NAME"
          valueFrom = "${data.aws_secretsmanager_secret.db_credentials_prod.arn}:dbname::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.bot_prod.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-prod-task"
    Environment = "production"
  })
}

# Bot Service - Beta
resource "aws_ecs_service" "bot_beta" {
  name            = "${var.project_name}-beta"
  cluster         = data.aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.bot_beta.arn
  desired_count   = 1

  # Use Fargate Spot for 70% cost savings
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight           = 100
  }

  network_configuration {
    security_groups  = [data.aws_security_group.ecs_tasks.id]
    subnets          = data.aws_subnets.public.ids
    assign_public_ip = true
  }

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-beta-service"
    Environment = "beta"
  })
}

# Production service
resource "aws_ecs_service" "bot_prod" {
  name            = "${var.project_name}-prod"
  cluster         = data.aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.bot_prod.arn
  desired_count   = 1

  # Use Fargate Spot for 70% cost savings
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight           = 100
  }

  network_configuration {
    security_groups  = [data.aws_security_group.ecs_tasks.id]
    subnets          = data.aws_subnets.public.ids
    assign_public_ip = true
  }

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-prod-service"
    Environment = "production"
  })
}
