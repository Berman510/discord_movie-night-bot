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
    
    // Check if debug logging is explicitly enabled
    this.debugEnabled = process.env.DEBUG_LOGGING === 'true' || envLevel === 'DEBUG';
    
    // Use colors in console (disable in production if needed)
    this.useColors = process.env.LOG_COLORS !== 'false';
    
    console.log(`🔧 Logger initialized - Level: ${envLevel} (${this.logLevel}), Debug: ${this.debugEnabled}`);
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const levelStr = level.padEnd(5);
    
    let formattedMessage;
    if (this.useColors) {
      const color = LOG_COLORS[level] || '';
      formattedMessage = `${color}${timestamp} [${levelStr}]${LOG_COLORS.RESET} ${message}`;
    } else {
      formattedMessage = `${timestamp} [${levelStr}] ${message}`;
    }
    
    return args.length > 0 ? [formattedMessage, ...args] : [formattedMessage];
  }

  error(message, ...args) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      console.error(...this.formatMessage('ERROR', message, ...args));
    }
  }

  warn(message, ...args) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      console.warn(...this.formatMessage('WARN', message, ...args));
    }
  }

  info(message, ...args) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      console.log(...this.formatMessage('INFO', message, ...args));
    }
  }

  debug(message, ...args) {
    if (this.logLevel >= LOG_LEVELS.DEBUG || this.debugEnabled) {
      console.log(...this.formatMessage('DEBUG', message, ...args));
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
    return this.debugEnabled || this.logLevel >= LOG_LEVELS.DEBUG;
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
