#!/bin/bash
# Secure phpMyAdmin access via SSM port forwarding tunnel
# Industry standard approach - no open HTTP ports needed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Secure phpMyAdmin Tunnel via AWS SSM${NC}"
echo "============================================="
echo ""

# Configuration
LOCAL_PORT=${1:-8080}
REMOTE_PORT=80
REGION="us-west-2"

echo -e "${CYAN}📋 Configuration:${NC}"
echo "  Local Port:  $LOCAL_PORT"
echo "  Remote Port: $REMOTE_PORT"
echo "  Region:      $REGION"
echo ""

# Check if Session Manager plugin is installed
if ! command -v session-manager-plugin &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS Session Manager plugin not found${NC}"
    echo ""
    echo -e "${CYAN}📦 Installation Instructions:${NC}"
    echo ""
    echo -e "${YELLOW}macOS (Homebrew):${NC}"
    echo "  brew install --cask session-manager-plugin"
    echo ""
    echo -e "${YELLOW}macOS (Manual):${NC}"
    echo "  curl 'https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac_arm64/sessionmanager-bundle.zip' -o 'sessionmanager-bundle.zip'"
    echo "  unzip sessionmanager-bundle.zip"
    echo "  sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin"
    echo ""
    echo -e "${YELLOW}Linux:${NC}"
    echo "  curl 'https://s3.amazonaws.com/session-manager-downloads/plugin/latest/linux_64bit/session-manager-plugin.rpm' -o 'session-manager-plugin.rpm'"
    echo "  sudo yum install -y session-manager-plugin.rpm"
    echo ""
    echo -e "${YELLOW}Windows:${NC}"
    echo "  Download from: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
    echo ""
    exit 1
fi

# Find monitoring instance
echo -e "${YELLOW}🔍 Finding monitoring instance...${NC}"
INSTANCE_DATA=$(aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=watchparty-bot-monitoring" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].{InstanceId:InstanceId,PublicIp:PublicIpAddress,State:State.Name}' \
    --output json 2>/dev/null)

if [ "$INSTANCE_DATA" = "null" ] || [ -z "$INSTANCE_DATA" ]; then
    echo -e "${RED}❌ No running monitoring instance found${NC}"
    echo ""
    echo -e "${YELLOW}💡 Possible solutions:${NC}"
    echo "  1. Check if monitoring instance is deployed: aws ec2 describe-instances --filters 'Name=tag:Name,Values=*monitoring*'"
    echo "  2. Wait for infrastructure deployment to complete"
    echo "  3. Check Auto Scaling Group status"
    echo ""
    exit 1
fi

INSTANCE_ID=$(echo "$INSTANCE_DATA" | jq -r '.InstanceId')
PUBLIC_IP=$(echo "$INSTANCE_DATA" | jq -r '.PublicIp // "N/A"')
STATE=$(echo "$INSTANCE_DATA" | jq -r '.State')

echo -e "${GREEN}✅ Monitoring instance found:${NC}"
echo "  Instance ID: $INSTANCE_ID"
echo "  Public IP:   $PUBLIC_IP"
echo "  State:       $STATE"
echo ""

# Check if local port is available
if lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $LOCAL_PORT is already in use${NC}"
    echo ""
    echo -e "${CYAN}🔧 Try a different port:${NC}"
    echo "  $0 8081"
    echo "  $0 8082"
    echo ""
    exit 1
fi

# Start SSM port forwarding session
echo -e "${YELLOW}🚀 Starting secure tunnel...${NC}"
echo ""
echo -e "${CYAN}📡 SSM Port Forwarding Details:${NC}"
echo "  Instance:    $INSTANCE_ID"
echo "  Local:       localhost:$LOCAL_PORT"
echo "  Remote:      $INSTANCE_ID:$REMOTE_PORT"
echo "  Protocol:    SSM Session Manager"
echo ""

echo -e "${GREEN}🌐 phpMyAdmin will be available at:${NC}"
echo -e "${CYAN}  http://localhost:$LOCAL_PORT/phpmyadmin${NC}"
echo ""

echo -e "${YELLOW}💡 Usage Instructions:${NC}"
echo "  1. Keep this terminal open (tunnel active)"
echo "  2. Open browser to: http://localhost:$LOCAL_PORT/phpmyadmin"
echo "  3. Press Ctrl+C to close tunnel when done"
echo ""

echo -e "${YELLOW}🔒 Security Notes:${NC}"
echo "  • No open HTTP ports on the instance"
echo "  • Traffic encrypted via SSM"
echo "  • Uses your AWS credentials"
echo "  • Only accessible from your machine"
echo ""

# Trap Ctrl+C to clean up
trap 'echo -e "\n${YELLOW}🛑 Tunnel closed${NC}"; exit 0' INT

echo -e "${GREEN}🔗 Starting tunnel... (Press Ctrl+C to stop)${NC}"
echo "=================================================="

# Start the port forwarding session
aws ssm start-session \
    --region "$REGION" \
    --target "$INSTANCE_ID" \
    --document-name AWS-StartPortForwardingSession \
    --parameters "portNumber=$REMOTE_PORT,localPortNumber=$LOCAL_PORT"
