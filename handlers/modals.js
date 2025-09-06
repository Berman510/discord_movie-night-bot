/**
 * Modal Interaction Handlers
 * Handles all modal submission interactions
 */

const { MessageFlags } = require('discord.js');
const { sessions } = require('../services');
const { imdb } = require('../services');

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

  console.log(`Movie recommendation: ${title} on ${where}`);

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

    // Search IMDb for the movie
    let imdbResults = [];
    try {
      const searchResult = await imdb.searchMovie(title);
      if (searchResult && Array.isArray(searchResult)) {
        imdbResults = searchResult;
      }
    } catch (error) {
      console.warn('IMDb search failed:', error.message);
    }

    if (imdbResults.length > 0) {
      // Show IMDb selection buttons
      await showImdbSelection(interaction, title, where, imdbResults);
    } else {
      // No IMDb results, create movie without IMDb data
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

async function showImdbSelection(interaction, title, where, imdbResults) {
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const { pendingPayloads } = require('../utils/constants');

  // Generate a short key for storing the data temporarily
  const dataKey = `imdb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store the data temporarily (will be cleaned up automatically)
  pendingPayloads.set(dataKey, {
    title,
    where,
    imdbResults,
    createdAt: Date.now()
  });

  const embed = new EmbedBuilder()
    .setTitle('🎬 Select the correct movie')
    .setDescription(`Found ${imdbResults.length} matches for **${title}**`)
    .setColor(0x5865f2);

  // Add up to 4 results (to leave room for "None of these" button)
  const displayResults = imdbResults.slice(0, 4);
  displayResults.forEach((movie, index) => {
    embed.addFields({
      name: `${index + 1}. ${movie.Title} (${movie.Year})`,
      value: '\u200B', // Invisible character for clean display
      inline: false
    });
  });

  // Create selection buttons with short custom IDs
  const buttons = new ActionRowBuilder();
  displayResults.forEach((movie, index) => {
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`select_imdb:${index}:${dataKey}`)
        .setLabel(`${index + 1}. ${movie.Title} (${movie.Year})`)
        .setStyle(ButtonStyle.Primary)
    );
  });

  // Add "None of these" button
  buttons.addComponents(
    new ButtonBuilder()
      .setCustomId(`select_imdb:none:${dataKey}`)
      .setLabel('None of these')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
    flags: MessageFlags.Ephemeral
  });
}

async function createMovieWithoutImdb(interaction, title, where) {
  const database = require('../database');
  const { embeds, components } = require('../utils');

  try {
    // Create movie embed first
    const movieData = {
      title: title,
      where_to_watch: where,
      recommended_by: interaction.user.id,
      status: 'pending'
    };

    const movieEmbed = embeds.createMovieEmbed(movieData);

    // Create the message first without buttons
    const message = await interaction.channel.send({
      embeds: [movieEmbed]
    });

    // Now create buttons with the actual message ID
    const movieComponents = components.createStatusButtons(message.id, 'pending');

    // Update the message with the correct buttons
    await message.edit({
      embeds: [movieEmbed],
      components: movieComponents
    });

    // Now save to database with the message ID
    console.log(`💾 Saving movie to database: ${title} (${message.id})`);
    const movieId = await database.saveMovie({
      messageId: message.id,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      title: title,
      whereToWatch: where,
      recommendedBy: interaction.user.id,
      imdbId: null,
      imdbData: null
    });

    console.log(`💾 Movie save result: ${movieId ? 'SUCCESS' : 'FAILED'} (ID: ${movieId})`);
    if (movieId) {
      // Post Quick Action at bottom of channel
      const cleanup = require('../services/cleanup');
      await cleanup.ensureQuickActionAtBottom(interaction.channel);

      await interaction.reply({
        content: `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue for voting.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      // If database save failed, delete the message
      await message.delete().catch(console.error);
      await interaction.reply({
        content: '❌ Failed to create movie recommendation.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('Error creating movie without IMDb:', error);
    await interaction.reply({
      content: '❌ Error creating movie recommendation.',
      flags: MessageFlags.Ephemeral
    });
  }
}



module.exports = {
  handleModal
};
