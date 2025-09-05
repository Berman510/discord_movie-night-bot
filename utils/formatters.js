/**
 * Formatting Utilities
 * Text and data formatting functions
 */

function formatVoteCount(upVotes, downVotes) {
  const total = upVotes + downVotes;
  if (total === 0) return 'No votes yet';
  
  const score = upVotes - downVotes;
  const percentage = Math.round((upVotes / total) * 100);
  
  return `${score > 0 ? '+' : ''}${score} (${upVotes}👍 ${downVotes}👎) • ${percentage}% positive`;
}

function formatMovieStatus(status) {
  const statusMap = {
    pending: '🍿 Up for Vote',
    planned: '📌 Planned for Later',
    watched: '✅ Watched',
    skipped: '⏭️ Skipped'
  };
  
  return statusMap[status] || status;
}

function formatDuration(minutes) {
  if (!minutes || minutes === 'N/A') return 'Unknown';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatRating(rating) {
  if (!rating || rating === 'N/A') return 'Not rated';
  return `⭐ ${rating}/10`;
}

function formatGenres(genres) {
  if (!genres || genres === 'N/A') return 'Unknown';
  return genres.split(', ').slice(0, 3).join(', '); // Limit to 3 genres
}

function formatCast(actors) {
  if (!actors || actors === 'N/A') return 'Unknown';
  return actors.split(', ').slice(0, 4).join(', '); // Limit to 4 actors
}

function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(date).toLocaleDateString();
}

function formatUserMention(userId) {
  return `<@${userId}>`;
}

function formatChannelMention(channelId) {
  return `<#${channelId}>`;
}

function formatRoleMention(roleId) {
  return `<@&${roleId}>`;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pluralize(count, singular, plural = null) {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}

module.exports = {
  formatVoteCount,
  formatMovieStatus,
  formatDuration,
  formatRating,
  formatGenres,
  formatCast,
  truncateText,
  formatRelativeTime,
  formatUserMention,
  formatChannelMention,
  formatRoleMention,
  capitalizeFirst,
  pluralize
};
