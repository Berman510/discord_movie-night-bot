/**
 * Movie Statistics Commands
 * Slash command definitions for statistics and analytics
 */

const commands = [
  {
    name: 'movie-stats',
    description: 'View movie night statistics and analytics',
    options: [
      {
        name: 'type',
        description: 'Type of statistics to view',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'overview', value: 'overview' },
          { name: 'top-movies', value: 'top-movies' },
          { name: 'user-stats', value: 'user-stats' },
          { name: 'monthly', value: 'monthly' },
        ],
      },
      {
        name: 'user',
        description: 'User to view statistics for (for user-stats type)',
        type: 6, // USER
        required: false,
      },
    ],
  },
];

module.exports = commands;
