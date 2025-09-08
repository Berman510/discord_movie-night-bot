// Simple CLI to run database migrations without starting the bot
require('dotenv').config();

(async () => {
  const logger = require('../utils/logger');
  logger.info('🔄 Starting standalone database migration script...');

  try {
    const database = require('../database');

    // Ensure connection established (database module does this on require)
    if (!database || !database.runMigrations) {
      throw new Error('Database module not initialized or runMigrations not available');
    }

    await database.runMigrations();

    logger.info('✅ Standalone database migrations completed');
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      const database = require('../database');
      if (database && database.pool && database.pool.end) {
        await database.pool.end();
      }
    } catch (_) {
      // ignore
    }
    process.exit();
  }
})();

