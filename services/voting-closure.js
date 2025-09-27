/**
 * Voting Closure Service
 * Handles automatic voting closure at scheduled end times
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Check for sessions that should have voting closed
 */
async function checkVotingClosures(client) {
  try {
    const database = require('../database');

    // Get all active voting sessions
    const activeSessions = await database.getAllActiveVotingSessions();

    const logger = require('../utils/logger');
    logger.debug(`⏰ Checking ${activeSessions.length} active sessions for voting closure...`);

    for (const session of activeSessions) {
      if (session.voting_end_time) {
        const now = new Date();
        const votingEndTime = new Date(session.voting_end_time);

        console.log(
          `⏰ Session "${session.name}": Current time: ${now.toISOString()}, Voting ends: ${votingEndTime.toISOString()}`
        );

        // Check if voting should be closed (with 1 minute buffer for processing)
        if (now >= votingEndTime) {
          const logger = require('../utils/logger');
          logger.info(`⏰ Session ${session.id} voting time already passed, closing now`);
          await closeVotingForSession(client, session);
        } else {
          const timeLeft = Math.round((votingEndTime - now) / 1000 / 60);
          const logger = require('../utils/logger');
          logger.debug(`⏰ Session "${session.name}" has ${timeLeft} minutes left`);
        }
      } else {
        const logger = require('../utils/logger');
        logger.debug(`⏰ Session "${session.name}" has no voting end time set`);
      }
    }
  } catch (error) {
    console.error('Error checking voting closures:', error);
  }
}

/**
 * Close voting for a specific session
 */
async function closeVotingForSession(client, session) {
  try {
    const database = require('../database');

    // Get all movies in this session
    const movies = await database.getMoviesBySession(session.id);

    if (movies.length === 0) {
      const logger = require('../utils/logger');
      logger.info(`No movies found for session ${session.id}`);
      return;
    }

    // Calculate vote totals
    const movieVotes = [];
    for (const movie of movies) {
      const votes = await database.getVotesByMessageId(movie.message_id);
      const upVotes = votes.filter((v) => v.vote_type === 'up').length;
      const downVotes = votes.filter((v) => v.vote_type === 'down').length;
      const totalScore = upVotes - downVotes;

      movieVotes.push({
        movie,
        upVotes,
        downVotes,
        totalScore,
      });
    }

    // Sort by total score (highest first)
    movieVotes.sort((a, b) => b.totalScore - a.totalScore);

    // Check for ties at the top
    const topScore = movieVotes[0].totalScore;
    const winners = movieVotes.filter((mv) => mv.totalScore === topScore);

    const config = await database.getGuildConfig(session.guild_id);

    if (winners.length === 1) {
      // Single winner - automatically select
      const winner = winners[0];
      await selectWinner(client, session, winner, config);
    } else {
      // Tie - require admin selection
      await handleTieBreaking(client, session, winners, config);
    }
  } catch (error) {
    console.error('Error closing voting for session:', error);
  }
}

/**
 * Automatically select a winner
 */
