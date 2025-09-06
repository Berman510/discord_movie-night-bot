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

    // Step 4: Handle movies without Discord messages - recreate instead of delete
    const messageIds = new Set(botMessages.keys());
    const moviesWithoutMessages = dbMovies.filter(movie => !messageIds.has(movie.message_id));

    if (moviesWithoutMessages.length > 0) {
      console.log(`🎬 Found ${moviesWithoutMessages.length} movies without Discord messages, recreating...`);

      for (const movie of moviesWithoutMessages) {
        try {
          // Skip watched movies - they don't need posts
          if (movie.status === 'watched') {
            console.log(`📚 Skipping watched movie: ${movie.title}`);
            continue;
          }

          // Debug: Log movie data before recreation
          console.log(`🔍 Movie data for ${movie.title}:`, {
            where_to_watch: movie.where_to_watch,
            recommended_by: movie.recommended_by,
            description: movie.description,
            imdb_id: movie.imdb_id,
            imdb_data: movie.imdb_data
          });

          // Recreate the movie post
          await recreateMoviePost(channel, movie);
          cleanedDbCount++;

          console.log(`🎬 Recreated missing post: ${movie.title}`);
        } catch (error) {
          console.error(`Error recreating post for ${movie.title}:`, error.message);
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

    // Step 6: Additional recreation check (handled in Step 4)

    // Clean up orphaned threads
    const threadsCleanedCount = await cleanupOrphanedThreads(channel);

    // Ensure quick action message at bottom
    await ensureQuickActionAtBottom(channel);

    const summary = [
      `✅ **Comprehensive sync complete!**`,
      `📊 Processed ${processedCount} messages (from ${allMessages.size} total fetched)`,
      `🔄 Updated ${updatedCount} to current format`,
      `🗑️ Removed ${orphanedCount} orphaned messages`,
      `🔗 Synced ${syncedCount} messages with database`,
      `🎪 Synced ${eventSyncResults.syncedCount} Discord events, deleted ${eventSyncResults.deletedCount} orphaned events`,
      `🎬 Recreated ${cleanedDbCount} missing movie posts`,
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

async function cleanupOrphanedThreads(channel) {
  // Clean up threads that no longer have corresponding movie posts
  let cleanedCount = 0;

  try {
    const botId = channel.client.user.id;

    // Check if bot has manage threads permission
    const botMember = await channel.guild.members.fetch(botId);
    const hasManageThreads = botMember.permissions.has('ManageThreads');

    if (!hasManageThreads) {
      console.warn('⚠️ Bot lacks ManageThreads permission - cannot delete orphaned threads');
      return 0;
    }

    // Fetch all threads (active and archived)
    const [activeThreads, archivedThreads] = await Promise.all([
      channel.threads.fetchActive().catch(() => ({ threads: new Map() })),
      channel.threads.fetchArchived({ limit: 100 }).catch(() => ({ threads: new Map() }))
    ]);

    const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);

    // Get current messages in channel to check for parent posts
    const messages = await channel.messages.fetch({ limit: 100 });
    const currentMessageIds = new Set(messages.keys());

    for (const [threadId, thread] of allThreads) {
      // Check if this thread's parent message still exists
      const parentExists = currentMessageIds.has(thread.id) ||
                          (thread.parentId && currentMessageIds.has(thread.parentId));

      if (!parentExists) {
        try {
          await thread.delete();
          cleanedCount++;
          console.log(`🧵 Deleted orphaned thread: ${thread.name} (${threadId})`);
        } catch (error) {
          console.warn(`Failed to delete orphaned thread ${threadId}:`, error.message);
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

    // Check if bot has manage threads permission
    const botMember = await channel.guild.members.fetch(botId);
    const hasManageThreads = botMember.permissions.has('ManageThreads');

    if (!hasManageThreads) {
      console.warn('⚠️ Bot lacks ManageThreads permission - cannot delete threads');
      return 0;
    }

    // Fetch all threads (active and archived)
    const [activeThreads, archivedThreads] = await Promise.all([
      channel.threads.fetchActive().catch(() => ({ threads: new Map() })),
      channel.threads.fetchArchived({ limit: 100 }).catch(() => ({ threads: new Map() }))
    ]);

    const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);

    for (const [threadId, thread] of allThreads) {
      // Clean up all threads in the movie channel during purge
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

async function recreateMissingMoviePosts(channel, guildId) {
  // Recreate Discord posts for movies that exist in database but not in channel
  let recreatedCount = 0;

  try {
    const database = require('../database');

    // Get all movies for this guild and channel
    const allMovies = await database.getMoviesByChannel(guildId, channel.id);

    // Get current messages in channel
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(msg => msg.author.id === channel.client.user.id);
    const existingMessageIds = new Set(botMessages.keys());

    for (const movie of allMovies) {
      // Skip watched movies - they don't need posts
      if (movie.status === 'watched') continue;

      // Check if this movie's message exists in the channel
      if (!existingMessageIds.has(movie.message_id)) {
        try {
          // Recreate the movie post
          await recreateMoviePost(channel, movie);
          recreatedCount++;
          console.log(`🎬 Recreated missing post for: ${movie.title}`);
        } catch (error) {
          console.warn(`Failed to recreate post for ${movie.title}:`, error.message);
        }
      }
    }

    return recreatedCount;
  } catch (error) {
    console.warn('Error recreating missing movie posts:', error.message);
    return 0;
  }
}

async function recreateMoviePost(channel, movie) {
  // Recreate a movie post with proper embed and buttons
  try {
    const { embeds, components } = require('../utils');
    const database = require('../database');

    // Get vote counts
    const voteCounts = await database.getVoteCounts(movie.message_id);

    // Create movie embed with proper field mapping and safety checks
    const movieEmbed = embeds.createMovieEmbed({
      title: movie.title || 'Unknown Movie',
      description: movie.description || '',
      where_to_watch: movie.where_to_watch || 'Unknown Platform',
      recommended_by: movie.recommended_by || 'Unknown User',
      status: movie.status || 'pending',
      created_at: movie.created_at
    }, movie.imdb_data ? JSON.parse(movie.imdb_data) : null);

    // Create voting buttons only (admin buttons require permission checks)
    const movieComponents = components.createVotingButtons(movie.message_id, voteCounts.up, voteCounts.down);

    // Post the recreated message
    const newMessage = await channel.send({
      embeds: [movieEmbed],
      components: movieComponents
    });

    // Update the message ID in database
    await database.updateMovieMessageId(channel.guild.id, movie.title, newMessage.id);

    // Create discussion thread for the movie
    try {
      const thread = await newMessage.startThread({
        name: `${movie.title} — Discussion`,
        autoArchiveDuration: 1440 // 24 hours
      });

      await thread.send(`💬 **Discussion thread for ${movie.title}**\n\nShare your thoughts, reviews, or questions about this movie!`);
      console.log(`🧵 Created discussion thread for recreated post: ${movie.title}`);
    } catch (threadError) {
      console.warn(`Failed to create thread for ${movie.title}:`, threadError.message);
    }

  } catch (error) {
    console.error(`Error recreating movie post for ${movie.title}:`, error);
    throw error;
  }
}

module.exports = {
  handleMovieCleanup,
  handleCleanupSync,
  handleCleanupPurge,
  ensureQuickActionAtBottom,
  cleanupOldGuideMessages,
  cleanupOrphanedThreads,
  cleanupAllThreads,
  recreateMissingMoviePosts,
  recreateMoviePost
};
