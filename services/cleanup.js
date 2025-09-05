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
  const { permissions } = require('./permissions');
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this command.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if this is the configured movie channel (cleanup only works in movie channel)
  const config = await database.getGuildConfig(interaction.guild.id);
  if (config && config.movie_channel_id && config.movie_channel_id !== interaction.channel.id) {
    await interaction.reply({
      content: `❌ Cleanup can only be used in the configured movie channel: <#${config.movie_channel_id}>\n\n*Admin commands work anywhere, but cleanup must be in the movie channel for safety.*`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const action = interaction.options.getString('action');
  
  if (action === 'sync') {
    await handleCleanupSync(interaction);
  } else if (action === 'purge') {
    await handleCleanupPurge(interaction);
  } else {
    await interaction.reply({
      content: '❌ Invalid cleanup action. Use "sync" or "purge".',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleCleanupSync(interaction) {
  await interaction.reply({
    content: '🧹 Starting comprehensive channel sync... This may take a moment.',
    flags: MessageFlags.Ephemeral
  });

  try {
    const channel = interaction.channel;
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

        // Sync message with database state
        const movie = dbMovies.find(m => m.message_id === messageId);
        if (movie) {
          // For scheduled movies, recreate at bottom instead of syncing in place
          if (movie.status === 'scheduled') {
            const recreated = await recreateScheduledMovieAtBottom(message, movie, channel);
            if (recreated) {
              syncedCount++;
            }
          } else {
            const synced = await syncMessageWithDatabase(message, movie);
            if (synced) {
              syncedCount++;
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

    const summary = [
      `✅ **Comprehensive sync complete!**`,
      `📊 Processed ${processedCount} messages (from ${allMessages.size} total fetched)`,
      `🔄 Updated ${updatedCount} to current format`,
      `🗑️ Removed ${orphanedCount} orphaned messages`,
      `🔗 Synced ${syncedCount} messages with database`,
      `🎪 Synced ${eventSyncResults.syncedCount} Discord events, deleted ${eventSyncResults.deletedCount} orphaned events`,
      `🗑️ Cleaned ${cleanedDbCount} orphaned database entries`
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

async function handleCleanupPurge(interaction) {
  await interaction.reply({
    content: '⚠️ **PURGE CONFIRMATION REQUIRED**\n\nThis will permanently delete ALL movie recommendations and their data (except watched movies and scheduled movies with active events).\n\n**This action cannot be undone!**',
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
    content: '**⚠️ FINAL WARNING:** This will delete all movie recommendations, votes, and discussion threads.\n\n**Watched movies and scheduled movies with active Discord events will be preserved.**',
    components: [confirmButtons],
    flags: MessageFlags.Ephemeral
  });
}

// Helper functions would be added here...
// (Due to 300 line limit, these will be added in the next edit)

module.exports = {
  handleMovieCleanup,
  handleCleanupSync,
  handleCleanupPurge
};
