/**
 * Configurable Logger Utility
 * Supports different log levels and environment-based configuration
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'   // Reset
};

class Logger {
  constructor() {
    // Get log level from environment (default to INFO)
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.logLevel = LOG_LEVELS[envLevel] !== undefined ? LOG_LEVELS[envLevel] : LOG_LEVELS.INFO;

    // Use colors in console (disable in production if needed)
    this.useColors = process.env.LOG_COLORS !== 'false';

    // Only show initialization message if INFO level or higher
    if (this.logLevel >= LOG_LEVELS.INFO) {
      console.log(`🔧 Logger initialized - Level: ${envLevel} (${this.logLevel})`);
    }
  }

  formatMessage(level, message, guildId = null, ...args) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const levelStr = level.padEnd(5);
    const guildStr = guildId ? ` [${guildId}]` : '';

    let formattedMessage;
    if (this.useColors) {
      const color = LOG_COLORS[level] || '';
      formattedMessage = `${color}${timestamp} [${levelStr}]${LOG_COLORS.RESET}${guildStr} ${message}`;
    } else {
      formattedMessage = `${timestamp} [${levelStr}]${guildStr} ${message}`;
    }

    return args.length > 0 ? [formattedMessage, ...args] : [formattedMessage];
  }

  error(message, guildId = null, ...args) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      console.error(...this.formatMessage('ERROR', message, guildId, ...args));
    }
  }

  warn(message, guildId = null, ...args) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      console.warn(...this.formatMessage('WARN', message, guildId, ...args));
    }
  }

  info(message, guildId = null, ...args) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      console.log(...this.formatMessage('INFO', message, guildId, ...args));
    }
  }

  debug(message, guildId = null, ...args) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      console.log(...this.formatMessage('DEBUG', message, guildId, ...args));
    }
  }

  // Convenience methods for common patterns
  movieAction(action, movie, ...args) {
    this.info(`🎬 ${action}: ${movie}`, ...args);
  }

  sessionAction(action, session, ...args) {
    this.info(`🎪 ${action}: ${session}`, ...args);
  }

  adminAction(action, user, ...args) {
    this.info(`🔧 ${action} by ${user}`, ...args);
  }

  databaseAction(action, ...args) {
    this.debug(`💾 DB ${action}`, ...args);
  }

  discordAction(action, ...args) {
    this.debug(`🤖 Discord ${action}`, ...args);
  }

  // Method to check if debug logging is enabled
  isDebugEnabled() {
    return this.logLevel >= LOG_LEVELS.DEBUG;
  }

  // Method to change log level at runtime
  setLogLevel(level) {
    const upperLevel = level.toUpperCase();
    if (LOG_LEVELS[upperLevel] !== undefined) {
      this.logLevel = LOG_LEVELS[upperLevel];
      this.info(`Log level changed to: ${upperLevel}`);
      return true;
    }
    this.warn(`Invalid log level: ${level}. Valid levels: ERROR, WARN, INFO, DEBUG`);
    return false;
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
