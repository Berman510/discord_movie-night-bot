/**
 * Cleanup Service Module
 * Handles channel cleanup and synchronization operations
 */

const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database');

async function handleMovieCleanup(interaction) {
  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - configuration features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if user has proper permissions
  const permissions = require('./permissions');
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this command.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if movie channel is configured
  const config = await database.getGuildConfig(interaction.guild.id);

  if (!config || !config.movie_channel_id) {
    await interaction.reply({
      content: '❌ **Movie channel not configured!**\n\nPlease use `/movie-configure action:set-channel` to set up the movie channel first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get the configured movie channel
  const movieChannel = interaction.guild.channels.cache.get(config.movie_channel_id);
  if (!movieChannel) {
    await interaction.reply({
      content: '❌ **Configured movie channel not found!**\n\nThe configured channel may have been deleted. Please reconfigure with `/movie-configure action:set-channel`.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const action = interaction.options.getString('action');

  if (action === 'sync') {
    await handleCleanupSync(interaction, movieChannel);
  } else if (action === 'purge') {
    await handleCleanupPurge(interaction, movieChannel);
  } else {
    await interaction.reply({
      content: '❌ Invalid cleanup action. Use "sync" or "purge".',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleCleanupSync(interaction, movieChannel) {
  await interaction.reply({
    content: `🧹 Starting comprehensive sync of <#${movieChannel.id}>... This may take a moment.`,
    flags: MessageFlags.Ephemeral
  });

  try {
    const channel = movieChannel;
    const botId = interaction.client.user.id;
    let updatedCount = 0;
    let processedCount = 0;
    let orphanedCount = 0;
    let syncedCount = 0;
    let cleanedDbCount = 0;

    // Step 1: Get all movies from database for this channel
    const dbMovies = await database.getMoviesByChannel(interaction.guild.id, channel.id);
    const dbMovieIds = new Set(dbMovies.map(movie => movie.message_id));

    // Step 2: Fetch recent messages (Discord API limit is 100 per request)
    // Fetch up to 200 messages in two batches for more comprehensive cleanup
    let allMessages = new Map();
    
    try {
      // First batch (most recent 100)
      const firstBatch = await channel.messages.fetch({ limit: 100 });
      firstBatch.forEach((msg, id) => allMessages.set(id, msg));
      
      // Second batch (next 100) if first batch was full
      if (firstBatch.size === 100) {
        const lastMessageId = Array.from(firstBatch.keys()).pop();
        const secondBatch = await channel.messages.fetch({ limit: 100, before: lastMessageId });
        secondBatch.forEach((msg, id) => allMessages.set(id, msg));
      }
    } catch (error) {
      console.warn('Error fetching additional messages:', error.message);
      // Continue with what we have
    }
    
    const botMessages = new Map();
    for (const [id, msg] of allMessages) {
      if (msg.author.id === botId) {
        botMessages.set(id, msg);
      }
    }

    // Step 3: Process each bot message
    for (const [messageId, message] of botMessages) {
      processedCount++;

      // Check if this is a movie recommendation message
      const isMovieMessage = message.embeds.length > 0 && 
                            message.embeds[0].title && 
                            !message.embeds[0].title.includes('Quick Guide');

      if (isMovieMessage) {
        // Check if movie exists in database
        if (!dbMovieIds.has(messageId)) {
          // Orphaned message - movie was deleted from database
          try {
            await message.delete();
            orphanedCount++;
            console.log(`🗑️ Deleted orphaned movie message: ${messageId}`);
          } catch (error) {
            console.warn(`Failed to delete orphaned message ${messageId}:`, error.message);
          }
          continue;
        }

        // Sync message with database state only if needed
        const movie = dbMovies.find(m => m.message_id === messageId);
        if (movie) {
          // For scheduled movies, recreate at bottom instead of syncing in place
          if (movie.status === 'scheduled') {
            const recreated = await recreateScheduledMovieAtBottom(message, movie, channel);
            if (recreated) {
              syncedCount++;
            }
          } else {
            // Only sync if message components are missing or outdated
            const needsSync = !message.components || message.components.length === 0;
            if (needsSync) {
              const synced = await syncMessageWithDatabase(message, movie);
              if (synced) {
                syncedCount++;
              }
            }
          }
        }
      }

      // Skip if message already has the current format
      if (isCurrentFormat(message)) {
        continue;
      }

      // Try to update the message to current format
      const updated = await updateMessageToCurrentFormat(message);
      if (updated) {
        updatedCount++;
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 4: Clean orphaned database entries (movies without Discord messages)
    const messageIds = new Set(botMessages.keys());
    const orphanedDbEntries = dbMovies.filter(movie => !messageIds.has(movie.message_id));
    
    if (orphanedDbEntries.length > 0) {
      console.log(`🗑️ Found ${orphanedDbEntries.length} orphaned database entries, cleaning up...`);
      
      for (const orphanedMovie of orphanedDbEntries) {
        try {
          // Skip watched movies - preserve viewing history
          if (orphanedMovie.status === 'watched') {
            console.log(`📚 Preserving watched movie: ${orphanedMovie.title}`);
            continue;
          }
          
          // Delete associated session if exists
          const session = await database.getSessionByMovieId(orphanedMovie.message_id);
          if (session) {
            await database.deleteMovieSession(session.id);
            console.log(`🗑️ Deleted orphaned session: ${session.name} (ID: ${session.id})`);
          }
          
          // Delete votes for this movie
          await database.deleteVotesByMessageId(orphanedMovie.message_id);
          
          // Delete the movie record
          await database.deleteMovie(orphanedMovie.message_id);
          cleanedDbCount++;
          
          console.log(`🗑️ Cleaned orphaned database entry: ${orphanedMovie.title} (Message ID: ${orphanedMovie.message_id})`);
        } catch (error) {
          console.error(`Error cleaning orphaned entry ${orphanedMovie.title}:`, error.message);
        }
      }
    }

    // Step 5: Sync Discord events with database
    let eventSyncResults = { syncedCount: 0, deletedCount: 0 };
    try {
      const discordEvents = require('./discord-events');
      eventSyncResults = await discordEvents.syncDiscordEventsWithDatabase(interaction.guild);
    } catch (error) {
      console.warn('Error syncing Discord events:', error.message);
    }

    // Clean up orphaned threads
    const threadsCleanedCount = await cleanupOrphanedThreads(channel, dbMovieIds);

    // Ensure quick action message at bottom
    await ensureQuickActionAtBottom(channel);

    const summary = [
      `✅ **Comprehensive sync complete!**`,
      `📊 Processed ${processedCount} messages (from ${allMessages.size} total fetched)`,
      `🔄 Updated ${updatedCount} to current format`,
      `🗑️ Removed ${orphanedCount} orphaned messages`,
      `🔗 Synced ${syncedCount} messages with database`,
      `🎪 Synced ${eventSyncResults.syncedCount} Discord events, deleted ${eventSyncResults.deletedCount} orphaned events`,
      `🗑️ Cleaned ${cleanedDbCount} orphaned database entries`,
      `🧵 Cleaned ${threadsCleanedCount} orphaned threads`,
      `🍿 Added quick action message at bottom`
    ];

    // Note: Orphaned database entries are now automatically cleaned up

    await interaction.followUp({
      content: summary.join('\n'),
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    await interaction.followUp({
      content: '❌ Cleanup failed. Check console for details.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleCleanupPurge(interaction, movieChannel) {
  await interaction.reply({
    content: `⚠️ **PURGE CONFIRMATION REQUIRED**\n\nThis will completely clear <#${movieChannel.id}> and delete ALL current movie recommendations.\n\n**Watched movies and session data will be preserved for analytics.**\n\n**This action cannot be undone!**`,
    flags: MessageFlags.Ephemeral
  });

  // Create confirmation buttons
  const confirmButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_purge')
        .setLabel('🗑️ YES, PURGE ALL RECOMMENDATIONS')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_purge')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.followUp({
    content: `**⚠️ FINAL WARNING:** This will completely clear <#${movieChannel.id}> including:\n• All current movie recommendations\n• All voting data\n• All discussion threads\n\n**Watched movies and session analytics will be preserved.**`,
    components: [confirmButtons],
    flags: MessageFlags.Ephemeral
  });
}

// Helper functions for cleanup operations
async function isCurrentFormat(message) {
  // Check if message has the current format (with voting buttons)
  return message.components && message.components.length > 0;
}

async function updateMessageToCurrentFormat(message) {
  // Update old format messages to current format
  try {
    const { components } = require('../utils');
    const movieComponents = components.createStatusButtons(message.id, 'pending');

    await message.edit({
      embeds: message.embeds,
      components: movieComponents
    });
    return true;
  } catch (error) {
    console.warn(`Failed to update message ${message.id}:`, error.message);
    return false;
  }
}

async function syncMessageWithDatabase(message, movie) {
  // Sync message content with database state while preserving existing embed data
  try {
    const { components } = require('../utils');
    const movieComponents = components.createStatusButtons(message.id, movie.status);

    // Only update components, preserve existing embed with IMDb data
    await message.edit({
      embeds: message.embeds, // Keep existing embeds with IMDb data
      components: movieComponents
    });
    return true;
  } catch (error) {
    console.warn(`Failed to sync message ${message.id}:`, error.message);
    return false;
  }
}

async function recreateScheduledMovieAtBottom(message, movie, channel) {
  // Recreate scheduled movie at bottom of channel
  try {
    const { embeds, components } = require('../utils');
    const movieEmbed = embeds.createMovieEmbed(movie);
    const movieComponents = components.createStatusButtons(movie.message_id, movie.status);

    // Create new message at bottom
    const newMessage = await channel.send({
      embeds: [movieEmbed],
      components: movieComponents
    });

    // Update database with new message ID
    await database.updateMovieMessageId(movie.guild_id, movie.title, newMessage.id);

    // Delete old message
    await message.delete();

    return true;
  } catch (error) {
    console.warn(`Failed to recreate scheduled movie ${movie.title}:`, error.message);
    return false;
  }
}

async function ensureQuickActionAtBottom(channel) {
  // Clean up old guide/action messages and ensure only one quick action message at bottom
  try {
    await cleanupOldGuideMessages(channel);

    const { embeds } = require('../utils');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const quickActionEmbed = embeds.createQuickActionEmbed();
    const recommendButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_recommendation')
          .setLabel('🍿 Recommend a Movie')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({
      embeds: [quickActionEmbed],
      components: [recommendButton]
    });

    console.log('✅ Added quick action message at bottom');
  } catch (error) {
    console.warn('Error ensuring quick action at bottom:', error.message);
  }
}

async function cleanupOldGuideMessages(channel) {
  // Remove old guide/quick action messages to prevent duplicates
  try {
    const botId = channel.client.user.id;

    // Fetch recent messages to find old guide messages
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessages = messages.filter(msg => msg.author.id === botId);

    for (const [messageId, message] of botMessages) {
      // Check if this is a guide/quick action message
      const isGuideMessage = message.embeds.length > 0 &&
                            message.embeds[0].title &&
                            (message.embeds[0].title.includes('Quick Guide') ||
                             message.embeds[0].title.includes('Ready to recommend'));

      if (isGuideMessage) {
        try {
          await message.delete();
          console.log(`🗑️ Cleaned up old guide message: ${messageId}`);
        } catch (error) {
          console.warn(`Failed to delete old guide message ${messageId}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.warn('Error cleaning up old guide messages:', error.message);
  }
}

async function cleanupOrphanedThreads(channel, validMovieIds) {
  // Clean up threads that no longer have corresponding movie posts
  let cleanedCount = 0;

  try {
    const botId = channel.client.user.id;

    // Fetch all threads (active and archived)
    const [activeThreads, archivedThreads] = await Promise.all([
      channel.threads.fetchActive(),
      channel.threads.fetchArchived({ limit: 100 })
    ]);

    const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);

    for (const [threadId, thread] of allThreads) {
      // Only clean up threads created by the bot
      if (thread.ownerId !== botId) continue;

      // Check if this thread corresponds to an existing movie
      const isOrphaned = !Array.from(validMovieIds).some(movieId => {
        // Thread names typically contain movie titles or are created from movie messages
        return thread.name.includes('Discussion') ||
               thread.parentId === movieId ||
               Math.abs(thread.createdTimestamp - new Date().getTime()) < 300000; // Recent threads get a pass
      });

      if (isOrphaned) {
        try {
          await thread.delete();
          cleanedCount++;
          console.log(`🧵 Deleted orphaned thread: ${thread.name} (${threadId})`);
        } catch (error) {
          console.warn(`Failed to delete thread ${threadId}:`, error.message);
        }
      }
    }

    return cleanedCount;
  } catch (error) {
    console.warn('Error cleaning up orphaned threads:', error.message);
    return 0;
  }
}

async function cleanupAllThreads(channel) {
  // Clean up ALL threads in the channel (for purge operations)
  let cleanedCount = 0;

  try {
    const botId = channel.client.user.id;

    // Fetch all threads (active and archived)
    const [activeThreads, archivedThreads] = await Promise.all([
      channel.threads.fetchActive(),
      channel.threads.fetchArchived({ limit: 100 })
    ]);

    const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);

    for (const [threadId, thread] of allThreads) {
      // Only clean up threads created by the bot
      if (thread.ownerId !== botId) continue;

      try {
        await thread.delete();
        cleanedCount++;
        console.log(`🧵 Deleted thread: ${thread.name} (${threadId})`);
      } catch (error) {
        console.warn(`Failed to delete thread ${threadId}:`, error.message);
      }
    }

    return cleanedCount;
  } catch (error) {
    console.warn('Error cleaning up all threads:', error.message);
    return 0;
  }
}

module.exports = {
  handleMovieCleanup,
  handleCleanupSync,
  handleCleanupPurge,
  ensureQuickActionAtBottom,
  cleanupOldGuideMessages,
  cleanupOrphanedThreads,
  cleanupAllThreads
};
