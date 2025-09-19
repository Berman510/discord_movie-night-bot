const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('watchparty-watched')
    .setDescription('Mark content as watched (Admin only)')
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('The title of the content to mark as watched')
        .setRequired(true)
        .setAutocomplete(true)
    ),
};
