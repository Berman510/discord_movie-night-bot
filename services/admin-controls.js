/**
 * Admin Controls Service
 * Manages persistent admin control panel with quick action buttons
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const database = require('../database');
const contentTypes = require('../utils/content-types');

/**
 * Create the admin control panel embed
 */
async function createAdminControlEmbed(guildName, guildId) {
  const embed = new EmbedBuilder()
    .setTitle('🔧 Watch Party Moderation Panel')
    .setDescription(`Moderation controls for **${guildName}**`)
    .setColor(0x5865f2);

  // Get channel information
  let channelInfo = 'Channel information not available';
  try {
    const config = await database.getGuildConfig(guildId);
    if (config && config.movie_channel_id) {
      const client = global.discordClient;
      const channel = await client.channels.fetch(config.movie_channel_id).catch(() => null);
      if (channel) {
        const channelTypeString = contentTypes.getChannelTypeString(channel);
        channelInfo = `**Voting Channel:** ${channelTypeString} <#${channel.id}>`;
      } else {
        channelInfo = '**Voting Channel:** ❌ Channel not found';
      }
    } else {
      channelInfo = '**Voting Channel:** ❌ Not configured';
    }
  } catch (error) {
    console.warn('Error getting channel info for admin panel:', error.message);
  }

  // WS status display
  let wsText = 'WS: disabled';
  try {
    const { getStatus } = require('../services/ws-client');
    const s = typeof getStatus === 'function' ? getStatus() : null;
    if (s) wsText = `WS: ${s.connected ? 'Connected' : 'Disconnected'}`;
  } catch (e) {
    /* no-op: ws status optional */ void 0;
  }

  embed
    .addFields(
      {
        name: '📋 Quick Actions',
        value: `• **Sync** - Update admin channel with current movies
• **Purge** - Clear movie queue while preserving records
• **Deep Purge** - Complete guild data removal (with confirmations)
• **Stats** - View guild movie statistics`,
        inline: false,
      },
      {
        name: '⚙️ Configuration',
        value: channelInfo,
        inline: false,
      },
      {
        name: '🌐 Web Dashboard',
        value: 'Manage the bot  from the dashboard: https://watchparty.bermanoc.net',
        inline: false,
      },
      {
        name: '⚡ Status',
        value: `Control panel active and ready for use. • ${wsText}`,
        inline: false,
      }
    )
    .setFooter({ text: 'Use the buttons below for quick admin actions' })
    .setTimestamp();

  return embed;
}

/**
 * Try to show setup panel in admin channels when no configuration exists
 */
async function tryShowSetupPanelInAdminChannels(client, guildId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return null;

    // Look for channels where bot has admin permissions (likely admin channels)
    const channels = guild.channels.cache.filter(
      (channel) =>
        channel.isTextBased() &&
        channel.permissionsFor(client.user)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])
    );

    // Try to find a channel with "admin" in the name first
    let adminChannel = channels.find(
      (channel) =>
        channel.name.toLowerCase().includes('admin') ||
        channel.name.toLowerCase().includes('mod') ||
        channel.name.toLowerCase().includes('staff')
    );

    // If no admin-named channel, use the first available channel
    if (!adminChannel) {
      adminChannel = channels.first();
    }

    if (!adminChannel) {
      console.log('No suitable admin channel found for setup panel');
      return null;
    }

    // Create setup panel embed
    const _guidedSetup = require('./guided-setup');
    const embed = new EmbedBuilder()
      .setTitle('🎬 Movie Night Bot - Setup Required')
      .setDescription(
        `**Configuration Cleared**\n\nThe bot configuration has been cleared. Please complete setup to use Movie Night Bot.`
      )
      .setColor(0xffa500)
      .addFields(
        {
          name: '🚀 Quick Setup',
          value: 'Use the button below to start the guided setup process.',
          inline: false,
        },
        {
          name: '⚙️ Manual Setup',
          value: 'Or use `/movie-setup` command for step-by-step configuration.',
          inline: false,
        },
        {
          name: '🌐 Web Dashboard',
          value:
            'Prefer a browser? Configure and manage the bot (minus voting) at https://watchparty.bermanoc.net',
          inline: false,
        }
      )
      .setFooter({ text: 'Setup required before using Movie Night features' });

    const components = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('start_guided_setup')
          .setLabel('🚀 Start Setup')
          .setStyle(ButtonStyle.Primary)
      ),
    ];

    // Check for existing setup panel
    const messages = await adminChannel.messages.fetch({ limit: 50 });
    const existingSetupPanel = messages.find(
      (msg) =>
        msg.author.id === client.user.id &&
        msg.embeds.length > 0 &&
        msg.embeds[0].title &&
        msg.embeds[0].title.includes('Setup Required')
    );

    if (existingSetupPanel) {
      await existingSetupPanel.edit({
        embeds: [embed],
        components: components,
      });
      console.log('🔧 Updated setup panel in admin channel');
      return existingSetupPanel;
    } else {
      const setupPanel = await adminChannel.send({
        embeds: [embed],
        components: components,
      });

      try {
        await setupPanel.pin();
        console.log('🔧 Created and pinned setup panel in admin channel');
      } catch (pinError) {
        console.log('🔧 Created setup panel in admin channel (not pinned)');
      }

      return setupPanel;
    }
  } catch (error) {
    console.error('Error showing setup panel in admin channels:', error);
    return null;
  }
}

