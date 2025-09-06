/**
 * Configuration Service Module
 * Handles server configuration and settings management
 *
 * TODO: Session Viewing Channel Configuration
 * - Add configuration for session viewing channel (voice/text channel where movie nights happen)
 * - Add database field for session_viewing_channel_id in guild_config table
 * - Add configuration command: /movie-configure action:set-viewing-channel
 * - This channel would be monitored during scheduled session times for automatic participant tracking
 * - Could support both voice channels (for watch parties) and text channels (for chat-based viewing)
 * - Add validation to ensure configured channel exists and bot has proper permissions
 */

const { MessageFlags, EmbedBuilder } = require('discord.js');
const database = require('../database');

async function configureMovieChannel(interaction, guildId) {
  const channel = interaction.options.getChannel('channel') || interaction.channel;

  const success = await database.setMovieChannel(guildId, channel.id);
  if (success) {
    await interaction.reply({
      content: `✅ Movie channel set to ${channel}. Cleanup commands will only work in this channel.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set movie channel.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function addAdminRole(interaction, guildId) {
  const role = interaction.options.getRole('role');
  
  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to add as admin.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.addAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ Added ${role} as an admin role. Members with this role can now use admin commands.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to add admin role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function removeAdminRole(interaction, guildId) {
  const role = interaction.options.getRole('role');
  
  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to remove from admin.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.removeAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ Removed ${role} from admin roles.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to remove admin role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function setNotificationRole(interaction, guildId) {
  const role = interaction.options.getRole('role');
  
  const success = await database.setNotificationRole(guildId, role ? role.id : null);
  if (success) {
    if (role) {
      await interaction.reply({
        content: `✅ Set ${role} as the notification role. This role will be pinged when Discord events are created.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '✅ Cleared notification role. No role will be pinged for Discord events.',
        flags: MessageFlags.Ephemeral
      });
    }
  } else {
    await interaction.reply({
      content: '❌ Failed to set notification role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function viewSettings(interaction, guildId) {
  try {
    const config = await database.getGuildConfig(guildId);
    
    if (!config) {
      await interaction.reply({
        content: '❌ Failed to retrieve guild configuration.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Server Configuration')
      .setDescription('Current bot settings for this server')
      .setColor(0x5865f2)
      .addFields(
        {
          name: '📺 Movie Channel',
          value: config.movie_channel_id ?
            `<#${config.movie_channel_id}>\n*Movies and cleanup restricted to this channel*` :
            'Not set\n*Bot works in any channel*',
          inline: false
        },
        {
          name: '🔧 Admin Channel',
          value: config.admin_channel_id ?
            `<#${config.admin_channel_id}>\n*Admin controls and movie management*` :
            'Not set\n*No admin channel configured*',
          inline: false
        },
        {
          name: '👑 Admin Roles',
          value: config.admin_roles && config.admin_roles.length > 0 ?
            `${config.admin_roles.map(id => `<@&${id}>`).join('\n')}\n*These roles can use admin commands*` :
            'None configured\n*Only Discord Administrators can use admin commands*',
          inline: false
        },
        {
          name: '🔔 Notification Role',
          value: config.notification_role_id ?
            `<@&${config.notification_role_id}>\n*This role gets pinged for Discord events*` :
            'Not set\n*No role notifications for events*',
          inline: false
        },
        {
          name: '🎤 Session Viewing Channel',
          value: config.session_viewing_channel_id ?
            `<#${config.session_viewing_channel_id}>\n*Bot tracks attendance during sessions in this channel*` :
            'Not set\n*No automatic attendance tracking*',
          inline: false
        }
      )
      .setFooter({ text: `Configuration for ${interaction.guild.name}` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error viewing settings:', error);
    await interaction.reply({
      content: '❌ Error retrieving configuration settings.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function resetConfiguration(interaction, guildId) {
  const success = await database.resetGuildConfig(guildId);
  if (success) {
    await interaction.reply({
      content: '✅ Server configuration reset. All settings cleared.',
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to reset server configuration.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function configureViewingChannel(interaction, guildId) {
  const channel = interaction.options.getChannel('channel');

  if (!channel) {
    await interaction.reply({
      content: '❌ Please specify a channel for session viewing.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Validate channel type (voice or text)
  if (![0, 2].includes(channel.type)) { // 0 = text, 2 = voice
    await interaction.reply({
      content: '❌ Please select a text or voice channel for session viewing.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.setViewingChannel(guildId, channel.id);
  if (success) {
    const channelType = channel.type === 2 ? 'voice' : 'text';
    await interaction.reply({
      content: `✅ Session viewing channel set to ${channel} (${channelType} channel). The bot will now track attendance during scheduled movie sessions.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set viewing channel.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function configureAdminChannel(interaction, guildId) {
  const channel = interaction.options.getChannel('channel');

  if (!channel) {
    await interaction.reply({
      content: '❌ Please specify a channel for admin operations.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Validate channel type (text only)
  if (channel.type !== 0) { // 0 = text
    await interaction.reply({
      content: '❌ Please select a text channel for admin operations.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.setAdminChannel(guildId, channel.id);
  if (success) {
    // Create admin control panel in the new admin channel
    try {
      const adminControls = require('./admin-controls');
      await adminControls.ensureAdminControlPanel(interaction.client, guildId);
    } catch (error) {
      console.error('Error creating admin control panel:', error);
    }

    await interaction.reply({
      content: `✅ Admin channel set to ${channel}. This channel will display admin controls and movie management tools.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set admin channel.',
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  configureMovieChannel,
  addAdminRole,
  removeAdminRole,
  setNotificationRole,
  configureViewingChannel,
  configureAdminChannel,
  viewSettings,
  resetConfiguration
};
