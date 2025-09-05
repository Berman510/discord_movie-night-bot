/**
 * Movie Night Commands
 * Slash command definitions for movie recommendations
 */

const commands = [
  {
    name: 'movie-night',
    description: 'Recommend a movie for movie night',
    options: [
      {
        name: 'title',
        description: 'Movie title to recommend',
        type: 3, // STRING
        required: true
      },
      {
        name: 'where',
        description: 'Where to watch it (Netflix, Hulu, etc.)',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'movie-queue',
    description: 'View current movie recommendations and voting status'
  },
  {
    name: 'movie-help',
    description: 'Show help and usage information for the movie bot'
  }
];

module.exports = commands;
