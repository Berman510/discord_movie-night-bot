# Watch Party Bot Infrastructure

This Terraform configuration deploys the Discord Watch Party Bot to AWS ECS Fargate with both beta and production environments.

## Deployment Status
- ✅ Beta infrastructure ready for deployment
- ✅ IAM trust policies updated for bot repository

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Beta Bot      │    │   Prod Bot      │
│   ECS Service   │    │   ECS Service   │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────┐
         │  Shared ECS     │
         │  Cluster        │
         └─────────────────┘
                     │
         ┌─────────────────┐
         │  Dashboard      │
         │  Infrastructure │
         └─────────────────┘
```

## Prerequisites

1. **Dashboard Infrastructure**: This assumes your dashboard infrastructure is already deployed
2. **AWS CLI**: Configured with appropriate permissions
3. **Terraform**: Version >= 1.0

## Setup

### 1. Configure Backend

```bash
cp backend.hcl.example backend.hcl
# Edit backend.hcl with your S3 bucket details
```

### 2. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your bot secrets
```

### 3. Initialize and Deploy

```bash
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

## Environment Configuration

### Beta Environment
- **Service**: `watchparty-bot-beta`
- **WebSocket**: `wss://watchparty-beta.bermanoc.net/socket`
- **Database**: Shared beta database with dashboard
- **Logging**: 7-day retention

### Production Environment
- **Service**: `watchparty-bot-prod`
- **WebSocket**: `wss://watchparty.bermanoc.net/socket`
- **Database**: Shared production database with dashboard
- **Logging**: 14-day retention

## Deployment

### Automatic Deployment
- **Beta**: Pushes to `v1.16.3`, `develop`, or `beta` branches
- **Production**: Pushes to `main` or `master` branches

### Manual Deployment
```bash
# Deploy to beta
gh workflow run deploy-beta.yml

# Deploy to production
gh workflow run deploy-bot.yml -f environment=prod
```

## Monitoring

### View Logs
```bash
# Beta logs
aws logs tail /ecs/watchparty-bot-beta --follow

# Production logs
aws logs tail /ecs/watchparty-bot-prod --follow
```

### Check Service Status
```bash
# Beta service
aws ecs describe-services --cluster watchparty-cluster --services watchparty-bot-beta

# Production service
aws ecs describe-services --cluster watchparty-cluster --services watchparty-bot-prod
```

## Cost Optimization

- **Fargate Spot**: 70% cost savings over regular Fargate
- **Shared Infrastructure**: Reuses existing VPC, subnets, security groups
- **Right-sized Resources**: 256 CPU, 512MB RAM (adjustable)

## Security

- **Secrets Management**: All sensitive data stored in AWS Secrets Manager
- **IAM Roles**: Least-privilege access using existing dashboard roles
- **VPC**: Deployed in existing VPC with proper security groups
- **Container Security**: Non-root user, minimal Alpine image

## Troubleshooting

### Common Issues

1. **Service won't start**: Check CloudWatch logs for errors
2. **Database connection**: Verify database secrets are correct
3. **WebSocket connection**: Ensure dashboard is running and accessible

### Debug Commands

```bash
# Get task details
aws ecs describe-tasks --cluster watchparty-cluster --tasks $(aws ecs list-tasks --cluster watchparty-cluster --service-name watchparty-bot-beta --query 'taskArns[0]' --output text)

# Check secrets
aws secretsmanager get-secret-value --secret-id watchparty-bot/beta/secrets
```
