/**
 * Admin Movie Mirror Service
 * Manages simplified movie displays in admin channels with action buttons
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database');

/**
 * Auto-detect content type based on message ID
 */
async function detectContentType(messageId) {
  try {
    // Try movies table first
    const movie = await database.getMovieByMessageId(messageId);
    if (movie) return 'movie';

    // Try TV shows table
    const tvShow = await database.getTVShowByMessageId(messageId);
    if (tvShow) return 'tv_show';

    // Default fallback
    return 'movie';
  } catch (error) {
    console.warn('Error detecting content type:', error.message);
    return 'movie';
  }
}

/**
 * Get content by message ID (content-agnostic)
 */
async function getContentByMessageId(messageId) {
  try {
    // Try movies table first
    const movie = await database.getMovieByMessageId(messageId);
    if (movie) return { content: movie, contentType: 'movie' };

    // Try TV shows table
    const tvShow = await database.getTVShowByMessageId(messageId);
    if (tvShow) return { content: tvShow, contentType: 'tv_show' };

    // Not found
    return { content: null, contentType: null };
  } catch (error) {
    console.warn('Error getting content by message ID:', error.message);
    return { content: null, contentType: null };
  }
}

/**
 * Create unified admin embed for any content type
 */
function createAdminContentEmbed(content, voteCounts, contentType) {
  // Get content type info for proper emoji and formatting
  const contentTypes = require('../utils/content-types');
  const { emoji, label: _label } = contentTypes.getContentTypeInfo(contentType);

  // Format title based on content type
  let displayTitle = content.title;
  if (
    contentType === 'tv_show' &&
    content.show_type === 'episode' &&
    content.season_number &&
    content.episode_number
  ) {
    displayTitle = `${content.title} - S${content.season_number}E${content.episode_number}`;
    if (content.episode_title) {
      displayTitle += ` - ${content.episode_title}`;
    }
  }

  // Handle vote counts (can be from either votes or votes_tv table)
  const upvotes = voteCounts?.up || voteCounts?.upvotes || 0;
  const downvotes = voteCounts?.down || voteCounts?.downvotes || 0;
  const netVotes = upvotes - downvotes;

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${displayTitle}`)
    .setColor(getStatusColor(content.status))
    .addFields(
      {
        name: '👤 Recommended by',
        value: `<@${content.recommended_by}>`,
        inline: true,
      },
      {
        name: '📺 Platform',
        value: content.where_to_watch || 'Unknown',
        inline: true,
      },
      {
        name: '📅 Status',
        value: getStatusDisplay(content.status),
        inline: true,
      },
      {
        name: '📊 Votes',
        value: `👍 ${upvotes} | 👎 ${downvotes} | Net: ${netVotes >= 0 ? '+' : ''}${netVotes}`,
        inline: true,
      }
    );

  // Add content-specific footer
  const uidField = contentType === 'movie' ? content.movie_uid : content.show_uid;
  const idLabel = contentType === 'movie' ? 'Movie ID' : 'TV Show ID';
  embed.setFooter({
    text: `${idLabel}: ${content.message_id} • UID: ${uidField?.substring(0, 8)}...`,
  });
  embed.setTimestamp(new Date(content.created_at));

  // Add poster if available
  if (content.poster_url) {
    embed.setThumbnail(content.poster_url);
  }

  return embed;
}

/**
 * Legacy movie embed function - kept for backward compatibility
 */
function createAdminMovieEmbed(movie, voteCounts = { up: 0, down: 0 }) {
  return createAdminContentEmbed(movie, voteCounts, 'movie');
}

/**
 * Legacy TV show embed function - kept for backward compatibility
 */
function createAdminTVShowEmbed(tvShow, voteCounts) {
  return createAdminContentEmbed(tvShow, voteCounts, 'tv_show');
}

/**
 * Create unified admin action buttons for any content type
 */
async function createAdminContentActionButtons(
  contentId,
  status,
  isBanned = false,
  guildId = null,
  contentType = null
) {
  const row = new ActionRowBuilder();

  // Auto-detect content type if not provided
  if (!contentType) {
    contentType = await detectContentType(contentId);
  }

  // Get content type info for proper labeling
  const contentTypes = require('../utils/content-types');
  const { label } = contentTypes.getContentTypeInfo(contentType);

  // Check if there's an active voting session
  let isInVotingSession = false;
  if (guildId) {
    try {
      const activeSession = await database.getActiveVotingSession(guildId);
      console.log(
        `🔍 Active voting session for guild ${guildId}:`,
        activeSession ? `Session ${activeSession.id}` : 'None'
      );

      if (activeSession) {
        // Check if this content is part of the voting session
        const content =
          contentType === 'movie'
            ? await database.getMovieByMessageId(contentId)
            : await database.getTVShowByMessageId(contentId);
        isInVotingSession = content && content.session_id === activeSession.id;
        console.log(
          `🔍 ${label} ${contentId} in voting session:`,
          isInVotingSession,
          `(content session_id: ${content?.session_id})`
        );
      }
    } catch (error) {
      console.warn('Error checking voting session status:', error.message);
    }
  }

  // Always show Pick Winner for pending/planned content (new workflow)
  if (['pending', 'planned'].includes(status) && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_pick_winner:${contentId}`)
        .setLabel('🏆 Pick Winner')
        .setStyle(ButtonStyle.Success)
    );
  }

  // Mark as watched button (for scheduled content) — only after event start
  if (status === 'scheduled' && !isBanned) {
    let canMarkWatched = true;
    try {
      if (guildId) {
        const session = await database.getSessionByWinnerMessageId(guildId, contentId);
        if (session && session.scheduled_date) {
          const now = new Date();
          const start = new Date(session.scheduled_date);
          canMarkWatched = now >= start; // Only allow after start time
        }
      }
    } catch (e) {
      console.warn('Error checking session start for watched button:', e.message);
    }

    if (canMarkWatched) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_watched:${contentId}`)
          .setLabel('✅ Mark Watched')
          .setStyle(ButtonStyle.Success)
      );
    }
  }

  // Skip to Next button (for pending/planned content)
  if (['pending', 'planned'].includes(status) && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_skip_vote:${contentId}`)
        .setLabel('⏭️ Skip to Next')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // Remove Suggestion button (for pending/planned content)
  if (['pending', 'planned'].includes(status) && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_remove:${contentId}`)
        .setLabel('🗑️ Remove')
        .setStyle(ButtonStyle.Danger)
    );
  }

  // Ban/Unban button (always available) - content-agnostic labels
  if (!isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_ban:${contentId}`)
        .setLabel(`🚫 Ban ${label}`)
        .setStyle(ButtonStyle.Danger)
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_unban:${contentId}`)
        .setLabel(`✅ Unban ${label}`)
        .setStyle(ButtonStyle.Success)
    );
  }

  // View Details button (always available)
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_details:${contentId}`)
      .setLabel('📋 Details')
      .setStyle(ButtonStyle.Secondary)
  );

  return row.components.length > 0 ? [row] : [];
}

