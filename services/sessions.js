/**
 * Session Management Service
 * Handles movie session creation, management, and interactions
 *
 * TODO: Enhanced Session Participant Tracking
 * - Add guild configuration for session viewing channel (where movie nights happen)
 * - Implement automatic participant tracking during session times:
 *   - Bot monitors configured viewing channel during scheduled session times
 *   - Tracks users who join/leave voice channel during session duration
 *   - Records actual attendance vs. registered participants
 * - Add session start/end time tracking based on session creation data
 * - Implement real-time session monitoring:
 *   - Bot knows current time and compares to scheduled session times
 *   - Automatically starts tracking when session begins
 *   - Stops tracking when session ends (configurable duration, e.g., 3 hours)
 * - Enhanced participant management:
 *   - Show registered vs. actual attendees
 *   - Track session duration per user
 *   - Generate attendance reports for completed sessions
 * - Add configuration commands for session viewing channel setup
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');

const database = require('../database');
const { TIMEZONE_OPTIONS } = require('../config/timezones');
const discordEvents = require('./discord-events');
const permissions = require('./permissions');
const timezone = require('./timezone');

async function handleMovieSession(interaction) {
  const action = interaction.options.getString('action');
  const guildId = interaction.guild.id;

  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - session features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  switch (action) {
    case 'create':
      await showSessionCreationModal(interaction);
      break;
    case 'list':
      await listMovieSessions(interaction);
      break;
    case 'close':
      await closeSessionVoting(interaction);
      break;
    case 'winner':
      await pickSessionWinner(interaction);
      break;
    case 'add-movie':
      await addMovieToSession(interaction);
      break;
    case 'join':
      await joinSession(interaction);
      break;
    default:
      await interaction.reply({
        content: '❌ Unknown action. Use create, list, close, winner, add-movie, or join.',
        flags: MessageFlags.Ephemeral
      });
  }
}

async function showSessionCreationModal(interaction) {
  // New improved workflow: Date → Time → Timezone → Details
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 1:** Choose your date first\n\n*Pick when you want to have your movie night*')
    .setColor(0x5865f2)
    .addFields({
      name: '📅 Current Selection',
      value: 'No date selected yet',
      inline: false
    });

  // Quick date options
  const quickDateButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_date:today')
        .setLabel('Today')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📅'),
      new ButtonBuilder()
        .setCustomId('session_date:tomorrow')
        .setLabel('Tomorrow')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📅'),
      new ButtonBuilder()
        .setCustomId('session_date:custom')
        .setLabel('Pick Specific Date')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🗓️')
    );

  // This week options
  const thisWeekButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_date:monday')
        .setLabel('Monday')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_date:tuesday')
        .setLabel('Tuesday')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_date:wednesday')
        .setLabel('Wednesday')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_date:thursday')
        .setLabel('Thursday')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_date:friday')
        .setLabel('Friday')
        .setStyle(ButtonStyle.Secondary)
    );

  // Weekend options
  const weekendButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_date:saturday')
        .setLabel('Saturday')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎉'),
      new ButtonBuilder()
        .setCustomId('session_date:sunday')
        .setLabel('Sunday')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏖️'),
      new ButtonBuilder()
        .setCustomId('session_date:no_date')
        .setLabel('No Specific Date')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝')
    );

  const msg = await interaction.reply({
    embeds: [embed],
    components: [quickDateButtons, thisWeekButtons, weekendButtons],
    flags: MessageFlags.Ephemeral,
    fetchReply: true
  });

  try {
    if (!global.sessionCreationState) global.sessionCreationState = new Map();
    const prev = global.sessionCreationState.get(interaction.user.id) || {};
    global.sessionCreationState.set(interaction.user.id, {
      ...prev,
      rootMessageId: msg.id
    });
  } catch (_) {}
}

async function listMovieSessions(interaction) {
  try {
    const sessions = await database.getMovieSessionsByGuild(interaction.guild.id);

    if (!sessions || sessions.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🎬 Movie Sessions')
        .setDescription('No active movie sessions found.\n\nUse `/movie-session action:create` to create your first session!')
        .setColor(0x5865f2);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🎬 Active Movie Sessions')
      .setDescription(`Found ${sessions.length} active session${sessions.length === 1 ? '' : 's'}:`)
      .setColor(0x5865f2);

    for (const session of sessions.slice(0, 10)) { // Limit to 10 sessions
      const scheduledText = session.scheduled_date
        ? `📅 ${timezone.formatDateWithTimezone(new Date(session.scheduled_date), session.timezone || 'UTC')}`
        : '📅 No specific date';

      const statusEmoji = {
        'planning': '📝',
        'voting': '🗳️',
        'decided': '✅',
        'completed': '🎉',
        'cancelled': '❌'
      }[session.status] || '📝';

      let movieInfo = '';
      if (session.associated_movie_id) {
        const movie = await database.getMovieById(session.associated_movie_id);
        if (movie) {
          movieInfo = `\n🎬 Featured: **${movie.title}**`;
        }
      }

      // Get session participants
      const participants = await database.getSessionParticipants(session.id);
      const participantInfo = participants.length > 0
        ? `\n👥 Participants: ${participants.length} joined`
        : `\n👥 No participants yet`;

      embed.addFields({
        name: `${statusEmoji} Session #${session.id}: ${session.name}`,
        value: `${scheduledText}\n👤 Organizer: <@${session.created_by}>\n📍 <#${session.channel_id}>${movieInfo}${participantInfo}`,
        inline: false
      });
    }

    embed.setFooter({
      text: `Use /movie-session action:join session-id:[ID] to join a session`
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error listing sessions:', error);
    await interaction.reply({
      content: '❌ Failed to retrieve sessions.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function closeSessionVoting(interaction) {
  const sessionId = interaction.options.getInteger('session-id');

  if (!sessionId) {
    await interaction.reply({
      content: '❌ Please provide a session ID. Use `/movie-session action:list` to see available sessions.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    const session = await database.getSessionById(sessionId);
    if (!session || session.guild_id !== interaction.guild.id) {
      await interaction.reply({
        content: '❌ Session not found or not in this server.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check if user is organizer or admin
    const isOrganizer = session.created_by === interaction.user.id;
    const isAdmin = await permissions.checkMovieAdminPermission(interaction);

    if (!isOrganizer && !isAdmin) {
      await interaction.reply({
        content: '❌ Only the session organizer or admins can close voting.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const success = await database.updateSessionStatus(sessionId, 'decided');
    if (success) {
      await interaction.reply({
        content: `✅ **Voting closed for session "${session.name}"**\n\nUse \`/movie-session action:winner session-id:${sessionId}\` to pick the winning movie.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to close voting.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Error closing session voting:', error);
    await interaction.reply({
      content: '❌ Failed to close voting.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function pickSessionWinner(interaction) {
  const sessionId = interaction.options.getInteger('session-id');

  if (!sessionId) {
    await interaction.reply({
      content: '❌ Please provide a session ID. Use `/movie-session action:list` to see available sessions.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    const session = await database.getSessionById(sessionId);
    if (!session || session.guild_id !== interaction.guild.id) {
      await interaction.reply({
        content: '❌ Session not found or not in this server.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check permissions
    const isOrganizer = session.created_by === interaction.user.id;
    const isAdmin = await permissions.checkMovieAdminPermission(interaction);

    if (!isOrganizer && !isAdmin) {
      await interaction.reply({
        content: '❌ Only the session organizer or admins can pick the winner.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Get top-voted movie from current queue
    const topMovie = await database.getTopVotedMovie(interaction.guild.id);
    if (!topMovie) {
      await interaction.reply({
        content: '❌ No movies found in the voting queue. Add some movie recommendations first!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Update session with winner
    const success = await database.updateSessionWinner(sessionId, topMovie.message_id);
    if (success) {
      await database.updateSessionStatus(sessionId, 'decided');

      await interaction.reply({
        content: `🎉 **Winner selected for "${session.name}"!**\n\n🏆 **${topMovie.title}**\n📺 ${topMovie.where_to_watch}\n👤 Recommended by <@${topMovie.recommended_by}>`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to set session winner.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Error picking session winner:', error);
    await interaction.reply({
      content: '❌ Failed to pick winner.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function addMovieToSession(interaction) {
  const sessionId = interaction.options.getInteger('session-id');
  const movieTitle = interaction.options.getString('movie-title');

  if (!sessionId || !movieTitle) {
    await interaction.reply({
      content: '❌ Please provide both session ID and movie title.\n\nExample: `/movie-session action:add-movie session-id:123 movie-title:The Matrix`',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    const session = await database.getSessionById(sessionId);
    if (!session || session.guild_id !== interaction.guild.id) {
      await interaction.reply({
        content: '❌ Session not found or not in this server.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Find movie in current recommendations
    const movie = await database.findMovieByTitle(interaction.guild.id, movieTitle);
    if (!movie) {
      await interaction.reply({
        content: `❌ Movie "${movieTitle}" not found in current recommendations.\n\nUse \`/movie-night\` to add it first, or check the exact title with \`/movie-queue\`.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Associate movie with session
    const success = await database.updateSessionMovie(sessionId, movie.message_id);
    if (success) {
      await interaction.reply({
        content: `✅ **Added "${movie.title}" to session "${session.name}"**\n\nThis movie is now featured in the session!`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to add movie to session.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Error adding movie to session:', error);
    await interaction.reply({
      content: '❌ Failed to add movie to session.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function joinSession(interaction) {
  const sessionId = interaction.options.getInteger('session-id');

  if (!sessionId) {
    await interaction.reply({
      content: '❌ Please provide a session ID. Use `/movie-session action:list` to see available sessions.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    const session = await database.getSessionById(sessionId);
    if (!session || session.guild_id !== interaction.guild.id) {
      await interaction.reply({
        content: '❌ Session not found or not in this server.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const scheduledText = session.scheduled_date
      ? timezone.formatDateWithTimezone(new Date(session.scheduled_date), session.timezone || 'UTC')
      : 'No specific date set';

    let movieInfo = '';
    if (session.associated_movie_id) {
      const movie = await database.getMovieById(session.associated_movie_id);
      if (movie) {
        movieInfo = `\n\n🎬 **Featured Movie:** ${movie.title}\n📺 ${movie.where_to_watch}`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎪 Joined: ${session.name}`)
      .setDescription(`You've joined this movie session!${movieInfo}`)
      .setColor(0x57f287)
      .addFields(
        { name: '📅 Scheduled', value: scheduledText, inline: true },
        { name: '👤 Organizer', value: `<@${session.created_by}>`, inline: true },
        { name: '📍 Channel', value: `<#${session.channel_id}>`, inline: true }
      )
      .setFooter({ text: `Session ID: ${session.id}` });

    // Add user to session participants
    const participantAdded = await database.addSessionParticipant(session.id, interaction.user.id);

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

    if (participantAdded) {
      console.log(`✅ Added user ${interaction.user.id} to session ${session.id}`);
    }

  } catch (error) {
    console.error('Error joining session:', error);
    await interaction.reply({
      content: '❌ Failed to join session.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleCreateSessionFromMovie(interaction, messageId) {
  console.log(`Create session from movie: ${messageId}`);
  // Get the movie from the database
  const movie = await database.getMovieById(messageId, interaction.guild.id);
  if (!movie) {
    await interaction.reply({
      content: '❌ Movie not found.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  console.log(`Create session from movie: ${messageId} - ${movie.title}`);

  // Initialize session state with pre-selected movie
  if (!global.sessionCreationState) {
    global.sessionCreationState = new Map();
  }

  const state = {
    step: 'date',
    selectedMovie: messageId,
    movieTitle: movie.title,
    movieDisplay: `**${movie.title}**\n📺 ${movie.where_to_watch}`,
    selectedDate: null,
    selectedTime: null,
    selectedTimezone: null,
    sessionName: null,
    sessionDescription: null
  };

  global.sessionCreationState.set(interaction.user.id, state);

  // Start session creation flow with movie pre-selected
  await showSessionCreationModal(interaction);
}

async function handleSessionCreationButton(interaction) {
  const customId = interaction.customId;

  // Initialize session state if needed
  if (!global.sessionCreationState) {
    global.sessionCreationState = new Map();
  }

  const userId = interaction.user.id;
  let state = global.sessionCreationState.get(userId) || {};

  try {
    if (customId.startsWith('session_date:')) {
      await handleDateSelection(interaction, customId, state);
    } else if (customId.startsWith('session_time:')) {
      await handleTimeSelection(interaction, customId, state);
    } else if (customId.startsWith('session_timezone:')) {
      await handleTimezoneSelection(interaction, customId, state);
    } else if (customId.startsWith('session_create:')) {
      await handleFinalCreation(interaction, customId, state);
    } else if (customId === 'session_create_final') {
      await showSessionDetailsModal(interaction, state);
    } else if (customId === 'session_back_to_timezone') {
      await showTimezoneSelection(interaction, state);
    } else if (customId === 'session_back_to_movie') {
      // Import the function from selects handler
      const selectsHandler = require('../handlers/selects');
      await selectsHandler.showMovieSelection(interaction, state);
    } else {
      await interaction.reply({
        content: '❌ Unknown session creation action.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Error handling session creation button:', error);
    await interaction.reply({
      content: '❌ Error processing session creation.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleDateSelection(interaction, customId, state) {
  const dateType = customId.split(':')[1];

  // Calculate the actual date based on selection
  let selectedDate = new Date();
  let dateDisplay = '';

  switch (dateType) {
    case 'today':
      dateDisplay = 'Today';
      break;
    case 'tomorrow':
      selectedDate.setDate(selectedDate.getDate() + 1);
      dateDisplay = 'Tomorrow';
      break;
    case 'monday':
    case 'tuesday':
    case 'wednesday':
    case 'thursday':
    case 'friday':
    case 'saturday':
    case 'sunday':
      selectedDate = getNextWeekday(dateType);
      dateDisplay = `${dateType.charAt(0).toUpperCase() + dateType.slice(1)}`;
      break;
    case 'custom':
      await showCustomDateModal(interaction);
      return;
    case 'no_date':
      state.selectedDate = null;
      state.dateDisplay = 'No specific date';
      global.sessionCreationState.set(interaction.user.id, state);
      // If rescheduling, skip timezone selection and proceed to details
      const isReschedule = global.sessionRescheduleState && global.sessionRescheduleState.has(interaction.user.id);
      if (isReschedule) {
        if (!state.selectedTimezone) state.selectedTimezone = state.timezone || 'UTC';
        if (!state.timezoneName) state.timezoneName = state.selectedTimezone;
        await showSessionDetailsModal(interaction, state);
      } else {
        await showTimezoneSelection(interaction, state);
      }
      return;
  }

  state.selectedDate = selectedDate;
  state.dateDisplay = dateDisplay;
  global.sessionCreationState.set(interaction.user.id, state);

  await showTimeSelection(interaction, state);
}

async function showTimeSelection(interaction, state) {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 2:** Choose your time\n\n*What time works best for your movie night?*')
    .setColor(0x5865f2)
    .addFields(
      { name: '📅 Selected Date', value: state.dateDisplay, inline: true },
      { name: '🕐 Current Selection', value: 'No time selected yet', inline: true }
    );

  // Common time options
  const timeButtons1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_time:6pm')
        .setLabel('6:00 PM')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('session_time:7pm')
        .setLabel('7:00 PM')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('session_time:8pm')
        .setLabel('8:00 PM')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('session_time:9pm')
        .setLabel('9:00 PM')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('session_time:10pm')
        .setLabel('10:00 PM')
        .setStyle(ButtonStyle.Primary)
    );

  const timeButtons2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_time:11pm')
        .setLabel('11:00 PM')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('session_time:12pm')
        .setLabel('12:00 PM')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_time:1pm')
        .setLabel('1:00 PM')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_time:2pm')
        .setLabel('2:00 PM')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_time:custom')
        .setLabel('Custom Time')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏰')
    );

  await interaction.update({
    embeds: [embed],
    components: [timeButtons1, timeButtons2]
  });
}

async function handleTimeSelection(interaction, customId, state) {
  const timeType = customId.split(':')[1];

  if (timeType === 'custom') {
    await showCustomTimeModal(interaction);
    return;
  }

  // Parse time (e.g., "11pm" -> 23:00)
  let timeDisplay = '';
  let hour = 0;

  if (timeType.includes('pm')) {
    const hourNum = parseInt(timeType.replace('pm', ''));
    hour = hourNum === 12 ? 12 : hourNum + 12;
    timeDisplay = `${hourNum}:00 PM`;
  } else if (timeType.includes('am')) {
    hour = parseInt(timeType.replace('am', ''));
    if (hour === 12) hour = 0;
    timeDisplay = `${hour === 0 ? 12 : hour}:00 AM`;
  }

  state.selectedTime = { hour, minute: 0 };
  state.timeDisplay = timeDisplay;
  global.sessionCreationState.set(interaction.user.id, state);

  // If this is a reschedule flow, skip timezone selection and go straight to details
  const isReschedule = global.sessionRescheduleState && global.sessionRescheduleState.has(interaction.user.id);
  if (isReschedule) {
    if (!state.selectedTimezone) state.selectedTimezone = state.timezone || 'UTC';
    if (!state.timezoneName) state.timezoneName = state.selectedTimezone;
    await showSessionDetailsModal(interaction, state);
  } else {
    await showTimezoneSelection(interaction, state);
  }
}

async function showTimezoneSelection(interaction, state) {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 3:** Choose your timezone\n\n*This ensures everyone sees the correct time for your session*')
    .setColor(0x5865f2)
    .addFields(
      { name: '📅 Selected Date', value: state.dateDisplay, inline: true },
      { name: '🕐 Selected Time', value: state.timeDisplay || 'No specific time', inline: true },
      { name: '🌍 Current Selection', value: 'No timezone selected yet', inline: true }
    );

  const timezoneSelect = new StringSelectMenuBuilder()
    .setCustomId('session_timezone_selected')
    .setPlaceholder('Choose your timezone...')
    .addOptions(
      TIMEZONE_OPTIONS.map(tz => ({
        label: tz.label,
        value: tz.value,
        emoji: tz.emoji
      }))
    );

  const row = new ActionRowBuilder().addComponents(timezoneSelect);

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

async function handleTimezoneSelection(interaction, customId, state) {
  const timezone = customId.split(':')[1];
  state.timezone = timezone;

  // Update state
  global.sessionCreationState.set(interaction.user.id, state);

  // Show final creation step
  await showFinalCreation(interaction, state);
}

// Helper function to get next occurrence of a weekday
function getNextWeekday(dayName) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  const today = new Date();
  const currentDay = today.getDay();

  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }

  const result = new Date(today);
  result.setDate(today.getDate() + daysToAdd);
  return result;
}

async function showCustomDateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('session_custom_date_modal')
    .setTitle('Custom Date Selection');

  const dateInput = new TextInputBuilder()
    .setCustomId('custom_date')
    .setLabel('Enter Date (MM/DD/YYYY)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('12/25/2024')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(dateInput);
  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}

async function showCustomTimeModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('session_custom_time_modal')
    .setTitle('Custom Time Selection');

  const timeInput = new TextInputBuilder()
    .setCustomId('custom_time')
    .setLabel('Enter Time (e.g., 11:30 PM)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('11:30 PM')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(timeInput);
  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}

async function showSessionDetailsModal(interaction, state) {
  // Generate smart templated name and description
  const templatedName = generateSessionName(state);

  // For reschedule, pre-fill ONLY the original base description (no auto-added voting/channel/time text)
  let templatedDescription;
  try {
    const isReschedule = global.sessionRescheduleState && global.sessionRescheduleState.has(interaction.user.id);
    if (isReschedule) {
      const resState = global.sessionRescheduleState.get(interaction.user.id);
      templatedDescription = (resState?.originalSession?.description || '').trim();
    }
  } catch (_) {}
  if (templatedDescription === undefined) {
    templatedDescription = await generateSessionDescription(state, interaction);
  }

  const modal = new ModalBuilder()
    .setCustomId('session_details_modal')
    .setTitle('Movie Night Session Details');

  const nameInput = new TextInputBuilder()
    .setCustomId('session_name')
    .setLabel('Session Name (Edit as needed)')
    .setStyle(TextInputStyle.Short)
    .setValue(templatedName) // Pre-filled with smart template
    .setRequired(true)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('session_description')
    .setLabel('Description (Edit as needed)')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(templatedDescription) // Pre-filled with movie info
    .setRequired(false)
    .setMaxLength(1000);

  const nameRow = new ActionRowBuilder().addComponents(nameInput);
  const descRow = new ActionRowBuilder().addComponents(descriptionInput);

  modal.addComponents(nameRow, descRow);

  await interaction.showModal(modal);
}

function generateSessionName(state) {
  let name = 'Watch Party';

  // Add movie title if selected
  if (state.selectedMovie && state.movieTitle) {
    name += ` - ${state.movieTitle}`;
  }

  // Add date and time
  if (state.dateDisplay && state.timeDisplay) {
    name += ` - ${state.dateDisplay}, ${state.timeDisplay}`;
  } else if (state.dateDisplay) {
    name += ` - ${state.dateDisplay}`;
  }

  // Add timezone
  if (state.timezoneName && state.timeDisplay) {
    name += ` ${state.timezoneName.split(' ')[0]}`; // Just the timezone abbreviation
  }

  return name;
}

async function generateSessionDescription(state, interaction) {
  let description = '';

  // Add movie information if selected
  if (state.selectedMovie && state.selectedMovie !== 'no_movie') {
    try {
      const movie = await database.getMovieById(state.selectedMovie, interaction.guild.id);
      if (movie) {
        description += `**Featured Movie:** ${movie.title}\n`;
        description += `**Where to Watch:** ${movie.where_to_watch}\n`;
        description += `**Recommended by:** <@${movie.recommended_by}>\n\n`;

        // Add IMDb info if available
        if (movie.imdb_id) {
          try {
            const imdb = require('./imdb');
            const imdbData = await imdb.getMovieDetails(movie.imdb_id);
            if (imdbData && imdbData.Plot && imdbData.Plot !== 'N/A') {
              description += `**Synopsis:** ${imdbData.Plot}\n\n`;
            }
            if (imdbData && imdbData.Genre && imdbData.Genre !== 'N/A') {
              description += `**Genre:** ${imdbData.Genre}\n`;
            }
            if (imdbData && imdbData.Runtime && imdbData.Runtime !== 'N/A') {
              description += `**Runtime:** ${imdbData.Runtime}\n`;
            }
            if (imdbData && imdbData.imdbRating && imdbData.imdbRating !== 'N/A') {
              description += `**IMDb Rating:** ${imdbData.imdbRating}/10\n\n`;
            }
          } catch (imdbError) {
            console.warn('Could not fetch IMDb data:', imdbError.message);
            // Continue without IMDb data
          }
        }
      }
    } catch (error) {
      console.error('Error generating movie description:', error);
    }
  }

  // Add session details
  if (state.dateDisplay && state.timeDisplay) {
    description += `**When:** ${state.dateDisplay} at ${state.timeDisplay}`;
    if (state.timezoneName) {
      description += ` (${state.timezoneName})`;
    }
    description += '\n';
  }

  description += '\nJoin us for an awesome movie night! Feel free to bring snacks and get ready for a great time!';

  return description;
}

async function handleSessionManagement(interaction) {
  const customId = interaction.customId;
  const [action, sessionId, movieMessageId] = customId.split(':');

  try {
    if (action === 'session_reschedule') {
      await handleSessionReschedule(interaction, sessionId, movieMessageId);
    } else if (action === 'session_cancel') {
      await handleSessionCancel(interaction, sessionId, movieMessageId);
    } else {
      await interaction.reply({
        content: '❌ Unknown session management action.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Error handling session management:', error);
    await interaction.reply({
      content: '❌ Error processing session management.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleSessionReschedule(interaction, sessionId, movieMessageId) {
  // Check permissions - only session creator or admins can reschedule
  const session = await database.getSessionById(sessionId);
  if (!session) {
    await interaction.reply({
      content: '❌ Session not found.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const isCreator = session.created_by === interaction.user.id;
  const isAdmin = await permissions.checkMovieAdminPermission(interaction);

  if (!isCreator && !isAdmin) {
    await interaction.reply({
      content: '❌ Only the session creator or admins can reschedule sessions.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Store reschedule state
  if (!global.sessionRescheduleState) {
    global.sessionRescheduleState = new Map();
  }

  global.sessionRescheduleState.set(interaction.user.id, {
    sessionId,
    movieMessageId,
    originalSession: session
  });

  // Pre-seed creation state to skip movie/timezone selection during reschedule
  if (!global.sessionCreationState) {
    global.sessionCreationState = new Map();
  }
  const preset = {
    step: 'date',
    selectedMovie: session.associated_movie_id || null,
    movieTitle: null,
    movieDisplay: null,
    selectedDate: null,
    selectedTime: null,
    selectedTimezone: session.timezone || 'UTC',
    timezone: session.timezone || 'UTC',
    timezoneName: session.timezone || 'UTC',
    sessionName: session.name || null,
    sessionDescription: session.description || null,
    isReschedule: true
  };
  global.sessionCreationState.set(interaction.user.id, preset);


  // Start the reschedule flow using the same creation UI
  await showSessionCreationModal(interaction);
}

async function handleSessionCancel(interaction, sessionId, movieMessageId) {
  // Check permissions - only session creator or admins can cancel
  const session = await database.getSessionById(sessionId);
  if (!session) {
    await interaction.reply({
      content: '❌ Session not found.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const isCreator = session.created_by === interaction.user.id;
  const isAdmin = await permissions.checkMovieAdminPermission(interaction);

  if (!isCreator && !isAdmin) {
    await interaction.reply({
      content: '❌ Only the session creator or admins can cancel sessions.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Show confirmation dialog
  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ Cancel Movie Session')
    .setDescription(`Are you sure you want to cancel **${session.name}**?`)
    .setColor(0xed4245)
    .addFields(
      { name: '📝 Session', value: session.name, inline: true },
      { name: '🆔 Session ID', value: sessionId.toString(), inline: true }
    );

  if (session.scheduled_date) {
    confirmEmbed.addFields({
      name: '📅 Scheduled',
      value: `<t:${Math.floor(new Date(session.scheduled_date).getTime() / 1000)}:F>`,
      inline: false
    });
  }

  const confirmButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_cancel:${sessionId}:${movieMessageId}`)
        .setLabel('✅ Yes, Cancel Session')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_cancel')
        .setLabel('❌ No, Keep Session')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.reply({
    embeds: [confirmEmbed],
    components: [confirmButtons],
    flags: MessageFlags.Ephemeral
  });
}

async function handleCancelConfirmation(interaction) {
  const customId = interaction.customId;

  if (customId === 'cancel_cancel') {
    await interaction.update({
      content: '✅ Session cancellation cancelled.',
      embeds: [],
      components: []
    });
    return;
  }

  // Extract session and movie IDs from confirm_cancel button
  const [, sessionId, movieMessageId] = customId.split(':');

  try {
    // Get session details
    const session = await database.getSessionById(sessionId);
    if (!session) {
      await interaction.update({
        content: '❌ Session not found.',
        embeds: [],
        components: []
      });
      return;
    }

    // Delete Discord event if it exists
    if (session.discord_event_id) {
      try {
        await discordEvents.deleteDiscordEvent(interaction.guild, session.discord_event_id);
        console.log(`✅ Deleted Discord event ${session.discord_event_id}`);
      } catch (error) {
        console.warn('Failed to delete Discord event:', error.message);
      }
    }

    // Delete session from database
    await database.deleteMovieSession(sessionId);

    // Reset movie status back to 'planned'
    if (movieMessageId) {
      await database.updateMovieStatus(movieMessageId, 'planned');

      // Update the movie post to remove session buttons and restore voting
      await restoreMoviePost(interaction, movieMessageId);
    }

    await interaction.update({
      content: `✅ **Session Cancelled**\n\nSession "${session.name}" has been cancelled and the movie has been returned to "Planned for later" status.`,
      embeds: [],
      components: []
    });

    console.log(`✅ Cancelled session ${sessionId} and restored movie ${movieMessageId}`);

  } catch (error) {
    console.error('Error cancelling session:', error);
    await interaction.update({
      content: '❌ Error cancelling session.',
      embeds: [],
      components: []
    });
  }
}

async function restoreMoviePost(interaction, movieMessageId) {
  try {
    // Get movie details from database
    const movie = await database.getMovieById(movieMessageId, interaction.guild.id);
    if (!movie) {
      console.warn('Movie not found for post restoration');
      return;
    }

    // Get the movie channel
    const channel = interaction.channel;

    // Find the movie message
    const movieMessage = await channel.messages.fetch(movieMessageId).catch(() => null);
    if (!movieMessage) {
      console.warn('Movie message not found for restoration');
      return;
    }

    // Get vote counts
    const voteCounts = await database.getVoteCounts(movieMessageId);

    // Create voting buttons (restore to normal movie post state)
    const { components } = require('../utils');
    const movieComponents = components.createStatusButtons(movieMessageId, movie.status, voteCounts.up, voteCounts.down);

    // Update the message to restore voting buttons
    await movieMessage.edit({
      embeds: movieMessage.embeds, // Keep existing embeds
      components: movieComponents
    });

    console.log(`🔄 Restored movie post ${movieMessageId} to voting state`);
  } catch (error) {
    console.error('Error restoring movie post:', error);
  }
}



async function updateMoviePostForSession(interaction, movieMessageId, sessionId, sessionName, scheduledDate, discordEventId) {
  try {
    console.log(`🎬 Updating movie post ${movieMessageId} for session ${sessionId}`);

    // Get movie details from database
    const movie = await database.getMovieById(movieMessageId, interaction.guild.id);
    if (!movie) {
      console.warn('Movie not found for post update');
      return;
    }

    // Update movie status in database to 'scheduled'
    await database.updateMovieStatus(movieMessageId, 'scheduled');

    // Find the original movie post
    const channel = interaction.guild.channels.cache.get(movie.channel_id);
    if (!channel) {
      console.warn('Movie channel not found');
      return;
    }

    const message = await channel.messages.fetch(movieMessageId).catch(() => null);
    if (!message) {
      console.warn('Movie message not found');
      return;
    }

    // Get current embed and update it
    const currentEmbed = message.embeds[0];
    if (!currentEmbed) {
      console.warn('Movie embed not found');
      return;
    }

    // Create updated embed
    const updatedEmbed = new EmbedBuilder()
      .setTitle(currentEmbed.title)
      .setDescription(currentEmbed.description)
      .setColor(0x57f287) // Green for scheduled
      .setThumbnail(currentEmbed.thumbnail?.url || null);

    // Copy existing fields and update status
    currentEmbed.fields.forEach(field => {
      if (field.name === '📊 Status') {
        let statusValue = `🗓️ **Scheduled for Session**\n📝 Session: ${sessionName}\n🆔 Session ID: ${sessionId}`;

        // Add event link if available
        if (discordEventId) {
          statusValue += `\n🎪 [View Discord Event](https://discord.com/events/${interaction.guild.id}/${discordEventId})`;
        }

        updatedEmbed.addFields({
          name: '📊 Status',
          value: statusValue,
          inline: true
        });
      } else if (field.name === '🗓️ Session Info') {
        // Skip - we'll add updated session info
      } else {
        updatedEmbed.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline || false
        });
      }
    });

    // Add session information
    if (scheduledDate) {
      // Use Discord timestamp for accurate timezone display
      const timestamp = Math.floor(scheduledDate.getTime() / 1000);
      updatedEmbed.addFields({
        name: '🗓️ Session Info',
        value: `📅 **When:** <t:${timestamp}:F>\n🎪 **Session:** ${sessionName}`,
        inline: false
      });
    }

    updatedEmbed.setFooter({ text: `Scheduled for movie session • Session ID: ${sessionId}` });

    // Add session management buttons
    const sessionButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`session_reschedule:${sessionId}:${movieMessageId}`)
          .setLabel('📅 Reschedule')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄'),
        new ButtonBuilder()
          .setCustomId(`session_cancel:${sessionId}:${movieMessageId}`)
          .setLabel('❌ Cancel Event')
          .setStyle(ButtonStyle.Danger)
      );

    // Update the message with session management buttons
    await message.edit({
      embeds: [updatedEmbed],
      components: [sessionButtons]
    });

    // Update the thread if it exists
    if (message.hasThread) {
      const thread = message.thread;
      if (thread) {
        const sessionEmbed = new EmbedBuilder()
          .setTitle('🎉 Movie Scheduled for Session!')
          .setDescription(`This movie has been scheduled for a movie night session!`)
          .setColor(0x57f287)
          .addFields(
            { name: '📝 Session Name', value: sessionName, inline: false },
            { name: '🆔 Session ID', value: sessionId.toString(), inline: true }
          );

        if (scheduledDate) {
          const timestamp = Math.floor(scheduledDate.getTime() / 1000);
          sessionEmbed.addFields({
            name: '📅 When',
            value: `<t:${timestamp}:F>`,
            inline: false
          });
        }

        await thread.send({ embeds: [sessionEmbed] });
      }
    }

    console.log(`✅ Updated movie post ${movieMessageId} for session ${sessionId}`);

  } catch (error) {
    console.error('Error updating movie post for session:', error);
    // Don't fail the session creation if post update fails
  }
}

async function handleCustomDateTimeModal(interaction) {
  try {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    let state = global.sessionCreationState.get(userId) || {};

    if (customId === 'session_custom_date_modal') {
      const dateStr = interaction.fields.getTextInputValue('custom_date');
      const parsedDate = new Date(dateStr);

      if (isNaN(parsedDate.getTime())) {
        await interaction.reply({
          content: '❌ Invalid date format. Please use MM/DD/YYYY format (e.g., 12/25/2024).',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      state.selectedDate = parsedDate;
      state.dateDisplay = parsedDate.toLocaleDateString();
      global.sessionCreationState.set(userId, state);

      await showTimeSelection(interaction, state);

    } else if (customId === 'session_custom_time_modal') {
      const timeStr = interaction.fields.getTextInputValue('custom_time');
      const timeMatch = timeStr.match(/^(\d{1,2}):?(\d{0,2})\s*(am|pm)?$/i);

      if (!timeMatch) {
        await interaction.reply({
          content: '❌ Invalid time format. Please use format like "11:30 PM" or "7 AM".',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2] || '0');
      const isPM = timeMatch[3]?.toLowerCase() === 'pm';

      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      state.selectedTime = { hour, minute };
      state.timeDisplay = formatTime(hour, minute);
      global.sessionCreationState.set(userId, state);

      await showTimezoneSelection(interaction, state);
    }
  } catch (error) {
    console.error('Error handling custom date/time modal:', error);
    await interaction.reply({
      content: '❌ Error processing custom date/time.',
      flags: MessageFlags.Ephemeral
    });
  }
}

function formatTime(hour, minute) {
  const isPM = hour >= 12;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const minuteStr = minute.toString().padStart(2, '0');
  return `${displayHour}:${minuteStr} ${isPM ? 'PM' : 'AM'}`;
}

function createDateInTimezone(baseDate, hour, minute, timezone) {
  // Create a date string in the format that works with timezone
  const year = baseDate.getFullYear();
  const month = (baseDate.getMonth() + 1).toString().padStart(2, '0');
  const day = baseDate.getDate().toString().padStart(2, '0');
  const hourStr = hour.toString().padStart(2, '0');
  const minuteStr = minute.toString().padStart(2, '0');

  // Map our timezone values to proper timezone identifiers
  const timezoneMap = {
    'America/New_York': 'America/New_York',
    'America/Chicago': 'America/Chicago',
    'America/Denver': 'America/Denver',
    'America/Los_Angeles': 'America/Los_Angeles',
    'America/Phoenix': 'America/Phoenix',
    'America/Anchorage': 'America/Anchorage',
    'Pacific/Honolulu': 'Pacific/Honolulu',
    'Europe/London': 'Europe/London',
    'Europe/Paris': 'Europe/Paris',
    'Asia/Tokyo': 'Asia/Tokyo',
    'UTC': 'UTC'
  };

  const tzIdentifier = timezoneMap[timezone] || 'UTC';

  try {
    // Create the date in the specified timezone
    const dateStr = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00`;

    // Use Intl.DateTimeFormat to handle timezone conversion properly
    const tempDate = new Date(dateStr);

    // Get the timezone offset for the target timezone
    const targetDate = new Date(tempDate.toLocaleString('en-US', { timeZone: tzIdentifier }));
    const localDate = new Date(tempDate.toLocaleString('en-US'));
    const offset = localDate.getTime() - targetDate.getTime();

    // Apply the offset to get the correct UTC time
    const utcDate = new Date(tempDate.getTime() + offset);

    console.log(`🌍 Created date: ${dateStr} in ${tzIdentifier} -> UTC: ${utcDate.toISOString()}`);
    return utcDate;

  } catch (error) {
    console.error('Error creating date in timezone:', error);
    // Fallback to simple date creation
    const fallbackDate = new Date(baseDate);
    fallbackDate.setHours(hour, minute, 0, 0);
    return fallbackDate;
  }
}

async function createMovieSessionFromModal(interaction) {
  try {
    // Get session state
    if (!global.sessionCreationState) {
      await interaction.reply({
        content: '❌ Session creation state not found. Please start over with `/movie-session action:create`.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const userId = interaction.user.id;
    const state = global.sessionCreationState.get(userId);

    if (!state) {
      await interaction.reply({
        content: '❌ Session creation state not found. Please start over with `/movie-session action:create`.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Get modal inputs
    const sessionName = interaction.fields.getTextInputValue('session_name');
    const sessionDescription = interaction.fields.getTextInputValue('session_description') || null;

    // Calculate final date/time in the selected timezone
    let scheduledDate = null;
    if (state.selectedDate && state.selectedTime) {
      scheduledDate = createDateInTimezone(
        state.selectedDate,
        state.selectedTime.hour,
        state.selectedTime.minute,
        state.selectedTimezone || 'UTC'
      );
    }

    // If this is a reschedule flow, update existing session instead of creating a new one
    const resMap = global.sessionRescheduleState;
    const resState = resMap ? resMap.get(userId) : null;
    const tz = state.selectedTimezone || state.timezone || 'UTC';

    if (resState && resState.sessionId) {
      const sessionId = resState.sessionId;

      // Update session core details
      await database.updateMovieSessionDetails(sessionId, {
        name: sessionName,
        description: sessionDescription,
        scheduledDate: scheduledDate,
        timezone: tz
      });

      // Update or create Discord scheduled event
      let discordEventId = resState.originalSession?.discord_event_id || null;
      if (discordEventId) {
        await discordEvents.updateDiscordEvent(
          interaction.guild,
          discordEventId,
          { id: sessionId, name: sessionName, description: sessionDescription },
          scheduledDate
        );
      } else if (scheduledDate) {
        const sessionData = {
          id: sessionId,
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
          name: sessionName,
          description: sessionDescription,
          createdBy: resState.originalSession?.created_by || interaction.user.id,
          scheduledDate: scheduledDate,
          timezone: tz,
          status: resState.originalSession?.status || 'planning',
          associatedMovieId: resState.originalSession?.associated_movie_id || state.selectedMovie || null
        };
        const newEventId = await discordEvents.createDiscordEvent(interaction.guild, sessionData, scheduledDate);
        if (newEventId) {
          await database.updateSessionDiscordEvent(sessionId, newEventId);
          discordEventId = newEventId;
        }
      }

      // Update the movie post if known
      const movieMessageId = resState.movieMessageId || resState.originalSession?.associated_movie_id || state.selectedMovie || null;
      if (movieMessageId) {
        await updateMoviePostForSession(interaction, movieMessageId, sessionId, sessionName, scheduledDate, discordEventId || null);
      }

      // Acknowledge success
      const ts = scheduledDate ? Math.floor(new Date(scheduledDate).getTime() / 1000) : null;
      const msg = ts
        ? `✅ Session "${sessionName}" rescheduled to <t:${ts}:F>`
        : `✅ Session "${sessionName}" updated.`;

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }

      // Best-effort: close the original ephemeral panel if we created one
      try {
        if (state.rootMessageId && interaction.webhook && interaction.webhook.deleteMessage) {
          await interaction.webhook.deleteMessage(state.rootMessageId).catch(async () => {
            // Fallback: edit message to remove components
            await interaction.webhook.editMessage(state.rootMessageId, { content: '✅ Rescheduled.', components: [], embeds: [] }).catch(() => {});
          });
        }
      } catch (_) {}

      // Clean state
      global.sessionCreationState.delete(userId);
      try { global.sessionRescheduleState.delete(userId); } catch {}
      return;
    }

    // Create session in database
    const sessionData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      name: sessionName,
      description: sessionDescription,
      createdBy: interaction.user.id,
      scheduledDate: scheduledDate,
      timezone: tz,
      status: 'planning',
      associatedMovieId: state.selectedMovie || null
    };

    const sessionId = await database.createMovieSession(sessionData);

    if (!sessionId) {
      await interaction.reply({
        content: '❌ Failed to create movie session.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Add the session ID to sessionData for Discord event creation
    sessionData.id = sessionId;

    // Create Discord scheduled event if date is set
    let discordEventId = null;
    if (scheduledDate) {
      discordEventId = await discordEvents.createDiscordEvent(interaction.guild, sessionData, scheduledDate);
      if (discordEventId) {
        await database.updateSessionDiscordEvent(sessionId, discordEventId);
      }
    }

    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle('🎉 Movie Session Created!')
      .setDescription(`**${sessionName}** has been created successfully!`)
      .setColor(0x57f287)
      .addFields(
        { name: '📅 Date', value: state.dateDisplay, inline: true },
        { name: '🕐 Time', value: state.timeDisplay || 'No specific time', inline: true },
        { name: '🌍 Timezone', value: state.timezoneName, inline: true },
        { name: '📍 Channel', value: `<#${interaction.channel.id}>`, inline: true },
        { name: '🆔 Session ID', value: sessionId.toString(), inline: true },
        { name: '🎪 Discord Event', value: discordEventId ? '✅ Created' : '❌ Not created', inline: true }
      )
      .setFooter({ text: `Use /movie-session action:list to see all sessions` })
      .setTimestamp();

    if (sessionDescription) {
      embed.addFields({ name: '📝 Description', value: sessionDescription, inline: false });
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

    // Update the movie post if a movie was selected
    if (state.selectedMovie && state.selectedMovie !== 'no_movie') {
      await updateMoviePostForSession(interaction, state.selectedMovie, sessionId, sessionName, scheduledDate, discordEventId);
    }

    // Clean up session state
    global.sessionCreationState.delete(userId);

  } catch (error) {
    console.error('Error creating session from modal:', error);
    await interaction.reply({
      content: '❌ Failed to create movie session.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function showTimezoneSelector(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🌍 Select Your Timezone')
    .setDescription('Choose the timezone for your movie session:')
    .setColor(0x5865f2);

  const timezoneSelect = new StringSelectMenuBuilder()
    .setCustomId('session_timezone_selected')
    .setPlaceholder('Choose your timezone...')
    .addOptions(
      TIMEZONE_OPTIONS.map(tz => ({
        label: tz.label,
        value: tz.value,
        emoji: tz.emoji
      }))
    );

  const row = new ActionRowBuilder().addComponents(timezoneSelect);

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

module.exports = {
  handleMovieSession,
  showSessionCreationModal,
  listMovieSessions,
  closeSessionVoting,
  pickSessionWinner,
  addMovieToSession,
  joinSession,
  handleCreateSessionFromMovie,
  handleSessionCreationButton,
  handleCustomDateTimeModal,
  handleSessionManagement,
  handleSessionReschedule,
  handleSessionCancel,
  handleCancelConfirmation,
  createMovieSessionFromModal,
  showTimezoneSelector
};
