/**
 * Admin Controls Service
 * Manages persistent admin control panel with quick action buttons
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const database = require('../database');

/**
 * Create the admin control panel embed
 */
async function createAdminControlEmbed(guildName, guildId) {
  const embed = new EmbedBuilder()
    .setTitle('🔧 Movie Night Admin Control Panel')
    .setDescription(`Administrative controls for **${guildName}**`)
    .setColor(0x5865f2);

  // Get channel information
  let channelInfo = 'Channel information not available';
  try {
    const config = await database.getGuildConfig(guildId);
    if (config && config.movie_channel_id) {
      const client = global.discordClient;
      const channel = await client.channels.fetch(config.movie_channel_id).catch(() => null);
      if (channel) {
        const { ChannelType } = require('discord.js');
        const channelType = channel.type === ChannelType.GuildForum ? '📋 Forum Channel' : '💬 Text Channel';
        channelInfo = `**Voting Channel:** ${channelType} <#${channel.id}>`;
      } else {
        channelInfo = '**Voting Channel:** ❌ Channel not found';
      }
    } else {
      channelInfo = '**Voting Channel:** ❌ Not configured';
    }
  } catch (error) {
    console.warn('Error getting channel info for admin panel:', error.message);
  }

  embed.addFields(
    {
      name: '📋 Quick Actions',
      value: `• **Sync** - Update admin channel with current movies
• **Purge** - Clear movie queue while preserving records
• **Deep Purge** - Complete guild data removal (with confirmations)
• **Stats** - View guild movie statistics`,
      inline: false
    },
    {
      name: '⚙️ Configuration',
      value: channelInfo,
      inline: false
    },
    {
      name: '⚡ Status',
      value: 'Control panel active and ready for use.',
      inline: false
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
    const channels = guild.channels.cache.filter(channel =>
      channel.isTextBased() &&
      channel.permissionsFor(client.user)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])
    );

    // Try to find a channel with "admin" in the name first
    let adminChannel = channels.find(channel =>
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
    const guidedSetup = require('./guided-setup');
    const embed = new EmbedBuilder()
      .setTitle('🎬 Movie Night Bot - Setup Required')
      .setDescription(`**Configuration Cleared**\n\nThe bot configuration has been cleared. Please complete setup to use Movie Night Bot.`)
      .setColor(0xffa500)
      .addFields(
        {
          name: '🚀 Quick Setup',
          value: 'Use the button below to start the guided setup process.',
          inline: false
        },
        {
          name: '⚙️ Manual Setup',
          value: 'Or use `/movie-setup` command for step-by-step configuration.',
          inline: false
        }
      )
      .setFooter({ text: 'Setup required before using Movie Night features' });

    const components = [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('start_guided_setup')
            .setLabel('🚀 Start Setup')
            .setStyle(ButtonStyle.Primary)
        )
    ];

    // Check for existing setup panel
    const messages = await adminChannel.messages.fetch({ limit: 50 });
    const existingSetupPanel = messages.find(msg =>
      msg.author.id === client.user.id &&
      msg.embeds.length > 0 &&
      msg.embeds[0].title &&
      msg.embeds[0].title.includes('Setup Required')
    );

    if (existingSetupPanel) {
      await existingSetupPanel.edit({
        embeds: [embed],
        components: components
      });
      console.log('🔧 Updated setup panel in admin channel');
      return existingSetupPanel;
    } else {
      const setupPanel = await adminChannel.send({
        embeds: [embed],
        components: components
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
 * Create admin control action buttons
 */
async function createAdminControlButtons(guildId = null) {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_sync')
        .setLabel('🔄 Sync Channel')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_purge')
        .setLabel('🗑️ Purge Queue')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_stats')
        .setLabel('📊 Guild Stats')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('open_configuration')
        .setLabel('⚙️ Configure')
        .setStyle(ButtonStyle.Primary)
    );

  const row2 = new ActionRowBuilder();

  // Check for active session to determine which buttons to show
  let hasActiveSession = false;
  if (guildId) {
    try {
      const activeSession = await database.getActiveVotingSession(guildId);
      hasActiveSession = !!activeSession;
    } catch (error) {
      console.warn('Error checking active session for admin buttons:', error.message);
    }
  }

  if (hasActiveSession) {
    // Session management buttons
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_cancel_session')
        .setLabel('❌ Cancel Session')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_reschedule_session')
        .setLabel('📅 Reschedule Session')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_deep_purge')
        .setLabel('💥 Deep Purge')
        .setStyle(ButtonStyle.Danger)
    );
  } else {
    // Default buttons when no session
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_plan_session')
        .setLabel('🗳️ Plan Next Session')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_deep_purge')
        .setLabel('💥 Deep Purge')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_banned_list')
        .setLabel('🚫 Banned Movies')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // Create row3 with conditional forum button
  const row3Components = [
    new ButtonBuilder()
      .setCustomId('admin_ctrl_refresh')
      .setLabel('🔄 Refresh Panel')
      .setStyle(ButtonStyle.Secondary)
  ];

  // Check if voting channel is a forum channel
  const isForumChannel = await checkIfVotingChannelIsForum(guildId);
  if (isForumChannel) {
    row3Components.unshift(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_populate_forum')
        .setLabel('📋 Populate Forum')
        .setStyle(ButtonStyle.Primary)
    );
  }

  const row3 = new ActionRowBuilder().addComponents(...row3Components);

  return [row1, row2, row3];
}

/**
 * Check if the voting channel is a forum channel
 */
async function checkIfVotingChannelIsForum(guildId) {
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

    const adminChannel = await client.channels.fetch(config.admin_channel_id);
    if (!adminChannel) {
      console.log('Admin channel not found:', config.admin_channel_id);
      return null;
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
      existingPanel = pinnedMessages.find(msg =>
        msg.author.id === client.user.id &&
        msg.embeds.length > 0 &&
        msg.embeds[0].title &&
        msg.embeds[0].title.includes('Admin Control Panel')
      );
    } catch (error) {
      console.warn('Error fetching pinned messages:', error.message);
    }

    // If not found in pinned messages, search recent messages as fallback
    if (!existingPanel) {
      try {
        const recentMessages = await adminChannel.messages.fetch({ limit: 50 });
        existingPanel = recentMessages.find(msg =>
          msg.author.id === client.user.id &&
          msg.embeds.length > 0 &&
          msg.embeds[0].title &&
          msg.embeds[0].title.includes('Admin Control Panel')
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
          components: components
        });
        console.log('🔧 Updated pinned admin control panel');
        return existingPanel;
      } catch (error) {
        console.warn('Could not update existing admin panel:', error.message);
        // Try to delete and recreate
        try {
          await existingPanel.delete();
        } catch (deleteError) {
          console.warn('Could not delete existing admin panel:', deleteError.message);
        }
      }
    }

    // Create new pinned panel
    const controlPanel = await adminChannel.send({
      embeds: [embed],
      components: components
    });

    try {
      await controlPanel.pin();
      console.log('🔧 Created and pinned admin control panel');
    } catch (pinError) {
      console.warn('Could not pin admin control panel:', pinError.message);
      console.log('🔧 Created admin control panel (not pinned)');
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

  try {
    const database = require('../database');
    const config = await database.getGuildConfig(interaction.guild.id);

    if (!config) {
      await interaction.editReply({
        content: '❌ No guild configuration found. Please run `/movie-configure` first.'
      });
      return;
    }

    let adminSynced = 0;
    let votingSynced = 0;
    const errors = [];

    // Sync admin channel if configured
    if (config.admin_channel_id) {
      try {
        const adminMirror = require('./admin-mirror');
        const adminResult = await adminMirror.syncAdminChannel(interaction.client, interaction.guild.id);

        if (adminResult.error) {
          errors.push(`Admin channel: ${adminResult.error}`);
        } else {
          adminSynced = adminResult.synced;
        }
      } catch (error) {
        errors.push(`Admin channel: ${error.message}`);
      }
    }

    // Sync voting channel if configured
    if (config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('./forum-channels');

          if (forumChannels.isForumChannel(votingChannel)) {
            // For forum channels, we don't clear messages - each movie has its own post
            console.log(`📋 Syncing forum channel: ${votingChannel.name}`);
            // Forum sync will be handled by recreating/updating forum posts below
          } else {
            // Clear existing movie messages in text voting channel (preserve quick action)
            console.log(`📋 Clearing messages in text channel: ${votingChannel.name}`);
            const messages = await votingChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);

            for (const [messageId, message] of botMessages) {
              try {
                // Skip quick action messages
                const isQuickAction = message.embeds.length > 0 &&
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

          // Get all active movies and recreate them (excluding carryover movies)
          const database = require('../database');
          const movies = await database.getMoviesByStatusExcludingCarryover(interaction.guild.id, 'pending', 50);
          const plannedMovies = await database.getMoviesByStatusExcludingCarryover(interaction.guild.id, 'planned', 50);
          const scheduledMovies = await database.getMoviesByStatusExcludingCarryover(interaction.guild.id, 'scheduled', 50);

          const allMovies = [...movies, ...plannedMovies, ...scheduledMovies];

          for (const movie of allMovies) {
            try {
              // Skip movies with purged message IDs - they need proper recreation
              if (movie.message_id && movie.message_id.startsWith('purged_')) {
                console.log(`⏭️ Skipping purged movie for voting sync: ${movie.title}`);
                continue;
              }

              if (forumChannels.isForumChannel(votingChannel)) {
                // For forum channels, create/update forum posts
                await syncForumMoviePost(votingChannel, movie);
              } else {
                // For text channels, use existing cleanup logic
                const cleanup = require('./cleanup');
                await cleanup.recreateMoviePost(votingChannel, movie);
              }
              votingSynced++;
            } catch (error) {
              console.warn(`Failed to recreate voting post for ${movie.title}:`, error.message);
            }
          }

          // Ensure recommendation post/action for the channel
          if (forumChannels.isTextChannel(votingChannel)) {
            // Text channels get quick action at bottom
            const cleanup = require('./cleanup');
            await cleanup.ensureQuickActionAtBottom(votingChannel);
          } else if (forumChannels.isForumChannel(votingChannel)) {
            // Forum channels get recommendation post
            const activeSession = await database.getActiveVotingSession(interaction.guild.id);
            await forumChannels.ensureRecommendationPost(votingChannel, activeSession);
          }
        } else {
          errors.push('Voting channel not found');
        }
      } catch (error) {
        errors.push(`Voting channel: ${error.message}`);
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
        content: `⚠️ Sync completed with errors:\n${errors.join('\n')}\n\nSynced: ${successParts.join(', ')}`
      });
    } else if (successParts.length > 0) {
      await interaction.editReply({
        content: `✅ Successfully synced ${successParts.join(' and ')}.`
      });
    } else {
      await interaction.editReply({
        content: '✅ Sync completed. No movies found to sync.'
      });
    }

  } catch (error) {
    console.error('Error syncing channels:', error);
    await interaction.editReply({
      content: '❌ An error occurred while syncing the channels.'
    });
  }
}

/**
 * Handle purge queue action with confirmation
 */
async function handlePurgeQueue(interaction) {
  // Create confirmation buttons
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ Confirm Queue Purge')
    .setDescription('This will **permanently delete** all movie posts and threads from both channels while preserving movie records in the database.')
    .setColor(0xed4245)
    .addFields(
      { name: '🗑️ What will be deleted', value: '• All movie posts in voting channel\n• All movie posts in admin channel\n• All discussion threads\n• All votes', inline: false },
      { name: '💾 What will be preserved', value: '• Movie records in database\n• Watched movies\n• Banned movies', inline: false }
    )
    .setFooter({ text: 'This action cannot be undone!' });

  const confirmRow = new ActionRowBuilder()
    .addComponents(
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
    flags: MessageFlags.Ephemeral
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
        content: '❌ **Bot not configured**\n\nPlease use `/movie-configure` to set up the bot before using purge functions.',
        embeds: [],
        components: []
      });
      return;
    }

    await interaction.update({
      content: '🗑️ Purging queue...',
      embeds: [],
      components: []
    });

    // Use the same cleanup function as /movie-cleanup purge but don't let it reply
    const cleanup = require('./cleanup');

    // Get channels
    const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
    const adminChannel = config.admin_channel_id ? await interaction.client.channels.fetch(config.admin_channel_id) : null;

    // Perform the purge manually
    let purgedCount = 0;
    let threadsDeleted = 0;

    if (votingChannel) {
      const movies = await database.getMoviesByGuild(interaction.guild.id);

      for (const movie of movies) {
        try {
          // Delete threads
          const threads = await votingChannel.threads.fetchActive();
          for (const [threadId, thread] of threads.threads) {
            if (thread.name.includes(movie.title)) {
              await thread.delete();
              threadsDeleted++;
            }
          }

          // Delete votes and movie from database
          await database.pool.execute('DELETE FROM votes WHERE message_id = ?', [movie.message_id]);
          await database.pool.execute('DELETE FROM movies WHERE message_id = ?', [movie.message_id]);
          purgedCount++;
        } catch (error) {
          console.warn(`Error purging movie ${movie.title}:`, error.message);
        }
      }

      // Clear channel messages
      const messages = await votingChannel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);

      for (const [messageId, message] of botMessages) {
        try {
          await message.delete();
        } catch (error) {
          console.warn(`Failed to delete message ${messageId}:`, error.message);
        }
      }

      // Add appropriate message based on session state
      await cleanup.ensureQuickActionAtBottom(votingChannel);
    }

    if (adminChannel) {
      // Clear admin channel messages
      const messages = await adminChannel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);

      for (const [messageId, message] of botMessages) {
        try {
          const isControlPanel = message.embeds.length > 0 &&
                                message.embeds[0].title &&
                                message.embeds[0].title.includes('Admin Control Panel');

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

    await interaction.followUp({
      content: `✅ **Queue purged successfully!**\n\n🗑️ Deleted: ${purgedCount} movies, ${threadsDeleted} threads\n📋 Channels cleared and reset`,
      flags: MessageFlags.Ephemeral
    });

    console.log(`🗑️ Admin purge executed by ${interaction.user.tag} in guild ${interaction.guild.name}`);

  } catch (error) {
    console.error('Error executing purge:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while purging the queue.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.followUp({
        content: '❌ An error occurred while purging the queue.',
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
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
        content: '✅ No movies are currently banned in this guild.'
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
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error fetching banned movies:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching banned movies.'
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
      components: components
    });

    console.log('🔧 Refreshed admin control panel');
  } catch (error) {
    console.error('Error refreshing admin panel:', error);
    await interaction.reply({
      content: '❌ An error occurred while refreshing the control panel.',
      flags: MessageFlags.Ephemeral
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
      const database = require('../database');
      const voteCounts = await database.getVoteCounts(movie.message_id);
      const movieEmbed = embeds.createMovieEmbed(movie, null, voteCounts);
      const movieComponents = components.createVotingButtons(movie.message_id);

      // Update the starter message
      const starterMessage = await existingThread.fetchStarterMessage();
      if (starterMessage) {
        await starterMessage.edit({
          embeds: [movieEmbed],
          components: movieComponents
        });

        // Update forum post title with vote counts (only for major status changes)
        await forumChannels.updateForumPostTitle(existingThread, movie.title, movie.status, voteCounts.up, voteCounts.down);

        console.log(`📝 Updated existing forum post: ${movie.title}`);
      }
    } else {
      // Create new forum post
      const movieEmbed = embeds.createMovieEmbed(movie);
      const movieComponents = components.createVotingButtons(movie.message_id);

      const result = await forumChannels.createForumMoviePost(
        forumChannel,
        { title: movie.title, embed: movieEmbed },
        movieComponents
      );

      const { thread, message } = result;

      // Update database with new thread ID
      const database = require('../database');
      await database.updateMovieThreadId(movie.message_id, thread.id);

      console.log(`📝 Created new forum post: ${movie.title} (Thread: ${thread.id})`);
    }

  } catch (error) {
    console.error(`Error syncing forum movie post for ${movie.title}:`, error);
    throw error;
  }
}

