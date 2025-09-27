#!/bin/bash
# Update monitoring instance security group with current IP address

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Monitoring Instance IP Update Script${NC}"
echo "========================================"

# Get current public IP
echo -e "${YELLOW}🔍 Detecting current public IP address...${NC}"
CURRENT_IP=$(curl -s https://ipinfo.io/ip || curl -s https://api.ipify.org || curl -s https://checkip.amazonaws.com)

if [ -z "$CURRENT_IP" ]; then
    echo -e "${RED}❌ Failed to detect current IP address${NC}"
    echo "Please check your internet connection and try again"
    exit 1
fi

echo -e "${GREEN}✅ Current IP detected: $CURRENT_IP${NC}"

# Find monitoring security group
echo -e "${YELLOW}🔍 Finding monitoring security group...${NC}"
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=watchparty-bot-monitoring" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null)

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
    echo -e "${RED}❌ Monitoring security group not found${NC}"
    echo "Make sure the monitoring instance is deployed"
    exit 1
fi

echo -e "${GREEN}✅ Security group found: $SG_ID${NC}"

# Get current rules
echo -e "${YELLOW}🔍 Checking current security group rules...${NC}"
CURRENT_RULES=$(aws ec2 describe-security-groups \
    --group-ids "$SG_ID" \
    --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` || FromPort==`443`]' \
    --output json)

# Remove existing HTTP/HTTPS rules
if [ "$CURRENT_RULES" != "[]" ]; then
    echo -e "${YELLOW}🗑️ Removing existing HTTP/HTTPS rules...${NC}"
    
    # Extract existing rules for HTTP (port 80)
    HTTP_RULES=$(echo "$CURRENT_RULES" | jq '.[] | select(.FromPort==80)')
    if [ "$HTTP_RULES" != "" ]; then
        aws ec2 revoke-security-group-ingress \
            --group-id "$SG_ID" \
            --ip-permissions "$HTTP_RULES" 2>/dev/null || true
    fi
    
    # Extract existing rules for HTTPS (port 443)
    HTTPS_RULES=$(echo "$CURRENT_RULES" | jq '.[] | select(.FromPort==443)')
    if [ "$HTTPS_RULES" != "" ]; then
        aws ec2 revoke-security-group-ingress \
            --group-id "$SG_ID" \
            --ip-permissions "$HTTPS_RULES" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Old rules removed${NC}"
fi

# Add new rules with current IP
echo -e "${YELLOW}🔐 Adding new rules for IP: $CURRENT_IP${NC}"

# Add HTTP rule
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --ip-permissions '[{
        "IpProtocol": "tcp",
        "FromPort": 80,
        "ToPort": 80,
        "IpRanges": [{"CidrIp": "'${CURRENT_IP}'/32", "Description": "HTTP access for phpMyAdmin"}]
    }]'

# Add HTTPS rule
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --ip-permissions '[{
        "IpProtocol": "tcp",
        "FromPort": 443,
        "ToPort": 443,
        "IpRanges": [{"CidrIp": "'${CURRENT_IP}'/32", "Description": "HTTPS access for phpMyAdmin"}]
    }]'

echo -e "${GREEN}✅ Security group updated successfully!${NC}"

# Get monitoring instance IP
INSTANCE_IP=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=watchparty-bot-monitoring" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text 2>/dev/null)

if [ "$INSTANCE_IP" != "None" ] && [ -n "$INSTANCE_IP" ]; then
    echo ""
    echo -e "${BLUE}🌐 phpMyAdmin Access Information:${NC}"
    echo "=================================="
    echo -e "URL: ${GREEN}http://$INSTANCE_IP/phpmyadmin${NC}"
    echo -e "Your IP: ${GREEN}$CURRENT_IP${NC}"
    echo ""
    echo -e "${YELLOW}💡 Note: Only your current IP ($CURRENT_IP) can access phpMyAdmin${NC}"
    echo -e "${YELLOW}   Run this script again if your IP changes${NC}"
else
    echo -e "${YELLOW}⚠️ Monitoring instance not found or not running${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Update complete!${NC}"
