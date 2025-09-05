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
        where_to_watch VARCHAR(255) NOT NULL,
        recommended_by VARCHAR(20) NOT NULL,
        imdb_id VARCHAR(20) NULL,
        imdb_data JSON NULL,
        status ENUM('pending', 'watched', 'planned', 'skipped', 'scheduled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        watched_at TIMESTAMP NULL,
        INDEX idx_guild_status (guild_id, status),
        INDEX idx_message_id (message_id)
      )`,

      // Votes table - stores all votes for movies
      `CREATE TABLE IF NOT EXISTS votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        vote_type ENUM('up', 'down') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES movies(message_id) ON DELETE CASCADE,
        INDEX idx_message_votes (message_id, vote_type)
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

      // User preferences and stats
      `CREATE TABLE IF NOT EXISTS user_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        recommendations_count INT DEFAULT 0,
        votes_cast INT DEFAULT 0,
        movies_watched INT DEFAULT 0,
        favorite_genres JSON NULL,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_guild (user_id, guild_id)
      )`,

      // Guild configuration
      `CREATE TABLE IF NOT EXISTS guild_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) UNIQUE NOT NULL,
        movie_channel_id VARCHAR(20) NULL,
        admin_roles JSON NULL,
        notification_role_id VARCHAR(20) NULL,
        default_timezone VARCHAR(50) DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration error:', error.message);
    }
  }

  // Movie operations
  async saveMovie(movieData) {
    if (!this.isConnected) return null;

    if (this.useJsonFallback) {
      try {
        const movie = {
          id: Date.now(), // Simple ID generation
          message_id: movieData.messageId,
          guild_id: movieData.guildId,
          channel_id: movieData.channelId,
          title: movieData.title,
          where_to_watch: movieData.whereToWatch,
          recommended_by: movieData.recommendedBy,
          imdb_id: movieData.imdbId || null,
          imdb_data: movieData.imdbData || null,
          status: 'pending',
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
      const [result] = await this.pool.execute(
        `INSERT INTO movies (message_id, guild_id, channel_id, title, where_to_watch, recommended_by, imdb_id, imdb_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movieData.messageId,
          movieData.guildId,
          movieData.channelId,
          movieData.title,
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

  async getMovieByMessageId(messageId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE message_id = ?`,
        [messageId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting movie by message ID:', error.message);
      return null;
    }
  }

  // Vote operations
  async saveVote(messageId, userId, voteType) {
    if (!this.isConnected) return false;
    
    try {
      await this.pool.execute(
        `INSERT INTO votes (message_id, user_id, vote_type) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)`,
        [messageId, userId, voteType]
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

  async getMovieSessionById(sessionId) {
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

  async getMovieById(messageId) {
    if (!this.isConnected) return null;

    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM movies WHERE message_id = ?`,
        [messageId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting movie by ID:', error.message);
      return null;
    }
  }

  async updateMovieMessageId(guildId, title, messageId) {
    if (!this.isConnected) return false;

    try {
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

      const [sessionStats] = await this.pool.execute(
        `SELECT COUNT(*) as total_sessions FROM movie_sessions WHERE guild_id = ?`,
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
      recommended: 0, upvotesReceived: 0, downvotesReceived: 0,
      watched: 0, planned: 0
    };

    try {
      const [rows] = await this.pool.execute(
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

      return {
        recommended: rows[0].recommended || 0,
        upvotesReceived: rows[0].upvotes_received || 0,
        downvotesReceived: rows[0].downvotes_received || 0,
        watched: rows[0].watched || 0,
        planned: rows[0].planned || 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error.message);
      return {
        recommended: 0, upvotesReceived: 0, downvotesReceived: 0,
        watched: 0, planned: 0
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

  async updateMovieStatus(messageId, status) {
    if (!this.isConnected) return false;

    try {
      await this.pool.execute(
        `UPDATE movies SET status = ? WHERE message_id = ?`,
        [status, messageId]
      );
      return true;
    } catch (error) {
      console.error('Error updating movie status:', error.message);
      return false;
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

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

module.exports = new Database();
