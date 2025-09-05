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
        customId.startsWith('session_movie_create:')) {
      await sessions.handleSessionCreationButton(interaction);
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
  // TODO: Move voting logic here
  console.log(`Voting: ${action} for message ${msgId}`);
}

async function handleStatusChange(interaction, action, msgId) {
  // TODO: Move status change logic here
  console.log(`Status change: ${action} for message ${msgId}`);
}

async function handleConfigurationButton(interaction, action) {
  // TODO: Move configuration logic here
  console.log(`Configuration: ${action}`);
}

module.exports = {
  handleButton
};
