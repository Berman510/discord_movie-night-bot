# Lambda-based Discord Bot Infrastructure
# Phase 3: Cost optimization through serverless architecture
# Only created when enable_lambda_bot = true

# Data source for RDS instance (conditional)
data "aws_db_instance" "main" {
  count                  = var.enable_lambda_bot && var.enable_rds_mysql ? 1 : 0
  db_instance_identifier = aws_db_instance.main[0].id
}

# DynamoDB table for bot state (votes, sessions, payloads)
resource "aws_dynamodb_table" "bot_state" {
  count          = var.enable_lambda_bot ? 1 : 0
  name           = "${var.project_name}-bot-state"
  billing_mode   = "PAY_PER_REQUEST"  # Cost-optimized for low traffic
  hash_key       = "pk"
  range_key      = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk" 
    type = "S"
  }

  attribute {
    name = "ttl"
    type = "N"
  }

  # TTL for automatic cleanup of votes and temporary data
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Global Secondary Index for querying by type
  global_secondary_index {
    name     = "type-index"
    hash_key = "type"
    projection_type = "ALL"
  }

  attribute {
    name = "type"
    type = "S"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-bot-state"
  })
}

# API Gateway for Discord interactions
resource "aws_apigatewayv2_api" "discord_bot" {
  count         = var.enable_lambda_bot ? 1 : 0
  name          = "${var.project_name}-discord-api"
  protocol_type = "HTTP"
  description   = "Discord bot interaction endpoint"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["content-type", "x-signature-ed25519", "x-signature-timestamp"]
    allow_methods     = ["POST", "OPTIONS"]
    allow_origins     = ["https://discord.com"]
    max_age          = 86400
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-discord-api"
  })
}

# Lambda function for Discord interactions
resource "aws_lambda_function" "discord_handler" {
  count            = var.enable_lambda_bot ? 1 : 0
  filename         = "discord-handler.zip"
  function_name    = "${var.project_name}-discord-handler"
  role            = aws_iam_role.lambda_discord[0].arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 512

  # Provisioned concurrency for zero cold starts
  reserved_concurrent_executions = 10

  environment {
    variables = {
      DISCORD_PUBLIC_KEY = var.environment == "beta" ? var.discord_public_key_beta : var.discord_public_key_prod
      DYNAMODB_TABLE     = aws_dynamodb_table.bot_state[0].name
      RDS_ENDPOINT       = var.enable_rds_mysql ? data.aws_db_instance.main[0].endpoint : ""
      ENVIRONMENT        = var.environment
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_discord_basic,
    aws_iam_role_policy_attachment.lambda_discord_dynamodb,
    aws_iam_role_policy_attachment.lambda_discord_rds,
  ]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-discord-handler"
  })
}

# Provisioned concurrency for zero cold starts
resource "aws_lambda_provisioned_concurrency_config" "discord_handler" {
  count                             = var.enable_lambda_bot ? 1 : 0
  function_name                     = aws_lambda_function.discord_handler[0].function_name
  provisioned_concurrent_executions = 1
  qualifier                         = aws_lambda_function.discord_handler[0].version
}

# IAM role for Discord Lambda
resource "aws_iam_role" "lambda_discord" {
  count = var.enable_lambda_bot ? 1 : 0
  name = "${var.project_name}-lambda-discord-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-lambda-discord-role"
  })
}

# Basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_discord_basic" {
  count      = var.enable_lambda_bot ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_discord[0].name
}

# DynamoDB access policy
resource "aws_iam_role_policy" "lambda_discord_dynamodb" {
  count = var.enable_lambda_bot ? 1 : 0
  name  = "${var.project_name}-lambda-discord-dynamodb-${var.environment}"
  role  = aws_iam_role.lambda_discord[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.bot_state[0].arn,
          "${aws_dynamodb_table.bot_state[0].arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_discord_dynamodb" {
  count      = var.enable_lambda_bot ? 1 : 0
  policy_arn = aws_iam_policy.lambda_discord_dynamodb[0].arn
  role       = aws_iam_role.lambda_discord[0].name
}

resource "aws_iam_policy" "lambda_discord_dynamodb" {
  count       = var.enable_lambda_bot ? 1 : 0
  name        = "${var.project_name}-lambda-discord-dynamodb-${var.environment}"
  description = "DynamoDB access for Discord Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.bot_state[0].arn,
          "${aws_dynamodb_table.bot_state[0].arn}/index/*"
        ]
      }
    ]
  })
}

