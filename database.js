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
      console.log(`🔌 Attempting to connect to MySQL at ${host}:${port}...`);
      await this.pool.execute('SELECT 1');
      this.isConnected = true;
      console.log('✅ Connected to MySQL database');
      
      // Initialize tables
      await this.initializeTables();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('🔄 Falling back to JSON storage...');
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
      console.log('✅ Connected to JSON file storage');
      console.log('💡 Tip: Set database credentials in .env for full MySQL features');
      return true;
    } catch (error) {
      console.error('❌ JSON storage initialization failed:', error.message);
      console.log('⚠️  Running in memory-only mode');
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
      console.error('Failed to save JSON data:', error.message);
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

    console.log('✅ Database tables initialized');
  }

  async runMigrations() {
    console.log('🔄 Running database migrations...');

    try {
      // Check current schema first
      const [columns] = await this.pool.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guild_config'
      `);
      const columnNames = columns.map(row => row.COLUMN_NAME);
      console.log('Current guild_config columns:', columnNames);

      // Migration 1: Ensure timezone column exists in movie_sessions
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'
        `);
        console.log('✅ Added timezone column to movie_sessions');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('✅ timezone column already exists');
        } else {
          console.warn('Migration 1 warning:', error.message);
        }
      }

      // Migration 2: Ensure associated_movie_id column exists
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          ADD COLUMN associated_movie_id VARCHAR(255) DEFAULT NULL
        `);
        console.log('✅ Added associated_movie_id column to movie_sessions');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('✅ associated_movie_id column already exists');
        } else {
          console.warn('Migration 2 warning:', error.message);
        }
      }

      // Migration 3: Ensure discord_event_id column exists
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          ADD COLUMN discord_event_id VARCHAR(255) DEFAULT NULL
        `);
        console.log('✅ Added discord_event_id column to movie_sessions');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('✅ discord_event_id column already exists');
        } else {
          console.warn('Migration 3 warning:', error.message);
        }
      }

      // Migration 4: Update charset to support emojis
      try {
        await this.pool.execute(`
          ALTER TABLE movie_sessions
          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        await this.pool.execute(`
          ALTER TABLE movies
          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Updated charset to utf8mb4');
      } catch (error) {
        console.warn('Migration 4 warning:', error.message);
      }

      // Migration 5: Add 'scheduled' status to movies enum
      try {
        await this.pool.execute(`
          ALTER TABLE movies
          MODIFY COLUMN status ENUM('pending', 'watched', 'planned', 'skipped', 'scheduled') DEFAULT 'pending'
        `);
        console.log('✅ Added scheduled status to movies enum');
      } catch (error) {
        console.warn('Migration 5 warning:', error.message);
      }

      // Migration 6: Add notification_role_id to guild_config
      if (!columnNames.includes('notification_role_id')) {
        try {
          await this.pool.execute(`
            ALTER TABLE guild_config
            ADD COLUMN notification_role_id VARCHAR(20) DEFAULT NULL
          `);
          console.log('✅ Added notification_role_id column to guild_config');
        } catch (error) {
          console.error('❌ Failed to add notification_role_id column:', error.message);
        }
      } else {
        console.log('✅ notification_role_id column already exists');
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
          console.log('✅ Added watched_at column to movies');
        } else {
          console.log('✅ watched_at column already exists');
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
          console.log('✅ Added watch_count column to movies');
        } else {
          console.log('✅ watch_count column already exists');
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
          console.log('✅ Added session_viewing_channel_id column to guild_config');
        } else {
          console.log('✅ session_viewing_channel_id column already exists');
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
        console.log('✅ Added active status to movie_sessions enum');
      } catch (error) {
        console.warn('Migration 10 warning:', error.message);
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

          console.log('✅ Added guild_id column to votes table');
        } else {
          console.log('✅ guild_id column already exists in votes table');
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

          console.log('✅ Added guild_id column to session_participants table');
        } else {
          console.log('✅ guild_id column already exists in session_participants table');
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

          console.log('✅ Added guild_id column to session_attendees table');
        } else {
          console.log('✅ guild_id column already exists in session_attendees table');
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
          console.log('✅ Added admin_channel_id column to guild_config');
        } else {
          console.log('✅ admin_channel_id column already exists in guild_config');
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
          console.log('✅ Updated status enum to include banned');
        } catch (error) {
          console.warn('Migration 13 status enum warning:', error.message);
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
        console.log('✅ Populated movie_uid for existing movies');

      } catch (error) {
        console.error('❌ Failed to add movie UID system (Migration 13):', error.message);
      }

      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration error:', error.message);
    }
  }

  // Movie UID generation
  generateMovieUID(guildId, title) {
    const crypto = require('crypto');
    const normalizedTitle = title.toLowerCase().trim();
    return crypto.createHash('sha256').update(`${guildId}:${normalizedTitle}`).digest('hex');
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

      const [result] = await this.pool.execute(
        `INSERT INTO movies (message_id, guild_id, channel_id, title, movie_uid, where_to_watch, recommended_by, imdb_id, imdb_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movieData.messageId,
          movieData.guildId,
          movieData.channelId,
          movieData.title,
          movieUID,
          movieData.whereToWatch,
          movieData.recommendedBy,
          movieData.imdbId || null,
          movieData.imdbData ? JSON.stringify(movieData.imdbData) : null
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

  async removeVote(messageId, userId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `DELETE FROM votes WHERE message_id = ? AND user_id = ?`,
        [messageId, userId]
      );
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
      console.error('Error adding admin role:', error.message);
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
      console.error('Error removing admin role:', error.message);
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
      pendingMovies: 0, activeUsers: 0, totalSessions: 0
    };

    try {
      const [movieStats] = await this.pool.execute(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'watched' THEN 1 ELSE 0 END) as watched,
          SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          COUNT(DISTINCT recommended_by) as active_users
         FROM movies WHERE guild_id = ?`,
        [guildId]
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
        pendingMovies: movieStats[0].pending || 0,
        activeUsers: movieStats[0].active_users || 0,
        totalSessions: sessionStats[0].total_sessions || 0
      };
    } catch (error) {
      console.error('Error getting movie stats:', error.message);
      return {
        totalMovies: 0, watchedMovies: 0, plannedMovies: 0,
        pendingMovies: 0, activeUsers: 0, totalSessions: 0
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

  async incrementWatchCount(messageId) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movies SET watch_count = watch_count + 1 WHERE message_id = ?`,
        [messageId]
      );
      return true;
    } catch (error) {
      console.error('Error incrementing watch count:', error.message);
      return false;
    }
  }

  async getWatchCount(messageId) {
    if (!this.isConnected) return 0;

    try {
      const [rows] = await this.pool.execute(
        `SELECT watch_count FROM movies WHERE message_id = ?`,
        [messageId]
      );
      return rows.length > 0 ? rows[0].watch_count || 0 : 0;
    } catch (error) {
      console.error('Error getting watch count:', error.message);
      return 0;
    }
  }

  // Database cleanup and maintenance functions
  async cleanupOrphanedData() {
    if (!this.isConnected) return { cleaned: 0, errors: [] };

    const results = { cleaned: 0, errors: [] };

    try {
      // Clean up votes for non-existent movies
      const [orphanedVotes] = await this.pool.execute(`
        DELETE v FROM votes v
        LEFT JOIN movies m ON v.message_id = m.message_id
        WHERE m.message_id IS NULL
      `);
      results.cleaned += orphanedVotes.affectedRows;
      console.log(`🧹 Cleaned up ${orphanedVotes.affectedRows} orphaned votes`);

      // Clean up session participants for non-existent sessions
      const [orphanedParticipants] = await this.pool.execute(`
        DELETE sp FROM session_participants sp
        LEFT JOIN movie_sessions ms ON sp.session_id = ms.id
        WHERE ms.id IS NULL
      `);
      results.cleaned += orphanedParticipants.affectedRows;
      console.log(`🧹 Cleaned up ${orphanedParticipants.affectedRows} orphaned session participants`);

      // Clean up session attendees for non-existent sessions
      const [orphanedAttendees] = await this.pool.execute(`
        DELETE sa FROM session_attendees sa
        LEFT JOIN movie_sessions ms ON sa.session_id = ms.id
        WHERE ms.id IS NULL
      `);
      results.cleaned += orphanedAttendees.affectedRows;
      console.log(`🧹 Cleaned up ${orphanedAttendees.affectedRows} orphaned session attendees`);

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
          message_id = CONCAT('archived_', UNIX_TIMESTAMP(), '_', id),
          channel_id = 'archived',
          status = CASE
            WHEN is_banned = TRUE THEN 'banned'
            WHEN status = 'watched' THEN 'watched'
            ELSE 'pending'
          END
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