/**
 * Populate forum channel with existing active movies
 */
async function populateForumChannel(client, guildId) {
  try {
    const database = require('../database');
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

    // Get all active movies that should be in the forum
    const activeSession = await database.getActiveVotingSession(guildId);
    if (!activeSession) {
      return { populated: 0, error: 'No active voting session' };
    }

    const movies = await database.getMoviesByStatusExcludingCarryover(guildId, 'pending', 50);
    let populatedCount = 0;

    console.log(`📋 Found ${movies.length} active movies to populate in forum channel`);

    for (const movie of movies) {
      try {
        // Check if forum post already exists
        let existingThread = null;
        if (movie.thread_id) {
          try {
            existingThread = await votingChannel.threads.fetch(movie.thread_id);
          } catch (error) {
            console.log(`Forum thread ${movie.thread_id} not found for ${movie.title}`);
          }
        }

        if (!existingThread) {
          // Create new forum post for this movie
          await syncForumMoviePost(votingChannel, movie);
          populatedCount++;
          console.log(`📝 Created forum post for: ${movie.title}`);
        } else {
          console.log(`📝 Forum post already exists for: ${movie.title}`);
        }

      } catch (error) {
        console.warn(`Failed to populate forum post for ${movie.title}:`, error.message);
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
  ensureAdminControlPanel,
  handleSyncChannel,
  handlePurgeQueue,
  executePurgeQueue,
  handleGuildStats,
  handleBannedMoviesList,
  handleRefreshPanel,
  syncForumMoviePost,
  populateForumChannel
};
