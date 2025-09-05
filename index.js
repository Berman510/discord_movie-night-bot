/**
 * Movie Night Bot — Main Entry Point
 * Version: 1.9.0
 * 
 * A modular Discord bot for organizing movie nights with voting, sessions, and IMDb integration
 */

require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, InteractionType, MessageFlags, EmbedBuilder } = require('discord.js');
const database = require('./database');
const { commands, registerCommands } = require('./commands');
const { handleInteraction } = require('./handlers');
const { sessions } = require('./services');
const { embeds } = require('./utils');
const { startPayloadCleanup, BOT_VERSION } = require('./utils/constants');

// Environment variables
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, OMDB_API_KEY } = process.env;

// Validate required environment variables
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

if (!OMDB_API_KEY) {
  console.warn('⚠️ OMDB_API_KEY not set - IMDb features will be disabled');
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// Initialize REST client for command registration
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Bot ready event
client.once('clientReady', async () => {
  console.log(`🎬 Movie Night Bot v${BOT_VERSION} is ready!`);
  console.log(`📊 Logged in as ${client.user.tag}`);
  console.log(`🏠 Serving ${client.guilds.cache.size} guilds`);
  
  // Connect to database
  await database.connect();
  
  // Start cleanup processes
  startPayloadCleanup();
  
  // Register commands
  await registerCommands(rest, CLIENT_ID, GUILD_ID);
  
  console.log('✅ Bot initialization complete!');
});

// Handle all interactions
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.type === InteractionType.ApplicationCommand) {
      await handleSlashCommand(interaction);
      return;
    }

    // Handle other interactions (buttons, modals, selects)
    await handleInteraction(interaction);

  } catch (error) {
    console.error('Error handling interaction:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
});

