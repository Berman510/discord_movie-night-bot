/**
 * Discord Events Service
 * Handles Discord scheduled event creation and management
 */

const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js');

async function createDiscordEvent(guild, sessionData, scheduledDate) {
  if (!scheduledDate) return null;

  try {
    // Calculate end time based on movie runtime + 30 minutes buffer
    const endTime = new Date(scheduledDate);
    let durationMinutes = 150; // Default 2.5 hours if no movie runtime available

    if (sessionData.associatedMovieId) {
      try {
        const database = require('../database');
        const movie = await database.getMovieById(sessionData.associatedMovieId);

        if (movie && movie.imdb_id) {
          const imdb = require('./imdb');
          const imdbData = await imdb.getMovieDetails(movie.imdb_id);

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

    // Add session UID to description for bidirectional sync
    const sessionUID = `SESSION_UID:${sessionData.id || 'unknown'}`;
    const baseDescription = sessionData.description || 'Movie night session - join us for a great movie!';
    const enhancedDescription = `${baseDescription}\n\n🔗 ${sessionUID}`;

    const event = await guild.scheduledEvents.create({
      name: `🎬 ${sessionData.name}`,
      description: enhancedDescription,
      scheduledStartTime: scheduledDate,
      scheduledEndTime: endTime,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: {
        location: sessionData.associatedMovieId ? 'Movie Channel - Featured Movie Session' : 'Movie Channel'
      }
    });

    console.log(`✅ Created Discord event: ${event.name} (ID: ${event.id}) - Duration: ${durationMinutes} minutes`);

    // Send notification to configured role
    await notifyRole(guild, event, sessionData);

    return event.id;
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

    await event.edit({
      name: `🎬 ${sessionData.name}`,
      description: sessionData.description || 'Movie night session - join us for a great movie!',
      scheduledStartTime: scheduledDate
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
    console.log(`🗑️ Deleted Discord event: ${eventId}`);
    return true;
  } catch (error) {
    console.warn('Failed to delete Discord event:', error.message);
    return false;
  }
}

async function notifyRole(guild, event, sessionData) {
  try {
    const database = require('../database');
    const notificationRoleId = await database.getNotificationRole(guild.id);

    if (!notificationRoleId) {
      console.log('No notification role configured for guild');
      return;
    }

    // Find a suitable channel to send the notification
    let notificationChannel = null;

    // Try to use the configured movie channel first
    const guildConfig = await database.getGuildConfig(guild.id);
    if (guildConfig && guildConfig.movie_channel_id) {
      notificationChannel = guild.channels.cache.get(guildConfig.movie_channel_id);
    }

    // Fallback to the session channel
    if (!notificationChannel && sessionData.channelId) {
      notificationChannel = guild.channels.cache.get(sessionData.channelId);
    }

    // Fallback to general channel
    if (!notificationChannel) {
      notificationChannel = guild.channels.cache.find(channel =>
        channel.type === 0 && // TEXT channel
        channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
      );
    }

    if (!notificationChannel) {
      console.warn('No suitable channel found for role notification');
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

    await notificationChannel.send({
      content: `<@&${notificationRoleId}> 🍿`,
      embeds: [embed]
    });

    console.log(`✅ Notified role ${notificationRoleId} about event ${event.id}`);

  } catch (error) {
    console.error('Error notifying role about event:', error);
    // Don't fail event creation if notification fails
  }
}

async function syncDiscordEventsWithDatabase(guild) {
  try {
    console.log('🔄 Syncing Discord events with database...');

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
          console.log(`🗑️ Deleting orphaned Discord event: ${event.name} (Session ${sessionId} not found)`);

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
      }
    }

    console.log(`✅ Discord event sync complete: ${syncedCount} synced, ${deletedCount} orphaned events deleted`);
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
