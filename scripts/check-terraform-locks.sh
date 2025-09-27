#!/usr/bin/env bash
set -euo pipefail

# Make sure we have AWS CLI available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Script to check and manage Terraform state locks in DynamoDB
# Usage: ./scripts/check-terraform-locks.sh [check|unlock]

REGION=${AWS_REGION:-us-west-2}
TABLE_NAME="watchparty-dashboard-tf-locks"
STATE_KEY="watchparty-bot/terraform.tfstate"

ACTION=${1:-check}

echo "🔍 Checking Terraform state locks for bot deployment..."
echo "Region: $REGION"
echo "Table: $TABLE_NAME"
echo "State Key: $STATE_KEY"
echo ""

case $ACTION in
  "check")
    echo "📋 Current locks in DynamoDB table:"
    aws dynamodb scan \
      --table-name "$TABLE_NAME" \
      --region "$REGION" \
      --output table \
      --query 'Items[*].{LockID:LockID.S,Info:Info.S,Created:Created.S,Operation:Operation.S,Path:Path.S,Version:Version.S,Who:Who.S}' \
      || echo "❌ Failed to scan table - check AWS credentials and permissions"
    ;;
    
  "unlock")
    echo "🔓 Attempting to find and remove stale locks..."
    
    # Get all locks for our state file
    LOCKS=$(aws dynamodb scan \
      --table-name "$TABLE_NAME" \
      --region "$REGION" \
      --filter-expression "contains(#path, :state_key)" \
      --expression-attribute-names '{"#path": "Path"}' \
      --expression-attribute-values '{":state_key": {"S": "'$STATE_KEY'"}}' \
      --query 'Items[*].LockID.S' \
      --output text)
    
    if [ -z "$LOCKS" ] || [ "$LOCKS" = "None" ]; then
      echo "✅ No locks found for state file: $STATE_KEY"
    else
      echo "🔒 Found locks for state file:"
      echo "$LOCKS"
      echo ""
      
      for LOCK_ID in $LOCKS; do
        echo "🗑️  Removing lock: $LOCK_ID"
        aws dynamodb delete-item \
          --table-name "$TABLE_NAME" \
          --region "$REGION" \
          --key '{"LockID": {"S": "'$LOCK_ID'"}}' \
          && echo "✅ Successfully removed lock: $LOCK_ID" \
          || echo "❌ Failed to remove lock: $LOCK_ID"
      done
    fi
    ;;
    
  *)
    echo "❌ Invalid action. Use 'check' or 'unlock'"
    echo "Usage: $0 [check|unlock]"
    exit 1
    ;;
esac

echo ""
echo "🏁 Done!"
