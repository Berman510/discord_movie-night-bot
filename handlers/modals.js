/**
 * Modal Interaction Handlers
 * Handles all modal submission interactions
 */

const { MessageFlags } = require('discord.js');
const ephemeralManager = require('../utils/ephemeral-manager');
const { sessions } = require('../services');
const { imdb } = require('../services');
const cleanup = require('../services/cleanup');

async function handleModal(interaction) {
  const customId = interaction.customId;

  try {
    // Movie recommendation modal
    if (customId === 'mn:modal') {
      await handleMovieRecommendationModal(interaction);
      return;
    }

    // Session creation modal
    if (customId.startsWith('create_session_modal')) {
      await sessions.createMovieSessionFromModal(interaction);
      return;
    }

    // Session details modal (new flow)
    if (customId === 'session_details_modal') {
      await sessions.createMovieSessionFromModal(interaction);
      return;
    }

    // Custom date/time modals
    if (customId === 'session_custom_date_modal' || customId === 'session_custom_time_modal') {
      await sessions.handleCustomDateTimeModal(interaction);
      return;
    }

    // Voting session modals
    if (customId === 'voting_session_date_modal') {
      const votingSessions = require('../services/voting-sessions');
      await votingSessions.handleVotingSessionDateModal(interaction);
      return;
    }
    if (customId.startsWith('voting_session_reschedule_modal:')) {
      const votingSessions = require('../services/voting-sessions');
      await votingSessions.handleVotingSessionRescheduleModal(interaction);
      return;
    }

    // Vote caps configuration modal
    if (customId === 'config_vote_caps_modal') {
      const configuration = require('../services/configuration');
      await configuration.applyVoteCapsFromModal(interaction);
      return;
    }

    // Note: voting_session_time_modal doesn't exist - time is handled in date modal

    // Deep purge confirmation modal
    if (customId.startsWith('deep_purge_confirm:')) {
      await handleDeepPurgeConfirmation(interaction, customId);
      return;
    }

    // Unknown modal
    console.warn(`Unknown modal interaction: ${customId}`);
    await interaction.reply({
      content: '❌ Unknown modal interaction.',
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error handling modal interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the modal.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

async function handleMovieRecommendationModal(interaction) {
  const title = interaction.fields.getTextInputValue('mn:title');
  const where = interaction.fields.getTextInputValue('mn:where');

  const logger = require('../utils/logger');
  logger.debug(`🔍 DEBUG: handleMovieRecommendationModal called with title: ${title}, where: ${where}`);
  logger.debug(`Movie recommendation: ${title} on ${where}`);

  try {
    // Use the movie recommendation logic from the original backup
    const imdb = require('../services/imdb');
    const database = require('../database');

    // Check for duplicate movies
    const existingMovie = await database.findMovieByTitle(interaction.guild.id, title);

    if (existingMovie) {
      const statusEmoji = {
        'pending': '🍿',
        'planned': '📌',
        'watched': '✅',
        'skipped': '⏭️',
        'scheduled': '📅'
      }[existingMovie.status] || '🎬';

      let statusMessage = `**${title}** has already been added and is currently ${statusEmoji} ${existingMovie.status}`;

      if (existingMovie.status === 'watched' && existingMovie.watched_at) {
        const watchedDate = new Date(existingMovie.watched_at).toLocaleDateString();
        statusMessage += ` (watched on ${watchedDate})`;
      }

      statusMessage += '.\n\nWould you like to add it again anyway?';

      // Create confirmation buttons
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`mn:duplicate_confirm:${title}:${where}`)
          .setLabel('Yes, Add Again')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`mn:duplicate_cancel`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

      await interaction.reply({
        content: `⚠️ ${statusMessage}`,
        components: [confirmRow],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Defer early for potentially long IMDb/network operations
    if (!interaction.deferred && !interaction.replied) {
      try { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); } catch {}
    }

    // Search IMDb for movies and TV shows with spell checking
    let imdbResults = [];
    let suggestions = [];
    let originalTitle = title;

    try {
      const searchResult = await imdb.searchContentWithSuggestions(title);
      if (searchResult.results && Array.isArray(searchResult.results)) {
        imdbResults = searchResult.results;
      }
      if (searchResult.suggestions && Array.isArray(searchResult.suggestions)) {
        suggestions = searchResult.suggestions;
      }
      if (searchResult.originalTitle) {
        originalTitle = searchResult.originalTitle;
      }
    } catch (error) {
      console.warn('IMDb search failed:', error.message);
    }

    if (imdbResults.length > 0) {
      // Show IMDb selection buttons
      await showImdbSelection(interaction, title, where, imdbResults, suggestions, originalTitle);
    } else if (suggestions.length > 0) {
      // Show spelling suggestions
      await showSpellingSuggestions(interaction, title, where, suggestions);
    } else {
      // No IMDb results and no suggestions, create movie without IMDb data
      await createMovieWithoutImdb(interaction, title, where);
    }

  } catch (error) {
    console.error('Error handling movie recommendation modal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error processing movie recommendation.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

async function showImdbSelection(interaction, title, where, imdbResults, suggestions = [], originalTitle = null) {
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const { pendingPayloads } = require('../utils/constants');

  // Generate a short key for storing the data temporarily
  const dataKey = `imdb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store the data temporarily (will be cleaned up automatically)
  pendingPayloads.set(dataKey, {
    title,
    where,
    imdbResults,
    suggestions,
    originalTitle,
    createdAt: Date.now()
  });

  const embed = new EmbedBuilder()
    .setTitle('🎬 Select the correct content')
    .setColor(0x5865f2);

  // Add description with spell check info if applicable
  let description = `Found ${imdbResults.length} matches for **${title}**`;
  if (originalTitle && originalTitle !== title) {
    description = `Found ${imdbResults.length} matches for **${title}**\n💡 *Showing results for corrected spelling*`;
  }
  embed.setDescription(description);

  // Add up to 3 results (to leave room for "None of these" and "Cancel" buttons)
  const displayResults = imdbResults.slice(0, 3);
  displayResults.forEach((content, index) => {
    const typeEmoji = content.Type === 'series' ? '📺' : '🍿';
    const typeLabel = content.Type === 'series' ? 'TV Show' : 'Movie';
    embed.addFields({
      name: `${index + 1}. ${typeEmoji} ${content.Title} (${content.Year})`,
      value: `*${typeLabel}*`, // Show content type
      inline: false
    });
  });

  // Create selection buttons with short custom IDs
  const buttons = new ActionRowBuilder();
  displayResults.forEach((content, index) => {
    const typeEmoji = content.Type === 'series' ? '📺' : '🍿';
    let label = `${index + 1}. ${typeEmoji} ${content.Title} (${content.Year})`;
    if (label.length > 80) {
      label = label.slice(0, 77) + '...';
    }
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`select_imdb:${index}:${dataKey}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary)
    );
  });

  // Add "None of these" and "Cancel" buttons
  buttons.addComponents(
    new ButtonBuilder()
      .setCustomId(`select_imdb:none:${dataKey}`)
      .setLabel('None of these')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`select_imdb:cancel:${dataKey}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
  );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [buttons]
  });
}

/**
 * Show spelling suggestions when no exact matches are found
 */
async function showSpellingSuggestions(interaction, title, where, suggestions) {
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const { pendingPayloads } = require('../utils/constants');

  // Generate a short key for storing the data temporarily
  const dataKey = `spell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store the data temporarily
  pendingPayloads.set(dataKey, {
    title,
    where,
    suggestions,
    createdAt: Date.now()
  });

  const embed = new EmbedBuilder()
    .setTitle('🔍 Did you mean...?')
    .setDescription(`No exact matches found for **${title}**.\n\nHere are some suggestions:`)
    .setColor(0xffa500); // Orange color for suggestions

  // Add suggestions as fields
  suggestions.slice(0, 3).forEach((suggestion, index) => {
    embed.addFields({
      name: `${index + 1}. ${suggestion}`,
      value: '\u200B', // Invisible character
      inline: false
    });
  });

  // Create suggestion buttons
  const buttons = new ActionRowBuilder();
  suggestions.slice(0, 3).forEach((suggestion, index) => {
    let label = `${index + 1}. ${suggestion}`;
    if (label.length > 80) {
      label = label.slice(0, 77) + '...';
    }
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`try_suggestion:${index}:${dataKey}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  // Add "Use Original" and "Cancel" buttons
  const actionButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`use_original:${dataKey}`)
        .setLabel(`Use "${title}" anyway`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cancel_suggestion:${dataKey}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

  const ephemeralManager = require('../services/ephemeral-manager');
  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [buttons, actionButtons]
  });
}

async function createMovieWithoutImdb(interaction, title, where) {
  const movieCreation = require('../services/movie-creation');
  const database = require('../database');

  console.log(`🔍 DEBUG: createMovieWithoutImdb called with:`, {
    title,
    where,
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    channelId: interaction.channel?.id
  });

  try {
    // Create movie using the new unified service
    console.log(`🔍 DEBUG: About to call movieCreation.createMovieRecommendation`);
    const result = await movieCreation.createMovieRecommendation(interaction, {
      title,
      where,
      imdbId: null,
      imdbData: null
    });

    console.log(`🔍 DEBUG: movieCreation.createMovieRecommendation result:`, {
      hasMessage: !!result.message,
      hasThread: !!result.thread,
      movieId: result.movieId,
      messageId: result.message?.id,
      threadId: result.thread?.id
    });

    const { message, thread, movieId } = result;

    // Post to admin channel if configured
    try {
      const movie = await database.getMovieByMessageId(message.id);
      if (movie) {
        const adminMirror = require('../services/admin-mirror');
        await adminMirror.postMovieToAdminChannel(interaction.client, interaction.guild.id, movie);
      }
    } catch (error) {
      console.error('Error posting to admin channel:', error);
    }

    // Ensure recommendation post/action for the movie channel
    // Note: We need to get the actual movie channel, not the interaction channel
    const forumChannels = require('../services/forum-channels');
    const database = require('../database');
    const config = await database.getGuildConfig(interaction.guild.id);

    if (config && config.movie_channel_id) {
      const movieChannel = await interaction.client.channels.fetch(config.movie_channel_id);
      if (movieChannel) {
        if (forumChannels.isTextChannel(movieChannel)) {
          // Text channels get quick action pinned
          await cleanup.ensureQuickActionPinned(movieChannel);
        } else if (forumChannels.isForumChannel(movieChannel)) {
          // Forum channels get recommendation post
          const activeSession = await database.getActiveVotingSession(interaction.guild.id);
          await forumChannels.ensureRecommendationPost(movieChannel, activeSession);
        }
      }
    }

    // Success message varies by channel type (use the actual movie channel)
    const movieChannel = config && config.movie_channel_id ?
      await interaction.client.channels.fetch(config.movie_channel_id) : null;
    const channelType = movieChannel ? forumChannels.getChannelTypeString(movieChannel) : 'Unknown';

    const successMessage = thread
      ? `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added as a new forum post in ${movieChannel} for voting and discussion.`
      : `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue in ${movieChannel} for voting.`;

    let ephemeralMsg;
    if (interaction.deferred || interaction.replied) {
      ephemeralMsg = await interaction.followUp({ content: successMessage, flags: MessageFlags.Ephemeral });
    } else {
      ephemeralMsg = await interaction.reply({ content: successMessage, flags: MessageFlags.Ephemeral });
    }
    // Auto-clean the ephemeral confirmation after 5 seconds
    setTimeout(async () => {
      try {
        if (interaction.deferred || interaction.replied) {
          await ephemeralMsg?.delete?.();
        } else {
          await interaction.deleteReply();
        }
      } catch (_) {}
    }, 5000);

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('🔍 DEBUG: Error in createMovieWithoutImdb:', error);
    logger.debug('🔍 DEBUG: Error stack:', error.stack);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: `❌ Failed to create movie recommendation: ${error.message}` , flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: `❌ Failed to create movie recommendation: ${error.message}`, flags: MessageFlags.Ephemeral });
    }
  }
}

/**
 * Handle deep purge confirmation modal
 */
async function handleDeepPurgeConfirmation(interaction, customId) {
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

  // Extract categories from custom ID
  const categoriesString = customId.split(':')[1];
  const categories = categoriesString.split(',');

  // Get form data
  const confirmationText = interaction.fields.getTextInputValue('confirmation_text');
  const reason = interaction.fields.getTextInputValue('purge_reason') || null;

  // Validate confirmation text
  if (confirmationText !== 'DELETE EVERYTHING') {
    await interaction.reply({
      content: '❌ Confirmation text must be exactly "DELETE EVERYTHING" to proceed.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Execute deep purge
    const result = await deepPurge.executeDeepPurge(interaction.guild.id, categories, reason, interaction.client);

    // Create success embed
    const successEmbed = deepPurge.createSuccessEmbed(interaction.guild.name, result, categories);

    await interaction.editReply({
      embeds: [successEmbed]
    });

    // Log the purge action
    const logger = require('../utils/logger');
    logger.info(`🗑️ Deep purge executed by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild.name} (${interaction.guild.id})`);
    logger.info(`📋 Categories: ${categories.join(', ')}`);
    logger.info(`📝 Reason: ${reason || 'No reason provided'}`);
    logger.info(`📊 Result: ${result.deleted} items deleted, ${result.errors.length} errors`);

  } catch (error) {
    console.error('Error executing deep purge:', error);
    await interaction.editReply({
      content: '❌ An error occurred while executing the deep purge. Please check the logs and try again.'
    });
  }
}

module.exports = {
  handleModal
};
