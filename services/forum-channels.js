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

/**
 * Clear all movie forum posts when session ends (archive non-winners, delete losers)
 */
async function clearForumMoviePosts(channel, winnerMovieId = null) {
  try {
    if (!isForumChannel(channel)) return { archived: 0, deleted: 0 };

    console.log(`🧹 Clearing forum movie posts in channel: ${channel.name}`);

    const moviePosts = await getForumMoviePosts(channel, 100);
    let archivedCount = 0;
    let deletedCount = 0;

    for (const thread of moviePosts) {
      try {
        // Skip recommendation posts
        if (thread.name.includes('Recommend a Movie') || thread.name.includes('🍿')) {
          continue;
        }

        // Check if this is the winner thread
        const isWinner = winnerMovieId && thread.id === winnerMovieId;

        if (isWinner) {
          // Winner thread - just update status, don't archive yet
          console.log(`🏆 Keeping winner thread: ${thread.name}`);
          continue;
        } else {
          // Non-winner thread - archive it
          if (!thread.archived) {
            await archiveForumPost(thread, 'Session ended - movie not selected');
            archivedCount++;
            console.log(`📦 Archived non-winner thread: ${thread.name}`);
          }
        }
      } catch (error) {
        console.warn(`Error processing forum thread ${thread.name}:`, error.message);
      }
    }

    console.log(`🧹 Forum cleanup complete: ${archivedCount} archived, ${deletedCount} deleted`);
    return { archived: archivedCount, deleted: deletedCount };

  } catch (error) {
    console.error('Error clearing forum movie posts:', error);
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

    // Pin the announcement
    await announcementPost.pin();

    console.log(`🏆 Posted winner announcement in forum: ${winnerMovie.title}`);
    return announcementPost;

  } catch (error) {
    console.error('Error posting forum winner announcement:', error);
    return null;
  }
}

/**
 * Create or update the "Recommend a Movie" forum post
 */
async function ensureRecommendationPost(channel, activeSession = null) {
  try {
    if (!isForumChannel(channel)) return;

    const logger = require('../utils/logger');
    logger.debug(`📋 Ensuring recommendation post in forum channel: ${channel.name}`);
    logger.debug(`📋 Active session provided:`, activeSession ? {
      id: activeSession.id,
      name: activeSession.name,
      status: activeSession.status
    } : 'null');

    // Look for existing recommendation post
    const threads = await channel.threads.fetchActive();
    const archivedThreads = await channel.threads.fetchArchived({ limit: 50 });
    const allThreads = new Map([...threads.threads, ...archivedThreads.threads]);

    let recommendationPost = null;
    for (const [threadId, thread] of allThreads) {
      if (thread.name.includes('Recommend a Movie') || thread.name.includes('🍿')) {
        recommendationPost = thread;
        break;
      }
    }

    if (!activeSession) {
      // No active session - archive existing recommendation post and create "No Active Session" post
      if (recommendationPost && !recommendationPost.archived) {
        await recommendationPost.setArchived(true);
        logger.debug('📋 Archived recommendation post (no active session)');
      }

      // Create "No Active Session" forum post
      await createNoActiveSessionPost(channel);
      return;
    }

    // Create recommendation post embed
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    let description = '**Ready to recommend a movie?** Click the button below to add your movie recommendation to this voting session!\n\n';

    // Add session description/theme if available
    if (activeSession.description && activeSession.description.trim()) {
      description += `**Session Theme:** ${activeSession.description}\n\n`;
    }

    description += '🎬 Your movie will appear as a new forum post where everyone can vote and discuss!\n\n';

    // Add event link if available
    if (activeSession.discord_event_id) {
      description += `📅 [**Join the Discord Event**](https://discord.com/events/${activeSession.guild_id}/${activeSession.discord_event_id}) to RSVP and get notified!`;
    }

    const recommendEmbed = new EmbedBuilder()
      .setTitle('🍿 Recommend a Movie')
      .setDescription(description)
      .setColor(0x5865f2)
      .addFields(
        { name: '📋 Current Session', value: activeSession.name || 'Movie Night Session', inline: true },
        { name: '⏰ Voting Ends', value: activeSession.voting_end_time ?
          `<t:${Math.floor(new Date(activeSession.voting_end_time).getTime() / 1000)}:R>` :
          'Not set', inline: true }
      );

    const recommendButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_recommendation')
          .setLabel('🍿 Recommend a Movie')
          .setStyle(ButtonStyle.Primary)
      );

    if (recommendationPost) {
      // Update existing post
      if (recommendationPost.archived) {
        await recommendationPost.setArchived(false);
      }

      const starterMessage = await recommendationPost.fetchStarterMessage();
      if (starterMessage) {
        await starterMessage.edit({
          embeds: [recommendEmbed],
          components: [recommendButton]
        });

        // Pin the post to keep it at the top
        if (!recommendationPost.pinned) {
          await recommendationPost.pin();
        }

        logger.debug('📋 Updated existing recommendation post');
      }
    } else {
      // Create new recommendation post
      logger.debug('📋 Creating new recommendation post...');
      const forumPost = await channel.threads.create({
        name: '🍿 Recommend a Movie',
        message: {
          embeds: [recommendEmbed],
          components: [recommendButton]
        },
        reason: 'Movie recommendation post for forum channel'
      });

      logger.debug(`📋 Forum post created successfully: ${forumPost.name} (ID: ${forumPost.id})`);

      // Pin the post to keep it at the top
      try {
        await forumPost.pin();
        logger.debug('📋 Pinned recommendation post');
      } catch (pinError) {
        logger.warn('📋 Could not pin recommendation post:', pinError.message);
      }

      logger.info(`📋 Created new recommendation post: ${forumPost.name} (ID: ${forumPost.id})`);
    }

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error ensuring recommendation post:', error);
    logger.error('Error details:', {
      channelName: channel?.name,
      channelId: channel?.id,
      channelType: channel?.type,
      activeSession: activeSession?.id,
      errorMessage: error.message,
      errorStack: error.stack
    });
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
  ensureRecommendationPost
};
