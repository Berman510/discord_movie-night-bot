# Variables for Watch Party Bot Infrastructure

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Name of the bot project"
  type        = string
  default     = "watchparty-bot"
}

variable "dashboard_project_name" {
  description = "Name of the dashboard project (to reference existing resources)"
  type        = string
  default     = "watchparty"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Domain name for WebSocket connections"
  type        = string
  default     = "bermanoc.net"
}

# Bot Configuration
variable "bot_cpu" {
  description = "CPU units for bot task"
  type        = number
  default     = 256  # Minimum valid Fargate configuration (0.25 vCPU)
}

variable "bot_memory" {
  description = "Memory for bot task"
  type        = number
  default     = 512  # Minimum valid Fargate configuration (512 MiB)
}

variable "bot_image_tag_beta" {
  description = "ECR image tag for bot (beta)"
  type        = string
  default     = "beta-latest"
}

variable "bot_image_tag_prod" {
  description = "ECR image tag for bot (production)"
  type        = string
  default     = "prod-latest"
}

# PebbleHost Integration Variables
variable "pebblehost_beta_branch" {
  description = "Git branch/tag for PebbleHost beta environment"
  type        = string
  default     = "v1.16.3"
}

variable "pebblehost_prod_branch" {
  description = "Git branch/tag for PebbleHost production environment"
  type        = string
  default     = "main"
}

# Monitoring Configuration
variable "enable_monitoring_instance" {
  description = "Enable EC2 monitoring instance"
  type        = bool
  default     = false  # Disabled for cost optimization - save $3.60/month
}

variable "monitoring_instance_type" {
  description = "EC2 instance type for monitoring"
  type        = string
  default     = "t4g.nano"
}

variable "monitoring_key_name" {
  description = "EC2 key pair name for monitoring instance"
  type        = string
  default     = ""
}

variable "monitoring_desired_capacity" {
  description = "Desired capacity for monitoring ASG (0 to disable, 1 to enable)"
  type        = number
  default     = 1
}

# Bot Secrets - Beta Environment
variable "bot_discord_token_beta" {
  description = "Discord bot token for beta environment"
  type        = string
  sensitive   = true
}

variable "bot_client_id_beta" {
  description = "Discord bot client ID for beta environment"
  type        = string
}

variable "bot_guild_id_beta" {
  description = "Discord guild ID for beta development (optional)"
  type        = string
  default     = ""
}

variable "bot_omdb_api_key_beta" {
  description = "OMDB API key for beta environment"
  type        = string
  sensitive   = true
}



variable "bot_log_level_beta" {
  description = "Log level for beta environment"
  type        = string
  default     = "DEBUG"
}

variable "bot_log_colors_beta" {
  description = "Enable log colors for beta environment"
  type        = string
  default     = "false"
}

variable "bot_db_migrations_enabled_beta" {
  description = "Enable database migrations for beta environment"
  type        = string
  default     = "true"
}

variable "bot_imdb_cache_enabled_beta" {
  description = "Enable IMDB cache for beta environment"
  type        = string
  default     = "true"
}

variable "bot_imdb_cache_ttl_days_beta" {
  description = "IMDB cache TTL in days for beta environment"
  type        = string
  default     = "90"
}

variable "bot_imdb_cache_max_rows_beta" {
  description = "IMDB cache max rows for beta environment"
  type        = string
  default     = "10000"
}

variable "bot_watchparty_ws_enabled_beta" {
  description = "Enable WebSocket for beta environment"
  type        = string
  default     = "true"
}

variable "bot_watchparty_ws_url_beta" {
  description = "WebSocket URL for beta environment"
  type        = string
  default     = "wss://watchparty-beta.bermanoc.net/socket"
}

# Bot Secrets - Production Environment (optional for beta-only deployment)
variable "bot_discord_token_prod" {
  description = "Discord bot token for production environment"
  type        = string
  sensitive   = true
  default     = ""
}

variable "bot_client_id_prod" {
  description = "Discord bot client ID for production environment"
  type        = string
  default     = ""
}

variable "bot_guild_id_prod" {
  description = "Discord guild ID for production development (optional)"
  type        = string
  default     = ""
}

variable "bot_omdb_api_key_prod" {
  description = "OMDB API key for production environment"
  type        = string
  sensitive   = true
  default     = ""
}

# Lambda Configuration (Phase 3 Cost Optimization)
variable "enable_lambda_bot" {
  description = "Enable Lambda-based bot (Phase 3 cost optimization)"
  type        = bool
  default     = false  # Disabled by default, enable for testing
}

variable "discord_public_key_beta" {
  description = "Discord application public key for beta interaction verification"
  type        = string
  default     = ""
  sensitive   = true
}

variable "discord_public_key_prod" {
  description = "Discord application public key for prod interaction verification"
  type        = string
  default     = ""
  sensitive   = true
}
