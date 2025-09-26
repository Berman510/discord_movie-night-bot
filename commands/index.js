/**
 * Command Registration Module
 * Handles registration of all slash commands with Discord
 */

const { Routes, REST } = require('discord.js');
const movieNightCommands = require('./movie-night');
const movieConfigureCommands = require('./movie-configure');
const movieSetupCommands = require('./movie-setup');
const movieWatchedCommand = require('./movie-watched');
const movieSkipCommand = require('./movie-skip');
const moviePlanCommand = require('./movie-plan');
const debugConfigCommand = require('./debug-config');
const adminPanelCommand = require('./admin-panel');

// Combine all command definitions
const commands = [
  ...movieNightCommands,
  ...movieConfigureCommands,
  ...movieSetupCommands,
  movieWatchedCommand.data.toJSON(),
  movieSkipCommand.data.toJSON(),
  moviePlanCommand.data.toJSON(),
  debugConfigCommand.data.toJSON(),
  adminPanelCommand.data.toJSON(),
];

module.exports = {
  commands,
  registerCommands: async (token, clientId, guildId = null) => {
    const rest = new REST({ version: '10' }).setToken(token);
    const logger = require('../utils/logger');

    try {
      logger.debug('🔄 Started refreshing application (/) commands.');

      const route = guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId);

      await rest.put(route, { body: commands });

      const scope = guildId ? `guild ${guildId}` : 'globally';
      logger.info(`✅ Successfully reloaded ${commands.length} application (/) commands ${scope}.`);
    } catch (error) {
      logger.error('❌ Error registering commands:', error);
      // For development guild registration failures, don't crash the bot
      if (guildId && error.code === 50001) {
        logger.warn(
          `⚠️ Missing permissions to register commands in guild ${guildId} - this is non-critical`
        );
        return false;
      }
      throw error;
    }
  },
};
