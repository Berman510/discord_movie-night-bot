/**
 * Movie Cleanup Commands
 * Slash command definitions for cleanup operations
 */

const commands = [
  {
    name: 'movie-cleanup',
    description: 'Clean up and manage movie channel (Admin only)',
    options: [
      {
        name: 'action',
        description: 'Type of cleanup to perform',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'sync', value: 'sync' },
          { name: 'purge', value: 'purge' },
        ],
      },
    ],
  },
];

module.exports = commands;
