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

    const event = await guild.scheduledEvents.create({
      name: `🎬 ${sessionData.name}`,
      description: sessionData.description || 'Movie night session - join us for a great movie!',
      scheduledStartTime: scheduledDate,
      scheduledEndTime: endTime,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: {
        location: sessionData.associatedMovieId ? 'Movie Channel - Featured Movie Session' : 'Movie Channel'
      }
    });

    console.log(`✅ Created Discord event: ${event.name} (ID: ${event.id}) - Duration: ${durationMinutes} minutes`);
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

module.exports = {
  createDiscordEvent,
  updateDiscordEvent,
  deleteDiscordEvent
};
