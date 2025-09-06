/**
 * Command Handlers Module
 * Handles all slash command processing
 */

const { MessageFlags, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const database = require('../database');
const sessions = require('../services/sessions');

async function handleSlashCommand(interaction) {
  const commandName = interaction.commandName;

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

      case 'movie-watched':
        await handleMovieWatched(interaction);
        break;

      case 'movie-skip':
        await handleMovieSkip(interaction);
        break;

      case 'movie-plan':
        await handleMoviePlan(interaction);
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

// Movie recommendation command handler
async function handleMovieNight(interaction) {
  // Show the movie recommendation modal
  const modal = new ModalBuilder()
    .setCustomId('mn:modal')
    .setTitle('New Movie Recommendation');

  const titleInput = new TextInputBuilder()
    .setCustomId('mn:title')
    .setLabel('Movie Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., The Matrix')
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

async function handleMovieQueue(interaction) {
  try {
    const movies = await database.getMoviesByStatus(interaction.guild.id, 'pending', 10);

    if (!movies || movies.length === 0) {
      await interaction.reply({
        content: '📋 No movies in the queue yet! Use `/movie-night` to add some recommendations.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🍿 Current Movie Queue')
      .setDescription(`Showing ${movies.length} pending recommendations`)
      .setColor(0x5865f2);

    movies.forEach((movie, index) => {
      embed.addFields({
        name: `${index + 1}. ${movie.title}`,
        value: `📺 ${movie.where_to_watch} • 👤 <@${movie.recommended_by}>`,
        inline: false
      });
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error fetching movie queue:', error);
    await interaction.reply({
      content: '❌ Error fetching movie queue.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMovieHelp(interaction) {
  const { embeds } = require('../utils');
  const helpEmbed = embeds.createHelpEmbed();

  await interaction.reply({
    embeds: [helpEmbed],
    flags: MessageFlags.Ephemeral
  });
}

async function handleMovieConfigure(interaction) {
  const { permissions } = require('../services');

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
    const { configuration } = require('../services');
    
    switch (action) {
      case 'set-channel':
        await configuration.configureMovieChannel(interaction, guildId);
        break;
      case 'set-viewing-channel':
        await configuration.configureViewingChannel(interaction, guildId);
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
      case 'reset':
        await configuration.resetConfiguration(interaction, guildId);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown configuration action.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Error handling movie configure:', error);
    await interaction.reply({
      content: '❌ Error processing configuration command.',
      flags: MessageFlags.Ephemeral
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

async function handleMovieWatched(interaction) {
  const { permissions } = require('../services');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need admin permissions to mark movies as watched.',
      flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Mark as watched
    await database.updateMovieStatus(movie.message_id, 'watched');

    await interaction.reply({
      content: `✅ **${movie.title}** has been marked as watched!`,
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error marking movie as watched:', error);
    await interaction.reply({
      content: '❌ An error occurred while marking the movie as watched.',
      flags: MessageFlags.Ephemeral
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
      flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Mark as skipped
    await database.updateMovieStatus(movie.message_id, 'skipped');

    await interaction.reply({
      content: `⏭️ **${movie.title}** has been skipped.`,
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error skipping movie:', error);
    await interaction.reply({
      content: '❌ An error occurred while skipping the movie.',
      flags: MessageFlags.Ephemeral
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
      flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Mark as planned
    await database.updateMovieStatus(movie.message_id, 'planned');

    await interaction.reply({
      content: `📌 **${movie.title}** has been planned for later. Use \`/movie-session\` to schedule it!`,
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error planning movie:', error);
    await interaction.reply({
      content: '❌ An error occurred while planning the movie.',
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  handleSlashCommand,
  handleMovieNight,
  handleMovieQueue,
  handleMovieHelp,
  handleMovieConfigure,
  handleMovieCleanup,
  handleMovieStats,
  handleMovieWatched,
  handleMovieSkip,
  handleMoviePlan
};