# RDS access policy (for existing MySQL database)
resource "aws_iam_role_policy" "lambda_discord_rds" {
  count = var.enable_lambda_bot && var.enable_rds_mysql ? 1 : 0
  name  = "${var.project_name}-lambda-discord-rds-${var.environment}"
  role  = aws_iam_role.lambda_discord[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_discord_rds" {
  count      = var.enable_lambda_bot && var.enable_rds_mysql ? 1 : 0
  policy_arn = aws_iam_policy.lambda_discord_rds[0].arn
  role       = aws_iam_role.lambda_discord[0].name
}

resource "aws_iam_policy" "lambda_discord_rds" {
  count       = var.enable_lambda_bot && var.enable_rds_mysql ? 1 : 0
  name        = "${var.project_name}-lambda-discord-rds-${var.environment}"
  description = "RDS access for Discord Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = "*"
      }
    ]
  })
}

# API Gateway integration with Lambda
resource "aws_apigatewayv2_integration" "discord_handler" {
  count            = var.enable_lambda_bot ? 1 : 0
  api_id           = aws_apigatewayv2_api.discord_bot[0].id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.discord_handler[0].invoke_arn
}

# API Gateway route
resource "aws_apigatewayv2_route" "discord_interactions" {
  count     = var.enable_lambda_bot ? 1 : 0
  api_id    = aws_apigatewayv2_api.discord_bot[0].id
  route_key = "POST /interactions"
  target    = "integrations/${aws_apigatewayv2_integration.discord_handler[0].id}"
}

# API Gateway stage
resource "aws_apigatewayv2_stage" "discord_bot" {
  count   = var.enable_lambda_bot ? 1 : 0
  api_id  = aws_apigatewayv2_api.discord_bot[0].id
  name        = var.environment
  auto_deploy = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-discord-api-${var.environment}"
  })
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  count         = var.enable_lambda_bot ? 1 : 0
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.discord_handler[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.discord_bot[0].execution_arn}/*/*"
}

# EventBridge rule for session scheduling
resource "aws_cloudwatch_event_rule" "session_scheduler" {
  name                = "${var.project_name}-session-scheduler"
  description         = "Trigger session end detection every minute"
  schedule_expression = "rate(1 minute)"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-session-scheduler"
  })
}

# Lambda function for session scheduling
resource "aws_lambda_function" "session_scheduler" {
  filename         = "session-scheduler.zip"
  function_name    = "${var.project_name}-session-scheduler"
  role            = aws_iam_role.lambda_scheduler.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300  # 5 minutes max
  memory_size     = 256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.bot_state.name
      RDS_ENDPOINT   = var.enable_rds_mysql ? data.aws_db_instance.main[0].endpoint : ""
      ENVIRONMENT    = var.environment
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_scheduler_basic,
    aws_iam_role_policy_attachment.lambda_scheduler_dynamodb,
    aws_iam_role_policy_attachment.lambda_scheduler_rds,
  ]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-session-scheduler"
  })
}

# EventBridge target for session scheduler
resource "aws_cloudwatch_event_target" "session_scheduler" {
  rule      = aws_cloudwatch_event_rule.session_scheduler.name
  target_id = "SessionSchedulerTarget"
  arn       = aws_lambda_function.session_scheduler.arn
}

# Lambda permission for EventBridge
resource "aws_lambda_permission" "eventbridge_scheduler" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.session_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.session_scheduler.arn
}

# IAM role for scheduler Lambda
resource "aws_iam_role" "lambda_scheduler" {
  name = "${var.project_name}-lambda-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-lambda-scheduler-role"
  })
}

resource "aws_iam_role_policy_attachment" "lambda_scheduler_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_scheduler.name
}

resource "aws_iam_role_policy_attachment" "lambda_scheduler_dynamodb" {
  policy_arn = aws_iam_policy.lambda_discord_dynamodb[0].arn
  role       = aws_iam_role.lambda_scheduler.name
}

resource "aws_iam_role_policy_attachment" "lambda_scheduler_rds" {
  policy_arn = aws_iam_policy.lambda_discord_rds[0].arn
  role       = aws_iam_role.lambda_scheduler.name
}

# Outputs
output "discord_api_endpoint" {
  description = "Discord API Gateway endpoint"
  value       = var.enable_lambda_bot ? "${aws_apigatewayv2_api.discord_bot[0].api_endpoint}/${var.environment}" : null
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for bot state"
  value       = var.enable_lambda_bot ? aws_dynamodb_table.bot_state[0].name : null
}
