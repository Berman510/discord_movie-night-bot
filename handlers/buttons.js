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
const cleanup = require('../services/cleanup');

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

    // Setup guide navigation buttons
    if (customId.startsWith('setup_')) {
      await handleSetupGuideButtons(interaction, customId);
      return;
    }

    // Admin movie action buttons
    if (customId.startsWith('admin_') && !customId.startsWith('admin_ctrl_')) {
      await handleAdminMovieButtons(interaction, customId);
      return;
    }

    // Admin control panel buttons
    if (customId.startsWith('admin_ctrl_')) {
      await handleAdminControlButtons(interaction, customId);
      return;
    }

    // Purge confirmation buttons
    if (customId === 'confirm_purge_queue') {
      const adminControls = require('../services/admin-controls');
      await adminControls.executePurgeQueue(interaction);
      return;
    }

    if (customId === 'cancel_purge_queue') {
      await interaction.update({
        content: '❌ Purge cancelled.',
        embeds: [],
        components: []
      });
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

    // Cancel session confirmation
    if (customId.startsWith('confirm_cancel_session:') || customId === 'cancel_cancel_session') {
      await handleCancelSessionConfirmation(interaction);
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
      const updatedComponents = components.createVotingButtons(msgId, voteCounts.up, voteCounts.down);

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
    // Remove buttons for non-pending movies (status changed via admin buttons - transitioning to slash commands)
    const updatedComponents = action === 'pending' ? components.createVotingButtons(msgId, voteCounts.up, voteCounts.down) : [];

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
      console.log(`🔍 Found ${allMovies.length} movies in database for channel ${channel.id}`);

      // Also check for movies in other channels (in case of channel switches)
      const allGuildMovies = await database.getAllMovies(interaction.guild.id);
      console.log(`🔍 Found ${allGuildMovies.length} total movies in guild`);

      // Count watched movies that will be preserved in database
      for (const movie of allMovies) {
        if (movie.status === 'watched') {
          preservedWatched++;
        }
        console.log(`🎬 Movie: ${movie.title} (${movie.status}) - Message ID: ${movie.message_id}`);
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
      deletedThreads = await cleanup.cleanupAllThreads(channel);

      // Delete current queue movies from database (preserve watched movies)
      // Use all guild movies to catch movies from old channels
      const moviesToDelete = allGuildMovies.filter(movie => movie.status !== 'watched');

      for (const movie of moviesToDelete) {
        try {
          // Preserve session data but update associated_movie_id to null
          const session = await database.getSessionByMovieId(movie.message_id);
          if (session) {
            // Preserve session for analytics but remove movie association
            await database.updateSessionMovieAssociation(session.id, null);
            console.log(`📊 Preserved session ${session.id} for analytics (removed movie association)`);
          }

          // Delete votes
          await database.deleteVotesByMessageId(movie.message_id);

          // Delete movie
          await database.deleteMovie(movie.message_id);
          deletedMovies++;
          console.log(`🗑️ Deleted movie from database: ${movie.title} (${movie.message_id}) from channel ${movie.channel_id}`);

        } catch (error) {
          console.error(`Error deleting movie ${movie.title}:`, error.message);
        }
      }

      // Recreate quick action message
      await cleanup.ensureQuickActionAtBottom(channel);

      const summary = [
        `✅ **CHANNEL PURGE COMPLETE**`,
        `🗑️ Deleted ${deletedMessages} Discord messages`,
        `🎬 Deleted ${deletedMovies} current movie recommendations`,
        `🧵 Deleted ${deletedThreads} discussion threads`,
        `📚 Preserved ${preservedWatched} watched movies in database (viewing history)`,
        `📊 Preserved all session data and attendance records for analytics`,
        `🍿 Clean channel ready for new recommendations`
      ];

      await interaction.followUp({
        content: summary.join('\n'),
        flags: MessageFlags.Ephemeral
      });

      console.log(`✅ Purge complete: ${deletedMovies} movies, ${deletedMessages} messages, ${deletedThreads} threads, ${preservedWatched} watched preserved`);

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
  // Check if there's an active voting session
  const database = require('../database');
  const activeSession = await database.getActiveVotingSession(interaction.guild.id);

  if (!activeSession) {
    await interaction.reply({
      content: '❌ **No active voting session**\n\nMovie recommendations are only available during active voting sessions. An admin needs to use the "Plan Next Session" button in the admin channel to start a new voting session.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Show the movie recommendation modal
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('mn:modal')
    .setTitle('Recommend Movie');

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

async function handleImdbSelection(interaction) {
  const customId = interaction.customId;
  const [, indexStr, dataKey] = customId.split(':');

  try {
    // Defer the interaction immediately to prevent timeout
    await interaction.deferUpdate();

    const { pendingPayloads } = require('../utils/constants');

    // Retrieve the stored data
    const data = pendingPayloads.get(dataKey);
    if (!data) {
      await interaction.followUp({
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
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error processing movie selection.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.followUp({
        content: '❌ Error processing movie selection.',
        flags: MessageFlags.Ephemeral
      });
    }
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

    // Now create buttons with the actual message ID (voting only - admin uses slash commands)
    const movieComponents = components.createVotingButtons(message.id);

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

    // Now create buttons with the actual message ID (voting only - admin uses slash commands)
    const movieComponents = components.createVotingButtons(message.id);

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

      // Post Quick Action at bottom of channel
      await cleanup.ensureQuickActionAtBottom(interaction.channel);

      await interaction.editReply({
        content: `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue for voting.`,
        embeds: [],
        components: []
      });
    } else {
      // If database save failed, delete the message
      await message.delete().catch(console.error);
      await interaction.editReply({
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

/**
 * Handle setup guide navigation buttons
 */
async function handleSetupGuideButtons(interaction, customId) {
  const setupGuide = require('../services/setup-guide');

  switch (customId) {
    case 'setup_channels':
      await setupGuide.showChannelSetup(interaction);
      break;
    case 'setup_roles':
      await setupGuide.showRoleSetup(interaction);
      break;
    case 'setup_permissions':
      await setupGuide.showPermissionSetup(interaction);
      break;
    case 'setup_configuration':
      await setupGuide.showConfigurationSetup(interaction);
      break;
    case 'setup_guide_back':
      await setupGuide.showSetupGuide(interaction);
      break;
    default:
      await interaction.reply({
        content: '❌ Unknown setup guide action.',
        flags: MessageFlags.Ephemeral
      });
  }
}

/**
 * Handle admin movie action buttons
 */
async function handleAdminMovieButtons(interaction, customId) {
  const { permissions } = require('../services');
  const database = require('../database');
  const adminMirror = require('../services/admin-mirror');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this action.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const [action, movieId] = customId.split(':');
  const guildId = interaction.guild.id;

  try {
    switch (action) {
      case 'admin_schedule':
        await handleScheduleMovie(interaction, guildId, movieId);
        break;
      case 'admin_ban':
        await handleBanMovie(interaction, guildId, movieId);
        break;
      case 'admin_unban':
        await handleUnbanMovie(interaction, guildId, movieId);
        break;
      case 'admin_watched':
        await handleMarkWatched(interaction, guildId, movieId);
        break;
      case 'admin_details':
        await handleMovieDetails(interaction, guildId, movieId);
        break;
      case 'admin_pick_winner':
        await handlePickWinner(interaction, guildId, movieId);
        break;
      case 'admin_choose_winner':
        await handleChooseWinner(interaction, guildId, movieId);
        break;
      case 'admin_skip_vote':
        await handleSkipToNext(interaction, guildId, movieId);
        break;
      case 'admin_remove':
        await handleRemoveSuggestion(interaction, guildId, movieId);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown admin action.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Error handling admin movie button:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the admin action.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle scheduling a movie from admin panel
 */
async function handleScheduleMovie(interaction, guildId, movieId) {
  const database = require('../database');
  const sessions = require('../services/sessions');

  try {
    // Get movie details
    const movie = await database.getMovieByMessageId(movieId);
    if (!movie) {
      await interaction.reply({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Update movie status to scheduled
    await database.updateMovieStatus(movieId, 'scheduled');

    // Create a movie session
    const sessionData = {
      guildId: guildId,
      movieTitle: movie.title,
      scheduledBy: interaction.user.id,
      movieMessageId: movieId
    };

    const sessionId = await sessions.createMovieSession(sessionData);

    await interaction.reply({
      content: `✅ **${movie.title}** has been scheduled! Session ID: ${sessionId}`,
      flags: MessageFlags.Ephemeral
    });

    // Update the admin message
    await updateAdminMessage(interaction, movie);

  } catch (error) {
    console.error('Error scheduling movie:', error);
    await interaction.reply({
      content: '❌ Failed to schedule movie.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle banning a movie from admin panel
 */
async function handleBanMovie(interaction, guildId, movieId) {
  const database = require('../database');

  try {
    // Get movie details
    const movie = await database.getMovieByMessageId(movieId);
    if (!movie) {
      await interaction.reply({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Ban the movie
    const success = await database.banMovie(guildId, movie.title);
    if (success) {
      await interaction.reply({
        content: `🚫 **${movie.title}** has been banned and cannot be recommended again.`,
        flags: MessageFlags.Ephemeral
      });

      // Update the admin message
      movie.is_banned = true;
      movie.status = 'banned';
      await updateAdminMessage(interaction, movie);
    } else {
      await interaction.reply({
        content: '❌ Failed to ban movie.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('Error banning movie:', error);
    await interaction.reply({
      content: '❌ Failed to ban movie.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle unbanning a movie from admin panel
 */
async function handleUnbanMovie(interaction, guildId, movieId) {
  const database = require('../database');

  try {
    // Get movie details
    const movie = await database.getMovieByMessageId(movieId);
    if (!movie) {
      await interaction.reply({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Unban the movie
    const success = await database.unbanMovie(guildId, movie.title);
    if (success) {
      await interaction.reply({
        content: `✅ **${movie.title}** has been unbanned and can be recommended again.`,
        flags: MessageFlags.Ephemeral
      });

      // Update the admin message
      movie.is_banned = false;
      movie.status = 'pending';
      await updateAdminMessage(interaction, movie);
    } else {
      await interaction.reply({
        content: '❌ Failed to unban movie.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('Error unbanning movie:', error);
    await interaction.reply({
      content: '❌ Failed to unban movie.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle marking a movie as watched from admin panel
 */
async function handleMarkWatched(interaction, guildId, movieId) {
  const database = require('../database');

  try {
    // Update movie status to watched
    const success = await database.updateMovieStatus(movieId, 'watched');
    if (success) {
      const movie = await database.getMovieByMessageId(movieId);
      await interaction.reply({
        content: `✅ **${movie.title}** has been marked as watched!`,
        flags: MessageFlags.Ephemeral
      });

      // Update the admin message
      movie.status = 'watched';
      await updateAdminMessage(interaction, movie);
    } else {
      await interaction.reply({
        content: '❌ Failed to mark movie as watched.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('Error marking movie as watched:', error);
    await interaction.reply({
      content: '❌ Failed to mark movie as watched.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle showing movie details from admin panel
 */
async function handleMovieDetails(interaction, guildId, movieId) {
  const database = require('../database');

  try {
    const movie = await database.getMovieByMessageId(movieId);
    if (!movie) {
      await interaction.reply({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Get vote counts with voter details
    const voteCounts = await database.getVoteCounts(movieId);

    // Parse IMDb data if available
    let imdbData = null;
    if (movie.imdb_data) {
      try {
        imdbData = typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
      } catch (error) {
        console.warn('Error parsing IMDb data:', error);
      }
    }

    // Create detailed embed
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(`📋 ${movie.title}`)
      .setColor(0x5865f2)
      .addFields(
        { name: '🎭 Status', value: movie.status || 'pending', inline: true },
        { name: '📺 Platform', value: movie.where_to_watch || 'Unknown', inline: true },
        { name: '👤 Recommended by', value: `<@${movie.recommended_by}>`, inline: true },
        { name: '🗳️ Vote Summary', value: `👍 ${voteCounts.up} | 👎 ${voteCounts.down}`, inline: true },
        { name: '📅 Added', value: movie.created_at ? new Date(movie.created_at).toLocaleDateString() : 'Unknown', inline: true }
      );

    // Add voter details if there are any votes
    if (voteCounts.voters.up.length > 0) {
      const upVoters = voteCounts.voters.up.map(userId => `<@${userId}>`).join(', ');
      embed.addFields({ name: '👍 Upvoted by', value: upVoters.length > 1024 ? upVoters.substring(0, 1021) + '...' : upVoters, inline: false });
    }

    if (voteCounts.voters.down.length > 0) {
      const downVoters = voteCounts.voters.down.map(userId => `<@${userId}>`).join(', ');
      embed.addFields({ name: '👎 Downvoted by', value: downVoters.length > 1024 ? downVoters.substring(0, 1021) + '...' : downVoters, inline: false });
    }

    if (movie.description) {
      embed.addFields({ name: '📝 Description', value: movie.description.substring(0, 1024), inline: false });
    }

    if (imdbData) {
      if (imdbData.Year) embed.addFields({ name: '📅 Year', value: imdbData.Year, inline: true });
      if (imdbData.Runtime) embed.addFields({ name: '⏱️ Runtime', value: imdbData.Runtime, inline: true });
      if (imdbData.Genre) embed.addFields({ name: '🎬 Genre', value: imdbData.Genre, inline: true });
      if (imdbData.Director) embed.addFields({ name: '🎬 Director', value: imdbData.Director, inline: false });
      if (imdbData.imdbRating) embed.addFields({ name: '⭐ IMDb Rating', value: `${imdbData.imdbRating}/10`, inline: true });
    }

    if (movie.is_banned) {
      embed.addFields({ name: '🚫 Status', value: 'This movie is banned', inline: false });
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error showing movie details:', error);
    await interaction.reply({
      content: '❌ Failed to load movie details.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle picking a movie as winner (new workflow)
 */
async function handlePickWinner(interaction, guildId, movieId) {
  const database = require('../database');
  const { EmbedBuilder } = require('discord.js');

  try {
    // Defer the interaction immediately to prevent timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    // Get the movie - first try by message ID, then by finding from the interaction message
    let movie = await database.getMovieByMessageId(movieId);

    if (!movie) {
      // Try to get movie info from the admin message embed
      const adminMessage = interaction.message;
      if (adminMessage && adminMessage.embeds.length > 0) {
        const movieTitle = adminMessage.embeds[0].title?.replace('🎬 ', '');
        if (movieTitle) {
          // Find movie by title in the guild
          const allMovies = await database.getMoviesByGuild(guildId);
          movie = allMovies.find(m => m.title === movieTitle && ['pending', 'planned'].includes(m.status));
        }
      }
    }

    if (!movie) {
      await interaction.editReply({
        content: '❌ Movie not found. Please try syncing the channels first.'
      });
      return;
    }

    // Get all movies in the guild for vote breakdown
    const allMovies = await database.getMoviesByStatus(guildId, 'pending', 50);
    const plannedMovies = await database.getMoviesByStatus(guildId, 'planned', 50);
    const allVotingMovies = [...allMovies, ...plannedMovies];

    // Get vote details for all movies
    const voteBreakdown = [];
    for (const votingMovie of allVotingMovies) {
      const voteCounts = await database.getVoteCounts(votingMovie.message_id);
      voteBreakdown.push({
        title: votingMovie.title,
        upVotes: voteCounts.up,
        downVotes: voteCounts.down,
        score: voteCounts.up - voteCounts.down,
        isWinner: votingMovie.message_id === movieId
      });
    }

    // Sort by score (highest first)
    voteBreakdown.sort((a, b) => b.score - a.score);

    // Update winner movie to scheduled
    await database.updateMovieStatus(movieId, 'scheduled');

    // Create Discord event for the winner
    let eventCreated = false;
    try {
      const discordEvents = require('../services/discord-events');

      // Parse IMDb data for event description
      let imdbData = null;
      if (movie.imdb_data) {
        try {
          imdbData = typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
        } catch (error) {
          console.warn('Error parsing IMDb data for event:', error);
        }
      }

      const eventData = {
        name: `Movie Night: ${movie.title}`,
        description: `🏆 Winner: ${movie.title}\n📺 Platform: ${movie.where_to_watch || 'TBD'}\n👤 Recommended by: <@${movie.recommended_by}>\n\n${imdbData?.Plot || 'Join us for movie night!'}`,
        scheduledStartTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
        entityType: 3, // External event
        privacyLevel: 2 // Guild only
      };

      await discordEvents.createDiscordEvent(interaction.guild, eventData);
      eventCreated = true;
    } catch (error) {
      console.warn('Error creating Discord event:', error.message);
    }

    // Clear all movie posts and threads from both channels
    const config = await database.getGuildConfig(guildId);

    // Clear voting channel manually (don't use handleCleanupPurge as it tries to reply)
    if (config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          // Clear all movie messages and threads
          const messages = await votingChannel.messages.fetch({ limit: 100 });
          const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);

          for (const [messageId, message] of botMessages) {
            try {
              await message.delete();
            } catch (error) {
              console.warn(`Failed to delete voting message ${messageId}:`, error.message);
            }
          }

          // Clear threads
          const threads = await votingChannel.threads.fetchActive();
          for (const [threadId, thread] of threads.threads) {
            try {
              await thread.delete();
            } catch (error) {
              console.warn(`Failed to delete thread ${threadId}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.warn('Error clearing voting channel:', error.message);
      }
    }

    // Clear admin channel
    if (config.admin_channel_id) {
      try {
        const adminChannel = await interaction.client.channels.fetch(config.admin_channel_id);
        if (adminChannel) {
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
        }
      } catch (error) {
        console.warn('Error clearing admin channel:', error.message);
      }
    }

    // Create winner announcement in voting channel
    if (config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          // Parse IMDb data for announcement
          let imdbData = null;
          if (movie.imdb_data) {
            try {
              imdbData = typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
            } catch (error) {
              console.warn('Error parsing IMDb data:', error);
            }
          }

          // Build description with event link if available
          let winnerDescription = `**${movie.title}** has been selected for our next movie night!`;

          // Add event link if available
          const activeSession = await database.getActiveVotingSession(guildId);
          if (activeSession && activeSession.discord_event_id) {
            winnerDescription += `\n\n📅 [**Join the Discord Event**](https://discord.com/events/${guildId}/${activeSession.discord_event_id}) to RSVP for movie night!`;
          }

          const winnerEmbed = new EmbedBuilder()
            .setTitle('🏆 Movie Night Winner Announced!')
            .setDescription(winnerDescription)
            .setColor(0xffd700)
            .addFields(
              { name: '📺 Platform', value: movie.where_to_watch || 'TBD', inline: true },
              { name: '👤 Recommended by', value: `<@${movie.recommended_by}>`, inline: true }
            );

          if (imdbData) {
            if (imdbData.Year) winnerEmbed.addFields({ name: '📅 Year', value: imdbData.Year, inline: true });
            if (imdbData.Runtime) winnerEmbed.addFields({ name: '⏱️ Runtime', value: imdbData.Runtime, inline: true });
            if (imdbData.Genre) winnerEmbed.addFields({ name: '🎬 Genre', value: imdbData.Genre, inline: true });
            if (imdbData.imdbRating) winnerEmbed.addFields({ name: '⭐ IMDb Rating', value: `${imdbData.imdbRating}/10`, inline: true });
            if (imdbData.Plot) winnerEmbed.addFields({ name: '📖 Plot', value: imdbData.Plot.substring(0, 1024), inline: false });
          }

          // Add vote breakdown
          const voteBreakdownText = voteBreakdown.map((movie, index) => {
            const position = index + 1;
            const trophy = movie.isWinner ? '🏆 ' : `${position}. `;
            return `${trophy}**${movie.title}** - ${movie.upVotes}👍 ${movie.downVotes}👎 (Score: ${movie.score})`;
          }).join('\n');

          winnerEmbed.addFields({ name: '📊 Final Vote Results', value: voteBreakdownText, inline: false });

          if (eventCreated) {
            winnerEmbed.addFields({ name: '📅 Event', value: 'Discord event has been created! Check the server events.', inline: false });
          }

          winnerEmbed.setFooter({ text: 'Thanks to everyone who voted!' });

          // Mention notification role if configured
          let content = '';
          if (config.notification_role_id) {
            content = `<@&${config.notification_role_id}>`;
          }

          await votingChannel.send({
            content: content,
            embeds: [winnerEmbed]
          });
        }
      } catch (error) {
        console.warn('Error posting winner announcement:', error.message);
      }
    }

    // Update Discord event with winner information
    try {
      const activeSession = await database.getActiveVotingSession(guildId);
      if (activeSession && activeSession.discord_event_id) {
        console.log(`📅 Manual Pick Winner: Updating Discord event ${activeSession.discord_event_id} with winner: ${movie.title}`);
        const guild = interaction.guild;
        const event = await guild.scheduledEvents.fetch(activeSession.discord_event_id);
        if (event) {
          console.log(`📅 Found event: ${event.name}, updating with manual winner...`);

          // Get vote count for this movie
          const votes = await database.getVotesByMessageId(movie.message_id);
          const upVotes = votes.filter(v => v.vote_type === 'up').length;
          const downVotes = votes.filter(v => v.vote_type === 'down').length;
          const totalScore = upVotes - downVotes;

          // Get movie details for event update
          const imdbData = movie.imdb_id ? await require('../services/imdb').getMovieDetails(movie.imdb_id) : null;

          let updatedDescription = `🏆 **WINNER SELECTED: ${movie.title}**\n\n`;
          if (imdbData && imdbData.Plot && imdbData.Plot !== 'N/A') {
            updatedDescription += `📖 ${imdbData.Plot}\n\n`;
          }
          updatedDescription += `🗳️ Final Score: ${totalScore} (${upVotes} 👍 - ${downVotes} 👎)\n`;
          updatedDescription += `👤 Selected by admin\n`;
          updatedDescription += `📅 Join us for movie night!\n\n🔗 SESSION_UID:${activeSession.id}`;

          await event.edit({
            name: `🎬 ${activeSession.name} - ${movie.title}`,
            description: updatedDescription
          });

          console.log(`📅 Successfully updated Discord event with manual winner: ${movie.title} (Score: ${totalScore})`);
        } else {
          console.warn(`📅 Discord event not found: ${activeSession.discord_event_id}`);
        }
      } else {
        console.warn('📅 No active session or Discord event ID found for manual winner event update');
      }
    } catch (error) {
      console.warn('Error updating Discord event with winner:', error.message);
    }

    await interaction.editReply({
      content: `🏆 **${movie.title}** has been selected as the winner! Announcement posted, channels cleared, and event updated.`
    });

    console.log(`🏆 Movie ${movie.title} picked as winner by ${interaction.user.tag}`);

  } catch (error) {
    console.error('Error picking winner:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Failed to pick winner.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.editReply({
        content: '❌ Failed to pick winner.'
      });
    }
  }
}

/**
 * Handle choosing a movie as winner of voting session
 */
async function handleChooseWinner(interaction, guildId, movieId) {
  const database = require('../database');

  try {
    // Get the active voting session
    const activeSession = await database.getActiveVotingSession(guildId);
    if (!activeSession) {
      await interaction.reply({
        content: '❌ No active voting session found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Get the movie
    const movie = await database.getMovieByMessageId(movieId);
    if (!movie) {
      await interaction.reply({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Finalize the voting session with this movie as winner
    const success = await database.finalizeVotingSession(activeSession.id, movieId);
    if (!success) {
      await interaction.reply({
        content: '❌ Failed to finalize voting session.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Mark non-winning movies for next session
    const winnerMovieId = movie.id;
    await database.markMoviesForNextSession(guildId, winnerMovieId);

    // Update Discord event with winner
    if (activeSession.discord_event_id) {
      try {
        const discordEvents = require('../services/discord-events');
        const updatedName = activeSession.name.replace('TBD (Voting in Progress)', movie.title);
        await discordEvents.updateDiscordEvent(interaction.guild, activeSession.discord_event_id, {
          name: updatedName,
          description: `Winner: ${movie.title}\n${activeSession.description || ''}`
        });
      } catch (error) {
        console.warn('Error updating Discord event:', error.message);
      }
    }

    await interaction.reply({
      content: `🏆 **${movie.title}** has been chosen as the winner! The voting session is now complete.`,
      flags: MessageFlags.Ephemeral
    });

    // Sync channels to update the display
    try {
      const adminControls = require('../services/admin-controls');
      await adminControls.handleSyncChannel(interaction);
    } catch (error) {
      console.warn('Error syncing channels after choosing winner:', error.message);
    }

    console.log(`🏆 Movie ${movie.title} chosen as winner for session ${activeSession.id}`);

  } catch (error) {
    console.error('Error choosing winner:', error);
    await interaction.reply({
      content: '❌ Failed to choose winner.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle skipping a movie to next session
 */
async function handleSkipToNext(interaction, guildId, movieId) {
  const database = require('../database');

  try {
    // Get the movie
    const movie = await database.getMovieByMessageId(movieId);
    if (!movie) {
      await interaction.reply({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Move movie to next session (removes from current voting)
    const success = await database.moveMovieToNextSession(movieId);
    if (!success) {
      await interaction.reply({
        content: '❌ Failed to skip movie to next session.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({
      content: `⏭️ **${movie.title}** has been skipped to the next session. Votes have been reset.`,
      flags: MessageFlags.Ephemeral
    });

    // Remove from admin channel
    try {
      const adminMirror = require('../services/admin-mirror');
      await adminMirror.removeMovieFromAdminChannel(interaction.client, guildId, movieId);
    } catch (error) {
      console.warn('Error removing movie from admin channel:', error.message);
    }

    // Remove from voting channel
    try {
      const config = await database.getGuildConfig(guildId);
      if (config && config.movie_channel_id) {
        const cleanup = require('../services/cleanup');
        await cleanup.removeMoviePost(interaction.client, config.movie_channel_id, movieId);
      }
    } catch (error) {
      console.warn('Error removing movie from voting channel:', error.message);
    }

    console.log(`⏭️ Movie ${movie.title} skipped to next session`);

  } catch (error) {
    console.error('Error skipping movie to next session:', error);
    await interaction.reply({
      content: '❌ Failed to skip movie to next session.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Update the admin message with new movie status
 */
async function updateAdminMessage(interaction, movie) {
  try {
    const adminMirror = require('../services/admin-mirror');
    const database = require('../database');

    // Get updated vote counts
    const voteCounts = await database.getVoteCounts(movie.message_id);

    // Create updated embed and buttons
    const embed = adminMirror.createAdminMovieEmbed(movie, voteCounts);
    const components = adminMirror.createAdminActionButtons(movie.message_id, movie.status, movie.is_banned);

    // Update the message
    await interaction.message.edit({
      embeds: [embed],
      components: components
    });

  } catch (error) {
    console.error('Error updating admin message:', error);
  }
}

/**
 * Handle admin control panel buttons
 */
async function handleAdminControlButtons(interaction, customId) {
  const { permissions } = require('../services');
  const adminControls = require('../services/admin-controls');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this action.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    switch (customId) {
      case 'admin_ctrl_sync':
        await adminControls.handleSyncChannel(interaction);
        break;
      case 'admin_ctrl_purge':
        await adminControls.handlePurgeQueue(interaction);
        break;
      case 'admin_ctrl_stats':
        await adminControls.handleGuildStats(interaction);
        break;
      case 'admin_ctrl_deep_purge':
        await handleDeepPurgeInitiation(interaction);
        break;
      case 'admin_ctrl_plan_session':
        await handlePlanVotingSession(interaction);
        break;
      case 'admin_ctrl_banned_list':
        await adminControls.handleBannedMoviesList(interaction);
        break;
      case 'admin_ctrl_refresh':
        await adminControls.handleRefreshPanel(interaction);
        break;
      case 'admin_ctrl_cancel_session':
        await handleCancelSession(interaction);
        break;
      case 'admin_ctrl_reschedule_session':
        await handleRescheduleSession(interaction);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown admin control action.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Error handling admin control button:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the admin control action.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle planning a new voting session
 */
async function handlePlanVotingSession(interaction) {
  const votingSessions = require('../services/voting-sessions');

  try {
    await votingSessions.startVotingSessionCreation(interaction);
  } catch (error) {
    console.error('Error planning voting session:', error);
    await interaction.reply({
      content: '❌ An error occurred while planning the voting session.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle deep purge initiation
 */
async function handleDeepPurgeInitiation(interaction) {
  const deepPurge = require('../services/deep-purge');

  const embed = deepPurge.createDeepPurgeSelectionEmbed(interaction.guild.name);
  const components = deepPurge.createDeepPurgeSelectionMenu();

  await interaction.reply({
    embeds: [embed],
    components: components,
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Handle canceling an active session
 */
async function handleCancelSession(interaction) {
  const database = require('../database');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  try {
    const activeSession = await database.getActiveVotingSession(interaction.guild.id);
    if (!activeSession) {
      await interaction.reply({
        content: '❌ No active voting session to cancel.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Show confirmation dialog
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Cancel Voting Session')
      .setDescription(`Are you sure you want to cancel **${activeSession.name}**?\n\nThis will:\n• Delete the Discord event\n• Clear all movie recommendations\n• Reset the voting channel\n\n**This action cannot be undone.**`)
      .setColor(0xed4245);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_cancel_session:${activeSession.id}`)
          .setLabel('✅ Yes, Cancel Session')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_cancel_session')
          .setLabel('❌ No, Keep Session')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error handling cancel session:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the cancel request.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle rescheduling an active session
 */
async function handleRescheduleSession(interaction) {
  const database = require('../database');

  try {
    const activeSession = await database.getActiveVotingSession(interaction.guild.id);
    if (!activeSession) {
      await interaction.reply({
        content: '❌ No active voting session to reschedule.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // For now, show a simple message - this can be enhanced later with a modal
    await interaction.reply({
      content: '🚧 **Reschedule Session**\n\nThis feature is coming soon! For now, you can:\n1. Cancel the current session\n2. Plan a new session with the desired date/time',
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error handling reschedule session:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the reschedule request.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle removing a movie suggestion completely
 */
async function handleRemoveSuggestion(interaction, guildId, movieId) {
  const database = require('../database');

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get the movie
    let movie = await database.getMovieByMessageId(movieId);

    if (!movie) {
      // Try to get movie info from the admin message embed
      const adminMessage = interaction.message;
      if (adminMessage && adminMessage.embeds.length > 0) {
        const movieTitle = adminMessage.embeds[0].title?.replace('🎬 ', '');
        if (movieTitle) {
          // Find movie by title in the guild
          const allMovies = await database.getMoviesByGuild(guildId);
          movie = allMovies.find(m => m.title === movieTitle && ['pending', 'planned'].includes(m.status));
        }
      }
    }

    if (!movie) {
      await interaction.editReply({
        content: '❌ Movie not found. Please try syncing the channels first.'
      });
      return;
    }

    // Remove from database completely
    await database.deleteMovie(movie.message_id);

    // Remove from voting channel
    const config = await database.getGuildConfig(guildId);
    if (config && config.movie_channel_id) {
      try {
        const cleanup = require('../services/cleanup');
        await cleanup.removeMoviePost(interaction.client, config.movie_channel_id, movie.message_id);
      } catch (error) {
        console.warn('Error removing movie from voting channel:', error.message);
      }
    }

    // Remove from admin channel (this message)
    try {
      await interaction.message.delete();
    } catch (error) {
      console.warn('Error removing admin message:', error.message);
    }

    await interaction.editReply({
      content: `✅ **${movie.title}** has been completely removed from the queue.`
    });

    console.log(`🗑️ Movie ${movie.title} completely removed by ${interaction.user.tag}`);

  } catch (error) {
    console.error('Error removing suggestion:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Failed to remove suggestion.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.editReply({
        content: '❌ Failed to remove suggestion.'
      });
    }
  }
}

/**
 * Handle cancel session confirmation
 */
async function handleCancelSessionConfirmation(interaction) {
  const database = require('../database');
  const customId = interaction.customId;

  try {
    if (customId === 'cancel_cancel_session') {
      await interaction.update({
        content: '✅ Session cancellation cancelled.',
        embeds: [],
        components: []
      });
      return;
    }

    // Extract session ID from customId
    const sessionId = customId.split(':')[1];

    await interaction.deferUpdate();

    // Get the session
    const session = await database.getVotingSessionById(sessionId);
    if (!session) {
      await interaction.editReply({
        content: '❌ Session not found.',
        embeds: [],
        components: []
      });
      return;
    }

    // Delete Discord event if it exists
    if (session.discord_event_id) {
      try {
        const guild = interaction.guild;
        const event = await guild.scheduledEvents.fetch(session.discord_event_id);
        if (event) {
          await event.delete();
          console.log(`🗑️ Deleted Discord event: ${event.name} (${session.discord_event_id})`);
        } else {
          console.warn(`Discord event not found: ${session.discord_event_id}`);
        }
      } catch (error) {
        console.warn(`Error deleting Discord event ${session.discord_event_id}:`, error.message);
        // Try to delete it anyway from the database
      }
    }

    // Mark non-winning movies for next session before deleting session
    await database.markMoviesForNextSession(interaction.guild.id);

    // Delete the session and all associated data
    await database.deleteVotingSession(sessionId);

    // Clear voting channel
    const config = await database.getGuildConfig(interaction.guild.id);
    if (config && config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          // Clear all bot messages
          const messages = await votingChannel.messages.fetch({ limit: 100 });
          const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);

          for (const [messageId, message] of botMessages) {
            try {
              await message.delete();
            } catch (error) {
              console.warn(`Failed to delete message ${messageId}:`, error.message);
            }
          }

          // Clear threads
          const threads = await votingChannel.threads.fetchActive();
          for (const [threadId, thread] of threads.threads) {
            try {
              await thread.delete();
            } catch (error) {
              console.warn(`Failed to delete thread ${threadId}:`, error.message);
            }
          }

          // Add no session message
          const cleanup = require('../services/cleanup');
          await cleanup.ensureQuickActionAtBottom(votingChannel);
        }
      } catch (error) {
        console.warn('Error clearing voting channel:', error.message);
      }
    }

    // Clear admin channel (except control panel)
    if (config && config.admin_channel_id) {
      try {
        const adminChannel = await interaction.client.channels.fetch(config.admin_channel_id);
        if (adminChannel) {
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

          // Refresh admin control panel
          const adminControls = require('../services/admin-controls');
          await adminControls.ensureAdminControlPanel(interaction.client, interaction.guild.id);
        }
      } catch (error) {
        console.warn('Error clearing admin channel:', error.message);
      }
    }

    await interaction.editReply({
      content: `✅ **Session cancelled successfully!**\n\n🗑️ **${session.name}** has been cancelled and all associated data has been cleared.`,
      embeds: [],
      components: []
    });

    console.log(`❌ Session ${session.name} cancelled by ${interaction.user.tag}`);

  } catch (error) {
    console.error('Error handling cancel session confirmation:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while cancelling the session.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.editReply({
        content: '❌ An error occurred while cancelling the session.',
        embeds: [],
        components: []
      });
    }
  }
}

module.exports = {
  handleButton
};
