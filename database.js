/**
 * Database module for Movie Night Bot
 * Handles MySQL connection and all database operations
 */

const mysql = require('mysql2/promise');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
      
      if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
        console.log('⚠️  Database credentials not provided - running in memory-only mode');
        return false;
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
        acquireTimeout: 60000,
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
      this.isConnected = false;
      return false;
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
        status ENUM('pending', 'watched', 'planned', 'skipped') DEFAULT 'pending',
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
        voting_deadline DATETIME NULL,
        status ENUM('planning', 'voting', 'decided', 'completed', 'cancelled') DEFAULT 'planning',
        winner_message_id VARCHAR(20) NULL,
        created_by VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guild_status (guild_id, status)
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
      )`
    ];

    for (const table of tables) {
      try {
        await this.pool.execute(table);
      } catch (error) {
        console.error('Error creating table:', error.message);
      }
    }
    console.log('✅ Database tables initialized');
  }

  // Movie operations
  async saveMovie(movieData) {
    if (!this.isConnected) return null;
    
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

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

module.exports = new Database();
