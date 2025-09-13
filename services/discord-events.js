/**
 * Discord Events Service
 * Handles Discord scheduled event creation and management
 */

const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js');

async function createDiscordEvent(guild, sessionData, scheduledDate) {
  if (!scheduledDate) return null;

  try {
    // Get guild config for session viewing channel
    const database = require('../database');
    const config = await database.getGuildConfig(guild.id);
    // Calculate end time based on movie runtime + 30 minutes buffer
    const endTime = new Date(scheduledDate);
    let durationMinutes = 150; // Default 2.5 hours if no movie runtime available

    if (sessionData.associatedMovieId) {
      try {
        const database = require('../database');
        const movie = await database.getMovieById(sessionData.associatedMovieId, sessionData.guildId);

        if (movie && movie.imdb_id) {
          const imdb = require('./imdb');
          const imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);

          if (imdbData && imdbData.Runtime && imdbData.Runtime !== 'N/A') {
            // Parse runtime (e.g., "97 min" -> 97)
            const runtimeMatch = imdbData.Runtime.match(/(\d+)/);
            if (runtimeMatch) {
              const movieRuntime = parseInt(runtimeMatch[1]);
              durationMinutes = movieRuntime + 30; // Movie runtime + 30 minutes buffer
              console.log(`📽️ Using movie runtime: ${movieRuntime} min + 30 min buffer = ${durationMinutes} min total`);
            }
          }
        }
      } catch (error) {
        console.warn('Could not get movie runtime for event duration:', error.message);
      }
    }

    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    // Create enhanced description with voting info and channel link
    const baseDescription = sessionData.description || "It’s Movie Night! Cast your vote and join us for the screening.";
    let enhancedDescription = baseDescription;

    // Add voting information if available
    if (sessionData.votingEndTime) {
      const votingEndTimestamp = Math.floor(sessionData.votingEndTime.getTime() / 1000);
      enhancedDescription += `\n\n🗳️ **Voting ends:** <t:${votingEndTimestamp}:F> • <t:${votingEndTimestamp}:R>`;
    }

    // Add the session start using Discord timestamps (shows local time per user)
    if (scheduledDate) {
      const startTs = Math.floor(new Date(scheduledDate).getTime() / 1000);
      enhancedDescription += `\n🎬 **Session starts:** <t:${startTs}:F> • <t:${startTs}:R>`;
    }

    // Add voting channel link and CTA if available
    if (config && config.movie_channel_id) {
      enhancedDescription += `\n📺 **Vote in:** <#${config.movie_channel_id}>`;
      enhancedDescription += `\n\n👉 Join the conversation and vote for your favorite movie in <#${config.movie_channel_id}>!`;
    }

    // Add movie poster if available (for sessions with associated movies)
    if (sessionData.associatedMovieId) {
      try {
        const database = require('../database');
        const movie = await database.getMovieByMessageId(sessionData.associatedMovieId);
        const poster = movie?.poster_url || movie?.imdb_poster; // prefer new column, fallback if legacy
        if (movie && poster) {
          enhancedDescription += `\n\n🎬 **Featured Movie:** ${movie.title}`;
          enhancedDescription += `\n🖼️ **Poster:** ${poster}`;
        }
      } catch (error) {
        console.warn('Could not add movie poster to event description:', error.message);
      }
    }

    // Note: We no longer include a SESSION_UID in the description because we track event IDs in the database

    // Determine event type and location
    let eventConfig = {
      name: `🎬 ${sessionData.name}`,
      description: enhancedDescription,
      scheduledStartTime: scheduledDate,
      scheduledEndTime: endTime,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly
    };

    // Use Watch Party Channel if configured, otherwise external event
    if (config && config.watch_party_channel_id) {
      try {
        // Fetch the channel to verify it exists and get its type
        const channel = await guild.channels.fetch(config.watch_party_channel_id);
        if (channel) {
          const logger = require('../utils/logger');
          logger.debug(`📍 Found Watch Party Channel: ${channel.name} (${channel.type})`);

          // Use appropriate event type based on channel type
          if (channel.type === 2) { // Voice channel
            eventConfig.entityType = GuildScheduledEventEntityType.Voice;
            eventConfig.channel = config.watch_party_channel_id;
            logger.debug(`📍 Setting voice event in channel: #${channel.name}`);
          } else if (channel.type === 13) { // Stage channel
            eventConfig.entityType = GuildScheduledEventEntityType.StageInstance;
            eventConfig.channel = config.watch_party_channel_id;
            console.log(`📍 Setting stage event in channel: #${channel.name}`);
          } else {
            // For text channels or other types, use external event with channel mention
            eventConfig.entityType = GuildScheduledEventEntityType.External;
            eventConfig.entityMetadata = {
              location: `#${channel.name} - Movie Night Session`
            };
            console.log(`📍 Setting external event with location: #${channel.name}`);
          }
        } else {
          throw new Error('Channel not found');
        }
      } catch (error) {
        console.warn(`📍 Error fetching Watch Party Channel ${config.watch_party_channel_id}:`, error.message);
        // Fallback to external event
        eventConfig.entityType = GuildScheduledEventEntityType.External;
        eventConfig.entityMetadata = {
          location: 'Movie Night Session - Check voting channel for details'
        };
        console.log(`📍 Using external event fallback`);
      }
    } else {
      eventConfig.entityType = GuildScheduledEventEntityType.External;
      eventConfig.entityMetadata = {
        location: 'Movie Night Session - Check voting channel for details'
      };
      console.log(`📍 Using external event (no Watch Party Channel configured)`);
    }

    const event = await guild.scheduledEvents.create(eventConfig);

    const logger = require('../utils/logger');
    logger.info(`✅ Created Discord event: ${event.name} (ID: ${event.id}) - Duration: ${durationMinutes} minutes`);

    // Send notification to configured role
    await notifyRole(guild, event, sessionData);

    return event; // Return the full event object, not just the ID
  } catch (error) {
    console.warn('Failed to create Discord event:', error.message);
    return null;
  }
}

