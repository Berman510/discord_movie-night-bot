/**
 * Minimal HTTP webhook server for Movie Night Bot
 * - No external deps
 * - Controlled by env vars:
 *   MOVIENIGHT_WEBHOOK_ENABLED=true to start
 *   MOVIENIGHT_WEBHOOK_PORTS=8107,8150,8160,8175 (comma-separated) or PORT
 *   MOVIENIGHT_WEBHOOK_TOKEN=shared-secret for simple bearer auth
 */

const http = require('http');
const { URL } = require('url');
const logger = require('../utils/logger');

function pickPort() {
  const portsEnv = process.env.MOVIENIGHT_WEBHOOK_PORTS || process.env.PORT || '';
  const candidates = `${portsEnv}`
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isInteger(n) && n > 0 && n < 65536);
  if (candidates.length === 0) return 0; // 0 = random OS port
  return candidates[0];
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) { // 1MB cap
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve(null);
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function authorize(req) {
  const token = process.env.MOVIENIGHT_WEBHOOK_TOKEN;
  if (!token) return true; // if no token configured, allow (optional hardening later)
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return false;
  const provided = auth.slice('Bearer '.length).trim();
  return provided === token;
}

function startWebhookServer() {
  if (String(process.env.MOVIENIGHT_WEBHOOK_ENABLED).toLowerCase() !== 'true') {
    logger.info('Webhook server disabled (set MOVIENIGHT_WEBHOOK_ENABLED=true to enable)');
    return null;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      // Basic CORS for dashboard
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      if (req.method === 'OPTIONS') {
        res.writeHead(204).end();
        return;
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (url.pathname === '/info' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          enabled: true,
          port: server.address().port,
          hasToken: !!process.env.MOVIENIGHT_WEBHOOK_TOKEN
        }));
        return;
      }

      if (url.pathname === '/hooks/dashboard' && req.method === 'POST') {
        if (!authorize(req)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
          return;
        }
        let payload;
        try {
          payload = await parseJsonBody(req);
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
          return;
        }

        // Handle actions from dashboard
        const action = payload?.action;
        if (action === 'ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, pong: true }));
          return;
        }

        // Require guildId for most actions
        const guildId = payload?.guildId;
        const client = global.discordClient;
        if (!client) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'bot_client_unavailable' }));
          return;
        }

        try {
          if (action === 'sync_guild') {
            if (!guildId) throw new Error('guildId_required');
            const database = require('../database');
            const adminControls = require('./admin-controls');
            const { ensureQuickActionAtBottom } = require('./cleanup');
            const forumChannels = require('./forum-channels');

            const config = await database.getGuildConfig(guildId);
            let details = { adminPanel: false, votingSynced: 0, forum: false };

            // Admin panel
            try { details.adminPanel = !!(await adminControls.ensureAdminControlPanel(client, guildId)); } catch (_) {}

            if (config && config.movie_channel_id) {
              const votingChannel = await client.channels.fetch(config.movie_channel_id).catch(() => null);
              if (votingChannel) {
                if (forumChannels.isForumChannel(votingChannel)) {
                  details.forum = true;
                  const { populated } = await adminControls.populateForumChannel(client, guildId);
                  details.votingSynced = populated;
                } else {
                  // Text channel: recreate any missing posts and ensure quick action
                  const { recreateMissingMoviePosts } = require('./cleanup');
                  try { details.votingSynced = await recreateMissingMoviePosts(votingChannel, guildId); } catch (_) {}
                  try { await ensureQuickActionAtBottom(votingChannel); } catch (_) {}
                }
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, action, details }));
            return;
          }

          if (action === 'refresh_admin_panel') {
            if (!guildId) throw new Error('guildId_required');
            const adminControls = require('./admin-controls');
            const panel = await adminControls.ensureAdminControlPanel(client, guildId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, action, refreshed: !!panel }));
            return;
          }

          if (action === 'movie_status_changed') {
            if (!guildId) throw new Error('guildId_required');
            const messageId = payload?.messageId;
            if (!messageId) throw new Error('messageId_required');

            const database = require('../database');
            const movie = await database.getMovieByMessageId(messageId, guildId);
            if (!movie) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'movie_not_found' }));
              return;
            }

            const { embeds, components } = require('../utils');
            const forumChannels = require('./forum-channels');

            // Update Discord post based on channel type
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
                  const msg = await channel.messages.fetch(movie.message_id).catch(() => null);
                  if (msg) {
                    const voteCounts = await database.getVoteCounts(movie.message_id);
                    const movieEmbed = embeds.createMovieEmbed(movie, null, voteCounts);
                    const rows = ['watched', 'skipped', 'banned'].includes(movie.status)
                      ? []
                      : components.createStatusButtons(movie.message_id, movie.status, voteCounts.up, voteCounts.down);
                    await msg.edit({ embeds: [movieEmbed], components: rows });
                  }
                }
              }
            } catch (e) {
              logger.warn('movie_status_changed update error:', e.message);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, action }));
            return;
          }

          // Unknown action
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'unknown_action', action }));
          return;
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'not_found' }));
    } catch (err) {
      logger.warn('Webhook server error:', err.message);
      try {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'internal_error' }));
      } catch (_) {}
    }
  });

  const port = pickPort();
  server.listen(port, () => {
    const addr = server.address();
    logger.info(`🌐 Webhook server listening on port ${addr.port}`);
  });

  return server;
}

module.exports = { startWebhookServer };

