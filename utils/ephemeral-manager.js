/**
 * Ephemeral Message Manager
 * Automatically cleans up previous ephemeral messages to prevent accumulation
 */

class EphemeralManager {
  constructor() {
    // Map of userId -> { interaction, messageId, timestamp }
    this.userEphemeralMessages = new Map();

    // Simple throttle map: key `${key}:${userId}` -> lastTimestamp
    this.throttles = new Map();

    // Clean up old entries every 10 minutes (skip in tests)
    this._cleanupInterval = null;
    if (process.env.NODE_ENV !== 'test') {
      this._cleanupInterval = setInterval(
        () => {
          this.cleanupOldEntries();
        },
        10 * 60 * 1000
      );
      // Don't keep the process alive solely for this interval
      if (this._cleanupInterval && typeof this._cleanupInterval.unref === 'function') {
        this._cleanupInterval.unref();
      }
    }
  }

  /**
   * Send an ephemeral message, automatically cleaning up the previous one
   * @param {Object} interaction - Discord interaction
   * @param {string} content - Message content
   * @param {Object} options - Message options
   * @param {number} options.autoExpireSeconds - Auto-expire after N seconds (default: 20 for no-interaction messages)
   * @param {boolean} options.hasInteraction - Whether message has interaction buttons (affects auto-expire)
   */
  async sendEphemeral(interaction, content, options = {}) {
    try {
      // Note: We can't reliably delete previous ephemeral messages from different interactions
      // Discord only allows each interaction to manage its own ephemeral messages
      // So we'll just track the latest one and let Discord handle cleanup

      const { MessageFlags } = require('discord.js');

      // Determine auto-expire behavior
      const hasInteraction =
        options.hasInteraction || (options.components && options.components.length > 0);
      const autoExpireSeconds = options.autoExpireSeconds || (hasInteraction ? null : 20); // 20s for no-interaction messages

      // Send new ephemeral message using flags
      let response;
      if (interaction.replied || interaction.deferred) {
        response = await interaction.followUp({
          content,
          ...options,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        response = await interaction.reply({
          content,
          ...options,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Set up auto-expiry if specified
      if (autoExpireSeconds && autoExpireSeconds > 0) {
        setTimeout(async () => {
          try {
            if (interaction.replied || interaction.deferred) {
              await response.delete();
            } else {
              await interaction.deleteReply();
            }
          } catch (error) {
            // Ignore errors - message may have already been deleted or expired
          }
        }, autoExpireSeconds * 1000);
      }

      // Track this message for future cleanup (mainly for debugging/stats)
      this.userEphemeralMessages.set(interaction.user.id, {
        interaction: interaction,
        messageId: response.id,
        timestamp: Date.now(),
      });

      const logger = require('./logger');
      logger.debug(`📝 Tracked ephemeral message for user ${interaction.user.id}: ${response.id}`);
      return response;
    } catch (error) {
      console.warn('Error sending ephemeral message:', error.message);
      throw error;
    }
  }

  /**
   * Update an ephemeral message
   */
  async updateEphemeral(interaction, content, options = {}) {
    try {
      // Update the interaction
      const response = await interaction.update({
        content,
        ...options,
      });

      // Track this updated message
      this.userEphemeralMessages.set(interaction.user.id, {
        interaction: interaction,
        messageId: interaction.message?.id,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.warn('Error updating ephemeral message:', error.message);
      throw error;
    }
  }

  /**
   * Clean up previous ephemeral message for a user
   * Note: This can only clean up messages from the same interaction
   */
  async cleanupPreviousMessage(userId) {
    const previousMessage = this.userEphemeralMessages.get(userId);
    if (!previousMessage) return;

    const logger = require('./logger');
    logger.debug(
      `🧹 Cleaning up ephemeral message tracking for user ${userId}: ${previousMessage.messageId}`
    );

    // Note: We can't actually delete ephemeral messages from different interactions
    // Discord handles ephemeral message cleanup automatically
    // We just remove from our tracking to avoid memory leaks

    // Remove from tracking
    this.userEphemeralMessages.delete(userId);
    logger.debug(`🧹 Removed ephemeral message tracking for user ${userId}`);
  }

  /**
   * Auto-expire an ephemeral message after an interaction is completed
   * Use this for messages with interaction buttons that should disappear after user acts
   */
  async expireAfterInteraction(interaction, delaySeconds = 3) {
    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch (error) {
        // Ignore errors - message may have already been deleted or expired
      }
    }, delaySeconds * 1000);
  }

  /**
   * Throttle helpers for ephemeral panels
   */
  startThrottle(key, userId) {
    this.throttles.set(`${key}:${userId}`, Date.now());
  }

  isThrottled(key, userId, windowMs = 15000) {
    const last = this.throttles.get(`${key}:${userId}`);
    return !!last && Date.now() - last < windowMs;
  }

  /**
   * Clean up old entries (older than 1 hour)
   */
  cleanupOldEntries() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [userId, messageData] of this.userEphemeralMessages.entries()) {
      if (messageData.timestamp < oneHourAgo) {
        this.userEphemeralMessages.delete(userId);
      }
    }

    // Clean stale throttles (> 10 minutes old)
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, ts] of this.throttles.entries()) {
      if (ts < tenMinAgo) this.throttles.delete(key);
    }
  }

  /**
   * Force cleanup all messages for a user
   * Note: This only cleans up our tracking, not the actual messages
   */
  async forceCleanupUser(userId) {
    await this.cleanupPreviousMessage(userId);
  }

  /**
   * Get stats about tracked messages
   */
  getStats() {
    return {
      trackedMessages: this.userEphemeralMessages.size,
      oldestMessage: Math.min(
        ...Array.from(this.userEphemeralMessages.values()).map((m) => m.timestamp)
      ),
    };
  }
}

// Export singleton instance
const ephemeralManager = new EphemeralManager();
module.exports = ephemeralManager;
