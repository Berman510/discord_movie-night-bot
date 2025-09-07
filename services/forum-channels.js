/**
 * Forum Channel Service
 * Handles movie recommendations in Discord Forum channels
 */

const { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Check if a channel is a forum channel
 */
function isForumChannel(channel) {
  return channel && channel.type === ChannelType.GuildForum;
}

/**
 * Check if a channel is a text channel
 */
function isTextChannel(channel) {
  return channel && channel.type === ChannelType.GuildText;
}

/**
 * Get channel type string for logging
 */
function getChannelTypeString(channel) {
  if (isForumChannel(channel)) return 'Forum';
  if (isTextChannel(channel)) return 'Text';
  return 'Unknown';
}

/**
 * Create a movie recommendation in a forum channel
 */
async function createForumMoviePost(channel, movieData, components) {
  try {
    console.log(`📋 Creating forum post for movie: ${movieData.title}`);
    
    // Create forum post with movie as the topic
    const forumPost = await channel.threads.create({
      name: `🎬 ${movieData.title}`,
      message: {
        embeds: [movieData.embed],
        components: components
      },
      appliedTags: await getMovieStatusTags(channel, 'pending'),
      reason: `Movie recommendation: ${movieData.title}`
    });

    console.log(`✅ Created forum post: ${forumPost.name} (ID: ${forumPost.id})`);
    return {
      thread: forumPost,
      message: forumPost.lastMessage || await forumPost.fetchStarterMessage()
    };
    
  } catch (error) {
    console.error('Error creating forum movie post:', error);
    throw error;
  }
}

/**
 * Update a forum post title with vote counts and status
 * For forum channels, we avoid title updates to prevent spam messages
 */
async function updateForumPostTitle(thread, movieTitle, status, upVotes = 0, downVotes = 0) {
  try {
    // For forum channels, we'll update the embed content instead of the title
    // to avoid the annoying "changed the post title" messages
    console.log(`📝 Skipping forum post title update for: ${movieTitle} (votes: +${upVotes}/-${downVotes}) to avoid spam messages`);

    // Only update title for major status changes (like when movie is selected as winner)
    const shouldUpdateTitle = ['scheduled', 'watched', 'banned'].includes(status);

    if (shouldUpdateTitle) {
      const statusEmoji = getStatusEmoji(status);
      const newName = `${statusEmoji} ${movieTitle}`;

      if (thread.name !== newName) {
        await thread.setName(newName);
        console.log(`📝 Updated forum post title for status change: ${newName}`);
      }
    }

  } catch (error) {
    console.warn('Error updating forum post title:', error.message);
  }
}

/**
 * Get status emoji for forum post titles
 */
function getStatusEmoji(status) {
  const statusEmojis = {
    'pending': '🎬',
    'planned': '📌',
    'scheduled': '🎪',
    'watched': '✅',
    'skipped': '⏭️',
    'banned': '🚫'
  };
  return statusEmojis[status] || '🎬';
}

/**
 * Get forum tags for movie status
 */
async function getMovieStatusTags(channel, status) {
  try {
    if (!channel.availableTags) return [];
    
    // Look for existing status tag
    const statusTag = channel.availableTags.find(tag => 
      tag.name.toLowerCase() === status.toLowerCase()
    );
    
    if (statusTag) {
      return [statusTag.id];
    }
    
    // If no matching tag found, return empty array
    // In the future, we could create tags automatically if the bot has permissions
    return [];
    
  } catch (error) {
    console.warn('Error getting forum tags:', error.message);
    return [];
  }
}

/**
 * Update forum post tags based on movie status
 */
async function updateForumPostTags(thread, status) {
  try {
    const channel = thread.parent;
    if (!channel || !isForumChannel(channel)) return;
    
    const newTags = await getMovieStatusTags(channel, status);
    
    // Only update if tags have changed
    const currentTagIds = thread.appliedTags || [];
    const tagsChanged = newTags.length !== currentTagIds.length || 
                       !newTags.every(tagId => currentTagIds.includes(tagId));
    
    if (tagsChanged) {
      await thread.setAppliedTags(newTags);
      console.log(`🏷️ Updated forum post tags for status: ${status}`);
    }
    
  } catch (error) {
    console.warn('Error updating forum post tags:', error.message);
  }
}

/**
 * Archive a forum post (equivalent to closing a thread in text channels)
 */
async function archiveForumPost(thread, reason = 'Movie completed') {
  try {
    if (thread.archived) return;
    
    await thread.setArchived(true, reason);
    console.log(`📦 Archived forum post: ${thread.name}`);
    
  } catch (error) {
    console.warn('Error archiving forum post:', error.message);
  }
}

/**
 * Get all movie forum posts from a forum channel
 */
async function getForumMoviePosts(channel, limit = 50) {
  try {
    if (!isForumChannel(channel)) return [];
    
    const threads = await channel.threads.fetchActive();
    const archivedThreads = await channel.threads.fetchArchived({ limit });
    
    const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);
    
    // Filter for movie posts (those starting with movie emoji)
    const moviePosts = Array.from(allThreads.values())
      .filter(thread => thread.name.match(/^[🎬📌🎪✅⏭️🚫]/))
      .slice(0, limit);
    
    return moviePosts;
    
  } catch (error) {
    console.error('Error getting forum movie posts:', error);
    return [];
  }
}

/**
 * Clean up old forum posts (archive completed movies)
 */
async function cleanupForumPosts(channel, olderThanDays = 30) {
  try {
    if (!isForumChannel(channel)) return 0;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const moviePosts = await getForumMoviePosts(channel, 100);
    let archivedCount = 0;
    
    for (const thread of moviePosts) {
      // Archive old completed movies
      if (thread.createdAt < cutoffDate && 
          (thread.name.includes('✅') || thread.name.includes('⏭️')) &&
          !thread.archived) {
        await archiveForumPost(thread, 'Automatic cleanup of old completed movie');
        archivedCount++;
      }
    }
    
    console.log(`🧹 Archived ${archivedCount} old forum posts`);
    return archivedCount;
    
  } catch (error) {
    console.error('Error cleaning up forum posts:', error);
    return 0;
  }
}

module.exports = {
  isForumChannel,
  isTextChannel,
  getChannelTypeString,
  createForumMoviePost,
  updateForumPostTitle,
  updateForumPostTags,
  archiveForumPost,
  getForumMoviePosts,
  cleanupForumPosts,
  getMovieStatusTags
};
