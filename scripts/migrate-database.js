#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates data from PebbleHost MySQL to AWS RDS MySQL
 * 
 * Usage:
 *   node scripts/migrate-database.js --source-env=.env.pebblehost --target-env=.env.aws
 *   
 * Or set environment variables directly:
 *   SOURCE_DB_HOST=pebblehost.mysql.com SOURCE_DB_USER=user1 ... node scripts/migrate-database.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const _path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const sourceEnvFile = args.find(arg => arg.startsWith('--source-env='))?.split('=')[1];
const targetEnvFile = args.find(arg => arg.startsWith('--target-env='))?.split('=')[1];

// Load environment files if specified
async function loadEnvFile(filePath) {
  if (!filePath) return {};
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=');
        }
      }
    });
    
    return env;
  } catch (error) {
    console.error(`Failed to load env file ${filePath}:`, error.message);
    return {};
  }
}

async function createConnection(config, label) {
  try {
    console.log(`🔌 Connecting to ${label} database at ${config.host}:${config.port}...`);
    
    const connection = mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 60000,
    });
    
    // Test connection
    await connection.execute('SELECT 1');
    console.log(`✅ Connected to ${label} database`);
    
    return connection;
  } catch (error) {
    console.error(`❌ Failed to connect to ${label} database:`, error.message);
    throw error;
  }
}

async function getTables(connection) {
  const [rows] = await connection.execute('SHOW TABLES');
  return rows.map(row => Object.values(row)[0]);
}

async function getTableSchema(connection, tableName) {
  const [rows] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
  return rows[0]['Create Table'];
}

async function getTableData(connection, tableName) {
  const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
  return rows;
}

async function createTable(connection, createStatement) {
  await connection.execute(createStatement);
}

async function insertData(connection, tableName, data) {
  if (data.length === 0) return;
  
  const columns = Object.keys(data[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const columnNames = columns.map(col => `\`${col}\``).join(', ');
  
  const insertSQL = `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${placeholders})`;
  
  for (const row of data) {
    const values = columns.map(col => row[col]);
    await connection.execute(insertSQL, values);
  }
}

async function main() {
  try {
    // Load environment configurations
    const sourceEnv = sourceEnvFile ? await loadEnvFile(sourceEnvFile) : {};
    const targetEnv = targetEnvFile ? await loadEnvFile(targetEnvFile) : {};
    
    // Source database configuration (PebbleHost)
    const sourceConfig = {
      host: process.env.SOURCE_DB_HOST || sourceEnv.DB_HOST || process.env.DB_HOST,
      port: parseInt(process.env.SOURCE_DB_PORT || sourceEnv.DB_PORT || '3306'),
      user: process.env.SOURCE_DB_USER || sourceEnv.DB_USER || process.env.DB_USER,
      password: process.env.SOURCE_DB_PASSWORD || sourceEnv.DB_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.SOURCE_DB_NAME || sourceEnv.DB_NAME || process.env.DB_NAME,
    };
    
    // Target database configuration (AWS RDS)
    const targetConfig = {
      host: process.env.TARGET_DB_HOST || targetEnv.DB_HOST,
      port: parseInt(process.env.TARGET_DB_PORT || targetEnv.DB_PORT || '3306'),
      user: process.env.TARGET_DB_USER || targetEnv.DB_USER,
      password: process.env.TARGET_DB_PASSWORD || targetEnv.DB_PASSWORD,
      database: process.env.TARGET_DB_NAME || targetEnv.DB_NAME,
    };
    
    // Validate configurations
    const requiredFields = ['host', 'user', 'password', 'database'];
    for (const field of requiredFields) {
      if (!sourceConfig[field]) {
        throw new Error(`Missing source database ${field}. Set SOURCE_DB_${field.toUpperCase()} or use --source-env`);
      }
      if (!targetConfig[field]) {
        throw new Error(`Missing target database ${field}. Set TARGET_DB_${field.toUpperCase()} or use --target-env`);
      }
    }
    
    console.log('🚀 Starting database migration...');
    console.log(`📤 Source: ${sourceConfig.user}@${sourceConfig.host}:${sourceConfig.port}/${sourceConfig.database}`);
    console.log(`📥 Target: ${targetConfig.user}@${targetConfig.host}:${targetConfig.port}/${targetConfig.database}`);
    
    // Connect to both databases
    const sourceConnection = await createConnection(sourceConfig, 'source');
    const targetConnection = await createConnection(targetConfig, 'target');
    
    try {
      // Get list of tables from source
      const tables = await getTables(sourceConnection);
      console.log(`📋 Found ${tables.length} tables to migrate:`, tables.join(', '));
      
      // Migrate each table
      for (const tableName of tables) {
        console.log(`\n🔄 Migrating table: ${tableName}`);
        
        // Get table schema
        const createStatement = await getTableSchema(sourceConnection, tableName);
        console.log(`  📐 Creating table schema...`);
        
        // Create table in target (drop if exists)
        await targetConnection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
        await createTable(targetConnection, createStatement);
        
        // Get data from source
        const data = await getTableData(sourceConnection, tableName);
        console.log(`  📊 Found ${data.length} rows to migrate`);
        
        // Insert data into target
        if (data.length > 0) {
          await insertData(targetConnection, tableName, data);
          console.log(`  ✅ Migrated ${data.length} rows`);
        } else {
          console.log(`  ℹ️  No data to migrate`);
        }
      }
      
      console.log('\n🎉 Database migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Update your bot and dashboard .env files to use the new database');
      console.log('2. Test the bot and dashboard with the new database');
      console.log('3. Once confirmed working, you can cancel PebbleHost hosting');
      
    } finally {
      await sourceConnection.end();
      await targetConnection.end();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { main };
