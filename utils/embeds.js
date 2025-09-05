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
    )
    .setTimestamp(new Date(movie.created_at));

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
        value: '`/movie-configure` - Configure bot settings\n`/movie-cleanup` - Update old messages and create missing threads',
        inline: false
      }
    )
    .setFooter({ text: `Movie Night Bot v${BOT_VERSION}` })
    .setTimestamp();

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
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed
};
