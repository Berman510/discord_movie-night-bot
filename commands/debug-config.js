const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movienight-debug-config')
    .setDescription('Debug guild configuration (Admin only)'),
  

};