async function updateDiscordEvent(guild, eventId, sessionData, scheduledDate) {
  if (!eventId) return false;

  try {
    const event = await guild.scheduledEvents.fetch(eventId);
    if (!event) return false;

    // Rebuild description similar to creation for consistency
    const database = require('../database');
    const config = await database.getGuildConfig(guild.id);

    const baseDescription = sessionData.description || 'Join us for movie night voting and viewing!';
    let enhancedDescription = baseDescription;

    // Enrich with IMDb details when available
    try {
      if (sessionData.associatedMovieId) {
        const movie = await database.getMovieById(sessionData.associatedMovieId, sessionData.guildId);
        if (movie && movie.imdb_id) {
          const imdb = require('./imdb');
          const imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);
          if (imdbData) {
            const parts = [];
            if (imdbData.Year && imdbData.Year !== 'N/A') parts.push(`📅 Year: ${imdbData.Year}`);
            if (imdbData.Runtime && imdbData.Runtime !== 'N/A') parts.push(`⏱️ Runtime: ${imdbData.Runtime}`);
            if (imdbData.Genre && imdbData.Genre !== 'N/A') parts.push(`🎬 Genre: ${imdbData.Genre}`);
            if (imdbData.imdbRating && imdbData.imdbRating !== 'N/A') parts.push(`⭐ IMDb: ${imdbData.imdbRating}/10`);
            if (parts.length) enhancedDescription += `\n\n${parts.join(' \n')}`;
            if (imdbData.Plot && imdbData.Plot !== 'N/A') enhancedDescription += `\n\n📖 ${imdbData.Plot}`;
          }
        }
      }
    } catch (_) { /* optional enrichment */ }

    if (sessionData.votingEndTime) {
      const votingEndTimestamp = Math.floor(sessionData.votingEndTime.getTime() / 1000);
      enhancedDescription += `\n\n🗳️ **Voting ends:** <t:${votingEndTimestamp}:F>`;
      enhancedDescription += `\n⏰ **Time remaining:** <t:${votingEndTimestamp}:R>`;
    }

    if (config && config.movie_channel_id) {
      enhancedDescription += `\n📺 **Vote in:** <#${config.movie_channel_id}>`;
      enhancedDescription += `\n\n👉 Join the conversation and vote for your favorite movie in <#${config.movie_channel_id}>!`;
    }

    const effectiveStart = scheduledDate || event.scheduledStartAt || (event.scheduledStartTimestamp ? new Date(event.scheduledStartTimestamp) : null);

    // Ensure end time is after start time to avoid API error. Use default 150 minutes when runtime unknown.
    let durationMinutes = 150;
    try {
      if (!sessionData.associatedMovieId && event.description) {
        // Best-effort parse from existing event description (e.g., "Runtime: 97 min")
        const m = event.description.match(/Runtime:\s*(\d+)\s*min/i);
        if (m) durationMinutes = parseInt(m[1], 10) + 30; // keep 30 min buffer
      }
    } catch (_) { /* keep default */ }
    const newEnd = effectiveStart ? new Date(new Date(effectiveStart).getTime() + durationMinutes * 60000) : event.scheduledEndAt;

    if (effectiveStart) {
      const startTs = Math.floor(new Date(effectiveStart).getTime() / 1000);
      enhancedDescription += `\n🎬 **Session starts:** <t:${startTs}:F> • <t:${startTs}:R>`;
    }
    const startTimeStr2 = effectiveStart ? new Date(effectiveStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'TBD';
    await event.edit({
      name: `🎬 ${sessionData.name}`,
      description: enhancedDescription,
      scheduledStartTime: effectiveStart || event.scheduledStartAt,
      scheduledEndTime: newEnd
    });

    console.log(`✅ Updated Discord event: ${event.name} (ID: ${event.id})`);
    return true;
  } catch (error) {
    console.warn('Failed to update Discord event:', error.message);
    return false;
  }
}

