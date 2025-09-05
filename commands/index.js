/**
 * Command Registration Module
 * Handles registration of all slash commands with Discord
 */

const movieNightCommands = require('./movie-night');
const movieSessionCommands = require('./movie-session');
const movieConfigureCommands = require('./movie-configure');
const movieCleanupCommands = require('./movie-cleanup');
const movieStatsCommands = require('./movie-stats');

// Combine all command definitions
const commands = [
  ...movieNightCommands,
  ...movieSessionCommands,
  ...movieConfigureCommands,
  ...movieCleanupCommands,
  ...movieStatsCommands
];

module.exports = {
  commands,
  registerCommands: async (rest, clientId, guildId = null) => {
    try {
      console.log('🔄 Started refreshing application (/) commands.');

      const route = guildId 
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId);

      await rest.put(route, { body: commands });

      const scope = guildId ? `guild ${guildId}` : 'globally';
      console.log(`✅ Successfully reloaded ${commands.length} application (/) commands ${scope}.`);
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }
};
