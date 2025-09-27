/**
 * Centralized Event-Driven State Management System
 *
 * This system eliminates the need for manual sync/refresh buttons by automatically
 * updating all UI components when state changes occur.
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class BotEventSystem extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Movie state changes
    this.on('movie.status.changed', this.handleMovieStatusChanged.bind(this));
    this.on('movie.created', this.handleMovieCreated.bind(this));
    this.on('movie.voted', this.handleMovieVoted.bind(this));
    this.on('movie.removed', this.handleMovieRemoved.bind(this));

    // Session state changes
    this.on('session.created', this.handleSessionCreated.bind(this));
    this.on('session.status.changed', this.handleSessionStatusChanged.bind(this));
    this.on('session.winner.selected', this.handleSessionWinnerSelected.bind(this));
    this.on('session.ended', this.handleSessionEnded.bind(this));
    this.on('session.cancelled', this.handleSessionCancelled.bind(this));

    // Guild configuration changes
    this.on('guild.config.changed', this.handleGuildConfigChanged.bind(this));

    // Error handling
    this.on('error', (error) => {
      logger.error('Event system error:', error);
    });
  }

  /**
   * Emit a movie status change event
   */
  async emitMovieStatusChanged(guildId, movieId, oldStatus, newStatus, metadata = {}) {
    try {
      logger.debug(`📡 Event: movie.status.changed - ${movieId} (${oldStatus} → ${newStatus})`);
      this.emit('movie.status.changed', {
        guildId,
        movieId,
        oldStatus,
        newStatus,
        timestamp: new Date(),
        ...metadata,
      });
    } catch (error) {
      logger.error('Error emitting movie status changed event:', error);
    }
  }

  /**
   * Emit a session status change event
   */
  async emitSessionStatusChanged(guildId, sessionId, oldStatus, newStatus, metadata = {}) {
    try {
      logger.debug(`📡 Event: session.status.changed - ${sessionId} (${oldStatus} → ${newStatus})`);
      this.emit('session.status.changed', {
        guildId,
        sessionId,
        oldStatus,
        newStatus,
        timestamp: new Date(),
        ...metadata,
      });
    } catch (error) {
      logger.error('Error emitting session status changed event:', error);
    }
  }

  /**
   * Emit a movie vote event
   */
  async emitMovieVoted(guildId, movieId, userId, voteType, voteCounts) {
    try {
      logger.debug(`📡 Event: movie.voted - ${movieId} (${voteType} by ${userId})`);
      this.emit('movie.voted', {
        guildId,
        movieId,
        userId,
        voteType,
        voteCounts,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error emitting movie voted event:', error);
    }
  }

  /**
   * Handle movie status changes - update all relevant UI components
   */
  async handleMovieStatusChanged(event) {
    const { guildId, movieId, newStatus } = event;

    try {
      const client = global.discordClient;
      if (!client) return;

      const database = require('../database');
      const movie = await database.getMovieByMessageId(movieId, guildId);
      if (!movie) return;

      // Update Discord message (forum or text channel)
      await this.updateMovieDiscordMessage(client, movie, newStatus);

      // Update admin panel if session state might have changed
      if (['scheduled', 'watched', 'skipped', 'banned'].includes(newStatus)) {
        await this.refreshAdminPanel(client, guildId);
      }

      // Notify dashboard via WebSocket
      await this.notifyDashboard('movie_status_changed', { guildId, messageId: movieId });

      logger.debug(`✅ Processed movie status change: ${movieId} → ${newStatus}`);
    } catch (error) {
      logger.error('Error handling movie status changed event:', error);
    }
  }

  /**
   * Handle session status changes - update admin panels and voting channels
   */
  async handleSessionStatusChanged(event) {
    const { guildId, sessionId, newStatus } = event;

    try {
      const client = global.discordClient;
      if (!client) return;

      // Always refresh admin panel when session state changes
      await this.refreshAdminPanel(client, guildId);

      // Update voting channel recommendation post
      await this.updateVotingChannelState(client, guildId);

      // Notify dashboard
      await this.notifyDashboard('session_status_changed', {
        guildId,
        sessionId,
        status: newStatus,
      });

      logger.debug(`✅ Processed session status change: ${sessionId} → ${newStatus}`);
    } catch (error) {
      logger.error('Error handling session status changed event:', error);
    }
  }

  /**
   * Handle movie votes - update vote counts in UI
   */
  async handleMovieVoted(event) {
    const { guildId, movieId } = event;

    try {
      const client = global.discordClient;
      if (!client) return;

      const database = require('../database');
      const movie = await database.getMovieByMessageId(movieId, guildId);
      if (!movie) return;

      // Update Discord message with new vote counts
      await this.updateMovieDiscordMessage(client, movie, movie.status);

      // Notify dashboard
      await this.notifyDashboard('movie_voted', { guildId, messageId: movieId });

      logger.debug(`✅ Processed movie vote: ${movieId}`);
    } catch (error) {
      logger.error('Error handling movie voted event:', error);
    }
  }

  /**
   * Update a movie's Discord message (forum post or text channel message)
   */
  async updateMovieDiscordMessage(client, movie, status) {
    try {
      const database = require('../database');
      const { embeds, components } = require('../utils');

      // Get current vote counts
      const voteCounts = await database.getVoteCounts(movie.message_id);

      // Get IMDB data if available
      let imdbData = null;
      try {
        const imdb = require('./imdb');
        if (movie.imdb_id) {
          imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);
        }
      } catch (error) {
        logger.debug('Could not fetch IMDB data:', error.message);
      }

      if (movie.channel_type === 'forum' && movie.thread_id) {
        // Update forum post
        const forumChannels = require('./forum-channels');
        const thread = await client.channels.fetch(movie.thread_id).catch(() => null);
        if (thread) {
          await forumChannels.updateForumPostContent(thread, { ...movie, status }, status);
          await forumChannels.updateForumPostTags(thread, status);

          // Archive completed movies
          if (['watched', 'skipped', 'banned'].includes(status)) {
            await forumChannels.archiveForumPost(thread, `Movie marked as ${status}`);
          }
        }
      } else if (movie.channel_id) {
        // Update text channel message
        const channel = await client.channels.fetch(movie.channel_id).catch(() => null);
        if (channel) {
          const message = await channel.messages.fetch(movie.message_id).catch(() => null);
          if (message) {
            const movieEmbed = embeds.createMovieEmbed({ ...movie, status }, imdbData, voteCounts);
            const movieComponents = ['watched', 'skipped', 'banned'].includes(status)
              ? []
              : components.createStatusButtons(
                  movie.message_id,
                  status,
                  voteCounts.up,
                  voteCounts.down
                );

            await message.edit({
              embeds: [movieEmbed],
              components: movieComponents,
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Error updating movie Discord message:', error.message);
    }
  }

  /**
   * Refresh admin panel for a guild
   */
  async refreshAdminPanel(client, guildId) {
    try {
      const adminControls = require('./admin-controls');
      await adminControls.ensureAdminControlPanel(client, guildId);
      logger.debug(`🔧 Auto-refreshed admin panel for guild ${guildId}`);
    } catch (error) {
      logger.warn('Error refreshing admin panel:', error.message);
    }
  }

  /**
   * Update voting channel state (recommendation posts, quick actions)
   */
  async updateVotingChannelState(client, guildId) {
    try {
      const database = require('../database');
      const config = await database.getGuildConfig(guildId);
      if (!config?.movie_channel_id) return;

      const votingChannel = await client.channels.fetch(config.movie_channel_id).catch(() => null);
      if (!votingChannel) return;

      const forumChannels = require('./forum-channels');
      if (forumChannels.isForumChannel(votingChannel)) {
        // Update recommendation post
        const activeSession = await database.getActiveVotingSession(guildId);
        await forumChannels.ensureRecommendationPost(votingChannel, activeSession);
      } else {
        // Update quick action at bottom
        const cleanup = require('./cleanup');
        await cleanup.ensureQuickActionAtBottom(votingChannel);
      }

      logger.debug(`🔄 Auto-updated voting channel state for guild ${guildId}`);
    } catch (error) {
      logger.warn('Error updating voting channel state:', error.message);
    }
  }

  /**
   * Notify dashboard via WebSocket
   */
  async notifyDashboard(eventType, payload) {
    try {
      const wsClient = global.wsClient;
      if (wsClient?.enabled && wsClient.send) {
        wsClient.send({ type: eventType, payload });
      }
    } catch (error) {
      logger.debug('Could not notify dashboard:', error.message);
    }
  }
}

// Create singleton instance
const eventSystem = new BotEventSystem();

module.exports = {
  eventSystem,

  // Convenience methods for emitting events
  emitMovieStatusChanged: eventSystem.emitMovieStatusChanged.bind(eventSystem),
  emitSessionStatusChanged: eventSystem.emitSessionStatusChanged.bind(eventSystem),
  emitMovieVoted: eventSystem.emitMovieVoted.bind(eventSystem),

  // Direct event emission for other events
  emit: eventSystem.emit.bind(eventSystem),
  on: eventSystem.on.bind(eventSystem),
  off: eventSystem.off.bind(eventSystem),
};
