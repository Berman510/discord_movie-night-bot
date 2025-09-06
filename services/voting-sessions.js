/**
 * Voting Sessions Service
 * Manages session-based voting with movie tagging and winner selection
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const database = require('../database');

/**
 * Create a new voting session with date/time selection
 */
async function createVotingSession(interaction) {
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

  const nameInput = new TextInputBuilder()
    .setCustomId('session_name')
    .setLabel('Session Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Holiday Movie Night')
    .setRequired(true)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('session_description')
    .setLabel('Session Description (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Join us for a festive movie night!')
    .setRequired(false)
    .setMaxLength(500);

  const firstRow = new ActionRowBuilder().addComponents(dateInput);
  const secondRow = new ActionRowBuilder().addComponents(nameInput);
  const thirdRow = new ActionRowBuilder().addComponents(descriptionInput);

  modal.addComponents(firstRow, secondRow, thirdRow);

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
  const sessionName = interaction.fields.getTextInputValue('session_name');
  const sessionDescription = interaction.fields.getTextInputValue('session_description') || null;

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(sessionDate)) {
    await interaction.reply({
      content: '❌ Invalid date format. Please use YYYY-MM-DD format.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Update state
  state.selectedDate = sessionDate;
  state.sessionName = sessionName;
  state.sessionDescription = sessionDescription;
  state.step = 'time';

  global.votingSessionCreationState.set(userId, state);

  // Show time selection modal
  await showVotingSessionTimeModal(interaction);
}

/**
 * Show time selection modal for voting session
 */
async function showVotingSessionTimeModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('voting_session_time_modal')
    .setTitle('Plan Next Voting Session - Time');

  const timeInput = new TextInputBuilder()
    .setCustomId('session_time')
    .setLabel('Session Time (HH:MM in 24-hour format)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('20:00')
    .setRequired(true)
    .setMaxLength(5);

  const timezoneInput = new TextInputBuilder()
    .setCustomId('session_timezone')
    .setLabel('Timezone (e.g., America/New_York, UTC)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('UTC')
    .setRequired(false)
    .setMaxLength(50);

  const firstRow = new ActionRowBuilder().addComponents(timeInput);
  const secondRow = new ActionRowBuilder().addComponents(timezoneInput);

  modal.addComponents(firstRow, secondRow);

  await interaction.reply({
    content: '⏰ Please specify the time for your voting session...',
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Handle voting session time modal submission
 */
async function handleVotingSessionTimeModal(interaction) {
  const userId = interaction.user.id;
  const state = global.votingSessionCreationState?.get(userId);

  if (!state) {
    await interaction.reply({
      content: '❌ Session creation state not found. Please try again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const sessionTime = interaction.fields.getTextInputValue('session_time');
  const sessionTimezone = interaction.fields.getTextInputValue('session_timezone') || 'UTC';

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(sessionTime)) {
    await interaction.reply({
      content: '❌ Invalid time format. Please use HH:MM format (e.g., 20:00).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Update state
  state.selectedTime = sessionTime;
  state.selectedTimezone = sessionTimezone;

  // Create the voting session
  await finalizeVotingSession(interaction, state);

  // Clean up state
  global.votingSessionCreationState.delete(userId);
}

/**
 * Finalize and create the voting session
 */
async function finalizeVotingSession(interaction, state) {
  try {
    // Combine date and time
    const scheduledDateTime = new Date(`${state.selectedDate}T${state.selectedTime}:00`);
    
    // Check if there's already an active voting session
    const existingSession = await database.getActiveVotingSession(interaction.guild.id);
    if (existingSession) {
      await interaction.editReply({
        content: '❌ There is already an active voting session. Please finalize it before creating a new one.'
      });
      return;
    }

    // Create Discord event first with TBD title
    const discordEvents = require('./discord-events');
    const eventData = {
      name: `${state.sessionName} - TBD (Voting in Progress)`,
      description: state.sessionDescription || 'Movie will be decided by voting',
      scheduledStartTime: scheduledDateTime,
      entityType: 3, // External event
      privacyLevel: 2 // Guild only
    };

    const discordEventId = await discordEvents.createDiscordEvent(interaction.guild, eventData);

    // Create voting session in database
    const sessionData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      name: state.sessionName,
      description: state.sessionDescription,
      scheduledDate: scheduledDateTime,
      timezone: state.selectedTimezone,
      createdBy: interaction.user.id,
      discordEventId: discordEventId
    };

    const sessionId = await database.createVotingSession(sessionData);

    if (!sessionId) {
      await interaction.editReply({
        content: '❌ Failed to create voting session.'
      });
      return;
    }

    // Move pending movies to this voting session
    const pendingMovies = await database.getMoviesByStatus(interaction.guild.id, 'pending', 50);
    let movedCount = 0;

    for (const movie of pendingMovies) {
      try {
        await database.pool.execute(
          `UPDATE movies SET session_id = ? WHERE message_id = ?`,
          [sessionId, movie.message_id]
        );
        movedCount++;
      } catch (error) {
        console.warn(`Failed to move movie ${movie.title} to voting session:`, error.message);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🗳️ New Voting Session Created!')
      .setDescription(`**${state.sessionName}** is now open for voting`)
      .setColor(0x57f287)
      .addFields(
        { name: '📅 Scheduled Date', value: scheduledDateTime.toLocaleDateString(), inline: true },
        { name: '⏰ Time', value: `${state.selectedTime} ${state.selectedTimezone}`, inline: true },
        { name: '🎬 Movies in Vote', value: `${movedCount} movies`, inline: true }
      );

    if (state.sessionDescription) {
      embed.addFields({ name: '📝 Description', value: state.sessionDescription, inline: false });
    }

    if (discordEventId) {
      embed.addFields({ name: '📅 Discord Event', value: 'Created with TBD title - will update when winner is chosen', inline: false });
    }

    embed.setFooter({ text: 'Movies are now tagged for this voting session. Use admin controls to choose the winner!' });

    await interaction.editReply({
      embeds: [embed]
    });

    // Sync both channels to show the new voting session movies
    try {
      const adminControls = require('./admin-controls');
      await adminControls.handleSyncChannel(interaction);
    } catch (error) {
      console.warn('Error syncing channels after voting session creation:', error.message);
    }

    console.log(`🗳️ Created voting session ${sessionId} with ${movedCount} movies`);

  } catch (error) {
    console.error('Error finalizing voting session:', error);
    await interaction.editReply({
      content: '❌ An error occurred while creating the voting session.'
    });
  }
}

module.exports = {
  createVotingSession,
  handleVotingSessionDateModal,
  handleVotingSessionTimeModal,
  showVotingSessionTimeModal
};
