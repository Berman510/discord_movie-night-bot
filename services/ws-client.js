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
  let reconnectAttempts = 0;
  const HEARTBEAT_MS = 30000;
  const MIN_RECONNECT_MS = 3000;
  const MAX_RECONNECT_MS = 60000;
  let isConnected = false;
  let statusInterval = null;
  let lastReported = null;

  function connect() {
    try {
      logger?.info?.(`WS: connecting to ${WS_URL} ...`);
      ws = new WS(WS_URL, {
        headers: { Authorization: `Bearer ${TOKEN}` }

      });

      ws.on('open', () => {
        reconnectAttempts = 0;
        isConnected = true;
        try { global.wsStatus = { connected: true, attempts: reconnectAttempts, ts: Date.now() }; } catch (_) {}
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
        // Periodic status poll with change-only reporting
        if (!statusInterval) {
          statusInterval = setInterval(() => {
            const connected = !!(ws && ws.readyState === 1);
            if (lastReported !== connected) {
              lastReported = connected;
              isConnected = connected;
              try { global.wsStatus = { connected, attempts: reconnectAttempts, ts: Date.now() }; } catch (_) {}
              logger?.info?.(`WS: ${connected ? 'connected' : 'disconnected'}`);
            }
          }, 5000);
        }
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
              logger?.warn?.(`[${guildId}] WS sync_guild error:`, e?.message || e);
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
              logger?.warn?.(`[${guildId}] WS refresh_admin_panel error:`, e?.message || e);
            }
            return;
          }

          if (msg.type === 'ban_movie') {
            const guildId = msg?.payload?.guildId;
            const title = msg?.payload?.title;
            if (!guildId || !title) return;
            const database = require('../database');
            const forumChannels = require('./forum-channels');
            const { embeds, components } = require('../utils');
            const client = global.discordClient;
            try {
              // Mark all instances as banned in DB (and avoid duplicate marker rows)
              await database.banMovie(guildId, title);

              // Clean up posts across admin/voting channels for this title
              // Query all movie rows by computed movie_uid
              const movieUID = database.generateMovieUID(guildId, title);
              let rows = [];
              try {
                const [r] = await database.pool.execute(
                  `SELECT * FROM movies WHERE guild_id = ? AND movie_uid = ?`,
                  [guildId, movieUID]
                );
                rows = r || [];
              } catch (_) {}

              for (const movie of rows) {
                try {
                  // Update/cleanup forum threads
                  if (movie.channel_type === 'forum' && movie.thread_id) {
                    const thread = await client?.channels?.fetch(movie.thread_id).catch(() => null);
                    if (thread) {
                      try { await forumChannels.updateForumPostContent(thread, movie, 'banned'); } catch (_) {}
                      try { await forumChannels.updateForumPostTags(thread, 'banned'); } catch (_) {}
                      try { await forumChannels.archiveForumPost(thread, 'Movie banned'); } catch (_) {}
                    }
                  } else if (movie.channel_id && movie.message_id) {
                    // Text-channel message: prefer deletion; fallback to editing with no components
                    const channel = await client?.channels?.fetch(movie.channel_id).catch(() => null);
                    if (channel && channel.messages) {
                      const msgObj = await channel.messages.fetch(movie.message_id).catch(() => null);
                      if (msgObj) {
                        try {
                          await msgObj.delete();
                        } catch (_) {
                          // Fallback: edit to disabled state
                          try {
                            await msgObj.edit({ content: '⛔️ This movie has been banned.', embeds: [], components: [] });
                          } catch (_) {}
                        }
                      }
                    }
                  }
                } catch (e) {
                  logger?.warn?.(`[${guildId}] WS ban cleanup error for ${movie?.message_id}: ${e?.message || e}`);
                }
              }
            } catch (e) {
              logger?.warn?.(`[${guildId}] WS ban_movie error: ${e?.message || e}`);
            }
            return;
          }

          if (msg.type === 'pick_winner') {
            const guildId = msg?.payload?.guildId;
            const messageId = msg?.payload?.messageId;
            const actorId = msg?.payload?.actorId;
            if (!guildId || !messageId) return;
            try {
              const client = global.discordClient;
              if (!client) return;

              const database = require('../database');
              const adminControls = require('./admin-controls');
              const forumChannels = require('./forum-channels');

              // Fetch movie and session
              const movie = await database.getMovieByMessageId(messageId, guildId).catch(() => null);
              if (!movie) return;
              let session = null;
              if (movie.session_id) {
                session = await database.getVotingSessionById(movie.session_id).catch(() => null);
              }
              if (!session) {
                session = await database.getActiveVotingSession(guildId).catch(() => null);
              }
              if (!session) return;

              // Finalize session with this movie as winner
              try { await database.finalizeVotingSession(session.id, movie.message_id); } catch (_) {}

              // Update forum thread content if applicable
              try {
                if (movie.channel_type === 'forum' && movie.thread_id) {
                  const thread = await client.channels.fetch(String(movie.thread_id)).catch(() => null);
                  if (thread) {
                    await forumChannels.updateForumPostContent(thread, movie, 'scheduled');
                  }
                }
              } catch (_) {}

              // Post winner announcement and update pinned recommendation post if forum-based
              try {
                const cfg = await database.getGuildConfig(guildId).catch(() => null);
                const voteChannelId = cfg?.voting_channel_id || cfg?.movie_channel_id;
                if (voteChannelId) {
                  const voteChannel = await client.channels.fetch(String(voteChannelId)).catch(() => null);
                  if (voteChannel && forumChannels.isForumChannel(voteChannel)) {
                    try { await forumChannels.postForumWinnerAnnouncement(voteChannel, movie, session.name || 'Movie Night', { event: session.discord_event_id || null, selectedByUserId: actorId }); } catch (_) {}
                    try { await forumChannels.ensureRecommendationPost(voteChannel, null); } catch (_) {}
                  }
                }
              } catch (_) {}

              // Refresh admin panel
              try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (_) {}

            } catch (e) {
              const logger = require('../utils/logger');
              logger?.warn?.(`[${guildId}] WS pick_winner error (messageId=${messageId}):`, e?.message || e);
            }
            return;
          }


          if (msg.type === 'remove_movie') {
            const guildId = msg?.payload?.guildId;
            const messageId = msg?.payload?.messageId;
            if (!guildId || !messageId) return;
            try {
              const client = global.discordClient;
              const database = require('../database');
              const logger = require('../utils/logger');

              const movie = await database.getMovieByMessageId(messageId, guildId);
              if (!movie) return;

              // Delete Discord artifacts
              try {
                if (movie.channel_type === 'forum' && movie.thread_id) {
                  const thread = await client.channels.fetch(String(movie.thread_id)).catch(() => null);
                  if (thread) { await thread.delete('Removed via dashboard'); }
                } else if (movie.channel_id) {
                  const cleanup = require('./cleanup');
                  await cleanup.removeMoviePost(client, String(movie.channel_id), String(movie.message_id));
                }
              } catch (e) {
                logger?.warn?.(`[${guildId}] WS remove_movie discord cleanup error (messageId=${messageId}):`, e?.message || e);
              }

              // Delete DB rows (votes then movie)
              try { await database.deleteVotesByMessageId(messageId); } catch (_) {}
              try { await database.deleteMovie(messageId); } catch (_) {}

            } catch (e) {
              const logger = require('../utils/logger');
              logger?.warn?.(`[${guildId}] WS remove_movie error (messageId=${messageId}):`, e?.message || e);
            }
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
                      const imdb = require('./imdb');
                      if (movie.imdb_id) {
                        imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);
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
              logger?.warn?.(`[${guildId}] WS movie_status_changed update error (messageId=${messageId}):`, e?.message || e);
            }
            return;
          }
          if (msg.type === 'vote_movie') {
            const guildId = msg?.payload?.guildId;
            const messageId = msg?.payload?.messageId;
            const type = msg?.payload?.type; // 'up' | 'down' | 'clear'
            const actorId = msg?.payload?.actorId;
            if (!guildId || !messageId || !actorId || !['up','down','clear'].includes(type)) return;

            const client = global.discordClient;
            if (!client) return;


            // Enforce Voting Roles or Mod/Admin for dashboard-initiated votes
            try {
              const guild = client.guilds.cache.get(String(guildId)) || await client.guilds.fetch(String(guildId)).catch(() => null);
              const member = await guild?.members?.fetch(String(actorId)).catch(() => null);
              if (!member) return;
              const { canMemberVote } = require('../services/permissions');
              const allowed = await canMemberVote(String(guildId), member);
              if (!allowed) {
                logger?.debug?.(`[${guildId}] WS vote_movie denied: user ${actorId} lacks Voting Roles/mod/admin`);
                return;
              }
            } catch (permErr) {
              logger?.warn?.(`[${guildId}] WS vote_movie: permission check failed: ${permErr?.message || permErr}`);
              return;
            }

            const database = require('../database');
            const forumChannels = require('./forum-channels');
            const { embeds, components } = require('../utils');

            try {
              const movie = await database.getMovieByMessageId(messageId, guildId);
              if (!movie) return;

              // Get current vote for this user
              const currentVote = await database.getUserVote(messageId, actorId);

              // Enforce vote caps (only when adding/changing a vote and if session-scoped)
              try {
                const movieSessionId = movie.session_id;
                if (movieSessionId && type !== 'clear' && currentVote !== type) {
                  const config = await database.getGuildConfig(guildId).catch(() => null);
                  const enabled = config && typeof config.vote_cap_enabled !== 'undefined' ? Boolean(Number(config.vote_cap_enabled)) : true;
                  if (enabled) {
                    const ratioUp = config && config.vote_cap_ratio_up != null ? Number(config.vote_cap_ratio_up) : 1/3;
                    const ratioDown = config && config.vote_cap_ratio_down != null ? Number(config.vote_cap_ratio_down) : 1/5;
                    const minCap = config && config.vote_cap_min != null ? Math.max(1, Number(config.vote_cap_min)) : 1;

                    const totalInSession = await database.countMoviesInSession(movieSessionId);
                    const upCap = Math.max(minCap, Math.floor(totalInSession * ratioUp));
                    const downCap = Math.max(minCap, Math.floor(totalInSession * ratioDown));

                    const voteType = (type === 'up') ? 'up' : 'down';
                    const used = await database.countUserVotesInSession(actorId, movieSessionId, voteType);
                    const cap = (type === 'up') ? upCap : downCap;
                    if (used >= cap) {
                      logger?.debug?.(`[${guildId}] WS vote_movie: cap hit for user ${actorId} in session ${movieSessionId} (${voteType} ${used}/${cap})`);
                      // Do not apply vote if cap exceeded
                      return;
                    }
                  }
                }
              } catch (capErr) {
                logger?.warn?.(`[${guildId}] WS vote_movie cap check failed (messageId=${messageId}, actorId=${actorId}):`, capErr?.message || capErr);
              }

              // Apply vote
              if (type === 'clear') {
                await database.removeVote(messageId, actorId, guildId);
              } else if (currentVote === type) {
                await database.removeVote(messageId, actorId, guildId);
              } else {
                await database.saveVote(messageId, actorId, type, guildId);
              }

              // Update counts and Discord message
              const voteCounts = await database.getVoteCounts(messageId);

              try {
                if (movie.channel_type === 'forum' && movie.thread_id) {
                  const thread = await client.channels.fetch(movie.thread_id).catch(() => null);
                  if (thread) {
                    // Update title to reflect new counts
                    await forumChannels.updateForumPostTitle(thread, movie.title, movie.status, voteCounts.up, voteCounts.down);
                    // Also update the starter message embed + buttons so counts are visible there too
                    try {
                      const starter = await thread.fetchStarterMessage().catch(() => null);
                      if (starter) {
                        let imdbData = null;
                        try {
                          const imdb = require('./imdb');
                          if (movie.imdb_id) {
                            imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);
                          }
                        } catch (_) {}
                        const movieEmbed = embeds.createMovieEmbed(movie, imdbData, voteCounts);
                        const rows = components.createVotingButtons(movie.message_id, voteCounts.up, voteCounts.down);
                        await starter.edit({ embeds: [movieEmbed], components: rows });
                      }
                    } catch (e) {
                      logger?.warn?.(`[${guildId}] WS vote_movie: starter message update error (messageId=${messageId}):`, e?.message || e);
                    }
                  }
                } else if (movie.channel_id) {
                  const channel = await client.channels.fetch(movie.channel_id).catch(() => null);
                  if (channel && channel.messages) {
                    const msgObj = await channel.messages.fetch(movie.message_id).catch(() => null);
                    if (msgObj) {
                      let imdbData = null;
                      try {
                        const imdb = require('./imdb');
                        if (movie.imdb_id) {
                          imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);
                        }
                      } catch (_) {}
                      const movieEmbed = embeds.createMovieEmbed(movie, imdbData, voteCounts);
                      const rows = components.createVotingButtons(movie.message_id, voteCounts.up, voteCounts.down);
                      await msgObj.edit({ embeds: [movieEmbed], components: rows });
                    }
                  }
                }
              } catch (e) {
                logger?.warn?.(`[${guildId}] WS vote_movie: discord message update error (messageId=${messageId}):`, e?.message || e);
              }
            } catch (e) {
              logger?.warn?.(`[${guildId}] WS vote_movie error (messageId=${messageId}, actorId=${actorId}):`, e?.message || e);
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
            const adminControls = require('./admin-controls');
            const forumChannels = require('./forum-channels');
            const { ensureQuickActionAtBottom } = require('./cleanup');
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

              // Delete Discord event if exists
              try {
                if (session.discord_event_id) {
                  const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(String(guildId)).catch(() => null);
                  if (guild) {
                    const ev = await guild.scheduledEvents.fetch(session.discord_event_id).catch(() => null);
                    if (ev) { await ev.delete(); }
                  }
                }
              } catch (_) {}

              // Find associated movie if any
              const movie = await database.getMovieBySessionId(sessionId).catch(() => null);

              // Update DB: mark session cancelled and clear movie association/status
              try { await database.updateSessionStatus(sessionId, 'cancelled'); } catch (_) {}

              if (movie && movie.message_id) {
                try { await database.updateMovieStatus(movie.message_id, 'planned'); } catch (_) {}
                try { await database.updateMovieSessionId(movie.message_id, null); } catch (_) {}

                // Update Discord message/thread
                try {
                  if (movie.channel_type === 'forum' && movie.thread_id) {
                    const thread = await client.channels.fetch(movie.thread_id).catch(() => null);
                    if (thread) {
                      await forumChannels.updateForumPostContent(thread, { ...movie, status: 'pending' }, 'pending');
                      await forumChannels.updateForumPostTags(thread, 'pending');
                    }
                  } else if (movie.channel_id) {
                    const channel = await client.channels.fetch(movie.channel_id).catch(() => null);
                    if (channel && channel.messages) {
                      const msgObj = await channel.messages.fetch(movie.message_id).catch(() => null);
                      if (msgObj) {
                        const voteCounts = await database.getVoteCounts(movie.message_id);
                        let imdbData = null;
                        try {
                          const imdb = require('./imdb');
                          if (movie.imdb_id) {
                            imdbData = await imdb.getMovieDetailsCached(movie.imdb_id);
                          }
                        } catch (_) {}
                        const movieEmbed = embeds.createMovieEmbed({ ...movie, status: 'pending' }, imdbData, voteCounts);
                        const rows = components.createStatusButtons(movie.message_id, 'pending', voteCounts.up, voteCounts.down);
                        await msgObj.edit({ embeds: [movieEmbed], components: rows });
                      }
                    }
                  }
                } catch (e) {
                  logger?.warn?.(`[${guildId}] WS cancel_session: discord message update error (sessionId=${sessionId}):`, e?.message || e);
                }
              }

              // Delete session record
              try { await database.deleteMovieSession(sessionId); } catch (_) {}

              // Ensure channel UX reflects "no active session" and refresh admin panel
              try {
                const cfg = await database.getGuildConfig(guildId).catch(() => null);
                const voteChannelId = cfg?.voting_channel_id || cfg?.movie_channel_id;
                if (voteChannelId) {
                  const voteChannel = await client.channels.fetch(String(voteChannelId)).catch(() => null);
                  if (voteChannel) {
                    if (forumChannels.isForumChannel(voteChannel)) {
                      await forumChannels.ensureRecommendationPost(voteChannel, null);
                    } else {
                      await ensureQuickActionAtBottom(voteChannel);
                    }
                  }
                }
              } catch (_) { /* non-fatal */ }

              try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (_) {}
            } catch (e) {
              logger?.warn?.(`[${guildId}] WS cancel_session error (sessionId=${sessionId}):`, e?.message || e);
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

              // Ensure recommendation/quick-action post in the voting channel so UX matches bot-created sessions
              try {
                const cfg = await database.getGuildConfig(guildId).catch(() => null);
                const voteChannelId = cfg?.voting_channel_id || cfg?.movie_channel_id;
                if (voteChannelId) {
                  const voteChannel = await client.channels.fetch(String(voteChannelId)).catch(() => null);
                  if (voteChannel) {
                    const forumChannels = require('./forum-channels');
                    if (forumChannels.isForumChannel(voteChannel)) {
                      const activeSession = { id: sessionId, name: sessionName, status: 'active', voting_end_time: votingEnd ? votingEnd.toISOString() : null };
                      await forumChannels.ensureRecommendationPost(voteChannel, activeSession);
                    } else {
                      const cleanup = require('./cleanup');
                      await cleanup.ensureQuickActionAtBottom(voteChannel);
                    }
                  }
                }
              } catch (_) { /* non-fatal */ }

              // Refresh admin panel
              try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (_) {}
            } catch (e) {
              logger?.warn?.(`[${guildId}] WS plan_session error:`, e?.message || e);
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

              // Name policy: avoid embedding date/time in title; keep it short and let description show time
              let newName;
              if (typeof name === 'string' && name.trim().length > 0) {
                newName = name.trim();
              } else if (session && session.name && session.name.trim().length > 0) {
                newName = session.name.trim();
              } else {
                newName = 'Movie Night';
              }

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

              // Refresh admin panel
              try { await adminControls.ensureAdminControlPanel(client, guildId); } catch (_) {}

              // Also refresh the pinned recommendation post to reflect new session name/date
              try {
                const forumChannels = require('./forum-channels');
                const cfg = await database.getGuildConfig(guildId).catch(() => null);
                const voteChannelId = cfg?.voting_channel_id || cfg?.movie_channel_id;
                if (voteChannelId) {
                  const voteChannel = await client.channels.fetch(String(voteChannelId)).catch(() => null);
                  if (voteChannel) {
                    if (forumChannels.isForumChannel(voteChannel)) {
                      const updatedActiveSession = {
                        id: sessionId,
                        name: newName,
                        status: 'active',
                        voting_end_time: votingEnd ? new Date(votingEnd).toISOString() : (session.voting_end_time || null)
                      };
                      await forumChannels.ensureRecommendationPost(voteChannel, updatedActiveSession);
                    } else {
                      const cleanup = require('./cleanup');
                      await cleanup.ensureQuickActionAtBottom(voteChannel);
                    }
                  }
                }
              } catch (_) { /* non-fatal */ }
            } catch (e) {
              logger?.warn?.(`[${guildId}] WS reschedule_session error (sessionId=${sessionId}):`, e?.message || e);
            }
            return;

          if (msg.type === 'update_vote_caps') {
            const guildId = msg?.payload?.guildId;
            let { enabled, upRatio, downRatio, minCap } = msg?.payload || {};
            if (!guildId) return;
            try {
              const database = require('../database');
              // Normalize
              enabled = !!enabled;
              upRatio = Math.max(0, Math.min(1, Number(upRatio)));
              downRatio = Math.max(0, Math.min(1, Number(downRatio)));
              minCap = Math.max(0, Math.floor(Number(minCap)));
              await database.updateVoteCaps(guildId, enabled, upRatio, downRatio, minCap);
              // Emit event so dashboard can refresh caps if desired
              try { global.wsClient?.send && global.wsClient.send({ type: 'caps_updated', payload: { guildId } }); } catch (_) {}
            } catch (e) {
              const logger = require('../utils/logger');
              logger?.warn?.(`[${guildId}] WS update_vote_caps error:`, e?.message || e);
            }
            return;
          }

          if (msg.type === 'update_guild_config') {
            const guildId = msg?.payload?.guildId;
            if (!guildId) return;
            try {
              const database = require('../database');
              const pool = database.pool;
              const {
                movie_channel_id,
                admin_channel_id,
                watch_party_channel_id,
                admin_roles,
                moderator_roles,
                voting_roles
              } = msg?.payload || {};

              // Ensure row exists
              try {
                await pool.execute(
                  `INSERT INTO guild_config (guild_id, admin_roles) VALUES (?, ?)
                   ON DUPLICATE KEY UPDATE guild_id = guild_id`,
                  [guildId, JSON.stringify([])]
                );
              } catch (_) {}

              // Build dynamic update
              const sets = [];
              const params = [];
              if (typeof movie_channel_id !== 'undefined') { sets.push('movie_channel_id = ?'); params.push(movie_channel_id || null); }
              if (typeof admin_channel_id !== 'undefined') { sets.push('admin_channel_id = ?'); params.push(admin_channel_id || null); }
              if (typeof watch_party_channel_id !== 'undefined') { sets.push('watch_party_channel_id = ?'); params.push(watch_party_channel_id || null); }
              if (typeof admin_roles !== 'undefined') {
                const unique = Array.from(new Set((admin_roles || []).map(id => String(id))));
                sets.push('admin_roles = ?'); params.push(JSON.stringify(unique));
              }
              if (typeof moderator_roles !== 'undefined') {
                const unique = Array.from(new Set((moderator_roles || []).map(id => String(id))));
                sets.push('moderator_roles = ?'); params.push(JSON.stringify(unique));
              }
              if (typeof voting_roles !== 'undefined') {
                const unique = Array.from(new Set((voting_roles || []).map(id => String(id))));
                sets.push('voting_roles = ?'); params.push(JSON.stringify(unique));
              }

              if (sets.length > 0) {
                const sql = `UPDATE guild_config SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`;
                params.push(guildId);
                await pool.execute(sql, params);
              }

              // Emit event so dashboard can react if needed
              try { global.wsClient?.send && global.wsClient.send({ type: 'config_updated', payload: { guildId } }); } catch (_) {}
            } catch (e) {
              const logger = require('../utils/logger');
              logger?.warn?.(`[${guildId}] WS update_guild_config error:`, e?.message || e);
            }
            return;
          }

          }
        } catch (e) {
          logger?.warn?.(`WS handler error: ${e?.message || e}`);
        }
      });

      ws.on('close', (code, reason) => {
        if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
        isConnected = false;
        try { global.wsStatus = { connected: false, attempts: reconnectAttempts, ts: Date.now() }; } catch (_) {}
        const why = (reason && reason.toString && reason.toString()) || '';
        logger?.warn?.(`WS: connection closed (code=${code}${why ? `, reason=${why}` : ''})`);
        scheduleReconnect();
      });

      ws.on('error', (err) => {
        logger?.warn?.(`WS error: ${err?.message || err}`);
        isConnected = false;
        try { global.wsStatus = { connected: false, attempts: reconnectAttempts, ts: Date.now() }; } catch (_) {}
        // Ensure we schedule reconnects even if close is not emitted (e.g., HTTP 401 during upgrade)
        scheduleReconnect();
      });
    } catch (e) {
      logger?.warn?.(`WS: connect error: ${e?.message || e}`);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    // Exponential backoff with jitter (80%..100% of base)
    const base = Math.min(MAX_RECONNECT_MS, MIN_RECONNECT_MS * Math.pow(2, reconnectAttempts));
    const jitter = Math.floor(base * (0.2 * Math.random()));
    const delay = Math.max(MIN_RECONNECT_MS, Math.floor(base * 0.8) + jitter);
    reconnectAttempts++;
    logger?.info?.(`WS: reconnect attempt #${reconnectAttempts} in ${Math.round(delay/1000)}s...`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
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

function getStatus() {
  try { return { connected: Boolean(global.wsStatus?.connected ?? false), attempts: Number(global.wsStatus?.attempts ?? 0) }; } catch (_) {
    return { connected: false, attempts: 0 };
  }
}

module.exports = { initWebSocketClient, getStatus };

