# Monitoring EC2 Instance for Bot Management

# Data source for latest Amazon Linux 2023 ARM64 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for Monitoring Instance
resource "aws_security_group" "monitoring" {
  count       = var.enable_monitoring_instance ? 1 : 0
  name        = "${var.project_name}-monitoring"
  description = "Security group for bot monitoring instance"
  vpc_id      = data.aws_vpc.main.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access"
  }

  # Outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-monitoring-sg"
  })
}

# IAM Role for Monitoring Instance
resource "aws_iam_role" "monitoring" {
  count = var.enable_monitoring_instance ? 1 : 0
  name  = "${var.project_name}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-monitoring-role"
  })
}

# IAM Policy for ECS and CloudWatch access
resource "aws_iam_role_policy" "monitoring" {
  count = var.enable_monitoring_instance ? 1 : 0
  name  = "${var.project_name}-monitoring-policy"
  role  = aws_iam_role.monitoring[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:UpdateService",
          "ecs:DescribeTaskDefinition",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
          "logs:StartLiveTail",
          "logs:StopLiveTail"
        ]
        Resource = "*"
      }
    ]
  })
}

# Instance Profile
resource "aws_iam_instance_profile" "monitoring" {
  count = var.enable_monitoring_instance ? 1 : 0
  name  = "${var.project_name}-monitoring-profile"
  role  = aws_iam_role.monitoring[0].name

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-monitoring-profile"
  })
}

# User Data Script for Monitoring Instance
locals {
  monitoring_user_data = base64encode(templatefile("${path.module}/scripts/monitoring-setup.sh", {
    project_name    = var.project_name
    aws_region      = var.aws_region
    ecs_cluster     = data.aws_ecs_cluster.main.cluster_name
    beta_service    = "${var.project_name}-beta"
    prod_service    = "${var.project_name}-prod"
    beta_log_group  = "/ecs/${var.project_name}-beta"
    prod_log_group  = "/ecs/${var.project_name}-prod"
  }))
}

# Monitoring EC2 Instance
resource "aws_instance" "monitoring" {
  count                  = var.enable_monitoring_instance ? 1 : 0
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.monitoring_instance_type
  key_name              = var.monitoring_key_name != "" ? var.monitoring_key_name : null
  vpc_security_group_ids = [aws_security_group.monitoring[0].id]
  subnet_id             = data.aws_subnets.public.ids[0]
  iam_instance_profile  = aws_iam_instance_profile.monitoring[0].name

  user_data = local.monitoring_user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-monitoring"
    Type = "monitoring"
  })
}

# Elastic IP for Monitoring Instance
resource "aws_eip" "monitoring" {
  count    = var.enable_monitoring_instance ? 1 : 0
  instance = aws_instance.monitoring[0].id
  domain   = "vpc"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-monitoring-eip"
  })
}