// Handle slash commands
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'movie-night':
        await handleMovieNight(interaction);
        break;
      
      case 'movie-queue':
        await handleMovieQueue(interaction);
        break;
      
      case 'movie-help':
        await handleMovieHelp(interaction);
        break;
      
      case 'movie-session':
        await sessions.handleMovieSession(interaction);
        break;
      
      case 'movie-configure':
        await handleMovieConfigure(interaction);
        break;
      
      case 'movie-cleanup':
        await handleMovieCleanup(interaction);
        break;
      
      case 'movie-stats':
        await handleMovieStats(interaction);
        break;
      
      default:
        await interaction.reply({
          content: `❌ Unknown command: ${commandName}`,
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error(`Error handling command ${commandName}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the command.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

// Placeholder command handlers - these will be implemented in the full refactor
async function handleMovieNight(interaction) {
  const title = interaction.options.getString('title');
  const where = interaction.options.getString('where');

  if (!title || !where) {
    await interaction.reply({
      content: '❌ Please provide both movie title and where to watch it.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    // Create movie recommendation
    const movieData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      title: title,
      whereToWatch: where,
      recommendedBy: interaction.user.id,
      status: 'pending'
    };

    // Add to database and create message
    const messageId = await createMovieRecommendation(interaction, movieData);

    if (messageId) {
      await interaction.reply({
        content: `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue for voting.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to create movie recommendation.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Error handling movie night:', error);
    await interaction.reply({
      content: '❌ Failed to create movie recommendation.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMovieQueue(interaction) {
  try {
    const movies = await database.getMoviesByStatus(interaction.guild.id, 'pending', 10);

    if (!movies || movies.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🍿 Movie Queue')
        .setDescription('No movies in the queue yet!\n\nUse `/movie-night` to add your first recommendation.')
        .setColor(0x5865f2);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }


    const embed = new EmbedBuilder()
      .setTitle('🍿 Current Movie Queue')
      .setDescription(`${movies.length} movie${movies.length === 1 ? '' : 's'} waiting for votes:`)
      .setColor(0x5865f2);

    for (const movie of movies) {
      const voteScore = (movie.upvotes || 0) - (movie.downvotes || 0);
      const voteText = voteScore > 0 ? `+${voteScore}` : voteScore.toString();

      embed.addFields({
        name: `🍿 ${movie.title}`,
        value: `📺 ${movie.where_to_watch}\n👤 <@${movie.recommended_by}>\n🗳️ Score: ${voteText} (${movie.upvotes || 0}👍 ${movie.downvotes || 0}👎)`,
        inline: true
      });
    }

    embed.setFooter({
      text: 'Vote on movies in the channel to help decide what to watch!'
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error showing movie queue:', error);
    await interaction.reply({
      content: '❌ Failed to retrieve movie queue.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMovieHelp(interaction) {
  const helpEmbed = embeds.createHelpEmbed();
  await interaction.reply({
    embeds: [helpEmbed],
    flags: MessageFlags.Ephemeral
  });
}

async function handleMovieConfigure(interaction) {
  const { permissions } = require('./services');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this command.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - configuration features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const action = interaction.options.getString('action');
  const guildId = interaction.guild.id;

  try {
    switch (action) {
      case 'set-channel':
        await configureMovieChannel(interaction, guildId);
        break;

      case 'add-admin-role':
        await addAdminRole(interaction, guildId);
        break;
      case 'remove-admin-role':
        await removeAdminRole(interaction, guildId);
        break;
      case 'set-notification-role':
        await setNotificationRole(interaction, guildId);
        break;
      case 'view-settings':
        await viewSettings(interaction, guildId);
        break;
      case 'reset':
        await resetConfiguration(interaction, guildId);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown configuration action.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Configuration error:', error);
    await interaction.reply({
      content: '❌ Configuration failed. Check console for details.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMovieCleanup(interaction) {
  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - configuration features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if user has proper permissions
  const { permissions } = require('./services');
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

  await interaction.reply({
    content: '🧹 Starting channel cleanup... This may take a moment.',
    flags: MessageFlags.Ephemeral
  });

  try {
    const channel = interaction.channel;
    const botId = interaction.client.user.id;
    let updatedCount = 0;
    let processedCount = 0;

    // Fetch recent messages (last 100)
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(msg => msg.author.id === botId);

    for (const [, message] of botMessages) {
      processedCount++;

      // Skip if message already has the current format
      if (isCurrentFormat(message)) {
        continue;
      }

      // Try to update the message
      const updated = await updateMessageToCurrentFormat(message);
      if (updated) {
        updatedCount++;
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const summary = [`✅ Cleanup complete! Processed ${processedCount} messages, updated ${updatedCount} to current format.`];

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

async function handleMovieStats(interaction) {
  const type = interaction.options.getString('type') || 'overview';
  const user = interaction.options.getUser('user');

  try {
    switch (type) {
      case 'overview':
        await showOverviewStats(interaction);
        break;
      case 'top-movies':
        await showTopMovies(interaction);
        break;
      case 'user-stats':
        await showUserStats(interaction, user);
        break;
      case 'monthly':
        await showMonthlyStats(interaction);
        break;
      default:
        await showOverviewStats(interaction);
    }
  } catch (error) {
    console.error('Error showing movie stats:', error);
    await interaction.reply({
      content: '❌ Failed to retrieve statistics.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');

  if (database.isConnected) {
    await database.close();
  }

  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');

  if (database.isConnected) {
    await database.close();
  }

  client.destroy();
  process.exit(0);
});

// Helper functions for cleanup
function isCurrentFormat(message) {
  // Check if message has the current button format
  if (message.embeds.length === 0) return false;

  const embed = message.embeds[0];

  // Check if it's a movie recommendation embed
  if (!embed.title || !embed.title.includes('🍿')) return false;

  // Check if it has current button format
  if (message.components.length === 0) return false;

  const hasVoteButtons = message.components.some(row =>
    row.components.some(component =>
      component.customId && component.customId.includes('mn:up:')
    )
  );

  return hasVoteButtons;
}

async function updateMessageToCurrentFormat(message) {
  try {
    // Get movie data from database
    const movie = await database.getMovieByMessageId(message.id);
    if (!movie) return false;

    // Create updated embed and components
    const { embeds, components } = require('./utils');
    const embed = embeds.createMovieEmbed(movie);
    const movieComponents = components.createStatusButtons(message.id, movie.status);

    // Update the message
    await message.edit({
      embeds: [embed],
      components: movieComponents
    });

    return true;
  } catch (error) {
    console.warn(`Failed to update message ${message.id}:`, error.message);
    return false;
  }
}

// Configuration helper functions
async function configureMovieChannel(interaction, guildId) {
  const channel = interaction.options.getChannel('channel') || interaction.channel;

  const success = await database.setMovieChannel(guildId, channel.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Movie channel set to ${channel}**\n\nCleanup commands will only work in this channel for safety.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set movie channel.',
      flags: MessageFlags.Ephemeral
    });
  }
}



async function addAdminRole(interaction, guildId) {
  const role = interaction.options.getRole('role');
  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to add as admin.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.addAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Admin role added!**\n\nUsers with the ${role} role can now use admin commands.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to add admin role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function removeAdminRole(interaction, guildId) {
  const role = interaction.options.getRole('role');
  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to remove from admin.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.removeAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Admin role removed!**\n\nUsers with the ${role} role can no longer use admin commands.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to remove admin role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function viewSettings(interaction, guildId) {
  const config = await database.getGuildConfig(guildId);

  if (!config) {
    await interaction.reply({
      content: '❌ Failed to retrieve guild configuration.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const hasAdminRoles = config.admin_roles && config.admin_roles.length > 0;

  const { embeds } = require('./utils');
  const embed = embeds.createSuccessEmbed(
    '🎬 Movie Bot Configuration',
    `**Movie Channel:** ${config.movie_channel_id ? `<#${config.movie_channel_id}>` : 'Not configured - bot works in any channel'}\n\n` +
    `**Admin Roles:** ${hasAdminRoles ? config.admin_roles.map(id => `<@&${id}>`).join(', ') : 'None - only Discord Administrators can use admin commands'}\n\n` +
    `**Notification Role:** ${config.notification_role_id ? `<@&${config.notification_role_id}>` : 'Not configured - no role will be pinged for events'}\n\n` +
    `**Timezone Handling:** Users select timezone when creating sessions (more flexible!)`
  );

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function setNotificationRole(interaction, guildId) {
  const role = interaction.options.getRole('role');

  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to set as the notification role.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.setNotificationRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Notification role set to ${role}**\n\nThis role will be pinged when movie night events are created.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set notification role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function resetConfiguration(interaction, guildId) {
  const success = await database.resetGuildConfig(guildId);
  if (success) {
    await interaction.reply({
      content: '✅ **Configuration reset!**\n\nAll settings have been reset to defaults.',
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to reset configuration.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Statistics helper functions
async function showOverviewStats(interaction) {
  const guildId = interaction.guild.id;
  const stats = await database.getMovieStats(guildId);

  const embed = new EmbedBuilder()
    .setTitle('📊 Movie Night Statistics')
    .setDescription('Overview of movie recommendations and activity')
    .setColor(0x5865f2)
    .addFields(
      { name: '🍿 Total Movies', value: stats.totalMovies.toString(), inline: true },
      { name: '✅ Watched', value: stats.watchedMovies.toString(), inline: true },
      { name: '📌 Planned', value: stats.plannedMovies.toString(), inline: true },
      { name: '🗳️ Pending Votes', value: stats.pendingMovies.toString(), inline: true },
      { name: '👥 Active Users', value: stats.activeUsers.toString(), inline: true },
      { name: '🎪 Sessions', value: stats.totalSessions.toString(), inline: true }
    )
    .setFooter({ text: `Stats for ${interaction.guild.name}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function showTopMovies(interaction) {
  const topMovies = await database.getTopVotedMovies(interaction.guild.id, 10);

  if (!topMovies || topMovies.length === 0) {
    await interaction.reply({
      content: '📊 No movies with votes found yet!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Top Voted Movies')
    .setDescription('Movies ranked by vote score (upvotes - downvotes)')
    .setColor(0xffd700);

  topMovies.forEach((movie, index) => {
    const score = (movie.upvotes || 0) - (movie.downvotes || 0);
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

    embed.addFields({
      name: `${medal} ${movie.title}`,
      value: `📺 ${movie.where_to_watch}\n🗳️ Score: ${score > 0 ? '+' : ''}${score} (${movie.upvotes || 0}👍 ${movie.downvotes || 0}👎)\n👤 <@${movie.recommended_by}>`,
      inline: false
    });
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function showUserStats(interaction, user) {
  const targetUser = user || interaction.user;
  const userStats = await database.getUserStats(interaction.guild.id, targetUser.id);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${targetUser.displayName || targetUser.username}'s Movie Stats`)
    .setDescription('Personal movie recommendation statistics')
    .setColor(0x5865f2)
    .addFields(
      { name: '🍿 Movies Recommended', value: userStats.recommended.toString(), inline: true },
      { name: '👍 Total Upvotes Received', value: userStats.upvotesReceived.toString(), inline: true },
      { name: '👎 Total Downvotes Received', value: userStats.downvotesReceived.toString(), inline: true },
      { name: '🏆 Net Score', value: (userStats.upvotesReceived - userStats.downvotesReceived).toString(), inline: true },
      { name: '✅ Movies Watched', value: userStats.watched.toString(), inline: true },
      { name: '📌 Movies Planned', value: userStats.planned.toString(), inline: true }
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setFooter({ text: `Stats for ${interaction.guild.name}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function showMonthlyStats(interaction) {
  const monthlyStats = await database.getMonthlyStats(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('📅 Monthly Movie Activity')
    .setDescription('Movie recommendations by month')
    .setColor(0x5865f2);

  if (monthlyStats.length === 0) {
    embed.setDescription('No monthly data available yet.');
  } else {
    monthlyStats.forEach(stat => {
      embed.addFields({
        name: stat.month,
        value: `🍿 ${stat.movies} movies\n🎪 ${stat.sessions} sessions`,
        inline: true
      });
    });
  }

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

// Movie recommendation helper function
async function createMovieRecommendation(interaction, movieData) {
  try {
    // Add movie to database
    const success = await database.addMovie(
      movieData.guildId,
      movieData.channelId,
      movieData.title,
      movieData.whereToWatch,
      movieData.recommendedBy
    );

    if (!success) {
      return null;
    }

    // Create embed and components
    const { embeds, components } = require('./utils');
    const movie = {
      title: movieData.title,
      where_to_watch: movieData.whereToWatch,
      recommended_by: movieData.recommendedBy,
      status: 'pending',
      created_at: new Date()
    };

    const embed = embeds.createMovieEmbed(movie);
    const movieComponents = components.createStatusButtons('temp', 'pending');

    // Send message to channel
    const message = await interaction.channel.send({
      embeds: [embed],
      components: movieComponents
    });

    // Update database with message ID
    await database.updateMovieMessageId(movieData.guildId, movieData.title, message.id);

    return message.id;
  } catch (error) {
    console.error('Error creating movie recommendation:', error);
    return null;
  }
}

// Start the bot
client.login(DISCORD_TOKEN);
