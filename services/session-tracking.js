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

  console.log(`🎤 Voice state change: User ${userId} in guild ${guildId}`);

  // Get guild configuration to find the viewing channel
  const config = await database.getGuildConfig(guildId);
  if (!config || !config.session_viewing_channel_id) {
    console.log(`⚠️ No viewing channel configured for guild ${guildId}`);
    return; // No viewing channel configured
  }
  
  const viewingChannelId = config.session_viewing_channel_id;
  
  // Check if user joined the viewing channel
  if (newState.channelId === viewingChannelId && oldState.channelId !== viewingChannelId) {
    await handleUserJoinedViewingChannel(guildId, userId, viewingChannelId);
  }
  
  // Check if user left the viewing channel
  if (oldState.channelId === viewingChannelId && newState.channelId !== viewingChannelId) {
    await handleUserLeftViewingChannel(guildId, userId, viewingChannelId);
  }
}

/**
 * Handle user joining the viewing channel
 */
async function handleUserJoinedViewingChannel(guildId, userId, channelId) {
  // Find active sessions for this guild
  const activeSessions = await getActiveSessionsForGuild(guildId);
  
  for (const session of activeSessions) {
    if (isSessionActive(session)) {
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
  const activeSessions = await getActiveSessionsForGuild(guildId);
  
  for (const session of activeSessions) {
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

module.exports = {
  handleVoiceStateChange,
  startSessionMonitoring,
  stopSessionMonitoring,
  getSessionAttendanceReport,
  isSessionActive,
  getActiveSessionsForGuild
};
