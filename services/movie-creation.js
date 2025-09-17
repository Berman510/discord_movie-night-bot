/**
 * Content Creation Service
 * Handles movie and TV show creation in both text and forum channels
 */

const { embeds, components } = require('../utils');
const forumChannels = require('./forum-channels');
const database = require('../database');
const logger = require('../utils/logger');

/**
 * Detect if content is a TV show or movie based on IMDb data
 */
function detectContentType(imdbData) {
  if (!imdbData) return 'movie';

  const type = imdbData.Type?.toLowerCase();
  if (type === 'series' || type === 'episode') {
    return 'tv_show';
  }
  return 'movie';
}

/**
 * Create a content recommendation (movie or TV show) in the appropriate channel type
 */
async function createMovieRecommendation(interaction, movieData) {
  const { title, where, imdbId = null, imdbData = null } = movieData;

  try {
    // Detect content type
    const contentType = detectContentType(imdbData);
    logger.debug(`🔍 DEBUG: Detected content type: ${contentType} for "${title}"`);

    // Get the configured movie channel for this guild
    const database = require('../database');

    // Validate content type matches session type
    const activeSession = await database.getActiveVotingSession(interaction.guild.id);
    if (activeSession && activeSession.content_type) {
      const sessionContentType = activeSession.content_type;

      // Check for content type mismatch
      let mismatchError = null;

      if (sessionContentType === 'movie' && contentType !== 'movie') {
        const contentTypeLabel = contentType === 'tv_show' ? 'TV show' : 'episode';
        mismatchError = `❌ **Content Type Mismatch**\n\n🍿 This is a **Movie session**, but you're trying to recommend a **${contentTypeLabel}**.\n\n💡 **Try instead:**\n• Use "📺 Plan TV Show Session" for TV content\n• Search for movies only during movie sessions`;
      } else if (sessionContentType === 'tv_show' && contentType === 'movie') {
        mismatchError = `❌ **Content Type Mismatch**\n\n📺 This is a **TV Show session**, but you're trying to recommend a **movie**.\n\n💡 **Try instead:**\n• Use "🍿 Plan Movie Session" for movies\n• Search for TV shows or episodes during TV sessions`;
      }

      if (mismatchError) {
        const { MessageFlags } = require('discord.js');
        if (interaction.deferred) {
          await interaction.editReply({
            content: mismatchError,
            embeds: [],
            components: []
          });
        } else {
          await interaction.reply({
            content: mismatchError,
            flags: MessageFlags.Ephemeral
          });
        }
        return { success: false, error: 'Content type mismatch' };
      }
    }

    const config = await database.getGuildConfig(interaction.guild.id);

    logger.debug(`Guild config for ${interaction.guild.id}:`, JSON.stringify(config, null, 2));

    if (!config || !config.movie_channel_id) {
      logger.debug(`No movie channel configured. Config:`, config);
      throw new Error('No movie channel configured for this guild. Use /movie-configure set-channel to set one.');
    }

    logger.debug(`Configured movie channel ID: ${config.movie_channel_id}`);

    // Fetch the configured movie channel
    const client = interaction.client || global.discordClient;
    if (!client) {
      throw new Error('Discord client not available');
    }

    const channel = await client.channels.fetch(config.movie_channel_id);
    if (!channel) {
      throw new Error('Configured movie channel not found');
    }

    logger.debug(`🔍 DEBUG: Fetched channel: ${channel.name} (${channel.id}) type=${channel.type} forum=${forumChannels.isForumChannel(channel)} text=${forumChannels.isTextChannel(channel)}`, interaction.guild?.id);

    const contentTypeLabel = contentType === 'tv_show' ? 'TV show' : 'movie';
    logger.info(`🎬 Creating ${contentTypeLabel} recommendation: ${title} in ${forumChannels.getChannelTypeString(channel)} channel (${channel.name})`);

    // Route to appropriate creation function based on content type
    if (contentType === 'tv_show') {
      if (forumChannels.isForumChannel(channel)) {
        logger.debug(`🔍 DEBUG: Calling createForumTVShowRecommendation`);
        return await createForumTVShowRecommendation(interaction, movieData, channel);
      } else if (forumChannels.isTextChannel(channel)) {
        logger.debug(`🔍 DEBUG: Calling createTextTVShowRecommendation`);
        return await createTextTVShowRecommendation(interaction, movieData, channel);
      }
    } else {
      if (forumChannels.isForumChannel(channel)) {
        logger.debug(`🔍 DEBUG: Calling createForumMovieRecommendation`);
        return await createForumMovieRecommendation(interaction, movieData, channel);
      } else if (forumChannels.isTextChannel(channel)) {
        logger.debug(`🔍 DEBUG: Calling createTextMovieRecommendation`);
        return await createTextMovieRecommendation(interaction, movieData, channel);
      }
    }

    throw new Error(`Unsupported channel type: ${channel.type}`);

  } catch (error) {
    logger.error('Error creating movie recommendation:', error);
    throw error;
  }
}

