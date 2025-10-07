const mysql = require('mysql2/promise');
const fs = require('fs');

async function fixDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
  });

  try {
    console.log('🔌 Connected to database');

    // Read and execute the SQL script
    const sql = fs.readFileSync('/tmp/fix_collation.sql', 'utf8');
    const statements = sql.split(';').filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
          await pool.execute(statement.trim());
          console.log('✅ Success');
        } catch (error) {
          console.warn(`⚠️  Warning: ${error.message}`);
        }
      }
    }

    console.log('✅ Database collation fixes completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDatabase();
