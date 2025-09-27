#!/bin/bash
# Script to manually clear Terraform state locks

set -e

AWS_REGION="us-west-2"
TABLE_NAME="movienight-dashboard-tf-locks"
STATE_KEY="watchparty-bot/terraform.tfstate"

show_help() {
    echo "🔒 Terraform State Lock Management"
    echo "=================================="
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  check     - Check for existing locks"
    echo "  clear     - Clear all locks for the bot state file"
    echo "  list-all  - List all locks in the table"
    echo "  force     - Force clear all locks (use with caution)"
    echo ""
    echo "Examples:"
    echo "  $0 check     # See if there are any locks"
    echo "  $0 clear     # Clear locks for bot state file"
    echo "  $0 force     # Clear ALL locks in the table"
}

check_locks() {
    echo "🔍 Checking for Terraform state locks..."
    echo "Table: $TABLE_NAME"
    echo "State: $STATE_KEY"
    echo ""
    
    # Get locks for our specific state file
    LOCKS=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION" \
        --filter-expression "contains(#path, :state_key)" \
        --expression-attribute-names '{"#path": "Path"}' \
        --expression-attribute-values '{":state_key": {"S": "'$STATE_KEY'"}}' \
        --query 'Items[*].[LockID.S, Path.S, Created.S, Info.S]' \
        --output table 2>/dev/null || echo "No locks found or table doesn't exist")
    
    if [ -n "$LOCKS" ] && [ "$LOCKS" != "None" ] && [[ "$LOCKS" != *"No locks found"* ]]; then
        echo "🔒 Found locks for bot state file:"
        echo "$LOCKS"
        return 0
    else
        echo "✅ No locks found for bot state file"
        return 1
    fi
}

clear_bot_locks() {
    echo "🧹 Clearing locks for bot state file..."
    
    # Get lock IDs for our state file
    LOCK_IDS=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION" \
        --filter-expression "contains(#path, :state_key)" \
        --expression-attribute-names '{"#path": "Path"}' \
        --expression-attribute-values '{":state_key": {"S": "'$STATE_KEY'"}}' \
        --query 'Items[*].LockID.S' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$LOCK_IDS" ] && [ "$LOCK_IDS" != "None" ]; then
        echo "Found locks to clear:"
        for LOCK_ID in $LOCK_IDS; do
            echo "  🗑️ Removing lock: $LOCK_ID"
            aws dynamodb delete-item \
                --table-name "$TABLE_NAME" \
                --region "$AWS_REGION" \
                --key '{"LockID": {"S": "'$LOCK_ID'"}}' \
                && echo "    ✅ Removed successfully" \
                || echo "    ❌ Failed to remove"
        done
        echo ""
        echo "✅ Lock cleanup completed"
    else
        echo "✅ No locks found to clear"
    fi
}

list_all_locks() {
    echo "📋 All locks in the table:"
    echo "========================="
    
    aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION" \
        --query 'Items[*].[LockID.S, Path.S, Created.S]' \
        --output table 2>/dev/null || echo "No locks found or table doesn't exist"
}

force_clear_all() {
    echo "⚠️  FORCE CLEARING ALL LOCKS IN TABLE"
    echo "====================================="
    echo ""
    echo "This will remove ALL Terraform locks, not just bot locks!"
    echo "This could affect other Terraform operations in progress."
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Operation cancelled"
        exit 1
    fi
    
    echo ""
    echo "🗑️ Getting all lock IDs..."
    
    ALL_LOCK_IDS=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION" \
        --query 'Items[*].LockID.S' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$ALL_LOCK_IDS" ] && [ "$ALL_LOCK_IDS" != "None" ]; then
        echo "Found locks to clear:"
        for LOCK_ID in $ALL_LOCK_IDS; do
            echo "  🗑️ Removing lock: $LOCK_ID"
            aws dynamodb delete-item \
                --table-name "$TABLE_NAME" \
                --region "$AWS_REGION" \
                --key '{"LockID": {"S": "'$LOCK_ID'"}}' \
                && echo "    ✅ Removed successfully" \
                || echo "    ❌ Failed to remove"
        done
        echo ""
        echo "✅ Force cleanup completed"
    else
        echo "✅ No locks found to clear"
    fi
}

# Main script logic
case "${1:-}" in
    "check")
        check_locks
        ;;
    "clear")
        clear_bot_locks
        ;;
    "list-all")
        list_all_locks
        ;;
    "force")
        force_clear_all
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
