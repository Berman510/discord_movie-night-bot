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

      ws.on('message', (data) => {
        let msg;
        try { msg = JSON.parse(data); } catch (_) { return; }
        // ack responses or control messages can be handled here later
        if (msg.type === 'pong') return;
        if (msg.type === 'ack') return;
        // TODO: handle domain messages when defined (session_update, rsvp_update, etc.)
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

