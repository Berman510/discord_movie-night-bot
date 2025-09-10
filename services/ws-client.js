/*
 * WebSocket client: bot connects out to the dashboard WS server
 * Controlled by MOVIENIGHT_WS_ENABLED, MOVIENIGHT_WS_URL, MOVIENIGHT_WS_TOKEN
 */

const pkg = require('../package.json');

function ensureWsInstalledIfNeeded() {
  if (String(process.env.MOVIENIGHT_WS_ENABLED).toLowerCase() !== 'true') return null;
  try {
    return require('ws');
  } catch (_) {
    // Attempt auto-install similar to main index.js behavior
    const cp = require('child_process');
    try {
      console.log('[ws] Installing ws dependency (npm ci --omit=dev)...');
      cp.execSync('npm ci --omit=dev', { stdio: 'inherit' });
    } catch (e) {
      console.warn('[ws] npm ci failed, trying npm install --only=prod...');
      try { cp.execSync('npm install --only=prod', { stdio: 'inherit' }); } catch (e2) {
        console.warn('[ws] Failed to auto-install ws. WebSocket client will be disabled.');
        return null;
      }
    }
    try {
      return require('ws');
    } catch (e3) {
      console.warn('[ws] ws still not available after install. Skipping WebSocket.');
      return null;
    }
  }
}

