/**
 * Unified Content Service
 * Provides content-agnostic operations for movies and TV shows
 */

const database = require('../database');

/**
 * Get content by message ID with type detection
 */
async function getContentByMessageId(messageId, guildId = null) {
  try {
    // Try movies table first
    const movie = guildId
      ? await database.getMovieById(messageId, guildId)
      : await database.getMovieByMessageId(messageId);

    if (movie) {
      return {
        content: movie,
        contentType: 'movie',
        isMovie: true,
        isTVShow: false,
      };
    }

    // Try TV shows table
    const tvShow = await database.getTVShowByMessageId(messageId);
    if (tvShow) {
      return {
        content: tvShow,
        contentType: 'tv_show',
        isMovie: false,
        isTVShow: true,
      };
    }

    // Not found
    return {
      content: null,
      contentType: null,
      isMovie: false,
      isTVShow: false,
    };
  } catch (error) {
    console.warn('Error getting content by message ID:', error.message);
    return {
      content: null,
      contentType: null,
      isMovie: false,
      isTVShow: false,
    };
  }
}

/**
 * Get user vote for content (unified)
 */
async function getUserVote(messageId, userId, contentType = null) {
  if (!contentType) {
    const { contentType: detectedType } = await getContentByMessageId(messageId);
    contentType = detectedType;
  }

  if (contentType === 'movie') {
    return await database.getUserVote(messageId, userId);
  } else if (contentType === 'tv_show') {
    return await database.getUserTVShowVote(messageId, userId);
  }

  return null;
}

/**
 * Save vote for content (unified)
 */
async function saveVote(messageId, userId, voteType, guildId, contentType = null) {
  if (!contentType) {
    const { contentType: detectedType } = await getContentByMessageId(messageId, guildId);
    contentType = detectedType;
  }

  if (contentType === 'movie') {
    return await database.saveVote(messageId, userId, voteType, guildId);
  } else if (contentType === 'tv_show') {
    return await database.addTVShowVote(messageId, userId, guildId, voteType);
  }

  return false;
}

/**
 * Remove vote for content (unified)
 */
async function removeVote(messageId, userId, guildId, contentType = null) {
  if (!contentType) {
    const { contentType: detectedType } = await getContentByMessageId(messageId, guildId);
    contentType = detectedType;
  }

  if (contentType === 'movie') {
    return await database.removeVote(messageId, userId, guildId);
  } else if (contentType === 'tv_show') {
    return await database.removeTVShowVote(messageId, userId, guildId);
  }

  return false;
}

/**
 * Get vote counts for content (unified)
 */
async function getVoteCounts(messageId, contentType = null) {
  if (!contentType) {
    const { contentType: detectedType } = await getContentByMessageId(messageId);
    contentType = detectedType;
  }

  if (contentType === 'movie') {
    return await database.getVoteCounts(messageId);
  } else if (contentType === 'tv_show') {
    return await database.getTVShowVoteCounts(messageId);
  }

  return { up: 0, down: 0, upvotes: 0, downvotes: 0 };
}

/**
 * Update content status (unified)
 */
async function updateContentStatus(messageId, status, contentType = null) {
  if (!contentType) {
    const { contentType: detectedType } = await getContentByMessageId(messageId);
    contentType = detectedType;
  }

  if (contentType === 'movie') {
    return await database.updateMovieStatus(messageId, status);
  } else if (contentType === 'tv_show') {
    return await database.updateTVShowStatus(messageId, status);
  }

  return false;
}

/**
 * Update thread ID for content (unified)
 */
async function updateThreadId(messageId, threadId, contentType = null) {
  if (!contentType) {
    const { contentType: detectedType } = await getContentByMessageId(messageId);
    contentType = detectedType;
  }

  if (contentType === 'movie') {
    return await database.updateMovieThreadId(messageId, threadId);
  } else if (contentType === 'tv_show') {
    return await database.updateTVShowThreadId(messageId, threadId);
  }

  return false;
}

/**
 * Get content type display info
 */
function getContentTypeInfo(contentType) {
  const contentTypes = require('../utils/content-types');
  return contentTypes.getContentTypeInfo(contentType);
}

/**
 * Get content type label for display
 */
function getContentTypeLabel(contentType) {
  return contentType === 'movie' ? 'Movie' : 'TV Show';
}

module.exports = {
  getContentByMessageId,
  getUserVote,
  saveVote,
  removeVote,
  getVoteCounts,
  updateContentStatus,
  updateThreadId,
  getContentTypeInfo,
  getContentTypeLabel,
};
