/**
 * Unified Movie Night Commands
 * Single command with all functionality for better discoverability
 */

const { TIMEZONE_OPTIONS } = require('../config/timezones');

const commands = [
  {
    name: 'movienight',
    description: 'All Movie Night Bot commands in one place',
    options: [
      {
        name: 'action',
        description: 'What do you want to do?',
        type: 3, // STRING
        required: true,
        choices: [
          // Configuration (most important first)
          { name: 'configure', value: 'configure' },
          { name: 'setup-guide', value: 'setup' },

          // Core functionality
          { name: 'recommend-content', value: 'recommend' },
          { name: 'create-session', value: 'create-session' },
          { name: 'list-sessions', value: 'list-sessions' },
          { name: 'join-session', value: 'join-session' },

          // Management
          { name: 'close-voting', value: 'close-voting' },
          { name: 'pick-winner', value: 'pick-winner' },
          { name: 'add-movie-to-session', value: 'add-movie' },

          // Statistics and info
          { name: 'stats', value: 'stats' },
          { name: 'help', value: 'help' },

          // Admin functions
          { name: 'cleanup-sync', value: 'cleanup-sync' },
          { name: 'cleanup-purge', value: 'cleanup-purge' }
        ]
      },

      // Configuration sub-options
      {
        name: 'config-action',
        description: 'Configuration action (only for configure action)',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'set-voting-channel', value: 'set-channel' },
          { name: 'set-watch-party-channel', value: 'set-watch-party-channel' },
          { name: 'set-admin-channel', value: 'set-admin-channel' },
          { name: 'add-admin-role', value: 'add-admin-role' },
          { name: 'remove-admin-role', value: 'remove-admin-role' },
          { name: 'view-settings', value: 'view-settings' },
          { name: 'reset', value: 'reset' }
        ]
      },

      // Channel parameter
      {
        name: 'channel',
        description: 'Channel to set (for configuration actions)',
        type: 7, // CHANNEL
        required: false
      },

      // Role parameter
      {
        name: 'role',
        description: 'Role to add/remove as admin or set as notification role',
        type: 8, // ROLE
        required: false
      },

      // Session parameters
      {
        name: 'session-id',
        description: 'Session ID (for session-related actions)',
        type: 4, // INTEGER
        required: false
      },

      // Movie title parameter
      {
        name: 'movie-title',
        description: 'Movie title (for add-movie action)',
        type: 3, // STRING
        required: false
      },

      // Stats type parameter
      {
        name: 'stats-type',
        description: 'Type of statistics to show',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'overview', value: 'overview' },
          { name: 'top-movies', value: 'top-movies' },
          { name: 'user-stats', value: 'user-stats' },
          { name: 'monthly', value: 'monthly' }
        ]
      },

      // User parameter for stats
      {
        name: 'user',
        description: 'User to show stats for (defaults to yourself)',
        type: 6, // USER
        required: false
      },

      // Cleanup action parameter
      {
        name: 'cleanup-action',
        description: 'Type of cleanup to perform',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'sync', value: 'sync' },
          { name: 'purge', value: 'purge' }
        ]
      }
    ]
  },
  {
    name: 'movienight-queue',
    description: 'View current movie recommendations and voting status'
  },

];

module.exports = commands;
