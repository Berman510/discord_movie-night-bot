/**
 * Button Interaction Handlers
 * Handles all button click interactions
 *
 * TODO: Enhanced Voting Analytics
 * - We already track all voting button clicks in the votes table (user_id, message_id, vote_type, created_at)
 * - Could implement voting analytics features:
 *   - User voting patterns and preferences
 *   - Most active voters per guild
 *   - Voting trends over time
 *   - Movie recommendation success rates (votes received)
 *   - User taste similarity analysis
 *   - Voting history for individual users
 * - Add commands like /movie-stats voting-patterns or /movie-stats user-votes
 */

const { MessageFlags } = require('discord.js');
const database = require('../database');
const { sessions } = require('../services');
const { permissions } = require('../services');

async function handleButton(interaction) {
  const customId = interaction.customId;

  // Parse button ID format: namespace:action:data
  const [ns, action, ...rest] = customId.split(':');
  const msgId = rest[0];

  try {
    // Movie voting buttons
    if (ns === 'mn' && (action === 'up' || action === 'down')) {
      const { votes } = require('../utils/constants');
      await handleVoting(interaction, action, msgId, votes);
      return;
    }

    // Movie status buttons (watched, planned, skipped)
    if (ns === 'mn' && ['watched', 'planned', 'skipped'].includes(action)) {
      await handleStatusChange(interaction, action, msgId);
      return;
    }

    // Create session from planned movie
    if (ns === 'mn' && action === 'create_session') {
      await sessions.handleCreateSessionFromMovie(interaction, msgId);
      return;
    }

    // Duplicate movie confirmation
    if (ns === 'mn' && action === 'duplicate_confirm') {
      await handleDuplicateConfirm(interaction, msgId);
      return;
    }

    if (ns === 'mn' && action === 'duplicate_cancel') {
      await handleDuplicateCancel(interaction);
      return;
    }

    // Configuration button handlers
    if (ns === 'config') {
      await handleConfigurationButton(interaction, action);
      return;
    }

    // Session creation button handlers
    if (customId.startsWith('session_date:') ||
        customId.startsWith('session_time:') ||
        customId.startsWith('session_create:') ||
        customId.startsWith('session_movie_date:') ||
        customId.startsWith('session_movie_time:') ||
        customId.startsWith('session_movie_create:') ||
        customId === 'session_create_final' ||
        customId === 'session_back_to_timezone') {
      await sessions.handleSessionCreationButton(interaction);
      return;
    }

    // Session management button handlers
    if (customId.startsWith('session_reschedule:') || customId.startsWith('session_cancel:')) {
      await sessions.handleSessionManagement(interaction);
      return;
    }

    // Session cancellation confirmation
    if (customId.startsWith('confirm_cancel:') || customId === 'cancel_cancel') {
      await sessions.handleCancelConfirmation(interaction);
      return;
    }

    // Purge confirmation buttons
    if (customId === 'confirm_purge' || customId === 'cancel_purge') {
      await handlePurgeConfirmation(interaction);
      return;
    }

    // Create recommendation button
    if (customId === 'create_recommendation') {
      await handleCreateRecommendation(interaction);
      return;
    }

    // IMDb selection buttons
    if (customId.startsWith('select_imdb:')) {
      await handleImdbSelection(interaction);
      return;
    }

    // Session list management buttons
    if (customId === 'session_refresh_list') {
      await sessions.listMovieSessions(interaction);
      return;
    }

    if (customId === 'session_create_new') {
      await sessions.showSessionCreationModal(interaction);
      return;
    }

    // Timezone selection button
    if (customId === 'session_timezone_select') {
      await sessions.showTimezoneSelector(interaction);
      return;
    }

    // Unknown button
    console.warn(`Unknown button interaction: ${customId}`);
    await interaction.reply({
      content: '❌ Unknown button interaction.',
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error handling button interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the button.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

// Placeholder functions - these will be implemented in the full refactor
async function handleVoting(interaction, action, msgId, votes) {
  const database = require('../database');

  try {
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    const isUpvote = action === 'up';

    // Handle database voting
    if (database.isConnected) {
      // Check current vote
      const currentVote = await database.getUserVote(msgId, userId);

      if (currentVote === action) {
        // Remove vote if clicking same button
        await database.removeVote(msgId, userId);
      } else {
        // Add or change vote
        await database.saveVote(msgId, userId, action);
      }

      // Get updated vote counts and movie data
      const voteCounts = await database.getVoteCounts(msgId);
      const movie = await database.getMovieById(msgId, interaction.guild.id);

      // Update message with new vote counts and preserve all buttons
      const { components, embeds } = require('../utils');
      const imdbData = movie && movie.imdb_data ? JSON.parse(movie.imdb_data) : null;
      const updatedEmbed = movie ? embeds.createMovieEmbed(movie, imdbData) : null;
      const updatedComponents = components.createStatusButtons(msgId, movie?.status || 'pending', voteCounts.up, voteCounts.down);

      const updateData = { components: updatedComponents };
      if (updatedEmbed) {
        updateData.embeds = [updatedEmbed];
      }

      await interaction.editReply(updateData);
    } else {
      // Fallback to in-memory voting
      if (!votes.has(msgId)) {
        votes.set(msgId, { up: new Set(), down: new Set() });
      }

      const voteState = votes.get(msgId);
      const addSet = isUpvote ? voteState.up : voteState.down;
      const removeSet = isUpvote ? voteState.down : voteState.up;

      // Remove from opposite set
      if (removeSet.has(userId)) {
        removeSet.delete(userId);
      }

      // Toggle in current set
      if (addSet.has(userId)) {
        addSet.delete(userId);
      } else {
        addSet.add(userId);
      }

      // Update message
      const { components } = require('../utils');
      const updatedComponents = components.createVotingButtons(msgId, voteState.up.size, voteState.down.size);

      await interaction.editReply({
        components: updatedComponents
      });
    }

    console.log(`Voting: ${action} for message ${msgId} by user ${userId}`);

  } catch (error) {
    console.error('Error handling voting:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error processing vote.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleStatusChange(interaction, action, msgId) {
  const { EmbedBuilder } = require('discord.js');
  const database = require('../database');

  try {
    await interaction.deferUpdate();

    // Update movie status in database
    const success = await database.updateMovieStatus(msgId, action);
    if (!success) {
      await interaction.followUp({
        content: '❌ Failed to update movie status.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // If marking as watched, increment watch count
    if (action === 'watched') {
      await database.incrementWatchCount(msgId);
    }

    // Get updated movie data
    const movie = await database.getMovieById(msgId, interaction.guild.id);
    if (!movie) {
      await interaction.followUp({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Get current vote counts
    const voteCounts = await database.getVoteCounts(msgId);

    // Create updated embed with IMDb data if available
    const { embeds, components } = require('../utils');
    const imdbData = movie.imdb_data ? JSON.parse(movie.imdb_data) : null;
    const updatedEmbed = embeds.createMovieEmbed(movie, imdbData);
    const updatedComponents = components.createStatusButtons(msgId, action, voteCounts.up, voteCounts.down);

    // Update the message
    await interaction.editReply({
      embeds: [updatedEmbed],
      components: updatedComponents
    });

    // Send confirmation
    const statusLabels = {
      watched: 'marked as watched and discussion closed',
      planned: 'planned for later',
      skipped: 'skipped'
    };

    await interaction.followUp({
      content: `Movie ${statusLabels[action]}! 🎬`,
      flags: MessageFlags.Ephemeral
    });

    console.log(`Status change: ${action} for message ${msgId}`);

  } catch (error) {
    console.error('Error handling status change:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error updating movie status.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.followUp({
        content: '❌ Error updating movie status.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleDuplicateConfirm(interaction, customIdParts) {
  try {
    // Parse title and where from custom ID: mn:duplicate_confirm:title:where
    const title = customIdParts;
    const where = customIdParts; // This will need to be parsed properly

    // Extract title and where from the custom ID
    const fullCustomId = interaction.customId;
    const parts = fullCustomId.split(':');
    if (parts.length >= 4) {
      const movieTitle = parts.slice(2, -1).join(':'); // Everything between duplicate_confirm and the last part
      const movieWhere = parts[parts.length - 1]; // Last part

      // Proceed with movie creation
      const imdb = require('../services/imdb');

      // Search IMDb for the movie
      let imdbResults = [];
      try {
        const searchResult = await imdb.searchMovie(movieTitle);
        if (searchResult && Array.isArray(searchResult)) {
          imdbResults = searchResult;
        }
      } catch (error) {
        console.warn('IMDb search failed:', error.message);
      }

      if (imdbResults.length > 0) {
        // Show IMDb selection buttons
        const { showImdbSelection } = require('./modals');
        await showImdbSelection(interaction, movieTitle, movieWhere, imdbResults);
      } else {
        // No IMDb results, create movie without IMDb data
        const { createMovieWithoutImdb } = require('./modals');
        await createMovieWithoutImdb(interaction, movieTitle, movieWhere);
      }
    } else {
      await interaction.reply({
        content: '❌ Error parsing movie information.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Error handling duplicate confirmation:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error processing duplicate confirmation.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

async function handleDuplicateCancel(interaction) {
  try {
    await interaction.update({
      content: '❌ Movie recommendation cancelled.',
      components: []
    });
  } catch (error) {
    console.error('Error handling duplicate cancellation:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error processing cancellation.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

async function handleConfigurationButton(interaction, action) {
  const { configuration } = require('../services');

  try {
    switch (action) {
      case 'set-channel':
        await configuration.configureMovieChannel(interaction, interaction.guild.id);
        break;
      case 'set-timezone':
        await configuration.configureTimezone(interaction, interaction.guild.id);
        break;
      case 'manage-roles':
        await configuration.configureAdminRoles(interaction, interaction.guild.id);
        break;
      case 'view-settings':
        await configuration.viewConfiguration(interaction, interaction.guild.id);
        break;
      case 'reset':
        await configuration.resetConfiguration(interaction, interaction.guild.id);
        break;
      default:
        await interaction.reply({
          content: `❌ Unknown configuration action: ${action}`,
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Error handling configuration button:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error processing configuration.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

async function handlePurgeConfirmation(interaction) {
  const customId = interaction.customId;

  if (customId === 'cancel_purge') {
    await interaction.update({
      content: '✅ Purge cancelled. No data was deleted.',
      components: []
    });
    return;
  }

  if (customId === 'confirm_purge') {
    // Import and execute the purge function
    try {
      await interaction.update({
        content: '🗑️ **PURGING ALL RECOMMENDATIONS...**\n\nThis may take a moment...',
        components: []
      });

      const database = require('../database');

      // Get the configured movie channel
      const guildConfig = await database.getGuildConfig(interaction.guild.id);
      if (!guildConfig || !guildConfig.movie_channel_id) {
        await interaction.followUp({
          content: '❌ Movie channel not configured. Cannot perform purge.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const channel = interaction.guild.channels.cache.get(guildConfig.movie_channel_id);
      if (!channel) {
        await interaction.followUp({
          content: '❌ Configured movie channel not found.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const botId = interaction.client.user.id;
      let deletedMessages = 0;
      let deletedMovies = 0;
      let deletedThreads = 0;
      let preservedWatched = 0;

      // Get all current movies from database for this channel
      const allMovies = await database.getMoviesByChannel(interaction.guild.id, channel.id);

      // Count watched movies that will be preserved in database
      for (const movie of allMovies) {
        if (movie.status === 'watched') {
          preservedWatched++;
        }
      }

      // Clear ALL bot messages from the channel
      const messages = await channel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter(msg => msg.author.id === botId);

      for (const [messageId, message] of botMessages) {
        try {
          await message.delete();
          deletedMessages++;
        } catch (error) {
          console.warn(`Failed to delete message ${messageId}:`, error.message);
        }
      }

      // Clean up ALL threads in the channel
      const cleanup = require('../services/cleanup');
      deletedThreads = await cleanup.cleanupAllThreads(channel);

      // Delete current queue movies from database (preserve watched movies)
      for (const movie of allMovies) {
        if (movie.status !== 'watched') {
          try {
            // Delete associated session if exists
            const session = await database.getSessionByMovieId(movie.message_id);
            if (session) {
              await database.deleteMovieSession(session.id);
            }

            // Delete votes
            await database.deleteVotesByMessageId(movie.message_id);

            // Delete movie
            await database.deleteMovie(movie.message_id);
            deletedMovies++;

          } catch (error) {
            console.error(`Error deleting movie ${movie.title}:`, error.message);
          }
        }
      }

      // Recreate quick action message
      const cleanup = require('../services/cleanup');
      await cleanup.ensureQuickActionAtBottom(channel);

      const summary = [
        `✅ **CHANNEL PURGE COMPLETE**`,
        `🗑️ Deleted ${deletedMessages} Discord messages`,
        `🎬 Deleted ${deletedMovies} current movie recommendations`,
        `🧵 Deleted ${deletedThreads} discussion threads`,
        `📚 Preserved ${preservedWatched} watched movies in database (viewing history)`,
        `🍿 Clean channel ready for new recommendations`
      ];

      await interaction.followUp({
        content: summary.join('\n'),
        flags: MessageFlags.Ephemeral
      });

      console.log(`✅ Purge complete: ${deletedMovies} movies, ${deletedMessages} messages, ${preservedScheduled} preserved`);

    } catch (error) {
      console.error('Error during purge:', error);
      await interaction.followUp({
        content: '❌ Error during purge operation. Check console for details.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleCreateRecommendation(interaction) {
  // Show the movie recommendation modal
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('mn:modal')
    .setTitle('New Movie Recommendation');

  const titleInput = new TextInputBuilder()
    .setCustomId('mn:title')
    .setLabel('Movie Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Clueless (1995)')
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

async function handleImdbSelection(interaction) {
  const customId = interaction.customId;
  const [, indexStr, dataKey] = customId.split(':');

  try {
    const { pendingPayloads } = require('../utils/constants');

    // Retrieve the stored data
    const data = pendingPayloads.get(dataKey);
    if (!data) {
      await interaction.reply({
        content: '❌ Selection expired. Please try creating the recommendation again.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const { title, where, imdbResults } = data;

    if (indexStr === 'none') {
      // User selected "None of these" - create without IMDb data
      await createMovieWithoutImdb(interaction, title, where);
    } else {
      // User selected a specific movie
      const index = parseInt(indexStr);
      const selectedMovie = imdbResults[index];
      await createMovieWithImdb(interaction, title, where, selectedMovie);
    }

    // Clean up the stored data
    pendingPayloads.delete(dataKey);

  } catch (error) {
    console.error('Error handling IMDb selection:', error);
    await interaction.reply({
      content: '❌ Error processing movie selection.',
      flags: MessageFlags.Ephemeral
    });
  }
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

    if (movieId) {
      await interaction.update({
        content: `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue for voting.`,
        embeds: [],
        components: []
      });
    } else {
      // If database save failed, delete the message
      await message.delete().catch(console.error);
      await interaction.update({
        content: '❌ Failed to create movie recommendation.',
        embeds: [],
        components: []
      });
    }

  } catch (error) {
    console.error('Error creating movie without IMDb:', error);
    await interaction.update({
      content: '❌ Error creating movie recommendation.',
      embeds: [],
      components: []
    });
  }
}

async function createMovieWithImdb(interaction, title, where, imdbData) {
  const database = require('../database');
  const { embeds, components } = require('../utils');
  const imdb = require('../services/imdb');

  try {
    // Fetch detailed movie info from OMDb
    const detailedImdbData = await imdb.getMovieDetails(imdbData.imdbID);

    // Create movie embed with detailed IMDb data
    const movieData = {
      title: title,
      where_to_watch: where,
      recommended_by: interaction.user.id,
      status: 'pending',
      imdb_id: imdbData.imdbID,
      imdb_data: detailedImdbData || imdbData
    };

    const movieEmbed = embeds.createMovieEmbed(movieData, detailedImdbData);

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
      imdbId: imdbData.imdbID,
      imdbData: detailedImdbData || imdbData
    });

    console.log(`💾 Movie save result: ${movieId ? 'SUCCESS' : 'FAILED'} (ID: ${movieId})`);
    if (movieId) {
      // Create a thread for discussion and seed details from IMDb
      try {
        const thread = await message.startThread({
          name: `${title} — Discussion`,
          autoArchiveDuration: 1440
        });

        const base = `Discussion for **${title}** (recommended by <@${interaction.user.id}>)`;
        if (detailedImdbData) {
          const synopsis = detailedImdbData.Plot && detailedImdbData.Plot !== 'N/A' ? detailedImdbData.Plot : 'No synopsis available.';
          const details = [
            detailedImdbData.Year && `**Year:** ${detailedImdbData.Year}`,
            detailedImdbData.Rated && detailedImdbData.Rated !== 'N/A' && `**Rated:** ${detailedImdbData.Rated}`,
            detailedImdbData.Runtime && detailedImdbData.Runtime !== 'N/A' && `**Runtime:** ${detailedImdbData.Runtime}`,
            detailedImdbData.Genre && detailedImdbData.Genre !== 'N/A' && `**Genre:** ${detailedImdbData.Genre}`,
            detailedImdbData.Director && detailedImdbData.Director !== 'N/A' && `**Director:** ${detailedImdbData.Director}`,
            detailedImdbData.Actors && detailedImdbData.Actors !== 'N/A' && `**Top cast:** ${detailedImdbData.Actors}`,
          ].filter(Boolean).join('\n');
          await thread.send({ content: `${base}\n\n**Synopsis:** ${synopsis}\n\n${details}` });
        } else {
          await thread.send({ content: `${base}\n\nIMDb details weren't available at creation time.` });
        }
      } catch (e) {
        console.warn('Thread creation failed:', e?.message || e);
      }

      // Post Quick Action at bottom of channel
      const cleanup = require('../services/cleanup');
      await cleanup.ensureQuickActionAtBottom(interaction.channel);

      await interaction.update({
        content: `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue for voting.`,
        embeds: [],
        components: []
      });
    } else {
      // If database save failed, delete the message
      await message.delete().catch(console.error);
      await interaction.update({
        content: '❌ Failed to create movie recommendation.',
        embeds: [],
        components: []
      });
    }

  } catch (error) {
    console.error('Error creating movie with IMDb:', error);
    await interaction.update({
      content: '❌ Error creating movie recommendation.',
      embeds: [],
      components: []
    });
  }
}



module.exports = {
  handleButton
};
