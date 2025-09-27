const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('watchparty-admin-panel')
    .setDescription('Restore the moderation control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    try {
      // Check if user has admin permissions
      if (
        !interaction.member.permissions.has('Administrator') &&
        !interaction.member.permissions.has('ManageChannels')
      ) {
        await interaction.reply({
          content: '❌ You need Administrator or Manage Channels permissions to use this command.',
          ephemeral: true,
        });
        return;
      }

      const adminControls = require('../services/admin-controls');
      await adminControls.ensureAdminControlPanel(interaction.client, interaction.guild.id);

      await interaction.reply({
        content:
          '✅ **Moderation control panel restored!**\n\nThe moderation control panel has been recreated in the configured admin channel.',
        ephemeral: true,
      });
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Error restoring admin panel:', error);
      await interaction.reply({
        content: '❌ Error restoring admin panel. Please check the bot configuration.',
        ephemeral: true,
      });
    }
  },
};
