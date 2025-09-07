/**
 * Movie Creation Service
 * Handles movie creation in both text and forum channels
 */

const { embeds, components } = require('../utils');
const forumChannels = require('./forum-channels');
const database = require('../database');

/**
 * Create a movie recommendation in the appropriate channel type
 */
async function createMovieRecommendation(interaction, movieData) {
  const { title, where, imdbId = null, imdbData = null } = movieData;

  try {
    // Get the configured movie channel for this guild
    const database = require('../database');
    const config = await database.getGuildConfig(interaction.guild.id);

    console.log(`🔍 DEBUG: Guild config for ${interaction.guild.id}:`, config);

    if (!config || !config.movie_channel_id) {
      throw new Error('No movie channel configured for this guild. Use /movie-configure set-channel to set one.');
    }

    console.log(`🔍 DEBUG: Configured movie channel ID: ${config.movie_channel_id}`);

    // Fetch the configured movie channel
    const client = interaction.client || global.discordClient;
    if (!client) {
      throw new Error('Discord client not available');
    }

    const channel = await client.channels.fetch(config.movie_channel_id);
    if (!channel) {
      throw new Error('Configured movie channel not found');
    }

    console.log(`🔍 DEBUG: Fetched channel:`, {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      isForumChannel: forumChannels.isForumChannel(channel),
      isTextChannel: forumChannels.isTextChannel(channel)
    });

    console.log(`🎬 Creating movie recommendation: ${title} in ${forumChannels.getChannelTypeString(channel)} channel (${channel.name})`);

    if (forumChannels.isForumChannel(channel)) {
      console.log(`🔍 DEBUG: Calling createForumMovieRecommendation`);
      return await createForumMovieRecommendation(interaction, movieData, channel);
    } else if (forumChannels.isTextChannel(channel)) {
      console.log(`🔍 DEBUG: Calling createTextMovieRecommendation`);
      return await createTextMovieRecommendation(interaction, movieData, channel);
    } else {
      throw new Error(`Unsupported channel type: ${channel.type}`);
    }

  } catch (error) {
    console.error('Error creating movie recommendation:', error);
    throw error;
  }
}

/**
 * Create movie recommendation in a text channel (existing logic)
 */
async function createTextMovieRecommendation(interaction, movieData, channel) {
  const { title, where, imdbId = null, imdbData = null } = movieData;
  
  // Create movie embed
  const movieEmbedData = {
    title: title,
    where_to_watch: where,
    recommended_by: interaction.user.id,
    status: 'pending',
    imdb_id: imdbId,
    imdb_data: imdbData
  };

  const movieEmbed = embeds.createMovieEmbed(movieEmbedData);

  // Create the message first without buttons
  const message = await channel.send({
    embeds: [movieEmbed]
  });

  // Create buttons with the actual message ID
  const movieComponents = components.createVotingButtons(message.id);

  // Update the message with the correct buttons
  await message.edit({
    embeds: [movieEmbed],
    components: movieComponents
  });

  // Save to database
  console.log(`💾 Saving text channel movie to database: ${title} (${message.id})`);
  const movieId = await database.saveMovie({
    messageId: message.id,
    guildId: interaction.guild.id,
    channelId: channel.id,
    title: title,
    whereToWatch: where,
    recommendedBy: interaction.user.id,
    imdbId: imdbId,
    imdbData: imdbData
  });

  if (!movieId) {
    // If database save failed, delete the message
    await message.delete().catch(console.error);
    throw new Error('Failed to save movie to database');
  }

  // Create thread for discussion
  try {
    const thread = await message.startThread({
      name: `💬 ${title}`,
      autoArchiveDuration: 10080 // 7 days
    });
    console.log(`🧵 Created discussion thread: ${thread.name}`);
  } catch (error) {
    console.warn('Failed to create thread:', error.message);
  }

  return { message, movieId };
}

