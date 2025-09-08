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
    console.log(`🔍 DEBUG: createForumMoviePost called with:`, {
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.type,
      movieTitle: movieData.title,
      hasEmbed: !!movieData.embed,
      componentsLength: components.length
    });

    console.log(`📋 Creating forum post for movie: ${movieData.title} in channel: ${channel.name}`);

    // Create forum post with movie as the topic
    console.log(`🔍 DEBUG: About to call channel.threads.create`);
    const forumPost = await channel.threads.create({
      name: `🎬 ${movieData.title}`,
      message: {
        embeds: [movieData.embed],
        components: components
      },
      appliedTags: await getMovieStatusTags(channel, 'pending'),
      reason: `Movie recommendation: ${movieData.title}`
    });

    console.log(`✅ Created forum post: ${forumPost.name} (ID: ${forumPost.id}) in channel: ${channel.name}`);

    const message = forumPost.lastMessage || await forumPost.fetchStarterMessage();
    console.log(`🔍 DEBUG: Got starter message: ${message?.id}`);

    return {
      thread: forumPost,
      message: message
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
    const logger = require('../utils/logger');
    logger.debug(`📝 Skipping forum post title update for: ${movieTitle} (votes: +${upVotes}/-${downVotes}) to avoid spam messages`);

    // Only update title for major status changes (like when movie is selected as winner)
    const shouldUpdateTitle = ['scheduled', 'watched', 'banned'].includes(status);

    if (shouldUpdateTitle) {
      const statusEmoji = getStatusEmoji(status);
      const newName = `${statusEmoji} ${movieTitle}`;

      if (thread.name !== newName) {
        await thread.setName(newName);
        const logger = require('../utils/logger');
        logger.debug(`📝 Updated forum post title for status change: ${newName}`);
      }
    }

  } catch (error) {
    const logger = require('../utils/logger');
    logger.warn('Error updating forum post title:', error.message);
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
 * Update forum post content when movie status changes (e.g., becomes winner)
 */
async function updateForumPostContent(thread, movie, newStatus) {
  try {
    const starterMessage = await thread.fetchStarterMessage();
    if (!starterMessage) return;

    const { embeds, components } = require('../utils');
    const database = require('../database');

    // Get current vote counts
    const voteCounts = await database.getVoteCounts(movie.message_id);

    // Create updated embed
    const movieEmbed = embeds.createMovieEmbed(movie, null, voteCounts);

    // Determine components based on status
    let movieComponents = [];

    if (newStatus === 'scheduled') {
      // Winner - show winner status instead of voting buttons
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      movieComponents = [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('winner_selected')
              .setLabel('🏆 Selected as Winner!')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true)
          )
      ];
    } else if (['watched', 'skipped', 'banned'].includes(newStatus)) {
      // Completed movies - no buttons
      movieComponents = [];
    } else {
      // Still active - keep voting buttons
      movieComponents = components.createVotingButtons(movie.message_id);
    }

    // Update the starter message
    await starterMessage.edit({
      embeds: [movieEmbed],
      components: movieComponents
    });

    console.log(`📝 Updated forum post content for ${movie.title} (status: ${newStatus})`);

  } catch (error) {
    console.warn('Error updating forum post content:', error.message);
  }
}

/**
 * Archive a forum post (equivalent to closing a thread in text channels)
 */
async function archiveForumPost(thread, reason = 'Movie completed') {
  try {
    if (thread.archived) return;
    
    await thread.setArchived(true, reason);
    const logger = require('../utils/logger');
    logger.debug(`📦 Archived forum post: ${thread.name}`);
    
  } catch (error) {
    const logger = require('../utils/logger');
    logger.warn('Error archiving forum post:', error.message);
  }
}

/**
 * Get all movie forum posts from a forum channel
 */
