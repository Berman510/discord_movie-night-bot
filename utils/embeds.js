/**
 * Embed Builders
 * Utility functions for creating Discord embeds
 */

const { EmbedBuilder } = require('discord.js');
const { COLORS, STATUS_EMOJIS, BOT_VERSION } = require('./constants');
const { formatDateWithTimezone } = require('../services/timezone');

function createMovieEmbed(movie, imdbData = null) {
  const embed = new EmbedBuilder()
    .setTitle(`${STATUS_EMOJIS[movie.status] || STATUS_EMOJIS.pending} ${movie.title}`)
    .setColor(COLORS[movie.status] || COLORS.pending)
    .addFields(
      { name: '📺 Where to Watch', value: movie.where_to_watch, inline: true },
      { name: '👤 Recommended by', value: `<@${movie.recommended_by}>`, inline: true }
    );

  // Set timestamp if created_at is available, otherwise use current time
  if (movie.created_at) {
    embed.setTimestamp(new Date(movie.created_at));
  } else {
    embed.setTimestamp();
  }

  // Add IMDb data if available
  if (imdbData) {
    if (imdbData.Year && imdbData.Year !== 'N/A') {
      embed.addFields({ name: '📅 Year', value: imdbData.Year, inline: true });
    }
    
    if (imdbData.Rated && imdbData.Rated !== 'N/A') {
      embed.addFields({ name: '🎭 Rated', value: imdbData.Rated, inline: true });
    }
    
    if (imdbData.Runtime && imdbData.Runtime !== 'N/A') {
      embed.addFields({ name: '⏱️ Runtime', value: imdbData.Runtime, inline: true });
    }
    
    if (imdbData.Genre && imdbData.Genre !== 'N/A') {
      embed.addFields({ name: '🎬 Genre', value: imdbData.Genre, inline: false });
    }
    
    if (imdbData.Plot && imdbData.Plot !== 'N/A') {
      embed.setDescription(imdbData.Plot);
    }
    
    if (imdbData.Poster && imdbData.Poster !== 'N/A') {
      embed.setThumbnail(imdbData.Poster);
    }
    
    if (imdbData.imdbRating && imdbData.imdbRating !== 'N/A') {
      embed.addFields({ name: '⭐ IMDb Rating', value: `${imdbData.imdbRating}/10`, inline: true });
    }
  }

  return embed;
}

function createSessionEmbed(session, movie = null) {
  const sessionTimezone = session.timezone || 'UTC';
  const dateDisplay = session.scheduled_date 
    ? formatDateWithTimezone(new Date(session.scheduled_date), sessionTimezone)
    : 'No specific date';

  const embed = new EmbedBuilder()
    .setTitle(`🎬 ${session.name}`)
    .setColor(COLORS.primary)
    .addFields(
      { name: '📅 Scheduled', value: dateDisplay, inline: true },
      { name: '👤 Organizer', value: `<@${session.created_by}>`, inline: true },
      { name: '📍 Channel', value: `<#${session.channel_id}>`, inline: true }
    )
    .setFooter({ 
      text: `Session ID: ${session.id}${session.discord_event_id ? ' • Discord Event Created' : ''}` 
    })
    .setTimestamp();

  if (session.description) {
    embed.setDescription(session.description);
  }

  if (movie) {
    embed.addFields({ 
      name: '🎬 Featured Movie', 
      value: `**${movie.title}**\n📺 ${movie.where_to_watch}` 
    });
  }

  return embed;
}

function createHelpEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Movie Night Bot - Quick Guide')
    .setDescription('Organize movie nights with voting, discussions, and scheduling!')
    .setColor(COLORS.primary)
    .addFields(
      {
        name: '🍿 Basic Commands',
        value: '`/movie-night` - Recommend a movie\n`/movie-queue` - View current recommendations\n`/movie-help` - Show this help',
        inline: false
      },
      {
        name: '🎪 Movie Sessions',
        value: '`/movie-session create` - Create interactive movie night events\n`/movie-session list` - View active sessions with details\n`/movie-session join [id]` - Join a session and get updates\n`/movie-session add-movie [id] [title]` - Add movie to session\n`/movie-session winner` - Pick top-voted movie',
        inline: false
      },
      {
        name: '📊 Statistics',
        value: '`/movie-stats` - View voting statistics and history',
        inline: false
      },
      {
        name: '⚙️ Admin Commands',
        value: '`/movie-configure` - Configure movie channel and admin roles\n`/movie-cleanup` - Update old messages and create missing threads',
        inline: false
      },
      {
        name: '🌍 Timezone Handling',
        value: 'Select your timezone when creating sessions - no server setup needed!\nSupports 10+ common timezones with automatic time conversion.',
        inline: false
      }
    )
    .setFooter({ text: `Movie Night Bot v${BOT_VERSION}` })
    .setTimestamp();

  return embed;
}

function createQuickActionEmbed(activeSession = null) {
  if (activeSession) {
    let description = 'Click the button below to recommend a movie for this voting session!';

    // Add event link if available
    if (activeSession.discord_event_id) {
      description += `\n\n📅 [**Join the Discord Event**](https://discord.com/events/${activeSession.guild_id}/${activeSession.discord_event_id}) to RSVP and get notified!`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🍿 ${activeSession.name}`)
      .setDescription(description)
      .setColor(COLORS.primary)
      .setFooter({ text: 'Use /movie-help for detailed commands and features' });

    if (activeSession.scheduled_date) {
      embed.addFields({
        name: '📅 Scheduled Date',
        value: new Date(activeSession.scheduled_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        inline: false
      });
    }

    // Add voting end time if available
    if (activeSession.voting_end_time) {
      embed.addFields({
        name: '🗳️ Voting Ends',
        value: new Date(activeSession.voting_end_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        inline: true
      });
    }

    return embed;
  }

  // Fallback for no session
  return createNoSessionEmbed();
}

function createNoSessionEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🎬 No Active Voting Session')
    .setDescription('Movie recommendations are currently not available. An admin needs to start a new voting session using the "Plan Next Session" button in the admin channel.')
    .setColor(COLORS.warning)
    .addFields({
      name: '🔧 For Admins',
      value: 'Use the admin channel controls to plan the next voting session.',
      inline: false
    })
    .setFooter({ text: 'Use /movie-help for detailed commands and features' });

  return embed;
}

function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(COLORS.danger);
}

function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(COLORS.success);
}

function createWarningEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setColor(COLORS.warning);
}

module.exports = {
  createMovieEmbed,
  createSessionEmbed,
  createHelpEmbed,
  createQuickActionEmbed,
  createNoSessionEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed
};
