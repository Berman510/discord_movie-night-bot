const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movienight-skip')
    .setDescription('Skip a movie (Admin only)')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('The title of the movie to skip')
        .setRequired(true)
        .setAutocomplete(true)
    ),

};
