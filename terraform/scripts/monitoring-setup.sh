#!/bin/bash
# Monitoring Instance Setup Script for Watch Party Bot

set -e

# Update system
yum update -y

# Install required packages (handle curl conflicts)
yum install -y \
    aws-cli \
    jq \
    htop \
    tmux \
    git \
    wget \
    httpd \
    php \
    php-mysqlnd \
    php-mbstring \
    php-zip \
    php-gd \
    php-json \
    unzip \
    mysql

# Install curl separately with conflict resolution
yum install -y curl --allowerasing || yum install -y curl --skip-broken || echo "curl already available"

# Install and start SSM agent for Session Manager access
yum install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Configure AWS CLI region
aws configure set region ${aws_region}

# Create monitoring user
useradd -m -s /bin/bash botmonitor
usermod -aG wheel botmonitor

# Create monitoring scripts directory
mkdir -p /opt/botmonitor/scripts
mkdir -p /opt/botmonitor/logs
chown -R botmonitor:botmonitor /opt/botmonitor

# Create console connection scripts
cat > /opt/botmonitor/scripts/console_connect_beta.sh << 'EOF'
#!/bin/bash
# Connect to Beta Bot Console Logs

echo "🔍 Connecting to Beta Bot Console Logs..."
echo "Press Ctrl+C to exit"
echo "----------------------------------------"

aws logs tail ${beta_log_group} \
    --follow \
    --format short \
    --region ${aws_region}
EOF

cat > /opt/botmonitor/scripts/console_connect_prod.sh << 'EOF'
#!/bin/bash
# Connect to Production Bot Console Logs

echo "🔍 Connecting to Production Bot Console Logs..."
echo "Press Ctrl+C to exit"
echo "----------------------------------------"

aws logs tail ${prod_log_group} \
    --follow \
    --format short \
    --region ${aws_region}
EOF

cat > /opt/botmonitor/scripts/restart_beta.sh << 'EOF'
#!/bin/bash
# Restart Beta Bot Service

echo "🔄 Restarting Beta Bot Service..."

aws ecs update-service \
    --cluster ${ecs_cluster} \
    --service ${beta_service} \
    --force-new-deployment \
    --region ${aws_region}

echo "✅ Beta bot restart initiated"
echo "Use ./status_beta.sh to check deployment status"
EOF

cat > /opt/botmonitor/scripts/restart_prod.sh << 'EOF'
#!/bin/bash
# Restart Production Bot Service

echo "🔄 Restarting Production Bot Service..."

aws ecs update-service \
    --cluster ${ecs_cluster} \
    --service ${prod_service} \
    --force-new-deployment \
    --region ${aws_region}

echo "✅ Production bot restart initiated"
echo "Use ./status_prod.sh to check deployment status"
EOF

cat > /opt/botmonitor/scripts/status_beta.sh << 'EOF'
#!/bin/bash
# Check Beta Bot Status

echo "📊 Beta Bot Service Status"
echo "========================="

SERVICE_STATUS=$(aws ecs describe-services \
    --cluster ${ecs_cluster} \
    --services ${beta_service} \
    --region ${aws_region} \
    --query 'services[0]' \
    --output json)

RUNNING_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.runningCount')
DESIRED_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.desiredCount')
DEPLOYMENT_STATUS=$(echo "$SERVICE_STATUS" | jq -r '.deployments[0].status')
TASK_DEFINITION=$(echo "$SERVICE_STATUS" | jq -r '.taskDefinition' | cut -d'/' -f2)

echo "Service: ${beta_service}"
echo "Running Tasks: $RUNNING_COUNT/$DESIRED_COUNT"
echo "Deployment Status: $DEPLOYMENT_STATUS"
echo "Task Definition: $TASK_DEFINITION"

if [ "$RUNNING_COUNT" -gt "0" ]; then
    echo "✅ Beta bot is running"
else
    echo "❌ Beta bot is not running"
fi
EOF

cat > /opt/botmonitor/scripts/status_prod.sh << 'EOF'
#!/bin/bash
# Check Production Bot Status

echo "📊 Production Bot Service Status"
echo "==============================="

SERVICE_STATUS=$(aws ecs describe-services \
    --cluster ${ecs_cluster} \
    --services ${prod_service} \
    --region ${aws_region} \
    --query 'services[0]' \
    --output json)

RUNNING_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.runningCount')
DESIRED_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.desiredCount')
DEPLOYMENT_STATUS=$(echo "$SERVICE_STATUS" | jq -r '.deployments[0].status')
TASK_DEFINITION=$(echo "$SERVICE_STATUS" | jq -r '.taskDefinition' | cut -d'/' -f2)

echo "Service: ${prod_service}"
echo "Running Tasks: $RUNNING_COUNT/$DESIRED_COUNT"
echo "Deployment Status: $DEPLOYMENT_STATUS"
echo "Task Definition: $TASK_DEFINITION"

if [ "$RUNNING_COUNT" -gt "0" ]; then
    echo "✅ Production bot is running"
else
    echo "❌ Production bot is not running"
fi
EOF

cat > /opt/botmonitor/scripts/dashboard.sh << 'EOF'
#!/bin/bash
# Bot Monitoring Dashboard

clear
echo "🤖 Watch Party Bot Monitoring Dashboard"
echo "======================================"
echo ""

# Get both service statuses
BETA_STATUS=$(aws ecs describe-services --cluster ${ecs_cluster} --services ${beta_service} --region ${aws_region} --query 'services[0]' --output json 2>/dev/null || echo '{}')
PROD_STATUS=$(aws ecs describe-services --cluster ${ecs_cluster} --services ${prod_service} --region ${aws_region} --query 'services[0]' --output json 2>/dev/null || echo '{}')

