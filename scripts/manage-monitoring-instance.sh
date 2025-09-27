#!/bin/bash
# Management script for monitoring instance Auto Scaling Group

set -e

ASG_NAME="watchparty-bot-monitoring-asg"
AWS_REGION="us-west-2"

show_help() {
    echo "🤖 Monitoring Instance Management"
    echo "================================="
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  status    - Show current ASG and instance status"
    echo "  start     - Start monitoring instance (set desired capacity to 1)"
    echo "  stop      - Stop monitoring instance (set desired capacity to 0)"
    echo "  restart   - Restart monitoring instance (stop then start)"
    echo "  refresh   - Trigger instance refresh with latest launch template"
    echo "  connect   - Show connection instructions"
    echo "  logs      - Show recent cloud-init logs from current instance"
    echo ""
    echo "Examples:"
    echo "  $0 status     # Check if instance is running"
    echo "  $0 restart    # Get a fresh instance with latest config"
    echo "  $0 connect    # Get Session Manager connection info"
}

get_asg_status() {
    aws autoscaling describe-auto-scaling-groups \
        --auto-scaling-group-names "$ASG_NAME" \
        --region "$AWS_REGION" \
        --query 'AutoScalingGroups[0]' \
        --output json 2>/dev/null || echo "{}"
}