/**
 * Create control buttons based on user permissions
 */
async function createControlButtonsForUser(interaction, guildId = null) {
  const permissions = require('./permissions');

  const isAdmin = await permissions.checkMovieAdminPermission(interaction);
  const isModerator = await permissions.checkMovieModeratorPermission(interaction);

  if (isAdmin) {
    return await createAdminControlButtons(guildId);
  } else if (isModerator) {
    return await createModeratorControlButtons(guildId);
  } else {
    return []; // No permissions
  }
}

/**
 * Create moderator control action buttons (subset of admin controls)
 */
async function createModeratorControlButtons(guildId = null) {
  // Same as admin controls - moderators get the same panel
  // Permission checking happens at the button handler level
  return await createAdminControlButtons(guildId);
}

/**
 * Create admin control action buttons (full access)
 */
async function createAdminControlButtons(guildId = null) {
  // Main moderation controls
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_ctrl_sync')
      .setLabel('🔄 Sync Channels')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('admin_ctrl_purge')
      .setLabel('🗑️ Purge Current Queue')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_ctrl_banned_list')
      .setLabel('🚫 Banned Movies')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_ctrl_refresh')
      .setLabel('🔄 Refresh Panel')
      .setStyle(ButtonStyle.Secondary)
  );

  // Session management controls
  const row2 = new ActionRowBuilder();

  // Check for active session to determine which buttons to show
  let hasManageableSession = false;
  if (guildId) {
    try {
      const activeSession = await database.getActiveVotingSession(guildId);
      if (activeSession) {
        hasManageableSession = true;
      } else {
        // Also allow cancel/reschedule after winner selection until event starts
        const upcoming = await database.getUpcomingDecidedSession(guildId);
        hasManageableSession = !!upcoming;
      }
    } catch (error) {
      console.warn('Error checking session state for admin buttons:', error.message);
    }
  }

  if (hasManageableSession) {
    // Session management buttons for active or scheduled (pre-start) session
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_cancel_session')
        .setLabel('❌ Cancel Current Session')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_reschedule_session')
        .setLabel('📅 Reschedule Current Session')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_administration')
        .setLabel('🔧 Administration')
        .setStyle(ButtonStyle.Secondary)
    );
  } else {
    // Default buttons when no session - separate movie, TV, and mixed planning
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_plan_movie_session')
        .setLabel('🍿 Plan Movie Session')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_plan_tv_session')
        .setLabel('📺 Plan TV Show Session')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_plan_mixed_session')
        .setLabel('🎬 Plan Mixed Session')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_administration')
        .setLabel('🔧 Administration')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return [row1, row2];
}

/**
 * Check if the voting channel is a forum channel
 */
async function _checkIfVotingChannelIsForum(guildId) {
  if (!guildId) {
    return false;
  }

  try {
    const config = await database.getGuildConfig(guildId);
    if (!config || !config.movie_channel_id) {
      return false;
    }

    const client = global.discordClient;
    if (!client) {
      return false;
    }

    const channel = await client.channels.fetch(config.movie_channel_id).catch(() => null);
    return channel && channel.type === require('discord.js').ChannelType.GuildForum;
  } catch (error) {
    console.warn('Error checking voting channel type:', error.message);
    return false;
  }
}

/**
 * Post or update the admin control panel in the admin channel
 */