/**
 * Legacy movie action buttons function - kept for backward compatibility
 */
async function createAdminActionButtons(movieId, status, isBanned = false, guildId = null) {
  return createAdminContentActionButtons(movieId, status, isBanned, guildId, 'movie');
}

/**
 * Legacy TV show action buttons function - kept for backward compatibility
 */
async function createAdminTVShowActionButtons(tvShowId, status, isBanned = false, guildId = null) {
  return createAdminContentActionButtons(tvShowId, status, isBanned, guildId, 'tv_show');
}

/**
 * Get status color for embeds
 */
function getStatusColor(status) {
  const colors = {
    pending: 0x5865f2, // Blue
    planned: 0xfee75c, // Yellow
    scheduled: 0x57f287, // Green
    watched: 0x747f8d, // Gray
    skipped: 0x747f8d, // Gray
    banned: 0xed4245, // Red
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
    banned: '🚫 Banned',
  };
  return displays[status] || status;
}

/**
 * Legacy movie posting function - kept for backward compatibility
 */
async function postMovieToAdminChannel(client, guildId, movie) {
  return postContentToAdminChannel(client, guildId, movie, 'movie');
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
    const botMessages = messages.filter((msg) => msg.author.id === client.user.id);

    for (const [messageId, message] of botMessages) {
      try {
        // Skip admin control panel messages
        const isControlPanel =
          message.embeds.length > 0 &&
          message.embeds[0].title &&
          message.embeds[0].title.includes('Admin Control Panel');

        // Skip session success messages (they should auto-delete)
        const isSessionMessage =
          message.content &&
          (message.content.includes('Voting session created successfully') ||
            message.content.includes('Session created successfully'));

        if (!isControlPanel && !isSessionMessage) {
          await message.delete();
        }
      } catch (error) {
        console.warn(`Failed to delete admin message ${messageId}:`, error.message);
      }
    }

    // Get both movies and TV shows for current voting session when active
    let allContent = [];
    const activeSession = await database.getActiveVotingSession(guildId);
    if (activeSession) {
      const movies = await database.getMoviesForVotingSession(activeSession.id);
      const tvShows = await database.getTVShowsForVotingSession(activeSession.id);

      // Combine and sort by creation time
      allContent = [...movies, ...tvShows].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    } else {
      // No active session: do not mirror queue into admin channel
      allContent = [];
    }

    // Do NOT post banned content in the admin mirror list (managed via separate banned list UI)

    let syncedCount = 0;

    // Post each piece of content (movie or TV show) to admin channel
    for (const content of allContent) {
      // Determine content type: TV shows have show_type field, movies don't
      const contentType = content.show_type ? 'tv_show' : 'movie';
      const posted = await postContentToAdminChannel(client, guildId, content, contentType);
      if (posted) {
        syncedCount++;
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    const movieMessage = messages.find(
      (msg) =>
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

async function postTieBreakingMovie(adminChannel, movie, winner) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(`🤝 Tie-Break Candidate: ${movie.title}`)
      .setColor(0xfee75c)
      .addFields(
        { name: '👤 Recommended by', value: `<@${movie.recommended_by}>`, inline: true },
        { name: '📺 Platform', value: movie.where_to_watch || 'Unknown', inline: true },
        {
          name: '📊 Votes',
          value: `👍 ${winner.upVotes} | 👎 ${winner.downVotes} | Score: ${winner.totalScore}`,
        }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_choose_winner:${movie.message_id}`)
        .setLabel('🏆 Choose Winner')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`admin_details:${movie.message_id}`)
        .setLabel('📋 Details')
        .setStyle(ButtonStyle.Secondary)
    );

    await adminChannel.send({ embeds: [embed], components: [row] });

    const logger = require('../utils/logger');
    logger.debug(`🤝 Posted tie-break candidate to admin channel: ${movie.title}`);
  } catch (error) {
    console.error('Error posting tie-break movie to admin channel:', error);
  }
}

/**
 * Post content (movie or TV show) to admin channel
 */
async function postContentToAdminChannel(client, guildId, content, contentType = 'movie') {
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
    const voteCounts = await database.getVoteCounts(content.message_id);

    // Auto-detect content type if not provided
    if (!contentType || contentType === 'movie') {
      contentType = content.show_type ? 'tv_show' : 'movie';
    }

    // Create unified embed and buttons
    const embed = createAdminContentEmbed(content, voteCounts, contentType);
    const components = await createAdminContentActionButtons(
      content.message_id,
      content.status,
      content.is_banned,
      guildId,
      contentType
    );

    // Post to admin channel
    const adminMessage = await adminChannel.send({
      embeds: [embed],
      components: components,
    });

    // Ensure admin control panel stays at the bottom
    try {
      const adminControls = require('./admin-controls');
      await adminControls.ensureAdminControlPanel(client, guildId);
    } catch (error) {
      const logger = require('../utils/logger');
      logger.warn('Error ensuring admin control panel after content post:', error.message);
    }

    const logger = require('../utils/logger');
    logger.debug(`📋 Posted ${contentType} to admin channel: ${content.title}`);
    return adminMessage;
  } catch (error) {
    console.error('Error posting content to admin channel:', error);
    return null;
  }
}

module.exports = {
  // Unified content-agnostic functions (preferred)
  createAdminContentEmbed,
  createAdminContentActionButtons,
  postContentToAdminChannel,
  detectContentType,
  getContentByMessageId,

  // Legacy functions (backward compatibility)
  createAdminMovieEmbed,
  createAdminTVShowEmbed,
  createAdminActionButtons,
  createAdminTVShowActionButtons,
  postMovieToAdminChannel,

  // Other functions
  syncAdminChannel,
  removeMovieFromAdminChannel,
  postTieBreakingMovie,
};
