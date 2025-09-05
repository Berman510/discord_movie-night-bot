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
  // Enhanced session creation with prominent timezone selection
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 1:** Choose your timezone first, then select date and time.\n\n*Timezone selection ensures everyone sees the correct time!*')
    .setColor(0x5865f2)
    .addFields({
      name: '🌍 Current Selection',
      value: 'No timezone selected yet',
      inline: false
    });

  // Prominent timezone selection first
  const timezoneButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_timezone_select')
        .setLabel('🌍 Choose Your Timezone First')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🌍')
    );

  const quickDateButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_date:tonight')
        .setLabel('Tonight')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🌙')
        .setDisabled(true), // Disabled until timezone selected
      new ButtonBuilder()
        .setCustomId('session_date:tomorrow')
        .setLabel('Tomorrow')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📅')
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_date:this_friday')
        .setLabel('This Friday')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎉')
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_date:this_weekend')
        .setLabel('This Weekend')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏖️')
        .setDisabled(true)
    );

  const timeButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_time:7pm')
        .setLabel('7:00 PM')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_time:8pm')
        .setLabel('8:00 PM')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_time:9pm')
        .setLabel('9:00 PM')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_time:custom')
        .setLabel('Custom Time')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

  await interaction.reply({
    embeds: [embed],
    components: [timezoneButton, quickDateButtons, timeButtons],
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
  console.log(`Session creation button: ${interaction.customId}`);
  await interaction.reply({ content: 'Session creation button coming soon!', flags: MessageFlags.Ephemeral });
}

async function createMovieSessionFromModal(interaction) {
  console.log('Create session from modal');
  await interaction.reply({ content: 'Session creation from modal coming soon!', flags: MessageFlags.Ephemeral });
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
