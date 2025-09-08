/**
 * Voting Sessions Service
 * Manages session-based voting with movie tagging and winner selection
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const database = require('../database');
const ephemeralManager = require('../utils/ephemeral-manager');

/**
 * Start the voting session creation process with date/time selection
 */
async function startVotingSessionCreation(interaction) {
  // Initialize session state if needed
  if (!global.votingSessionCreationState) {
    global.votingSessionCreationState = new Map();
  }

  const state = {
    step: 'date',
    selectedDate: null,
    selectedTime: null,
    selectedTimezone: null,
    sessionName: null,
    sessionDescription: null
  };

  global.votingSessionCreationState.set(interaction.user.id, state);

  // Start with date selection modal
  await showVotingSessionDateModal(interaction);
}

/**
 * Show date selection modal for voting session
 */
async function showVotingSessionDateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('voting_session_date_modal')
    .setTitle('Plan Next Voting Session - Date');

  // TODO: Make date/time formats configurable per guild
  // For now, using US standard formats: MM-DD-YYYY and 12-hour time

  const dateInput = new TextInputBuilder()
    .setCustomId('session_date')
    .setLabel('Session Date (MM-DD-YYYY)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('12-25-2024')
    .setRequired(true)
    .setMaxLength(10);

  const timeInput = new TextInputBuilder()
    .setCustomId('session_time')
    .setLabel('Session Time (12-hour format)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('7:30 PM or 07:30 PM')
    .setRequired(true)
    .setMaxLength(8);

  const votingEndInput = new TextInputBuilder()
    .setCustomId('voting_end_time')
    .setLabel('Voting Ends (12-hour format, same day)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('6:30 PM (1 hour before session)')
    .setRequired(false)
    .setMaxLength(8);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('session_description')
    .setLabel('Session Description (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Join us for a festive movie night!')
    .setRequired(false)
    .setMaxLength(500);

  const firstRow = new ActionRowBuilder().addComponents(dateInput);
  const secondRow = new ActionRowBuilder().addComponents(timeInput);
  const thirdRow = new ActionRowBuilder().addComponents(votingEndInput);
  const fourthRow = new ActionRowBuilder().addComponents(descriptionInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

  await interaction.showModal(modal);
}

/**
 * Handle voting session date modal submission
 */
async function handleVotingSessionDateModal(interaction) {
  const userId = interaction.user.id;
  const state = global.votingSessionCreationState?.get(userId);

  if (!state) {
    await interaction.reply({
      content: '❌ Session creation state not found. Please try again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const sessionDate = interaction.fields.getTextInputValue('session_date');
  const sessionTime = interaction.fields.getTextInputValue('session_time');
  const votingEndTime = interaction.fields.getTextInputValue('voting_end_time') || null;
  const sessionDescription = interaction.fields.getTextInputValue('session_description') || null;

  // Validate date format (MM-DD-YYYY)
  const dateRegex = /^(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])-\d{4}$/;
  if (!dateRegex.test(sessionDate)) {
    await interaction.reply({
      content: '❌ Invalid date format. Please use MM-DD-YYYY format (e.g., 12-25-2024).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Parse and validate 12-hour time format
  function parseTime12Hour(timeStr) {
    // Match formats like: 7:30 PM, 07:30 PM, 7:30PM, 07:30PM
    const timeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
    const match = timeStr.trim().match(timeRegex);

    if (!match) {
      return null;
    }

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();

    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  }

  const parsedSessionTime = parseTime12Hour(sessionTime);
  if (!parsedSessionTime) {
    await interaction.reply({
      content: '❌ Invalid session time format. Please use 12-hour format (e.g., 7:30 PM or 07:30 PM).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  let parsedVotingEndTime = null;
  if (votingEndTime) {
    parsedVotingEndTime = parseTime12Hour(votingEndTime);
    if (!parsedVotingEndTime) {
      await interaction.reply({
        content: '❌ Invalid voting end time format. Please use 12-hour format (e.g., 6:30 PM or 06:30 PM).',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

  // Get guild timezone for proper conversion
  const config = await database.getGuildConfig(interaction.guild.id);
  const guildTimezone = config?.timezone || 'America/Los_Angeles';

  // Convert MM-DD-YYYY to YYYY-MM-DD for Date constructor
  const [month, day, year] = sessionDate.split('-');
  const isoDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Create datetime objects with parsed 24-hour times
  const sessionDateTime = new Date(`${isoDateString}T${parsedSessionTime.hours.toString().padStart(2, '0')}:${parsedSessionTime.minutes.toString().padStart(2, '0')}:00`);

  // Parse voting end time (default to 1 hour before session if not provided)
  let votingEndDateTime = null;
  if (parsedVotingEndTime) {
    votingEndDateTime = new Date(`${isoDateString}T${parsedVotingEndTime.hours.toString().padStart(2, '0')}:${parsedVotingEndTime.minutes.toString().padStart(2, '0')}:00`);
  } else {
    // Default to 1 hour before session
    votingEndDateTime = new Date(sessionDateTime);
    votingEndDateTime.setHours(votingEndDateTime.getHours() - 1);
  }

  // Auto-generate session name from parsed date
  const sessionName = `Movie Night - ${sessionDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`;

  const logger = require('../utils/logger');
  logger.debug(`🕐 Session times (${guildTimezone}):`);
  logger.debug(`   Session: ${sessionDateTime.toLocaleString()} (${sessionDateTime.toISOString()})`);
  logger.debug(`   Voting ends: ${votingEndDateTime.toLocaleString()} (${votingEndDateTime.toISOString()})`);

  // Validate that the dates are in the future
  if (sessionDateTime <= new Date()) {
    await interaction.reply({
      content: '❌ Session date and time must be in the future.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (votingEndDateTime <= new Date()) {
    await interaction.reply({
      content: '❌ Voting end time must be in the future.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (votingEndDateTime >= sessionDateTime) {
    await interaction.reply({
      content: '❌ Voting must end before the session starts.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Update state with all information
  state.selectedDate = sessionDate;
  state.selectedTime = sessionTime;
  state.votingEndTime = votingEndTime;
  state.sessionName = sessionName;
  state.sessionDescription = sessionDescription;
  state.sessionDateTime = sessionDateTime;
  state.votingEndDateTime = votingEndDateTime;
  state.step = 'complete';

  global.votingSessionCreationState.set(userId, state);

  // Create the voting session directly
  await createVotingSession(interaction, state);
}

/**
 * Create the voting session with all provided information
 */
async function createVotingSession(interaction, state) {
  const database = require('../database');

  try {
    // Get guild configuration for timezone
    const config = await database.getGuildConfig(interaction.guild.id);
    const guildTimezone = config?.timezone || 'America/Los_Angeles'; // Default to PT

    // Create the voting session in the database
    const sessionData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel?.id || null,
      name: state.sessionName,
      description: state.sessionDescription,
      scheduledDate: state.sessionDateTime,
      votingEndTime: state.votingEndDateTime,
      timezone: guildTimezone,
      createdBy: interaction.user.id,
      status: 'voting'
    };

    const sessionId = await database.createVotingSession(sessionData);

    if (!sessionId) {
      await interaction.reply({
        content: '❌ Failed to create voting session.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Create Discord event
    try {
      const discordEvents = require('./discord-events');
      const eventData = {
        id: sessionId,
        guildId: interaction.guild.id,
        name: state.sessionName,
        description: state.sessionDescription || 'Join us for movie night voting and viewing!',
        votingEndTime: state.votingEndDateTime
      };

      const event = await discordEvents.createDiscordEvent(interaction.guild, eventData, state.sessionDateTime);

      if (event && event.id) {
        // Update session with Discord event ID
        const logger = require('../utils/logger');
        logger.debug(`📅 Saving event ID ${event.id} to session ${sessionId}`);
        const updateResult = await database.updateVotingSessionEventId(sessionId, event.id);
        if (updateResult) {
          logger.debug(`📅 Successfully saved event ID to database`);
        } else {
          logger.warn(`📅 Failed to save event ID to database`);
        }
        logger.info(`📅 Created Discord event: ${event.name} (${event.id})`);
      } else {
        console.warn('Discord event created but no ID returned:', event);
      }
    } catch (error) {
      console.warn('Error creating Discord event for voting session:', error.message);
    }

    // Clear the creation state
    global.votingSessionCreationState?.delete(interaction.user.id);

    // Success response - update the existing ephemeral message
    await interaction.update({
      content: `✅ **Voting session created successfully!**\n\n🎬 **${state.sessionName}**\n📅 ${state.sessionDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}\n⏰ ${state.sessionDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}\n🗳️ Voting ends: ${state.votingEndDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n🗳️ Users can now start recommending movies for this session!`,
      embeds: [],
      components: []
    });

    // Handle carryover movies from previous session
    try {
      const carryoverMovies = await database.getNextSessionMovies(interaction.guild.id);
      if (carryoverMovies.length > 0) {
        console.log(`🔄 Found ${carryoverMovies.length} carryover movies from previous session`);

        // Update carryover movies with new session ID and reset votes
        for (const movie of carryoverMovies) {
          await database.updateMovieSessionId(movie.message_id, sessionId);
          await database.resetMovieVotes(movie.message_id);
          console.log(`🔄 Added carryover movie: ${movie.title}`);
        }

        // Clear the next_session flags
        await database.clearNextSessionFlag(interaction.guild.id);
      }
    } catch (error) {
      console.warn('Error handling carryover movies:', error.message);
    }

    // Update voting channel to show the new session
    try {
      const config = await database.getGuildConfig(interaction.guild.id);
      const client = interaction.client || global.discordClient;

      if (config && config.movie_channel_id && client) {
        logger.debug(`📋 Fetching voting channel: ${config.movie_channel_id}`);
        const votingChannel = await client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('./forum-channels');

          // Handle forum channels differently than text channels
          if (forumChannels.isForumChannel(votingChannel)) {
            console.log(`📋 Voting channel is a forum channel: ${votingChannel.name}`);
            // For forum channels, we don't clear messages - each movie gets its own post
            // The carryover movies will be handled below by creating new forum posts
          } else {
            // Clear existing messages first (text channels only)
            const logger = require('../utils/logger');
            logger.debug(`📋 Clearing existing messages in text channel: ${votingChannel.name}`);
            const messages = await votingChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);

            for (const [messageId, message] of botMessages) {
              try {
                await message.delete();
              } catch (error) {
                console.warn(`Failed to delete message ${messageId}:`, error.message);
              }
            }
          }

          // Add carryover movies to the voting channel
          const carryoverMovies = await database.getMoviesBySession(sessionId);
          if (carryoverMovies.length > 0) {
            console.log(`📝 Creating posts for ${carryoverMovies.length} carryover movies`);

            for (const movie of carryoverMovies) {
              try {
                // Refresh IMDB data for carryover movie if it has an IMDB ID
                let updatedMovie = movie;
                if (movie.imdb_id) {
                  try {
                    const imdb = require('./imdb');
                    const imdbData = await imdb.getMovieDetails(movie.imdb_id);
                    if (imdbData) {
                      // Update movie with fresh IMDB data
                      await database.updateMovieImdbData(movie.message_id, JSON.stringify(imdbData));
                      updatedMovie = { ...movie, imdb_data: JSON.stringify(imdbData) };
                      console.log(`🎬 Refreshed IMDB data for carryover movie: ${movie.title}`);
                    }
                  } catch (error) {
                    console.warn(`Error refreshing IMDB data for ${movie.title}:`, error.message);
                  }
                }

                if (forumChannels.isForumChannel(votingChannel)) {
                  // Create forum post for carryover movie
                  const { embeds, components } = require('../utils');
                  const movieEmbed = embeds.createMovieEmbed(updatedMovie);
                  const movieComponents = components.createVotingButtons(updatedMovie.message_id);

                  const result = await forumChannels.createForumMoviePost(
                    votingChannel,
                    { title: updatedMovie.title, embed: movieEmbed },
                    movieComponents
                  );

                  const { thread, message } = result;

                  // Update database with new message and thread IDs
                  await database.updateMovieMessageId(updatedMovie.guild_id, updatedMovie.title, message.id);
                  await database.updateMovieThreadId(message.id, thread.id);

                  console.log(`📝 Created forum post for carryover movie: ${updatedMovie.title} (Thread: ${thread.id})`);
                } else {
                  // Create text channel message for carryover movie
                  const { embeds, components } = require('../utils');
                  const movieEmbed = embeds.createMovieEmbed(updatedMovie);
                  const movieComponents = components.createVotingButtons(updatedMovie.message_id);

                  const newMessage = await votingChannel.send({
                    embeds: [movieEmbed],
                    components: movieComponents
                  });

                  // Update database with new message ID
                  await database.updateMovieMessageId(updatedMovie.guild_id, updatedMovie.title, newMessage.id);

                  // Create thread for the movie
                  const thread = await newMessage.startThread({
                    name: `💬 ${updatedMovie.title}`,
                    autoArchiveDuration: 10080 // 7 days
                  });

                  console.log(`📝 Created post and thread for carryover movie: ${updatedMovie.title}`);
                }
              } catch (error) {
                console.warn(`Error creating post for carryover movie ${movie.title}:`, error.message);
              }
            }
          }

          // Add the new session message/post
          if (forumChannels.isTextChannel(votingChannel)) {
            // Text channels get quick action pinned
            const cleanup = require('./cleanup');
            await cleanup.ensureQuickActionPinned(votingChannel);
          } else if (forumChannels.isForumChannel(votingChannel)) {
            // Forum channels get recommendation post
            const activeSession = await database.getActiveVotingSession(interaction.guild.id);
            await forumChannels.ensureRecommendationPost(votingChannel, activeSession);
            console.log(`📋 Forum channel setup complete - movies will appear as individual posts`);
          }
        }
      }

      // Refresh admin control panel to show session management buttons
      if (config && config.admin_channel_id && client) {
        try {
          const adminControls = require('./admin-controls');
          await adminControls.ensureAdminControlPanel(client, interaction.guild.id);
        } catch (error) {
          console.warn('Error refreshing admin control panel:', error.message);
        }
      }
    } catch (error) {
      console.warn('Error updating channels after session creation:', error.message);
    }

    // Schedule voting end with smart scheduler
    try {
      const sessionScheduler = require('./session-scheduler');
      await sessionScheduler.scheduleVotingEnd(sessionId, state.votingEndDateTime);
    } catch (error) {
      console.warn('Error scheduling voting end:', error.message);
    }

    console.log(`🎬 Voting session created: ${state.sessionName} by ${interaction.user.tag}`);

  } catch (error) {
    console.error('Error creating voting session:', error);
    await interaction.reply({
      content: '❌ An error occurred while creating the voting session.',
      flags: MessageFlags.Ephemeral
    });
  }
}





module.exports = {
  startVotingSessionCreation,
  showVotingSessionDateModal,
  handleVotingSessionDateModal,
  createVotingSession
};
