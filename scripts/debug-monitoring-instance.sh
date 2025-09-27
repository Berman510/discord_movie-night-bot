#!/bin/bash
# Debug script to check monitoring instance status and setup

set -e

echo "🔍 Debugging Monitoring Instance Setup"
echo "====================================="
echo ""

# Check if monitoring instance exists
echo "1. Checking if monitoring instance exists..."
INSTANCE_ID=$(aws ec2 describe-instances \
    --region us-west-2 \
    --filters "Name=tag:Name,Values=watchparty-bot-monitoring" "Name=instance-state-name,Values=running,pending,stopping,stopped" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text 2>/dev/null || echo "")

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
    echo "❌ No monitoring instance found!"
    echo "   Check if enable_monitoring_instance is set to true in Terraform"
    exit 1
else
    echo "✅ Monitoring instance found: $INSTANCE_ID"
fi

# Get instance details
echo ""
echo "2. Getting instance details..."
INSTANCE_INFO=$(aws ec2 describe-instances \
    --region us-west-2 \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0]' \
    --output json)

STATE=$(echo "$INSTANCE_INFO" | jq -r '.State.Name')
LAUNCH_TIME=$(echo "$INSTANCE_INFO" | jq -r '.LaunchTime')
INSTANCE_TYPE=$(echo "$INSTANCE_INFO" | jq -r '.InstanceType')
PUBLIC_IP=$(echo "$INSTANCE_INFO" | jq -r '.PublicIpAddress // "None"')

echo "   State: $STATE"
echo "   Launch Time: $LAUNCH_TIME"
echo "   Instance Type: $INSTANCE_TYPE"
echo "   Public IP: $PUBLIC_IP"

# Check SSM connectivity
echo ""
echo "3. Checking SSM connectivity..."
SSM_STATUS=$(aws ssm describe-instance-information \
    --region us-west-2 \
    --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text 2>/dev/null || echo "NotFound")

if [ "$SSM_STATUS" = "Online" ]; then
    echo "✅ SSM agent is online and ready"
    echo "   You can connect via Session Manager"
elif [ "$SSM_STATUS" = "NotFound" ]; then
    echo "❌ Instance not found in SSM"
    echo "   SSM agent may not be installed or configured properly"
else
    echo "⚠️  SSM status: $SSM_STATUS"
    echo "   Wait a few minutes for SSM agent to register"
fi

# Check user data execution logs
echo ""
echo "4. Checking user data execution..."
if [ "$STATE" = "running" ] && [ "$SSM_STATUS" = "Online" ]; then
    echo "   Attempting to check user data logs via SSM..."
    
    # Try to get cloud-init logs
    CLOUD_INIT_LOG=$(aws ssm send-command \
        --region us-west-2 \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["tail -50 /var/log/cloud-init-output.log 2>/dev/null || echo \"Log not found\""]' \
        --query 'Command.CommandId' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$CLOUD_INIT_LOG" ]; then
        echo "   Command sent: $CLOUD_INIT_LOG"
        echo "   Wait 10 seconds then check command output..."
        sleep 10
        
        aws ssm get-command-invocation \
            --region us-west-2 \
            --command-id "$CLOUD_INIT_LOG" \
            --instance-id "$INSTANCE_ID" \
            --query 'StandardOutputContent' \
            --output text 2>/dev/null || echo "   Command still running or failed"
    fi
else
    echo "   Cannot check logs - instance not ready or SSM not online"
fi

echo ""
echo "5. Manual connection instructions:"
echo "   🌐 Session Manager: https://us-west-2.console.aws.amazon.com/systems-manager/session-manager/start-session?region=us-west-2"
echo "   🔍 Select instance: $INSTANCE_ID (watchparty-bot-monitoring)"
echo ""
echo "6. Once connected, check these locations:"
echo "   • /var/log/cloud-init-output.log  (user data execution log)"
echo "   • /opt/botmonitor/                (should contain monitoring scripts)"
echo "   • /home/botmonitor/               (botmonitor user home directory)"
echo "   • systemctl status amazon-ssm-agent (SSM agent status)"
echo ""
echo "7. If /opt/botmonitor is missing, run manually:"
echo "   sudo bash /var/lib/cloud/instance/user-data.txt"
