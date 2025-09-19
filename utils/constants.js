/**
 * Constants and Global Variables
 * Shared constants and state management
 */

// In-memory vote store: { [messageId]: { up:Set<userId>, down:Set<userId> } }
const votes = new Map();

// Track the last guide message per channel to keep only the most recent one
const lastGuideMessages = new Map(); // { [channelId]: messageId }

// Temporary store for modal → select payloads (title/where), keyed by a short token
const pendingPayloads = new Map(); // key -> { title, where, createdAt }

// Session creation state for timezone/date selection
if (!global.sessionCreationState) {
  global.sessionCreationState = new Map();
}

// TTL cleanup for pending payloads (15 minutes)
const PAYLOAD_TTL = 15 * 60 * 1000;

function startPayloadCleanup() {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, payload] of pendingPayloads.entries()) {
        if (now - payload.createdAt > PAYLOAD_TTL) {
          pendingPayloads.delete(key);
        }
      }
    },
    5 * 60 * 1000
  ); // Check every 5 minutes
}

// Bot version from package.json
const BOT_VERSION = require('../package.json').version;

// Status emojis
const STATUS_EMOJIS = {
  pending: '🍿',
  planned: '📌',
  watched: '✅',
  skipped: '⏭️',
};

// Vote emojis
const VOTE_EMOJIS = {
  up: '👍',
  down: '👎',
};

// Color scheme
const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  pending: 0x5865f2,
  planned: 0xfee75c,
  watched: 0x57f287,
  skipped: 0x99aab5,
};

module.exports = {
  votes,
  lastGuideMessages,
  pendingPayloads,
  startPayloadCleanup,
  BOT_VERSION,
  STATUS_EMOJIS,
  VOTE_EMOJIS,
  COLORS,
  PAYLOAD_TTL,
};