function initWebSocketClient(logger) {
  if (String(process.env.MOVIENIGHT_WS_ENABLED).toLowerCase() !== 'true') {
    logger?.debug?.('WS client disabled (MOVIENIGHT_WS_ENABLED != true)');
    return { enabled: false };
  }

  const WS_URL = process.env.MOVIENIGHT_WS_URL;
  const TOKEN = process.env.MOVIENIGHT_WS_TOKEN;
  if (!WS_URL || !TOKEN) {
    logger?.warn?.('WS client enabled but MOVIENIGHT_WS_URL or MOVIENIGHT_WS_TOKEN missing');
    return { enabled: false };
  }

  const WS = ensureWsInstalledIfNeeded();
  if (!WS) return { enabled: false };

  let ws = null;
  let heartbeat = null;
  let reconnectTimer = null;
  const HEARTBEAT_MS = 30000;
  const RECONNECT_MS = 5000;

  function connect() {
    try {
      logger?.info?.(`WS: connecting to ${WS_URL} ...`);
      ws = new WS(WS_URL, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      ws.on('open', () => {
        logger?.info?.('WS: connected');
        // hello payload
        const payload = {
          type: 'hello',
          payload: {
            botVersion: pkg.version,
            env: process.env.NODE_ENV || 'development'
          }
        };
        try { ws.send(JSON.stringify(payload)); } catch (_) {}
        // heartbeat
        heartbeat = setInterval(() => {
          try { ws.ping(); } catch (_) {}
        }, HEARTBEAT_MS);
      });

      ws.on('pong', () => {
        // noop; server tracks liveness
      });

      ws.on('message', async (data) => {
        let msg;
        try { msg = JSON.parse(data); } catch (_) { return; }
        // ack responses or control messages can be handled here later
        if (msg.type === 'pong') return;
        if (msg.type === 'ack') return;

        try {
          if (msg.type === 'sync_guild') {
            const guildId = msg?.payload?.guildId;
            if (!guildId) return;
            const client = global.discordClient;
            if (!client) return;
            const database = require('../database');
            const adminControls = require('./admin-controls');
            const forumChannels = require('./forum-channels');
            const { ensureQuickActionAtBottom, recreateMissingMoviePosts } = require('./cleanup');
            try {
              const config = await database.getGuildConfig(guildId);
              try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (_) {}
              if (config && config.movie_channel_id) {
                const votingChannel = await client.channels.fetch(config.movie_channel_id).catch(() => null);
                if (votingChannel) {
                  if (forumChannels.isForumChannel(votingChannel)) {
                    try { await adminControls.populateForumChannel(client, guildId); } catch (_) {}
                  } else {
                    try { await recreateMissingMoviePosts(votingChannel, guildId); } catch (_) {}
                    try { await ensureQuickActionAtBottom(votingChannel); } catch (_) {}
                  }
                }
              }
            } catch (e) {
              logger?.warn?.('WS sync_guild error:', e?.message || e);
            }
            return;
          }

          if (msg.type === 'refresh_admin_panel') {
            const guildId = msg?.payload?.guildId;
            if (!guildId) return;
            const client = global.discordClient;
            if (!client) return;
            const adminControls = require('./admin-controls');
            try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (e) {
              logger?.warn?.('WS refresh_admin_panel error:', e?.message || e);
            }
            return;
          }

          if (msg.type === 'ban_movie') {
            const guildId = msg?.payload?.guildId;
            const title = msg?.payload?.title;
            if (!guildId || !title) return;
            const database = require('../database');
            await database.banMovie(guildId, title);
            return;
          }
          if (msg.type === 'unban_movie') {
            const guildId = msg?.payload?.guildId;
            const title = msg?.payload?.title;
            if (!guildId || !title) return;
            const database = require('../database');
            await database.unbanMovie(guildId, title);
            return;
          }
          if (msg.type === 'movie_status_changed') {
            const guildId = msg?.payload?.guildId;
            const messageId = msg?.payload?.messageId;
            if (!guildId || !messageId) return;

            const client = global.discordClient;
            if (!client) return;

            const database = require('../database');
            const forumChannels = require('./forum-channels');
            const { embeds, components } = require('../utils');

            const movie = await database.getMovieByMessageId(messageId, guildId);
            if (!movie) return;

            try {
              if (movie.channel_type === 'forum' && movie.thread_id) {
                const thread = await client.channels.fetch(movie.thread_id).catch(() => null);
                if (thread) {
                  await forumChannels.updateForumPostContent(thread, movie, movie.status);
                  await forumChannels.updateForumPostTags(thread, movie.status);
                  if (['watched', 'skipped', 'banned'].includes(movie.status)) {
                    await forumChannels.archiveForumPost(thread, 'Movie completed');
                  }
                }
              } else if (movie.channel_id) {
                const channel = await client.channels.fetch(movie.channel_id).catch(() => null);
                if (channel && channel.messages) {
                  const msgObj = await channel.messages.fetch(movie.message_id).catch(() => null);
                  if (msgObj) {
                    const voteCounts = await database.getVoteCounts(movie.message_id);
                    let imdbData = null;
                    try {
                      if (movie.imdb_data) {
                        let parsed = typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                        imdbData = parsed;
                      }
                    } catch (_) {}
                    const movieEmbed = embeds.createMovieEmbed(movie, imdbData, voteCounts);
                    const rows = ['watched', 'skipped', 'banned'].includes(movie.status)
                      ? []
                      : components.createStatusButtons(movie.message_id, movie.status, voteCounts.up, voteCounts.down);
                    await msgObj.edit({ embeds: [movieEmbed], components: rows });
                  }
                }
              }
            } catch (e) {
              logger?.warn?.('WS movie_status_changed update error:', e?.message || e);
            }
            return;
          }
          if (msg.type === 'cancel_session') {
            const guildId = msg?.payload?.guildId;
            let sessionId = msg?.payload?.sessionId || null;
            if (!guildId) return;

            const client = global.discordClient;
            if (!client) return;

            const database = require('../database');
            const forumChannels = require('./forum-channels');
            const { embeds, components } = require('../utils');

            try {
              // Determine target session
              let session = null;
              if (sessionId) {
                session = await database.getSessionById(sessionId);
              } else {
                const sessions = await database.getMovieSessions(guildId, null, 1);
                session = Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null;
                sessionId = session?.id || null;
              }
              if (!sessionId || !session) return;

              // Find associated movie if any
              const movie = await database.getMovieBySessionId(sessionId).catch(() => null);

              // Update DB: mark session cancelled and clear movie association/status
              try {
                await database.updateSessionStatus(sessionId, 'cancelled');
              } catch (_) {}

              if (movie && movie.message_id) {
                try { await database.updateMovieStatus(movie.message_id, 'planned'); } catch (_) {}
                try { await database.updateMovieSessionId(movie.message_id, null); } catch (_) {}

                // Update Discord message/thread
                try {
                  if (movie.channel_type === 'forum' && movie.thread_id) {
                    const thread = await client.channels.fetch(movie.thread_id).catch(() => null);
                    if (thread) {
                      await forumChannels.updateForumPostContent(thread, { ...movie, status: 'planned' }, 'planned');
                      await forumChannels.updateForumPostTags(thread, 'planned');
                    }
                  } else if (movie.channel_id) {
                    const channel = await client.channels.fetch(movie.channel_id).catch(() => null);
                    if (channel && channel.messages) {
                      const msgObj = await channel.messages.fetch(movie.message_id).catch(() => null);
                      if (msgObj) {
                        const voteCounts = await database.getVoteCounts(movie.message_id);
                        let imdbData = null;
                        try {
                          if (movie.imdb_data) {
                            let parsed = typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data;
                            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                            imdbData = parsed;
                          }
                        } catch (_) {}
                        const movieEmbed = embeds.createMovieEmbed({ ...movie, status: 'planned' }, imdbData, voteCounts);
                        const rows = components.createStatusButtons(movie.message_id, 'planned', voteCounts.up, voteCounts.down);
                        await msgObj.edit({ embeds: [movieEmbed], components: rows });
                      }
                    }
                  }
                } catch (e) {
                  logger?.warn?.('WS cancel_session: discord message update error:', e?.message || e);
                }
              }

              // Delete session record
              try { await database.deleteMovieSession(sessionId); } catch (_) {}
            } catch (e) {
              logger?.warn?.('WS cancel_session error:', e?.message || e);
            }
            return;
          }

          if (msg.type === 'plan_session') {
            const guildId = msg?.payload?.guildId;
            const startTs = msg?.payload?.startTs;
            const votingEndTs = msg?.payload?.votingEndTs;
            const name = msg?.payload?.name;
            const description = msg?.payload?.description;
            if (!guildId || !startTs) return;

            const client = global.discordClient;
            if (!client) return;

            const database = require('../database');
            const adminControls = require('./admin-controls');
            const discordEvents = require('./discord-events');
            const sessionScheduler = require('./session-scheduler');

            try {
              const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(String(guildId)).catch(() => null);
              if (!guild) return;

              const config = await database.getGuildConfig(guildId).catch(() => null);
              const scheduledDate = new Date(Number(startTs));
              const votingEnd = (typeof votingEndTs === 'number') ? new Date(Number(votingEndTs)) : new Date(scheduledDate.getTime() - 60 * 60 * 1000);
              const sessionName = name || 'Movie Night';
              const tz = (config && (config.timezone || config.guild_timezone)) || 'UTC';

              // Create Discord event first (optional)
              let event = null;
              try { event = await discordEvents.createDiscordEvent(guild, { name: sessionName, description }, scheduledDate); } catch (_) {}

              // Create DB session
              const sessionId = await database.createVotingSession({
                guildId,
                channelId: config?.movie_channel_id || null,
                name: sessionName,
                description: description || null,
                scheduledDate,
                votingEndTime: votingEnd,
                timezone: tz,
                discordEventId: event?.id || null,
                createdBy: 'dashboard'
              });

              // Schedule voting end if within window
              if (sessionId && votingEnd) {
                try { await sessionScheduler.scheduleVotingEnd(sessionId, votingEnd); } catch (_) {}
              }

              // Refresh admin panel
              try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (_) {}
            } catch (e) {
              logger?.warn?.('WS plan_session error:', e?.message || e);
            }
            return;
          }

          if (msg.type === 'reschedule_session') {
            const guildId = msg?.payload?.guildId;
            const sessionId = msg?.payload?.sessionId;
            const startTs = msg?.payload?.startTs;
            const votingEndTs = msg?.payload?.votingEndTs;
            const name = msg?.payload?.name;
            const description = msg?.payload?.description;
            if (!guildId || !sessionId) return;

            const client = global.discordClient;
            if (!client) return;

            const database = require('../database');
            const adminControls = require('./admin-controls');
            const discordEvents = require('./discord-events');
            const sessionScheduler = require('./session-scheduler');

            try {
              const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(String(guildId)).catch(() => null);
              if (!guild) return;
              const session = await database.getSessionById(sessionId).catch(() => null);
              if (!session || String(session.guild_id) !== String(guildId)) return;

              const scheduledDate = (typeof startTs === 'number') ? new Date(Number(startTs)) : (session.scheduled_date ? new Date(session.scheduled_date) : null);
              const votingEnd = (typeof votingEndTs !== 'undefined') ? (votingEndTs ? new Date(Number(votingEndTs)) : null) : (session.voting_end_time ? new Date(session.voting_end_time) : null);
              const newName = name || session.name;
              const newDesc = (typeof description !== 'undefined') ? description : session.description;

              await database.updateMovieSessionDetails(sessionId, {
                name: newName,
                description: newDesc,
                scheduledDate,
                timezone: session.timezone || 'UTC',
                votingEndTime: votingEnd
              });

              if (session.discord_event_id) {
                try { await discordEvents.updateDiscordEvent(guild, session.discord_event_id, { name: newName, description: newDesc }, scheduledDate); } catch (_) {}
              } else if (scheduledDate) {
                try {
                  const ev = await discordEvents.createDiscordEvent(guild, { name: newName, description: newDesc }, scheduledDate);
                  if (ev?.id) { try { await database.updateVotingSessionEventId(sessionId, ev.id); } catch (_) {} }
                } catch (_) {}
              }

              try { sessionScheduler.clearSessionTimeout(sessionId); } catch (_) {}
              if (votingEnd) { try { await sessionScheduler.scheduleVotingEnd(sessionId, votingEnd); } catch (_) {} }

              try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (_) {}
            } catch (e) {
              logger?.warn?.('WS reschedule_session error:', e?.message || e);
            }
            return;
          }
        } catch (e) {
          logger?.warn?.(`WS handler error: ${e?.message || e}`);
        }
      });

      ws.on('close', () => {
        if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
        logger?.warn?.('WS: connection closed');
        scheduleReconnect();
      });

      ws.on('error', (err) => {
        logger?.warn?.(`WS error: ${err?.message || err}`);
      });
    } catch (e) {
      logger?.warn?.(`WS: connect error: ${e?.message || e}`);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_MS);
  }

  // Start initial connection
  connect();

  return {
    enabled: true,
    send(obj) {
      if (!ws || ws.readyState !== 1) return false;
      try { ws.send(JSON.stringify(obj)); return true; } catch (_) { return false; }
    }
  };
}

module.exports = { initWebSocketClient };

