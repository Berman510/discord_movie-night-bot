const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movienight-watched')
    .setDescription('Mark a movie as watched (Admin only)')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('The title of the movie to mark as watched')
        .setRequired(true)
        .setAutocomplete(true)
    ),

};
