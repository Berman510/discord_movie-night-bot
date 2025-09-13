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
const ephemeralManager = require('../utils/ephemeral-manager');
const configCheck = require('../utils/config-check');
const guidedSetup = require('../services/guided-setup');
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
      // Voting is role-gated: Admins/Moderators or users with configured Voting Roles
      const allowed = await permissions.checkCanVote(interaction);
      if (!allowed) {
        await interaction.reply({ content: '❌ You need a Voting role (or Moderator/Admin) to vote.', flags: MessageFlags.Ephemeral });
        return;
      }
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



    // Admin movie action buttons
    if (customId.startsWith('admin_') && !customId.startsWith('admin_ctrl_')) {
      await handleAdminMovieButtons(interaction, customId);
      return;
    }

    // Deep purge submit/cancel buttons
    if (customId === 'deep_purge_submit' || customId.startsWith('deep_purge_submit:')) {
      await handleDeepPurgeSubmit(interaction);
      return;
    }

    if (customId === 'deep_purge_cancel') {
      await handleDeepPurgeCancel(interaction);
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
        customId === 'session_back_to_timezone' ||
        customId === 'session_back_to_movie') {
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

    // Configuration button
    if (customId === 'open_configuration') {
      await configCheck.handleConfigurationButton(interaction);
      return;
    }

    // Configuration action buttons
    if (customId.startsWith('config_')) {
      await handleConfigurationAction(interaction, customId);
      return;
    }

    // Guided setup buttons
    if (customId.startsWith('setup_')) {
      await handleGuidedSetupButton(interaction, customId);
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
      // First check if the movie exists in the database
      const movie = await database.getMovieById(msgId, interaction.guild.id);
      if (!movie) {
        console.error(`🚨 VOTING ERROR: Movie with message ID ${msgId} not found in database for guild ${interaction.guild.id}`);
        await interaction.followUp({
          content: '❌ This movie is not found in the database. Please try refreshing the channel.',
          ephemeral: true
        });
        return;
      }

      // Lazy backfill: if this is a forum thread and DB thread_id is missing, fill it from the interaction channel
      try {
        const ch = interaction.channel;
        const isThread = typeof ch?.isThread === 'function' ? ch.isThread() : false;
        if (movie.channel_type === 'forum' && !movie.thread_id && isThread) {
          await database.updateMovieThreadId(msgId, ch.id);
          movie.thread_id = ch.id; // update local reference
        }
      } catch (e) {
        console.warn('Backfill thread_id on vote failed:', e?.message);
      }

      // Check current vote
      const currentVote = await database.getUserVote(msgId, userId);

      // Enforce per-session vote caps (configurable; defaults: up ~1/3, down ~1/5)
      try {
        const movieSessionId = movie.session_id;
        if (movieSessionId) {
          // Only enforce caps when attempting to add/change a vote
          if (currentVote !== action) {
            // Read guild config; default to enabled with asymmetric ratios if absent
            const config = await database.getGuildConfig(interaction.guild.id).catch(() => null);
            const enabled = config && typeof config.vote_cap_enabled !== 'undefined' ? Boolean(Number(config.vote_cap_enabled)) : true;

            if (enabled) {
              const ratioUp = config && config.vote_cap_ratio_up != null ? Number(config.vote_cap_ratio_up) : 1/3;
              const ratioDown = config && config.vote_cap_ratio_down != null ? Number(config.vote_cap_ratio_down) : 1/5;
              const minCap = config && config.vote_cap_min != null ? Math.max(1, Number(config.vote_cap_min)) : 1;

              const totalInSession = await database.countMoviesInSession(movieSessionId);
              const upCap = Math.max(minCap, Math.floor(totalInSession * ratioUp));
              const downCap = Math.max(minCap, Math.floor(totalInSession * ratioDown));

              const type = isUpvote ? 'up' : 'down';
              const used = await database.countUserVotesInSession(userId, movieSessionId, type);
              const cap = isUpvote ? upCap : downCap;

              if (used >= cap) {
                const votesInSession = await database.getUserVotesInSession(userId, movieSessionId);
                const titles = votesInSession
                  .filter(v => v.vote_type === type)
                  .map(v => v.title)
                  .filter(Boolean);

                const list = titles.length > 0 ? titles.join(' • ').slice(0, 1500) : 'None';
                const friendly = isUpvote ? `👍 upvotes` : `👎 downvotes`;

                await interaction.followUp({
                  content: `⚠️ You\'ve reached your ${friendly} limit for this voting session.\n\nSession movies: ${totalInSession}\nAllowed ${friendly}: ${cap}\nYour ${friendly}: ${used}\n\nCurrent ${friendly}: ${list}\n\nTip: Unvote one of the above to free a slot, then try again.`,
                  ephemeral: true
                });
                return;
              }
            }
          }
        }
      } catch (capError) {
        console.warn('Vote cap check failed, proceeding without cap enforcement:', capError?.message);
      }

      if (currentVote === action) {
        // Remove vote if clicking same button
        const removeSuccess = await database.removeVote(msgId, userId, interaction.guild.id);
        if (!removeSuccess) {
          console.error(`Failed to remove vote for message ${msgId} by user ${userId}`);
        }
      } else {
        // Add or change vote
        const saveSuccess = await database.saveVote(msgId, userId, action, interaction.guild.id);
        if (!saveSuccess) {
          console.error(`Failed to save vote for message ${msgId} by user ${userId}`);
          await interaction.followUp({
            content: '❌ Failed to save your vote. Please try again.',
            ephemeral: true
          });
          return;
        }
      }

      // Get updated vote counts (movie data already retrieved above)
      const voteCounts = await database.getVoteCounts(msgId);

      // Update message with new vote counts and preserve all buttons
      const { components, embeds } = require('../utils');
      const imdbData = movie && movie.imdb_data ? JSON.parse(movie.imdb_data) : null;
      const updatedEmbed = movie ? embeds.createMovieEmbed(movie, imdbData, voteCounts) : null;
      const updatedComponents = components.createVotingButtons(msgId, voteCounts.up, voteCounts.down);

      const updateData = { components: updatedComponents };
      if (updatedEmbed) {
        updateData.embeds = [updatedEmbed];
      }

      await interaction.editReply(updateData);

      // Update forum post if this is a forum channel movie
      if (movie && movie.channel_type === 'forum' && movie.thread_id) {
        try {
          const forumChannels = require('../services/forum-channels');
          const thread = await interaction.client.channels.fetch(movie.thread_id).catch(() => null);
          if (thread) {
            // For forum channels, we update the title only for major status changes
            // Vote count updates are shown in the embed to avoid spam messages
            await forumChannels.updateForumPostTitle(thread, movie.title, movie.status, voteCounts.up, voteCounts.down);
          }
        } catch (error) {
          console.warn('Error updating forum post after vote:', error.message);
        }
      }
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

    const logger = require('../utils/logger');
    logger.debug(`Voting: ${action} for message ${msgId} by user ${userId}`);

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
      await database.incrementWatchCount(msgId, interaction.guild.id);
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


    // Lazy backfill: if this is a forum thread and DB thread_id is missing, fill it from the interaction channel
    try {
      const ch = interaction.channel;
      const isThread = typeof ch?.isThread === 'function' ? ch.isThread() : false;
      if (movie.channel_type === 'forum' && !movie.thread_id && isThread) {
        await database.updateMovieThreadId(msgId, ch.id);
        movie.thread_id = ch.id;
      }
    } catch (e) {
      console.warn('Backfill thread_id on status change failed:', e?.message);
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
    // Update the original ephemeral selection message so it doesn't linger
    await interaction.update({
      content: '⏳ Creating your recommendation...',
      embeds: [],
      components: []
    });

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

    if (indexStr === 'cancel') {
      // User cancelled the submission entirely
      await interaction.update({ content: '🚫 Submission cancelled.', embeds: [], components: [] });
    } else if (indexStr === 'none') {
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

    // Auto-dismiss the updated ephemeral selector after a short delay
    setTimeout(async () => {
      try { await interaction.deleteReply(); } catch {}
    }, 3000);

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
  console.log(`🔍 DEBUG: createMovieWithoutImdb (button handler) called with title: ${title}, where: ${where}`);

  // Use the new movie creation service instead of old direct creation
  const movieCreation = require('../services/movie-creation');
  const database = require('../database');

  try {
    // Create movie using the new unified service
    const logger = require('../utils/logger');
    logger.debug(`🔍 DEBUG: About to call movieCreation.createMovieRecommendation from button handler`);
    const result = await movieCreation.createMovieRecommendation(interaction, {
      title,
      where,
      imdbId: null,
      imdbData: null
    });

    logger.debug(`🔍 DEBUG: movieCreation.createMovieRecommendation result from button handler:`, {
      hasMessage: !!result.message,
      hasThread: !!result.thread,
      movieId: result.movieId,
      messageId: result.message?.id,
      threadId: result.thread?.id
    });

    const { message, thread, movieId } = result;

    // Post to admin channel if configured (movie creation service handles database save)
    try {
      const movie = await database.getMovieByMessageId(message.id);
      if (movie) {
        const adminMirror = require('../services/admin-mirror');
        await adminMirror.postMovieToAdminChannel(interaction.client, interaction.guild.id, movie);
      }
    } catch (error) {
      console.error('Error posting to admin channel:', error);
    }

    // Success message varies by channel type
    const config = await database.getGuildConfig(interaction.guild.id);
    const movieChannel = config && config.movie_channel_id ?
      await interaction.client.channels.fetch(config.movie_channel_id) : null;

    const successMessage = thread
      ? `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added as a new forum post in ${movieChannel} for voting and discussion.`
      : `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue in ${movieChannel} for voting.`;

    await ephemeralManager.sendEphemeral(interaction, successMessage);

  } catch (error) {
    console.error('Error creating movie without IMDb:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await ephemeralManager.sendEphemeral(interaction, '❌ Error creating movie recommendation.');
      } else {
        await interaction.update({
          content: '❌ Error creating movie recommendation.',
          embeds: [],
          components: []
        });
      }
    } catch (responseError) {
      console.error('Error responding to interaction:', responseError.message);
    }
  }
}

async function createMovieWithImdb(interaction, title, where, imdbData) {
  console.log(`🔍 DEBUG: createMovieWithImdb (button handler) called with title: ${title}, where: ${where}, imdbId: ${imdbData.imdbID}`);

  // Use the new movie creation service instead of old direct creation
  const movieCreation = require('../services/movie-creation');
  const database = require('../database');
  const imdb = require('../services/imdb');

  try {
    // Fetch detailed movie info (cached)
    const detailedImdbData = await imdb.getMovieDetailsCached(imdbData.imdbID);

    // Prefer the canonical IMDb title if available
    const titleToUse = (detailedImdbData && detailedImdbData.Title) || imdbData.Title || title;

    // Create movie using the new unified service
    console.log(`🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler`);
    const result = await movieCreation.createMovieRecommendation(interaction, {
      title: titleToUse,
      where,
      imdbId: imdbData.imdbID,
      imdbData: detailedImdbData || imdbData
    });

    console.log(`🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler:`, {
      hasMessage: !!result.message,
      hasThread: !!result.thread,
      movieId: result.movieId,
      messageId: result.message?.id,
      threadId: result.thread?.id
    });

    const { message, thread, movieId } = result;

    // Post to admin channel if configured (movie creation service handles database save)
    try {
      const movie = await database.getMovieByMessageId(message.id);
      if (movie) {
        const adminMirror = require('../services/admin-mirror');
        await adminMirror.postMovieToAdminChannel(interaction.client, interaction.guild.id, movie);
      }
    } catch (error) {
      console.error('Error posting to admin channel:', error);
    }

    // Success message varies by channel type
    const config = await database.getGuildConfig(interaction.guild.id);
    const movieChannel = config && config.movie_channel_id ?
      await interaction.client.channels.fetch(config.movie_channel_id) : null;

    const successMessage = thread
      ? `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added as a new forum post in ${movieChannel} for voting and discussion.`
      : `✅ **Movie recommendation added!**\n\n🍿 **${title}** has been added to the queue in ${movieChannel} for voting.`;

    await ephemeralManager.sendEphemeral(interaction, successMessage);

  } catch (error) {
    console.error('Error creating movie with IMDb:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await ephemeralManager.sendEphemeral(interaction, '❌ Error creating movie recommendation.');
      } else {
        await interaction.update({
          content: '❌ Error creating movie recommendation.',
          embeds: [],
          components: []
        });
      }
    } catch (responseError) {
      console.error('Error responding to interaction:', responseError.message);
    }
  }
}



/**
 * Handle admin movie action buttons
 */
async function handleAdminMovieButtons(interaction, customId) {
  const { permissions } = require('../services');
  const database = require('../database');
  const adminMirror = require('../services/admin-mirror');

  // Parse first so we can gate per-action
  const [action, movieId] = customId.split(':');
  const guildId = interaction.guild.id;

  // Permission gating:
  // - Moderators: can view details and perform light actions (remove, skip)
  // - Admins: required for mutating/high-impact actions (ban/unban, pick winner, watched)
  const moderatorAllowed = new Set(['admin_details', 'admin_remove', 'admin_skip_vote']);

  if (moderatorAllowed.has(action)) {
    const canMod = await permissions.checkMovieModeratorPermission(interaction);
    if (!canMod) {
      await interaction.reply({
        content: '❌ You need Moderator or Administrator permissions to use this action.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  } else {
    const isAdmin = await permissions.checkMovieAdminPermission(interaction);
    if (!isAdmin) {
      await interaction.reply({
        content: '❌ You need Administrator permissions or a configured admin role to use this action.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

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
      case 'admin_pick_winner_confirm':
        await handlePickWinner(interaction, guildId, movieId);
        break;
      case 'admin_pick_winner_cancel':
        await interaction.reply({ content: '❌ Winner selection cancelled.', flags: MessageFlags.Ephemeral });
        break;
      case 'admin_choose_winner':
      case 'admin_choose_winner_confirm':
        await handleChooseWinner(interaction, guildId, movieId);
        break;
      case 'admin_choose_winner_cancel':
        await interaction.reply({ content: '❌ Winner selection cancelled.', flags: MessageFlags.Ephemeral });
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

    // Update forum post if this is a forum channel movie
    if (movie.channel_type === 'forum' && movie.thread_id) {
      try {
        const forumChannels = require('../services/forum-channels');
        const thread = await interaction.client.channels.fetch(movie.thread_id).catch(() => null);
        if (thread) {
          await forumChannels.updateForumPostContent(thread, movie, 'scheduled');
        }
      } catch (error) {
        console.warn('Error updating forum post for winner:', error.message);
      }
    }

    // Update forum post if this is a forum channel movie
    if (movie.channel_type === 'forum' && movie.thread_id) {
      try {
        const forumChannels = require('../services/forum-channels');
        const thread = await interaction.client.channels.fetch(movie.thread_id).catch(() => null);
        if (thread) {
          await forumChannels.updateForumPostContent(thread, movie, 'scheduled');
        }
      } catch (error) {
        console.warn('Error updating forum post for winner:', error.message);
      }
    }

    // Create a movie session
    const sessionData = {
      guildId: guildId,
      movieTitle: movie.title,
      scheduledBy: interaction.user.id,
      movieMessageId: movieId
    };

    const sessionId = await database.createMovieSession(sessionData);

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

    // Confirmation gate: if this is the initial click, show a confirmation UI and exit.
    try {
      const isConfirm = interaction.customId && interaction.customId.startsWith('admin_pick_winner_confirm');
      if (!isConfirm) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        // Try to resolve movie title for the confirmation prompt
        let movieTitle = null;
        try {
          const m = await database.getMovieByMessageId(movieId);
          if (m) movieTitle = m.title;
        } catch (e) {}
        if (!movieTitle && interaction.message && interaction.message.embeds?.length > 0) {
          movieTitle = interaction.message.embeds[0].title?.replace('\ud83c\udfac ', '') || 'this movie';
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`admin_pick_winner_confirm:${movieId}`)
            .setLabel('Yes, pick winner')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`admin_pick_winner_cancel:${movieId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content: `\u26a0\ufe0f Are you sure you want to pick ${movieTitle || 'this movie'} as the winner? This will finalize the session and clear voting posts.`,
          components: [row],
          flags: MessageFlags.Ephemeral
        });
        // Auto-dismiss confirmation after 30s in case user navigates away
        setTimeout(async () => { try { await interaction.deleteReply(); } catch (_) {} }, 30000);
        return;
      }
    } catch (e) {
      // If confirmation UI fails for any reason, fall back to existing flow
    }

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

    // Clear voting channel based on channel type
    if (config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('../services/forum-channels');

          if (forumChannels.isForumChannel(votingChannel)) {
            // Forum channel - remove ALL voting threads (including the winner recommendation), then post winner announcement
            await forumChannels.clearForumMoviePosts(votingChannel, null);
            await forumChannels.postForumWinnerAnnouncement(votingChannel, movie, 'Movie Night', { event: null, selectedByUserId: interaction.user.id });

            // Reset pinned post since session is ending
            await forumChannels.ensureRecommendationPost(votingChannel, null);
          } else {
            // Text channel - delete messages and threads
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

          // Always include selector and winner votes
          winnerEmbed.addFields({ name: '👑 Selected by', value: `<@${interaction.user.id}>`, inline: true });
          const thisMovie = voteBreakdown.find(v => v.isWinner);
          if (thisMovie) {
            winnerEmbed.addFields({ name: '📊 Winner Votes', value: `${thisMovie.upVotes} 👍 - ${thisMovie.downVotes} 👎 (Score: ${thisMovie.score})`, inline: false });
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

          // Check if this is a forum channel
          const forumChannels = require('../services/forum-channels');
          if (forumChannels.isForumChannel(votingChannel)) {
            // Forum channels handle winner announcements differently
            // This is already handled above in the forum-specific section
            logger.debug('Skipping text channel winner announcement for forum channel');
          } else {
            // Text channel - send winner announcement
            await votingChannel.send({
              content: content,
              embeds: [winnerEmbed]
            });
          }
        }
      } catch (error) {
        const logger = require('../utils/logger');
        logger.warn('Error posting winner announcement:', error.message);
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

          // Get movie details for event update (cached)
          const imdbData = movie.imdb_id ? await require('../services/imdb').getMovieDetailsCached(movie.imdb_id) : null;

          let updatedDescription = `🏆 **WINNER SELECTED: ${movie.title}**\n\n`;
          let posterBuffer = null;
          if (imdbData && imdbData.Plot && imdbData.Plot !== 'N/A') {
            updatedDescription += `📖 ${imdbData.Plot}\n\n`;
          }
          updatedDescription += `🗳️ Final Score: ${totalScore} (${upVotes} 👍 - ${downVotes} 👎)\n`;
          updatedDescription += `👤 Selected by: <@${interaction.user.id}>\n`;
          if (imdbData && imdbData.Poster && imdbData.Poster !== 'N/A') {
            updatedDescription += `🖼️ Poster: ${imdbData.Poster}\n`;
            try {
              const res = await fetch(imdbData.Poster);
              if (res.ok) {
                const len = Number(res.headers.get('content-length') || '0');
                if (!len || len < 8000000) {
                  const arr = await res.arrayBuffer();
                  posterBuffer = Buffer.from(arr);
                  try {
                    const { composeEventCoverFromPoster } = require('../services/image-utils');
                    posterBuffer = await composeEventCoverFromPoster(posterBuffer);
                  } catch (composeErr) {
                    console.warn('Poster composition failed (manual), will upload raw poster:', composeErr.message);
                  }
                }
              }
            } catch (imgErr) {
              console.warn('Could not fetch poster image for event cover (manual):', imgErr.message);
            }
          }
          updatedDescription += `📅 Join us for movie night!\n\n🔗 SESSION_UID:${activeSession.id}`;

          const editPayload = {
            name: `🎬 ${activeSession.name} - ${movie.title}`,
            description: updatedDescription
          };
          if (posterBuffer) {
            editPayload.image = posterBuffer;
          }
          await event.edit(editPayload);

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

    // Ensure "No Active Voting Session" message is posted in voting channel
    try {
      const config = await database.getGuildConfig(interaction.guild.id);
      if (config && config.movie_channel_id) {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('../services/forum-channels');
          const cleanup = require('../services/cleanup');
          if (forumChannels.isForumChannel(votingChannel)) {
            await forumChannels.ensureRecommendationPost(votingChannel, null);
          } else {
            await cleanup.ensureQuickActionPinned(votingChannel);
          }
        }
      }
    } catch (error) {
      const logger = require('../utils/logger');
      logger.warn('Error posting no session message after manual winner selection:', error.message);
    }

    await interaction.editReply({
      content: `🏆 **${movie.title}** has been selected as the winner! Announcement posted, channels cleared, and event updated.`
    });
    setTimeout(async () => { try { await interaction.deleteReply(); } catch (_) {} }, 8000);

    // Refresh admin control panel to expose Cancel/Reschedule until event start
    try {
      const adminControls = require('../services/admin-controls');
      await adminControls.ensureAdminControlPanel(interaction.client, interaction.guild.id);
    } catch (e) {
      const logger = require('../utils/logger');
      logger.warn('Error refreshing admin control panel after picking winner:', e.message);
    }

    const logger = require('../utils/logger');
    logger.info(`🏆 Movie ${movie.title} picked as winner by ${interaction.user.tag}`);

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


  // Confirmation gate for choose winner: prompt before finalizing
  try {
    const isConfirm = interaction.customId && interaction.customId.startsWith('admin_choose_winner_confirm');
    if (!isConfirm) {
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      let movieTitle = null;
      try {
        const m = await database.getMovieByMessageId(movieId);
        if (m) movieTitle = m.title;
      } catch (e) {}
      if (!movieTitle && interaction.message && interaction.message.embeds?.length > 0) {
        movieTitle = interaction.message.embeds[0].title?.replace('\ud83c\udfac ', '') || 'this movie';
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_choose_winner_confirm:${movieId}`)
          .setLabel('Yes, choose winner')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`admin_choose_winner_cancel:${movieId}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        content: `\u26a0\ufe0f Confirm selection: choose ${movieTitle || 'this movie'} as the session winner? This will end voting.`,
        components: [row],
        flags: MessageFlags.Ephemeral
      });
      // Auto-dismiss confirmation after 30s if no action is taken
      setTimeout(async () => { try { await interaction.deleteReply(); } catch (_) {} }, 30000);
      return;
    }
  } catch (e) {
    // If confirmation UI fails for any reason, proceed with existing flow
  }

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
        const imdb = require('../services/imdb');
        const database = require('../database');
        const config = await database.getGuildConfig(guildId);

        const updatedName = activeSession.name.replace('TBD (Voting in Progress)', movie.title);

        // Enrich description with IMDb and channel link
        let imdbData = null;
        let counts = null; try { counts = await database.getVoteCounts(movie.message_id); } catch {}

        if (movie.imdb_id) {
          try { imdbData = await imdb.getMovieDetailsCached(movie.imdb_id); } catch {}
        }
        const parts = [];
        parts.push(`Winner: ${movie.title}`);
        parts.push(`Selected by: <@${interaction.user.id}>`);
        if (counts) parts.push(`Votes: ${counts.up || 0} 👍 - ${counts.down || 0} 👎 (Score: ${(counts.up || 0) - (counts.down || 0)})`);

        if (movie.where_to_watch) parts.push(`Where: ${movie.where_to_watch}`);
        if (imdbData?.Year) parts.push(`Year: ${imdbData.Year}`);
        if (imdbData?.Runtime) parts.push(`Runtime: ${imdbData.Runtime}`);
        if (imdbData?.Genre) parts.push(`Genre: ${imdbData.Genre}`);
        if (imdbData?.imdbRating && imdbData.imdbRating !== 'N/A') parts.push(`IMDb: ${imdbData.imdbRating}/10`);
        if (imdbData?.Plot && imdbData.Plot !== 'N/A') parts.push(`\nSynopsis: ${imdbData.Plot}`);
        if (config?.movie_channel_id) parts.push(`Discuss: <#${config.movie_channel_id}>`);
        const description = parts.join('\n') + (activeSession.description ? `\n\n${activeSession.description}` : '');

        await discordEvents.updateDiscordEvent(
          interaction.guild,
          activeSession.discord_event_id,
          {
            name: updatedName,
            description
          },
          activeSession.scheduled_date || activeSession.scheduledDate || null
        );
      } catch (error) {
        console.warn('Error updating Discord event:', error.message);
      }
    }

    await interaction.reply({
      content: `🏆 **${movie.title}** has been chosen as the winner! The voting session is now complete.`,
      flags: MessageFlags.Ephemeral
    });
    setTimeout(async () => { try { await interaction.deleteReply(); } catch (_) {} }, 8000);

    // Clean up any tie-break messages in admin channel (keep control panel)
    try {
      const config = await database.getGuildConfig(guildId);
      if (config && config.admin_channel_id) {
        const adminChannel = await interaction.client.channels.fetch(config.admin_channel_id).catch(() => null);
        if (adminChannel) {
          const messages = await adminChannel.messages.fetch({ limit: 100 });
          const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);
          for (const [messageId, message] of botMessages) {
            try {
              const isControlPanel = message.embeds.length > 0 && message.embeds[0].title && message.embeds[0].title.includes('Admin Control Panel');
              if (!isControlPanel) {
                await message.delete();
              }
            } catch (e) {
              console.warn(`Failed to delete admin message ${messageId}:`, e.message);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning tie-break messages after choosing winner:', error.message);
    }

    // Refresh admin mirror and control panel so Cancel/Reschedule are available
    try {
      const adminMirror = require('../services/admin-mirror');
      await adminMirror.syncAdminChannel(interaction.client, guildId);
      const adminControls = require('../services/admin-controls');
      await adminControls.ensureAdminControlPanel(interaction.client, interaction.guild.id);
    } catch (error) {
      console.warn('Error syncing admin panel/mirror after choosing winner:', error.message);
    }

    // Clear voting channel and post winner announcement
    try {
      const config = await database.getGuildConfig(guildId);
      if (config && config.movie_channel_id) {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id).catch(() => null);
        if (votingChannel) {
          const forumChannels = require('../services/forum-channels');
          if (forumChannels.isForumChannel(votingChannel)) {
            // Forum: remove ALL voting threads (including the winner recommendation), post winner announcement, and reset pinned post
            await forumChannels.clearForumMoviePosts(votingChannel, null);
            await forumChannels.postForumWinnerAnnouncement(votingChannel, movie, activeSession.name || 'Movie Night', { event: activeSession.discord_event_id || null, selectedByUserId: interaction.user.id });
            await forumChannels.ensureRecommendationPost(votingChannel, null);
          } else {
            // Text channel: send a winner announcement embed
            const { EmbedBuilder } = require('discord.js');
            const imdb = require('../services/imdb');
            let imdbData = null;
            if (movie.imdb_id) {
              try { imdbData = await imdb.getMovieDetailsCached(movie.imdb_id); } catch {}
            }
            const winnerEmbed = new EmbedBuilder()
              .setTitle('🏆 Movie Night Winner Announced!')
              .setDescription(`**${movie.title}** has been selected for our next movie night!`)
              .setColor(0xffd700)
              .addFields(
                { name: '📺 Platform', value: movie.where_to_watch || 'TBD', inline: true },
                { name: '👤 Recommended by', value: `<@${movie.recommended_by}>`, inline: true }
              );
            if (imdbData?.Year) winnerEmbed.addFields({ name: '📅 Year', value: imdbData.Year, inline: true });

            // Always include who selected and winner's vote counts
            winnerEmbed.addFields({ name: '👑 Selected by', value: `<@${interaction.user.id}>`, inline: true });
            try {
              const counts = await database.getVoteCounts(movie.message_id);
              if (counts) {
                const score = (counts.up || 0) - (counts.down || 0);
                winnerEmbed.addFields({ name: '📊 Winner Votes', value: `${counts.up || 0} 👍 - ${counts.down || 0} 👎 (Score: ${score})`, inline: false });
              }
            } catch {}

            if (imdbData?.Runtime) winnerEmbed.addFields({ name: '⏱️ Runtime', value: imdbData.Runtime, inline: true });
            if (imdbData?.Genre) winnerEmbed.addFields({ name: '🎬 Genre', value: imdbData.Genre, inline: true });

            const content = config?.notification_role_id ? `<@&${config.notification_role_id}>` : undefined;
            await votingChannel.send({ content, embeds: [winnerEmbed], allowedMentions: content ? { parse: ['roles'], roles: [config.notification_role_id] } : undefined });
          }
        }
      }
    } catch (error) {
      console.warn('Error updating voting channel after choosing winner:', error.message);
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
      logger.warn('Error removing movie from admin channel:', error.message);
    }

    // Remove from voting channel (archive if forum, delete if text)
    try {
      const config = await database.getGuildConfig(guildId);
      if (config && config.movie_channel_id) {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        const forumChannels = require('../services/forum-channels');

        if (forumChannels.isForumChannel(votingChannel)) {
          // For forum channels, archive the thread
          if (movie.thread_id) {
            try {
              const thread = await votingChannel.threads.fetch(movie.thread_id);
              if (thread && !thread.archived) {
                await thread.setArchived(true);
                logger.debug(`📦 Archived forum thread for skipped movie: ${movie.title}`);
              }
            } catch (threadError) {
              logger.warn(`Error archiving forum thread for ${movie.title}:`, threadError.message);
            }
          }
        } else {
          // For text channels, delete the message
          const cleanup = require('../services/cleanup');
          await cleanup.removeMoviePost(interaction.client, config.movie_channel_id, movieId);
        }
      }
    } catch (error) {
      logger.warn('Error removing movie from voting channel:', error.message);
    }

    logger.info(`⏭️ Movie ${movie.title} skipped to next session`);

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

  // Permission gating: some actions allow moderators, others require admins
  const isAdmin = await permissions.checkMovieAdminPermission(interaction);
  let allowed = isAdmin;

  if (!allowed) {
    // Actions that moderators are allowed to perform
    const moderatorAllowed = new Set([
      'admin_ctrl_sync',
      'admin_ctrl_refresh',
      'admin_ctrl_banned_list'
    ]);
    if (moderatorAllowed.has(customId)) {
      allowed = await permissions.checkMovieModeratorPermission(interaction);
      if (!allowed) {
        await interaction.reply({
          content: '❌ You need Moderator or Administrator permissions to use this action.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }
  }

  // If still not allowed here, this action is admin-only
  if (!allowed) {
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
      case 'admin_ctrl_populate_forum':
        await handlePopulateForumChannel(interaction);
        break;
      case 'admin_ctrl_backfill_threads':
        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const result = await adminControls.backfillForumThreadIds(interaction.client, interaction.guild.id);
          if (result.error) {
            await interaction.editReply({ content: `❌ Backfill failed: ${result.error}` });
          } else {
            await interaction.editReply({ content: `✅ Backfill complete. Updated ${result.backfilled} movie(s).` });
          }
        } catch (e) {
          await interaction.editReply({ content: '❌ Error during backfill.' }).catch(()=>{});
        }
        break;
      case 'admin_ctrl_cancel_session':
        await handleCancelSession(interaction);
        break;
      case 'admin_ctrl_reschedule_session':
        await handleRescheduleSession(interaction);
        break;
      case 'admin_ctrl_administration':
        await handleAdministrationPanel(interaction);
        break;
      case 'admin_ctrl_back_to_moderation':
        await handleBackToModerationPanel(interaction);
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
 * Handle populate forum channel button
 */
async function handlePopulateForumChannel(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Check if voting channel is actually a forum channel
    const database = require('../database');
    const config = await database.getGuildConfig(interaction.guild.id);

    if (!config || !config.movie_channel_id) {
      await interaction.editReply({
        content: '❌ **No voting channel configured**\n\nPlease configure a voting channel first using `/movie-setup`.'
      });
      return;
    }

    const channel = await interaction.client.channels.fetch(config.movie_channel_id).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Voting channel not found**\n\nThe configured voting channel may have been deleted.'
      });
      return;
    }

    if (!channel.isForumChannel()) {
      await interaction.editReply({
        content: '❌ **Not a forum channel**\n\nThe "Populate Forum" feature is only available when your voting channel is a forum channel. Your current voting channel is a text channel.'
      });
      return;
    }

    const adminControls = require('../services/admin-controls');
    const result = await adminControls.populateForumChannel(interaction.client, interaction.guild.id);

    if (result.error) {
      await interaction.editReply({
        content: `❌ **Failed to populate forum channel**\n\n${result.error}`
      });
    } else if (result.populated === 0) {
      await interaction.editReply({
        content: '📋 **Forum channel is up to date**\n\nNo new forum posts needed to be created.'
      });
    } else {
      await interaction.editReply({
        content: `✅ **Forum channel populated successfully**\n\n📝 Created ${result.populated} forum posts for active movies.`
      });
    }

  } catch (error) {
    console.error('Error handling populate forum channel:', error);
    await interaction.editReply({
      content: '❌ Error populating forum channel.'
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

  const embed = deepPurge.updateSelectionDisplay([]);
  const components = deepPurge.createDeepPurgeSelectionMenu([]);

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
    // Find a manageable session: active voting session or upcoming decided session
    let session = await database.getActiveVotingSession(interaction.guild.id);
    if (!session) {
      try { session = await database.getUpcomingDecidedSession(interaction.guild.id); } catch {}
    }
    if (!session) {
      await interaction.reply({
        content: '❌ No current session to reschedule. Use "Plan Next Session" to create one first.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Show the exact same modal as Plan Next Session, prefilled with this session's values
    const votingSessions = require('../services/voting-sessions');
    await votingSessions.showVotingSessionRescheduleModal(interaction, session);

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

    // CRITICAL: Mark movies for next session BEFORE clearing forum posts
    // This must happen before clearForumMoviePosts which deletes movies from database
    await database.markMoviesForNextSession(interaction.guild.id, null);
    const logger = require('../utils/logger');
    logger.info('📋 Marked cancelled session movies for next session carryover');

    // Delete the session and all associated data
    await database.deleteVotingSession(sessionId);

    // Clear voting channel based on channel type
    const config = await database.getGuildConfig(interaction.guild.id);
    if (config && config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('../services/forum-channels');

          if (forumChannels.isForumChannel(votingChannel)) {
            // Forum channel - clear movie posts (movies already marked for carryover)
            logger.debug('📦 Clearing forum channel after session cancellation');

            // Clear all movie forum posts (movies already marked for carryover above)
            await forumChannels.clearForumMoviePosts(votingChannel, null, { deleteWinnerAnnouncements: true });

            // Remove recommendation post since session is cancelled
            await forumChannels.ensureRecommendationPost(votingChannel, null);
          } else {
            // Text channel - delete all bot messages and threads
            logger.debug('🗑️ Clearing text channel after session cancellation');

            const messages = await votingChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);

            for (const [messageId, message] of botMessages) {
              try {
                await message.delete();
              } catch (error) {
                logger.warn(`Failed to delete message ${messageId}:`, error.message);
              }
            }

            // Clear threads
            const threads = await votingChannel.threads.fetchActive();
            for (const [threadId, thread] of threads.threads) {
              try {
                await thread.delete();
              } catch (error) {
                logger.warn(`Failed to delete thread ${threadId}:`, error.message);
              }
            }

            // Add no session message
            const cleanup = require('../services/cleanup');
            await cleanup.ensureQuickActionAtBottom(votingChannel);
          }
        }
      } catch (error) {
        const logger = require('../utils/logger');
        logger.warn('Error clearing voting channel:', error.message);
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

    logger.info(`❌ Session ${session.name} cancelled by ${interaction.user.tag}`);

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

/**
 * Handle configuration action buttons
 */
async function handleConfigurationAction(interaction, customId) {
  const { configuration } = require('../services');

  const action = customId.replace('config_', '');

  try {
    switch (action) {
      case 'voting_channel':
        await configuration.configureMovieChannel(interaction, interaction.guild.id);
        break;
      case 'admin_channel':
        await configuration.configureAdminChannel(interaction, interaction.guild.id);
        break;
      case 'watch_party_channel':
        await configuration.configureWatchPartyChannel(interaction, interaction.guild.id);
        break;
      case 'admin_roles':
        await interaction.reply({
          content: '🔧 **Admin Roles Configuration**\n\nUse `/movienight-configure admin-roles add` and `/movienight-configure admin-roles remove` commands to manage admin roles.',
          flags: MessageFlags.Ephemeral
        });
        break;
      case 'voting_roles':
        await configuration.configureVotingRoles(interaction, interaction.guild.id);
        break;
      case 'vote_caps':
        await configuration.configureVoteCaps(interaction, interaction.guild.id);
        break;
      case 'vote_caps_enable':
        await configuration.setVoteCapsEnabled(interaction, interaction.guild.id, true);
        break;
      case 'vote_caps_disable':
        await configuration.setVoteCapsEnabled(interaction, interaction.guild.id, false);
        break;
      case 'vote_caps_reset':
        await configuration.resetVoteCapsDefaults(interaction, interaction.guild.id);
        break;
      case 'vote_caps_set':
        await configuration.openVoteCapsModal(interaction, interaction.guild.id);
        break;
      case 'show_guide': {
        const setupGuide = require('../services/setup-guide');
        await setupGuide.showSetupGuide(interaction);
        break;
      }
      default:
        await interaction.reply({
          content: `❌ Unknown configuration action: ${action}`,
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Error handling configuration action:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the configuration.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle guided setup button interactions
 */
async function handleGuidedSetupButton(interaction, customId) {
  switch (customId) {
    case 'setup_start':
      await guidedSetup.showSetupMenu(interaction);
      break;

    case 'setup_skip':
      await interaction.update({
        content: '⏭️ **Setup skipped**\n\nYou can run `/movie-setup-simple` anytime to configure the bot.',
        embeds: [],
        components: []
      });
      break;

    case 'setup_back_to_menu':
      await guidedSetup.showSetupMenu(interaction);
      break;

    case 'setup_voting_channel':
      await guidedSetup.showVotingChannelSetup(interaction);
      break;

    case 'setup_admin_channel':
      await guidedSetup.showAdminChannelSetup(interaction);
      break;

    case 'setup_watch_party_channel':
      await guidedSetup.showWatchPartyChannelSetup(interaction);
      break;

    // Setup Guide buttons
    case 'setup_channels': {
      const setupGuide = require('../services/setup-guide');
      await setupGuide.showChannelSetup(interaction);
      break;
    }
    case 'setup_roles': {
      const setupGuide = require('../services/setup-guide');
      await setupGuide.showRoleSetup(interaction);
      break;
    }
    case 'setup_permissions': {
      const setupGuide = require('../services/setup-guide');
      await setupGuide.showPermissionSetup(interaction);
      break;
    }
    case 'setup_configuration': {
      const setupGuide = require('../services/setup-guide');
      await setupGuide.showConfigurationSetup(interaction);
      break;
    }
    case 'setup_guide_back': {
      const setupGuide = require('../services/setup-guide');
      await setupGuide.showSetupGuide(interaction);
      break;
    }

    case 'setup_admin_roles':
      await guidedSetup.showAdminRolesSetup(interaction);
      break;

    case 'setup_moderator_roles':
      await guidedSetup.showModeratorRolesSetup(interaction);
      break;

    case 'setup_voting_roles':
      await guidedSetup.showVotingRolesSetup(interaction);
      break;

    case 'setup_skip_admin_roles':
      const database = require('../database');
      const config = await database.getGuildConfig(interaction.guild.id);
      await guidedSetup.showSetupMenuWithMessage(interaction, config, '⏭️ **Admin roles skipped** - Only Discord Administrators can manage the bot.');
      break;

    case 'setup_skip_moderator_roles':
      const database3 = require('../database');
      const config3 = await database3.getGuildConfig(interaction.guild.id);
      await guidedSetup.showSetupMenuWithMessage(interaction, config3, '⏭️ **Moderator roles skipped** - Only admins can moderate movies and sessions.');
      break;

    case 'setup_skip_notification_role':
      const database2 = require('../database');
      const config2 = await database2.getGuildConfig(interaction.guild.id);
      await guidedSetup.showSetupMenuWithMessage(interaction, config2, '⏭️ **Viewer role skipped** - No role will be pinged for movie sessions.');
      break;

    case 'setup_finish':
      // Complete setup and initialize channels
      await completeSetupAndInitialize(interaction);
      break;

    case 'setup_create_first_session':
      // Redirect to voting session creation
      const votingSessions = require('../services/voting-sessions');
      await votingSessions.startVotingSessionCreation(interaction);
      break;

    case 'setup_create_category':
      await guidedSetup.showCategoryCreationGuide(interaction);
      break;

    default:
      // Handle channel confirmation buttons
      if (customId.startsWith('setup_confirm_channel_')) {
        const parts = customId.split('_');
        const channelType = parts[3]; // voting, admin, or viewing
        const channelId = parts[4];
        await guidedSetup.handleChannelConfirmation(interaction, channelType, channelId);
        break;
      }
      console.warn('Unknown guided setup button:', customId);
      break;
  }
}

/**
 * Handle deep purge submit button
 */
async function handleDeepPurgeSubmit(interaction) {
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

  // Get selected categories from button ID or global storage
  let selectedCategories;

  if (interaction.customId.includes(':')) {
    // Decode from button ID
    const encodedCategories = interaction.customId.split(':')[1];
    selectedCategories = encodedCategories ? encodedCategories.split(',') : [];
  } else {
    // Fallback to global storage
    selectedCategories = global.deepPurgeSelections?.get(interaction.user.id);
  }

  if (!selectedCategories || selectedCategories.length === 0) {
    await interaction.reply({
      content: '❌ No categories selected. Please select categories first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    // Create confirmation modal
    const modal = deepPurge.createConfirmationModal(selectedCategories);
    await interaction.showModal(modal);

    // Clean up stored selections
    global.deepPurgeSelections?.delete(interaction.user.id);

  } catch (error) {
    console.error('Error handling deep purge submit:', error);
    await interaction.reply({
      content: '❌ An error occurred while preparing the confirmation.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle deep purge cancel button
 */
async function handleDeepPurgeCancel(interaction) {
  // Clean up stored selections
  global.deepPurgeSelections?.delete(interaction.user.id);

  await interaction.update({
    content: '❌ **Deep Purge Cancelled**\n\nNo data was deleted.',
    embeds: [],
    components: []
  });
}

/**
 * Complete setup and initialize channels
 */
async function completeSetupAndInitialize(interaction) {
  const { EmbedBuilder } = require('discord.js');

  try {
    // Show completion message and keep a handle to the panel message so we can edit it later
    const panelMsg = interaction.message;
    const embed = new EmbedBuilder()
      .setTitle('🎉 Setup Complete!')
      .setDescription('Your Movie Night Bot is now configured and ready to use!\n\n**Initializing channels...**')
      .setColor(0x57f287);

    await interaction.update({
      content: '',
      embeds: [embed],
      components: []
    });

    // panelMsg refers to the same message; after update completes we can edit it again safely

    // Initialize admin control panel and voting channel
    const config = await database.getGuildConfig(interaction.guild.id);

    if (config.admin_channel_id) {
      const adminControls = require('../services/admin-controls');
      await adminControls.ensureAdminControlPanel(interaction.client, interaction.guild.id);
    }

    if (config.movie_channel_id) {
      const cleanup = require('../services/cleanup');
      const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
      if (votingChannel) {
        await cleanup.ensureQuickActionPinned(votingChannel);
      }
    }

    // Update completion panel in-place (avoid creating a new ephemeral)
    const finalEmbed = new EmbedBuilder()
      .setTitle('🎉 Setup Complete!')
      .setDescription('Your Movie Night Bot is now configured and ready to use!')
      .setColor(0x57f287)
      .addFields(
        {
          name: '🎬 What\'s Next?',
          value: '• Use `/movie-night action:create-session` to create your first movie session\n• Users can recommend movies with the 🍿 button in your voting channel\n• Manage everything from your admin channel\n• Or manage via the Web Dashboard: https://movienight.bermanoc.net (minus voting)',
          inline: false
        },
        {
          name: '📚 Need Help?',
          value: 'Use `/movie-night action:help` for detailed usage instructions, or visit the Web Dashboard: https://movienight.bermanoc.net',
          inline: false
        }
      );

    try {
      await panelMsg.edit({
        embeds: [finalEmbed],
        components: []
      });
    } catch (e) {
      // Fallback: if edit fails for any reason, send a single follow-up
      await interaction.followUp({
        embeds: [finalEmbed],
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('Error completing setup:', error);
    await interaction.followUp({
      content: '❌ Setup completed but there was an error initializing channels. Please use the Sync Channels button in your admin channel.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle administration panel button - shows admin-only controls
 */
async function handleAdministrationPanel(interaction) {
  const permissions = require('../services/permissions');

  // Check if user has admin permission
  const isAdmin = await permissions.checkMovieAdminPermission(interaction);

  if (!isAdmin) {
    await ephemeralManager.sendEphemeral(interaction,
      '❌ **Access Denied**\n\nYou need administrator permissions to access the administration panel.'
    );
    return;
  }

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const adminEmbed = new EmbedBuilder()
    .setTitle('🔧 Administration Panel')
    .setDescription('**Administrator-only controls**\n\nThese controls are only available to users with administrator permissions.')
    .setColor(0xed4245)
    .addFields(
      {
        name: '⚙️ Configuration',
        value: '• **Configure Bot** - Set up channels, roles, and settings\n• **Deep Purge** - Complete guild data removal with confirmations',
        inline: false
      },
      {
        name: '📊 Advanced Features',
        value: '• **Guild Statistics** - Detailed analytics and reports\n• **Role Management** - Configure admin and moderator roles',
        inline: false
      },
      {
        name: '🌐 Web Dashboard',
        value: 'Manage the bot (minus voting) at https://movienight.bermanoc.net',
        inline: false
      }
    )
    .setFooter({ text: 'These actions require administrator permissions' });

  const adminButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('open_configuration')
        .setLabel('⚙️ Configure Bot')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_deep_purge')
        .setLabel('💥 Deep Purge')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_stats')
        .setLabel('📊 Guild Stats')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_backfill_threads')
        .setLabel('🧵 Backfill Threads')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_back_to_moderation')
        .setLabel('🔙 Back to Moderation')
        .setStyle(ButtonStyle.Secondary)
    );

  // Throttle duplicate admin panel popups per user for 15s
  const ephemeralManager = require('../utils/ephemeral-manager');
  if (ephemeralManager.isThrottled('admin_panel', interaction.user.id)) {
    await ephemeralManager.sendEphemeral(
      interaction,
      'ℹ️ Administration panel is already open. Use the buttons there or wait a moment before opening again.'
    );
    return;
  }

  await interaction.reply({
    embeds: [adminEmbed],
    components: [adminButtons],
    flags: MessageFlags.Ephemeral
  });
  ephemeralManager.startThrottle('admin_panel', interaction.user.id);
}

/**
 * Handle back to moderation panel button
 */
async function handleBackToModerationPanel(interaction) {
  // Refresh the main admin control panel
  const adminControls = require('../services/admin-controls');
  await adminControls.ensureAdminControlPanel(interaction.client, interaction.guild.id);

  await interaction.update({
    content: '✅ **Returned to Moderation Panel**\n\nThe main admin control panel has been refreshed. This message will dismiss automatically.',
    embeds: [],
    components: []
  });

  // Auto-dismiss the ephemeral message after 3 seconds
  setTimeout(async () => {
    try {
      await interaction.deleteReply();
    } catch (error) {
      // Message might already be dismissed, ignore error
    }
  }, 3000);
}

module.exports = {
  handleButton
};
