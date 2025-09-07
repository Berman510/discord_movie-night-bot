/**
 * Ephemeral Message Manager
 * Automatically cleans up previous ephemeral messages to prevent accumulation
 */

class EphemeralManager {
  constructor() {
    // Map of userId -> { interaction, messageId, timestamp }
    this.userEphemeralMessages = new Map();
    
    // Clean up old entries every 10 minutes
    setInterval(() => {
      this.cleanupOldEntries();
    }, 10 * 60 * 1000);
  }

  /**
   * Send an ephemeral message, automatically cleaning up the previous one
   */
  async sendEphemeral(interaction, content, options = {}) {
    try {
      // Note: We can't reliably delete previous ephemeral messages from different interactions
      // Discord only allows each interaction to manage its own ephemeral messages
      // So we'll just track the latest one and let Discord handle cleanup

      const { MessageFlags } = require('discord.js');

      // Send new ephemeral message using flags
      let response;
      if (interaction.replied || interaction.deferred) {
        response = await interaction.followUp({
          content,
          ...options,
          flags: MessageFlags.Ephemeral
        });
      } else {
        response = await interaction.reply({
          content,
          ...options,
          flags: MessageFlags.Ephemeral
        });
      }

      // Track this message for future cleanup (mainly for debugging/stats)
      this.userEphemeralMessages.set(interaction.user.id, {
        interaction: interaction,
        messageId: response.id,
        timestamp: Date.now()
      });

      console.log(`📝 Tracked ephemeral message for user ${interaction.user.id}: ${response.id}`);
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
        ...options
      });

      // Track this updated message
      this.userEphemeralMessages.set(interaction.user.id, {
        interaction: interaction,
        messageId: interaction.message?.id,
        timestamp: Date.now()
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

    console.log(`🧹 Cleaning up ephemeral message tracking for user ${userId}: ${previousMessage.messageId}`);

    // Note: We can't actually delete ephemeral messages from different interactions
    // Discord handles ephemeral message cleanup automatically
    // We just remove from our tracking to avoid memory leaks

    // Remove from tracking
    this.userEphemeralMessages.delete(userId);
    console.log(`🧹 Removed ephemeral message tracking for user ${userId}`);
  }

  /**
   * Clean up old entries (older than 1 hour)
   */
  cleanupOldEntries() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [userId, messageData] of this.userEphemeralMessages.entries()) {
      if (messageData.timestamp < oneHourAgo) {
        this.userEphemeralMessages.delete(userId);
      }
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
      oldestMessage: Math.min(...Array.from(this.userEphemeralMessages.values()).map(m => m.timestamp))
    };
  }
}

// Export singleton instance
const ephemeralManager = new EphemeralManager();
module.exports = ephemeralManager;
