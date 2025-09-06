/**
 * Movie Configuration Commands
 * Slash command definitions for bot configuration
 */

const { TIMEZONE_OPTIONS } = require('../config/timezones');

const commands = [
  {
    name: 'movie-configure',
    description: 'Configure bot settings for this server (Administrator only)',
    options: [
      {
        name: 'action',
        description: 'Configuration action to perform',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'set-channel', value: 'set-channel' },
          { name: 'set-viewing-channel', value: 'set-viewing-channel' },
          { name: 'set-admin-channel', value: 'set-admin-channel' },
          { name: 'add-admin-role', value: 'add-admin-role' },
          { name: 'remove-admin-role', value: 'remove-admin-role' },
          { name: 'set-notification-role', value: 'set-notification-role' },
          { name: 'view-settings', value: 'view-settings' },
          { name: 'reset', value: 'reset' }
        ]
      },
      {
        name: 'channel',
        description: 'Channel to set (for set-channel, set-viewing-channel, or set-admin-channel actions)',
        type: 7, // CHANNEL
        required: false
      },

      {
        name: 'role',
        description: 'Role to add/remove as admin or set as notification role',
        type: 8, // ROLE
        required: false
      }
    ]
  }
];

module.exports = commands;