async function selectWinner(client, session, winner, config) {
  try {
    const database = require('../database');

    // Update movie status to scheduled
    await database.updateMovieStatus(winner.movie.message_id, 'scheduled');

    // Update forum post if this is a forum channel movie
    if (winner.movie.channel_type === 'forum' && winner.movie.thread_id) {
      try {
        const forumChannels = require('./forum-channels');
        const thread = await client.channels.fetch(winner.movie.thread_id).catch(() => null);
        if (thread) {
          await forumChannels.updateForumPostContent(thread, winner.movie, 'scheduled');
        }
      } catch (error) {
        console.warn('Error updating forum post for automatic winner:', error.message);
      }
    }

    // Clear voting channel based on channel type
    if (config && config.movie_channel_id) {
      const votingChannel = await client.channels.fetch(config.movie_channel_id);
      if (votingChannel) {
        const forumChannels = require('./forum-channels');

        if (forumChannels.isForumChannel(votingChannel)) {
          // Forum channel - remove ALL voting threads (including the winner recommendation), then post winner announcement
          await forumChannels.clearForumMoviePosts(votingChannel, null);
          // Pass event info if available
          const eventOptions = session.discord_event_id
            ? {
                event: { id: session.discord_event_id, startTime: session.scheduled_date },
                wonByVotes: true,
              }
            : { wonByVotes: true };
          await forumChannels.postForumWinnerAnnouncement(
            votingChannel,
            winner.movie,
            session.name,
            eventOptions
          );

          // Reset pinned post since session is ending
          await forumChannels.ensureRecommendationPost(votingChannel, null);
        } else {
          // Text channel - delete messages and threads
          const messages = await votingChannel.messages.fetch({ limit: 100 });
          const botMessages = messages.filter((msg) => msg.author.id === client.user.id);

          for (const [messageId, message] of botMessages) {
            try {
              await message.delete();
            } catch (error) {
              console.warn(`Failed to delete message ${messageId}:`, error.message);
            }
          }

          // Clear threads
          const threads = await votingChannel.threads.fetchActive();
          for (const [threadId, thread] of threads.threads) {
            try {
              await thread.delete();
            } catch (error) {
              console.warn(`Failed to delete thread ${threadId}:`, error.message);
            }
          }
        }

        // Post winner announcement
        let winnerDescription = `**${winner.movie.title}** has been automatically selected as the winner!`;

        // Add event link if available
        if (session.discord_event_id) {
          winnerDescription += `\n\n📅 [**Join the Discord Event**](https://discord.com/events/${session.guild_id}/${session.discord_event_id}) to RSVP for watch party!`;
        }

        // Add IMDB info if available
        if (winner.movie.imdb_id) {
          try {
            const imdb = require('./imdb');
            const imdbData = await imdb.getMovieDetailsCached(winner.movie.imdb_id);
            if (imdbData) {
              if (imdbData.Plot && imdbData.Plot !== 'N/A') {
                winnerDescription += `\n\n📖 **Plot:** ${imdbData.Plot}`;
              }
              if (imdbData.Year && imdbData.Year !== 'N/A') {
                winnerDescription += `\n📅 **Year:** ${imdbData.Year}`;
              }
              if (imdbData.Runtime && imdbData.Runtime !== 'N/A') {
                winnerDescription += `\n⏱️ **Runtime:** ${imdbData.Runtime}`;
              }
              if (imdbData.Genre && imdbData.Genre !== 'N/A') {
                winnerDescription += `\n🎭 **Genre:** ${imdbData.Genre}`;
              }
              if (imdbData.imdbRating && imdbData.imdbRating !== 'N/A') {
                winnerDescription += `\n⭐ **IMDB Rating:** ${imdbData.imdbRating}/10`;
              }
            }
          } catch (error) {
            console.warn('Error fetching IMDB data for winner announcement:', error.message);
          }
        }

        const winnerEmbed = new EmbedBuilder()
          .setTitle('🏆 Voting Closed - Winner Selected!')
          .setDescription(winnerDescription)
          .addFields(
            {
              name: '📊 Final Results',
              value: `👍 ${winner.upVotes} votes | 👎 ${winner.downVotes} votes | **Score: ${winner.totalScore}**`,
              inline: false,
            },
            { name: '📅 Session', value: session.name, inline: true },
            { name: '⏰ Voting Ended', value: new Date().toLocaleString(), inline: true }
          )
          .setColor(0x57f287)
          .setTimestamp();
        winnerEmbed.addFields({
          name: '\ud83d\udc51 Selected by',
          value: 'Won by votes',
          inline: true,
        });

        if (winner.movie.imdb_id) {
          try {
            const imdb = require('./imdb');
            const imdbData = await imdb.getMovieDetails(winner.movie.imdb_id);
            if (imdbData && imdbData.Poster && imdbData.Poster !== 'N/A') {
              winnerEmbed.setThumbnail(imdbData.Poster);
            }
          } catch (error) {
            console.warn('Error fetching IMDb data for winner announcement:', error.message);
          }
        }

        await votingChannel.send({
          content: config.notification_role_id ? `<@&${config.notification_role_id}>` : null,
          embeds: [winnerEmbed],
        });
      }
    }

    // Clear and update admin channel
    if (config && config.admin_channel_id) {
      try {
        const adminChannel = await client.channels.fetch(config.admin_channel_id);
        if (adminChannel) {
          console.log('🔧 Clearing admin channel after automatic winner selection');

          // Clear all bot messages except control panel
          const messages = await adminChannel.messages.fetch({ limit: 100 });
          const botMessages = messages.filter((msg) => msg.author.id === client.user.id);

          for (const [messageId, message] of botMessages) {
            try {
              const isControlPanel =
                message.embeds.length > 0 &&
                message.embeds[0].title &&
                message.embeds[0].title.includes('Admin Control Panel');

              if (!isControlPanel) {
                await message.delete();
              }
            } catch (error) {
              console.warn(`Failed to delete admin message ${messageId}:`, error.message);
            }
          }

          // Post winner announcement in admin channel
          const adminWinnerEmbed = new EmbedBuilder()
            .setTitle('🏆 Winner Selected Automatically')
            .setDescription(`**${winner.movie.title}** was automatically selected as the winner!`)
            .addFields(
              {
                name: '📊 Final Score',
                value: `${winner.totalScore} (${winner.upVotes} 👍 - ${winner.downVotes} 👎)`,
                inline: false,
              },
              { name: '👑 Selected by', value: 'Won by votes', inline: true },
              { name: '📅 Session', value: session.name, inline: true },
              { name: '⏰ Selected At', value: new Date().toLocaleString(), inline: true }
            )
            .setColor(0x57f287)
            .setTimestamp();

          await adminChannel.send({ embeds: [adminWinnerEmbed] });

          // Refresh admin control panel to show updated state
          const adminControls = require('./admin-controls');
          await adminControls.ensureAdminControlPanel(client, session.guild_id);
        }
      } catch (error) {
        console.warn('Error updating admin channel:', error.message);
      }
    }

    // Update Discord event
    if (session.discord_event_id) {
      try {
        console.log(
          `📅 Updating Discord event ${session.discord_event_id} with winner: ${winner.movie.title}`
        );
        const guild = await client.guilds.fetch(session.guild_id);
        const event = await guild.scheduledEvents.fetch(session.discord_event_id);
        if (event) {
          console.log(`📅 Found event: ${event.name}, updating...`);

          // Get IMDB info for enhanced event description
          let eventDescription = `🏆 **WINNER: ${winner.movie.title}**\n\n`;
          let posterBuffer = null;

          if (winner.movie.imdb_id) {
            try {
              const imdb = require('./imdb');
              const imdbData = await imdb.getMovieDetailsCached(winner.movie.imdb_id);
              if (imdbData) {
                if (imdbData.Plot && imdbData.Plot !== 'N/A') {
                  eventDescription += `📖 ${imdbData.Plot}\n\n`;
                }
                if (imdbData.Year && imdbData.Year !== 'N/A') {
                  eventDescription += `📅 Released: ${imdbData.Year}\n`;
                }
                if (imdbData.Runtime && imdbData.Runtime !== 'N/A') {
                  eventDescription += `⏱️ Runtime: ${imdbData.Runtime}\n`;
                }
                if (imdbData.Genre && imdbData.Genre !== 'N/A') {
                  eventDescription += `🎭 Genre: ${imdbData.Genre}\n`;
                }
                if (imdbData.imdbRating && imdbData.imdbRating !== 'N/A') {
                  eventDescription += `⭐ IMDB Rating: ${imdbData.imdbRating}/10\n`;
                }
                if (imdbData.Poster && imdbData.Poster !== 'N/A') {
                  eventDescription += `🖼️ Poster: ${imdbData.Poster}\n`;
                  try {
                    const res = await fetch(imdbData.Poster);
                    if (res.ok) {
                      const len = Number(res.headers.get('content-length') || '0');
                      if (!len || len < 8000000) {
                        // <8MB safety
                        const arr = await res.arrayBuffer();
                        posterBuffer = Buffer.from(arr);
                        try {
                          const { composeEventCoverFromPoster } = require('./image-utils');
                          posterBuffer = await composeEventCoverFromPoster(posterBuffer);
                        } catch (composeErr) {
                          console.warn(
                            'Poster composition failed, will upload raw poster:',
                            composeErr.message
                          );
                        }
                      }
                    }
                  } catch (imgErr) {
                    console.warn('Could not fetch poster image for event cover:', imgErr.message);
                  }
                }
                eventDescription += `\n`;
              }
            } catch (error) {
              console.warn('Error fetching IMDB data for event update:', error.message);
            }
          }
          eventDescription += `
👤 Selected by: Won by votes`;

          eventDescription += `📊 Final Score: ${winner.totalScore} (${winner.upVotes} 👍 - ${winner.downVotes} 👎)\n\n`;
          eventDescription += `📅 Join us for watch party!\n\n🔗 SESSION_UID:${session.id}`;

          const editPayload = {
            name: `🎬 ${session.name} - ${winner.movie.title}`,
            description: eventDescription,
          };
          if (posterBuffer) {
            editPayload.image = posterBuffer;
          }
          await event.edit(editPayload);
          console.log(
            `📅 Successfully updated Discord event with winner and IMDB info: ${winner.movie.title}`
          );
        } else {
          console.warn(`📅 Discord event not found: ${session.discord_event_id}`);
        }
      } catch (error) {
        console.warn('Error updating Discord event:', error.message);
      }
    } else {
      console.warn('📅 No Discord event ID found for session');
    }

    // Update session status
    await database.updateVotingSessionStatus(session.id, 'completed');

    // Mark non-winning content for next session
    const winnerContentId = winner.movie.id;
    await database.markMoviesForNextSession(session.guild_id, winnerContentId);
    await database.markTVShowsForNextSession(session.guild_id, winnerContentId);

    // Ensure "No Active Voting Session" message is posted in voting channel
    if (config && config.movie_channel_id) {
      try {
        const votingChannel = await client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const forumChannels = require('./forum-channels');
          const cleanup = require('./cleanup');
          if (forumChannels.isForumChannel(votingChannel)) {
            await forumChannels.ensureRecommendationPost(votingChannel, null);
          } else {
            await cleanup.ensureQuickActionPinned(votingChannel);
          }
        }
      } catch (error) {
        const logger = require('../utils/logger');
        logger.warn('Error posting no session message after winner selection:', error.message);
      }
    }

    const logger = require('../utils/logger');
    logger.info(
      `🏆 Automatically selected winner: ${winner.movie.title} for session ${session.name}`
    );
  } catch (error) {
    console.error('Error selecting winner:', error);
  }
}

