#!/bin/bash

# phpMyAdmin Setup Script for EC2 Monitoring Instance
# Sets up phpMyAdmin with both PebbleHost and AWS RDS MySQL access

set -e

echo "🚀 Setting up phpMyAdmin on monitoring instance..."

# Update system
sudo apt-get update -y

# Install Apache, PHP, and required extensions
sudo apt-get install -y apache2 php php-mysql php-mbstring php-zip php-gd php-json php-curl unzip wget

# Enable Apache modules
sudo a2enmod rewrite
sudo systemctl restart apache2

# Download and install phpMyAdmin
cd /tmp
PHPMYADMIN_VERSION="5.2.1"
wget https://files.phpmyadmin.net/phpMyAdmin/${PHPMYADMIN_VERSION}/phpMyAdmin-${PHPMYADMIN_VERSION}-all-languages.zip
unzip phpMyAdmin-${PHPMYADMIN_VERSION}-all-languages.zip
sudo mv phpMyAdmin-${PHPMYADMIN_VERSION}-all-languages /var/www/html/phpmyadmin
sudo chown -R www-data:www-data /var/www/html/phpmyadmin

# Create phpMyAdmin configuration
sudo tee /var/www/html/phpmyadmin/config.inc.php > /dev/null << 'EOF'
<?php
/**
 * phpMyAdmin configuration for Watch Party Bot
 * Supports both PebbleHost and AWS RDS MySQL connections
 */

// Blowfish secret for cookie encryption
$cfg['blowfish_secret'] = 'CHANGE_THIS_TO_A_32_CHARACTER_RANDOM_STRING_12345';

// Server configuration array
$i = 0;

// PebbleHost MySQL Server
$i++;
$cfg['Servers'][$i]['auth_type'] = 'cookie';
$cfg['Servers'][$i]['host'] = 'na01-sql.pebblehost.com';
$cfg['Servers'][$i]['port'] = 3306;
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowNoPassword'] = false;
$cfg['Servers'][$i]['verbose'] = 'PebbleHost MySQL (Beta)';

// AWS RDS MySQL Server (when available)
$i++;
$cfg['Servers'][$i]['auth_type'] = 'cookie';
$cfg['Servers'][$i]['host'] = 'RDS_ENDPOINT_PLACEHOLDER';
$cfg['Servers'][$i]['port'] = 3306;
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowNoPassword'] = false;
$cfg['Servers'][$i]['verbose'] = 'AWS RDS MySQL (Beta)';

// Default server
$cfg['ServerDefault'] = 1;

// Other configuration
$cfg['UploadDir'] = '';
$cfg['SaveDir'] = '';
$cfg['DefaultLang'] = 'en';
$cfg['DefaultConnectionCollation'] = 'utf8mb4_unicode_ci';

// Security settings
$cfg['CheckConfigurationPermissions'] = false;
$cfg['ShowPhpInfo'] = false;
$cfg['ShowServerInfo'] = false;
$cfg['Servers'][$i]['hide_db'] = '^(information_schema|performance_schema|mysql|sys)$';

// Theme
$cfg['ThemeDefault'] = 'pmahomme';
EOF

# Set proper permissions
sudo chmod 644 /var/www/html/phpmyadmin/config.inc.php

# Create Apache virtual host for phpMyAdmin
sudo tee /etc/apache2/sites-available/phpmyadmin.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html/phpmyadmin
    ServerName phpmyadmin
    
    <Directory /var/www/html/phpmyadmin>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Security headers
        Header always set X-Content-Type-Options nosniff
        Header always set X-Frame-Options DENY
        Header always set X-XSS-Protection "1; mode=block"
    </Directory>
    
    # Disable server signature
    ServerTokens Prod
    ServerSignature Off
    
    ErrorLog ${APACHE_LOG_DIR}/phpmyadmin_error.log
    CustomLog ${APACHE_LOG_DIR}/phpmyadmin_access.log combined
</VirtualHost>
EOF

# Enable the site and disable default
sudo a2ensite phpmyadmin.conf
sudo a2dissite 000-default.conf
sudo systemctl reload apache2

# Create a simple index page with connection info
sudo tee /var/www/html/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Watch Party Bot - Database Management</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 10px; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
        a { color: #007cba; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .credentials { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Watch Party Bot - Database Management</h1>
        
        <div class="info">
            <h3>📊 phpMyAdmin Access</h3>
            <p><a href="/phpmyadmin">Access phpMyAdmin →</a></p>
            <p>Manage both PebbleHost and AWS RDS MySQL databases from a single interface.</p>
        </div>
        
        <div class="warning">
            <h3>🔐 Security Notice</h3>
            <p>This instance is for development/migration purposes only. Ensure proper security groups are configured.</p>
        </div>
        
        <h3>🗄️ Database Connections</h3>
        
        <h4>PebbleHost MySQL (Current)</h4>
        <div class="credentials">
            Host: na01-sql.pebblehost.com<br>
            Port: 3306<br>
            Database: customer_1122173_movie-night-beta<br>
            Username: customer_1122173_movie-night-beta<br>
            Password: [Available in AWS Secrets Manager]
        </div>
        
        <h4>AWS RDS MySQL (Migration Target)</h4>
        <div class="credentials">
            Host: [Will be available after RDS deployment]<br>
            Port: 3306<br>
            Database: watchparty_bot<br>
            Username: watchparty_user<br>
            Password: [Auto-generated, stored in AWS Secrets Manager]
        </div>
        
        <h3>🔧 Migration Tools</h3>
        <p>Database migration script available at: <code>/home/ubuntu/migrate-database.js</code></p>
        <p>Run with: <code>node migrate-database.js --source-env=.env.pebblehost --target-env=.env.aws</code></p>
    </div>
</body>
</html>
EOF

# Install Node.js for migration script
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL client for testing
sudo apt-get install -y mysql-client

echo "✅ phpMyAdmin setup complete!"
echo "🌐 Access phpMyAdmin at: http://[INSTANCE_IP]/phpmyadmin"
echo "📋 Instance info page at: http://[INSTANCE_IP]/"
echo ""
echo "🔑 Next steps:"
echo "1. Update RDS endpoint in phpMyAdmin config after RDS deployment"
echo "2. Copy migration script to instance"
echo "3. Set up environment files for migration"
