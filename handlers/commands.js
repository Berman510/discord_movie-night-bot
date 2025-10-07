/**
 * Command Handlers Module
 * Handles all slash command processing
 */

const {
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const database = require('../database');
const _sessions = require('../services/sessions');
const guidedSetup = require('../services/guided-setup');
const helpService = require('../services/help');
const logger = require('../utils/logger');

async function handleSlashCommand(interaction) {
  const commandName = interaction.commandName;

  try {
    switch (commandName) {
      case 'watchparty':
        await handleWatchParty(interaction);
        break;

      case 'watchparty-queue':
        await handleWatchPartyQueue(interaction);
        break;

      case 'watchparty-configure':
        await handleWatchPartyConfigure(interaction);
        break;

      case 'watchparty-setup':
        await handleWatchPartySetup(interaction);
        break;

      case 'watchparty-watched':
        await handleWatchPartyWatched(interaction);
        break;

      case 'watchparty-skip':
        await handleWatchPartySkip(interaction);
        break;

      case 'watchparty-plan':
        await handleWatchPartyPlan(interaction);
        break;

      case 'watchparty-debug-config':
        await handleDebugConfig(interaction);
        break;

      case 'help':
        await handleHelp(interaction);
        break;

      case 'rescue77':
        await handleRescueSession77(interaction);
        break;

      default:
        await interaction.reply({
          content: `❌ Unknown command: ${commandName}`,
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (error) {
    logger.error(`Error handling command ${commandName}:`, error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: '❌ An error occurred while processing the command.',
          flags: MessageFlags.Ephemeral,
        })
        .catch((err) => logger.error('Failed to send error reply:', err));
    }
  }
}

// Content recommendation command handler
async function handleWatchParty(interaction) {
  // First check if bot is configured
  const configCheck = require('../utils/config-check');
  const configStatus = await configCheck.checkConfiguration(interaction.guild.id);

  if (!configStatus.isConfigured) {
    await configCheck.sendConfigurationError(interaction, configStatus);
    return;
  }

  // Check if there's an active voting session
  const database = require('../database');
  const activeSession = await database.getActiveVotingSession(interaction.guild.id);

  if (!activeSession) {
    await interaction.reply({
      content:
        '❌ **No active voting session**\n\nContent recommendations are only available during active voting sessions. An admin needs to use the "Plan Next Session" button in the admin channel to start a new voting session.\n\n💡 **Tip:** Use `/watchparty-setup` for easy bot configuration.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Show the content recommendation modal (movies and TV shows)
  const modal = new ModalBuilder().setCustomId('mn:modal').setTitle('🎬 Recommend Content'); // Updated to be more inclusive

  const titleInput = new TextInputBuilder()
    .setCustomId('mn:title')
    .setLabel('Movie or TV Show Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., The Matrix, Breaking Bad, The Office')
    .setRequired(true);

  const whereInput = new TextInputBuilder()
    .setCustomId('mn:where')
    .setLabel('Where to Watch')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Netflix, Hulu, Prime Video, etc.')
    .setRequired(true);

  const titleRow = new ActionRowBuilder().addComponents(titleInput);
  const whereRow = new ActionRowBuilder().addComponents(whereInput);

  modal.addComponents(titleRow, whereRow);

  await interaction.showModal(modal);
}

async function handleWatchPartyQueue(interaction) {
  try {
    // Check for active voting session
    const activeSession = await database.getActiveVotingSession(interaction.guild.id);

    if (!activeSession) {
      // Check if there are carryover movies waiting for next session
      const carryoverMovies = await database.getNextSessionMovies(interaction.guild.id);
      if (carryoverMovies.length > 0) {
        const embed = new EmbedBuilder()
          .setTitle('📋 Movies Waiting for Next Session')
          .setDescription(
            `${carryoverMovies.length} movies are waiting to be carried over to the next voting session`
          )
          .setColor(0xffa500);

        carryoverMovies.forEach((movie, index) => {
          embed.addFields({
            name: `${index + 1}. ${movie.title}`,
            value: `📺 ${movie.where_to_watch} • 👤 <@${movie.recommended_by}>`,
            inline: false,
          });
        });

        embed.setFooter({
          text: 'These movies will automatically appear when the next session starts!',
        });

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        content:
          '📋 **No active voting session**\n\nThere is currently no content in the queue. An admin needs to use the "Plan Next Session" button in the admin channel to start a new voting session before content can be recommended.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const movies = await database.getMoviesByStatus(interaction.guild.id, 'pending', 10);

    if (!movies || movies.length === 0) {
      await interaction.reply({
        content: `📋 **${activeSession.name}** - No content yet!\n\nUse \`/watchparty\` to add some recommendations for this voting session.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if we're in a forum channel to adjust description
    const forumChannels = require('../services/forum-channels');
    const isForumChannel = forumChannels.isForumChannel(interaction.channel);
    const channelTypeNote = isForumChannel ? ' (Forum posts)' : '';

    const embed = new EmbedBuilder()
      .setTitle(`🍿 ${activeSession.name}`)
      .setDescription(
        `Showing ${movies.length} content recommendations for this voting session${channelTypeNote}`
      )
      .setColor(0x5865f2);

    if (activeSession.scheduled_date) {
      embed.addFields({
        name: '📅 Scheduled Date',
        value: new Date(activeSession.scheduled_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        inline: false,
      });
    }

    movies.forEach((movie, index) => {
      embed.addFields({
        name: `${index + 1}. ${movie.title}`,
        value: `📺 ${movie.where_to_watch} • 👤 <@${movie.recommended_by}>`,
        inline: false,
      });
    });

    embed.setFooter({ text: 'Vote on content in the voting channel!' });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error('Error fetching movie queue:', error);
    await interaction.reply({
      content: '❌ Error fetching movie queue.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleMovieHelp(interaction) {
  const { embeds } = require('../utils');
  const helpEmbed = embeds.createHelpEmbed();

  await interaction.reply({
    embeds: [helpEmbed],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleMovieConfigure(interaction) {
  const { permissions } = require('../services');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content:
        '❌ You need Administrator permissions or a configured admin role to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - configuration features require database connection.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const action = interaction.options.getString('action');
  const guildId = interaction.guild.id;

  try {
    const { configuration } = require('../services');

    switch (action) {
      case 'set-channel':
        await configuration.configureMovieChannel(interaction, guildId);
        break;
      case 'set-watch-party-channel':
        await configuration.configureWatchPartyChannel(interaction, guildId);
        break;
      case 'set-admin-channel':
        await configuration.configureAdminChannel(interaction, guildId);
        break;
      case 'add-admin-role':
        await configuration.addAdminRole(interaction, guildId);
        break;
      case 'remove-admin-role':
        await configuration.removeAdminRole(interaction, guildId);
        break;
      case 'set-notification-role':
        await configuration.setNotificationRole(interaction, guildId);
        break;
      case 'view-settings':
        await configuration.viewSettings(interaction, guildId);
        break;
      case 'debug':
        await handleDebugConfig(interaction);
        break;
      case 'debug-session':
        await handleDebugSession(interaction);
        break;
      case 'reset':
        await configuration.resetConfiguration(interaction, guildId);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown configuration action.',
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (error) {
    console.error('Error handling movie configure:', error);
    await interaction.reply({
      content: '❌ Error processing configuration command.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleMovieCleanup(interaction) {
  const { cleanup } = require('../services');
  await cleanup.handleMovieCleanup(interaction);
}

async function handleMovieStats(interaction) {
  const { stats } = require('../services');
  await stats.handleMovieStats(interaction);
}

async function handleMovieSetup(interaction) {
  // Check if user has permission to configure
  const { PermissionFlagsBits } = require('discord.js');

  if (
    !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
    !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    await interaction.reply({
      content:
        '❌ **Permission denied**\n\nYou need Administrator or Manage Server permissions to configure the bot.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await guidedSetup.startGuidedSetup(interaction);
}

async function handleMovieWatched(interaction) {
  const { permissions } = require('../services');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need admin permissions to mark movies as watched.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const movieTitle = interaction.options.getString('title');

  try {
    // Find the movie by title
    const movie = await database.findMovieByTitle(interaction.guild.id, movieTitle);

    if (!movie) {
      await interaction.reply({
        content: `❌ Movie "${movieTitle}" not found in the queue.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Mark as watched
    await database.updateMovieStatus(movie.message_id, 'watched');

    await interaction.reply({
      content: `✅ **${movie.title}** has been marked as watched!`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error marking movie as watched:', error);
    await interaction.reply({
      content: '❌ An error occurred while marking the movie as watched.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleMovieSkip(interaction) {
  const { permissions } = require('../services');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need admin permissions to skip movies.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const movieTitle = interaction.options.getString('title');

  try {
    // Find the movie by title
    const movie = await database.findMovieByTitle(interaction.guild.id, movieTitle);

    if (!movie) {
      await interaction.reply({
        content: `❌ Movie "${movieTitle}" not found in the queue.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Mark as skipped
    await database.updateMovieStatus(movie.message_id, 'skipped');

    await interaction.reply({
      content: `⏭️ **${movie.title}** has been skipped.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error skipping movie:', error);
    await interaction.reply({
      content: '❌ An error occurred while skipping the movie.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleMoviePlan(interaction) {
  const { permissions } = require('../services');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need admin permissions to plan movies.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const movieTitle = interaction.options.getString('title');

  try {
    // Find the movie by title
    const movie = await database.findMovieByTitle(interaction.guild.id, movieTitle);

    if (!movie) {
      await interaction.reply({
        content: `❌ Movie "${movieTitle}" not found in the queue.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Mark as planned
    await database.updateMovieStatus(movie.message_id, 'planned');

    await interaction.reply({
      content: `📌 **${movie.title}** has been planned for later. Use \`/movie-session\` to schedule it!`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error planning movie:', error);
    await interaction.reply({
      content: '❌ An error occurred while planning the movie.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Handle debug config command
 */
async function handleDebugConfig(interaction) {
  try {
    const database = require('../database');
    const config = await database.getGuildConfig(interaction.guild.id);

    let configInfo = `**Guild ID**: ${interaction.guild.id}\n`;

    if (!config) {
      configInfo += `**Status**: ❌ No configuration found\n`;
    } else {
      configInfo += `**Movie Channel ID**: ${config.movie_channel_id || 'Not set'}\n`;
      configInfo += `**Admin Channel ID**: ${config.admin_channel_id || 'Not set'}\n`;
      configInfo += `**Timezone**: ${config.timezone || 'Not set'}\n`;

      if (config.movie_channel_id) {
        try {
          const channel = await interaction.client.channels.fetch(config.movie_channel_id);
          const forumChannels = require('../services/forum-channels');
          configInfo += `**Movie Channel**: ${channel.name} (${channel.type})\n`;
          configInfo += `**Is Forum**: ${forumChannels.isForumChannel(channel) ? '✅ Yes' : '❌ No'}\n`;
          configInfo += `**Is Text**: ${forumChannels.isTextChannel(channel) ? '✅ Yes' : '❌ No'}\n`;
        } catch (error) {
          configInfo += `**Movie Channel**: ❌ Channel not found (${error.message})\n`;
        }
      }
    }

    await interaction.reply({
      content: `🔍 **Debug Configuration**\n\n${configInfo}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error in debug config:', error);
    await interaction.reply({
      content: `❌ Error getting debug info: ${error.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Handle debug session command
 */
async function handleDebugSession(interaction) {
  try {
    const database = require('../database');
    const activeSession = await database.getActiveVotingSession(interaction.guild.id);

    let sessionInfo = `**Guild ID**: ${interaction.guild.id}\n`;

    if (!activeSession) {
      sessionInfo += `**Active Session**: ❌ No active voting session found\n`;
      sessionInfo += `**Status**: Movie recommendations require an active voting session\n`;
      sessionInfo += `**Solution**: Use "Plan Next Session" button in admin channel\n`;
    } else {
      sessionInfo += `**Active Session**: ✅ Session ${activeSession.id}\n`;
      sessionInfo += `**Session Name**: ${activeSession.name || 'Unnamed'}\n`;
      sessionInfo += `**Status**: ${activeSession.status}\n`;
      sessionInfo += `**Created**: ${new Date(activeSession.created_at).toLocaleString()}\n`;

      if (activeSession.scheduled_date) {
        sessionInfo += `**Scheduled**: ${new Date(activeSession.scheduled_date).toLocaleString()}\n`;
      }

      if (activeSession.voting_end_time) {
        sessionInfo += `**Voting Ends**: ${new Date(activeSession.voting_end_time).toLocaleString()}\n`;
      }
    }

    await interaction.reply({
      content: `🔍 **Debug Session Information**\n\n${sessionInfo}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error in debug session:', error);
    await interaction.reply({
      content: `❌ Error getting session debug info: ${error.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Handle help command
 */
async function handleHelp(interaction) {
  await helpService.handleHelp(interaction);
}

/**
 * Emergency rescue command for session 77 - Migration 36 failed
 */
async function handleRescueSession77(interaction) {
  try {
    // Only allow in the specific guild
    if (interaction.guild.id !== '991929035875688499') {
      return await interaction.reply({
        content: '❌ This command is only available in the specific guild.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Check admin permissions
    const { PermissionFlagsBits } = require('discord.js');
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const GUILD_ID = '991929035875688499';
    const SESSION_ID = 77;

    let report = '🚨 **Emergency Session 77 Rescue Operation**\n\n';

    // Step 1: Check what tables exist
    const [tables] = await database.pool.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('watch_sessions', 'movie_sessions')
    `);

    const hasWatchSessions = tables.some((t) => t.TABLE_NAME === 'watch_sessions');
    const hasMovieSessions = tables.some((t) => t.TABLE_NAME === 'movie_sessions');

    report += `**Step 1: Table Check**\n`;
    report += `• movie_sessions exists: ${hasMovieSessions}\n`;
    report += `• watch_sessions exists: ${hasWatchSessions}\n\n`;

    if (!hasMovieSessions) {
      report += '❌ movie_sessions table not found - session may already be migrated';
      return await interaction.editReply(report);
    }

    // Step 2: Find session 77 in movie_sessions
    const [movieSessions] = await database.pool.execute(
      'SELECT * FROM movie_sessions WHERE id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    if (movieSessions.length === 0) {
      report += '❌ Session 77 not found in movie_sessions table';
      return await interaction.editReply(report);
    }

    const session = movieSessions[0];
    report += `**Step 2: Found Session 77 in movie_sessions**\n`;
    report += `• Title: ${session.title}\n`;
    report += `• Status: ${session.status}\n`;
    report += `• Created: ${session.created_at}\n\n`;

    // Step 3: Check if it already exists in watch_sessions
    const [watchSessions] = await database.pool.execute(
      'SELECT * FROM watch_sessions WHERE id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    if (watchSessions.length > 0) {
      report += '✅ Session 77 already exists in watch_sessions - no copy needed\n\n';
    } else {
      report += '**Step 3: Copying session to watch_sessions**\n';

      // Copy the session
      const columns = Object.keys(session).join(', ');
      const placeholders = Object.keys(session)
        .map(() => '?')
        .join(', ');
      const values = Object.values(session);

      await database.pool.execute(
        `INSERT INTO watch_sessions (${columns}) VALUES (${placeholders})`,
        values
      );

      report += '✅ Session 77 copied to watch_sessions\n\n';
    }

    // Step 4: Check movies
    const [movies] = await database.pool.execute(
      'SELECT id, title, session_id FROM movies WHERE session_id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    report += `**Step 4: Movies Check**\n`;
    report += `• Found ${movies.length} movies referencing session 77\n\n`;

    // Step 5: Verify rescue
    const [verifySession] = await database.pool.execute(
      'SELECT * FROM watch_sessions WHERE id = ? AND guild_id = ?',
      [SESSION_ID, GUILD_ID]
    );

    if (verifySession.length > 0) {
      report += '✅ **SUCCESS**: Session 77 is now in watch_sessions table\n';
      report += '✅ Bot and dashboard should now be able to find it\n\n';
      report += '**Next Steps:**\n';
      report += '• Refresh your dashboard page\n';
      report += '• Try voting on movies in Discord\n';
      report += '• Check if admin panel shows correct session';
    } else {
      report += '❌ **FAILED**: Session 77 still not in watch_sessions';
    }

    await interaction.editReply(report);
  } catch (error) {
    logger.error('Error in rescue77 command:', error);
    const errorMsg = `❌ Rescue operation failed: ${error.message}`;

    if (interaction.deferred) {
      await interaction.editReply(errorMsg);
    } else {
      await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
    }
  }
}

// Create aliases for renamed functions to maintain compatibility
const handleWatchPartyConfigure = handleMovieConfigure;
const handleWatchPartySetup = handleMovieSetup;
const handleWatchPartyWatched = handleMovieWatched;
const handleWatchPartySkip = handleMovieSkip;
const handleWatchPartyPlan = handleMoviePlan;

module.exports = {
  handleSlashCommand,
  // New watch party function names
  handleWatchParty,
  handleWatchPartyQueue,
  handleWatchPartyConfigure,
  handleWatchPartySetup,
  handleWatchPartyWatched,
  handleWatchPartySkip,
  handleWatchPartyPlan,
  // Legacy function names for backward compatibility
  handleMovieNight: handleWatchParty,
  handleMovieQueue: handleWatchPartyQueue,
  handleMovieHelp,
  handleMovieConfigure,
  handleMovieCleanup,
  handleMovieStats,
  handleMovieSetup,
  handleMovieWatched,
  handleMovieSkip,
  handleMoviePlan,
  handleRescueSession77,
  handleDebugConfig,
  handleHelp,
};