async function getForumMoviePosts(channel, limit = 50) {
  try {
    if (!isForumChannel(channel)) return [];

    const logger = require('../utils/logger');
    const guildId = channel.guild?.id;

    const threads = await channel.threads.fetchActive();
    const archivedThreads = await channel.threads.fetchArchived({ limit: 100 }); // Fetch more archived threads

    const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);

    logger.debug(`📋 Found ${threads.threads.size} active threads, ${archivedThreads.threads.size} archived threads`, guildId);

    // Filter for actual movie posts (exclude system posts)
    const moviePosts = Array.from(allThreads.values())
      .filter(thread => {
        // Include movie posts with movie emojis
        const hasMovieEmoji = thread.name.match(/^[🎬📌🎪✅⏭️]/);
        // Exclude system posts
        const isSystemPost = thread.name.includes('Recommend a Movie') ||
                           thread.name.includes('🍿') ||
                           thread.name.includes('No Active Voting Session') ||
                           thread.name.includes('🚫');
        return hasMovieEmoji && !isSystemPost;
      })
      .slice(0, limit);

    logger.debug(`📋 Found ${moviePosts.length} movie posts to process`, guildId);
    moviePosts.forEach(post => logger.debug(`📋 Movie post: ${post.name} (archived: ${post.archived})`, guildId));

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

/**
 * Clear all movie forum posts when session ends - DATABASE-DRIVEN SAFE DELETION
 * Only deletes threads/messages that are tracked in our database
 */
async function clearForumMoviePosts(channel, winnerMovieId = null) {
  try {
    if (!isForumChannel(channel)) return { archived: 0, deleted: 0 };

    const logger = require('../utils/logger');
    const database = require('../database');
    const guildId = channel.guild?.id;
    logger.debug(`🧹 Clearing forum movie posts in channel: ${channel.name} (DATABASE-DRIVEN)`, guildId);

    // Get all movies from database for this guild and channel
    const allMovies = await database.getMoviesByGuild(guildId);
    const channelMovies = allMovies.filter(movie =>
      movie.channel_id === channel.id &&
      movie.channel_type === 'forum' &&
      movie.thread_id // Only process movies with thread IDs
    );

    logger.debug(`📋 Found ${channelMovies.length} database-tracked forum movies to process`, guildId);

    let deletedCount = 0;
    let skippedCount = 0;

    for (const movie of channelMovies) {
      try {
        // Check if this is the winner thread
        const isWinner = winnerMovieId && movie.thread_id === winnerMovieId;

        if (isWinner) {
          // Winner thread - keep it
          logger.debug(`🏆 Keeping winner thread: ${movie.title} (${movie.thread_id})`, guildId);
          skippedCount++;
          continue;
        }

        // Try to fetch and delete the thread
        try {
          const thread = await channel.client.channels.fetch(movie.thread_id);
          if (thread && thread.parentId === channel.id) {
            await thread.delete('Movie cleanup - session ended');
            deletedCount++;
            logger.info(`🗑️ Deleted forum thread: ${movie.title} (${movie.thread_id})`, guildId);
          } else {
            logger.debug(`📋 Thread not found or not in this channel: ${movie.title} (${movie.thread_id})`, guildId);
          }
        } catch (threadError) {
          if (threadError.code === 10003) { // Unknown Channel
            logger.debug(`📋 Thread already deleted: ${movie.title} (${movie.thread_id})`, guildId);
          } else {
            logger.warn(`Error deleting thread ${movie.title} (${movie.thread_id}):`, threadError.message, guildId);
          }
        }

        // Remove movie from database since we deleted its thread
        await database.deleteMovie(movie.message_id);
        logger.debug(`🗄️ Removed movie from database: ${movie.title}`, guildId);

      } catch (error) {
        logger.warn(`Error processing movie ${movie.title}:`, error.message, guildId);
      }
    }

    // ALSO DELETE SYSTEM POSTS when no active session
    if (!winnerMovieId) {
      logger.debug(`🧹 No active session - also deleting system posts`, guildId);

      // Get all threads to find system posts
      const threads = await channel.threads.fetchActive();
      const archivedThreads = await channel.threads.fetchArchived({ limit: 50 });
      const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);

      for (const [threadId, thread] of allThreads) {
        // Delete system posts (No Active Session, Recommend a Movie)
        if (thread.name.includes('No Active Voting Session') || thread.name.includes('🚫') ||
            thread.name.includes('Recommend a Movie') || thread.name.includes('🍿')) {
          try {
            await thread.delete('System post cleanup - no active session');
            deletedCount++;
            logger.info(`🗑️ Deleted system post: ${thread.name}`, guildId);
          } catch (error) {
            logger.warn(`Error deleting system post ${thread.name}:`, error.message, guildId);
          }
        }
      }
    }

    logger.info(`🧹 Forum cleanup complete: ${deletedCount} deleted, ${skippedCount} kept (winner/system)`, guildId);
    return { archived: 0, deleted: deletedCount };

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error clearing forum movie posts:', error.message, channel.guild?.id);
    return { archived: 0, deleted: 0 };
  }
}

