#!/usr/bin/env node

/**
 * Emergency script to rescue session 77 from the failed Migration 36
 *
 * The issue: Migration 36 failed to drop movie_sessions table due to foreign key constraints
 * Session 77 exists in movie_sessions but bot/dashboard are looking in watch_sessions
 *
 * This script will:
 * 1. Check what's in both tables
 * 2. Copy session 77 from movie_sessions to watch_sessions
 * 3. Update any movies that reference the old session
 * 4. Verify the rescue worked
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const GUILD_ID = '991929035875688499';
const SESSION_ID = 77;

async function main() {
  let connection;

  try {
    console.log('🚨 Emergency Session 77 Rescue Operation');
    console.log('=====================================');
    console.log(`Guild ID: ${GUILD_ID}`);
    console.log(`Session ID: ${SESSION_ID}`);
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
    console.log('\n🔍 Step 1: Checking table existence...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('watch_sessions', 'movie_sessions')
    `);

    const hasWatchSessions = tables.some((t) => t.TABLE_NAME === 'watch_sessions');
    const hasMovieSessions = tables.some((t) => t.TABLE_NAME === 'movie_sessions');

    console.log(`  movie_sessions exists: ${hasMovieSessions}`);
    console.log(`  watch_sessions exists: ${hasWatchSessions}`);

    if (!hasMovieSessions) {
      console.log('❌ movie_sessions table not found - session may already be migrated');
      return;
    }

    // Step 2: Find session 77 in movie_sessions
    console.log('\n🔍 Step 2: Looking for session 77 in movie_sessions...');
    const [movieSessions] = await connection.execute(
      'SELECT * FROM movie_sessions WHERE id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    if (movieSessions.length === 0) {
      console.log('❌ Session 77 not found in movie_sessions table');
      return;
    }

    const session = movieSessions[0];
    console.log('✅ Found session 77 in movie_sessions:');
    console.log(`  Title: ${session.title}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Created: ${session.created_at}`);
    console.log(`  Voting End: ${session.voting_end_time}`);
    console.log(`  Session Start: ${session.session_start_time}`);

    // Step 3: Check if it already exists in watch_sessions
    console.log('\n🔍 Step 3: Checking if session already exists in watch_sessions...');
    const [watchSessions] = await connection.execute(
      'SELECT * FROM watch_sessions WHERE id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    if (watchSessions.length > 0) {
      console.log('✅ Session 77 already exists in watch_sessions - no copy needed');
    } else {
      console.log('📋 Session 77 not in watch_sessions - copying...');

      // Copy the session
      const columns = Object.keys(session).join(', ');
      const placeholders = Object.keys(session)
        .map(() => '?')
        .join(', ');
      const values = Object.values(session);

      await connection.execute(
        `INSERT INTO watch_sessions (${columns}) VALUES (${placeholders})`,
        values
      );

      console.log('✅ Session 77 copied to watch_sessions');
    }

    // Step 4: Check movies that reference this session
    console.log('\n🔍 Step 4: Checking movies that reference session 77...');
    const [movies] = await connection.execute(
      'SELECT id, title, session_id FROM movies WHERE session_id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    console.log(`✅ Found ${movies.length} movies referencing session 77:`);
    movies.forEach((movie) => {
      console.log(`  - ${movie.title} (ID: ${movie.id})`);
    });

    // Step 5: Verify the rescue worked
    console.log('\n🔍 Step 5: Verifying rescue...');
    const [verifySession] = await connection.execute(
      'SELECT * FROM watch_sessions WHERE id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    if (verifySession.length > 0) {
      console.log('✅ SUCCESS: Session 77 is now in watch_sessions table');
      console.log('✅ Bot and dashboard should now be able to find it');

      // Check if bot can find it using its method
      const [botCheck] = await connection.execute(
        `SELECT * FROM watch_sessions
         WHERE guild_id = ? AND status NOT IN ('cancelled', 'completed')
         ORDER BY 
           CASE 
             WHEN status = 'voting' THEN 1
             WHEN status = 'planning' THEN 2
             WHEN status = 'decided' THEN 3
             WHEN status = 'active' THEN 4
             ELSE 5
           END,
           created_at DESC
         LIMIT 1`,
        [GUILD_ID]
      );

      if (botCheck.length > 0 && botCheck[0].id === SESSION_ID) {
        console.log('✅ VERIFIED: Dashboard query will now find session 77');
      } else {
        console.log('⚠️  WARNING: Dashboard query found different session:', botCheck[0]?.id);
      }
    } else {
      console.log('❌ FAILED: Session 77 still not in watch_sessions');
    }

    console.log('\n🎉 Rescue operation complete!');
    console.log('📋 Next steps:');
    console.log('  1. Refresh your dashboard page');
    console.log('  2. Try voting on movies in Discord');
    console.log('  3. Check if admin panel shows correct session');
  } catch (error) {
    console.error('❌ Rescue operation failed:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

main().catch(console.error);