/**
 * Create movie recommendation in a text channel (existing logic)
 */
async function createTextMovieRecommendation(interaction, movieData, channel) {
  const { title, where, imdbId = null } = movieData;

  // Always use IMDb cache (no fallback to movies.imdb_data)
  let imdbData = null;
  try {
    if (imdbId) {
      const imdb = require('./imdb');
      imdbData = await imdb.getMovieDetailsCached(imdbId);
      if (!imdbData) {
        try { imdbData = await imdb.getMovieDetails(imdbId); } catch (_) {}
      }
    }
  } catch (_) {}

  // Create movie embed
  const movieEmbedData = {
    title: title,
    where_to_watch: where,
    recommended_by: interaction.user.id,
    status: 'pending',
    imdb_id: imdbId
  };

  const movieEmbed = embeds.createMovieEmbed(movieEmbedData, imdbData);

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
  logger.debug(`💾 Saving text channel movie to database: ${title} (${message.id})`);
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

  // Cache IMDb data if available
  if (imdbId && imdbData) {
    try {
      await database.upsertImdbCache(imdbId, imdbData);
      logger.debug(`💾 Cached IMDb data for movie: ${imdbId}`);
    } catch (error) {
      logger.warn(`Failed to cache IMDb data for movie ${imdbId}:`, error.message);
    }
  }

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
    logger.debug(`🧵 Created discussion thread: ${thread.name}`);

    // Add detailed information to the thread
    await addDetailedMovieInfoToThread(thread, { title, where, imdbData });
  } catch (error) {
    logger.warn('Failed to create thread:', error.message);
  }

  return { message, movieId };
}

/**
 * Create movie recommendation in a forum channel (new logic)
 */