async function deleteDiscordEvent(guild, eventId) {
  if (!eventId) return false;

  try {
    const event = await guild.scheduledEvents.fetch(eventId);
    if (!event) return false;

    await event.delete();
    const logger = require('../utils/logger');
    logger.info(`🗑️ Deleted Discord event: ${event.name} (${eventId})`);
    return true;
  } catch (error) {
    console.warn('Failed to delete Discord event:', error.message);
    return false;
  }
}

async function notifyRole(guild, event, sessionData) {
  try {
    const database = require('../database');
    // Determine which roles to notify: use configured Voting Roles
    const guildConfig = await database.getGuildConfig(guild.id);
    const votingRoles = Array.isArray(guildConfig?.voting_roles) ? guildConfig.voting_roles : [];
    const notifyRoleIds = [...new Set(votingRoles.filter(Boolean))];

    if (notifyRoleIds.length === 0) {
      console.log('No Voting Roles configured for guild announcements');
      return;
    }

    // Find a suitable channel to send the notification
    let notificationChannel = null;

    // Try to use the configured movie channel first (if it's a text channel)
    // guildConfig fetched earlier
    if (guildConfig && guildConfig.movie_channel_id) {
      const movieChannel = guild.channels.cache.get(guildConfig.movie_channel_id);
      if (movieChannel && movieChannel.type === 0 && movieChannel.send) {
        notificationChannel = movieChannel;
      }
    // If the configured movie channel is a forum, skip sending the notification message entirely
    try {
      const forumChannels = require('./forum-channels');
      const movieChannelForCheck = guildConfig && guildConfig.movie_channel_id ? guild.channels.cache.get(guildConfig.movie_channel_id) : null;
      if (movieChannelForCheck && forumChannels.isForumChannel(movieChannelForCheck)) {
        const logger = require('../utils/logger');
        logger.debug('📢 Skipping event notification message in forum mode');
        return;
      }
    } catch (_) {/* no-op */}

    }

    // If movie channel is forum or not suitable, try admin channel
    if (!notificationChannel && guildConfig && guildConfig.admin_channel_id) {
      const adminChannel = guild.channels.cache.get(guildConfig.admin_channel_id);
      if (adminChannel && adminChannel.type === 0 && adminChannel.send) {
        notificationChannel = adminChannel;
        const logger = require('../utils/logger');
        logger.debug(`📢 Using admin channel for event notification: ${adminChannel.name}`);
      }
    }

    // Fallback to the session channel
    if (!notificationChannel && sessionData.channelId) {
      const sessionChannel = guild.channels.cache.get(sessionData.channelId);
      if (sessionChannel && sessionChannel.type === 0 && sessionChannel.send) {
        notificationChannel = sessionChannel;
      }
    }

    // Last resort: find any suitable text channel (avoid general if possible)
    if (!notificationChannel) {
      notificationChannel = guild.channels.cache.find(channel =>
        channel.type === 0 && // TEXT channel only
        channel.send && // Has send method
        channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel']) &&
        !channel.name.toLowerCase().includes('general') // Avoid general channel
      );

      // If no non-general channel found, use general as last resort
      if (!notificationChannel) {
        notificationChannel = guild.channels.cache.find(channel =>
          channel.type === 0 && // TEXT channel only
          channel.send && // Has send method
          channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
        );
      }
    }

    if (!notificationChannel || !notificationChannel.send) {
      console.warn('No suitable text channel found for role notification');
      return;
    }

    // Create notification message
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('🎬 New Movie Night Event!')
      .setDescription(`A new movie night session has been scheduled!`)
      .setColor(0x5865f2)
      .addFields(
        { name: '📝 Session', value: sessionData.name, inline: false },
        { name: '🎪 Event', value: `[${event.name}](${event.url})`, inline: false }
      )
      .setTimestamp();

    if (sessionData.scheduledDate) {
      embed.addFields({
        name: '📅 When',
        value: `<t:${Math.floor(sessionData.scheduledDate.getTime() / 1000)}:F>`,
        inline: false
      });
    }

    const mentions = notifyRoleIds.map(id => `<@&${id}>`).join(' ');
    await notificationChannel.send({
      content: `${mentions} 🍿`,
      embeds: [embed]
    });

    const logger = require('../utils/logger');
    logger.debug(`✅ Notified roles [${notifyRoleIds.join(', ')}] about event ${event.id}`);

    // ALWAYS restore admin panel after ANY notification to admin channel
    if (notificationChannel.id === guildConfig?.admin_channel_id) {
      // Schedule admin panel restoration after a delay
      setTimeout(async () => {
        try {
          const adminControls = require('./admin-controls');
          await adminControls.ensureAdminControlPanel(guild.client, guild.id);
          logger.debug('🔧 Restored admin control panel after event notification');
        } catch (error) {
          logger.warn('Error restoring admin control panel after notification:', error.message);
        }
      }, 2000); // 2 second delay to ensure notification is fully sent
    }

  } catch (error) {
    console.error('Error notifying role about event:', error);
    // Don't fail event creation if notification fails
  }
}

