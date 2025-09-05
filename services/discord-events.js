/**
 * Discord Events Service
 * Handles Discord scheduled event creation and management
 */

const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js');

async function createDiscordEvent(guild, sessionData, scheduledDate) {
  if (!scheduledDate) return null;

  try {
    const event = await guild.scheduledEvents.create({
      name: `🎬 ${sessionData.name}`,
      description: sessionData.description || 'Movie night session - join us for a great movie!',
      scheduledStartTime: scheduledDate,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: {
        location: sessionData.associatedMovieId ? 'Movie Channel - Featured Movie Session' : 'Movie Channel'
      }
    });

    console.log(`✅ Created Discord event: ${event.name} (ID: ${event.id})`);
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