async function ensureAdminControlPanel(client, guildId) {
  try {
    const config = await database.getGuildConfig(guildId);

    // If no configuration exists, try to show setup panel in any admin channel
    if (!config) {
      console.log('No configuration found for guild:', guildId);
      return await tryShowSetupPanelInAdminChannels(client, guildId);
    }

    if (!config.admin_channel_id) {
      console.log('No admin channel configured for guild:', guildId);
      return null;
    }

    const adminChannel = await client.channels.fetch(config.admin_channel_id).catch(() => null);
    if (!adminChannel) {
      console.log('Admin channel not found:', config.admin_channel_id);
      return null;
    }

    // Validate bot permissions for this channel before attempting to fetch pins/send
    try {
      const { PermissionFlagsBits } = require('discord.js');
      const perms = adminChannel.permissionsFor(client.user?.id);
      if (
        !perms ||
        !perms.has(PermissionFlagsBits.ViewChannel) ||
        !perms.has(PermissionFlagsBits.SendMessages)
      ) {
        const logger = require('../utils/logger');
        logger.warn(
          '[Missing Access] Bot lacks ViewChannel or SendMessages in admin channel; skipping ensureAdminControlPanel'
        );
        return null;
      }
    } catch (_) {
      /* permissive: continue */
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log('Guild not found:', guildId);
      return null;
    }

    // Check if control panel already exists (try pinned first, then recent messages)
    let existingPanel = null;

    // First try to find in pinned messages
    try {
      const pinnedMessages = await adminChannel.messages.fetchPins();
      // Check if pinnedMessages is a Collection and has the find method
      if (pinnedMessages && typeof pinnedMessages.find === 'function') {
        existingPanel = pinnedMessages.find(
          (msg) =>
            msg.author.id === client.user.id &&
            msg.embeds.length > 0 &&
            msg.embeds[0].title &&
            (msg.embeds[0].title.includes('Moderation Panel') || msg.embeds[0].title.includes('Admin Control Panel'))
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
    if (!existingPanel) {
      try {
        const recentMessages = await adminChannel.messages.fetch({ limit: 50 });
        existingPanel = recentMessages.find(
          (msg) =>
            msg.author.id === client.user.id &&
            msg.embeds.length > 0 &&
            msg.embeds[0].title &&
            (msg.embeds[0].title.includes('Moderation Panel') || msg.embeds[0].title.includes('Admin Control Panel'))
        );
      } catch (error) {
        console.warn('Error fetching recent messages for admin panel search:', error.message);
      }
    }

    const embed = await createAdminControlEmbed(guild.name, guildId);
    const components = await createAdminControlButtons(guildId);

    if (existingPanel) {
      // Update existing pinned panel
      try {
        await existingPanel.edit({
          embeds: [embed],
          components: components,
        });
        const logger = require('../utils/logger');
        logger.debug('🔧 Updated pinned admin control panel');
        return existingPanel;
      } catch (error) {
        const logger = require('../utils/logger');
        logger.warn('Could not update existing admin panel:', error.message);
        // Don't delete the existing panel - just create a new one below
        // This prevents the panel from disappearing if there's a temporary error
        existingPanel = null; // Mark as null so we create a new one
      }
    }

    // Create new pinned panel
    const controlPanel = await adminChannel.send({
      embeds: [embed],
      components: components,
    });

    try {
      await controlPanel.pin();
      const logger = require('../utils/logger');
      logger.debug('🔧 Created and pinned admin control panel');
    } catch (pinError) {
      const logger = require('../utils/logger');
      logger.warn('Could not pin admin control panel:', pinError.message);
      logger.debug('🔧 Created admin control panel (not pinned)');
    }

    return controlPanel;
  } catch (error) {
    console.error('Error ensuring admin control panel:', error);
    return null;
  }
}

/**
 * Handle sync channel action - syncs both admin and voting channels
 */
async function handleSyncChannel(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Check permissions (moderators and admins can sync)
  const permissions = require('./permissions');
  const hasModerator = await permissions.checkMovieModeratorPermission(interaction);

  if (!hasModerator) {
    await interaction.editReply({
      content:
        '❌ **Access Denied**\n\nYou need moderator or administrator permissions to sync channels.',
    });
    return;
  }

  try {
    const config = await database.getGuildConfig(interaction.guild.id);

    if (!config) {
      await interaction.editReply({
        content: '❌ No guild configuration found. Please run `/movie-configure` first.',
      });
      return;
    }

    let adminSynced = 0;
    let votingSynced = 0;
    const errors = [];

    // Admin channel mirror is intentionally NOT refreshed by Sync Channels to avoid disrupting
    // ongoing admin interactions (Pick Winner, Remove, Ban, etc.). Use the "Refresh Panel" button
    // if the control panel itself needs to be re-rendered.
    adminSynced = 0;

    // Sync voting channel if configured
    if (config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('./forum-channels');

          if (forumChannels.isForumChannel(votingChannel)) {
            // For forum channels, we don't clear messages - each movie has its own post
            const logger = require('../utils/logger');
            logger.debug(`📋 Syncing forum channel: ${votingChannel.name}`);
            // Forum sync will be handled by recreating/updating forum posts below
          } else {
            // Clear existing movie messages in text voting channel (preserve quick action)
            const logger = require('../utils/logger');
            logger.debug(`📋 Clearing messages in text channel: ${votingChannel.name}`);
            const messages = await votingChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(
              (msg) => msg.author.id === interaction.client.user.id
            );

            for (const [messageId, message] of botMessages) {
              try {
                // Skip quick action messages
                const isQuickAction =
                  message.embeds.length > 0 &&
                  message.embeds[0].title &&
                  message.embeds[0].title.includes('Quick Actions');

                if (!isQuickAction) {
                  await message.delete();
                }
              } catch (error) {
                console.warn(`Failed to delete voting message ${messageId}:`, error.message);
              }
            }
          }

          // Only recreate voting posts when there is an active session
          const activeSession = await database.getActiveVotingSession(interaction.guild.id);

          let allContent = [];
          if (activeSession) {
            const sessionContentType = activeSession.content_type || 'movie';

            // Get content based on session content type
            if (sessionContentType === 'movie') {
              // Movie sessions only get movies
              const movies = await database.getMoviesByStatusExcludingCarryover(
                interaction.guild.id,
                'pending',
                50
              );
              const plannedMovies = await database.getMoviesByStatusExcludingCarryover(
                interaction.guild.id,
                'planned',
                50
              );
              const scheduledMovies = await database.getMoviesByStatusExcludingCarryover(
                interaction.guild.id,
                'scheduled',
                50
              );
              allContent = [...movies, ...plannedMovies, ...scheduledMovies];
            } else if (sessionContentType === 'tv_show') {
              // TV show sessions only get TV shows
              const tvShows = await database.getTVShowsByGuild(interaction.guild.id);
              const activeTVShows = tvShows.filter(
                (show) =>
                  show.status === 'pending' ||
                  show.status === 'planned' ||
                  show.status === 'scheduled'
              );
              allContent = activeTVShows;
            } else if (sessionContentType === 'mixed') {
              // Mixed sessions get both movies and TV shows
              const movies = await database.getMoviesByStatusExcludingCarryover(
                interaction.guild.id,
                'pending',
                50
              );
              const plannedMovies = await database.getMoviesByStatusExcludingCarryover(
                interaction.guild.id,
                'planned',
                50
              );
              const scheduledMovies = await database.getMoviesByStatusExcludingCarryover(
                interaction.guild.id,
                'scheduled',
                50
              );
              const allMovies = [...movies, ...plannedMovies, ...scheduledMovies];

              const tvShows = await database.getTVShowsByGuild(interaction.guild.id);
              const activeTVShows = tvShows.filter(
                (show) =>
                  show.status === 'pending' ||
                  show.status === 'planned' ||
                  show.status === 'scheduled'
              );

              allContent = [...allMovies, ...activeTVShows];
            }
          }

          for (const content of allContent) {
            try {
              // Skip content with purged message IDs - they need proper recreation
              if (content.message_id && content.message_id.startsWith('purged_')) {
                console.log(`⏭️ Skipping purged content for voting sync: ${content.title}`);
                continue;
              }

              const isTV = content.show_type !== undefined; // TV shows have show_type field

              if (forumChannels.isForumChannel(votingChannel)) {
                // For forum channels, create/update forum posts
                if (isTV) {
                  await syncForumTVShowPost(votingChannel, content);
                } else {
                  await syncForumMoviePost(votingChannel, content);
                }
              } else {
                // For text channels, use existing cleanup logic
                const cleanup = require('./cleanup');
                if (isTV) {
                  // TODO: Add TV show support for text channels if needed
                  console.log(`⏭️ TV show text channel sync not yet implemented: ${content.title}`);
                } else {
                  await cleanup.recreateMoviePost(votingChannel, content);
                }
              }
              votingSynced++;
            } catch (error) {
              console.warn(`Failed to recreate voting post for ${content.title}:`, error.message);
            }
          }

          // Ensure recommendation post/action for the channel
          if (forumChannels.isTextChannel(votingChannel)) {
            // Text channels get quick action at bottom
            const cleanup = require('./cleanup');
            await cleanup.ensureQuickActionAtBottom(votingChannel);
          } else if (forumChannels.isForumChannel(votingChannel)) {
            // Forum channels get recommendation post and cleanup

            // If no active session, clean up all old movie posts first
            if (!activeSession) {
              const logger = require('../utils/logger');
              logger.debug('📋 No active session - cleaning up forum movie posts');
              await forumChannels.clearForumMoviePosts(votingChannel, null);
              // Create no session post
              await forumChannels.createNoActiveSessionPost(votingChannel);
            } else {
              // Only ensure recommendation post if there's an active session
              await forumChannels.ensureRecommendationPost(votingChannel, activeSession);
            }
          }
        } else {
          errors.push('Voting channel not found');
        }
      } catch (error) {
        const where = error && error.stack ? error.stack.split('\n')[0] : '';
        errors.push(`Voting channel: ${error.message}${where ? ` (${where})` : ''}`);
      }
    }

    // Prepare response
    const successParts = [];
    if (adminSynced > 0) {
      successParts.push(`${adminSynced} movies to admin channel`);
    }
    if (votingSynced > 0) {
      successParts.push(`${votingSynced} movies to voting channel`);
    }

    if (errors.length > 0) {
      await interaction.editReply({
        content: `⚠️ Sync completed with errors:\n${errors.join('\n')}\n\nSynced: ${successParts.join(', ')}`,
      });
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (e) {
          /* no-op: ephemeral cleanup */ void 0;
        }
      }, 8000);
    } else if (successParts.length > 0) {
      await interaction.editReply({
        content: `✅ Successfully synced ${successParts.join(' and ')}.`,
      });
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (e) {
          /* no-op: ephemeral cleanup */ void 0;
        }
      }, 8000);
    } else {
      await interaction.editReply({
        content: '✅ Sync completed. No movies found to sync.',
      });
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (e) {
          /* no-op: ephemeral cleanup */ void 0;
        }
      }, 8000);
    }
  } catch (error) {
    console.error('Error syncing channels:', error);
    await interaction.editReply({
      content: '❌ An error occurred while syncing the channels.',
    });
    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch (e) {
        /* no-op: ephemeral cleanup */ void 0;
      }
    }, 8000);
  }
}