async function syncDiscordEventsWithDatabase(guild) {
  try {
    const logger = require('../utils/logger');
    logger.debug('🔄 Syncing Discord events with database...');

    const database = require('../database');

    // Get all Discord events for this guild
    const discordEvents = await guild.scheduledEvents.fetch();

    // Get all sessions from database
    const sessions = await database.getAllSessions(guild.id);
    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    let syncedCount = 0;
    let deletedCount = 0;

    for (const [eventId, event] of discordEvents) {
      // Check if this event has a session UID
      const sessionUIDMatch = event.description?.match(/SESSION_UID:(\d+)/);

      if (sessionUIDMatch) {
        const sessionId = parseInt(sessionUIDMatch[1]);
        const session = sessionMap.get(sessionId);

        if (!session) {
          // Session was deleted from database but Discord event still exists
          logger.info(`🗑️ Deleting orphaned Discord event: ${event.name} (Session ${sessionId} not found)`);

          try {
            await event.delete();
            deletedCount++;

            // If this was associated with a movie, reset movie status to planned
            const movie = await database.getMovieBySessionId(sessionId);
            if (movie) {
              await database.updateMovieStatus(movie.message_id, 'planned');
              console.log(`🔄 Reset movie "${movie.title}" to planned status`);
            }
          } catch (error) {
            console.warn(`Failed to delete orphaned event ${eventId}:`, error.message);
          }
        } else {
          // Session exists, ensure database has correct event ID
          if (session.discord_event_id !== eventId) {
            await database.updateSessionEventId(sessionId, eventId);
            syncedCount++;
            console.log(`🔗 Synced session ${sessionId} with Discord event ${eventId}`);
          }
        }
      } else if (event.description && event.description.includes('SESSION_UID:unknown')) {
        // Fix events with SESSION_UID:unknown
        console.log(`🔧 Found event with SESSION_UID:unknown: ${event.name}`);

        // Try to find the session by event ID in database
        const sessionWithEvent = sessions.find(s => s.discord_event_id === eventId);
        if (sessionWithEvent) {
          const fixedDescription = event.description.replace('SESSION_UID:unknown', `SESSION_UID:${sessionWithEvent.id}`);

          try {
            await event.edit({
              description: fixedDescription
            });
            console.log(`✅ Fixed SESSION_UID for event ${event.name} -> SESSION_UID:${sessionWithEvent.id}`);
            syncedCount++;
          } catch (editError) {
            console.warn(`Failed to fix SESSION_UID for event ${eventId}:`, editError.message);
          }
        }
      }
    }

    logger.info(`✅ Discord event sync complete: ${syncedCount} synced, ${deletedCount} orphaned events deleted`);
    return { syncedCount, deletedCount };

  } catch (error) {
    console.error('Error syncing Discord events with database:', error);
    return { syncedCount: 0, deletedCount: 0 };
  }
}

module.exports = {
  createDiscordEvent,
  updateDiscordEvent,
  deleteDiscordEvent,
  syncDiscordEventsWithDatabase
};
