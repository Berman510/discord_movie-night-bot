/**
 * Select Menu Interaction Handlers
 * Handles all select menu interactions
 */

const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const database = require('../database');
const { TIMEZONE_OPTIONS } = require('../config/timezones');
const guidedSetup = require('../services/guided-setup');

async function handleSelect(interaction) {
  const customId = interaction.customId;

  // Clean up any previous ephemeral messages for this user
  const ephemeralManager = require('../utils/ephemeral-manager');
  await ephemeralManager.forceCleanupUser(interaction.user.id);

  try {
    // Configuration channel/role selections
    if (customId === 'config_select_voting_channel') {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      const { configuration } = require('../services');

      // Create a mock interaction with the selected channel
      const mockInteraction = Object.create(interaction);
      mockInteraction.options = {
        getChannel: () => channel
      };

      await configuration.configureMovieChannel(mockInteraction, interaction.guild.id);
      return;
    }

    if (customId === 'config_select_admin_channel') {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      const { configuration } = require('../services');

      // Create a mock interaction with the selected channel
      const mockInteraction = Object.create(interaction);
      mockInteraction.options = {
        getChannel: () => channel
      };

      await configuration.configureAdminChannel(mockInteraction, interaction.guild.id);
      return;
    }

    if (customId === 'config_select_viewing_channel') {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      const { configuration } = require('../services');

      // Create a mock interaction with the selected channel
      const mockInteraction = Object.create(interaction);
      mockInteraction.options = {
        getChannel: () => channel
      };

      await configuration.configureViewingChannel(mockInteraction, interaction.guild.id);
      return;
    }


    // Timezone selection for session creation
    if (customId === 'session_timezone_selected') {
      await handleSessionTimezoneSelection(interaction);
      return;
    }

    // Configuration timezone selection
    if (customId === 'config_timezone_selected') {
      await handleConfigTimezoneSelection(interaction);
      return;
    }

    // Session movie selection
    if (customId === 'session_movie_selected') {
      await handleSessionMovieSelection(interaction);
      return;
    }

    // IMDb movie selection
    if (customId.startsWith('mn:imdbpick:')) {
      await handleImdbSelection(interaction);
      return;
    }

    // Deep purge category selection (old auto-submit version)
    if (customId === 'deep_purge_select') {
      await handleDeepPurgeSelection(interaction);
      return;
    }

    // Deep purge category selection (new version with submit button)
    if (customId === 'deep_purge_select_categories') {
      await handleDeepPurgeCategorySelection(interaction);
      return;
    }

    // Guided setup select menus
    if (customId.startsWith('setup_select_')) {
      await handleGuidedSetupSelect(interaction, customId);
      return;
    }

    // Unknown select menu
    console.warn(`Unknown select menu interaction: ${customId}`);
    await interaction.reply({
      content: '❌ Unknown select menu interaction.',
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error handling select interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the selection.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

/**
 * Handle deep purge category selection (old auto-submit version)
 */
async function handleDeepPurgeSelection(interaction) {
  const { permissions } = require('../services');
  const deepPurge = require('../services/deep-purge');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this action.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const selectedCategories = interaction.values;

  try {
    // Create confirmation modal directly (no need for embed here)
    const modal = deepPurge.createConfirmationModal(selectedCategories);

    await interaction.showModal(modal);

  } catch (error) {
    console.error('Error handling deep purge selection:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while preparing the deep purge confirmation.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

/**
 * Handle deep purge category selection (new version with submit button)
 */
async function handleDeepPurgeCategorySelection(interaction) {
  const { permissions } = require('../services');
  const deepPurge = require('../services/deep-purge');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this action.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const selectedCategories = interaction.values;

  try {
    // Update the display with selected categories
    const embed = deepPurge.updateSelectionDisplay(selectedCategories);
    const components = deepPurge.createDeepPurgeSelectionMenu(selectedCategories);

    // Store selected categories in the interaction for later use
    global.deepPurgeSelections = global.deepPurgeSelections || new Map();
    global.deepPurgeSelections.set(interaction.user.id, selectedCategories);

    await interaction.update({
      embeds: [embed],
      components: components
    });

  } catch (error) {
    console.error('Error handling deep purge category selection:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while updating the selection.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleSessionTimezoneSelection(interaction) {
  const selectedTimezone = interaction.values[0];
  const timezoneName = TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone;

  // Store timezone selection in session state
  if (!global.sessionCreationState) {
    global.sessionCreationState = new Map();
  }

  const userId = interaction.user.id;
  let state = global.sessionCreationState.get(userId) || {};
  state.selectedTimezone = selectedTimezone;
  state.timezoneName = timezoneName;
  global.sessionCreationState.set(userId, state);

  // Show movie selection step
  await showMovieSelection(interaction, state);
}

async function handleSessionMovieSelection(interaction) {
  const selectedValue = interaction.values[0];

  // Store movie selection in session state
  if (!global.sessionCreationState) {
    global.sessionCreationState = new Map();
  }

  const userId = interaction.user.id;
  let state = global.sessionCreationState.get(userId) || {};

  if (selectedValue === 'no_movie') {
    state.selectedMovie = null;
    state.movieDisplay = 'No specific movie';
  } else {
    // Extract movie message ID
    const movieMessageId = selectedValue.replace('movie_', '');

    try {
      // Get movie details from database
      const movie = await database.getMovieById(movieMessageId, interaction.guild.id);
      if (movie) {
        state.selectedMovie = movieMessageId;
        state.movieTitle = movie.title; // Store title for templating
        state.movieDisplay = `**${movie.title}**\n📺 ${movie.where_to_watch}`;
      } else {
        state.selectedMovie = null;
        state.movieTitle = null;
        state.movieDisplay = 'Movie not found';
      }
    } catch (error) {
      console.error('Error getting movie details:', error);
      state.selectedMovie = null;
      state.movieDisplay = 'Error loading movie';
    }
  }

  global.sessionCreationState.set(userId, state);

  // Show session details step
  await showSessionDetailsModal(interaction, state);
}

async function showMovieSelection(interaction, state) {
  try {
    // Get available movies from database
    const guildId = interaction.guild.id;
    const plannedMovies = await database.getMoviesByStatus(guildId, 'planned', 10);
    const pendingMovies = await database.getMoviesByStatus(guildId, 'pending', 10);
    const topMovie = await database.getTopVotedMovie(guildId);

    const embed = new EmbedBuilder()
      .setTitle('🎬 Create Movie Night Session')
      .setDescription('**Step 4:** Choose a movie for your session\n\n*Select a movie to feature in this session, or create a general session*')
      .setColor(0x5865f2)
      .addFields(
        { name: '📅 Selected Date', value: state.dateDisplay, inline: true },
        { name: '🕐 Selected Time', value: state.timeDisplay || 'No specific time', inline: true },
        { name: '🌍 Selected Timezone', value: state.timezoneName, inline: true }
      );

    // Build movie selection options
    const movieOptions = [];

    // Add "No specific movie" option
    movieOptions.push({
      label: '📝 No Specific Movie (General Session)',
      value: 'no_movie',
      description: 'Create a general movie night session'
    });

    // Add top-voted movie if available
    if (topMovie) {
      movieOptions.push({
        label: `🏆 ${topMovie.title} (Top Voted)`,
        value: `movie_${topMovie.message_id}`,
        description: `${topMovie.where_to_watch} • ${topMovie.upvotes || 0}👍 ${topMovie.downvotes || 0}👎`
      });
    }

    // Add planned movies
    plannedMovies.forEach(movie => {
      if (movieOptions.length < 25) { // Discord limit
        movieOptions.push({
          label: `📌 ${movie.title} (Planned)`,
          value: `movie_${movie.message_id}`,
          description: `${movie.where_to_watch} • Planned for later`
        });
      }
    });

    // Add pending movies (if space)
    pendingMovies.forEach(movie => {
      if (movieOptions.length < 25 && !movieOptions.find(opt => opt.value === `movie_${movie.message_id}`)) {
        const score = (movie.upvotes || 0) - (movie.downvotes || 0);
        movieOptions.push({
          label: `🍿 ${movie.title} (Pending)`,
          value: `movie_${movie.message_id}`,
          description: `${movie.where_to_watch} • Score: ${score > 0 ? '+' : ''}${score}`
        });
      }
    });

    if (movieOptions.length === 1) {
      // Only "no movie" option available
      embed.addFields({
        name: '🎬 Available Movies',
        value: 'No movies found in queue. You can create a general session and add movies later.',
        inline: false
      });
    }

    const movieSelect = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('session_movie_selected')
          .setPlaceholder('Choose a movie for your session...')
          .addOptions(movieOptions.slice(0, 25)) // Discord limit
      );

    await interaction.update({
      embeds: [embed],
      components: [movieSelect]
    });

  } catch (error) {
    console.error('Error showing movie selection:', error);
    // Fallback to session details if movie selection fails
    await showSessionDetailsModal(interaction, state);
  }
}

async function showSessionDetailsModal(interaction, state) {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 5:** Enter session details\n\n*Almost done! Just add a name and description for your session.*')
    .setColor(0x57f287) // Green to show progress
    .addFields(
      { name: '📅 Selected Date', value: state.dateDisplay, inline: true },
      { name: '🕐 Selected Time', value: state.timeDisplay || 'No specific time', inline: true },
      { name: '🌍 Selected Timezone', value: state.timezoneName, inline: true }
    );

  // Add movie info if selected
  if (state.selectedMovie && state.selectedMovie !== 'no_movie') {
    embed.addFields({
      name: '🎬 Featured Movie',
      value: state.movieDisplay || 'Movie selected',
      inline: false
    });
  }

  const createButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_create_final')
        .setLabel('📝 Enter Session Details')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId('session_back_to_movie')
        .setLabel('🔄 Change Movie')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({
    embeds: [embed],
    components: [createButton]
  });
}

async function handleConfigTimezoneSelection(interaction) {
  const selectedTimezone = interaction.values[0];
  const timezoneName = TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone;
  
  const success = await database.setGuildTimezone(interaction.guild.id, selectedTimezone);
  
  if (success) {
    await interaction.update({
      content: `🌍 **Timezone Updated!**\n\nDefault timezone set to **${timezoneName}**\n\nThis will be used for movie sessions when users don't specify a timezone.`,
      embeds: [],
      components: []
    });
  } else {
    await interaction.update({
      content: '❌ Failed to update timezone. Please try again.',
      embeds: [],
      components: []
    });
  }
}

async function handleImdbSelection(interaction) {
  // TODO: Move IMDb selection logic here
  console.log(`IMDb selection: ${interaction.values[0]}`);
  
  await interaction.reply({
    content: 'IMDb selection processed.',
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Handle guided setup select menu interactions
 */
async function handleGuidedSetupSelect(interaction, customId) {
  switch (customId) {
    case 'setup_select_voting_channel':
      await guidedSetup.handleChannelSelection(interaction, 'voting');
      break;

    case 'setup_select_admin_channel':
      await guidedSetup.handleChannelSelection(interaction, 'admin');
      break;

    case 'setup_select_viewing_channel':
      await guidedSetup.handleChannelSelection(interaction, 'viewing');
      break;

    case 'setup_select_admin_roles':
      await guidedSetup.handleRoleSelection(interaction, 'admin');
      break;

    case 'setup_select_moderator_roles':
      await guidedSetup.handleRoleSelection(interaction, 'moderator');
      break;

    case 'setup_select_notification_role':
      await guidedSetup.handleRoleSelection(interaction, 'notification');
      break;

    default:
      console.warn('Unknown guided setup select menu:', customId);
      break;
  }
}

module.exports = {
  handleSelect,
  showMovieSelection
};
