/**
 * Content Type Utilities
 * Centralized logic for handling different content types (movies, TV shows, mixed)
 */

/**
 * Content type definitions
 */
const CONTENT_TYPES = {
  MOVIE: 'movie',
  TV_SHOW: 'tv_show',
  MIXED: 'mixed'
};

/**
 * Get display information for a content type
 */
function getContentTypeInfo(contentType) {
  switch (contentType) {
    case CONTENT_TYPES.MOVIE:
      return {
        emoji: '🍿',
        singular: 'Movie',
        plural: 'Movies',
        singularLower: 'movie',
        pluralLower: 'movies',
        verb: 'Watch',
        verbLower: 'watch',
        recommendAction: 'Recommend Movie',
        recommendTitle: '🍿 Recommend Movies',
        sessionType: 'Movie Night'
      };
    
    case CONTENT_TYPES.TV_SHOW:
      return {
        emoji: '📺',
        singular: 'TV Show',
        plural: 'TV Shows',
        singularLower: 'tv show',
        pluralLower: 'tv shows',
        verb: 'Watch',
        verbLower: 'watch',
        recommendAction: 'Recommend TV Show',
        recommendTitle: '📺 Recommend TV Shows',
        sessionType: 'TV Show Night'
      };
    
    case CONTENT_TYPES.MIXED:
      return {
        emoji: '🎬',
        singular: 'Content',
        plural: 'Content',
        singularLower: 'content',
        pluralLower: 'content',
        verb: 'Watch',
        verbLower: 'watch',
        recommendAction: 'Recommend Content',
        recommendTitle: '🎬 Recommend Content',
        sessionType: 'Watch Party'
      };
    
    default:
      // Default to movie for backward compatibility
      return getContentTypeInfo(CONTENT_TYPES.MOVIE);
  }
}

/**
 * Get recommendation post content based on session
 */
function getRecommendationPostContent(session) {
  const info = getContentTypeInfo(session.content_type);
  
  const title = info.recommendTitle;
  const description = `**Current Session:** ${session.name}\n\n${info.emoji} Click the button below to recommend ${info.pluralLower}!\n\n📝 Each ${info.singularLower} gets its own thread for voting and discussion.\n\n🗳️ Voting ends: <t:${Math.floor(new Date(session.voting_end_time).getTime() / 1000)}:R>`;
  const buttonLabel = info.recommendAction;
  const buttonEmoji = info.emoji;
  
  return { title, description, buttonLabel, buttonEmoji };
}

/**
 * Get session display name based on content type
 */
function getSessionDisplayName(session) {
  const info = getContentTypeInfo(session.content_type);
  return session.name || info.sessionType;
}

/**
 * Get Discord event name based on content type
 */
function getEventName(session) {
  const info = getContentTypeInfo(session.content_type);
  return session.name || `${info.sessionType} - ${new Date(session.scheduled_date).toLocaleDateString()}`;
}

/**
 * Check if content type matches session type
 */
function isContentTypeAllowed(contentType, sessionContentType) {
  // Mixed sessions allow everything
  if (sessionContentType === CONTENT_TYPES.MIXED) {
    return true;
  }
  
  // Specific sessions only allow matching content
  return contentType === sessionContentType;
}

/**
 * Get appropriate database table for content type
 */
function getContentTable(contentType) {
  switch (contentType) {
    case CONTENT_TYPES.MOVIE:
      return 'movies';
    case CONTENT_TYPES.TV_SHOW:
      return 'tv_shows';
    default:
      return 'movies'; // Default fallback
  }
}

/**
 * Detect content type from database record
 */
function detectContentType(record) {
  // TV shows have show_type field
  if (record.show_type !== undefined) {
    return CONTENT_TYPES.TV_SHOW;
  }
  
  // Movies have content_type field or no show_type
  return CONTENT_TYPES.MOVIE;
}

/**
 * Get status emoji for content
 */
function getStatusEmoji(status, contentType) {
  const info = getContentTypeInfo(contentType);
  
  switch (status) {
    case 'pending':
      return info.emoji;
    case 'planned':
      return '📌';
    case 'watched':
      return '✅';
    case 'skipped':
      return '⏭️';
    default:
      return info.emoji;
  }
}

module.exports = {
  CONTENT_TYPES,
  getContentTypeInfo,
  getRecommendationPostContent,
  getSessionDisplayName,
  getEventName,
  isContentTypeAllowed,
  getContentTable,
  detectContentType,
  getStatusEmoji
};
