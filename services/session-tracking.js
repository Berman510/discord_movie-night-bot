/**
 * Session Tracking Service
 * Handles real-time participant tracking during movie sessions
 */

const database = require('../database');

// In-memory tracking of active sessions and participants
const activeSessions = new Map(); // sessionId -> { guildId, channelId, startTime, participants: Set }

/**
 * Handle voice state changes to track session participants
 */
async function handleVoiceStateChange(oldState, newState) {
  const guildId = newState.guild.id;
  const userId = newState.member.id;

  // Get guild configuration to find the viewing channel
  const config = await database.getGuildConfig(guildId);
  if (!config || !config.session_viewing_channel_id) {
    // Only log if there are active sessions that would need monitoring
    const activeSessionsList = await getActiveSessionsForGuild(guildId);
    if (activeSessionsList.length > 0) {
      console.log(`⚠️ No viewing channel configured for guild ${guildId} but has ${activeSessionsList.length} active sessions`);
    }
    return; // No viewing channel configured
  }

  const viewingChannelId = config.session_viewing_channel_id;

  // Only process and log if the change involves the configured viewing channel
  const joinedViewingChannel = newState.channelId === viewingChannelId && oldState.channelId !== viewingChannelId;
  const leftViewingChannel = oldState.channelId === viewingChannelId && newState.channelId !== viewingChannelId;

  if (joinedViewingChannel) {
    console.log(`🎤 User ${userId} joined session viewing channel in guild ${guildId}`);
    await handleUserJoinedViewingChannel(guildId, userId, viewingChannelId);
  }

  if (leftViewingChannel) {
    console.log(`🎤 User ${userId} left session viewing channel in guild ${guildId}`);
    await handleUserLeftViewingChannel(guildId, userId, viewingChannelId);
  }
}

/**
 * Handle user joining the viewing channel
 */
async function handleUserJoinedViewingChannel(guildId, userId, channelId) {
  // Find active sessions for this guild
  const activeSessionsList = await getActiveSessionsForGuild(guildId);

  for (const session of activeSessionsList) {
    if (isSessionActive(session)) {
      // Ensure session monitoring is started
      if (!activeSessions.has(session.id)) {
        await startSessionMonitoring(session.id, guildId, channelId);
      }

      // Add user to session participants
      await addSessionAttendee(session.id, userId);
      console.log(`👥 User ${userId} joined viewing channel during session ${session.id}`);
    }
  }
}

/**
 * Handle user leaving the viewing channel
 */
async function handleUserLeftViewingChannel(guildId, userId, channelId) {
  // Find active sessions for this guild
  const activeSessionsList = await getActiveSessionsForGuild(guildId);

  for (const session of activeSessionsList) {
    if (isSessionActive(session)) {
      // Record user leaving (but don't remove from participants - they still attended)
      await recordSessionLeave(session.id, userId);
      console.log(`👋 User ${userId} left viewing channel during session ${session.id}`);
    }
  }
}

/**
 * Check if a session is currently active based on scheduled time
 */
function isSessionActive(session) {
  if (!session.scheduled_date) {
    return false;
  }
  
  const now = new Date();
  const sessionStart = new Date(session.scheduled_date);
  const sessionEnd = new Date(sessionStart.getTime() + (3 * 60 * 60 * 1000)); // 3 hours default
  
  return now >= sessionStart && now <= sessionEnd;
}

/**
 * Get active sessions for a guild
 */
