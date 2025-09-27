#!/bin/bash
# Fix phpMyAdmin configuration to force TCP connections

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Fixing phpMyAdmin MySQL Connection Configuration${NC}"
echo "=================================================="

# Find monitoring instance
echo -e "${YELLOW}🔍 Finding monitoring instance...${NC}"
INSTANCE_DATA=$(aws ec2 describe-instances \
    --region "us-west-2" \
    --filters "Name=tag:Name,Values=watchparty-bot-monitoring" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].{InstanceId:InstanceId,PublicIp:PublicIpAddress}' \
    --output json 2>/dev/null)

if [ "$INSTANCE_DATA" = "null" ] || [ -z "$INSTANCE_DATA" ]; then
    echo -e "${RED}❌ No running monitoring instance found${NC}"
    exit 1
fi

INSTANCE_ID=$(echo "$INSTANCE_DATA" | jq -r '.InstanceId')
echo -e "${GREEN}✅ Found instance: $INSTANCE_ID${NC}"

# Get RDS endpoint if available
echo -e "${YELLOW}🔍 Checking for RDS endpoint...${NC}"
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier watchparty-bot-beta \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text 2>/dev/null || echo "")

if [ "$RDS_ENDPOINT" = "None" ] || [ -z "$RDS_ENDPOINT" ]; then
    echo -e "${YELLOW}⚠️  No RDS instance found - will configure PebbleHost only${NC}"
    RDS_CONFIG=""
else
    echo -e "${GREEN}✅ Found RDS endpoint: $RDS_ENDPOINT${NC}"
    RDS_CONFIG="
// AWS RDS MySQL Server
\$i++;
\$cfg['Servers'][\$i]['auth_type'] = 'cookie';
\$cfg['Servers'][\$i]['host'] = '$RDS_ENDPOINT';
\$cfg['Servers'][\$i]['port'] = 3306;
\$cfg['Servers'][\$i]['socket'] = '';
\$cfg['Servers'][\$i]['connect_type'] = 'tcp';
\$cfg['Servers'][\$i]['extension'] = 'mysqli';
\$cfg['Servers'][\$i]['compress'] = false;
\$cfg['Servers'][\$i]['AllowNoPassword'] = false;
\$cfg['Servers'][\$i]['verbose'] = 'AWS RDS MySQL (Beta)';
"
fi

# Create the fixed configuration
echo -e "${YELLOW}🔧 Creating fixed phpMyAdmin configuration...${NC}"

# Create temporary script to run on the instance
cat > /tmp/fix_phpmyadmin.sh << EOF
#!/bin/bash
# Fix phpMyAdmin configuration on monitoring instance

echo "🔧 Updating phpMyAdmin configuration..."

# Backup existing config
cp /var/www/html/phpmyadmin/config.inc.php /var/www/html/phpmyadmin/config.inc.php.backup

# Create new configuration with TCP connections forced
cat > /var/www/html/phpmyadmin/config.inc.php << 'PHPCONFIG'
<?php
\$cfg['blowfish_secret'] = 'WatchPartyBot2024DatabaseMigration32';

\$i = 0;

// PebbleHost MySQL Server
\$i++;
\$cfg['Servers'][\$i]['auth_type'] = 'cookie';
\$cfg['Servers'][\$i]['host'] = 'na01-sql.pebblehost.com';
\$cfg['Servers'][\$i]['port'] = 3306;
\$cfg['Servers'][\$i]['socket'] = '';
\$cfg['Servers'][\$i]['connect_type'] = 'tcp';
\$cfg['Servers'][\$i]['extension'] = 'mysqli';
\$cfg['Servers'][\$i]['compress'] = false;
\$cfg['Servers'][\$i]['AllowNoPassword'] = false;
\$cfg['Servers'][\$i]['verbose'] = 'PebbleHost MySQL (Beta)';

$RDS_CONFIG

\$cfg['ServerDefault'] = 1;
\$cfg['UploadDir'] = '';
\$cfg['SaveDir'] = '';
\$cfg['DefaultLang'] = 'en';
\$cfg['CheckConfigurationPermissions'] = false;
\$cfg['ShowPhpInfo'] = false;
\$cfg['ShowServerInfo'] = false;
\$cfg['ThemeDefault'] = 'pmahomme';

// Additional TCP connection enforcement
ini_set('mysql.default_socket', '');
ini_set('mysqli.default_socket', '');
PHPCONFIG

# Set proper permissions
chown apache:apache /var/www/html/phpmyadmin/config.inc.php
chmod 644 /var/www/html/phpmyadmin/config.inc.php

# Restart Apache to ensure changes take effect
systemctl restart httpd

echo "✅ phpMyAdmin configuration updated successfully!"
echo "🔄 Apache restarted"
EOF

# Copy and execute the script on the instance
echo -e "${YELLOW}📤 Uploading and executing fix script...${NC}"

# Use AWS Systems Manager to run the script
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
        'curl -o /tmp/fix_phpmyadmin.sh https://raw.githubusercontent.com/Berman510/discord_movie-night-bot/v1.16.3/scripts/fix-phpmyadmin-remote.sh 2>/dev/null || cat > /tmp/fix_phpmyadmin.sh << \"SCRIPT_EOF\"
$(cat /tmp/fix_phpmyadmin.sh)
SCRIPT_EOF',
        'chmod +x /tmp/fix_phpmyadmin.sh',
        'sudo /tmp/fix_phpmyadmin.sh',
        'rm /tmp/fix_phpmyadmin.sh'
    ]" \
    --region us-west-2 \
    --output text

echo ""
echo -e "${GREEN}✅ Configuration fix applied!${NC}"
echo ""
echo -e "${CYAN}🔧 Changes Made:${NC}"
echo "  • Forced TCP connections (no Unix sockets)"
echo "  • Set explicit connect_type = 'tcp'"
echo "  • Disabled socket usage in PHP ini settings"
echo "  • Restarted Apache web server"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "  1. Wait 30 seconds for changes to take effect"
echo "  2. Start SSM tunnel: ./scripts/phpmyadmin-tunnel.sh"
echo "  3. Try connecting again: http://localhost:8080/phpmyadmin"
echo ""
echo -e "${BLUE}🔍 If issues persist, check:${NC}"
echo "  • Network connectivity to database servers"
echo "  • Firewall rules on database servers"
echo "  • Database server status and availability"

# Cleanup
rm /tmp/fix_phpmyadmin.sh
