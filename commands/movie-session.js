/**
 * Movie Session Commands
 * Slash command definitions for session management
 */

const commands = [
  {
    name: 'movie-session',
    description: 'Create and manage movie night events',
    options: [
      {
        name: 'action',
        description: 'What to do with movie sessions',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'create', value: 'create' },
          { name: 'list', value: 'list' },
          { name: 'close-voting', value: 'close' },
          { name: 'pick-winner', value: 'winner' },
          { name: 'add-movie', value: 'add-movie' },
          { name: 'join', value: 'join' }
        ]
      },
      {
        name: 'session-id',
        description: 'Session ID (for join, add-movie actions)',
        type: 4, // INTEGER
        required: false
      },
      {
        name: 'movie-title',
        description: 'Movie title to add to session (for add-movie action)',
        type: 3, // STRING
        required: false
      }
    ]
  }
];

module.exports = commands;
