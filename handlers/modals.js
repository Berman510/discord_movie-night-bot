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

    // Search IMDb for the movie
    let imdbResults = [];
    try {
      imdbResults = await imdb.searchMovies(title);
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
    await interaction.reply({
      content: '❌ Error processing movie recommendation.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function showImdbSelection(interaction, title, where, imdbResults) {
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const embed = new EmbedBuilder()
    .setTitle('🎬 Select the correct movie')
    .setDescription(`Found ${imdbResults.length} matches for **${title}**`)
    .setColor(0x5865f2);

  // Add up to 5 results
  const displayResults = imdbResults.slice(0, 5);
  displayResults.forEach((movie, index) => {
    embed.addFields({
      name: `${index + 1}. ${movie.Title} (${movie.Year})`,
      value: movie.Plot || 'No plot available',
      inline: false
    });
  });

  // Create selection buttons
  const buttons = new ActionRowBuilder();
  displayResults.forEach((movie, index) => {
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`select_imdb:${index}:${Buffer.from(JSON.stringify({title, where, imdbResults})).toString('base64')}`)
        .setLabel(`${index + 1}. ${movie.Title} (${movie.Year})`)
        .setStyle(ButtonStyle.Primary)
    );
  });

  // Add "None of these" button
  buttons.addComponents(
    new ButtonBuilder()
      .setCustomId(`select_imdb:none:${Buffer.from(JSON.stringify({title, where})).toString('base64')}`)
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
    // Create movie data
    const movieData = {
      guild_id: interaction.guild.id,
      channel_id: interaction.channel.id,
      title: title,
      where_to_watch: where,
      recommended_by: interaction.user.id,
      status: 'pending'
    };

    // Add to database
    const success = await database.addMovie(movieData);

    if (success) {
      // Create movie embed and post
      const movieEmbed = embeds.createMovieEmbed(movieData);
      const movieComponents = components.createStatusButtons(movieData.message_id, 'pending');

      const message = await interaction.channel.send({
        embeds: [movieEmbed],
        components: movieComponents
      });

      // Update database with message ID
      await database.updateMovieMessageId(interaction.guild.id, title, message.id);

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