/**
 * Post winner announcement in forum channel
 */
async function postForumWinnerAnnouncement(channel, winnerMovie, sessionName) {
  try {
    if (!isForumChannel(channel)) return null;

    const { EmbedBuilder } = require('discord.js');

    // Create winner announcement embed
    const winnerEmbed = new EmbedBuilder()
      .setTitle('🏆 Movie Night Winner Announced!')
      .setDescription(`**${winnerMovie.title}** has been selected for our next movie night!`)
      .setColor(0xffd700)
      .addFields(
        { name: '📺 Platform', value: winnerMovie.where_to_watch || 'TBD', inline: true },
        { name: '👤 Recommended by', value: `<@${winnerMovie.recommended_by}>`, inline: true },
        { name: '📅 Session', value: sessionName, inline: false }
      )
      .setTimestamp();

    // Create announcement forum post
    const announcementPost = await channel.threads.create({
      name: `🏆 Winner: ${winnerMovie.title}`,
      message: {
        embeds: [winnerEmbed]
      },
      reason: `Winner announcement for ${sessionName}`
    });

    // Try to pin the announcement
    try {
      await announcementPost.pin();
      const logger = require('../utils/logger');
      logger.debug(`📌 Pinned winner announcement: ${winnerMovie.title}`);
    } catch (pinError) {
      const logger = require('../utils/logger');
      if (pinError.code === 30047) {
        logger.warn(`📌 Cannot pin winner announcement (pin limit reached): ${winnerMovie.title}`);
        // Try to unpin other posts to make room
        try {
          const threads = await channel.threads.fetchActive();
          const archivedThreads = await channel.threads.fetchArchived({ limit: 50 });
          const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);

          for (const [threadId, thread] of allThreads) {
            if (thread.pinned && thread.id !== announcementPost.id) {
              await thread.setArchived(true);
              logger.debug(`📌 Unpinned thread to make room for winner: ${thread.name}`);
              break;
            }
          }

          // Try to pin winner announcement again
          await announcementPost.pin();
          logger.debug(`📌 Pinned winner announcement after making room: ${winnerMovie.title}`);
        } catch (retryError) {
          logger.warn(`📌 Still cannot pin winner announcement: ${retryError.message}`);
        }
      } else {
        logger.warn(`📌 Error pinning winner announcement: ${pinError.message}`);
      }
    }

    const logger = require('../utils/logger');
    logger.info(`🏆 Posted winner announcement in forum: ${winnerMovie.title}`);
    return announcementPost;

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error posting forum winner announcement:', error);
    return null;
  }
}

/**
 * Unpin other forum posts to make room for new pin
 */
async function unpinOtherForumPosts(channel, keepPinnedId = null) {
  try {
    const logger = require('../utils/logger');
    const guildId = channel.guild?.id;

    // Get all threads (active and archived)
    const threads = await channel.threads.fetchActive();
    const archivedThreads = await channel.threads.fetchArchived({ limit: 50 });
    const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);

    for (const [threadId, thread] of allThreads) {
      if (thread.pinned && threadId !== keepPinnedId) {
        try {
          // First unarchive if needed, then unpin
          if (thread.archived) {
            await thread.setArchived(false);
          }
          await thread.unpin();
          logger.debug(`📌 Unpinned thread to make room: ${thread.name}`, guildId);
        } catch (error) {
          logger.warn(`Error unpinning thread ${thread.name}:`, error.message, guildId);
        }
      }
    }
  } catch (error) {
    const logger = require('../utils/logger');
    logger.warn('Error unpinning other forum posts:', error.message, channel.guild?.id);
  }
}

/**
 * SIMPLE SOLUTION: Just edit the pinned post instead of complex create/delete
 */
