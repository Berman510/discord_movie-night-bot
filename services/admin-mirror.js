/**
 * Admin Movie Mirror Service
 * Manages simplified movie displays in admin channels with action buttons
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database');

/**
 * Create a simplified admin movie embed
 */
function createAdminMovieEmbed(movie, voteCounts = { up: 0, down: 0 }) {
  const embed = new EmbedBuilder()
    .setTitle(`🎬 ${movie.title}`)
    .setColor(getStatusColor(movie.status))
    .addFields(
      {
        name: '👤 Recommended by',
        value: `<@${movie.recommended_by}>`,
        inline: true
      },
      {
        name: '📺 Platform',
        value: movie.where_to_watch || 'Unknown',
        inline: true
      },
      {
        name: '📅 Status',
        value: getStatusDisplay(movie.status),
        inline: true
      }
    )
    .setFooter({ text: `Movie ID: ${movie.message_id} • UID: ${movie.movie_uid?.substring(0, 8)}...` })
    .setTimestamp(new Date(movie.created_at));

  return embed;
}

/**
 * Create admin action buttons for a movie
 */
async function createAdminActionButtons(movieId, status, isBanned = false, guildId = null) {
  const row = new ActionRowBuilder();

  // Check if there's an active voting session
  let isInVotingSession = false;
  if (guildId) {
    try {
      const activeSession = await database.getActiveVotingSession(guildId);
      console.log(`🔍 Active voting session for guild ${guildId}:`, activeSession ? `Session ${activeSession.id}` : 'None');

      if (activeSession) {
        // Check if this movie is part of the voting session
        const movie = await database.getMovieByMessageId(movieId);
        isInVotingSession = movie && movie.session_id === activeSession.id;
        console.log(`🔍 Movie ${movieId} in voting session:`, isInVotingSession, `(movie session_id: ${movie?.session_id})`);
      }
    } catch (error) {
      console.warn('Error checking voting session status:', error.message);
    }
  }

  // Always show Pick Winner for pending/planned movies (new workflow)
  if (['pending', 'planned'].includes(status) && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_pick_winner:${movieId}`)
        .setLabel('🏆 Pick Winner')
        .setStyle(ButtonStyle.Success)
    );
  }

  // Mark as watched button (for scheduled movies)
  if (status === 'scheduled' && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_watched:${movieId}`)
        .setLabel('✅ Mark Watched')
        .setStyle(ButtonStyle.Success)
    );
  }

  // Skip to Next button (for pending/planned movies)
  if (['pending', 'planned'].includes(status) && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_skip_vote:${movieId}`)
        .setLabel('⏭️ Skip to Next')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // Remove Suggestion button (for pending/planned movies)
  if (['pending', 'planned'].includes(status) && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_remove:${movieId}`)
        .setLabel('🗑️ Remove')
        .setStyle(ButtonStyle.Danger)
    );
  }

  // Ban/Unban button (always available)
  if (!isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_ban:${movieId}`)
        .setLabel('🚫 Ban Movie')
        .setStyle(ButtonStyle.Danger)
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_unban:${movieId}`)
        .setLabel('✅ Unban Movie')
        .setStyle(ButtonStyle.Success)
    );
  }

  // View Details button (always available)
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_details:${movieId}`)
      .setLabel('📋 Details')
      .setStyle(ButtonStyle.Secondary)
  );

  return row.components.length > 0 ? [row] : [];
}

/**
 * Get status color for embeds
 */
function getStatusColor(status) {
  const colors = {
    pending: 0x5865f2,    // Blue
    planned: 0xfee75c,    // Yellow
    scheduled: 0x57f287,  // Green
    watched: 0x747f8d,    // Gray
    skipped: 0x747f8d,    // Gray
    banned: 0xed4245      // Red
  };
  return colors[status] || 0x5865f2;
}

/**
 * Get status display text
 */
function getStatusDisplay(status) {
  const displays = {
    pending: '🗳️ Pending Votes',
    planned: '📌 Planned',
    scheduled: '📅 Scheduled',
    watched: '✅ Watched',
    skipped: '⏭️ Skipped',
    banned: '🚫 Banned'
  };
  return displays[status] || status;
}

/**
 * Post or update a movie in the admin mirror channel
 */
async function postMovieToAdminChannel(client, guildId, movie) {
  try {
    const config = await database.getGuildConfig(guildId);
    if (!config || !config.admin_channel_id) {
      console.log('No admin channel configured for guild:', guildId);
      return null;
    }

    const adminChannel = await client.channels.fetch(config.admin_channel_id);
    if (!adminChannel) {
      console.log('Admin channel not found:', config.admin_channel_id);
      return null;
    }

    // Get vote counts
    const voteCounts = await database.getVoteCounts(movie.message_id);
    
    // Create admin embed and buttons
    const embed = createAdminMovieEmbed(movie, voteCounts);
    const components = await createAdminActionButtons(movie.message_id, movie.status, movie.is_banned, guildId);

    // Post to admin channel
    const adminMessage = await adminChannel.send({
      embeds: [embed],
      components: components
    });

    // Ensure admin control panel stays at the bottom
    try {
      const adminControls = require('./admin-controls');
      await adminControls.ensureAdminControlPanel(client, guildId);
    } catch (error) {
      const logger = require('../utils/logger');
      logger.warn('Error ensuring admin control panel after movie post:', error.message);
    }

    const logger = require('../utils/logger');
    logger.debug(`📋 Posted movie to admin channel: ${movie.title}`);
    return adminMessage;

  } catch (error) {
    console.error('Error posting movie to admin channel:', error);
    return null;
  }
}

/**
 * Update all movies in admin channel (for sync operations)
 */
async function syncAdminChannel(client, guildId) {
  try {
    const config = await database.getGuildConfig(guildId);
    if (!config || !config.admin_channel_id) {
      return { synced: 0, error: 'No admin channel configured' };
    }

    const adminChannel = await client.channels.fetch(config.admin_channel_id);
    if (!adminChannel) {
      return { synced: 0, error: 'Admin channel not found' };
    }

    // Clear existing movie messages in admin channel (preserve admin control panel)
    const messages = await adminChannel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(msg => msg.author.id === client.user.id);

    for (const [messageId, message] of botMessages) {
      try {
        // Skip admin control panel messages
        const isControlPanel = message.embeds.length > 0 &&
                              message.embeds[0].title &&
                              message.embeds[0].title.includes('Admin Control Panel');

        if (!isControlPanel) {
          await message.delete();
        }
      } catch (error) {
        console.warn(`Failed to delete admin message ${messageId}:`, error.message);
      }
    }

    // Get all active movies (not watched/skipped unless banned, excluding carryover movies)
    const movies = await database.getMoviesByStatusExcludingCarryover(guildId, 'pending', 50);
    const plannedMovies = await database.getMoviesByStatusExcludingCarryover(guildId, 'planned', 50);
    const scheduledMovies = await database.getMoviesByStatusExcludingCarryover(guildId, 'scheduled', 50);
    const bannedMovies = await database.getBannedMovies(guildId);

    const allMovies = [...movies, ...plannedMovies, ...scheduledMovies];
    
    // Add banned movies to the list
    for (const bannedMovie of bannedMovies) {
      const fullBannedMovie = {
        ...bannedMovie,
        message_id: `banned_${bannedMovie.movie_uid}`,
        status: 'banned',
        is_banned: true,
        recommended_by: 'system'
      };
      allMovies.push(fullBannedMovie);
    }

    let syncedCount = 0;

    // Post each movie to admin channel
    for (const movie of allMovies) {
      const posted = await postMovieToAdminChannel(client, guildId, movie);
      if (posted) {
        syncedCount++;
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Ensure admin control panel is at the bottom
    try {
      const adminControls = require('./admin-controls');
      await adminControls.ensureAdminControlPanel(client, guildId);
    } catch (error) {
      const logger = require('../utils/logger');
      logger.warn('Error ensuring admin control panel after sync:', error.message);
    }

    const logger = require('../utils/logger');
    logger.info(`📋 Synced ${syncedCount} movies to admin channel`);
    return { synced: syncedCount, error: null };

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error syncing admin channel:', error);
    return { synced: 0, error: error.message };
  }
}

/**
 * Remove a movie from admin channel
 */
async function removeMovieFromAdminChannel(client, guildId, movieId) {
  try {
    const config = await database.getGuildConfig(guildId);
    if (!config || !config.admin_channel_id) {
      return false;
    }

    const adminChannel = await client.channels.fetch(config.admin_channel_id);
    if (!adminChannel) {
      return false;
    }

    // Find and delete the movie message
    const messages = await adminChannel.messages.fetch({ limit: 100 });
    const movieMessage = messages.find(msg => 
      msg.author.id === client.user.id && 
      msg.embeds.length > 0 && 
      msg.embeds[0].footer && 
      msg.embeds[0].footer.text.includes(movieId)
    );

    if (movieMessage) {
      await movieMessage.delete();
      console.log(`📋 Removed movie from admin channel: ${movieId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error removing movie from admin channel:', error);
    return false;
  }
}

module.exports = {
  createAdminMovieEmbed,
  createAdminActionButtons,
  postMovieToAdminChannel,
  syncAdminChannel,
  removeMovieFromAdminChannel
};
