# Terraform State Lock Troubleshooting

## Current Issue: State Lock Failures

The beta bot deployment is failing due to Terraform state lock issues. This typically happens when:

1. A previous Terraform run was interrupted (GitHub Actions canceled, network issues, etc.)
2. Multiple concurrent runs attempted to modify the same state
3. The DynamoDB lock table has stale lock entries

## Diagnosis Steps

### 1. Check Current Locks

Run the diagnosis script to see current locks:

```bash
cd discord_movie-night-bot
chmod +x scripts/check-terraform-locks.sh
./scripts/check-terraform-locks.sh check
```

### 2. Manual DynamoDB Check

You can also check directly with AWS CLI:

```bash
aws dynamodb scan \
  --table-name watchparty-dashboard-tf-locks \
  --region us-west-2 \
  --output table
```

## Resolution Steps

### Option 1: Automated Cleanup (Recommended)

Use the provided script to remove stale locks:

```bash
./scripts/check-terraform-locks.sh unlock
```

### Option 2: Manual Cleanup

If you need to manually remove specific locks:

```bash
# List all locks
aws dynamodb scan \
  --table-name watchparty-dashboard-tf-locks \
  --region us-west-2 \
  --query 'Items[*].{LockID:LockID.S,Path:Path.S,Who:Who.S,Created:Created.S}'

# Remove specific lock (replace LOCK_ID with actual ID)
aws dynamodb delete-item \
  --table-name watchparty-dashboard-tf-locks \
  --region us-west-2 \
  --key '{"LockID": {"S": "LOCK_ID_HERE"}}'
```

### Option 3: Terraform Force Unlock

If you have the lock ID from a failed run:

```bash
cd discord_movie-night-bot/terraform
terraform force-unlock LOCK_ID
```

## After Resolving Locks

1. **Verify locks are cleared:**

   ```bash
   ./scripts/check-terraform-locks.sh check
   ```

2. **Retry the deployment:**
   - Via GitHub Actions: Go to Actions → Deploy Beta Infrastructure → Run workflow
   - Or manually: `cd terraform && terraform plan` then `terraform apply`

## Prevention

To prevent future lock issues:

1. **Don't cancel GitHub Actions** during Terraform apply operations
2. **Wait for runs to complete** before starting new ones
3. **Use workflow_dispatch** for manual deployments instead of pushing to trigger branches
4. **Monitor the Actions tab** for any stuck or long-running workflows

## Current Configuration

- **State Backend**: S3 bucket `watchparty-dashboard-tfstate-321447295215-us-west-2`
- **Lock Table**: DynamoDB table `watchparty-dashboard-tf-locks`
- **State Key**: `watchparty-bot/terraform.tfstate`
- **Region**: `us-west-2`

## Next Steps for Beta Deployment

Once locks are cleared:

1. Ensure all GitHub secrets are properly configured
2. Run the beta infrastructure deployment workflow
3. Monitor the deployment logs for any other issues
4. Verify the ECS service starts successfully

## Common Lock Scenarios

- **GitHub Actions canceled**: Leaves lock in DynamoDB, needs manual cleanup
- **Network timeout**: May leave partial lock, check and clean
- **Multiple workflows**: Concurrent runs conflict, one succeeds, others fail
- **Permission issues**: May create lock but fail to complete, needs cleanup