get_instance_info() {
    local asg_info="$1"
    local instance_id=$(echo "$asg_info" | jq -r '.Instances[0].InstanceId // empty')
    
    if [ -n "$instance_id" ]; then
        aws ec2 describe-instances \
            --instance-ids "$instance_id" \
            --region "$AWS_REGION" \
            --query 'Reservations[0].Instances[0]' \
            --output json 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

show_status() {
    echo "📊 Monitoring Instance Status"
    echo "============================="
    
    local asg_info=$(get_asg_status)
    local desired=$(echo "$asg_info" | jq -r '.DesiredCapacity // 0')
    local min_size=$(echo "$asg_info" | jq -r '.MinSize // 0')
    local max_size=$(echo "$asg_info" | jq -r '.MaxSize // 0')
    local instance_count=$(echo "$asg_info" | jq -r '.Instances | length')
    
    echo "ASG Configuration:"
    echo "  Desired Capacity: $desired"
    echo "  Min Size: $min_size"
    echo "  Max Size: $max_size"
    echo "  Current Instances: $instance_count"
    echo ""
    
    if [ "$instance_count" -gt 0 ]; then
        local instance_info=$(get_instance_info "$asg_info")
        local instance_id=$(echo "$asg_info" | jq -r '.Instances[0].InstanceId')
        local lifecycle_state=$(echo "$asg_info" | jq -r '.Instances[0].LifecycleState')
        local health_status=$(echo "$asg_info" | jq -r '.Instances[0].HealthStatus')
        local instance_state=$(echo "$instance_info" | jq -r '.State.Name // "unknown"')
        local launch_time=$(echo "$instance_info" | jq -r '.LaunchTime // "unknown"')
        local public_ip=$(echo "$instance_info" | jq -r '.PublicIpAddress // "none"')
        
        echo "Instance Details:"
        echo "  Instance ID: $instance_id"
        echo "  Lifecycle State: $lifecycle_state"
        echo "  Health Status: $health_status"
        echo "  Instance State: $instance_state"
        echo "  Launch Time: $launch_time"
        echo "  Public IP: $public_ip"
        
        # Check SSM connectivity
        local ssm_status=$(aws ssm describe-instance-information \
            --region "$AWS_REGION" \
            --filters "Key=InstanceIds,Values=$instance_id" \
            --query 'InstanceInformationList[0].PingStatus' \
            --output text 2>/dev/null || echo "NotFound")
        
        echo "  SSM Status: $ssm_status"
        
        if [ "$ssm_status" = "Online" ]; then
            echo "  ✅ Ready for Session Manager connection"
        else
            echo "  ⚠️  SSM not ready yet (may take a few minutes after launch)"
        fi
    else
        echo "No instances currently running"
    fi
}

start_instance() {
    echo "🚀 Starting monitoring instance..."
    aws autoscaling set-desired-capacity \
        --auto-scaling-group-name "$ASG_NAME" \
        --desired-capacity 1 \
        --region "$AWS_REGION"
    
    echo "✅ Desired capacity set to 1"
    echo "Instance will launch shortly. Use '$0 status' to check progress."
}

stop_instance() {
    echo "🛑 Stopping monitoring instance..."
    aws autoscaling set-desired-capacity \
        --auto-scaling-group-name "$ASG_NAME" \
        --desired-capacity 0 \
        --region "$AWS_REGION"
    
    echo "✅ Desired capacity set to 0"
    echo "Instance will terminate shortly. Use '$0 status' to check progress."
}

restart_instance() {
    echo "🔄 Restarting monitoring instance..."
    echo "This will give you a fresh instance with the latest configuration."
    echo ""
    
    stop_instance
    echo ""
    echo "Waiting 30 seconds for instance to terminate..."
    sleep 30
    echo ""
    start_instance
}

refresh_instance() {
    echo "🔄 Triggering instance refresh..."
    echo "This will replace the current instance with the latest launch template."
    
    aws autoscaling start-instance-refresh \
        --auto-scaling-group-name "$ASG_NAME" \
        --region "$AWS_REGION" \
        --preferences MinHealthyPercentage=0,InstanceWarmup=300
    
    echo "✅ Instance refresh started"
    echo "Use '$0 status' to monitor progress."
}

show_connection_info() {
    echo "🔗 Connection Information"
    echo "========================"
    
    local asg_info=$(get_asg_status)
    local instance_count=$(echo "$asg_info" | jq -r '.Instances | length')
    
    if [ "$instance_count" -eq 0 ]; then
        echo "❌ No monitoring instance is currently running"
        echo "Run '$0 start' to launch an instance"
        return 1
    fi
    
    local instance_id=$(echo "$asg_info" | jq -r '.Instances[0].InstanceId')
    local instance_info=$(get_instance_info "$asg_info")
    local public_ip=$(echo "$instance_info" | jq -r '.PublicIpAddress // "none"')
    
    echo "Instance ID: $instance_id"
    echo "Public IP: $public_ip"
    echo ""
    echo "🌐 Session Manager (Recommended):"
    echo "   https://$AWS_REGION.console.aws.amazon.com/systems-manager/session-manager/start-session?region=$AWS_REGION"
    echo ""
    echo "🔧 Once connected:"
    echo "   sudo su - botmonitor    # Switch to monitoring user"
    echo "   ./dashboard.sh          # Show bot monitoring dashboard"
    echo "   ./status_beta.sh        # Check beta bot status"
    echo "   ./logs_beta.sh          # View beta bot logs"
}

show_logs() {
    echo "📋 Recent Cloud-Init Logs"
    echo "========================="
    
    local asg_info=$(get_asg_status)
    local instance_count=$(echo "$asg_info" | jq -r '.Instances | length')
    
    if [ "$instance_count" -eq 0 ]; then
        echo "❌ No monitoring instance is currently running"
        return 1
    fi
    
    local instance_id=$(echo "$asg_info" | jq -r '.Instances[0].InstanceId')
    
    echo "Getting logs from instance: $instance_id"
    echo ""
    
    local command_id=$(aws ssm send-command \
        --region "$AWS_REGION" \
        --instance-ids "$instance_id" \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["tail -50 /var/log/cloud-init-output.log 2>/dev/null || echo \"Log not available yet\""]' \
        --query 'Command.CommandId' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$command_id" ]; then
        echo "Command sent, waiting for response..."
        sleep 5
        
        aws ssm get-command-invocation \
            --region "$AWS_REGION" \
            --command-id "$command_id" \
            --instance-id "$instance_id" \
            --query 'StandardOutputContent' \
            --output text 2>/dev/null || echo "Command still running or failed"
    else
        echo "Failed to send command. Instance may not be ready for SSM."
    fi
}

# Main script logic
case "${1:-}" in
    "status")
        show_status
        ;;
    "start")
        start_instance
        ;;
    "stop")
        stop_instance
        ;;
    "restart")
        restart_instance
        ;;
    "refresh")
        refresh_instance
        ;;
    "connect")
        show_connection_info
        ;;
    "logs")
        show_logs
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
