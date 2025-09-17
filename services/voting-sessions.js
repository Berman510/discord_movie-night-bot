/**
 * Voting Sessions Service
 * Manages session-based voting with movie tagging and winner selection
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const database = require('../database');
const ephemeralManager = require('../utils/ephemeral-manager');

/**
 * Start the voting session creation process with date/time selection
 */
async function startVotingSessionCreation(interaction, contentType = 'movie') {
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
    sessionDescription: null,
    contentType: contentType
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
    .setTitle('Plan Next Session');

  // TODO: Make date/time formats configurable per guild
  // For now, using US dates (MM/DD/YYYY) and both 12h/24h time inputs

  const dateInput = new TextInputBuilder()
    .setCustomId('session_date')
    .setLabel('Session Date (MM/DD/YYYY)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('12/25/2025')
    .setRequired(true)
    .setMaxLength(10);

  const timeInput = new TextInputBuilder()
    .setCustomId('session_time')
    .setLabel('Session Time (12h or 24h)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('7:30 PM or 19:30')
    .setRequired(true)
    .setMaxLength(8);

  const votingEndDateInput = new TextInputBuilder()
    .setCustomId('voting_end_date')
    .setLabel('Voting Ends Date (MM/DD/YYYY)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Optional — MM/DD/YYYY (defaults to 1h before start)')
    .setRequired(false)
    .setMaxLength(10);

  const votingEndInput = new TextInputBuilder()
    .setCustomId('voting_end_time')
    .setLabel('Voting Ends Time (12h or 24h)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Optional — e.g., 6:30 PM or 18:30 (defaults to 1h before)')
    .setRequired(false)
    .setMaxLength(8);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('session_description')
    .setLabel('Session Description (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Join us for a festive movie night!')
    .setRequired(false)
    .setMaxLength(500);

  const firstRow = new ActionRowBuilder().addComponents(dateInput);
  const secondRow = new ActionRowBuilder().addComponents(timeInput);
  const thirdRow = new ActionRowBuilder().addComponents(votingEndDateInput);
  const fourthRow = new ActionRowBuilder().addComponents(votingEndInput);
  const fifthRow = new ActionRowBuilder().addComponents(descriptionInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  await interaction.showModal(modal);
}


/**
 * Show the same modal as Plan Next Session, prefilled for rescheduling
 */
async function showVotingSessionRescheduleModal(interaction, session) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  // Compute prefill values from the existing session
  const start = session.scheduled_date ? new Date(session.scheduled_date) : new Date();
  const end = session.voting_end_time ? new Date(session.voting_end_time) : new Date(start.getTime() - 60 * 60 * 1000);

  const mm = String(start.getMonth() + 1).padStart(2, '0');
  const dd = String(start.getDate()).padStart(2, '0');
  const yyyy = String(start.getFullYear());
  const prefillDate = `${mm}/${dd}/${yyyy}`;
  const prefillTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const prefillVotingEnd = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const prefillDescription = session.description || '';

  const modal = new ModalBuilder()
    .setCustomId(`voting_session_reschedule_modal:${session.id}`)
    .setTitle('Reschedule Session');

  const dateInput = new TextInputBuilder()
    .setCustomId('session_date')
    .setLabel('Session Date (MM/DD/YYYY)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('12/25/2025')
    .setRequired(true)
    .setMaxLength(10)
    .setValue(prefillDate);

  const timeInput = new TextInputBuilder()
    .setCustomId('session_time')
    .setLabel('Session Time (12h or 24h)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('7:30 PM or 19:30')
    .setRequired(true)
    .setMaxLength(8)
    .setValue(prefillTime);

  const endMm = String(end.getMonth() + 1).padStart(2, '0');
  const endDd = String(end.getDate()).padStart(2, '0');
  const endYyyy = String(end.getFullYear());
  const prefillVotingEndDate = `${endMm}/${endDd}/${endYyyy}`;

  const votingEndDateInput = new TextInputBuilder()
    .setCustomId('voting_end_date')
    .setLabel('Voting Ends Date (MM/DD/YYYY)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Optional — MM/DD/YYYY (defaults to 1h before start)')
    .setRequired(false)
    .setMaxLength(10)
    .setValue(prefillVotingEndDate);

  const votingEndInput = new TextInputBuilder()
    .setCustomId('voting_end_time')
    .setLabel('Voting Ends Time (12h or 24h)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Optional — e.g., 6:30 PM or 18:30 (defaults to 1h before)')
    .setRequired(false)
    .setMaxLength(8)
    .setValue(prefillVotingEnd);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('session_description')
    .setLabel('Session Description (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Join us for a festive movie night!')
    .setRequired(false)
    .setMaxLength(500)
    .setValue(prefillDescription);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(timeInput),
    new ActionRowBuilder().addComponents(votingEndDateInput),
    new ActionRowBuilder().addComponents(votingEndInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  await interaction.showModal(modal);
}

/**
 * Handle reschedule modal submit (same validation/creation flow, but updates existing session)
 */
async function handleVotingSessionRescheduleModal(interaction) {
  const { MessageFlags } = require('discord.js');
  const database = require('../database');
  const forumChannels = require('./forum-channels');
  const adminControls = require('./admin-controls');
  const adminMirror = require('./admin-mirror');
  const discordEvents = require('./discord-events');
  const logger = require('../utils/logger');

  // Defer early to avoid timeouts
  if (!interaction.deferred && !interaction.replied) {
    try { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); } catch {}
  }

  try {
    const [_, sessionIdStr] = interaction.customId.split(':');
    const sessionId = Number(sessionIdStr);
    if (!sessionId) throw new Error('Invalid session id');

    const session_date = interaction.fields.getTextInputValue('session_date');
    const session_time = interaction.fields.getTextInputValue('session_time');
    const voting_end_date = interaction.fields.getTextInputValue('voting_end_date') || null;
    const voting_end_time = interaction.fields.getTextInputValue('voting_end_time') || null;
    const session_description = interaction.fields.getTextInputValue('session_description') || null;

    const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!dateRegex.test(session_date)) {
      await interaction.editReply({ content: '❌ Invalid date format. Use MM/DD/YYYY.' });
      return;
    }

    function parseTimeFlexible(str) {
      const t = str.trim();
      // Try 12-hour first
      const re12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
      let m = t.match(re12);
      if (m) {
        let hours = parseInt(m[1]);
        const minutes = parseInt(m[2]);
        const ampm = m[3].toUpperCase();
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return { hours, minutes };
      }
      // Try 24-hour HH:MM
      const re24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;
      m = t.match(re24);
      if (m) {
        return { hours: parseInt(m[1]), minutes: parseInt(m[2]) };
      }
      return null;
    }

    const parsedStart = parseTimeFlexible(session_time);
    if (!parsedStart) {
      await interaction.editReply({ content: '❌ Invalid start time. Use 12h or 24h (e.g., 7:30 PM or 19:30).' });
      return;
    }

    let parsedEnd = null;
    if (voting_end_time) {
      parsedEnd = parseTimeFlexible(voting_end_time);
      if (!parsedEnd) {
        await interaction.editReply({ content: '❌ Invalid voting end time. Use 12h or 24h (e.g., 6:30 PM or 18:30).' });
        return;
      }
    }

    const [month, day, year] = session_date.split('/');
    const isoDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const startDateTime = new Date(`${isoDateString}T${String(parsedStart.hours).padStart(2, '0')}:${String(parsedStart.minutes).padStart(2, '0')}:00`);
    let endDateTime = null;
    if (parsedEnd) {
      let endIsoDateString = isoDateString; // default to same day as session
      if (voting_end_date) {
        if (!dateRegex.test(voting_end_date)) {
          await interaction.editReply({ content: '❌ Invalid voting end date. Use MM/DD/YYYY.' });
          return;
        }
        const [vendMonth, vendDay, vendYear] = voting_end_date.split('/');
        endIsoDateString = `${vendYear}-${vendMonth.padStart(2, '0')}-${vendDay.padStart(2, '0')}`;
      }
      endDateTime = new Date(`${endIsoDateString}T${String(parsedEnd.hours).padStart(2, '0')}:${String(parsedEnd.minutes).padStart(2, '0')}:00`);
    } else {
      endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() - 1);
    }

    if (startDateTime <= new Date()) {
      await interaction.editReply({ content: '❌ Session date/time must be in the future.' });
      return;
    }
    if (endDateTime >= startDateTime) {
      await interaction.editReply({ content: '❌ Voting must end before the session starts.' });
      return;
    }

    // Generate session name like creation flow based on content type
    const session = await database.getVotingSessionById(sessionId);
    const contentTypeLabel = session?.content_type === 'tv_show' ? 'TV Show Night' :
                             session?.content_type === 'mixed' ? 'Watch Party' : 'Movie Night';
    const sessionName = `${contentTypeLabel} - ${startDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    // Determine timezone preference similar to creation
    const cfg = await database.getGuildConfig(interaction.guild.id);
    const tz = cfg?.default_timezone || cfg?.timezone || 'America/Los_Angeles';

    // Update session in DB
    await database.updateMovieSessionDetails(sessionId, {
      name: sessionName,
      description: session_description,
      scheduledDate: startDateTime,
      votingEndTime: endDateTime,
      timezone: tz
    });

    // Update or create Discord Scheduled Event
    try {
      const current = await database.getSessionById(sessionId);
      let eventId = current?.discord_event_id || null;
      if (eventId) {
        await discordEvents.updateDiscordEvent(
          interaction.guild,
          eventId,
          { id: sessionId, name: sessionName, description: session_description, votingEndTime: endDateTime },
          startDateTime
        );
      } else {
        const newEventId = await discordEvents.createDiscordEvent(interaction.guild, { id: sessionId, guildId: interaction.guild.id, name: sessionName, description: session_description, votingEndTime: endDateTime }, startDateTime);
        if (newEventId) await database.updateSessionDiscordEvent(sessionId, newEventId);
      }
    } catch (e) {
      logger.warn('Error updating Discord event during reschedule:', e.message);
    }

    // Update forum/text channels system post
    try {
      const config = await database.getGuildConfig(interaction.guild.id);
      const client = interaction.client || global.discordClient;
      if (config?.movie_channel_id && client) {
        const votingChannel = await client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          if (forumChannels.isForumChannel(votingChannel)) {
            await forumChannels.ensureRecommendationPost(votingChannel, await database.getActiveVotingSession(interaction.guild.id));
          } else if (forumChannels.isTextChannel(votingChannel)) {
            const cleanup = require('./cleanup');
            await cleanup.ensureQuickActionPinned(votingChannel);
          }
        }
      }
    } catch (e) {
      logger.warn('Error updating channel posts during reschedule:', e.message);
    }

    // Refresh admin control panel and mirror
    try { await adminControls.ensureAdminControlPanel(interaction.client || global.discordClient, interaction.guild.id); } catch {}
    try { await adminMirror.syncAdminChannel(interaction.client || global.discordClient, interaction.guild.id); } catch {}

    // Success message
    const ts = Math.floor(startDateTime.getTime() / 1000);
    await interaction.editReply({ content: `✅ Session "${sessionName}" rescheduled to <t:${ts}:F>` });
    // Auto-dismiss the ephemeral success after 8 seconds
    setTimeout(async () => { try { await interaction.deleteReply(); } catch (_) {} }, 8000);

  } catch (error) {
    console.error('Error handling reschedule modal:', error);
    try { await interaction.editReply({ content: '❌ Failed to reschedule session.' }); } catch {}
  }
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
  const votingEndDate = interaction.fields.getTextInputValue('voting_end_date') || null;
  const votingEndTime = interaction.fields.getTextInputValue('voting_end_time') || null;
  const sessionDescription = interaction.fields.getTextInputValue('session_description') || null;

  // Validate date format (MM/DD/YYYY)
  const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateRegex.test(sessionDate)) {
    await interaction.reply({
      content: '❌ Invalid date format. Please use MM/DD/YYYY format (e.g., 12/25/2024).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Parse time in either 12-hour (h:mm AM/PM) or 24-hour (HH:MM) format
  function parseTimeFlexible(timeStr) {
    const t = timeStr.trim();
    // 12-hour
    const re12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
    let m = t.match(re12);
    if (m) {
      let hours = parseInt(m[1]);
      const minutes = parseInt(m[2]);
      const ampm = m[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return { hours, minutes };
    }
    // 24-hour
    const re24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    m = t.match(re24);
    if (m) return { hours: parseInt(m[1]), minutes: parseInt(m[2]) };
    return null;
  }

  const parsedSessionTime = parseTimeFlexible(sessionTime);
  if (!parsedSessionTime) {
    await interaction.reply({
      content: '❌ Invalid session time format. Use 12h or 24h (e.g., 7:30 PM or 19:30).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  let parsedVotingEndTime = null;
  if (votingEndTime) {
    parsedVotingEndTime = parseTimeFlexible(votingEndTime);
    if (!parsedVotingEndTime) {
      await interaction.reply({
        content: '❌ Invalid voting end time format. Use 12h or 24h (e.g., 6:30 PM or 18:30).',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

  // Get guild timezone for proper conversion
  const config = await database.getGuildConfig(interaction.guild.id);
  const guildTimezone = config?.timezone || 'America/Los_Angeles';

  // Convert MM/DD/YYYY to YYYY-MM-DD for Date constructor
  const [month, day, year] = sessionDate.split('/');
  const isoDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Create datetime objects with parsed 24-hour times
  const sessionDateTime = new Date(`${isoDateString}T${parsedSessionTime.hours.toString().padStart(2, '0')}:${parsedSessionTime.minutes.toString().padStart(2, '0')}:00`);

  // Parse voting end date/time (default to 1 hour before session if not provided)
  let votingEndDateTime = null;
  if (parsedVotingEndTime) {
    let endIsoDateString = isoDateString; // default to same day
    if (votingEndDate) {
      if (!dateRegex.test(votingEndDate)) {
        await interaction.reply({
          content: '❌ Invalid voting end date format. Please use MM/DD/YYYY.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      const [vendMonth, vendDay, vendYear] = votingEndDate.split('/');
      endIsoDateString = `${vendYear}-${vendMonth.padStart(2, '0')}-${vendDay.padStart(2, '0')}`;
    }
    votingEndDateTime = new Date(`${endIsoDateString}T${parsedVotingEndTime.hours.toString().padStart(2, '0')}:${parsedVotingEndTime.minutes.toString().padStart(2, '0')}:00`);
  } else {
    // Default to 1 hour before session
    votingEndDateTime = new Date(sessionDateTime);
    votingEndDateTime.setHours(votingEndDateTime.getHours() - 1);
  }

  // Auto-generate session name from parsed date and content type
  const contentTypeLabel = state.contentType === 'tv_show' ? 'TV Show Night' :
                           state.contentType === 'mixed' ? 'Watch Party' : 'Movie Night';
  const sessionName = `${contentTypeLabel} - ${sessionDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`;

  const logger = require('../utils/logger');
  logger.debug(`🕐 Session times (${guildTimezone}):`);
  logger.debug(`   Session: ${sessionDateTime.toLocaleString()} (${sessionDateTime.toISOString()})`);
  logger.debug(`   Voting ends: ${votingEndDateTime.toLocaleString()} (${votingEndDateTime.toISOString()})`);

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
    // Get guild configuration for timezone
    const config = await database.getGuildConfig(interaction.guild.id);
    const guildTimezone = (config?.default_timezone || config?.timezone || 'UTC'); // Prefer configured default_timezone, fallback to timezone, then UTC

    // Create the voting session in the database
    const sessionData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel?.id || null,
      name: state.sessionName,
      description: state.sessionDescription,
      scheduledDate: state.sessionDateTime,
      votingEndTime: state.votingEndDateTime,
      timezone: guildTimezone,
      contentType: state.contentType || 'movie',
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
        description: state.sessionDescription || 'Join us for movie night voting and viewing!',
        votingEndTime: state.votingEndDateTime
      };

      const event = await discordEvents.createDiscordEvent(interaction.guild, eventData, state.sessionDateTime);

      if (event && event.id) {
        // Update session with Discord event ID
        const logger = require('../utils/logger');
        logger.debug(`📅 Saving event ID ${event.id} to session ${sessionId}`);
        const updateResult = await database.updateVotingSessionEventId(sessionId, event.id);
        if (updateResult) {
          logger.debug(`📅 Successfully saved event ID to database`);
        } else {
          logger.warn(`📅 Failed to save event ID to database`);
        }
        logger.info(`📅 Created Discord event: ${event.name} (${event.id})`);
      } else {
        console.warn('Discord event created but no ID returned:', event);
      }
    } catch (error) {
      console.warn('Error creating Discord event for voting session:', error.message);
    }

    // Clear the creation state
    global.votingSessionCreationState?.delete(interaction.user.id);

    // Success response - update the existing ephemeral message
    await interaction.update({
      content: `✅ **Voting session created successfully!**\n\n🎬 **${state.sessionName}**\n📅 ${state.sessionDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}\n⏰ ${state.sessionDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}\n🗳️ Voting ends: ${state.votingEndDateTime.toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })}\n\n🗳️ Users can now start recommending movies for this session!`,
      embeds: [],
      components: []
    });
    // Auto-dismiss the ephemeral success after 8 seconds
    setTimeout(async () => { try { await interaction.deleteReply(); } catch (_) {} }, 8000);

    // Initialize logger for this function
    const logger = require('../utils/logger');

    // Handle carryover content from previous session (content-type aware)
    try {
      let carryoverContent = [];

      // Get carryover content based on session content type
      if (contentType === 'movie') {
        // Movie sessions only get movie carryover
        carryoverContent = await database.getNextSessionMovies(interaction.guild.id);
        logger.info(`🔄 Found ${carryoverContent.length} carryover movies from previous session`);
      } else if (contentType === 'tv_show') {
        // TV show sessions only get TV show carryover
        carryoverContent = await database.getNextSessionTVShows(interaction.guild.id);
        logger.info(`🔄 Found ${carryoverContent.length} carryover TV shows from previous session`);
      } else if (contentType === 'mixed') {
        // Mixed sessions get both movies and TV shows
        const carryoverMovies = await database.getNextSessionMovies(interaction.guild.id);
        const carryoverTVShows = await database.getNextSessionTVShows(interaction.guild.id);
        carryoverContent = [...carryoverMovies, ...carryoverTVShows];
        logger.info(`🔄 Found ${carryoverMovies.length} carryover movies and ${carryoverTVShows.length} carryover TV shows from previous session`);
      }

      if (carryoverContent.length > 0) {
        // Update carryover content with new session ID and reset votes
        for (const content of carryoverContent) {
          const isTV = content.show_type !== undefined;
          if (isTV) {
            await database.updateTVShowSessionId(content.message_id, sessionId);
            await database.resetTVShowVotes(content.message_id);
            logger.debug(`🔄 Added carryover TV show: ${content.title}`);
          } else {
            await database.updateMovieSessionId(content.message_id, sessionId);
            await database.resetMovieVotes(content.message_id);
            logger.debug(`🔄 Added carryover movie: ${content.title}`);
          }
        }

        // Clear the next_session flags for both content types
        await database.clearNextSessionFlag(interaction.guild.id);
        await database.clearNextSessionTVShowFlag(interaction.guild.id);
      }
    } catch (error) {
      console.warn('Error handling carryover content:', error.message);
    }

    // Update voting channel to show the new session
    try {
      const config = await database.getGuildConfig(interaction.guild.id);
      const client = interaction.client || global.discordClient;

      if (config && config.movie_channel_id && client) {
        logger.debug(`📋 Fetching voting channel: ${config.movie_channel_id}`);
        const votingChannel = await client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('./forum-channels');

          // Handle forum channels differently than text channels
          if (forumChannels.isForumChannel(votingChannel)) {
            console.log(`📋 Voting channel is a forum channel: ${votingChannel.name}`);
            // For forum channels, we don't clear messages - each movie gets its own post
            // The carryover movies will be handled below by creating new forum posts
          } else {
            // Clear existing messages first (text channels only)
            const logger = require('../utils/logger');
            logger.debug(`📋 Clearing existing messages in text channel: ${votingChannel.name}`);
            const messages = await votingChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);

            for (const [messageId, message] of botMessages) {
              try {
                await message.delete();
              } catch (error) {
                console.warn(`Failed to delete message ${messageId}:`, error.message);
              }
            }
          }

          // Add carryover content (movies and TV shows) to the voting channel
          const carryoverMovies = await database.getMoviesBySession(sessionId);
          const carryoverTVShows = await database.getTVShowsForVotingSession(sessionId);
          const allCarryoverContent = [...carryoverMovies, ...carryoverTVShows];

          if (allCarryoverContent.length > 0) {
            logger.debug(`📝 Creating posts for ${carryoverMovies.length} carryover movies and ${carryoverTVShows.length} carryover TV shows`);

            for (const content of allCarryoverContent) {
              const isTV = content.show_type !== undefined; // TV shows have show_type field
              try {
                // Refresh IMDB data for carryover content if it has an IMDB ID
                let updatedContent = content;
                if (content.imdb_id) {
                  try {
                    // Only fetch IMDb data if we do not already have it stored
                    if (!content.imdb_data) {
                      const imdb = require('./imdb');
                      const imdbData = await imdb.getMovieDetailsCached(content.imdb_id);
                      if (imdbData) {
                        // Update appropriate table based on content type
                        if (isTV) {
                          // Update TV show IMDb data
                          await database.pool.execute(
                            'UPDATE tv_shows SET imdb_data = ? WHERE message_id = ?',
                            [JSON.stringify(imdbData), content.message_id]
                          );
                        } else {
                          await database.updateMovieImdbData(content.message_id, JSON.stringify(imdbData));
                        }
                        updatedContent = { ...content, imdb_data: JSON.stringify(imdbData) };
                        logger.debug(`${isTV ? '📺' : '🎬'} Cached IMDb data for carryover ${isTV ? 'TV show' : 'movie'}: ${content.title}`);
                      }
                    } else {
                      updatedContent = content;
                    }
                  } catch (error) {
                    logger.warn(`IMDb fetch skipped/failed for ${content.title}:`, error.message);
                  }
                }

                if (forumChannels.isForumChannel(votingChannel)) {
                  // Create forum post for carryover content WITHOUT components first (we need the new message ID)
                  const { embeds, components } = require('../utils');
                  // Include IMDb data in embed if available
                  let imdbDataForEmbed = null;
                  try {
                    if (updatedContent.imdb_data) {
                      let parsed = typeof updatedContent.imdb_data === 'string' ? JSON.parse(updatedContent.imdb_data) : updatedContent.imdb_data;
                      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                      imdbDataForEmbed = parsed;
                    }
                  } catch (e) { /* non-fatal */ }
                  const contentEmbed = embeds.createMovieEmbed(updatedContent, imdbDataForEmbed, null, isTV ? 'tv_show' : 'movie');

                  const result = await forumChannels.createForumMoviePost(
                    votingChannel,
                    { title: updatedContent.title, embed: contentEmbed, contentType: isTV ? 'tv_show' : 'movie' },
                    []
                  );

                  const { thread, message } = result;

                  // Update database with new message and thread IDs
                  if (isTV) {
                    await database.pool.execute(
                      'UPDATE tv_shows SET message_id = ?, thread_id = ? WHERE guild_id = ? AND title = ?',
                      [message.id, thread.id, updatedContent.guild_id, updatedContent.title]
                    );
                  } else {
                    await database.updateMovieMessageId(updatedContent.guild_id, updatedContent.title, message.id);
                    await database.updateMovieThreadId(message.id, thread.id);
                  }

                  // Now that we have the new message ID, attach voting buttons referencing the correct ID
                  try {
                    const voteCounts = await database.getVoteCounts(message.id);
                    const contentComponents = components.createVotingButtons(message.id, voteCounts.up, voteCounts.down);
                    await message.edit({ components: contentComponents });
                  } catch (e) {
                    logger.warn(`Error attaching voting buttons to forum post ${message.id}: ${e.message}`);
                  }

                  logger.info(`📝 Created forum post for carryover ${isTV ? 'TV show' : 'movie'}: ${updatedContent.title} (Thread: ${thread.id})`);
                } else {
                  // Create text channel message for carryover content WITHOUT components first (need new message ID)
                  const { embeds, components } = require('../utils');
                  // Include IMDb data in embed if available
                  let imdbDataForEmbed = null;
                  try {
                    if (updatedContent.imdb_data) {
                      let parsed = typeof updatedContent.imdb_data === 'string' ? JSON.parse(updatedContent.imdb_data) : updatedContent.imdb_data;
                      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                      imdbDataForEmbed = parsed;
                    }
                  } catch (e) { /* non-fatal */ }
                  const contentEmbed = embeds.createMovieEmbed(updatedContent, imdbDataForEmbed, null, isTV ? 'tv_show' : 'movie');

                  const newMessage = await votingChannel.send({
                    embeds: [contentEmbed]
                  });

                  // Update database with new message ID
                  if (isTV) {
                    await database.pool.execute(
                      'UPDATE tv_shows SET message_id = ? WHERE guild_id = ? AND title = ?',
                      [newMessage.id, updatedContent.guild_id, updatedContent.title]
                    );
                  } else {
                    await database.updateMovieMessageId(updatedContent.guild_id, updatedContent.title, newMessage.id);
                  }

                  // Attach voting buttons that reference the new message ID
                  try {
                    const voteCounts = await database.getVoteCounts(newMessage.id);
                    const contentComponents = components.createVotingButtons(newMessage.id, voteCounts.up, voteCounts.down);
                    await newMessage.edit({ components: contentComponents });
                  } catch (e) {
                    logger.warn(`Error attaching voting buttons to message ${newMessage.id}: ${e.message}`);
                  }

                  // Create thread for the content
                  const thread = await newMessage.startThread({
                    name: `💬 ${updatedContent.title}`,
                    autoArchiveDuration: 10080 // 7 days
                  });

                  console.log(`📝 Created post and thread for carryover ${isTV ? 'TV show' : 'movie'}: ${updatedContent.title}`);
                }
              } catch (error) {
                logger.warn(`Error creating post for carryover movie ${movie.title}:`, error.message);
              }
            }
          }

          // Add the new session message/post
          if (forumChannels.isTextChannel(votingChannel)) {
            // Text channels get quick action pinned
            const cleanup = require('./cleanup');
            await cleanup.ensureQuickActionPinned(votingChannel);
          } else if (forumChannels.isForumChannel(votingChannel)) {
            // Forum channels get recommendation post with retry logic for session creation
            // Fetch the newly created session to get the correct content type
            const activeSession = await database.getVotingSessionById(sessionId);

            // Add small delay to allow Discord API to be consistent
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Try with retry logic for session creation
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
              try {
                await forumChannels.ensureRecommendationPost(votingChannel, activeSession);
                logger.debug(`📋 Forum channel setup complete - movies will appear as individual posts`);
                break; // Success, exit retry loop
              } catch (error) {
                retryCount++;
                if (retryCount > maxRetries) {
                  logger.warn(`📋 Failed to setup forum recommendation post after ${maxRetries} retries: ${error.message}`);
                  logger.debug(`📋 Forum channel setup will be completed on next sync operation`);
                } else {
                  logger.debug(`📋 Retrying forum setup (attempt ${retryCount + 1}/${maxRetries + 1}) after error: ${error.message}`);
                  // Wait a bit longer before retry
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            }
          }
        }
      }

      // Refresh admin control panel immediately so admin posts/buttons are available
      // Note: This also handles forum recommendation post setup, so no need for separate sync
      try {
        const adminControls = require('./admin-controls');
        await adminControls.ensureAdminControlPanel(interaction.client || global.discordClient, interaction.guild.id);
      } catch (e) {
        const logger = require('../utils/logger');
        logger.warn('Error refreshing admin control panel after session creation:', e.message);
      }
    } catch (error) {
      logger.warn('Error updating channels after session creation:', error.message);
    }

    // Ping notification role that voting has begun (in the configured voting channel)
    try {
      const database = require('../database');
      const config = await database.getGuildConfig(interaction.guild.id);
      const roleId = await database.getNotificationRole(interaction.guild.id);
      const client = interaction.client || global.discordClient;

      if (config && config.movie_channel_id && roleId && client) {
        const votingChannel = await client.channels.fetch(config.movie_channel_id);
        if (votingChannel && votingChannel.send) {
          await votingChannel.send({
            content: `<@&${roleId}> 🗳️ Voting for **${state.sessionName}** has begun! Join the conversation and vote in <#${config.movie_channel_id}>.`
          });
          logger.debug('📣 Sent voting start ping to notification role');
        }
      }
    } catch (error) {
      logger.warn('Error sending voting start ping:', error.message);
    }

    // Schedule voting end with smart scheduler
    try {
      const sessionScheduler = require('./session-scheduler');
      await sessionScheduler.scheduleVotingEnd(sessionId, state.votingEndDateTime);
    } catch (error) {
      logger.warn('Error scheduling voting end:', error.message);
    }

    // Log session creation
    logger.info(`🎬 Voting session created: ${state.sessionName} by ${interaction.user.tag}`);

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
  createVotingSession,
  showVotingSessionRescheduleModal,
  handleVotingSessionRescheduleModal
};