async function getActiveSessionsForGuild(guildId) {
  try {
    const sessions = await database.getAllSessions(guildId);
    return sessions.filter(session => 
      session.scheduled_date && 
      session.discord_event_id && // Only track sessions with Discord events
      isSessionActive(session)
    );
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
}

/**
 * Add user as session attendee
 */
async function addSessionAttendee(sessionId, userId) {
  try {
    await database.addSessionAttendee(sessionId, userId);
  } catch (error) {
    console.error('Error adding session attendee:', error);
  }
}

/**
 * Record when user leaves session
 */
async function recordSessionLeave(sessionId, userId) {
  try {
    await database.recordSessionLeave(sessionId, userId);
  } catch (error) {
    console.error('Error recording session leave:', error);
  }
}

/**
 * Start monitoring a session (called when session begins)
 */
async function startSessionMonitoring(sessionId, guildId, viewingChannelId) {
  const session = {
    guildId,
    channelId: viewingChannelId,
    startTime: new Date(),
    participants: new Set()
  };

  activeSessions.set(sessionId, session);
  console.log(`🎬 Started monitoring session ${sessionId} in channel ${viewingChannelId}`);

  // Check for users already in the viewing channel
  await checkExistingUsersInChannel(sessionId, guildId, viewingChannelId);
}

/**
 * Check for users already in the viewing channel when session starts
 */
async function checkExistingUsersInChannel(sessionId, guildId, viewingChannelId) {
  try {
    // Get the client from the voice state change context
    // This will be called from voice state handlers which have access to the client
    const client = global.discordClient;

    if (!client) {
      console.warn('Client not available for checking existing users');
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`Guild ${guildId} not found`);
      return;
    }

    const channel = guild.channels.cache.get(viewingChannelId);
    if (!channel || !channel.isVoiceBased()) {
      console.warn(`Voice channel ${viewingChannelId} not found`);
      return;
    }

    // Add all users currently in the channel
    for (const [userId, member] of channel.members) {
      await addSessionAttendee(sessionId, userId);
      console.log(`👥 User ${userId} was already in viewing channel when session ${sessionId} started`);
    }

  } catch (error) {
    console.error('Error checking existing users in channel:', error);
  }
}

/**
 * Stop monitoring a session (called when session ends)
 */
async function stopSessionMonitoring(sessionId) {
  if (activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    console.log(`🎬 Stopped monitoring session ${sessionId}, tracked ${session.participants.size} participants`);
    activeSessions.delete(sessionId);
  }
}

/**
 * Get session attendance report
 */
async function getSessionAttendanceReport(sessionId) {
  try {
    const attendees = await database.getSessionAttendees(sessionId);
    const registeredParticipants = await database.getSessionParticipants(sessionId);
    
    return {
      sessionId,
      registeredCount: registeredParticipants.length,
      actualAttendees: attendees.length,
      registeredParticipants,
      actualAttendees: attendees,
      attendanceRate: registeredParticipants.length > 0 
        ? (attendees.length / registeredParticipants.length * 100).toFixed(1)
        : '0'
    };
  } catch (error) {
    console.error('Error getting attendance report:', error);
    return null;
  }
}

/**
 * Periodic check for sessions that should be active
 */
async function checkForActiveSessionsToMonitor() {
  try {
    const database = require('../database');
    const client = global.discordClient;

    if (!client) return;

    // Check all guilds
    for (const [guildId, guild] of client.guilds.cache) {
      const config = await database.getGuildConfig(guildId);
      if (!config || !config.session_viewing_channel_id) continue;

      const activeSessionsList = await getActiveSessionsForGuild(guildId);

      if (activeSessionsList.length > 0) {
        console.log(`🔍 Found ${activeSessionsList.length} active sessions for guild ${guildId}`);
      }

      for (const session of activeSessionsList) {
        console.log(`🎬 Processing session ${session.id} (status: ${session.status})`);

        // Update session status to 'active' if it's still 'planning'
        if (session.status === 'planning') {
          await database.updateSessionStatus(session.id, 'active');
          console.log(`🎬 Updated session ${session.id} status from 'planning' to 'active'`);
        }

        // Start monitoring if not already monitoring
        if (!activeSessions.has(session.id)) {
          console.log(`🎬 Starting monitoring for session ${session.id}`);
          await startSessionMonitoring(session.id, guildId, config.session_viewing_channel_id);
        } else {
          console.log(`🎬 Session ${session.id} already being monitored`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for active sessions:', error);
  }
}

// Start periodic checking every minute
setInterval(checkForActiveSessionsToMonitor, 60000);

module.exports = {
  handleVoiceStateChange,
  startSessionMonitoring,
  stopSessionMonitoring,
  getSessionAttendanceReport,
  isSessionActive,
  getActiveSessionsForGuild
};
