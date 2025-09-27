/**
 * Bot removal and guild cleanup service
 * Handles complete removal of bot data and graceful exit from guilds
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

/**
 * Create bot removal confirmation embed
 */
function createRemovalConfirmationEmbed(guildName) {
  return new EmbedBuilder()
    .setTitle('⚠️ Remove Watch Party Bot')
    .setDescription(
      `**This will permanently remove the Watch Party Bot from "${guildName}"**\n\n` +
      '**What will happen:**\n' +
      '• All bot data will be deleted from our database\n' +
      '• All bot messages will be deleted from your server\n' +
      '• All Discord events created by the bot will be deleted\n' +
      '• The bot will leave your server\n\n' +
      '**⚠️ This action is PERMANENT and cannot be undone!**\n\n' +
      '**Note:** You can always re-invite the bot later if needed, but all previous data will be lost.'
    )
    .setColor(0xed4245)
    .setFooter({ text: 'This action requires administrator permissions' });
}

/**
 * Create removal confirmation buttons
 */
function createRemovalConfirmationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_bot_removal')
      .setLabel('🗑️ YES, REMOVE BOT PERMANENTLY')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('cancel_bot_removal')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Handle bot removal initiation
 */
async function handleBotRemovalInitiation(interaction) {
  const permissions = require('./permissions');
  
  // Check if user has admin permission
  const isAdmin = await permissions.checkMovieAdminPermission(interaction);
  
  if (!isAdmin) {
    await interaction.reply({
      content: '❌ **Access Denied**\n\nYou need administrator permissions to remove the bot.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = createRemovalConfirmationEmbed(interaction.guild.name);
  const buttons = createRemovalConfirmationButtons();

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Handle bot removal confirmation
 */
async function handleBotRemovalConfirmation(interaction) {
  const permissions = require('./permissions');
  
  // Double-check admin permission
  const isAdmin = await permissions.checkMovieAdminPermission(interaction);
  
  if (!isAdmin) {
    await interaction.update({
      content: '❌ **Access Denied**\n\nYou need administrator permissions to remove the bot.',
      embeds: [],
      components: [],
    });
    return;
  }

  // Update to show processing
  await interaction.update({
    content: '🔄 **Removing Watch Party Bot...**\n\nPlease wait while we clean up all data and messages.',
    embeds: [],
    components: [],
  });

  try {
    // Perform complete bot removal
    const result = await performCompleteGuildRemoval(interaction.guild, interaction.client);
    
    // Send final message before leaving
    await interaction.editReply({
      content: 
        '✅ **Watch Party Bot Removed Successfully**\n\n' +
        `**Cleanup Summary:**\n` +
        `• Database records deleted: ${result.databaseRecords}\n` +
        `• Bot messages deleted: ${result.messagesDeleted}\n` +
        `• Discord events deleted: ${result.eventsDeleted}\n\n` +
        '**The bot will now leave your server.**\n\n' +
        'Thank you for using Watch Party Bot! You can re-invite it anytime from our website.',
    });

    // Wait a moment for the message to be sent, then leave the guild
    setTimeout(async () => {
      try {
        await interaction.guild.leave();
        const logger = require('../utils/logger');
        logger.info(`🚪 Left guild: ${interaction.guild.name} (${interaction.guild.id}) after removal request`);
      } catch (error) {
        const logger = require('../utils/logger');
        logger.error('Error leaving guild after removal:', error);
      }
    }, 3000);

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error during bot removal:', error);
    
    await interaction.editReply({
      content: 
        '❌ **Error During Removal**\n\n' +
        'An error occurred while removing the bot. Some data may not have been cleaned up properly.\n\n' +
        'Please contact support if you need assistance.',
    });
  }
}

/**
 * Handle bot removal cancellation
 */
async function handleBotRemovalCancellation(interaction) {
  await interaction.update({
    content: '✅ **Bot Removal Cancelled**\n\nThe Watch Party Bot will remain in your server.',
    embeds: [],
    components: [],
  });
}

/**
 * Perform complete guild removal - database cleanup, message deletion, and Discord events
 */
async function performCompleteGuildRemoval(guild, client) {
  const logger = require('../utils/logger');
  const database = require('../database');
  
  logger.info(`🗑️ Starting complete removal for guild: ${guild.name} (${guild.id})`);
  
  const result = {
    databaseRecords: 0,
    messagesDeleted: 0,
    eventsDeleted: 0,
    errors: []
  };

  try {
    // Step 1: Delete all Discord events created by the bot
    try {
      const events = await guild.scheduledEvents.fetch();
      for (const [eventId, event] of events) {
        if (event.name.includes('Movie Night') || event.name.includes('Watch Party')) {
          try {
            await event.delete();
            result.eventsDeleted++;
            logger.debug(`🗑️ Deleted Discord event: ${event.name} (${eventId})`);
          } catch (error) {
            logger.warn(`Failed to delete Discord event ${eventId}:`, error.message);
            result.errors.push(`Event deletion: ${error.message}`);
          }
        }
      }
    } catch (error) {
      logger.warn('Error fetching Discord events for deletion:', error.message);
      result.errors.push(`Event fetching: ${error.message}`);
    }

    // Step 2: Delete all bot messages from channels
    try {
      const config = await database.getGuildConfig(guild.id);
      const channelsToClean = [
        config?.voting_channel_id,
        config?.admin_channel_id,
        config?.watch_party_channel_id
      ].filter(Boolean);

      for (const channelId of channelsToClean) {
        try {
          const channel = await guild.channels.fetch(channelId);
          if (channel) {
            const messages = await channel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);
            
            for (const [messageId, message] of botMessages) {
              try {
                await message.delete();
                result.messagesDeleted++;
              } catch (error) {
                logger.warn(`Failed to delete message ${messageId}:`, error.message);
              }
            }
            
            // Clean up threads created by the bot
            if (channel.threads) {
              const threads = await channel.threads.fetchActive();
              for (const [threadId, thread] of threads.threads) {
                if (thread.ownerId === client.user.id) {
                  try {
                    await thread.delete();
                    logger.debug(`🧵 Deleted thread: ${thread.name} (${threadId})`);
                  } catch (error) {
                    logger.warn(`Failed to delete thread ${threadId}:`, error.message);
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.warn(`Error cleaning channel ${channelId}:`, error.message);
          result.errors.push(`Channel cleanup: ${error.message}`);
        }
      }
    } catch (error) {
      logger.warn('Error during message cleanup:', error.message);
      result.errors.push(`Message cleanup: ${error.message}`);
    }

    // Step 3: Complete database cleanup using deep purge
    try {
      const deepPurge = require('./deep-purge');
      const purgeResult = await deepPurge.executeDeepPurge(guild.id, {
        movies: true,
        sessions: true,
        votes: true,
        participants: true,
        attendees: true,
        config: true
      }, client);
      
      result.databaseRecords = purgeResult.deleted;
      logger.info(`🗑️ Deep purge completed: ${purgeResult.deleted} records deleted`);
      
      if (purgeResult.errors.length > 0) {
        result.errors.push(...purgeResult.errors);
      }
    } catch (error) {
      logger.error('Error during database deep purge:', error);
      result.errors.push(`Database cleanup: ${error.message}`);
    }

    logger.info(`✅ Guild removal completed for ${guild.name}: ${result.databaseRecords} DB records, ${result.messagesDeleted} messages, ${result.eventsDeleted} events`);
    
  } catch (error) {
    logger.error('Error during complete guild removal:', error);
    result.errors.push(`General error: ${error.message}`);
  }

  return result;
}

/**
 * Handle automatic cleanup when bot is removed from guild (guildDelete event)
 */
async function handleAutomaticGuildCleanup(guild, client) {
  const logger = require('../utils/logger');
  
  logger.info(`🚪 Bot was removed from guild: ${guild.name} (${guild.id}) - performing automatic cleanup`);
  
  try {
    // Perform the same cleanup as manual removal, but without Discord message deletion
    // (since we can't delete messages after being kicked)
    const database = require('../database');
    const deepPurge = require('./deep-purge');
    
    const purgeResult = await deepPurge.executeDeepPurge(guild.id, {
      movies: true,
      sessions: true,
      votes: true,
      participants: true,
      attendees: true,
      config: true
    }, client);
    
    logger.info(`✅ Automatic cleanup completed for ${guild.name}: ${purgeResult.deleted} database records deleted`);
    
  } catch (error) {
    logger.error('Error during automatic guild cleanup:', error);
  }
}

module.exports = {
  handleBotRemovalInitiation,
  handleBotRemovalConfirmation,
  handleBotRemovalCancellation,
  performCompleteGuildRemoval,
  handleAutomaticGuildCleanup,
};