/**
 * Create movie recommendation in a forum channel (new logic)
 */
async function createForumMovieRecommendation(interaction, movieData, channel) {
  const { title, where, imdbId = null, imdbData = null } = movieData;

  console.log(`🔍 DEBUG: createForumMovieRecommendation called with:`, {
    title,
    where,
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type
  });

  // Create movie embed
  const movieEmbedData = {
    title: title,
    where_to_watch: where,
    recommended_by: interaction.user.id,
    status: 'pending',
    imdb_id: imdbId,
    imdb_data: imdbData
  };

  const movieEmbed = embeds.createMovieEmbed(movieEmbedData);
  console.log(`🔍 DEBUG: Created movie embed for: ${title}`);

  // Create forum post
  console.log(`🔍 DEBUG: About to call createForumMoviePost`);
  const result = await forumChannels.createForumMoviePost(
    channel,
    { title, embed: movieEmbed },
    [] // We'll add components after getting the message ID
  );

  console.log(`🔍 DEBUG: createForumMoviePost result:`, {
    threadId: result.thread?.id,
    messageId: result.message?.id
  });

  const { thread, message } = result;

  // Create buttons with the actual message ID
  const movieComponents = components.createVotingButtons(message.id);

  // Update the starter message with buttons
  await message.edit({
    embeds: [movieEmbed],
    components: movieComponents
  });

  // Save to database with both message ID and thread ID
  console.log(`💾 Saving forum movie to database: ${title} (Message: ${message.id}, Thread: ${thread.id})`);
  const movieId = await database.addForumMovie(
    interaction.guild.id,
    title,
    where,
    interaction.user.id,
    message.id,
    thread.id,
    imdbId,
    imdbData
  );

  if (!movieId) {
    // If database save failed, delete the forum post
    await thread.delete().catch(console.error);
    throw new Error('Failed to save forum movie to database');
  }

  return { message, thread, movieId };
}

/**
 * Update movie status and appearance based on channel type
 */
async function updateMovieStatus(movie, newStatus, upVotes = 0, downVotes = 0) {
  try {
    if (movie.channel_type === 'forum' && movie.thread_id) {
      // Update forum post title and tags
      const client = require('../index').client;
      const thread = await client.channels.fetch(movie.thread_id).catch(() => null);
      
      if (thread) {
        await forumChannels.updateForumPostTitle(thread, movie.title, newStatus, upVotes, downVotes);
        await forumChannels.updateForumPostTags(thread, newStatus);
        
        // Archive completed movies
        if (['watched', 'skipped'].includes(newStatus)) {
          await forumChannels.archiveForumPost(thread, `Movie marked as ${newStatus}`);
        }
      }
    }
    
    // Update database status
    await database.updateMovieStatus(movie.message_id, newStatus);
    
  } catch (error) {
    console.error('Error updating movie status:', error);
  }
}

/**
 * Get movies from channel based on channel type
 */
async function getChannelMovies(channel, limit = 50) {
  try {
    if (forumChannels.isForumChannel(channel)) {
      return await database.getForumMovies(channel.guild.id, limit);
    } else {
      return await database.getMoviesByStatus(channel.guild.id, 'pending', limit);
    }
  } catch (error) {
    console.error('Error getting channel movies:', error);
    return [];
  }
}

/**
 * Clean up old movies based on channel type
 */
async function cleanupChannelMovies(channel, olderThanDays = 30) {
  try {
    if (forumChannels.isForumChannel(channel)) {
      return await forumChannels.cleanupForumPosts(channel, olderThanDays);
    } else {
      // Text channel cleanup logic would go here
      return 0;
    }
  } catch (error) {
    console.error('Error cleaning up channel movies:', error);
    return 0;
  }
}

module.exports = {
  createMovieRecommendation,
  createTextMovieRecommendation,
  createForumMovieRecommendation,
  updateMovieStatus,
  getChannelMovies,
  cleanupChannelMovies
};