/**
 * Handle purge queue action with confirmation
 */
async function handlePurgeQueue(interaction) {
  // Check permissions (moderators and admins can purge)
  const permissions = require('./permissions');
  const hasModerator = await permissions.checkMovieModeratorPermission(interaction);

  if (!hasModerator) {
    await interaction.reply({
      content:
        '❌ **Access Denied**\n\nYou need moderator or administrator permissions to purge the queue.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Create confirmation buttons
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ Confirm Queue Purge')
    .setDescription(
      'This will **permanently delete** all movie posts and threads from both channels while preserving movie records in the database.'
    )
    .setColor(0xed4245)
    .addFields(
      {
        name: '🗑️ What will be deleted',
        value:
          '• All movie posts in voting channel\n• All movie posts in admin channel\n• All discussion threads\n• All votes',
        inline: false,
      },
      {
        name: '💾 What will be preserved',
        value: '• Movie records in database\n• Watched movies\n• Banned movies',
        inline: false,
      }
    )
    .setFooter({ text: 'This action cannot be undone!' });

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_purge_queue')
      .setLabel('✅ Confirm Purge')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('cancel_purge_queue')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [confirmEmbed],
    components: [confirmRow],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Execute the actual purge after confirmation
 */
async function executePurgeQueue(interaction) {
  try {
    // Check if bot is configured
    const config = await database.getGuildConfig(interaction.guild.id);
    if (!config || !config.movie_channel_id) {
      await interaction.update({
        content:
          '❌ **Bot not configured**\n\nPlease use `/movie-configure` to set up the bot before using purge functions.',
        embeds: [],
        components: [],
      });
      return;
    }

    await interaction.update({
      content: '🗑️ Purging queue...',
      embeds: [],
      components: [],
    });

    // Use the same cleanup function as /movie-cleanup purge but don't let it reply
    const cleanup = require('./cleanup');
    const forumChannels = require('./forum-channels');

    // Get channels
    const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
    const adminChannel = config.admin_channel_id
      ? await interaction.client.channels.fetch(config.admin_channel_id)
      : null;

    // Perform the purge manually
    let purgedCount = 0;
    let threadsDeleted = 0;

    if (votingChannel) {
      // Get both movies and TV shows
      const movies = await database.getMoviesByGuild(interaction.guild.id);
      const tvShows = await database.getTVShowsByGuild(interaction.guild.id);
      const allContent = [...movies, ...tvShows];

      for (const content of allContent) {
        try {
          if (forumChannels.isForumChannel(votingChannel)) {
            // Delete forum threads matching this content (by stored thread_id if present)
            if (content.thread_id) {
              try {
                const thread = await interaction.client.channels
                  .fetch(content.thread_id)
                  .catch(() => null);
                if (thread && thread.parentId === votingChannel.id) {
                  await thread.delete();
                  threadsDeleted++;
                }
              } catch (e) {
                /* no-op: thread delete best-effort */ void 0;
              }
            } else {
              const threads = await votingChannel.threads.fetchActive();
              for (const [, thread] of threads.threads) {
                if (thread.name.includes(content.title)) {
                  await thread.delete();
                  threadsDeleted++;
                }
              }
            }
          }

          // Delete votes and content from database (check both tables)
          await database.pool.execute('DELETE FROM votes WHERE message_id = ?', [
            content.message_id,
          ]);

          // Delete from appropriate table based on content type or table structure
          if (movies.includes(content)) {
            await database.pool.execute('DELETE FROM movies WHERE message_id = ?', [
              content.message_id,
            ]);
          } else {
            await database.pool.execute('DELETE FROM tv_shows WHERE message_id = ?', [
              content.message_id,
            ]);
          }
          purgedCount++;
        } catch (error) {
          console.warn(`Error purging content ${content.title}:`, error.message);
        }
      }

      // Clear channel UI depending on channel type
      if (forumChannels.isTextChannel(votingChannel)) {
        // Text channels: delete bot messages and re-add quick action
        const messages = await votingChannel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter((msg) => msg.author.id === interaction.client.user.id);
        for (const [messageId, message] of botMessages) {
          try {
            await message.delete();
          } catch (error) {
            console.warn(`Failed to delete message ${messageId}:`, error.message);
          }
        }
        await cleanup.ensureQuickActionAtBottom(votingChannel);
      } else if (forumChannels.isForumChannel(votingChannel)) {
        // Forum channels: remove system posts and re-create appropriate pinned post
        try {
          const threads = await votingChannel.threads.fetchActive();
          const archived = await votingChannel.threads.fetchArchived({ limit: 50 });
          const all = new Map([...threads.threads, ...archived.threads]);
          for (const [, t] of all) {
            if (
              t.name.includes('No Active Voting Session') ||
              t.name.includes('🚫') ||
              t.name.includes('Recommend a Movie') ||
              t.name.includes('🍿')
            ) {
              try {
                await t.delete('Purge system posts');
              } catch (e) {
                /* no-op: purge best-effort */ void 0;
              }
            }
          }
        } catch (e) {
          /* no-op: thread iteration */ void 0;
        }
        try {
          const activeSession = await database.getActiveVotingSession(interaction.guild.id);
          if (activeSession) {
            await require('./forum-channels').ensureRecommendationPost(
              votingChannel,
              activeSession
            );
          } else {
            await require('./forum-channels').createNoActiveSessionPost(votingChannel);
          }
        } catch (e) {
          /* no-op: no-session post */ void 0;
        }
      }
    }

    if (adminChannel) {
      // Clear admin channel messages
      const messages = await adminChannel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter((msg) => msg.author.id === interaction.client.user.id);

      for (const [messageId, message] of botMessages) {
        try {
          const isControlPanel =
            message.embeds.length > 0 &&
            message.embeds[0].title &&
            (message.embeds[0].title.includes('Moderation Panel') || message.embeds[0].title.includes('Admin Control Panel'));

          if (!isControlPanel) {
            await message.delete();
          }
        } catch (error) {
          console.warn(`Failed to delete admin message ${messageId}:`, error.message);
        }
      }

      // Ensure admin control panel is at bottom
      await ensureAdminControlPanel(interaction.client, interaction.guild.id);
    }

    try {
      await interaction.editReply({
        content: `✅ **Queue purged successfully!**\n\n🗑️ Deleted: ${purgedCount} movies, ${threadsDeleted} threads\n📋 Channels cleared and reset`,
        embeds: [],
        components: [],
      });
    } catch (_) {
      await interaction.followUp({
        content: `✅ **Queue purged successfully!**\n\n🗑️ Deleted: ${purgedCount} movies, ${threadsDeleted} threads\n📋 Channels cleared and reset`,
        flags: MessageFlags.Ephemeral,
      });
    }

    console.log(
      `🗑️ Admin purge executed by ${interaction.user.tag} in guild ${interaction.guild.name}`
    );
  } catch (error) {
    console.error('Error executing purge:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while purging the queue.',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.editReply({ content: '❌ An error occurred while purging the queue.' });
      }
    } catch {
      await interaction.followUp({
        content: '❌ An error occurred while purging the queue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

/**
 * Handle guild stats action
 */
async function handleGuildStats(interaction) {
  try {
    const stats = require('./stats');
    // The stats service handles its own interaction reply
    await stats.showOverviewStats(interaction);
  } catch (error) {
    console.error('Error showing guild stats:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while fetching guild statistics.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

/**
 * Handle banned movies list action
 */
async function handleBannedMoviesList(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const bannedMovies = await database.getBannedMovies(interaction.guild.id);

    if (bannedMovies.length === 0) {
      await interaction.editReply({
        content: '✅ No movies are currently banned in this guild.',
      });
      return;
    }

    const movieList = bannedMovies
      .map((movie, index) => `${index + 1}. **${movie.title}**`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🚫 Banned Movies')
      .setDescription(`${bannedMovies.length} movie(s) currently banned:\n\n${movieList}`)
      .setColor(0xed4245)
      .setFooter({ text: `Guild: ${interaction.guild.name}` })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (error) {
    console.error('Error fetching banned movies:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching banned movies.',
    });
  }
}

/**
 * Handle refresh panel action
 */
async function handleRefreshPanel(interaction) {
  try {
    const guild = interaction.guild;
    const embed = await createAdminControlEmbed(guild.name, guild.id);
    const components = await createAdminControlButtons(guild.id);

    await interaction.update({
      embeds: [embed],
      components: components,
    });

    const logger = require('../utils/logger');
    logger.debug('🔧 Refreshed admin control panel');
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error refreshing admin panel:', error);
    await interaction.reply({
      content: '❌ An error occurred while refreshing the control panel.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Sync a movie post in a forum channel
 */
async function syncForumMoviePost(forumChannel, movie) {
  try {
    const forumChannels = require('./forum-channels');
    const { embeds, components } = require('../utils');

    // Check if forum post already exists
    let existingThread = null;
    if (movie.thread_id) {
      try {
        existingThread = await forumChannel.threads.fetch(movie.thread_id);
      } catch (error) {
        console.log(`Forum thread ${movie.thread_id} not found, will create new one`);
      }
    }

    if (existingThread) {
      // Update existing forum post

      const voteCounts = await database.getVoteCounts(movie.message_id);
      // Parse IMDb data (handle single/double-encoded JSON)
      let imdbData = null;
      try {
        if (movie.imdb_data) {
          let parsed =
            typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          imdbData = parsed;
        }
      } catch (e) {
        console.warn(`Failed to parse IMDb data for ${movie.title}:`, e.message);
      }
      const movieEmbed = embeds.createMovieEmbed(movie, imdbData, voteCounts);
      const movieComponents = components.createVotingButtons(
        movie.message_id,
        voteCounts.up,
        voteCounts.down
      );

      // Update the starter message
      const starterMessage = await existingThread.fetchStarterMessage();
      if (starterMessage) {
        await starterMessage.edit({
          embeds: [movieEmbed],
          components: movieComponents,
        });

        // Update forum post title with vote counts (only for major status changes)
        await forumChannels.updateForumPostTitle(
          existingThread,
          movie.title,
          movie.status,
          voteCounts.up,
          voteCounts.down
        );

        console.log(`📝 Updated existing forum post: ${movie.title}`);
      }
    } else {
      // Create new forum post

      const voteCounts = await database.getVoteCounts(movie.message_id);
      // Parse IMDb data (handle single/double-encoded JSON)
      let imdbData = null;
      try {
        if (movie.imdb_data) {
          let parsed =
            typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          imdbData = parsed;
        }
      } catch (e) {
        console.warn(`Failed to parse IMDb data for ${movie.title}:`, e.message);
      }
      const movieEmbed = embeds.createMovieEmbed(movie, imdbData, voteCounts);
      const movieComponents = components.createVotingButtons(
        movie.message_id,
        voteCounts.up,
        voteCounts.down
      );

      const result = await forumChannels.createForumMoviePost(
        forumChannel,
        { title: movie.title, embed: movieEmbed },
        movieComponents
      );

      const { thread, message: _message } = result;

      // Update database with new thread ID

      await database.updateMovieThreadId(movie.message_id, thread.id);

      console.log(`📝 Created new forum post: ${movie.title} (Thread: ${thread.id})`);
    }
  } catch (error) {
    console.error(`Error syncing forum movie post for ${movie.title}:`, error);
    throw error;
  }
}

/**
 * Sync a TV show post in a forum channel
 */
async function syncForumTVShowPost(forumChannel, tvShow) {
  try {
    const forumChannels = require('./forum-channels');
    const { embeds, components } = require('../utils');

    // Check if forum post already exists
    let existingThread = null;
    if (tvShow.thread_id) {
      try {
        existingThread = await forumChannel.threads.fetch(tvShow.thread_id);
      } catch (error) {
        console.log(`Forum thread ${tvShow.thread_id} not found, will create new one`);
      }
    }

    if (existingThread) {
      // Update existing forum post

      const voteCounts = await database.getVoteCounts(tvShow.message_id);
      // Parse IMDb data (handle single/double-encoded JSON)
      let imdbData = null;
      try {
        if (tvShow.imdb_data) {
          let parsed =
            typeof tvShow.imdb_data === 'string' ? JSON.parse(tvShow.imdb_data) : tvShow.imdb_data;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          imdbData = parsed;
        }
      } catch (e) {
        console.warn(`Failed to parse IMDb data for ${tvShow.title}:`, e.message);
      }
      const tvShowEmbed = embeds.createMovieEmbed(tvShow, imdbData, voteCounts, 'tv_show');
      const tvShowComponents = components.createVotingButtons(
        tvShow.message_id,
        voteCounts.up,
        voteCounts.down
      );

      // Update the starter message
      const starterMessage = await existingThread.fetchStarterMessage();
      if (starterMessage) {
        await starterMessage.edit({
          embeds: [tvShowEmbed],
          components: tvShowComponents,
        });

        // Update forum post title with vote counts (only for major status changes)
        await forumChannels.updateForumPostTitle(
          existingThread,
          tvShow.title,
          tvShow.status,
          voteCounts.up,
          voteCounts.down
        );

        console.log(`📝 Updated existing TV show forum post: ${tvShow.title}`);
      }
    } else {
      // Create new forum post

      const voteCounts = await database.getVoteCounts(tvShow.message_id);
      // Parse IMDb data (handle single/double-encoded JSON)
      let imdbData = null;
      try {
        if (tvShow.imdb_data) {
          let parsed =
            typeof tvShow.imdb_data === 'string' ? JSON.parse(tvShow.imdb_data) : tvShow.imdb_data;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          imdbData = parsed;
        }
      } catch (e) {
        console.warn(`Failed to parse IMDb data for ${tvShow.title}:`, e.message);
      }
      const tvShowEmbed = embeds.createMovieEmbed(tvShow, imdbData, voteCounts, 'tv_show');
      const tvShowComponents = components.createVotingButtons(
        tvShow.message_id,
        voteCounts.up,
        voteCounts.down
      );

      const result = await forumChannels.createForumMoviePost(
        forumChannel,
        { title: tvShow.title, embed: tvShowEmbed, contentType: 'tv_show' },
        tvShowComponents
      );

      const { thread, message: _message } = result;

      // Update database with new thread ID for TV show
      await database.pool.execute('UPDATE tv_shows SET thread_id = ? WHERE message_id = ?', [
        thread.id,
        tvShow.message_id,
      ]);

      console.log(`📝 Created new TV show forum post: ${tvShow.title} (Thread: ${thread.id})`);
    }
  } catch (error) {
    console.error(`Error syncing forum TV show post for ${tvShow.title}:`, error);
    throw error;
  }
}

/**
 * Populate forum channel with existing active movies
 */
async function populateForumChannel(client, guildId) {
  try {
    const config = await database.getGuildConfig(guildId);

    if (!config || !config.movie_channel_id) {
      console.log('No movie channel configured');
      return { populated: 0, error: 'No movie channel configured' };
    }

    const votingChannel = await client.channels.fetch(config.movie_channel_id);
    if (!votingChannel) {
      return { populated: 0, error: 'Movie channel not found' };
    }

    const forumChannels = require('./forum-channels');
    if (!forumChannels.isForumChannel(votingChannel)) {
      return { populated: 0, error: 'Channel is not a forum channel' };
    }

    // Get all active content that should be in the forum based on session type
    const activeSession = await database.getActiveVotingSession(guildId);
    if (!activeSession) {
      return { populated: 0, error: 'No active voting session' };
    }

    const sessionContentType = activeSession.content_type || 'movie';
    let allContent = [];

    // Get content based on session content type
    if (sessionContentType === 'movie') {
      // Movie sessions only get movies
      allContent = await database.getMoviesByStatusExcludingCarryover(guildId, 'pending', 50);
    } else if (sessionContentType === 'tv_show') {
      // TV show sessions only get TV shows
      const tvShows = await database.getTVShowsByGuild(guildId);
      allContent = tvShows.filter((show) => show.status === 'pending');
    } else if (sessionContentType === 'mixed') {
      // Mixed sessions get both movies and TV shows
      const movies = await database.getMoviesByStatusExcludingCarryover(guildId, 'pending', 50);
      const tvShows = await database.getTVShowsByGuild(guildId);
      const activeTVShows = tvShows.filter((show) => show.status === 'pending');
      allContent = [...movies, ...activeTVShows];
    }

    let populatedCount = 0;
    console.log(`📋 Found ${allContent.length} active content items to populate in forum channel`);

    for (const content of allContent) {
      try {
        const isTV = content.show_type !== undefined;

        // Check if forum post already exists
        let existingThread = null;
        if (content.thread_id) {
          try {
            existingThread = await votingChannel.threads.fetch(content.thread_id);
          } catch (error) {
            console.log(`Forum thread ${content.thread_id} not found for ${content.title}`);
          }
        }

        if (!existingThread) {
          // Create new forum post for this content
          if (isTV) {
            await syncForumTVShowPost(votingChannel, content);
          } else {
            await syncForumMoviePost(votingChannel, content);
          }
          populatedCount++;
          console.log(`📝 Created forum post for: ${content.title}`);
        } else {
          console.log(`📝 Forum post already exists for: ${content.title}`);
        }
      } catch (error) {
        console.warn(`Failed to populate forum post for ${content.title}:`, error.message);
      }
    }

    // Ensure recommendation post exists
    await forumChannels.ensureRecommendationPost(votingChannel, activeSession);

    return { populated: populatedCount, error: null };
  } catch (error) {
    console.error('Error populating forum channel:', error);
    return { populated: 0, error: error.message };
  }
}

module.exports = {
  createAdminControlEmbed,
  createAdminControlButtons,
  createModeratorControlButtons,
  createControlButtonsForUser,
  ensureAdminControlPanel,
  handleSyncChannel,
  handlePurgeQueue,
  executePurgeQueue,
  handleGuildStats,
  handleBannedMoviesList,
  handleRefreshPanel,
  syncForumMoviePost,
  syncForumTVShowPost,
  populateForumChannel,
};
