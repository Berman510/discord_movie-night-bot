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
 * Create admin embed for TV show
 */
function createAdminTVShowEmbed(tvShow, voteCounts) {
  const { upvotes = 0, downvotes = 0 } = voteCounts;
  const netVotes = upvotes - downvotes;

  // Format TV show title based on type
  let displayTitle = tvShow.title;
  if (tvShow.show_type === 'episode' && tvShow.season_number && tvShow.episode_number) {
    displayTitle = `${tvShow.title} - S${tvShow.season_number}E${tvShow.episode_number}`;
    if (tvShow.episode_title) {
      displayTitle += ` - ${tvShow.episode_title}`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`📺 ${displayTitle}`)
    .setDescription(tvShow.where_to_watch || 'No streaming info provided')
    .setColor(tvShow.status === 'chosen' ? 0x57f287 : tvShow.status === 'decided' ? 0x5865f2 : 0xfee75c)
    .addFields(
      { name: '👤 Recommended by', value: `<@${tvShow.recommended_by}>`, inline: true },
      { name: '📊 Votes', value: `👍 ${upvotes} | 👎 ${downvotes} | Net: ${netVotes >= 0 ? '+' : ''}${netVotes}`, inline: true },
      { name: '📋 Status', value: tvShow.status.charAt(0).toUpperCase() + tvShow.status.slice(1), inline: true },
      {
        name: '📺 Type',
        value: tvShow.show_type === 'episode' ? 'Episode' : 'Series',
        inline: true
      }
    )
    .setFooter({ text: `TV Show ID: ${tvShow.message_id} • UID: ${tvShow.show_uid?.substring(0, 8)}...` })
    .setTimestamp(new Date(tvShow.created_at));

  // Add poster if available
  if (tvShow.poster_url) {
    embed.setThumbnail(tvShow.poster_url);
  }

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

  // Mark as watched button (for scheduled movies) — only after event start
  if (status === 'scheduled' && !isBanned) {
    let canMarkWatched = true;
    try {
      if (guildId) {
        const session = await database.getSessionByWinnerMessageId(guildId, movieId);
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
          .setCustomId(`admin_watched:${movieId}`)
          .setLabel('✅ Mark Watched')
          .setStyle(ButtonStyle.Success)
      );
    }
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
 * Create admin action buttons for a TV show
 */
async function createAdminTVShowActionButtons(tvShowId, status, isBanned = false, guildId = null) {
  const row = new ActionRowBuilder();

  // Check if there's an active voting session
  let isInVotingSession = false;
  if (guildId) {
    try {
      const activeSession = await database.getActiveVotingSession(guildId);
      console.log(`🔍 Active voting session for guild ${guildId}:`, activeSession ? `Session ${activeSession.id}` : 'None');

      if (activeSession) {
        // Check if this TV show is part of the voting session
        const tvShow = await database.getTVShowByMessageId(tvShowId);
        isInVotingSession = tvShow && tvShow.session_id === activeSession.id;
        console.log(`🔍 TV Show ${tvShowId} in voting session:`, isInVotingSession, `(show session_id: ${tvShow?.session_id})`);
      }
    } catch (error) {
      console.warn('Error checking voting session status:', error.message);
    }
  }

  // Pick Winner button (only if in voting session and not banned)
  if (isInVotingSession && !isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_pick_winner_tvshow_${tvShowId}`)
        .setLabel('Pick Winner')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🏆')
    );
  }

  // Ban/Unban button
  if (isBanned) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_unban_tvshow_${tvShowId}`)
        .setLabel('Unban')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✅')
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_ban_tvshow_${tvShowId}`)
        .setLabel('Ban')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚫')
    );
  }

  // View Details button (always available)
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_details_tvshow_${tvShowId}`)
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

        // Skip session success messages (they should auto-delete)
        const isSessionMessage = message.content &&
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
      allContent = [...movies, ...tvShows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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

async function postTieBreakingMovie(adminChannel, movie, winner) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(`🤝 Tie-Break Candidate: ${movie.title}`)
      .setColor(0xfee75c)
      .addFields(
        { name: '👤 Recommended by', value: `<@${movie.recommended_by}>`, inline: true },
        { name: '📺 Platform', value: movie.where_to_watch || 'Unknown', inline: true },
        { name: '📊 Votes', value: `👍 ${winner.upVotes} | 👎 ${winner.downVotes} | Score: ${winner.totalScore}` }
      )
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
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

    // Create appropriate embed and buttons based on content type
    let embed, components;

    if (contentType === 'tv_show' || content.show_type) {
      // TV Show embed
      embed = createAdminTVShowEmbed(content, voteCounts);
      components = await createAdminTVShowActionButtons(content.message_id, content.status, content.is_banned, guildId);
    } else {
      // Movie embed
      embed = createAdminMovieEmbed(content, voteCounts);
      components = await createAdminActionButtons(content.message_id, content.status, content.is_banned, guildId);
    }

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
  createAdminMovieEmbed,
  createAdminTVShowEmbed,
  createAdminActionButtons,
  createAdminTVShowActionButtons,
  postMovieToAdminChannel,
  postContentToAdminChannel,
  syncAdminChannel,
  removeMovieFromAdminChannel,
  postTieBreakingMovie
};
