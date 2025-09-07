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
      // Clean up previous ephemeral message for this user
      await this.cleanupPreviousMessage(interaction.user.id);

      // Send new ephemeral message
      let response;
      if (interaction.replied || interaction.deferred) {
        response = await interaction.followUp({
          content,
          ...options,
          ephemeral: true
        });
      } else {
        response = await interaction.reply({
          content,
          ...options,
          ephemeral: true
        });
      }

      // Track this message for future cleanup
      this.userEphemeralMessages.set(interaction.user.id, {
        interaction: interaction,
        messageId: response.id,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.warn('Error sending ephemeral message:', error.message);
      throw error;
    }
  }

  /**
   * Update an ephemeral message, cleaning up previous if needed
   */
  async updateEphemeral(interaction, content, options = {}) {
    try {
      // Clean up any previous message first
      await this.cleanupPreviousMessage(interaction.user.id);

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
   */
  async cleanupPreviousMessage(userId) {
    const previousMessage = this.userEphemeralMessages.get(userId);
    if (!previousMessage) return;

    try {
      // Try to delete the previous ephemeral message
      if (previousMessage.interaction && !previousMessage.interaction.ephemeral) {
        // Only try to delete if it's actually ephemeral
        await previousMessage.interaction.deleteReply().catch(() => {
          // Ignore errors - message might already be gone
        });
      }
    } catch (error) {
      // Ignore cleanup errors - message might already be dismissed
    }

    // Remove from tracking
    this.userEphemeralMessages.delete(userId);
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
