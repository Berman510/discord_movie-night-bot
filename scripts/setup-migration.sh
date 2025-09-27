#!/bin/bash

# Database Migration Setup Script
# Creates environment files and runs the migration from PebbleHost to AWS RDS

set -e

echo "🚀 Setting up database migration for Watch Party Bot Beta..."

# Get AWS region
AWS_REGION=${AWS_REGION:-us-west-2}

# Get PebbleHost credentials from AWS Secrets Manager
echo "📥 Retrieving PebbleHost database credentials..."
PEBBLEHOST_CREDS=$(aws secretsmanager get-secret-value \
    --secret-id watchparty-dashboard/beta/database \
    --region $AWS_REGION \
    --query SecretString --output text)

PEBBLEHOST_HOST=$(echo $PEBBLEHOST_CREDS | jq -r '.host')
PEBBLEHOST_USER=$(echo $PEBBLEHOST_CREDS | jq -r '.username')
PEBBLEHOST_PASS=$(echo $PEBBLEHOST_CREDS | jq -r '.password')
PEBBLEHOST_DB=$(echo $PEBBLEHOST_CREDS | jq -r '.dbname')

echo "✅ PebbleHost credentials retrieved"

# Get AWS RDS credentials from AWS Secrets Manager
echo "📥 Retrieving AWS RDS database credentials..."
RDS_CREDS=$(aws secretsmanager get-secret-value \
    --secret-id watchparty-bot/rds/credentials \
    --region $AWS_REGION \
    --query SecretString --output text 2>/dev/null || echo "{}")

if [ "$RDS_CREDS" = "{}" ]; then
    echo "⚠️  AWS RDS credentials not found. RDS may not be deployed yet."
    echo "   Deploy RDS first with: enable_rds_mysql = true"
    exit 1
fi

RDS_HOST=$(echo $RDS_CREDS | jq -r '.host')
RDS_USER=$(echo $RDS_CREDS | jq -r '.username')
RDS_PASS=$(echo $RDS_CREDS | jq -r '.password')
RDS_DB=$(echo $RDS_CREDS | jq -r '.database')

echo "✅ AWS RDS credentials retrieved"

# Create source environment file (PebbleHost)
cat > .env.pebblehost << EOF
# PebbleHost MySQL Database (Source)
DB_HOST=$PEBBLEHOST_HOST
DB_USER=$PEBBLEHOST_USER
DB_PASSWORD=$PEBBLEHOST_PASS
DB_NAME=$PEBBLEHOST_DB
EOF

echo "✅ Created .env.pebblehost"

# Create target environment file (AWS RDS)
cat > .env.aws << EOF
# AWS RDS MySQL Database (Target)
DB_HOST=$RDS_HOST
DB_USER=$RDS_USER
DB_PASSWORD=$RDS_PASS
DB_NAME=$RDS_DB
EOF

echo "✅ Created .env.aws"

# Install Node.js dependencies for migration script
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install mysql2
else
    echo "📦 Creating package.json and installing dependencies..."
    npm init -y
    npm install mysql2
fi

echo "✅ Dependencies installed"

# Test connections
echo "🔍 Testing database connections..."

echo "  Testing PebbleHost connection..."
mysql -h $PEBBLEHOST_HOST -u $PEBBLEHOST_USER -p$PEBBLEHOST_PASS -e "SELECT 'PebbleHost connection successful' as status;" $PEBBLEHOST_DB

echo "  Testing AWS RDS connection..."
mysql -h $RDS_HOST -u $RDS_USER -p$RDS_PASS -e "SELECT 'AWS RDS connection successful' as status;" $RDS_DB

echo "✅ Both database connections successful!"

# Run the migration
echo ""
echo "🚀 Starting database migration..."
echo "📤 Source: $PEBBLEHOST_USER@$PEBBLEHOST_HOST/$PEBBLEHOST_DB"
echo "📥 Target: $RDS_USER@$RDS_HOST/$RDS_DB"
echo ""

node migrate-database.js --source-env=.env.pebblehost --target-env=.env.aws

echo ""
echo "🎉 Database migration completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update bot configuration to use AWS RDS"
echo "2. Update dashboard configuration to use AWS RDS"
echo "3. Test bot and dashboard functionality"
echo "4. Once confirmed working, you can cancel PebbleHost hosting"
echo ""
echo "🔧 Configuration updates needed:"
echo "  Bot: Update DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in bot environment"
echo "  Dashboard: Update database secrets in AWS Secrets Manager"

# Clean up environment files (security)
echo ""
echo "🧹 Cleaning up temporary environment files..."
rm -f .env.pebblehost .env.aws
echo "✅ Cleanup complete"