async function ensureRecommendationPost(channel, activeSession = null) {
  try {
    if (!isForumChannel(channel)) return;

    const logger = require('../utils/logger');
    const guildId = channel.guild?.id;
    logger.debug(`📋 Ensuring recommendation post in forum channel: ${channel.name}`, guildId);
    logger.debug(`📋 Active session provided:`, activeSession ? {
      id: activeSession.id,
      name: activeSession.name,
      status: activeSession.status
    } : 'null', guildId);

    // SIMPLE: Find the pinned post (there should only be one)
    const threads = await channel.threads.fetchActive();
    const archivedThreads = await channel.threads.fetchArchived({ limit: 50 });
    const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);

    let pinnedPost = null;
    for (const [threadId, thread] of allThreads) {
      if (thread.pinned) {
        pinnedPost = thread;
        logger.debug(`📋 Found existing pinned post: ${thread.name} (${thread.id})`, guildId);
        break;
      }
    }

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    if (!activeSession) {
      // No active session - edit pinned post to show "No Active Session"
      const noSessionEmbed = new EmbedBuilder()
        .setTitle('🚫 No Active Voting Session')
        .setDescription('There is currently no active voting session.\n\n🎬 **To start a new session:**\n• Use the admin controls to create a new voting session\n• Movies can be recommended once a session is active\n\n📋 **Current Status:** No active session')
        .setColor(0x95a5a6)
        .setFooter({ text: 'Check back later for new voting sessions!' });

      if (pinnedPost) {
        // Edit existing pinned post
        try {
          if (pinnedPost.archived) await pinnedPost.setArchived(false);
          await pinnedPost.setName('🚫 No Active Voting Session');
          const starterMessage = await pinnedPost.fetchStarterMessage();
          if (starterMessage) {
            await starterMessage.edit({ embeds: [noSessionEmbed], components: [] });
          }
          logger.debug('📋 Updated pinned post to no session', guildId);
        } catch (editError) {
          logger.warn(`📋 Error editing existing pinned post: ${editError.message}`, guildId);
          // If editing fails, try to create a new one after unpinning the old one
          try {
            await pinnedPost.unpin();
            logger.debug('📋 Unpinned old post due to edit failure', guildId);
          } catch (unpinError) {
            logger.warn(`📋 Error unpinning old post: ${unpinError.message}`, guildId);
          }
          pinnedPost = null; // Force creation of new post
        }
      }

      if (!pinnedPost) {
        // Create new pinned post
        try {
          const forumPost = await channel.threads.create({
            name: '🚫 No Active Voting Session',
            message: { embeds: [noSessionEmbed] }
          });
          await forumPost.pin();
          logger.debug('📋 Created new no session post', guildId);
        } catch (createError) {
          if (createError.code === 30047) {
            logger.warn('📋 Cannot pin new post (pin limit reached), unpinning others first', guildId);
            await unpinOtherForumPosts(channel);
            // Try again after unpinning
            const forumPost = await channel.threads.create({
              name: '🚫 No Active Voting Session',
              message: { embeds: [noSessionEmbed] }
            });
            await forumPost.pin();
            logger.debug('📋 Created new no session post after unpinning others', guildId);
          } else {
            throw createError;
          }
        }
      }
      return;
    }

    // Active session - edit pinned post to show recommendation
    const recommendEmbed = new EmbedBuilder()
      .setTitle('🍿 Recommend a Movie')
      .setDescription(`**Current Session:** ${activeSession.name}\n\n🎬 Click the button below to recommend a movie!\n\n📝 Each movie gets its own thread for voting and discussion.\n\n🗳️ Voting ends: <t:${Math.floor(new Date(activeSession.voting_end_time).getTime() / 1000)}:R>`)
      .setColor(0x5865f2)
      .setFooter({ text: `Session ID: ${activeSession.id}` });

    const recommendButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_recommendation')
          .setLabel('🎬 Recommend a Movie')
          .setStyle(ButtonStyle.Primary)
      );

    if (pinnedPost) {
      // Edit existing pinned post
      try {
        if (pinnedPost.archived) await pinnedPost.setArchived(false);
        await pinnedPost.setName('🍿 Recommend a Movie');
        const starterMessage = await pinnedPost.fetchStarterMessage();
        if (starterMessage) {
          await starterMessage.edit({ embeds: [recommendEmbed], components: [recommendButton] });
        }
        logger.debug('📋 Updated pinned post to recommendation', guildId);
      } catch (editError) {
        logger.warn(`📋 Error editing existing pinned post: ${editError.message}`, guildId);
        // If editing fails, try to create a new one after unpinning the old one
        try {
          await pinnedPost.unpin();
          logger.debug('📋 Unpinned old post due to edit failure', guildId);
        } catch (unpinError) {
          logger.warn(`📋 Error unpinning old post: ${unpinError.message}`, guildId);
        }
        pinnedPost = null; // Force creation of new post
      }
    }

    if (!pinnedPost) {
      // Create new pinned post
      try {
        const forumPost = await channel.threads.create({
          name: '🍿 Recommend a Movie',
          message: { embeds: [recommendEmbed], components: [recommendButton] }
        });
        await forumPost.pin();
        logger.debug('📋 Created new recommendation post', guildId);
      } catch (createError) {
        if (createError.code === 30047) {
          logger.warn('📋 Cannot pin new post (pin limit reached), unpinning others first', guildId);
          await unpinOtherForumPosts(channel);
          // Try again after unpinning
          const forumPost = await channel.threads.create({
            name: '🍿 Recommend a Movie',
            message: { embeds: [recommendEmbed], components: [recommendButton] }
          });
          await forumPost.pin();
          logger.debug('📋 Created new recommendation post after unpinning others', guildId);
        } else {
          throw createError;
        }
      }
    }

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error(`[${error.constructor.name}] Error ensuring recommendation post:`, error.message, channel.guild?.id);
    logger.error('Error details:', JSON.stringify({
      channelName: channel?.name,
      channelId: channel?.id,
      channelType: channel?.type,
      activeSession: activeSession?.id,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack?.split('\n')[0]
    }), channel.guild?.id);
  }
}

