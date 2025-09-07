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
    
    for (const session of activeSessions) {
      if (session.voting_end_time) {
        const now = new Date();
        const votingEndTime = new Date(session.voting_end_time);
        
        // Check if voting should be closed (with 1 minute buffer for processing)
        if (now >= votingEndTime) {
          console.log(`⏰ Voting time ended for session: ${session.name}`);
          await closeVotingForSession(client, session);
        }
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
      console.log(`No movies found for session ${session.id}`);
      return;
    }
    
    // Calculate vote totals
    const movieVotes = [];
    for (const movie of movies) {
      const votes = await database.getVotesByMessageId(movie.message_id);
      const upVotes = votes.filter(v => v.vote_type === 'up').length;
      const downVotes = votes.filter(v => v.vote_type === 'down').length;
      const totalScore = upVotes - downVotes;
      
      movieVotes.push({
        movie,
        upVotes,
        downVotes,
        totalScore
      });
    }
    
    // Sort by total score (highest first)
    movieVotes.sort((a, b) => b.totalScore - a.totalScore);
    
    // Check for ties at the top
    const topScore = movieVotes[0].totalScore;
    const winners = movieVotes.filter(mv => mv.totalScore === topScore);
    
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
    
    // Clear voting channel
    if (config && config.movie_channel_id) {
      const votingChannel = await client.channels.fetch(config.movie_channel_id);
      if (votingChannel) {
        // Clear all bot messages
        const messages = await votingChannel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id);
        
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
        
        // Post winner announcement
        const winnerEmbed = new EmbedBuilder()
          .setTitle('🏆 Voting Closed - Winner Selected!')
          .setDescription(`**${winner.movie.title}** has been automatically selected as the winner!`)
          .addFields(
            { name: '📊 Final Results', value: `👍 ${winner.upVotes} votes | 👎 ${winner.downVotes} votes | **Score: ${winner.totalScore}**`, inline: false },
            { name: '📅 Session', value: session.name, inline: true },
            { name: '⏰ Voting Ended', value: new Date().toLocaleString(), inline: true }
          )
          .setColor(0x57f287)
          .setTimestamp();
        
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
          embeds: [winnerEmbed]
        });
      }
    }
    
    // Update Discord event
    if (session.discord_event_id) {
      try {
        const guild = await client.guilds.fetch(session.guild_id);
        const event = await guild.scheduledEvents.fetch(session.discord_event_id);
        if (event) {
          await event.edit({
            name: `🎬 ${session.name} - ${winner.movie.title}`,
            description: `🏆 **WINNER: ${winner.movie.title}**\n\n📊 Final Score: ${winner.totalScore} (${winner.upVotes} 👍 - ${winner.downVotes} 👎)\n\n📅 Join us for movie night!\n\n🔗 SESSION_UID:${session.id}`
          });
        }
      } catch (error) {
        console.warn('Error updating Discord event:', error.message);
      }
    }
    
    // Update session status
    await database.updateVotingSessionStatus(session.id, 'completed');
    
    console.log(`🏆 Automatically selected winner: ${winner.movie.title} for session ${session.name}`);
    
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
        const tieEmbed = new EmbedBuilder()
          .setTitle('🤝 Voting Closed - Tie Detected!')
          .setDescription(`We have a ${winners.length}-way tie! An admin will select the winner.`)
          .addFields(
            { name: '🏆 Tied Movies', value: winners.map(w => `**${w.movie.title}** (Score: ${w.totalScore})`).join('\n'), inline: false },
            { name: '📅 Session', value: session.name, inline: true },
            { name: '⏰ Voting Ended', value: new Date().toLocaleString(), inline: true }
          )
          .setColor(0xfee75c)
          .setTimestamp();
        
        await votingChannel.send({
          content: config.notification_role_id ? `<@&${config.notification_role_id}>` : null,
          embeds: [tieEmbed]
        });
      }
    }
    
    // Post tie-breaking options in admin channel
    if (config && config.admin_channel_id) {
      const adminChannel = await client.channels.fetch(config.admin_channel_id);
      if (adminChannel) {
        // Clear existing movie posts
        const messages = await adminChannel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id);
        
        for (const [messageId, message] of botMessages) {
          try {
            const isControlPanel = message.embeds.length > 0 && 
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
    
    console.log(`🤝 Tie detected for session ${session.name}: ${winners.length} movies tied with score ${winners[0].totalScore}`);
    
  } catch (error) {
    console.error('Error handling tie-breaking:', error);
  }
}

/**
 * Start the voting closure checker (runs every minute)
 */
function startVotingClosureChecker(client) {
  // Check immediately on start
  checkVotingClosures(client);
  
  // Then check every minute
  setInterval(() => {
    checkVotingClosures(client);
  }, 60000); // 60 seconds
  
  console.log('⏰ Voting closure checker started (checks every minute)');
}

module.exports = {
  checkVotingClosures,
  closeVotingForSession,
  startVotingClosureChecker
};
