# RDS MySQL Database for Discord Bot and Dashboard
# Free tier eligible: db.t3.micro with 20GB storage

# Data sources for VPC and subnets
data "aws_vpc" "rds_vpc" {
  count = var.enable_rds_mysql ? 1 : 0
  tags = {
    Name = "watchparty-dashboard-vpc"
  }
}

data "aws_subnets" "rds_private" {
  count = var.enable_rds_mysql ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.rds_vpc[0].id]
  }
  tags = {
    Type = "Private"
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  count      = var.enable_rds_mysql ? 1 : 0
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.rds_private[0].ids

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-db-subnet-group"
  })
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  count       = var.enable_rds_mysql ? 1 : 0
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS MySQL database"
  vpc_id      = data.aws_vpc.rds_vpc[0].id

  # Allow MySQL access from ECS tasks and Lambda functions
  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # VPC CIDR for ECS access
    description = "MySQL access from ECS tasks"
  }

  # Allow MySQL access from Lambda functions (if enabled)
  dynamic "ingress" {
    for_each = var.enable_lambda_bot ? [1] : []
    content {
      from_port       = 3306
      to_port         = 3306
      protocol        = "tcp"
      security_groups = [aws_security_group.lambda_rds[0].id]
      description     = "MySQL access from Lambda"
    }
  }



  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-rds-sg"
  })
}

# Security Group for Lambda to access RDS
resource "aws_security_group" "lambda_rds" {
  count       = var.enable_rds_mysql ? 1 : 0
  name        = "${var.project_name}-lambda-rds-sg"
  description = "Security group for Lambda functions to access RDS"
  vpc_id      = data.aws_vpc.main.id

  egress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "MySQL access to RDS"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for AWS services"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-lambda-rds-sg"
  })
}

# Random password for RDS
resource "random_password" "rds_password" {
  count   = var.enable_rds_mysql ? 1 : 0
  length  = 32
  special = true
}

# RDS MySQL Instance (Free Tier Eligible)
resource "aws_db_instance" "main" {
  count = var.enable_rds_mysql ? 1 : 0

  # Instance configuration
  identifier     = "${var.project_name}-mysql"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.micro"  # Free tier eligible

  # Storage configuration (Free tier: 20GB)
  allocated_storage     = 20
  max_allocated_storage = 100  # Auto-scaling up to 100GB
  storage_type          = "gp2"
  storage_encrypted     = true

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.rds_password[0].result

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"  # UTC
  maintenance_window     = "sun:04:00-sun:05:00"  # UTC

  # Performance and monitoring
  performance_insights_enabled = false  # Not available on t3.micro
  monitoring_interval         = 0       # Disable enhanced monitoring for cost

  # Deletion protection
  deletion_protection = false  # Set to true for production
  skip_final_snapshot = true   # Set to false for production

  # Parameter group for MySQL 8.0
  parameter_group_name = "default.mysql8.0"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-mysql"
  })
}

# Store RDS credentials in Secrets Manager
resource "aws_secretsmanager_secret" "rds_credentials" {
  count       = var.enable_rds_mysql ? 1 : 0
  name        = "${var.project_name}/rds/credentials"
  description = "RDS MySQL credentials for bot and dashboard"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-rds-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "rds_credentials" {
  count     = var.enable_rds_mysql ? 1 : 0
  secret_id = aws_secretsmanager_secret.rds_credentials[0].id
  secret_string = jsonencode({
    host     = aws_db_instance.main[0].endpoint
    port     = aws_db_instance.main[0].port
    username = aws_db_instance.main[0].username
    password = random_password.rds_password[0].result
    database = aws_db_instance.main[0].db_name
  })
}

# Outputs
output "rds_endpoint" {
  description = "RDS MySQL endpoint"
  value       = var.enable_rds_mysql ? aws_db_instance.main[0].endpoint : null
}

output "rds_port" {
  description = "RDS MySQL port"
  value       = var.enable_rds_mysql ? aws_db_instance.main[0].port : null
}

output "rds_database_name" {
  description = "RDS MySQL database name"
  value       = var.enable_rds_mysql ? aws_db_instance.main[0].db_name : null
}

output "rds_secret_arn" {
  description = "ARN of the RDS credentials secret"
  value       = var.enable_rds_mysql ? aws_secretsmanager_secret.rds_credentials[0].arn : null
}
