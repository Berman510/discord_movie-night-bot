/**
 * Database module for Movie Night Bot
 * Handles MySQL connection and all database operations
 * Falls back to JSON file storage if MySQL is not available
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.useJsonFallback = false;
    this.jsonFile = path.join(process.cwd(), 'movie-bot-data.json');
    this.data = {
      movies: [],
      votes: [],
      sessions: [],
      guilds: []
    };
    // Utility: generate a stable UID for a movie title per guild
    this.generateMovieUID = (guildId, title) => {
      const crypto = require('crypto');
      const normalizedTitle = String(title || '').toLowerCase().trim();
      return crypto.createHash('sha256').update(`${guildId}:${normalizedTitle}`).digest('hex');
    };

  }



  async connect() {
    try {
      const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, USE_JSON_STORAGE } = process.env;

      // Try JSON storage first if explicitly requested
      if (USE_JSON_STORAGE === 'true') {
        return await this.initJsonStorage();
      }

      if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
        console.log('⚠️  Database credentials not provided - checking for JSON storage fallback');
        return await this.initJsonStorage();
      }

      // Parse host and port if provided
      let host = DB_HOST;
      let port = 3306;

      if (DB_HOST.includes(':')) {
        const parts = DB_HOST.split(':');
        host = parts[0];
        port = parseInt(parts[1]) || 3306;
      }

      this.pool = mysql.createPool({
        host: host,
        port: port,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 60000,
      });

      // Test connection
      const logger = require('./utils/logger');
      logger.info(`🔌 Attempting to connect to MySQL at ${host}:${port}...`);
      await this.pool.execute('SELECT 1');
      this.isConnected = true;
      logger.info('✅ Connected to MySQL database');

      // Initialize tables
      await this.initializeTables();
      return true;
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('❌ Database connection failed:', error.message);
      logger.info('🔄 Falling back to JSON storage...');
      return await this.initJsonStorage();
    }
  }

  async initJsonStorage() {
    try {
      this.useJsonFallback = true;

      // Try to load existing data
      try {
        const fileContent = await fs.readFile(this.jsonFile, 'utf8');
        this.data = JSON.parse(fileContent);
        console.log('📁 Loaded existing JSON data file');
      } catch (error) {
        // File doesn't exist or is invalid, use default data
        console.log('📁 Creating new JSON data file');
        await this.saveJsonData();
      }

      this.isConnected = true;
      const logger = require('./utils/logger');
      logger.info('✅ Connected to JSON file storage');
      logger.info('💡 Tip: Set database credentials in .env for full MySQL features');
      return true;
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('❌ JSON storage initialization failed:', error.message);
      logger.warn('⚠️  Running in memory-only mode');
      this.isConnected = false;
      this.useJsonFallback = false;
      return false;
    }
  }

  async saveJsonData() {
    if (!this.useJsonFallback) return;

    try {
      await fs.writeFile(this.jsonFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('Failed to save JSON data:', error.message);
    }
  }

  async initializeTables() {
    const tables = [
      // Movies table - stores all movie recommendations
      `CREATE TABLE IF NOT EXISTS movies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(20) UNIQUE NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        channel_id VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        movie_uid VARCHAR(64) NOT NULL,
        where_to_watch VARCHAR(255) NOT NULL,
        recommended_by VARCHAR(20) NOT NULL,
        imdb_id VARCHAR(20) NULL,
        imdb_data JSON NULL,
        status ENUM('pending', 'watched', 'planned', 'skipped', 'scheduled', 'banned') DEFAULT 'pending',
        session_id INT NULL,
        is_banned BOOLEAN DEFAULT FALSE,
        watch_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        watched_at TIMESTAMP NULL,
        INDEX idx_guild_status (guild_id, status),
        INDEX idx_message_id (message_id),
        INDEX idx_movie_uid (guild_id, movie_uid),
        INDEX idx_banned (guild_id, is_banned)
      )`,

      // Votes table - stores all votes for movies
      `CREATE TABLE IF NOT EXISTS votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        vote_type ENUM('up', 'down') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES movies(message_id) ON DELETE CASCADE,
        INDEX idx_message_votes (message_id, vote_type),
        INDEX idx_guild_votes (guild_id, vote_type)
      )`,

      // Movie sessions - organized movie nights
      `CREATE TABLE IF NOT EXISTS movie_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        channel_id VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        scheduled_date DATETIME NULL,
        timezone VARCHAR(50) DEFAULT 'UTC',
        voting_deadline DATETIME NULL,
        status ENUM('planning', 'voting', 'decided', 'completed', 'cancelled') DEFAULT 'planning',
        winner_message_id VARCHAR(20) NULL,
        associated_movie_id VARCHAR(20) NULL,
        discord_event_id VARCHAR(20) NULL,
        created_by VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guild_status (guild_id, status),
        INDEX idx_associated_movie (associated_movie_id),
        INDEX idx_discord_event (discord_event_id)
      )`,

      // Guild configuration
      `CREATE TABLE IF NOT EXISTS guild_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) UNIQUE NOT NULL,
        movie_channel_id VARCHAR(20) NULL,
        admin_roles JSON NULL,
        moderator_roles JSON NULL,
        notification_role_id VARCHAR(20) NULL,
        default_timezone VARCHAR(50) DEFAULT 'UTC',
        session_viewing_channel_id VARCHAR(20) NULL,
        admin_channel_id VARCHAR(20) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Session participants (registered)
      `CREATE TABLE IF NOT EXISTS session_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_participant (session_id, user_id),
        INDEX idx_guild_participants (guild_id, user_id)
      )`,

      // Session attendees (actual attendance tracking)
      `CREATE TABLE IF NOT EXISTS session_attendees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP NULL,
        duration_minutes INT DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_attendee (session_id, user_id),
        INDEX idx_guild_attendees (guild_id, user_id)
      )`
    ];

    for (const table of tables) {
      try {
        await this.pool.execute(table);
      } catch (error) {
        console.error('Error creating table:', error.message);
      }
    }

    // Run migrations to ensure schema is up to date
    await this.runMigrations();

    const logger = require('./utils/logger');
    logger.info('✅ Database tables initialized');
  }

  async runMigrations() {
    const logger = require('./utils/logger');
    logger.info('🔄 Running database migrations...');


      // Check current schema first
      const [columns] = await this.pool.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guild_config'
      `);
      const columnNames = columns.map(row => row.COLUMN_NAME);
      logger.debug('Current guild_config columns:', columnNames);

      // Migration 1: Ensure timezone column exists in movie_sessions
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'
        `);
        logger.debug('✅ Added timezone column to movie_sessions');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          logger.debug('✅ timezone column already exists');
        } else {
          logger.warn('Migration 1 warning:', error.message);
        }
      }

      // Migration 2: Ensure associated_movie_id column exists
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          ADD COLUMN associated_movie_id VARCHAR(255) DEFAULT NULL
        `);
        logger.debug('✅ Added associated_movie_id column to movie_sessions');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          logger.debug('✅ associated_movie_id column already exists');
        } else {
          logger.warn('Migration 2 warning:', error.message);
        }
      }

      // Migration 3: Ensure discord_event_id column exists
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          ADD COLUMN discord_event_id VARCHAR(255) DEFAULT NULL
        `);
        logger.debug('✅ Added discord_event_id column to movie_sessions');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          logger.debug('✅ discord_event_id column already exists');
        } else {
          logger.warn('Migration 3 warning:', error.message);
        }
      }

      // Migration 4: Update charset to support emojis
      try {
        // First drop foreign key constraints that might interfere
        try {
          await this.pool.execute(`ALTER TABLE votes DROP FOREIGN KEY votes_ibfk_1`);
        } catch (fkError) {
          // Foreign key might not exist or have different name, continue
        }

        await this.pool.execute(`
          ALTER TABLE movie_sessions
          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        await this.pool.execute(`
          ALTER TABLE movies
          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        await this.pool.execute(`
          ALTER TABLE votes
          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);

        // Recreate foreign key constraint
        try {
          await this.pool.execute(`
            ALTER TABLE votes
            ADD CONSTRAINT votes_ibfk_1
            FOREIGN KEY (message_id) REFERENCES movies(message_id) ON DELETE CASCADE
          `);
        } catch (fkError) {
          // Foreign key might already exist, continue
        }

        const logger = require('./utils/logger');
        logger.info('✅ Updated charset to utf8mb4');
      } catch (error) {
        // Only log as warning if it's not a critical error
        if (!error.message.includes('already exists') && !error.message.includes('utf8mb4')) {
          const logger = require('./utils/logger');
          logger.warn('Migration 4 warning:', error.message);
        }
      }

      // Migration 5: Add 'scheduled' status to movies enum
      try {
        await this.pool.execute(`
          ALTER TABLE movies
          MODIFY COLUMN status ENUM('pending', 'watched', 'planned', 'skipped', 'scheduled') DEFAULT 'pending'
        `);
        logger.debug('✅ Added scheduled status to movies enum');
      } catch (error) {
        logger.warn('Migration 5 warning:', error.message);
      }

      // Migration 6: Add notification_role_id to guild_config
      if (!columnNames.includes('notification_role_id')) {
        try {
          await this.pool.execute(`
            ALTER TABLE guild_config
            ADD COLUMN notification_role_id VARCHAR(20) DEFAULT NULL
          `);
          logger.debug('✅ Added notification_role_id column to guild_config');
        } catch (error) {
          logger.error('❌ Failed to add notification_role_id column:', error.message);
        }
      } else {
        logger.debug('✅ notification_role_id column already exists');
      }

      // Migration 7: Ensure watched_at column exists in movies table
      try {
        const [movieColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'movies'
        `);
        const movieColumnNames = movieColumns.map(row => row.COLUMN_NAME);

        if (!movieColumnNames.includes('watched_at')) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN watched_at TIMESTAMP NULL
          `);
          logger.debug('✅ Added watched_at column to movies');
        } else {
          logger.debug('✅ watched_at column already exists');
        }
      } catch (error) {
        console.error('❌ Failed to add watched_at column:', error.message);
      }

      // Migration 8: Ensure watch_count column exists in movies table
      try {
        const [movieColumns2] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'movies'
        `);
        const movieColumnNames2 = movieColumns2.map(row => row.COLUMN_NAME);

        if (!movieColumnNames2.includes('watch_count')) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN watch_count INT DEFAULT 0
          `);
          logger.debug('✅ Added watch_count column to movies');
        } else {
          logger.debug('✅ watch_count column already exists');
        }
      } catch (error) {
        console.error('❌ Failed to add watch_count column:', error.message);
      }

      // Migration 9: Ensure session_viewing_channel_id column exists in guild_config table
      try {
        const [guildColumns2] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'guild_config'
        `);
        const guildColumnNames2 = guildColumns2.map(row => row.COLUMN_NAME);

        if (!guildColumnNames2.includes('session_viewing_channel_id')) {
          await this.pool.execute(`
            ALTER TABLE guild_config
            ADD COLUMN session_viewing_channel_id VARCHAR(20) NULL
          `);
          logger.debug('✅ Added session_viewing_channel_id column to guild_config');
        } else {
          logger.debug('✅ session_viewing_channel_id column already exists');
        }
      } catch (error) {
        console.error('❌ Failed to add session_viewing_channel_id column:', error.message);
      }

      // Migration 10: Add 'active' status to movie_sessions enum
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          MODIFY COLUMN status ENUM('planning', 'voting', 'decided', 'active', 'completed', 'cancelled') DEFAULT 'planning'
        `);
        logger.debug('✅ Added active status to movie_sessions enum');
      } catch (error) {
        logger.warn('Migration 10 warning:', error.message);
      }

      // Migration 11: Add guild_id columns to votes, session_participants, and session_attendees tables
      try {
        // Add guild_id to votes table
        const [voteColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'votes'
        `);
        const voteColumnNames = voteColumns.map(row => row.COLUMN_NAME);

        if (!voteColumnNames.includes('guild_id')) {
          // Add the column
          await this.pool.execute(`
            ALTER TABLE votes
            ADD COLUMN guild_id VARCHAR(20) NOT NULL DEFAULT ''
          `);

          // Populate existing data by joining with movies table
          await this.pool.execute(`
            UPDATE votes v
            JOIN movies m ON v.message_id = m.message_id
            SET v.guild_id = m.guild_id
          `);

          // Add index for better performance
          await this.pool.execute(`
            ALTER TABLE votes
            ADD INDEX idx_guild_votes (guild_id, vote_type)
          `);

          logger.debug('✅ Added guild_id column to votes table');
        } else {
          logger.debug('✅ guild_id column already exists in votes table');
        }

        // Add guild_id to session_participants table
        const [participantColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'session_participants'
        `);
        const participantColumnNames = participantColumns.map(row => row.COLUMN_NAME);

        if (!participantColumnNames.includes('guild_id')) {
          // Add the column
          await this.pool.execute(`
            ALTER TABLE session_participants
            ADD COLUMN guild_id VARCHAR(20) NOT NULL DEFAULT ''
          `);

          // Populate existing data by joining with movie_sessions table
          await this.pool.execute(`
            UPDATE session_participants sp
            JOIN movie_sessions ms ON sp.session_id = ms.id
            SET sp.guild_id = ms.guild_id
          `);

          // Add index for better performance
          await this.pool.execute(`
            ALTER TABLE session_participants
            ADD INDEX idx_guild_participants (guild_id, user_id)
          `);

          logger.debug('✅ Added guild_id column to session_participants table');
        } else {
          logger.debug('✅ guild_id column already exists in session_participants table');
        }

        // Add guild_id to session_attendees table
        const [attendeeColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'session_attendees'
        `);
        const attendeeColumnNames = attendeeColumns.map(row => row.COLUMN_NAME);

        if (!attendeeColumnNames.includes('guild_id')) {
          // Add the column
          await this.pool.execute(`
            ALTER TABLE session_attendees
            ADD COLUMN guild_id VARCHAR(20) NOT NULL DEFAULT ''
          `);

          // Populate existing data by joining with movie_sessions table
          await this.pool.execute(`
            UPDATE session_attendees sa
            JOIN movie_sessions ms ON sa.session_id = ms.id
            SET sa.guild_id = ms.guild_id
          `);

          // Add index for better performance
          await this.pool.execute(`
            ALTER TABLE session_attendees
            ADD INDEX idx_guild_attendees (guild_id, user_id)
          `);

          logger.debug('✅ Added guild_id column to session_attendees table');
        } else {
          logger.debug('✅ guild_id column already exists in session_attendees table');
        }

      } catch (error) {
        console.error('❌ Failed to add guild_id columns (Migration 11):', error.message);
      }

      // Migration 12: Add admin_channel_id column to guild_config table
      try {
        const [adminChannelColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'guild_config'
        `);
        const adminChannelColumnNames = adminChannelColumns.map(row => row.COLUMN_NAME);

        if (!adminChannelColumnNames.includes('admin_channel_id')) {
          await this.pool.execute(`
            ALTER TABLE guild_config
            ADD COLUMN admin_channel_id VARCHAR(20) NULL
          `);
          logger.debug('✅ Added admin_channel_id column to guild_config');
        } else {
          logger.debug('✅ admin_channel_id column already exists in guild_config');
        }
      } catch (error) {
        console.error('❌ Failed to add admin_channel_id column (Migration 12):', error.message);
      }

      // Migration 13: Add movie UID system columns
      try {
        const [movieColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'movies'
        `);
        const movieColumnNames = movieColumns.map(row => row.COLUMN_NAME);

        // Add movie_uid column
        if (!movieColumnNames.includes('movie_uid')) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN movie_uid VARCHAR(64) NOT NULL DEFAULT ''
          `);
          console.log('✅ Added movie_uid column to movies');
        }

        // Add is_banned column
        if (!movieColumnNames.includes('is_banned')) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN is_banned BOOLEAN DEFAULT FALSE
          `);
          console.log('✅ Added is_banned column to movies');
        }

        // Update status enum to include 'banned'
        try {
          await this.pool.execute(`
            ALTER TABLE movies
            MODIFY COLUMN status ENUM('pending', 'watched', 'planned', 'skipped', 'scheduled', 'banned') DEFAULT 'pending'
          `);
          logger.debug('✅ Updated status enum to include banned');
        } catch (error) {
          logger.warn('Migration 13 status enum warning:', error.message);
        }

        // Add indexes for new columns
        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD INDEX idx_movie_uid (guild_id, movie_uid)
          `);
          console.log('✅ Added movie_uid index');
        } catch (error) {
          if (!error.message.includes('Duplicate key name')) {
            console.warn('Migration 13 movie_uid index warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD INDEX idx_banned (guild_id, is_banned)
          `);
          console.log('✅ Added banned index');
        } catch (error) {
          if (!error.message.includes('Duplicate key name')) {
            console.warn('Migration 13 banned index warning:', error.message);
          }
        }

        // Populate movie_uid for existing movies
        await this.pool.execute(`
          UPDATE movies
          SET movie_uid = SHA2(CONCAT(guild_id, ':', LOWER(TRIM(title))), 256)
          WHERE movie_uid = '' OR movie_uid IS NULL
        `);
        logger.debug('✅ Populated movie_uid for existing movies');

      } catch (error) {
        console.error('❌ Failed to add movie UID system (Migration 13):', error.message);
      }

      // Migration 14: Add session_id to movies table for voting session tracking
      try {
        const [sessionColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'movies'
          AND COLUMN_NAME = 'session_id'
        `);

        if (sessionColumns.length === 0) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN session_id INT NULL,
            ADD INDEX idx_session_movies (guild_id, session_id)
          `);
          console.log('✅ Added session_id to movies table for voting session tracking');
        }
      } catch (error) {
        console.warn('Migration 14 warning:', error.message);
      }

      // Migration 15: Add voting_end_time to movie_sessions
      try {
        const [votingEndColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'movie_sessions'
          AND COLUMN_NAME = 'voting_end_time'
        `);

        if (votingEndColumns.length === 0) {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD COLUMN voting_end_time DATETIME NULL AFTER scheduled_date
          `);
          logger.debug('✅ Added voting_end_time column to movie_sessions');
        } else {
          logger.debug('✅ voting_end_time column already exists in movie_sessions');
        }
      } catch (error) {
        console.error('Migration 15 error:', error.message);
      }

      // Migration 16: Add next_session flag to movies table
      try {
        const [nextSessionColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'movies'
          AND COLUMN_NAME = 'next_session'
        `);

        if (nextSessionColumns.length === 0) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN next_session BOOLEAN DEFAULT FALSE AFTER session_id
          `);
          logger.debug('✅ Added next_session column to movies');
        } else {
          logger.debug('✅ next_session column already exists in movies');
        }
      } catch (error) {
        console.error('Migration 16 error:', error.message);
      }

      // Migration 17: Add forum channel support columns
      try {
        const [forumColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'movies'
          AND COLUMN_NAME IN ('thread_id', 'channel_type')
        `);

        const existingColumns = forumColumns.map(row => row.COLUMN_NAME);

        if (!existingColumns.includes('thread_id')) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN thread_id VARCHAR(20) NULL AFTER message_id
          `);
          console.log('✅ Added thread_id column to movies');
        }

        if (!existingColumns.includes('channel_type')) {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD COLUMN channel_type ENUM('text', 'forum') DEFAULT 'text' AFTER thread_id
          `);
          console.log('✅ Added channel_type column to movies');
        }

        if (existingColumns.length === 0) {
          logger.debug('✅ Added forum channel support columns to movies');
        } else {
          logger.debug('✅ Forum channel support columns already exist in movies');
        }
      } catch (error) {
        console.error('Migration 17 error:', error.message);
      }

      // Migration 18: Add moderator_roles column to guild_config
      try {
        const [guildConfigColumns] = await this.pool.execute(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'guild_config'
        `);
        const guildConfigColumnNames = guildConfigColumns.map(row => row.COLUMN_NAME);

        if (!guildConfigColumnNames.includes('moderator_roles')) {
          await this.pool.execute(`
            ALTER TABLE guild_config
            ADD COLUMN moderator_roles JSON DEFAULT NULL
          `);
          logger.debug('✅ Added moderator_roles column to guild_config');
        } else {
          logger.debug('✅ moderator_roles column already exists in guild_config');
        }
      } catch (error) {
        logger.warn('Migration 18 warning:', error.message);
      }

      // Migration 19: Enforce guild-scoped uniqueness and composite foreign keys
        // 19.1 Ensure composite unique/indexes exist on parent tables
        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD UNIQUE KEY uniq_movies_guild_message (guild_id, message_id)
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 uniq_movies_guild_message warning:', error.message);
          }
        }
        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD INDEX idx_movie_sessions_gid_id (guild_id, id)
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 idx_movie_sessions_gid_id warning:', error.message);
          }
        }

        // 19.2 Drop legacy single-column foreign keys (best-effort)
        try { await this.pool.execute(`ALTER TABLE votes DROP FOREIGN KEY votes_ibfk_1`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE session_participants DROP FOREIGN KEY session_participants_ibfk_1`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE session_attendees DROP FOREIGN KEY session_attendees_ibfk_1`); } catch (e) {}

        // 19.3 Adjust unique constraints to be guild-scoped
        try {
          await this.pool.execute(`
            ALTER TABLE votes
            DROP INDEX unique_vote
          `);
        } catch (error) {}
        try {
          await this.pool.execute(`
            ALTER TABLE votes
            ADD UNIQUE KEY unique_vote_guild (guild_id, message_id, user_id)
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 unique_vote_guild warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE session_participants
            DROP INDEX unique_participant
          `);
        } catch (error) {}
        try {
          await this.pool.execute(`
            ALTER TABLE session_participants
            ADD UNIQUE KEY unique_participant_guild (guild_id, session_id, user_id)
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 unique_participant_guild warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE session_attendees
            DROP INDEX unique_attendee
          `);
        } catch (error) {}
        try {
          await this.pool.execute(`
            ALTER TABLE session_attendees
            ADD UNIQUE KEY unique_attendee_guild (guild_id, session_id, user_id)
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 unique_attendee_guild warning:', error.message);
          }
        }

        // 19.4 Add supporting indexes for composite FKs
        try {
          await this.pool.execute(`
            ALTER TABLE votes
            ADD INDEX idx_votes_gid_msg (guild_id, message_id)
          `);
        } catch (error) {}
        try {
          await this.pool.execute(`
            ALTER TABLE session_participants
            ADD INDEX idx_participants_gid_sid (guild_id, session_id)
          `);
        } catch (error) {}
        try {
          await this.pool.execute(`
            ALTER TABLE session_attendees
            ADD INDEX idx_attendees_gid_sid (guild_id, session_id)
          `);
        } catch (error) {}
        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD INDEX idx_movies_gid_sid (guild_id, session_id)
          `);
        } catch (error) {}


        // 19.45 Data backfill/correction to satisfy composite FKs
        try {
          await this.pool.execute(`
            UPDATE session_participants sp
            INNER JOIN movie_sessions ms ON sp.session_id = ms.id
            SET sp.guild_id = ms.guild_id
            WHERE sp.guild_id <> ms.guild_id
          `);
          logger.debug('Migration 19: Backfilled session_participants.guild_id mismatches');
        } catch (error) {
          logger.warn('Migration 19 backfill session_participants warning:', error.message);
        }
        try {
          await this.pool.execute(`
            UPDATE session_attendees sa
            INNER JOIN movie_sessions ms ON sa.session_id = ms.id
            SET sa.guild_id = ms.guild_id
            WHERE sa.guild_id <> ms.guild_id
          `);
          logger.debug('Migration 19: Backfilled session_attendees.guild_id mismatches');
        } catch (error) {
          logger.warn('Migration 19 backfill session_attendees warning:', error.message);
        }
        try {
          await this.pool.execute(`
            UPDATE movies m
            INNER JOIN movie_sessions ms ON m.session_id = ms.id
            SET m.session_id = NULL
            WHERE m.session_id IS NOT NULL AND m.guild_id <> ms.guild_id
          `);
          logger.debug('Migration 19: Cleared movies.session_id that pointed across guilds');
        } catch (error) {
          logger.warn('Migration 19 backfill movies.session_id warning:', error.message);
        }
        try {
          await this.pool.execute(`
            UPDATE movie_sessions s
            INNER JOIN movies m ON s.winner_message_id = m.message_id
            SET s.winner_message_id = NULL
            WHERE s.winner_message_id IS NOT NULL AND s.guild_id <> m.guild_id
          `);
          logger.debug('Migration 19: Cleared movie_sessions.winner_message_id mismatches');
        } catch (error) {
          logger.warn('Migration 19 backfill sessions.winner_message_id warning:', error.message);
        }
        try {
          await this.pool.execute(`
            UPDATE movie_sessions s
            INNER JOIN movies m ON s.associated_movie_id = m.message_id
            SET s.associated_movie_id = NULL
            WHERE s.associated_movie_id IS NOT NULL AND s.guild_id <> m.guild_id
          `);
          logger.debug('Migration 19: Cleared movie_sessions.associated_movie_id mismatches');
        } catch (error) {
          logger.warn('Migration 19 backfill sessions.associated_movie_id warning:', error.message);
        }

        // Helpful supporting indexes on movie_sessions for FKs referencing movies
        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD INDEX idx_ms_gid_winner (guild_id, winner_message_id)
          `);
        } catch (error) {}
        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD INDEX idx_ms_gid_assoc (guild_id, associated_movie_id)
          `);
        } catch (error) {}

        // 19.5 Add composite foreign keys
        try {
          await this.pool.execute(`
            ALTER TABLE votes
            ADD CONSTRAINT fk_votes_movie
            FOREIGN KEY (guild_id, message_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE CASCADE
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 fk_votes_movie warning:', error.message);
          }
          }


        try {
          await this.pool.execute(`
            ALTER TABLE session_participants
            ADD CONSTRAINT fk_participants_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE CASCADE
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 fk_participants_session warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE session_attendees
            ADD CONSTRAINT fk_attendees_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE CASCADE
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 fk_attendees_session warning:', error.message);
          }
        }

        // movies → movie_sessions (nullable)
        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD CONSTRAINT fk_movies_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 fk_movies_session warning:', error.message);
          }
        }

        // movie_sessions → movies for winner/associated
        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_winner_movie
            FOREIGN KEY (guild_id, winner_message_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 fk_sessions_winner_movie warning:', error.message);
          }
        }
        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_associated_movie
            FOREIGN KEY (guild_id, associated_movie_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 19 fk_sessions_associated_movie warning:', error.message);
          }
        }

        logger.debug('✅ Migration 19: Guild-scoped constraints and FKs applied');


      // Migration 20: Align charsets and finalize composite FKs missed in rc91/rc92

        // Ensure session tables use utf8mb4 to match parent tables for FKs
        try {
          await this.pool.execute(`
            ALTER TABLE session_participants CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
        } catch (error) {
          if (!error.message.includes('same collation') && !error.message.includes('doesn\'t exist')) {
            logger.warn('Migration 20 session_participants charset warning:', error.message);
          }
        }
        try {
          await this.pool.execute(`
            ALTER TABLE session_attendees CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
        } catch (error) {
          if (!error.message.includes('same collation') && !error.message.includes('doesn\'t exist')) {
            logger.warn('Migration 20 session_attendees charset warning:', error.message);
          }
        }

        // Helpful supporting indexes (re-apply if missed)
        try { await this.pool.execute(`ALTER TABLE movie_sessions ADD INDEX idx_ms_gid_winner (guild_id, winner_message_id)`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE movie_sessions ADD INDEX idx_ms_gid_assoc (guild_id, associated_movie_id)`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE movies ADD INDEX idx_movies_gid_sid (guild_id, session_id)`); } catch (e) {}

        // Re-attempt composite FKs
        try {
          await this.pool.execute(`
            ALTER TABLE session_participants
            ADD CONSTRAINT fk_participants_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE CASCADE
          `);
        } catch (error) { if (!error.message.includes('Duplicate') && !error.message.includes('exists')) { logger.warn('Migration 20 fk_participants_session warning:', error.message); } }

        try {
          await this.pool.execute(`
            ALTER TABLE session_attendees
            ADD CONSTRAINT fk_attendees_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE CASCADE
          `);
        } catch (error) { if (!error.message.includes('Duplicate') && !error.message.includes('exists')) { logger.warn('Migration 20 fk_attendees_session warning:', error.message); } }

        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD CONSTRAINT fk_movies_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE SET NULL
          `);
        } catch (error) { if (!error.message.includes('Duplicate') && !error.message.includes('exists')) { logger.warn('Migration 20 fk_movies_session warning:', error.message); } }

        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_winner_movie
            FOREIGN KEY (guild_id, winner_message_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) { if (!error.message.includes('Duplicate') && !error.message.includes('exists')) { logger.warn('Migration 20 fk_sessions_winner_movie warning:', error.message); } }

        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_associated_movie
            FOREIGN KEY (guild_id, associated_movie_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) { if (!error.message.includes('Duplicate') && !error.message.includes('exists')) { logger.warn('Migration 20 fk_sessions_associated_movie warning:', error.message); } }

        logger.debug('✅ Migration 20: Charsets aligned and composite FKs ensured');


      // Migration 21: Clean orphans and re-attempt composite foreign keys
      try {
        // 21.1 Remove or correct orphaned references safely
        try {
          await this.pool.execute(`
            DELETE sp FROM session_participants sp
            LEFT JOIN movie_sessions ms
              ON ms.guild_id = sp.guild_id AND ms.id = sp.session_id
            WHERE ms.id IS NULL
          `);
        } catch (error) {
          logger.warn('Migration 21 delete orphan session_participants warning:', error.message);
        }

        try {
          await this.pool.execute(`
            DELETE sa FROM session_attendees sa
            LEFT JOIN movie_sessions ms
              ON ms.guild_id = sa.guild_id AND ms.id = sa.session_id
            WHERE ms.id IS NULL
          `);
        } catch (error) {
          logger.warn('Migration 21 delete orphan session_attendees warning:', error.message);
        }

        try {
          await this.pool.execute(`
            UPDATE movies m
            LEFT JOIN movie_sessions ms
              ON ms.guild_id = m.guild_id AND ms.id = m.session_id
            SET m.session_id = NULL
            WHERE m.session_id IS NOT NULL AND ms.id IS NULL
          `);
        } catch (error) {
          logger.warn('Migration 21 nullify orphan movies.session_id warning:', error.message);
        }

        try {
          await this.pool.execute(`
            UPDATE movie_sessions s
            LEFT JOIN movies m1 ON m1.guild_id = s.guild_id AND m1.message_id = s.winner_message_id
            LEFT JOIN movies m2 ON m2.guild_id = s.guild_id AND m2.message_id = s.associated_movie_id
            SET s.winner_message_id = CASE WHEN m1.message_id IS NULL THEN NULL ELSE s.winner_message_id END,
                s.associated_movie_id = CASE WHEN m2.message_id IS NULL THEN NULL ELSE s.associated_movie_id END
          `);
        } catch (error) {
          logger.warn('Migration 21 nullify orphan session winner/associated warnings:', error.message);
        }

        // 21.2 Re-ensure supporting indexes
        try { await this.pool.execute(`ALTER TABLE movie_sessions ADD INDEX idx_ms_gid_winner (guild_id, winner_message_id)`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE movie_sessions ADD INDEX idx_ms_gid_assoc (guild_id, associated_movie_id)`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE movies ADD INDEX idx_movies_gid_sid (guild_id, session_id)`); } catch (e) {}

        // 21.3 Re-attempt composite FKs now that orphans are cleared
        try {
          await this.pool.execute(`
            ALTER TABLE session_participants
            ADD CONSTRAINT fk_participants_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE CASCADE
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 21 fk_participants_session warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE session_attendees
            ADD CONSTRAINT fk_attendees_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE CASCADE
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 21 fk_attendees_session warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD CONSTRAINT fk_movies_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 21 fk_movies_session warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_winner_movie
            FOREIGN KEY (guild_id, winner_message_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 21 fk_sessions_winner_movie warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_associated_movie
            FOREIGN KEY (guild_id, associated_movie_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 21 fk_sessions_associated_movie warning:', error.message);
          }
        }

        logger.debug('✅ Migration 21: Orphans cleaned and FKs re-attempted');
      } catch (error) {
        logger.warn('Migration 21 wrapper warning:', error.message);
      }


      // Migration 22: Normalize column definitions for FK compatibility and retry
      try {
        // 22.1 Normalize VARCHAR columns (guild_id/message_id) to same charset/collation
        const varcharTargets = [
          // table, column, nullability
          ['movies','guild_id','NOT NULL'],
          ['movies','message_id','NOT NULL'],
          ['movie_sessions','guild_id','NOT NULL'],
          ['movie_sessions','winner_message_id','NULL'],
          ['movie_sessions','associated_movie_id','NULL'],
          ['session_participants','guild_id','NOT NULL'],
          ['session_attendees','guild_id','NOT NULL'],
        ];
        for (const [tbl, col, nullable] of varcharTargets) {
          try {
            await this.pool.execute(`ALTER TABLE ${tbl} MODIFY COLUMN ${col} VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ${nullable}`);
          } catch (error) {
            if (!error.message.includes('check that column/column exists')) {
              logger.debug(`Migration 22 note (${tbl}.${col}):`, error.message);
            }
          }
        }

        // 22.2 Normalize INT columns (session_id/id) to same signedness/size
        const intTargets = [
          ['movies','session_id','INT NULL'],
          ['session_participants','session_id','INT NOT NULL'],
          ['session_attendees','session_id','INT NOT NULL'],
          ['movie_sessions','id','INT NOT NULL'], // keep AUTO_INCREMENT intact
        ];
        for (const [tbl, col, defn] of intTargets) {
          try {
            await this.pool.execute(`ALTER TABLE ${tbl} MODIFY COLUMN ${col} ${defn}`);
          } catch (error) {
            logger.debug(`Migration 22 note (${tbl}.${col}):`, error.message);
          }
        }

        // 22.3 Re-ensure supporting indexes
        try { await this.pool.execute(`ALTER TABLE movies ADD UNIQUE KEY uniq_movies_guild_message (guild_id, message_id)`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE movie_sessions ADD INDEX idx_movie_sessions_gid_id (guild_id, id)`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE movie_sessions ADD INDEX idx_ms_gid_winner (guild_id, winner_message_id)`); } catch (e) {}
        try { await this.pool.execute(`ALTER TABLE movie_sessions ADD INDEX idx_ms_gid_assoc (guild_id, associated_movie_id)`); } catch (e) {}

        // 22.4 Retry the remaining composite FKs (the ones still warning)
        try {
          await this.pool.execute(`
            ALTER TABLE movies
            ADD CONSTRAINT fk_movies_session
            FOREIGN KEY (guild_id, session_id)
            REFERENCES movie_sessions(guild_id, id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 22 fk_movies_session warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_winner_movie
            FOREIGN KEY (guild_id, winner_message_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 22 fk_sessions_winner_movie warning:', error.message);
          }
        }

        try {
          await this.pool.execute(`
            ALTER TABLE movie_sessions
            ADD CONSTRAINT fk_sessions_associated_movie
            FOREIGN KEY (guild_id, associated_movie_id)
            REFERENCES movies(guild_id, message_id)
            ON DELETE SET NULL
          `);
        } catch (error) {
          if (!error.message.includes('Duplicate') && !error.message.includes('exists')) {
            logger.warn('Migration 22 fk_sessions_associated_movie warning:', error.message);
          }
        }

        // 22.5 Diagnostic: log column types/collations for future reference
        try {
          const [rows] = await this.pool.execute(`
            SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME, CHARACTER_SET_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN ('movies','movie_sessions','session_participants','session_attendees')
              AND COLUMN_NAME IN ('guild_id','message_id','session_id','winner_message_id','associated_movie_id','id')
            ORDER BY TABLE_NAME, COLUMN_NAME
          `);
          logger.debug('Migration 22 diagnostics:', rows);
        } catch (e) {
          logger.debug('Migration 22 diagnostics failed:', e.message);
        }

        logger.debug('✅ Migration 22: Column normalization and FK retry complete');
      } catch (error) {
        logger.warn('Migration 22 wrapper warning:', error.message);
      }


      logger.info('✅ Database migrations completed');

  }


  // Movie operations
  async saveMovie(movieData) {
    if (!this.isConnected) return null;

    if (this.useJsonFallback) {
      try {
        const movieUID = this.generateMovieUID(movieData.guildId, movieData.title);

        // Check if movie is banned in JSON data
        const bannedMovie = this.data.movies.find(m =>
          m.guild_id === movieData.guildId &&
          m.movie_uid === movieUID &&
          m.is_banned === true
        );

        if (bannedMovie) {
          throw new Error('MOVIE_BANNED');
        }

        const movie = {
          id: Date.now(), // Simple ID generation
          message_id: movieData.messageId,
          guild_id: movieData.guildId,
          channel_id: movieData.channelId,
          title: movieData.title,
          movie_uid: movieUID,
          where_to_watch: movieData.whereToWatch,
          recommended_by: movieData.recommendedBy,
          imdb_id: movieData.imdbId || null,
          imdb_data: movieData.imdbData || null,
          status: 'pending',
          is_banned: false,
          watch_count: 0,
          created_at: new Date().toISOString(),
          watched_at: null
        };

        this.data.movies.push(movie);
        await this.saveJsonData();
        return movie.id;
      } catch (error) {
        console.error('Error saving movie to JSON:', error.message);
        return null;
      }
    }

    try {
      // Generate movie UID
      const movieUID = this.generateMovieUID(movieData.guildId, movieData.title);

      // Check if this movie title is banned
      const [bannedCheck] = await this.pool.execute(
        `SELECT id FROM movies WHERE guild_id = ? AND movie_uid = ? AND is_banned = TRUE LIMIT 1`,
        [movieData.guildId, movieUID]
      );

      if (bannedCheck.length > 0) {
        throw new Error('MOVIE_BANNED');
      }

      // Check for active voting session and tag movie if one exists
      let sessionId = null;
      try {
        const activeSession = await this.getActiveVotingSession(movieData.guildId);
        if (activeSession) {
          sessionId = activeSession.id;
        }
      } catch (error) {
        console.warn('Error checking for active voting session:', error.message);
      }

      const [result] = await this.pool.execute(
        `INSERT INTO movies (message_id, guild_id, channel_id, title, movie_uid, where_to_watch, recommended_by, imdb_id, imdb_data, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movieData.messageId,
          movieData.guildId,
          movieData.channelId,
          movieData.title,
          movieUID,
          movieData.whereToWatch,
          movieData.recommendedBy,
          movieData.imdbId || null,
          movieData.imdbData ? JSON.stringify(movieData.imdbData) : null,
          sessionId
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error saving movie:', error.message);
      return null;
    }
  }

  async updateMovieStatus(messageId, status, watchedAt = null) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movies SET status = ?, watched_at = ? WHERE message_id = ?`,
        [status, watchedAt, messageId]
      );
      return true;
    } catch (error) {
      console.error('Error updating movie status:', error.message);
      return false;
    }
  }

  async getMovieByMessageId(messageId, guildId = null) {
    if (!this.isConnected) return null;

    try {
      let query = `SELECT * FROM movies WHERE message_id = ?`;
      let params = [messageId];

      if (guildId) {
        query += ` AND guild_id = ?`;
        params.push(guildId);
      }

      const [rows] = await this.pool.execute(query, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting movie by message ID:', error.message);
      return null;
    }
  }

  // Vote operations
  async saveVote(messageId, userId, voteType, guildId = null) {
    if (!this.isConnected) return false;

    try {
      // If guildId is not provided, try to get it from the movies table
      if (!guildId) {
        const [movieRows] = await this.pool.execute(
          `SELECT guild_id FROM movies WHERE message_id = ?`,
          [messageId]
        );
        if (movieRows.length > 0) {
          guildId = movieRows[0].guild_id;
        }
      }

      await this.pool.execute(
        `INSERT INTO votes (message_id, guild_id, user_id, vote_type) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)`,
        [messageId, guildId || '', userId, voteType]
      );
      return true;
    } catch (error) {
      console.error('Error saving vote:', error.message);
      return false;
    }
  }

  async removeVote(messageId, userId, guildId = null) {
    if (!this.isConnected) return false;

    try {
      if (guildId) {
        await this.pool.execute(
          `DELETE FROM votes WHERE message_id = ? AND user_id = ? AND guild_id = ?`,
          [messageId, userId, guildId]
        );
      } else {
        // Fallback without guild filter (kept for backward compatibility)
        await this.pool.execute(
          `DELETE FROM votes WHERE message_id = ? AND user_id = ?`,
          [messageId, userId]
        );
      }
      return true;
    } catch (error) {
      console.error('Error removing vote:', error.message);
      return false;
    }
  }

  async getUserVote(messageId, userId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT vote_type FROM votes WHERE message_id = ? AND user_id = ?`,
        [messageId, userId]
      );
      return rows.length > 0 ? rows[0].vote_type : null;
    } catch (error) {
      console.error('Error getting user vote:', error.message);
      return null;
    }
  }

  async findMovieByTitle(guildId, title) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE guild_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1`,
        [guildId, title]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding movie by title:', error.message);
      return null;
    }
  }

  async getVoteCounts(messageId) {
    if (!this.isConnected) return { up: 0, down: 0, voters: { up: [], down: [] } };

    try {
      const [rows] = await this.pool.execute(
        `SELECT vote_type, user_id FROM votes WHERE message_id = ?`,
        [messageId]
      );

      const up = rows.filter(r => r.vote_type === 'up');
      const down = rows.filter(r => r.vote_type === 'down');

      return {
        up: up.length,
        down: down.length,
        voters: {
          up: up.map(r => r.user_id),
          down: down.map(r => r.user_id)
        }
      };
    } catch (error) {
      console.error('Error getting vote counts:', error.message);
      return { up: 0, down: 0, voters: { up: [], down: [] } };
    }
  }

  // Statistics and queries
  async getMoviesByStatus(guildId, status = 'pending', limit = 10) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.*,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'up') as up_votes,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'down') as down_votes
         FROM movies m
         WHERE m.guild_id = ? AND m.status = ?
         ORDER BY m.created_at DESC
         LIMIT ?`,
        [guildId, status, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error getting movies by status:', error.message);
      return [];
    }
  }

  async getMoviesByStatusExcludingCarryover(guildId, status = 'pending', limit = 10) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.*,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'up') as up_votes,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'down') as down_votes
         FROM movies m
         WHERE m.guild_id = ? AND m.status = ? AND (m.next_session IS NULL OR m.next_session = FALSE)
         ORDER BY m.created_at DESC
         LIMIT ?`,
        [guildId, status, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error getting movies by status excluding carryover:', error.message);
      return [];
    }
  }

  async getTopMovies(guildId, limit = 5) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.*,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'up') as up_votes,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'down') as down_votes,
         ((SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'up') -
          (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'down')) as score
         FROM movies m
         WHERE m.guild_id = ? AND m.status = 'pending'
         ORDER BY score DESC, m.created_at ASC
         LIMIT ?`,
        [guildId, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error getting top movies:', error.message);
      return [];
    }
  }

  // Movie session operations
  async createMovieSession(sessionData) {
    if (!this.isConnected) return null;

    try {
      const [result] = await this.pool.execute(
        `INSERT INTO movie_sessions (guild_id, channel_id, name, description, scheduled_date, timezone, associated_movie_id, discord_event_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionData.guildId,
          sessionData.channelId,
          sessionData.name,
          sessionData.description || null,
          sessionData.scheduledDate || null,
          sessionData.timezone || 'UTC',
          sessionData.associatedMovieId || null,
          sessionData.discordEventId || null,
          sessionData.createdBy
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating movie session:', error.message);
      return null;
    }
  }

  async getMovieSessions(guildId, status = 'planning', limit = 10) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions
         WHERE guild_id = ? AND status = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [guildId, status, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error getting movie sessions:', error.message);
      return [];
    }
  }

  async updateSessionStatus(sessionId, status, winnerMessageId = null) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET status = ?, winner_message_id = ? WHERE id = ?`,
        [status, winnerMessageId, sessionId]
      );
      return true;
    } catch (error) {
      console.error('Error updating session status:', error.message);
      return false;
    }
  }

  async updateSessionDiscordEvent(sessionId, discordEventId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET discord_event_id = ? WHERE id = ?`,
        [discordEventId, sessionId]
      );
      return true;
    } catch (error) {
      console.error('Error updating session Discord event:', error.message);
      return false;
    }
  }

  async setGuildTimezone(guildId, timezone) {
    if (!this.isConnected) {
      console.error('Database not connected for setGuildTimezone');
      return false;
    }

    try {
      console.log(`🔍 Setting guild timezone:`, { guildId, timezone });

      const result = await this.pool.execute(
        `INSERT INTO guild_config (guild_id, default_timezone) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE default_timezone = VALUES(default_timezone)`,
        [guildId, timezone]
      );

      console.log(`✅ Guild timezone set successfully:`, result);
      return true;
    } catch (error) {
      console.error('Error setting guild timezone:', error);
      return false;
    }
  }

  async getGuildTimezone(guildId) {
    if (!this.isConnected) return 'UTC';

    try {
      const [rows] = await this.pool.execute(
        `SELECT default_timezone FROM guild_config WHERE guild_id = ?`,
        [guildId]
      );
      return rows.length > 0 ? rows[0].default_timezone : 'UTC';
    } catch (error) {
      console.error('Error getting guild timezone:', error.message);
      return 'UTC';
    }
  }

  // Guild configuration operations
  async getGuildConfig(guildId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM guild_config WHERE guild_id = ?`,
        [guildId]
      );

      if (rows.length === 0) {
        // Create default config
        await this.pool.execute(
          `INSERT INTO guild_config (guild_id, admin_roles) VALUES (?, ?)`,
          [guildId, JSON.stringify([])]
        );
        return { guild_id: guildId, movie_channel_id: null, admin_roles: [] };
      }

      const config = rows[0];
      config.admin_roles = config.admin_roles ? JSON.parse(config.admin_roles) : [];
      config.moderator_roles = config.moderator_roles ? JSON.parse(config.moderator_roles) : [];
      return config;
    } catch (error) {
      console.error('Error getting guild config:', error.message);
      return null;
    }
  }

  async setMovieChannel(guildId, channelId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `INSERT INTO guild_config (guild_id, movie_channel_id, admin_roles) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE movie_channel_id = VALUES(movie_channel_id)`,
        [guildId, channelId, JSON.stringify([])]
      );
      return true;
    } catch (error) {
      console.error('Error setting movie channel:', error.message);
      return false;
    }
  }

  async addAdminRole(guildId, roleId) {
    if (!this.isConnected) return false;

    try {
      const config = await this.getGuildConfig(guildId);
      if (!config) return false;

      if (!config.admin_roles.includes(roleId)) {
        config.admin_roles.push(roleId);
        await this.pool.execute(
          `UPDATE guild_config SET admin_roles = ? WHERE guild_id = ?`,
          [JSON.stringify(config.admin_roles), guildId]
        );
      }
      return true;
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('Error adding admin role:', error.message);
      return false;
    }
  }

  async removeAdminRole(guildId, roleId) {
    if (!this.isConnected) return false;

    try {
      const config = await this.getGuildConfig(guildId);
      if (!config) return false;

      config.admin_roles = config.admin_roles.filter(id => id !== roleId);
      await this.pool.execute(
        `UPDATE guild_config SET admin_roles = ? WHERE guild_id = ?`,
        [JSON.stringify(config.admin_roles), guildId]
      );
      return true;
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('Error removing admin role:', error.message);
      return false;
    }
  }

  async addModeratorRole(guildId, roleId) {
    if (!this.isConnected) return false;

    try {
      const config = await this.getGuildConfig(guildId);
      if (!config) return false;

      // Initialize moderator_roles if it doesn't exist
      if (!config.moderator_roles) {
        config.moderator_roles = [];
      }

      if (!config.moderator_roles.includes(roleId)) {
        config.moderator_roles.push(roleId);
        await this.pool.execute(
          `UPDATE guild_config SET moderator_roles = ? WHERE guild_id = ?`,
          [JSON.stringify(config.moderator_roles), guildId]
        );
      }
      return true;
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('Error adding moderator role:', error.message);
      return false;
    }
  }

  async removeModeratorRole(guildId, roleId) {
    if (!this.isConnected) return false;

    try {
      const config = await this.getGuildConfig(guildId);
      if (!config) return false;

      // Initialize moderator_roles if it doesn't exist
      if (!config.moderator_roles) {
        config.moderator_roles = [];
      }

      config.moderator_roles = config.moderator_roles.filter(id => id !== roleId);
      await this.pool.execute(
        `UPDATE guild_config SET moderator_roles = ? WHERE guild_id = ?`,
        [JSON.stringify(config.moderator_roles), guildId]
      );
      return true;
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('Error removing moderator role:', error.message);
      return false;
    }
  }

  async resetGuildConfig(guildId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `DELETE FROM guild_config WHERE guild_id = ?`,
        [guildId]
      );
      return true;
    } catch (error) {
      console.error('Error resetting guild config:', error.message);
      return false;
    }
  }

  // Additional session management methods
  async getMovieSessionsByGuild(guildId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions WHERE guild_id = ? AND status != 'cancelled' ORDER BY created_at DESC`,
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting guild sessions:', error.message);
      return [];
    }
  }



  async updateSessionStatus(sessionId, status) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET status = ? WHERE id = ?`,
        [status, sessionId]
      );
      return true;
    } catch (error) {
      console.error('Error updating session status:', error.message);
      return false;
    }
  }

  async updateSessionWinner(sessionId, winnerMessageId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET winner_message_id = ? WHERE id = ?`,
        [winnerMessageId, sessionId]
      );
      return true;
    } catch (error) {
      console.error('Error updating session winner:', error.message);
      return false;
    }
  }

  // Voting session management methods
  async getActiveVotingSession(guildId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions
         WHERE guild_id = ? AND status = 'voting'
         ORDER BY created_at DESC
         LIMIT 1`,
        [guildId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting active voting session:', error.message);
      return null;
    }
  }

  async createVotingSession(sessionData) {
    if (!this.isConnected) return null;

    try {
      const [result] = await this.pool.execute(
        `INSERT INTO movie_sessions (guild_id, channel_id, name, description, scheduled_date, voting_end_time, timezone, status, discord_event_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'voting', ?, ?)`,
        [
          sessionData.guildId,
          sessionData.channelId,
          sessionData.name,
          sessionData.description || null,
          sessionData.scheduledDate || null,
          sessionData.votingEndTime || null,
          sessionData.timezone || 'UTC',
          sessionData.discordEventId || null,
          sessionData.createdBy
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating voting session:', error.message);
      return null;
    }
  }

  async updateVotingSessionEventId(sessionId, eventId) {
    if (!this.isConnected) return false;

    try {
      const logger = require('./utils/logger');
      logger.debug(`🗄️ Database: Updating session ${sessionId} with event ID ${eventId}`);
      const [result] = await this.pool.execute(
        `UPDATE movie_sessions SET discord_event_id = ? WHERE id = ?`,
        [eventId, sessionId]
      );
      logger.debug(`🗄️ Database: Update result - affected rows: ${result.affectedRows}`);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating voting session event ID:', error.message);
      return false;
    }
  }

  async getMoviesByGuild(guildId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE guild_id = ? ORDER BY created_at DESC`,
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting movies by guild:', error.message);
      return [];
    }
  }

  async getVotingSessionById(sessionId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions WHERE id = ?`,
        [sessionId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting voting session by ID:', error.message);
      return null;
    }
  }

  async deleteVotingSession(sessionId) {
    if (!this.isConnected) return false;

    try {
      // Delete associated movies first
      await this.pool.execute(
        `DELETE FROM movies WHERE session_id = ?`,
        [sessionId]
      );

      // Delete votes for movies in this session
      await this.pool.execute(
        `DELETE FROM votes WHERE message_id IN (SELECT message_id FROM movies WHERE session_id = ?)`,
        [sessionId]
      );

      // Delete the session
      await this.pool.execute(
        `DELETE FROM movie_sessions WHERE id = ?`,
        [sessionId]
      );

      return true;
    } catch (error) {
      console.error('Error deleting voting session:', error.message);
      return false;
    }
  }

  async getAllActiveVotingSessions() {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions WHERE status = 'voting' ORDER BY scheduled_date ASC`
      );
      return rows;
    } catch (error) {
      console.error('Error getting all active voting sessions:', error.message);
      return [];
    }
  }

  async getMoviesBySession(sessionId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE session_id = ? ORDER BY created_at DESC`,
        [sessionId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting movies by session:', error.message);
      return [];
    }
  }

  async updateVotingSessionStatus(sessionId, status) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET status = ? WHERE id = ?`,
        [status, sessionId]
      );
      return true;
    } catch (error) {
      console.error('Error updating voting session status:', error.message);
      return false;
    }
  }

  async getVotesByMessageId(messageId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM votes WHERE message_id = ?`,
        [messageId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting votes by message ID:', error.message);
      return [];
    }
  }

  async deleteMovie(messageId) {
    if (!this.isConnected) return false;

    try {
      // Delete votes first
      await this.pool.execute(
        `DELETE FROM votes WHERE message_id = ?`,
        [messageId]
      );

      // Delete the movie
      await this.pool.execute(
        `DELETE FROM movies WHERE message_id = ?`,
        [messageId]
      );

      return true;
    } catch (error) {
      console.error('Error deleting movie:', error.message);
      return false;
    }
  }

  async markMoviesForNextSession(guildId, excludeWinnerId = null) {
    if (!this.isConnected) return false;

    try {
      // Mark all non-winning movies from current session for next session
      let query = `
        UPDATE movies
        SET next_session = TRUE, session_id = NULL, status = 'pending'
        WHERE guild_id = ? AND status IN ('pending', 'planned')
      `;
      let params = [guildId];

      if (excludeWinnerId) {
        query += ` AND id != ?`;
        params.push(excludeWinnerId);
      }

      await this.pool.execute(query, params);
      const logger = require('./utils/logger');
      logger.info('✅ Marked non-winning movies for next session');
      return true;
    } catch (error) {
      console.error('Error marking movies for next session:', error.message);
      return false;
    }
  }

  async getNextSessionMovies(guildId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE guild_id = ? AND next_session = TRUE ORDER BY created_at ASC`,
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting next session movies:', error.message);
      return [];
    }
  }

  async clearNextSessionFlag(guildId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movies SET next_session = FALSE WHERE guild_id = ? AND next_session = TRUE`,
        [guildId]
      );
      const logger = require('./utils/logger');
      logger.debug('✅ Cleared next_session flags');
      return true;
    } catch (error) {
      console.error('Error clearing next_session flags:', error.message);
      return false;
    }
  }

  async resetMovieVotes(movieId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `DELETE FROM votes WHERE message_id = ?`,
        [movieId]
      );
      return true;
    } catch (error) {
      console.error('Error resetting movie votes:', error.message);
      return false;
    }
  }

  async updateMovieSessionId(messageId, sessionId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movies SET session_id = ? WHERE message_id = ?`,
        [sessionId, messageId]
      );
      return true;
    } catch (error) {
      console.error('Error updating movie session ID:', error.message);
      return false;
    }
  }

  async updateMovieImdbData(messageId, imdbData) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movies SET imdb_data = ? WHERE message_id = ?`,
        [imdbData, messageId]
      );
      return true;
    } catch (error) {
      console.error('Error updating movie IMDB data:', error.message);
      return false;
    }
  }

  // Forum Channel Support Functions

  async addForumMovie(guildId, title, whereToWatch, recommendedBy, messageId, threadId, channelId, imdbId = null, imdbData = null) {
    if (!this.isConnected) return false;

    try {
      // Generate movie UID
      const movieUID = this.generateMovieUID(guildId, title);

      // Get active session ID
      const activeSession = await this.getActiveVotingSession(guildId);
      const sessionId = activeSession ? activeSession.id : null;

      const [result] = await this.pool.execute(
        `INSERT INTO movies (guild_id, channel_id, title, movie_uid, where_to_watch, recommended_by, message_id, thread_id, channel_type, imdb_id, imdb_data, status, session_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'forum', ?, ?, 'pending', ?, NOW())`,
        [guildId, channelId, title, movieUID, whereToWatch, recommendedBy, messageId, threadId, imdbId, imdbData ? JSON.stringify(imdbData) : null, sessionId]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error adding forum movie:', error.message);
      return false;
    }
  }

  async getMovieByThreadId(threadId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE thread_id = ?`,
        [threadId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting movie by thread ID:', error.message);
      return null;
    }
  }

  async updateMovieThreadId(messageId, threadId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movies SET thread_id = ? WHERE message_id = ?`,
        [threadId, messageId]
      );
      return true;
    } catch (error) {
      console.error('Error updating movie thread ID:', error.message);
      return false;
    }
  }

  async getForumMovies(guildId, limit = 50) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.*,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'up') as up_votes,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'down') as down_votes
         FROM movies m
         WHERE m.guild_id = ? AND m.channel_type = 'forum'
         ORDER BY m.created_at DESC
         LIMIT ?`,
        [guildId, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error getting forum movies:', error.message);
      return [];
    }
  }

  async getChannelType(guildId) {
    if (!this.isConnected) return 'text';

    try {
      const [rows] = await this.pool.execute(
        `SELECT channel_type FROM movies WHERE guild_id = ? ORDER BY created_at DESC LIMIT 1`,
        [guildId]
      );
      return rows.length > 0 ? rows[0].channel_type : 'text';
    } catch (error) {
      console.error('Error getting channel type:', error.message);
      return 'text';
    }
  }

  async getMoviesForVotingSession(sessionId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.*,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'up') as up_votes,
         (SELECT COUNT(*) FROM votes v WHERE v.message_id = m.message_id AND v.vote_type = 'down') as down_votes
         FROM movies m
         WHERE m.session_id = ?
         ORDER BY m.created_at ASC`,
        [sessionId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting movies for voting session:', error.message);
      return [];
    }
  }

  async moveMovieToNextSession(movieId) {
    if (!this.isConnected) return false;

    try {
      // Clear the session_id to move it back to general queue
      await this.pool.execute(
        `UPDATE movies SET session_id = NULL, status = 'pending' WHERE message_id = ?`,
        [movieId]
      );

      // Clear votes for this movie
      await this.pool.execute(
        `DELETE FROM votes WHERE message_id = ?`,
        [movieId]
      );

      return true;
    } catch (error) {
      console.error('Error moving movie to next session:', error.message);
      return false;
    }
  }

  async finalizeVotingSession(sessionId, winnerMovieId) {
    if (!this.isConnected) return false;

    try {
      // Update session status and winner
      await this.pool.execute(
        `UPDATE movie_sessions SET status = 'decided', winner_message_id = ? WHERE id = ?`,
        [winnerMovieId, sessionId]
      );

      // Update winner movie status to scheduled
      await this.pool.execute(
        `UPDATE movies SET status = 'scheduled' WHERE message_id = ?`,
        [winnerMovieId]
      );

      // Move non-winning movies back to general queue
      await this.pool.execute(
        `UPDATE movies SET session_id = NULL, status = 'pending'
         WHERE session_id = ? AND message_id != ?`,
        [sessionId, winnerMovieId]
      );

      return true;
    } catch (error) {
      console.error('Error finalizing voting session:', error.message);
      return false;
    }
  }

  async updateSessionMovie(sessionId, movieMessageId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET associated_movie_id = ? WHERE id = ?`,
        [movieMessageId, sessionId]
      );
      return true;
    } catch (error) {
      console.error('Error updating session movie:', error.message);
      return false;
    }
  }

  async getTopVotedMovie(guildId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.*,
          COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
          COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes,
          COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as score
         FROM movies m
         LEFT JOIN votes v ON m.message_id = v.message_id
         WHERE m.guild_id = ? AND m.status = 'pending'
         GROUP BY m.message_id
         ORDER BY score DESC, upvotes DESC
         LIMIT 1`,
        [guildId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting top voted movie:', error.message);
      return null;
    }
  }

  async findMovieByTitle(guildId, title) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE guild_id = ? AND title LIKE ? ORDER BY created_at DESC LIMIT 1`,
        [guildId, `%${title}%`]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding movie by title:', error.message);
      return null;
    }
  }

  async getMovieById(messageId, guildId = null) {
    if (!this.isConnected) return null;

    try {
      let query = `SELECT * FROM movies WHERE message_id = ?`;
      let params = [messageId];

      if (guildId) {
        query += ` AND guild_id = ?`;
        params.push(guildId);
      }

      const [rows] = await this.pool.execute(query, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting movie by ID:', error.message);
      return null;
    }
  }

  async updateMovieMessageId(guildId, title, messageId) {
    if (!this.isConnected) return false;

    try {
      // First get the old message ID
      const [oldMovie] = await this.pool.execute(
        `SELECT message_id FROM movies WHERE guild_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1`,
        [guildId, title]
      );

      if (oldMovie.length > 0) {
        const oldMessageId = oldMovie[0].message_id;

        // Update votes to reference the new message ID
        await this.pool.execute(
          `UPDATE votes SET message_id = ? WHERE message_id = ?`,
          [messageId, oldMessageId]
        );
      }

      // Now update the movie message ID
      await this.pool.execute(
        `UPDATE movies SET message_id = ? WHERE guild_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1`,
        [messageId, guildId, title]
      );
      return true;
    } catch (error) {
      console.error('Error updating movie message ID:', error.message);
      return false;
    }
  }

  // Statistics methods
  async getMovieStats(guildId) {
    if (!this.isConnected) return {
      totalMovies: 0, watchedMovies: 0, plannedMovies: 0,
      pendingMovies: 0, queuedMovies: 0, activeUsers: 0, totalSessions: 0
    };

    try {
      // Get active session to filter current voting movies
      const activeSession = await this.getActiveVotingSession(guildId);

      const [movieStats] = await this.pool.execute(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'watched' THEN 1 ELSE 0 END) as watched,
          SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned,
          SUM(CASE WHEN status = 'pending' AND session_id = ? THEN 1 ELSE 0 END) as pending_in_session,
          SUM(CASE WHEN next_session = 1 THEN 1 ELSE 0 END) as queued_for_next,
          COUNT(DISTINCT recommended_by) as active_users
         FROM movies WHERE guild_id = ?`,
        [activeSession?.id || 0, guildId]
      );

      // Count only sessions with active Discord events (scheduled sessions)
      const [sessionStats] = await this.pool.execute(
        `SELECT COUNT(*) as total_sessions FROM movie_sessions
         WHERE guild_id = ? AND discord_event_id IS NOT NULL`,
        [guildId]
      );

      return {
        totalMovies: movieStats[0].total || 0,
        watchedMovies: movieStats[0].watched || 0,
        plannedMovies: movieStats[0].planned || 0,
        pendingMovies: activeSession ? (movieStats[0].pending_in_session || 0) : 0,
        queuedMovies: movieStats[0].queued_for_next || 0,
        activeUsers: movieStats[0].active_users || 0,
        totalSessions: sessionStats[0].total_sessions || 0
      };
    } catch (error) {
      const logger = require('./utils/logger');
      logger.error('Error getting movie stats:', error.message);
      return {
        totalMovies: 0, watchedMovies: 0, plannedMovies: 0,
        pendingMovies: 0, queuedMovies: 0, activeUsers: 0, totalSessions: 0
      };
    }
  }

  async getTopVotedMovies(guildId, limit = 10) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.*,
          COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
          COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes,
          COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as score
         FROM movies m
         LEFT JOIN votes v ON m.message_id = v.message_id
         WHERE m.guild_id = ?
         GROUP BY m.message_id
         HAVING upvotes > 0 OR downvotes > 0
         ORDER BY score DESC, upvotes DESC
         LIMIT ?`,
        [guildId, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error getting top voted movies:', error.message);
      return [];
    }
  }

  async getUserStats(guildId, userId) {
    if (!this.isConnected) return {
      moviesRecommended: 0, upvotesReceived: 0, downvotesReceived: 0,
      moviesWatched: 0, moviesPlanned: 0, totalVotes: 0,
      upvotesGiven: 0, downvotesGiven: 0, sessionsCreated: 0
    };

    try {
      // Get user's movie recommendations and votes received
      const [movieRows] = await this.pool.execute(
        `SELECT
          COUNT(DISTINCT m.message_id) as recommended,
          COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes_received,
          COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes_received,
          SUM(CASE WHEN m.status = 'watched' THEN 1 ELSE 0 END) as watched,
          SUM(CASE WHEN m.status = 'planned' THEN 1 ELSE 0 END) as planned
         FROM movies m
         LEFT JOIN votes v ON m.message_id = v.message_id
         WHERE m.guild_id = ? AND m.recommended_by = ?`,
        [guildId, userId]
      );

      // Get user's voting activity (votes given by this user)
      const [voteRows] = await this.pool.execute(
        `SELECT
          COUNT(*) as total_votes,
          SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes_given,
          SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes_given
         FROM votes
         WHERE guild_id = ? AND user_id = ?`,
        [guildId, userId]
      );

      // Get user's session creation count
      const [sessionRows] = await this.pool.execute(
        `SELECT COUNT(*) as sessions_created
         FROM movie_sessions
         WHERE guild_id = ? AND created_by = ?`,
        [guildId, userId]
      );

      return {
        moviesRecommended: movieRows[0].recommended || 0,
        upvotesReceived: movieRows[0].upvotes_received || 0,
        downvotesReceived: movieRows[0].downvotes_received || 0,
        moviesWatched: movieRows[0].watched || 0,
        moviesPlanned: movieRows[0].planned || 0,
        totalVotes: voteRows[0].total_votes || 0,
        upvotesGiven: voteRows[0].upvotes_given || 0,
        downvotesGiven: voteRows[0].downvotes_given || 0,
        sessionsCreated: sessionRows[0].sessions_created || 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error.message);
      return {
        moviesRecommended: 0, upvotesReceived: 0, downvotesReceived: 0,
        moviesWatched: 0, moviesPlanned: 0, totalVotes: 0,
        upvotesGiven: 0, downvotesGiven: 0, sessionsCreated: 0
      };
    }
  }

  async getMonthlyStats(guildId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as movies,
          0 as sessions
         FROM movies WHERE guild_id = ?
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month DESC LIMIT 12`,
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting monthly stats:', error.message);
      return [];
    }
  }



  async setNotificationRole(guildId, roleId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `INSERT INTO guild_config (guild_id, notification_role_id, admin_roles) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE notification_role_id = VALUES(notification_role_id)`,
        [guildId, roleId, JSON.stringify([])]
      );
      return true;
    } catch (error) {
      console.error('Error setting notification role:', error.message);
      return false;
    }
  }

  async getNotificationRole(guildId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT notification_role_id FROM guild_config WHERE guild_id = ?`,
        [guildId]
      );
      return rows.length > 0 ? rows[0].notification_role_id : null;
    } catch (error) {
      console.error('Error getting notification role:', error.message);
      return null;
    }
  }

  async setViewingChannel(guildId, channelId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `INSERT INTO guild_config (guild_id, session_viewing_channel_id, admin_roles)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE session_viewing_channel_id = VALUES(session_viewing_channel_id)`,
        [guildId, channelId, JSON.stringify([])]
      );
      return true;
    } catch (error) {
      console.error('Error setting viewing channel:', error.message);
      return false;
    }
  }

  async setAdminChannel(guildId, channelId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `INSERT INTO guild_config (guild_id, admin_channel_id, admin_roles)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE admin_channel_id = VALUES(admin_channel_id)`,
        [guildId, channelId, JSON.stringify([])]
      );
      return true;
    } catch (error) {
      console.error('Error setting admin channel:', error.message);
      return false;
    }
  }

  async getMoviesByChannel(guildId, channelId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE guild_id = ? AND channel_id = ? ORDER BY created_at DESC`,
        [guildId, channelId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting movies by channel:', error.message);
      return [];
    }
  }

  async getAllMovies(guildId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE guild_id = ? ORDER BY created_at DESC`,
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting all movies:', error.message);
      return [];
    }
  }

  async getSessionByMovieId(movieMessageId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions WHERE associated_movie_id = ? ORDER BY created_at DESC LIMIT 1`,
        [movieMessageId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting session by movie ID:', error.message);
      return null;
    }
  }

  async getSessionById(sessionId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions WHERE id = ?`,
        [sessionId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting session by ID:', error.message);
      return null;
    }
  }

  async transferVotes(oldMessageId, newMessageId) {
    if (!this.isConnected) return false;

    try {
      // Transfer all votes from old message ID to new message ID
      await this.pool.execute(
        `UPDATE votes SET message_id = ? WHERE message_id = ?`,
        [newMessageId, oldMessageId]
      );
      console.log(`📊 Database: Transferred votes from ${oldMessageId} to ${newMessageId}`);
      return true;
    } catch (error) {
      console.error('Error transferring votes:', error.message);
      return false;
    }
  }

  async getAllSessions(guildId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movie_sessions WHERE guild_id = ? ORDER BY created_at DESC`,
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting all sessions:', error.message);
      return [];
    }
  }

  async getMovieBySessionId(sessionId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT m.* FROM movies m
         JOIN movie_sessions s ON m.message_id = s.associated_movie_id
         WHERE s.id = ?`,
        [sessionId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting movie by session ID:', error.message);
      return null;
    }
  }

  async updateSessionEventId(sessionId, eventId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET discord_event_id = ? WHERE id = ?`,
        [eventId, sessionId]
      );
      return true;
    } catch (error) {
      console.error('Error updating session event ID:', error.message);
      return false;
    }
  }

  async deleteMovieSession(sessionId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `DELETE FROM movie_sessions WHERE id = ?`,
        [sessionId]
      );
      console.log(`🗑️ Database: Deleted session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting movie session:', error.message);
      return false;
    }
  }

  async updateSessionMovieAssociation(sessionId, movieMessageId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movie_sessions SET associated_movie_id = ? WHERE id = ?`,
        [movieMessageId, sessionId]
      );
      console.log(`📊 Database: Updated session ${sessionId} movie association to ${movieMessageId || 'null'}`);
      return true;
    } catch (error) {
      console.error('Error updating session movie association:', error.message);
      return false;
    }
  }

  async deleteVotesByMessageId(messageId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `DELETE FROM votes WHERE message_id = ?`,
        [messageId]
      );
      console.log(`🗑️ Database: Deleted votes for message ${messageId}`);
      return true;
    } catch (error) {
      console.error('Error deleting votes:', error.message);
      return false;
    }
  }

  async deleteMovie(messageId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `DELETE FROM movies WHERE message_id = ?`,
        [messageId]
      );
      console.log(`🗑️ Database: Deleted movie with message ID ${messageId}`);
      return true;
    } catch (error) {
      console.error('Error deleting movie:', error.message);
      return false;
    }
  }

  // Session participants functionality
  async addSessionParticipant(sessionId, userId, guildId = null) {
    if (!this.isConnected) return false;

    try {
      // If guildId is not provided, get it from the movie_sessions table
      if (!guildId) {
        const [sessionRows] = await this.pool.execute(
          `SELECT guild_id FROM movie_sessions WHERE id = ?`,
          [sessionId]
        );
        if (sessionRows.length > 0) {
          guildId = sessionRows[0].guild_id;
        }
      }

      await this.pool.execute(
        `INSERT IGNORE INTO session_participants (session_id, guild_id, user_id) VALUES (?, ?, ?)`,
        [sessionId, guildId || '', userId]
      );
      return true;
    } catch (error) {
      console.error('Error adding session participant:', error.message);
      return false;
    }
  }

  async getSessionParticipants(sessionId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT user_id FROM session_participants WHERE session_id = ?`,
        [sessionId]
      );
      return rows.map(row => row.user_id);
    } catch (error) {
      console.error('Error getting session participants:', error.message);
      return [];
    }
  }

  async incrementWatchCount(messageId, guildId = null) {
    if (!this.isConnected) return false;

    try {
      let query = `UPDATE movies SET watch_count = watch_count + 1 WHERE message_id = ?`;
      const params = [messageId];
      if (guildId) {
        query += ` AND guild_id = ?`;
        params.push(guildId);
      }
      await this.pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Error incrementing watch count:', error.message);
      return false;
    }
  }

  async getWatchCount(messageId, guildId = null) {
    if (!this.isConnected) return 0;

    try {
      let query = `SELECT watch_count FROM movies WHERE message_id = ?`;
      const params = [messageId];
      if (guildId) {
        query += ` AND guild_id = ?`;
        params.push(guildId);
      }
      const [rows] = await this.pool.execute(query, params);
      return rows.length > 0 ? rows[0].watch_count || 0 : 0;
    } catch (error) {
      console.error('Error getting watch count:', error.message);
      return 0;
    }
  }

  // Database cleanup and maintenance functions - GUILD-SCOPED for security
  async cleanupOrphanedData(guildId = null) {
    if (!this.isConnected) return { cleaned: 0, errors: [] };

    const results = { cleaned: 0, errors: [] };

    try {
      if (guildId) {
        // Guild-specific cleanup (SECURE)

        // Clean up votes for non-existent movies in this guild
        const [orphanedVotes] = await this.pool.execute(`
          DELETE v FROM votes v
          LEFT JOIN movies m ON v.message_id = m.message_id AND m.guild_id = ?
          WHERE v.guild_id = ? AND m.message_id IS NULL
        `, [guildId, guildId]);
        results.cleaned += orphanedVotes.affectedRows;
        console.log(`🧹 Guild ${guildId}: Cleaned up ${orphanedVotes.affectedRows} orphaned votes`);

        // Clean up session participants for non-existent sessions in this guild
        const [orphanedParticipants] = await this.pool.execute(`
          DELETE sp FROM session_participants sp
          LEFT JOIN movie_sessions ms ON sp.session_id = ms.id AND ms.guild_id = ?
          WHERE sp.guild_id = ? AND ms.id IS NULL
        `, [guildId, guildId]);
        results.cleaned += orphanedParticipants.affectedRows;
        console.log(`🧹 Guild ${guildId}: Cleaned up ${orphanedParticipants.affectedRows} orphaned session participants`);

        // Clean up session attendees for non-existent sessions in this guild
        const [orphanedAttendees] = await this.pool.execute(`
          DELETE sa FROM session_attendees sa
          LEFT JOIN movie_sessions ms ON sa.session_id = ms.id AND ms.guild_id = ?
          WHERE sa.guild_id = ? AND ms.id IS NULL
        `, [guildId, guildId]);
        results.cleaned += orphanedAttendees.affectedRows;
        console.log(`🧹 Guild ${guildId}: Cleaned up ${orphanedAttendees.affectedRows} orphaned session attendees`);

      } else {
        // Global cleanup (ADMIN ONLY - should rarely be used)
        const logger = require('./utils/logger');
        logger.warn('⚠️ PERFORMING GLOBAL DATABASE CLEANUP - This affects ALL guilds!');

        // Clean up votes for non-existent movies (global)
        const [orphanedVotes] = await this.pool.execute(`
          DELETE v FROM votes v
          LEFT JOIN movies m ON v.message_id = m.message_id
          WHERE m.message_id IS NULL
        `);
        results.cleaned += orphanedVotes.affectedRows;
        logger.info(`🧹 Global: Cleaned up ${orphanedVotes.affectedRows} orphaned votes`);

        // Clean up session participants for non-existent sessions (global)
        const [orphanedParticipants] = await this.pool.execute(`
          DELETE sp FROM session_participants sp
          LEFT JOIN movie_sessions ms ON sp.session_id = ms.id
          WHERE ms.id IS NULL
        `);
        results.cleaned += orphanedParticipants.affectedRows;
        console.log(`🧹 Global: Cleaned up ${orphanedParticipants.affectedRows} orphaned session participants`);

        // Clean up session attendees for non-existent sessions (global)
        const [orphanedAttendees] = await this.pool.execute(`
          DELETE sa FROM session_attendees sa
          LEFT JOIN movie_sessions ms ON sa.session_id = ms.id
          WHERE ms.id IS NULL
        `);
        results.cleaned += orphanedAttendees.affectedRows;
        console.log(`🧹 Global: Cleaned up ${orphanedAttendees.affectedRows} orphaned session attendees`);
      }

    } catch (error) {
      console.error('Error during database cleanup:', error.message);
      results.errors.push(error.message);
    }

    return results;
  }

  // Session attendance tracking functions
  async addSessionAttendee(sessionId, userId, guildId = null) {
    if (!this.isConnected) return false;

    try {
      // If guildId is not provided, get it from the movie_sessions table
      if (!guildId) {
        const [sessionRows] = await this.pool.execute(
          `SELECT guild_id FROM movie_sessions WHERE id = ?`,
          [sessionId]
        );
        if (sessionRows.length > 0) {
          guildId = sessionRows[0].guild_id;
        }
      }

      await this.pool.execute(
        `INSERT INTO session_attendees (session_id, guild_id, user_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE joined_at = CURRENT_TIMESTAMP`,
        [sessionId, guildId || '', userId]
      );
      return true;
    } catch (error) {
      console.error('Error adding session attendee:', error.message);
      return false;
    }
  }

  async recordSessionLeave(sessionId, userId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE session_attendees
         SET left_at = CURRENT_TIMESTAMP,
             duration_minutes = TIMESTAMPDIFF(MINUTE, joined_at, CURRENT_TIMESTAMP)
         WHERE session_id = ? AND user_id = ? AND left_at IS NULL`,
        [sessionId, userId]
      );
      return true;
    } catch (error) {
      console.error('Error recording session leave:', error.message);
      return false;
    }
  }

  async getSessionAttendees(sessionId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT user_id, joined_at, left_at, duration_minutes
         FROM session_attendees
         WHERE session_id = ?
         ORDER BY joined_at`,
        [sessionId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting session attendees:', error.message);
      return [];
    }
  }

  // Movie banning functions
  async banMovie(guildId, movieTitle) {
    if (!this.isConnected) return false;

    try {
      const movieUID = this.generateMovieUID(guildId, movieTitle);

      // Create a banned movie record if it doesn't exist
      await this.pool.execute(
        `INSERT INTO movies (message_id, guild_id, channel_id, title, movie_uid, where_to_watch, recommended_by, status, is_banned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_banned = TRUE, status = 'banned'`,
        [
          `banned_${Date.now()}`, // Unique message ID for banned movies
          guildId,
          'admin', // Admin channel
          movieTitle,
          movieUID,
          'N/A',
          'system',
          'banned',
          true
        ]
      );

      // Also ban any existing instances of this movie
      await this.pool.execute(
        `UPDATE movies SET is_banned = TRUE, status = 'banned' WHERE guild_id = ? AND movie_uid = ?`,
        [guildId, movieUID]
      );

      return true;
    } catch (error) {
      console.error('Error banning movie:', error.message);
      return false;
    }
  }

  async unbanMovie(guildId, movieTitle) {
    if (!this.isConnected) return false;

    try {
      const movieUID = this.generateMovieUID(guildId, movieTitle);

      await this.pool.execute(
        `UPDATE movies SET is_banned = FALSE WHERE guild_id = ? AND movie_uid = ? AND is_banned = TRUE`,
        [guildId, movieUID]
      );

      return true;
    } catch (error) {
      console.error('Error unbanning movie:', error.message);
      return false;
    }
  }

  async isMovieBanned(guildId, movieTitle) {
    if (!this.isConnected) return false;

    try {
      const movieUID = this.generateMovieUID(guildId, movieTitle);

      const [rows] = await this.pool.execute(
        `SELECT id FROM movies WHERE guild_id = ? AND movie_uid = ? AND is_banned = TRUE LIMIT 1`,
        [guildId, movieUID]
      );

      return rows.length > 0;
    } catch (error) {
      console.error('Error checking if movie is banned:', error.message);
      return false;
    }
  }

  async getBannedMovies(guildId) {
    if (!this.isConnected) return [];

    try {
      const [rows] = await this.pool.execute(
        `SELECT DISTINCT title, movie_uid, created_at
         FROM movies
         WHERE guild_id = ? AND is_banned = TRUE
         ORDER BY title ASC`,
        [guildId]
      );

      return rows;
    } catch (error) {
      console.error('Error getting banned movies:', error.message);
      return [];
    }
  }

  // Enhanced purge function that preserves movie records
  async purgeGuildMovieQueue(guildId) {
    if (!this.isConnected) return { purged: 0, preserved: 0, errors: [] };

    const results = { purged: 0, preserved: 0, errors: [] };

    try {
      // Get count of movies that will be affected
      const [movieCount] = await this.pool.execute(
        `SELECT COUNT(*) as total FROM movies WHERE guild_id = ? AND status IN ('pending', 'planned', 'scheduled')`,
        [guildId]
      );

      // Clear votes for all movies in this guild
      const [votesResult] = await this.pool.execute(
        `DELETE FROM votes WHERE guild_id = ?`,
        [guildId]
      );
      results.purged += votesResult.affectedRows;

      // Update movie records: preserve banned/watched movies, reset others to archived state
      const [moviesResult] = await this.pool.execute(`
        UPDATE movies
        SET
          message_id = CONCAT('purged_', id),
          channel_id = 'archived',
          status = CASE
            WHEN is_banned = TRUE THEN 'banned'
            WHEN status = 'watched' THEN 'watched'
            ELSE 'pending'
          END,
          session_id = NULL
        WHERE guild_id = ? AND status IN ('pending', 'planned', 'scheduled')
      `, [guildId]);

      results.purged += moviesResult.affectedRows;
      results.preserved = movieCount[0].total;

      console.log(`🗑️ Purged ${results.purged} queue items, preserved ${results.preserved} movie records`);

    } catch (error) {
      console.error('Error during guild purge:', error.message);
      results.errors.push(error.message);
    }

    return results;
  }

  // Deep purge function for complete guild data removal
  async deepPurgeGuildData(guildId, options = {}) {
    if (!this.isConnected) return { deleted: 0, errors: [] };

    const results = { deleted: 0, errors: [] };
    const {
      movies = false,
      sessions = false,
      votes = false,
      participants = false,
      attendees = false,
      config = false
    } = options;

    try {
      if (votes) {
        const [votesResult] = await this.pool.execute(
          `DELETE FROM votes WHERE guild_id = ?`,
          [guildId]
        );
        results.deleted += votesResult.affectedRows;
        console.log(`🗑️ Deep purge: Deleted ${votesResult.affectedRows} votes`);
      }

      if (participants) {
        const [participantsResult] = await this.pool.execute(
          `DELETE FROM session_participants WHERE guild_id = ?`,
          [guildId]
        );
        results.deleted += participantsResult.affectedRows;
        console.log(`🗑️ Deep purge: Deleted ${participantsResult.affectedRows} session participants`);
      }

      if (attendees) {
        const [attendeesResult] = await this.pool.execute(
          `DELETE FROM session_attendees WHERE guild_id = ?`,
          [guildId]
        );
        results.deleted += attendeesResult.affectedRows;
        console.log(`🗑️ Deep purge: Deleted ${attendeesResult.affectedRows} session attendees`);
      }

      if (sessions) {
        const [sessionsResult] = await this.pool.execute(
          `DELETE FROM movie_sessions WHERE guild_id = ?`,
          [guildId]
        );
        results.deleted += sessionsResult.affectedRows;
        console.log(`🗑️ Deep purge: Deleted ${sessionsResult.affectedRows} movie sessions`);
      }

      if (movies) {
        const [moviesResult] = await this.pool.execute(
          `DELETE FROM movies WHERE guild_id = ?`,
          [guildId]
        );
        results.deleted += moviesResult.affectedRows;
        console.log(`🗑️ Deep purge: Deleted ${moviesResult.affectedRows} movies`);
      }

      if (config) {
        const [configResult] = await this.pool.execute(
          `DELETE FROM guild_config WHERE guild_id = ?`,
          [guildId]
        );
        results.deleted += configResult.affectedRows;
        console.log(`🗑️ Deep purge: Deleted ${configResult.affectedRows} guild config`);
      }

    } catch (error) {
      console.error('Error during deep purge:', error.message);
      results.errors.push(error.message);
    }

    return results;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

module.exports = new Database();