/**
 * Handle tie-breaking scenario
 */
async function handleTieBreaking(client, session, winners, config) {
  try {
    // Post tie announcement in voting channel
    if (config && config.movie_channel_id) {
      const votingChannel = await client.channels.fetch(config.movie_channel_id);
      if (votingChannel) {
        const forumChannels = require('./forum-channels');
        if (!forumChannels.isForumChannel(votingChannel)) {
          const tieEmbed = new EmbedBuilder()
            .setTitle('🤝 Voting Closed - Tie Detected!')
            .setDescription(`We have a ${winners.length}-way tie! An admin will select the winner.`)
            .addFields(
              {
                name: '🏆 Tied Movies',
                value: winners
                  .map((w) => `**${w.movie.title}** (Score: ${w.totalScore})`)
                  .join('\n'),
                inline: false,
              },
              { name: '📅 Session', value: session.name, inline: true },
              { name: '⏰ Voting Ended', value: new Date().toLocaleString(), inline: true }
            )
            .setColor(0xfee75c)
            .setTimestamp();
          await votingChannel.send({
            content: config.notification_role_id ? `<@&${config.notification_role_id}>` : null,
            embeds: [tieEmbed],
          });
        } else {
          // Forum channel: update the pinned recommendation post with a tie announcement
          try {
            const forumChannels = require('./forum-channels');
            const statusTitle = '🤝 Voting Closed - Tie Detected';
            const statusDesc =
              `We have a ${winners.length}-way tie! An admin will select the winner.\n\n` +
              winners.map((w) => `• **${w.movie.title}** — Score: ${w.totalScore}`).join('\n');
            await forumChannels.setPinnedPostStatusNote(votingChannel, statusTitle, statusDesc);
          } catch (e) {
            const logger = require('../utils/logger');
            logger.debug('Tie in forum: failed to set pinned status note:', e.message);
          }
        }
      }
    }

    // Post tie-breaking options in admin channel
    if (config && config.admin_channel_id) {
      const adminChannel = await client.channels.fetch(config.admin_channel_id);
      if (adminChannel) {
        // Clear existing movie posts
        const messages = await adminChannel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter((msg) => msg.author.id === client.user.id);

        for (const [messageId, message] of botMessages) {
          try {
            const isControlPanel =
              message.embeds.length > 0 &&
              message.embeds[0].title &&
              message.embeds[0].title.includes('Admin Control Panel');

            if (!isControlPanel) {
              await message.delete();
            }
          } catch (error) {
            console.warn(`Failed to delete admin message ${messageId}:`, error.message);
          }
        }

        // Post each tied movie with Select Winner button
        for (const winner of winners) {
          const adminMirror = require('./admin-mirror');
          await adminMirror.postTieBreakingMovie(adminChannel, winner.movie, winner);
        }
      }
    }

    console.log(
      `🤝 Tie detected for session ${session.name}: ${winners.length} movies tied with score ${winners[0].totalScore}`
    );
  } catch (error) {
    console.error('Error handling tie-breaking:', error);
  }
}

/**
 * Start the voting closure checker (runs on the minute)
 */
function startVotingClosureChecker(client) {
  console.log('⏰ Starting voting closure checker...');

  // Check immediately on start
  checkVotingClosures(client);

  // Calculate time until next minute
  const now = new Date();
  const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

  // Wait until the next minute, then start checking every minute on the minute
  setTimeout(() => {
    console.log('⏰ Running scheduled voting closure check (on the minute)...');
    checkVotingClosures(client);

    // Then check every minute on the minute
    const _intervalId = setInterval(() => {
      console.log('⏰ Running scheduled voting closure check (on the minute)...');
      checkVotingClosures(client);
    }, 60000); // 60 seconds

    console.log('⏰ Voting closure checker now running on the minute');
  }, msUntilNextMinute);

  console.log(
    `⏰ Voting closure checker will align to the minute in ${Math.round(msUntilNextMinute / 1000)} seconds`
  );
}

module.exports = {
  checkVotingClosures,
  closeVotingForSession,
  startVotingClosureChecker,
};
