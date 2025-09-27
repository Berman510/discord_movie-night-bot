const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('watchparty-plan')
    .setDescription('Plan a movie for later (Admin only)')
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('The title of the movie to plan for later')
        .setRequired(true)
        .setAutocomplete(true)
    ),
};