async function createForumMovieRecommendation(interaction, movieData, channel) {
  const { title, where, imdbId = null } = movieData;

  logger.debug(`🔍 DEBUG: createForumMovieRecommendation called with:`, {
    title,
    where,
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type
  });

  // Always use IMDb cache (no fallback to movies.imdb_data)
  let imdbData = null;
  try {
    if (imdbId) {
      const imdb = require('./imdb');
      imdbData = await imdb.getMovieDetailsCached(imdbId);
      if (!imdbData) {
        try { imdbData = await imdb.getMovieDetails(imdbId); } catch (_) {}
      }
    }
  } catch (_) {}

  // Create movie embed
  const movieEmbedData = {
    title: title,
    where_to_watch: where,
    recommended_by: interaction.user.id,
    status: 'pending',
    imdb_id: imdbId
  };

  const movieEmbed = embeds.createMovieEmbed(movieEmbedData, imdbData);
  logger.debug(`🔍 DEBUG: Created movie embed for: ${title}`);

  // Create forum post
  logger.debug(`🔍 DEBUG: About to call createForumMoviePost`);
  const result = await forumChannels.createForumMoviePost(
    channel,
    { title, embed: movieEmbed },
    [] // We'll add components after getting the message ID
  );

  logger.debug(`🔍 DEBUG: createForumMoviePost result:`, {
    threadId: result.thread?.id,
    messageId: result.message?.id
  });

  const { thread, message } = result;

  // Create buttons with the actual message ID
  const movieComponents = components.createVotingButtons(message.id);
  logger.debug(`🔍 DEBUG: Created voting buttons for forum post: ${message.id}`);

  // Recreate the embed with IMDb data to ensure it's included in the update
  const updatedMovieEmbed = embeds.createMovieEmbed({
    title: title,
    where_to_watch: where,
    recommended_by: interaction.user.id,
    status: 'pending',
    imdb_id: imdbId
  }, imdbData);

  // Update the starter message with buttons and proper embed
  await message.edit({
    embeds: [updatedMovieEmbed],
    components: movieComponents
  });
  logger.debug(`🔍 DEBUG: Updated forum post with voting buttons and IMDb data`);

  // Save to database with both message ID and thread ID
  logger.debug(`💾 Saving forum movie to database: ${title} (Message: ${message.id}, Thread: ${thread.id})`);
  const movieId = await database.addForumMovie(
    interaction.guild.id,
    title,
    where,
    interaction.user.id,
    message.id,
    thread.id,
    channel.id,
    imdbId,
    imdbData
  );

  if (!movieId) {
    // If database save failed, delete the forum post
    await thread.delete().catch(logger.error);
    throw new Error('Failed to save forum movie to database');
  }

  // Forum mode: include all details in the starter embed; no follow-up message needed

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

/**
 * Add detailed movie information to a thread
 */
async function addDetailedMovieInfoToThread(thread, movieData) {
  try {
    const { title, where, imdbData } = movieData;
    const { EmbedBuilder } = require('discord.js');

    // Create a detailed information embed for the thread
    const detailEmbed = new EmbedBuilder()
      .setTitle(`🎬 ${title} - Discussion & Details`)
      .setColor(0x5865f2);

    let description = `Welcome to the discussion thread for **${title}**!\n\n`;

    if (imdbData) {
      if (imdbData.Plot && imdbData.Plot !== 'N/A') {
        description += `**📖 Synopsis:**\n${imdbData.Plot}\n\n`;
      }

      if (imdbData.Director && imdbData.Director !== 'N/A') {
        description += `**🎬 Director:** ${imdbData.Director}\n`;
      }

      if (imdbData.Actors && imdbData.Actors !== 'N/A') {
        description += `**🎭 Cast:** ${imdbData.Actors}\n`;
      }

      if (imdbData.Awards && imdbData.Awards !== 'N/A' && imdbData.Awards !== 'N/A') {
        description += `**🏆 Awards:** ${imdbData.Awards}\n`;
      }

      description += '\n';
    }

    description += `**📺 Where to Watch:** ${where}\n\n`;
    description += `💬 **Use this thread to discuss:**\n`;
    description += `• What you think about this movie\n`;
    description += `• Why others should vote for it\n`;
    description += `• Any questions about the movie\n`;
    description += `• Alternative viewing options`;

    detailEmbed.setDescription(description);

    // Add additional fields if IMDb data is available
    if (imdbData) {
      const additionalFields = [];

      if (imdbData.Language && imdbData.Language !== 'N/A') {
        additionalFields.push({ name: '🌍 Language', value: imdbData.Language, inline: true });
      }

      if (imdbData.Country && imdbData.Country !== 'N/A') {
        additionalFields.push({ name: '🏳️ Country', value: imdbData.Country, inline: true });
      }

      if (imdbData.BoxOffice && imdbData.BoxOffice !== 'N/A') {
        additionalFields.push({ name: '💰 Box Office', value: imdbData.BoxOffice, inline: true });
      }

      if (additionalFields.length > 0) {
        detailEmbed.addFields(...additionalFields);
      }

      // Add poster as thumbnail if available
      if (imdbData.Poster && imdbData.Poster !== 'N/A') {
        detailEmbed.setThumbnail(imdbData.Poster);
      }

      // Add IMDb link if available
      if (imdbData.imdbID && imdbData.imdbID !== 'N/A') {
        detailEmbed.setURL(`https://www.imdb.com/title/${imdbData.imdbID}/`);
      }
    }

    detailEmbed.setFooter({ text: 'Vote on the main post • Discuss here in the thread' });

    await thread.send({ embeds: [detailEmbed] });
    logger.debug(`📝 Added detailed movie info to thread: ${thread.name}`);

  } catch (error) {
    logger.warn('Error adding detailed info to thread:', error.message);
  }
}

/**
 * Create TV show recommendation in a text channel
 */
async function createTextTVShowRecommendation(interaction, showData, channel) {
  const { title, where, imdbId = null } = showData;

  // Always use IMDb cache (no fallback to tv_shows.imdb_data)
  let imdbData = null;
  try {
    if (imdbId) {
      const imdb = require('./imdb');
      imdbData = await imdb.getMovieDetailsCached(imdbId);
      if (!imdbData) {
        try { imdbData = await imdb.getMovieDetails(imdbId); } catch (_) {}
      }
    }
  } catch (_) {}

  // Create TV show embed (reuse movie embed for now, will enhance later)
  const showEmbedData = {
    title: title,
    where_to_watch: where,
    recommended_by: interaction.user.id,
    status: 'pending',
    imdb_id: imdbId
  };

  const showEmbed = embeds.createMovieEmbed(showEmbedData, imdbData);

  // Create the message first without buttons
  const message = await channel.send({
    embeds: [showEmbed]
  });

  // Create buttons with the actual message ID (reuse voting buttons for now)
  const showComponents = components.createVotingButtons(message.id);

  // Update the message with the correct buttons
  await message.edit({
    embeds: [showEmbed],
    components: showComponents
  });

  // Save to TV shows database
  logger.debug(`💾 Saving text channel TV show to database: ${title} (${message.id})`);
  const showId = await database.saveTVShow({
    messageId: message.id,
    guildId: interaction.guild.id,
    channelId: channel.id,
    title: title,
    whereToWatch: where,
    recommendedBy: interaction.user.id,
    imdbId: imdbId,
    imdbData: imdbData
  });

  // Cache IMDb data if available
  if (imdbId && imdbData) {
    try {
      await database.upsertImdbCache(imdbId, imdbData);
      logger.debug(`💾 Cached IMDb data for TV show: ${imdbId}`);
    } catch (error) {
      logger.warn(`Failed to cache IMDb data for TV show ${imdbId}:`, error.message);
    }
  }

  if (!showId) {
    // If database save failed, delete the message
    await message.delete().catch(console.error);
    throw new Error('Failed to save TV show to database');
  }

  // Create thread for discussion
  try {
    const thread = await message.startThread({
      name: `💬 ${title}`,
      autoArchiveDuration: 10080 // 7 days
    });
    logger.debug(`🧵 Created discussion thread: ${thread.name}`);

    // Add detailed information to the thread
    await addDetailedTVShowInfoToThread(thread, { title, where, imdbData });
  } catch (error) {
    logger.warn('Failed to create thread:', error.message);
  }

  return { message, movieId: showId };
}

/**
 * Create TV show recommendation in a forum channel
 */
async function createForumTVShowRecommendation(interaction, showData, channel) {
  const { title, where, imdbId = null } = showData;

  logger.debug(`🔍 DEBUG: createForumTVShowRecommendation called with:`, {
    title,
    where,
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type
  });

  // Always use IMDb cache (no fallback to tv_shows.imdb_data)
  let imdbData = null;
  try {
    if (imdbId) {
      const imdb = require('./imdb');
      imdbData = await imdb.getMovieDetailsCached(imdbId);
      if (!imdbData) {
        try { imdbData = await imdb.getMovieDetails(imdbId); } catch (_) {}
      }
    }
  } catch (_) {}

  // Create TV show embed (reuse movie embed for now)
  const showEmbedData = {
    title: title,
    where_to_watch: where,
    recommended_by: interaction.user.id,
    status: 'pending',
    imdb_id: imdbId
  };

  const showEmbed = embeds.createMovieEmbed(showEmbedData, imdbData, null, 'tv_show');
  logger.debug(`🔍 DEBUG: Created TV show embed for: ${title}`);

  // Create forum post for TV show
  logger.debug(`🔍 DEBUG: About to call createForumMoviePost for TV show`);
  const result = await forumChannels.createForumMoviePost(
    channel,
    { title, embed: showEmbed, contentType: 'tv_show' },
    [] // We'll add components after getting the message ID
  );

  logger.debug(`🔍 DEBUG: createForumMoviePost result:`, {
    threadId: result.thread?.id,
    messageId: result.message?.id
  });

  if (!result.message || !result.thread) {
    throw new Error('Failed to create forum TV show post');
  }

  const { message, thread } = result;

  // Create voting buttons with the actual message ID
  const showComponents = components.createVotingButtons(message.id);

  // Update the message with voting buttons
  await message.edit({
    embeds: [showEmbed],
    components: showComponents
  });

  logger.debug(`🔍 DEBUG: Updated forum post with voting buttons and IMDb data`);

  // Save to TV shows database with both message ID and thread ID
  logger.debug(`💾 Saving forum TV show to database: ${title} (Message: ${message.id}, Thread: ${thread.id})`);
  const showId = await database.addForumTVShow(
    interaction.guild.id,
    title,
    where,
    interaction.user.id,
    message.id,
    thread.id,
    channel.id,
    imdbId,
    imdbData
  );

  if (!showId) {
    // If database save failed, delete the forum post
    await thread.delete().catch(logger.error);
    throw new Error('Failed to save forum TV show to database');
  }

  return { message, thread, movieId: showId };
}

/**
 * Add detailed TV show information to a thread
 */
async function addDetailedTVShowInfoToThread(thread, showInfo) {
  try {
    const { title, where, imdbData } = showInfo;

    const detailEmbed = embeds.createMovieEmbed({
      title: `📺 ${title}`,
      where_to_watch: where,
      status: 'pending'
    }, imdbData);

    if (imdbData) {
      // Add TV show specific information
      if (imdbData.Type === 'series' && imdbData.totalSeasons) {
        detailEmbed.addFields({
          name: '📺 Seasons',
          value: imdbData.totalSeasons,
          inline: true
        });
      }

      if (imdbData.Type === 'episode') {
        detailEmbed.addFields({
          name: '📺 Episode',
          value: `Season ${imdbData.Season}, Episode ${imdbData.Episode}`,
          inline: true
        });
      }

      // Add IMDb link if available
      if (imdbData.imdbID && imdbData.imdbID !== 'N/A') {
        detailEmbed.setURL(`https://www.imdb.com/title/${imdbData.imdbID}/`);
      }
    }

    detailEmbed.setFooter({ text: 'Vote on the main post • Discuss here in the thread' });

    await thread.send({ embeds: [detailEmbed] });
    logger.debug(`📝 Added detailed TV show info to thread: ${thread.name}`);

  } catch (error) {
    logger.warn('Error adding detailed TV show info to thread:', error.message);
  }
}

module.exports = {
  createMovieRecommendation,
  createTextMovieRecommendation,
  createForumMovieRecommendation,
  createTextTVShowRecommendation,
  createForumTVShowRecommendation,
  updateMovieStatus,
  getChannelMovies,
  cleanupChannelMovies,
  addDetailedMovieInfoToThread,
  addDetailedTVShowInfoToThread,
  detectContentType
};