/**
 * Create a "No Active Session" forum post
 */
async function createNoActiveSessionPost(channel) {
  try {
    const logger = require('../utils/logger');

    // Look for existing "No Active Session" post
    const threads = await channel.threads.fetchActive();
    const archivedThreads = await channel.threads.fetchArchived({ limit: 50 });
    const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);

    let noSessionPost = null;
    for (const [threadId, thread] of allThreads) {
      if (thread.name.includes('No Active Voting Session') || thread.name.includes('🚫')) {
        noSessionPost = thread;
        break;
      }
    }

    // Create the embed
    const { EmbedBuilder } = require('discord.js');
    const noSessionEmbed = new EmbedBuilder()
      .setTitle('🚫 No Active Voting Session')
      .setDescription('**There is currently no active voting session.**\n\nAn admin needs to use the "Plan Next Session" button in the admin channel to start a new voting session.\n\n💡 **Tip:** Movie recommendations are only available during active voting sessions.')
      .setColor(0xed4245)
      .addFields(
        { name: '🎬 Want to recommend a movie?', value: 'Wait for an admin to start the next voting session!', inline: false },
        { name: '⚙️ Admin?', value: 'Use the admin channel to plan and start the next session.', inline: false }
      )
      .setFooter({ text: 'Movie recommendations will be available when a session starts' });

    if (noSessionPost) {
      // Update existing post
      if (noSessionPost.archived) {
        await noSessionPost.setArchived(false);
      }

      const starterMessage = await noSessionPost.fetchStarterMessage();
      if (starterMessage) {
        await starterMessage.edit({
          embeds: [noSessionEmbed]
        });

        // Pin the post to keep it visible
        if (!noSessionPost.pinned) {
          await noSessionPost.pin();
        }

        logger.debug('📋 Updated existing no session post');
      }
    } else {
      // Create new no session post
      const forumPost = await channel.threads.create({
        name: '🚫 No Active Voting Session',
        message: {
          embeds: [noSessionEmbed]
        },
        reason: 'No active voting session notification'
      });

      // Pin the post to keep it visible
      await forumPost.pin();

      logger.info(`📋 Created no active session post: ${forumPost.name} (ID: ${forumPost.id})`);
    }

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error creating no active session post:', error);
  }
}

module.exports = {
  isForumChannel,
  isTextChannel,
  getChannelTypeString,
  createForumMoviePost,
  updateForumPostTitle,
  updateForumPostTags,
  updateForumPostContent,
  archiveForumPost,
  getForumMoviePosts,
  cleanupForumPosts,
  clearForumMoviePosts,
  postForumWinnerAnnouncement,
  getMovieStatusTags,
  ensureRecommendationPost,
  unpinOtherForumPosts
};
