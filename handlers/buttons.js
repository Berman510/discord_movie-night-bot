/**
 * Button Interaction Handlers
 * Handles all button click interactions
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

      // Get updated vote counts
      const voteCounts = await database.getVoteCounts(msgId);

      // Update message with new vote counts
      const { components } = require('../utils');
      const updatedComponents = components.createVotingButtons(msgId, voteCounts.up, voteCounts.down);

      await interaction.editReply({
        components: updatedComponents
      });
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

    // Get updated movie data
    const movie = await database.getMovieById(msgId);
    if (!movie) {
      await interaction.followUp({
        content: '❌ Movie not found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Create updated embed
    const { embeds, components } = require('../utils');
    const updatedEmbed = embeds.createMovieEmbed(movie);
    const updatedComponents = components.createStatusButtons(msgId, action);

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

async function handleConfigurationButton(interaction, action) {
  // TODO: Move configuration logic here
  console.log(`Configuration: ${action}`);
}

module.exports = {
  handleButton
};