BETA_RUNNING=$(echo "$BETA_STATUS" | jq -r '.runningCount // 0')
BETA_DESIRED=$(echo "$BETA_STATUS" | jq -r '.desiredCount // 0')
PROD_RUNNING=$(echo "$PROD_STATUS" | jq -r '.runningCount // 0')
PROD_DESIRED=$(echo "$PROD_STATUS" | jq -r '.desiredCount // 0')

echo "📊 Service Status:"
echo "  Beta:       $BETA_RUNNING/$BETA_DESIRED tasks running"
echo "  Production: $PROD_RUNNING/$PROD_DESIRED tasks running"
echo ""

echo "🔧 Available Commands:"
echo "  ./console_connect_beta.sh  - View beta bot logs"
echo "  ./console_connect_prod.sh  - View production bot logs"
echo "  ./restart_beta.sh          - Restart beta bot"
echo "  ./restart_prod.sh          - Restart production bot"
echo "  ./status_beta.sh           - Check beta bot status"
echo "  ./status_prod.sh           - Check production bot status"
echo ""

echo "💡 Tips:"
echo "  - Use 'tmux' to run multiple console sessions"
echo "  - Logs are also available in CloudWatch"
echo "  - Check GitHub Actions for deployment status"
EOF

# Make all scripts executable
chmod +x /opt/botmonitor/scripts/*.sh

# Create symlinks in botmonitor home
sudo -u botmonitor ln -sf /opt/botmonitor/scripts/* /home/botmonitor/

# Create welcome message
cat > /home/botmonitor/.bashrc << 'EOF'
# Bot Monitor .bashrc

# Source global definitions
if [ -f /etc/bashrc ]; then
    . /etc/bashrc
fi

# Custom prompt
export PS1='\[\033[01;32m\]botmonitor@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

# Aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias logs-beta='./console_connect_beta.sh'
alias logs-prod='./console_connect_prod.sh'
alias status='./dashboard.sh'

# Welcome message
echo ""
echo "🤖 Welcome to Watch Party Bot Monitoring"
echo "========================================"
echo ""
echo "Quick commands:"
echo "  status           - Show bot dashboard"
echo "  logs-beta        - View beta bot logs"
echo "  logs-prod        - View production bot logs"
echo ""
echo "Run './dashboard.sh' for full command list"
echo ""
EOF

chown botmonitor:botmonitor /home/botmonitor/.bashrc

# Set up log rotation
cat > /etc/logrotate.d/botmonitor << 'EOF'
/opt/botmonitor/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 botmonitor botmonitor
}
EOF

echo "✅ Bot monitoring setup completed"
echo ""
echo "🔗 Connection Options:"
echo "  SSH: ssh botmonitor@$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "  SSM: Use AWS Session Manager in the browser (recommended)"
echo "       https://console.aws.amazon.com/systems-manager/session-manager"
echo ""
echo "💡 SSM Session Manager provides secure browser-based terminal access"

# Setup phpMyAdmin if requested
%{ if setup_phpmyadmin }
echo ""
echo "🗄️ Setting up phpMyAdmin..."

# Start Apache
systemctl enable httpd
systemctl start httpd

# Download and install phpMyAdmin
cd /tmp
PHPMYADMIN_VERSION="5.2.1"
wget -q https://files.phpmyadmin.net/phpMyAdmin/$${PHPMYADMIN_VERSION}/phpMyAdmin-$${PHPMYADMIN_VERSION}-all-languages.zip
unzip -q phpMyAdmin-$${PHPMYADMIN_VERSION}-all-languages.zip
mv phpMyAdmin-$${PHPMYADMIN_VERSION}-all-languages /var/www/html/phpmyadmin
chown -R apache:apache /var/www/html/phpmyadmin

# Create phpMyAdmin configuration
cat > /var/www/html/phpmyadmin/config.inc.php << 'PHPCONFIG'
<?php
$$cfg['blowfish_secret'] = 'WatchPartyBot2024DatabaseMigration32';

$$i = 0;

// PebbleHost MySQL Server
$$i++;
$$cfg['Servers'][$$i]['auth_type'] = 'cookie';
$$cfg['Servers'][$$i]['host'] = 'na01-sql.pebblehost.com';
$$cfg['Servers'][$$i]['port'] = 3306;
$$cfg['Servers'][$$i]['compress'] = false;
$$cfg['Servers'][$$i]['AllowNoPassword'] = false;
$$cfg['Servers'][$$i]['verbose'] = 'PebbleHost MySQL (Beta)';

%{ if rds_endpoint != "" }
// AWS RDS MySQL Server
$$i++;
$$cfg['Servers'][$$i]['auth_type'] = 'cookie';
$$cfg['Servers'][$$i]['host'] = '${rds_endpoint}';
$$cfg['Servers'][$$i]['port'] = 3306;
$$cfg['Servers'][$$i]['compress'] = false;
$$cfg['Servers'][$$i]['AllowNoPassword'] = false;
$$cfg['Servers'][$$i]['verbose'] = 'AWS RDS MySQL (Beta)';
%{ endif }

$$cfg['ServerDefault'] = 1;
$$cfg['UploadDir'] = '';
$$cfg['SaveDir'] = '';
$$cfg['DefaultLang'] = 'en';
$$cfg['CheckConfigurationPermissions'] = false;
$$cfg['ShowPhpInfo'] = false;
$$cfg['ShowServerInfo'] = false;
$$cfg['ThemeDefault'] = 'pmahomme';
PHPCONFIG

chmod 644 /var/www/html/phpmyadmin/config.inc.php

# Install Node.js for migration script
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

echo "✅ phpMyAdmin setup complete!"
echo "🌐 phpMyAdmin: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/phpmyadmin"
%{ endif }
