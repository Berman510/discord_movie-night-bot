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

  // Determine if there is an active voting session; avoid reviving old sessions
  let hasActiveVoting = false;
  try {
    const database = require('../database');
    const activeSession = await database.getActiveVotingSession(interaction.guild.id);
    hasActiveVoting = !!activeSession;
  } catch (_) {}

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
      const logger = require('../utils/logger');
      logger.warn('Error fetching additional messages:', error.message);
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
            const logger = require('../utils/logger');
            logger.debug(`🗑️ Deleted orphaned movie message: ${messageId}`);
          } catch (error) {
            const logger = require('../utils/logger');
            logger.warn(`Failed to delete orphaned message ${messageId}:`, error.message);
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
            if (hasActiveVoting && needsSync) {
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

    // Step 4: Clean up orphaned threads BEFORE recreation
    const threadsCleanedCount = await cleanupOrphanedThreads(channel);

    // Step 5: Handle movies without Discord messages (respects active session)
    let recreatedViaHelper = 0;
    try {
      recreatedViaHelper = await recreateMissingMoviePosts(channel, interaction.guild.id);
    } catch (_) {}
    cleanedDbCount += recreatedViaHelper;


    // Step 6: Check for movies with posts but missing threads
    await recreateMissingThreads(channel, botMessages);

    // Step 6: Sync Discord events with database
    let eventSyncResults = { syncedCount: 0, deletedCount: 0 };
    try {
      const discordEvents = require('./discord-events');
      eventSyncResults = await discordEvents.syncDiscordEventsWithDatabase(interaction.guild);
    } catch (error) {
      console.warn('Error syncing Discord events:', error.message);
    }

    // Ensure quick action message at bottom
    // Only applicable to text channels; forum channels use a pinned recommendation post
    const forumChannels = require('./forum-channels');
    if (forumChannels.isTextChannel(channel)) {
      await ensureQuickActionAtBottom(channel);
    } else if (forumChannels.isForumChannel(channel)) {
      try { await forumChannels.ensureRecommendationPost(channel); } catch {}
    }

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
    // Include IMDb data if available (handle single/double-encoded JSON)
    let imdbData = null;
    try {
      if (movie.imdb_data) {
        let parsed = typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        imdbData = parsed;
      }
    } catch (e) {
      console.warn(`Failed to parse IMDb data for ${movie.title}:`, e.message);
    }
    const movieEmbed = embeds.createMovieEmbed(movie, imdbData);
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

async function ensureQuickActionPinned(channel) {
  // Ensure there's a pinned quick action message for movie recommendations
  try {
    const database = require('../database');

    // Check if guild has configuration - don't add messages if no config
    const config = await database.getGuildConfig(channel.guild.id);
    if (!config) {
      console.log('No guild configuration found, skipping quick action message');
      return;
    }

    // Check if there's an active voting session
    const activeSession = await database.getActiveVotingSession(channel.guild.id);

    // Find existing quick action message (try pinned first, then recent messages)
    let existingQuickAction = null;

    // First try to find in pinned messages
    try {
      const pinnedMessages = await channel.messages.fetchPins();
      // Check if pinnedMessages is a Collection and has the find method
      if (pinnedMessages && typeof pinnedMessages.find === 'function') {
        existingQuickAction = pinnedMessages.find(msg =>
          msg.author.id === channel.client.user.id &&
          msg.embeds.length > 0 &&
          (msg.embeds[0].title?.includes('Ready to recommend') ||
           msg.embeds[0].title?.includes('No Active Voting Session'))
        );
      } else {
        const logger = require('../utils/logger');
        logger.debug('Pinned messages result is not a Collection, skipping pinned search');
      }
    } catch (error) {
      const logger = require('../utils/logger');
      logger.warn('Error fetching pinned messages:', error.message);
    }

    // If not found in pinned messages, search recent messages as fallback
    if (!existingQuickAction) {
      try {
        const recentMessages = await channel.messages.fetch({ limit: 20 });
        existingQuickAction = recentMessages.find(msg =>
          msg.author.id === channel.client.user.id &&
          msg.embeds.length > 0 &&
          (msg.embeds[0].title?.includes('Ready to recommend') ||
           msg.embeds[0].title?.includes('No Active Voting Session'))
        );
      } catch (error) {
        console.warn('Error fetching recent messages for quick action search:', error.message);
      }
    }

    if (!activeSession) {
      // No active session
      const { embeds } = require('../utils');
      const noSessionEmbed = embeds.createNoSessionEmbed();

      if (existingQuickAction) {
        // Update existing pinned message
        await existingQuickAction.edit({
          embeds: [noSessionEmbed],
          components: []
        });
        const logger = require('../utils/logger');
        logger.debug('✅ Updated pinned no session message');
      } else {
        // Create new pinned message
        const message = await channel.send({
          embeds: [noSessionEmbed]
        });
        await message.pin();
        const logger = require('../utils/logger');
        logger.debug('✅ Created and pinned no session message');
      }
      return;
    }

    // Active session exists - ensure recommend button is pinned
    const { embeds } = require('../utils');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const quickActionEmbed = embeds.createQuickActionEmbed(activeSession);
    const recommendButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_recommendation')
          .setLabel('🍿 Recommend a Movie')
          .setStyle(ButtonStyle.Primary)
      );

    if (existingQuickAction) {
      // Update existing pinned message
      await existingQuickAction.edit({
        embeds: [quickActionEmbed],
        components: [recommendButton]
      });
      console.log('✅ Updated pinned quick action message');
    } else {
      // Create new pinned message
      const message = await channel.send({
        embeds: [quickActionEmbed],
        components: [recommendButton]
      });
      await message.pin();
      console.log('✅ Created and pinned quick action message');
    }

  } catch (error) {
    console.warn('Error ensuring quick action pinned:', error.message);
    // Fallback to old behavior if pinning fails
    await ensureQuickActionAtBottom(channel);
  }
}

async function ensureQuickActionAtBottom(channel) {
  // Fallback method: Clean up old guide/action messages and ensure only one quick action message at bottom
  try {
    if (!channel || !channel.send) {
      const logger = require('../utils/logger');
      logger.debug('Skipping quick action at bottom: non-text channel detected');
      return;
    }

    const database = require('../database');

    // Check if guild has configuration - don't add messages if no config
    const config = await database.getGuildConfig(channel.guild.id);
    if (!config) {
      console.log('No guild configuration found, skipping quick action message');
      return;
    }

    await cleanupOldGuideMessages(channel);

    // Check if there's an active voting session
    const activeSession = await database.getActiveVotingSession(channel.guild.id);

    if (!activeSession) {
      // No active session - just add a message explaining the situation
      const { embeds } = require('../utils');
      const noSessionEmbed = embeds.createNoSessionEmbed();

      await channel.send({
        embeds: [noSessionEmbed]
      });

      const logger = require('../utils/logger');
      logger.debug('✅ Added no session message at bottom');
      return;
    }

    // Active session exists - add recommend button
    const { embeds } = require('../utils');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const quickActionEmbed = embeds.createQuickActionEmbed(activeSession);
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

    const logger = require('../utils/logger');
    logger.debug('✅ Added quick action message at bottom');
  } catch (error) {
    const logger = require('../utils/logger');
    logger.warn('Error ensuring quick action at bottom:', error.message);
  }
}

async function cleanupOldGuideMessages(channel) {
  // Remove old guide/quick action messages to prevent duplicates
  try {
    if (!channel || !channel.messages) {
      const logger = require('../utils/logger');
      logger.warn('Invalid channel provided to cleanupOldGuideMessages');
      return;
    }

    const botId = channel.client.user.id;

    // Fetch recent messages to find old guide messages
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessages = messages.filter(msg => msg.author.id === botId);

    for (const [messageId, message] of botMessages) {
      // Check if this is a guide/quick action message
      const isGuideMessage = message.embeds.length > 0 &&
                            message.embeds[0].title &&
                            (message.embeds[0].title.includes('Quick Guide') ||
                             message.embeds[0].title.includes('Ready to recommend') ||
                             message.embeds[0].title.includes('Movie Night') ||
                             message.embeds[0].title.includes('No Active Voting Session'));

      if (isGuideMessage) {
        try {
          await message.delete();
          const logger = require('../utils/logger');
          logger.debug(`🗑️ Cleaned up old guide message: ${messageId}`);
        } catch (error) {
          const logger = require('../utils/logger');
          logger.warn(`Failed to delete old guide message ${messageId}:`, error.message);
        }
      }
    }
  } catch (error) {
    const logger = require('../utils/logger');
    logger.warn('Error cleaning up old guide messages:', error.message);
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
    const botMessages = messages.filter(msg => msg.author.id === channel.client.user.id);

    // Get current movie titles from database to check if threads are still relevant
    const database = require('../database');
    const currentMovies = await database.getMoviesByChannel(channel.guild.id, channel.id);
    const currentMovieTitles = new Set(currentMovies.map(movie => movie.title));

    for (const [threadId, thread] of allThreads) {
      // Skip if not a movie discussion thread
      if (!thread.name.includes('Discussion')) {
        continue;
      }

      // Extract movie title from thread name (format: "Movie Title — Discussion")
      const movieTitle = thread.name.replace(' — Discussion', '');

      // Check if this movie still exists in the database
      const movieStillExists = currentMovieTitles.has(movieTitle);

      // Check if there's a corresponding bot message for this movie
      const hasCorrespondingPost = botMessages.some(msg =>
        msg.embeds.length > 0 &&
        msg.embeds[0].title &&
        msg.embeds[0].title.includes(movieTitle)
      );

      // Only delete if movie doesn't exist in database AND no corresponding post
      if (!movieStillExists && !hasCorrespondingPost) {
        try {
          await thread.delete();
          cleanedCount++;
          console.log(`🧵 Deleted orphaned thread: ${thread.name} (${threadId}) - movie no longer exists`);
        } catch (error) {
          console.warn(`Failed to delete orphaned thread ${threadId}:`, error.message);
        }
      } else {
        console.log(`🧵 Keeping thread: ${thread.name} (movie exists: ${movieStillExists}, has post: ${hasCorrespondingPost})`);
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

    // Check if there's an active voting session
    const activeSession = await database.getActiveVotingSession(guildId);
    if (!activeSession) {
      console.log('🔍 No active voting session - skipping movie post recreation');
      return 0;
    }

    // Get all movies for this guild and channel that are in the current session
    const allMovies = await database.getMoviesByChannel(guildId, channel.id);
    const sessionMovies = allMovies.filter(movie =>
      movie.session_id === activeSession.id ||
      (movie.status === 'pending' && !movie.session_id) // Include pending movies without session
    );

    console.log(`🔍 Active voting session for guild ${guildId}: Session ${activeSession.id}`);

    // Get current messages in channel
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(msg => msg.author.id === channel.client.user.id);
    const existingMessageIds = new Set(botMessages.keys());

    for (const movie of sessionMovies) {
      // Skip watched movies - they don't need posts
      if (movie.status === 'watched') continue;

      console.log(`🔍 Movie ${movie.message_id} in voting session: ${movie.session_id === activeSession.id} (movie session_id: ${movie.session_id})`);

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

    // Fetch IMDb data from cache only (no fallback)
    let imdbData = null;
    try {
      const imdb = require('./imdb');
      if (movie.imdb_id) {
        imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);
      }
    } catch (e) {
      console.warn(`Failed to fetch IMDb cache for ${movie.title}:`, e?.message || e);
    }

    // Create movie embed with proper field mapping and safety checks
    const movieEmbed = embeds.createMovieEmbed({
      title: movie.title || 'Unknown Movie',
      description: movie.description || '',
      where_to_watch: movie.where_to_watch || 'Unknown Platform',
      recommended_by: movie.recommended_by || 'Unknown User',
      status: movie.status || 'pending',
      created_at: movie.created_at
    }, imdbData, voteCounts);

    // Create voting buttons only (admin buttons require permission checks)
    const movieComponents = components.createVotingButtons(movie.message_id, voteCounts.up, voteCounts.down);

    // Post the recreated message
    const newMessage = await channel.send({
      embeds: [movieEmbed],
      components: movieComponents
    });

    // Create new movie record with new message ID and preserve vote data
    try {
      // Get the old vote counts to preserve them
      const oldVoteCounts = await database.getVoteCounts(movie.message_id);

      // Delete the old movie record (this will cascade delete votes due to foreign key)
      await database.deleteMovie(movie.message_id);

      // Create new movie record with the new message ID
      const movieId = await database.saveMovie({
        messageId: newMessage.id,
        guildId: channel.guild.id,
        channelId: channel.id,
        title: movie.title,
        whereToWatch: movie.where_to_watch,
        recommendedBy: movie.recommended_by,
        imdbId: movie.imdb_id,
        status: movie.status
      });

      if (movieId) {
        console.log(`🔄 Recreated movie record: ${movie.title} (${movie.message_id} → ${newMessage.id})`);
      } else {
        console.warn(`Failed to recreate movie record for ${movie.title}`);
        return false;
      }
    } catch (dbError) {
      console.warn(`Failed to recreate movie record for ${movie.title}:`, dbError.message);
      return false;
    }

    // Create discussion thread for the movie
    try {
      const thread = await newMessage.startThread({
        name: `💬 ${movie.title}`,
        autoArchiveDuration: 10080 // 7 days
      });

      // Add detailed information to the thread
      const movieCreation = require('./movie-creation');
      await movieCreation.addDetailedMovieInfoToThread(thread, {
        title: movie.title,
        where: movie.where_to_watch,
        imdbData: imdbData
      });

      console.log(`🧵 Created discussion thread for recreated post: ${movie.title}`);
    } catch (threadError) {
      console.warn(`Failed to create thread for ${movie.title}:`, threadError.message);
    }

  } catch (error) {
    console.error(`Error recreating movie post for ${movie.title}:`, error);
    throw error;
  }
}

async function recreateMissingThreads(channel, botMessages) {
  // Check for movies that have Discord posts but missing threads
  let threadsCreated = 0;

  try {
    // Get all current threads
    const [activeThreads, archivedThreads] = await Promise.all([
      channel.threads.fetchActive().catch(() => ({ threads: new Map() })),
      channel.threads.fetchArchived({ limit: 100 }).catch(() => ({ threads: new Map() }))
    ]);

    const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);
    const existingThreadTitles = new Set();

    // Extract movie titles from existing threads
    for (const [, thread] of allThreads) {
      if (thread.name.includes(' — Discussion')) {
        const movieTitle = thread.name.replace(' — Discussion', '');
        existingThreadTitles.add(movieTitle);
      }
    }

    // Check each movie with a Discord post
    for (const [, message] of botMessages) {
      // Skip if not a movie post (no embeds or wrong format)
      if (!message.embeds.length || !message.embeds[0].title) continue;

      // Extract movie title from embed
      const embedTitle = message.embeds[0].title;
      const movieTitle = embedTitle.replace(/^[🎬🍿⭐📌⏭️✅]\s*/, ''); // Remove status emojis

      // Check if this movie has a thread
      if (!existingThreadTitles.has(movieTitle)) {
        try {
          // Verify message still exists before creating thread
          await message.fetch();

          // Create missing thread
          const thread = await message.startThread({
            name: `${movieTitle} — Discussion`,
            autoArchiveDuration: 1440 // 24 hours
          });

          await thread.send(`💬 **Discussion thread for ${movieTitle}**\n\nShare your thoughts, reviews, or questions about this movie!`);
          threadsCreated++;
          const logger = require('../utils/logger');
          logger.debug(`🧵 Created missing thread for: ${movieTitle}`);
        } catch (error) {
          const logger = require('../utils/logger');
          if (error.message.includes('Unknown Message')) {
            logger.debug(`Skipping thread creation for deleted message: ${movieTitle}`);
          } else {
            logger.warn(`Failed to create thread for ${movieTitle}:`, error.message);
          }
        }
      }
    }

    if (threadsCreated > 0) {
      console.log(`🧵 Created ${threadsCreated} missing discussion threads`);
    }

    return threadsCreated;
  } catch (error) {
    console.warn('Error recreating missing threads:', error.message);
    return 0;
  }
}

async function removeMoviePost(client, channelId, movieId) {
  try {
    if (!client || !channelId || !movieId) {
      console.warn('Missing parameters for removeMoviePost:', { client: !!client, channelId, movieId });
      return false;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.warn(`Channel not found: ${channelId}`);
      return false;
    }

    // Find and delete the movie message
    const messages = await channel.messages.fetch({ limit: 100 });
    const movieMessage = messages.find(msg => msg.id === movieId);

    if (movieMessage) {
      await movieMessage.delete();
      console.log(`🗑️ Deleted movie message: ${movieId}`);
    }

    // Find and delete associated thread
    const threads = await channel.threads.fetchActive();
    for (const [threadId, thread] of threads.threads) {
      if (thread.name.includes('Discussion') && thread.parentId === movieId) {
        await thread.delete();
        console.log(`🧵 Deleted thread: ${thread.name} (${threadId})`);
        break;
      }
    }

    return true;
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error removing movie post:', error.message);
    return false;
  }
}

module.exports = {
  handleMovieCleanup,
  handleCleanupSync,
  handleCleanupPurge,
  ensureQuickActionAtBottom,
  ensureQuickActionPinned,
  cleanupOldGuideMessages,
  cleanupOrphanedThreads,
  cleanupAllThreads,
  recreateMissingMoviePosts,
  recreateMoviePost,
  removeMoviePost,
  recreateMissingThreads
};
