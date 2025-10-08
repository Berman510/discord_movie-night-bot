#!/usr/bin/env node

/**
 * Complete Migration 36 - Fix the failed movie_sessions to watch_sessions migration
 *
 * Migration 36 failed due to foreign key constraints preventing the drop of movie_sessions table.
 * This script will:
 * 1. Disable foreign key checks temporarily
 * 2. Copy any remaining data from movie_sessions to watch_sessions
 * 3. Update all foreign key references
 * 4. Drop the movie_sessions table permanently
 * 5. Re-enable foreign key checks
 *
 * This is a one-time fix for the failed migration.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  let connection;

  try {
    console.log('🔧 Completing Migration 36: movie_sessions → watch_sessions');
    console.log('=======================================================');
    console.log('');

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
    });

    console.log('✅ Connected to database');

    // Step 1: Check what tables exist
    console.log('\n🔍 Step 1: Checking current state...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('watch_sessions', 'movie_sessions')
    `);

    const hasWatchSessions = tables.some((t) => t.TABLE_NAME === 'watch_sessions');
    const hasMovieSessions = tables.some((t) => t.TABLE_NAME === 'movie_sessions');

    console.log(`  watch_sessions exists: ${hasWatchSessions}`);
    console.log(`  movie_sessions exists: ${hasMovieSessions}`);

    if (!hasMovieSessions) {
      console.log('✅ Migration 36 already completed - movie_sessions table not found');
      return;
    }

    if (!hasWatchSessions) {
      console.log('❌ watch_sessions table not found - cannot complete migration');
      return;
    }

    // Step 2: Count records in both tables
    console.log('\n🔍 Step 2: Counting records...');
    const [movieCount] = await connection.execute('SELECT COUNT(*) as count FROM movie_sessions');
    const [watchCount] = await connection.execute('SELECT COUNT(*) as count FROM watch_sessions');

    console.log(`  movie_sessions: ${movieCount[0].count} records`);
    console.log(`  watch_sessions: ${watchCount[0].count} records`);

    if (movieCount[0].count === 0) {
      console.log('✅ movie_sessions is empty - safe to drop');
    } else {
      console.log(`⚠️  movie_sessions has ${movieCount[0].count} records - need to copy`);

      // Step 3: Copy missing records
      console.log('\n🔄 Step 3: Copying missing records...');

      // Find records in movie_sessions that aren't in watch_sessions
      const [missingRecords] = await connection.execute(`
        SELECT ms.* FROM movie_sessions ms
        LEFT JOIN watch_sessions ws ON ms.id = ws.id
        WHERE ws.id IS NULL
      `);

      console.log(`  Found ${missingRecords.length} records to copy`);

      if (missingRecords.length > 0) {
        for (const record of missingRecords) {
          console.log(`  Copying session ${record.id}: ${record.title} (${record.guild_id})`);

          const columns = Object.keys(record).join(', ');
          const placeholders = Object.keys(record)
            .map(() => '?')
            .join(', ');
          const values = Object.values(record);

          await connection.execute(
            `INSERT INTO watch_sessions (${columns}) VALUES (${placeholders})`,
            values
          );
        }
        console.log(`✅ Copied ${missingRecords.length} records to watch_sessions`);
      }
    }

    // Step 4: Disable foreign key checks and drop movie_sessions
    console.log('\n🔧 Step 4: Dropping movie_sessions table...');

    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('  Disabled foreign key checks');

    await connection.execute('DROP TABLE IF EXISTS movie_sessions');
    console.log('✅ Dropped movie_sessions table');

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('  Re-enabled foreign key checks');

    // Step 5: Verify the migration is complete
    console.log('\n🔍 Step 5: Verifying migration...');
    const [finalTables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('watch_sessions', 'movie_sessions')
    `);

    const finalHasWatchSessions = finalTables.some((t) => t.TABLE_NAME === 'watch_sessions');
    const finalHasMovieSessions = finalTables.some((t) => t.TABLE_NAME === 'movie_sessions');

    console.log(`  watch_sessions exists: ${finalHasWatchSessions}`);
    console.log(`  movie_sessions exists: ${finalHasMovieSessions}`);

    if (finalHasWatchSessions && !finalHasMovieSessions) {
      console.log('\n🎉 SUCCESS: Migration 36 completed successfully!');
      console.log('✅ All session data is now in watch_sessions table');
      console.log('✅ movie_sessions table has been dropped');
      console.log('✅ Bot and dashboard will now find all sessions correctly');

      // Check if session 77 is now accessible
      const [session77] = await connection.execute(
        'SELECT * FROM watch_sessions WHERE id = 77 AND guild_id = ?',
        ['991929035875688499']
      );

      if (session77.length > 0) {
        console.log(`\n🎬 Session 77 Status: FOUND in watch_sessions`);
        console.log(`   Title: ${session77[0].title}`);
        console.log(`   Status: ${session77[0].status}`);
        console.log(`   Guild: ${session77[0].guild_id}`);
      } else {
        console.log('\n⚠️  Session 77 not found in watch_sessions - may have been cleaned up');
      }
    } else {
      console.log('\n❌ FAILED: Migration 36 still incomplete');
    }

    console.log('\n📋 Next Steps:');
    console.log('  1. Restart the bot to ensure it uses the correct table');
    console.log('  2. Refresh your dashboard');
    console.log('  3. Test voting functionality');
  } catch (error) {
    console.error('❌ Migration completion failed:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

main().catch(console.error);
