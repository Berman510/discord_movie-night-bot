/**
 * Session Scheduler Service
 * Smart scheduling system for voting session end detection
 * Uses hybrid approach: setTimeout for near-term, daily checks for long-term
 * No external dependencies - uses native JavaScript timing
 */

class SessionScheduler {
  constructor() {
    this.activeTimeouts = new Map(); // sessionId -> timeoutId
    this.dailyCheckInterval = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the scheduler
   */
  async initialize(client) {
    if (this.isInitialized) return;

    this.client = client;

    // Schedule daily check using setInterval
    this.scheduleDailyCheck();

    // Check for any sessions that should have ended while bot was offline
    await this.recoverMissedSessions();

    // Schedule all active sessions
    await this.scheduleAllActiveSessions();

    this.isInitialized = true;
    const logger = require('../utils/logger');
    logger.info('✅ Session scheduler initialized');
  }

  /**
   * Schedule daily checks using native setInterval
   */
  scheduleDailyCheck() {
    // Clear existing interval if any
    if (this.dailyCheckInterval) {
      clearInterval(this.dailyCheckInterval);
    }

    // Calculate milliseconds until next midnight UTC
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0); // Next midnight UTC

    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    // Set initial timeout to align with midnight
    setTimeout(() => {
      // Run the first check
      this.checkSessionsEndingToday();

      // Then run every 24 hours
      this.dailyCheckInterval = setInterval(() => {
        console.log('🕐 Running daily session check...');
        this.checkSessionsEndingToday();
      }, 24 * 60 * 60 * 1000); // 24 hours

    }, msUntilMidnight);

    const hoursUntilMidnight = Math.round(msUntilMidnight / (1000 * 60 * 60));
    const logger = require('../utils/logger');
    logger.info(`⏰ Daily session check scheduled - first check in ${hoursUntilMidnight} hours`);
  }

  /**
   * Schedule voting end for a session
   */
  async scheduleVotingEnd(sessionId, votingEndTime) {
    try {
      // Clear any existing timeout for this session
      this.clearSessionTimeout(sessionId);
      
      const now = new Date();
      const msUntilEnd = votingEndTime.getTime() - now.getTime();
      
      if (msUntilEnd <= 0) {
        // Voting should have already ended
        console.log(`⏰ Session ${sessionId} voting time already passed, closing now`);
        await this.closeVotingForSession(sessionId);
        return;
      }
      
      if (msUntilEnd <= 24 * 60 * 60 * 1000) { // Within 24 hours
        // Use setTimeout for precise timing
        const timeoutId = setTimeout(async () => {
          console.log(`⏰ Scheduled voting closure triggered for session ${sessionId}`);
          await this.closeVotingForSession(sessionId);
          this.activeTimeouts.delete(sessionId);
        }, msUntilEnd);
        
        this.activeTimeouts.set(sessionId, timeoutId);
        
        const hoursUntilEnd = Math.round(msUntilEnd / (1000 * 60 * 60));
        console.log(`⏰ Scheduled voting end for session ${sessionId} in ${hoursUntilEnd} hours`);
      } else {
        // More than 24 hours away - will be picked up by daily check
        const daysUntilEnd = Math.round(msUntilEnd / (1000 * 60 * 60 * 24));
        console.log(`⏰ Session ${sessionId} voting ends in ${daysUntilEnd} days - will be checked daily`);
      }
    } catch (error) {
      console.error(`Error scheduling voting end for session ${sessionId}:`, error);
    }
  }

  /**
   * Clear timeout for a session (when rescheduled or cancelled)
   */
  clearSessionTimeout(sessionId) {
    const timeoutId = this.activeTimeouts.get(sessionId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(sessionId);
      console.log(`⏰ Cleared scheduled timeout for session ${sessionId}`);
    }
  }

  /**
   * Check for sessions ending today (daily cron job)
   */
  async checkSessionsEndingToday() {
    try {
      const database = require('../database');
      const activeSessions = await database.getAllActiveVotingSessions();
      
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      for (const session of activeSessions) {
        if (session.voting_end_time) {
          const votingEndTime = new Date(session.voting_end_time);
          
          // Check if voting ends today
          if (votingEndTime <= endOfDay && votingEndTime > now) {
            console.log(`⏰ Found session ending today: ${session.name}`);
            await this.scheduleVotingEnd(session.id, votingEndTime);
          }
        }
      }
    } catch (error) {
      console.error('Error in daily session check:', error);
    }
  }

  /**
   * Recover sessions that should have ended while bot was offline
   */
  async recoverMissedSessions() {
    try {
      const database = require('../database');
      const activeSessions = await database.getAllActiveVotingSessions();
      
      const now = new Date();
      
      for (const session of activeSessions) {
        if (session.voting_end_time) {
          const votingEndTime = new Date(session.voting_end_time);
          
          if (votingEndTime <= now) {
            console.log(`⏰ Recovering missed session: ${session.name} (should have ended ${votingEndTime})`);
            await this.closeVotingForSession(session.id);
          }
        }
      }
    } catch (error) {
      console.error('Error recovering missed sessions:', error);
    }
  }

  /**
   * Schedule all currently active sessions
   */
  async scheduleAllActiveSessions() {
    try {
      const database = require('../database');
      const activeSessions = await database.getAllActiveVotingSessions();
      
      for (const session of activeSessions) {
        if (session.voting_end_time) {
          const votingEndTime = new Date(session.voting_end_time);
          await this.scheduleVotingEnd(session.id, votingEndTime);
        }
      }
      
      const logger = require('../utils/logger');
      logger.info(`⏰ Scheduled ${activeSessions.length} active sessions`);
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Error scheduling active sessions:', error);
    }
  }

  /**
   * Close voting for a session (delegates to existing voting-closure service)
   */
  async closeVotingForSession(sessionId) {
    try {
      const database = require('../database');
      const session = await database.getVotingSessionById(sessionId);
      
      if (!session) {
        console.warn(`Session ${sessionId} not found for voting closure`);
        return;
      }
      
      const votingClosure = require('./voting-closure');
      await votingClosure.closeVotingForSession(this.client, session);
    } catch (error) {
      console.error(`Error closing voting for session ${sessionId}:`, error);
    }
  }

  /**
   * Reschedule a session (clear old timeout, set new one)
   */
  async rescheduleSession(sessionId, newVotingEndTime) {
    console.log(`⏰ Rescheduling session ${sessionId} to end at ${newVotingEndTime}`);
    await this.scheduleVotingEnd(sessionId, newVotingEndTime);
  }
}

// Export singleton instance
const sessionScheduler = new SessionScheduler();
module.exports = sessionScheduler;
