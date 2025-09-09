const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debug-config')
    .setDescription('Debug guild configuration (Admin only)'),
  
  async execute(interaction) {
    // This will be handled by the main command handler
    // Just need this file for command registration
  }
};
