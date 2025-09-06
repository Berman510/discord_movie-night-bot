/**
 * Voting Sessions Service
 * Manages session-based voting with movie tagging and winner selection
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const database = require('../database');

/**
 * Start the voting session creation process with date/time selection
 */
async function startVotingSessionCreation(interaction) {
  // Initialize session state if needed
  if (!global.votingSessionCreationState) {
    global.votingSessionCreationState = new Map();
  }

  const state = {
    step: 'date',
    selectedDate: null,
    selectedTime: null,
    selectedTimezone: null,
    sessionName: null,
    sessionDescription: null
  };

  global.votingSessionCreationState.set(interaction.user.id, state);

  // Start with date selection modal
  await showVotingSessionDateModal(interaction);
}

/**
 * Show date selection modal for voting session
 */
async function showVotingSessionDateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('voting_session_date_modal')
    .setTitle('Plan Next Voting Session - Date');

  const dateInput = new TextInputBuilder()
    .setCustomId('session_date')
    .setLabel('Session Date (YYYY-MM-DD)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('2024-12-25')
    .setRequired(true)
    .setMaxLength(10);

  const timeInput = new TextInputBuilder()
    .setCustomId('session_time')
    .setLabel('Session Time (HH:MM)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('19:30')
    .setRequired(true)
    .setMaxLength(5);

  const votingEndInput = new TextInputBuilder()
    .setCustomId('voting_end_time')
    .setLabel('Voting Ends (HH:MM, same day)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('18:30 (1 hour before session)')
    .setRequired(false)
    .setMaxLength(5);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('session_description')
    .setLabel('Session Description (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Join us for a festive movie night!')
    .setRequired(false)
    .setMaxLength(500);

  const firstRow = new ActionRowBuilder().addComponents(dateInput);
  const secondRow = new ActionRowBuilder().addComponents(timeInput);
  const thirdRow = new ActionRowBuilder().addComponents(votingEndInput);
  const fourthRow = new ActionRowBuilder().addComponents(descriptionInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

  await interaction.showModal(modal);
}

/**
 * Handle voting session date modal submission
 */
async function handleVotingSessionDateModal(interaction) {
  const userId = interaction.user.id;
  const state = global.votingSessionCreationState?.get(userId);

  if (!state) {
    await interaction.reply({
      content: '❌ Session creation state not found. Please try again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const sessionDate = interaction.fields.getTextInputValue('session_date');
  const sessionTime = interaction.fields.getTextInputValue('session_time');
  const votingEndTime = interaction.fields.getTextInputValue('voting_end_time') || null;
  const sessionDescription = interaction.fields.getTextInputValue('session_description') || null;

  // Auto-generate session name from date
  const dateObj = new Date(sessionDate + 'T00:00:00');
  const sessionName = `Movie Night - ${dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`;

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(sessionDate)) {
    await interaction.reply({
      content: '❌ Invalid date format. Please use YYYY-MM-DD format.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(sessionTime)) {
    await interaction.reply({
      content: '❌ Invalid session time format. Please use HH:MM format (24-hour).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Validate voting end time format if provided
  if (votingEndTime && !timeRegex.test(votingEndTime)) {
    await interaction.reply({
      content: '❌ Invalid voting end time format. Please use HH:MM format (24-hour).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Parse the full datetime
  const sessionDateTime = new Date(`${sessionDate}T${sessionTime}:00`);

  // Parse voting end time (default to 1 hour before session if not provided)
  let votingEndDateTime = null;
  if (votingEndTime) {
    votingEndDateTime = new Date(`${sessionDate}T${votingEndTime}:00`);
  } else {
    // Default to 1 hour before session
    votingEndDateTime = new Date(sessionDateTime);
    votingEndDateTime.setHours(votingEndDateTime.getHours() - 1);
  }

  // Validate that the dates are in the future
  if (sessionDateTime <= new Date()) {
    await interaction.reply({
      content: '❌ Session date and time must be in the future.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (votingEndDateTime <= new Date()) {
    await interaction.reply({
      content: '❌ Voting end time must be in the future.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (votingEndDateTime >= sessionDateTime) {
    await interaction.reply({
      content: '❌ Voting must end before the session starts.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Update state with all information
  state.selectedDate = sessionDate;
  state.selectedTime = sessionTime;
  state.votingEndTime = votingEndTime;
  state.sessionName = sessionName;
  state.sessionDescription = sessionDescription;
  state.sessionDateTime = sessionDateTime;
  state.votingEndDateTime = votingEndDateTime;
  state.step = 'complete';

  global.votingSessionCreationState.set(userId, state);

  // Create the voting session directly
  await createVotingSession(interaction, state);
}

/**
 * Create the voting session with all provided information
 */
async function createVotingSession(interaction, state) {
  const database = require('../database');

  try {
    // Create the voting session in the database
    const sessionData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel?.id || null,
      name: state.sessionName,
      description: state.sessionDescription,
      scheduledDate: state.sessionDateTime,
      timezone: 'UTC',
      createdBy: interaction.user.id,
      status: 'voting'
    };

    const sessionId = await database.createVotingSession(sessionData);

    if (!sessionId) {
      await interaction.reply({
        content: '❌ Failed to create voting session.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Create Discord event
    try {
      const discordEvents = require('./discord-events');
      const eventData = {
        id: sessionId,
        guildId: interaction.guild.id,
        name: state.sessionName,
        description: state.sessionDescription || 'Join us for movie night voting and viewing!'
      };

      const event = await discordEvents.createDiscordEvent(interaction.guild, eventData, state.sessionDateTime);

      if (event) {
        // Update session with Discord event ID
        await database.updateVotingSessionEventId(sessionId, event.id);
        console.log(`📅 Created Discord event: ${event.name} (${event.id})`);
      }
    } catch (error) {
      console.warn('Error creating Discord event for voting session:', error.message);
    }

    // Clear the creation state
    global.votingSessionCreationState?.delete(interaction.user.id);

    // Success response
    await interaction.reply({
      content: `✅ **Voting session created successfully!**\n\n🎬 **${state.sessionName}**\n📅 ${state.sessionDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}\n⏰ ${state.sessionDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n🗳️ Users can now start recommending movies for this session!`,
      flags: MessageFlags.Ephemeral
    });

    console.log(`🎬 Voting session created: ${state.sessionName} by ${interaction.user.tag}`);

  } catch (error) {
    console.error('Error creating voting session:', error);
    await interaction.reply({
      content: '❌ An error occurred while creating the voting session.',
      flags: MessageFlags.Ephemeral
    });
  }
}





module.exports = {
  startVotingSessionCreation,
  showVotingSessionDateModal,
  handleVotingSessionDateModal,
  createVotingSession
};
