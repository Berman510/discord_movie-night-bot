/**
 * Session Management Service
 * Handles movie session creation, management, and interactions
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

  await interaction.reply({
    embeds: [embed],
    components: [quickDateButtons, thisWeekButtons, weekendButtons],
    flags: MessageFlags.Ephemeral
  });
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

      embed.addFields({
        name: `${statusEmoji} Session #${session.id}: ${session.name}`,
        value: `${scheduledText}\n👤 Organizer: <@${session.created_by}>\n📍 <#${session.channel_id}>${movieInfo}`,
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
    const session = await database.getMovieSessionById(sessionId);
    if (!session || session.guild_id !== interaction.guild.id) {
      await interaction.reply({
        content: '❌ Session not found or not in this server.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check if user is organizer or admin
    const { permissions } = require('./permissions');
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
    const session = await database.getMovieSessionById(sessionId);
    if (!session || session.guild_id !== interaction.guild.id) {
      await interaction.reply({
        content: '❌ Session not found or not in this server.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check permissions
    const { permissions } = require('./permissions');
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
    const session = await database.getMovieSessionById(sessionId);
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
    const session = await database.getMovieSessionById(sessionId);
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

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

    // TODO: In future, could add user to session participants table

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
  await interaction.reply({ content: 'Create session from movie coming soon!', flags: MessageFlags.Ephemeral });
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
      await showTimezoneSelection(interaction, state);
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

  await showTimezoneSelection(interaction, state);
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
  const templatedDescription = await generateSessionDescription(state);

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

async function generateSessionDescription(state) {
  let description = '';

  // Add movie information if selected
  if (state.selectedMovie && state.selectedMovie !== 'no_movie') {
    try {
      const movie = await database.getMovieById(state.selectedMovie);
      if (movie) {
        description += `🎬 **Featured Movie:** ${movie.title}\n`;
        description += `📺 **Where to Watch:** ${movie.where_to_watch}\n`;
        description += `👤 **Recommended by:** <@${movie.recommended_by}>\n\n`;

        // Add IMDb info if available
        if (movie.imdb_id) {
          const { imdb } = require('./imdb');
          const imdbData = await imdb.getMovieDetails(movie.imdb_id);
          if (imdbData && imdbData.Plot && imdbData.Plot !== 'N/A') {
            description += `📖 **Synopsis:** ${imdbData.Plot}\n\n`;
          }
          if (imdbData && imdbData.Genre && imdbData.Genre !== 'N/A') {
            description += `🎭 **Genre:** ${imdbData.Genre}\n`;
          }
          if (imdbData && imdbData.Runtime && imdbData.Runtime !== 'N/A') {
            description += `⏱️ **Runtime:** ${imdbData.Runtime}\n`;
          }
          if (imdbData && imdbData.imdbRating && imdbData.imdbRating !== 'N/A') {
            description += `⭐ **IMDb Rating:** ${imdbData.imdbRating}/10\n\n`;
          }
        }
      }
    } catch (error) {
      console.error('Error generating movie description:', error);
    }
  }

  // Add session details
  if (state.dateDisplay && state.timeDisplay) {
    description += `📅 **When:** ${state.dateDisplay} at ${state.timeDisplay}`;
    if (state.timezoneName) {
      description += ` (${state.timezoneName})`;
    }
    description += '\n';
  }

  description += '\n🍿 Join us for an awesome movie night! Feel free to bring snacks and get ready for a great time!';

  return description;
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

    // Calculate final date/time
    let scheduledDate = null;
    if (state.selectedDate && state.selectedTime) {
      scheduledDate = new Date(state.selectedDate);
      scheduledDate.setHours(state.selectedTime.hour, state.selectedTime.minute, 0, 0);
    }

    // Create session in database
    const sessionData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      name: sessionName,
      description: sessionDescription,
      createdBy: interaction.user.id,
      scheduledDate: scheduledDate,
      timezone: state.selectedTimezone || 'UTC',
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
  createMovieSessionFromModal,
  showTimezoneSelector
};
