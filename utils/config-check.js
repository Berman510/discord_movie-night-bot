/**
 * Configuration Check Utility
 * Validates bot configuration and provides setup guidance
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ephemeralManager = require('./ephemeral-manager');

/**
 * Check if the bot is properly configured for a guild
 */
async function checkConfiguration(guildId) {
  const database = require('../database');
  
  if (!database.isConnected) {
    return {
      isConfigured: false,
      missingItems: ['Database connection'],
      message: '❌ **Database connection error**\n\nThe bot cannot connect to the database. Please contact the bot administrator.'
    };
  }

  try {
    const config = await database.getGuildConfig(guildId);
    const missingItems = [];

    if (!config) {
      return {
        isConfigured: false,
        missingItems: ['All configuration'],
        message: '⚙️ **Bot not configured**\n\nThis bot needs to be configured before use. Please run `/movie-configure` to set up the bot.'
      };
    }

    // Check required configuration items
    if (!config.movie_channel_id) {
      missingItems.push('Movie voting channel');
    }
    if (!config.admin_channel_id) {
      missingItems.push('Admin channel');
    }
    if (!config.session_viewing_channel_id) {
      missingItems.push('Session viewing channel');
    }
    if (!config.notification_role_id) {
      missingItems.push('Notification role');
    }
    if (!config.admin_roles || config.admin_roles.length === 0) {
      missingItems.push('Admin roles');
    }

    if (missingItems.length > 0) {
      return {
        isConfigured: false,
        missingItems,
        message: `⚙️ **Configuration incomplete**\n\nMissing configuration:\n${missingItems.map(item => `• ${item}`).join('\n')}\n\nPlease run \`/movie-configure\` to complete the setup.`
      };
    }

    return {
      isConfigured: true,
      missingItems: [],
      message: null
    };

  } catch (error) {
    console.error('Error checking configuration:', error);
    return {
      isConfigured: false,
      missingItems: ['Configuration check failed'],
      message: '❌ **Configuration check failed**\n\nThere was an error checking the bot configuration. Please try again or contact the bot administrator.'
    };
  }
}

/**
 * Send configuration error message with setup button
 */
async function sendConfigurationError(interaction, configCheck) {
  const configButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('open_configuration')
        .setLabel('⚙️ Configure Bot')
        .setStyle(ButtonStyle.Primary)
    );

  await ephemeralManager.sendEphemeral(interaction, configCheck.message, {
    components: [configButton]
  });
}

/**
 * Middleware function to check configuration before command execution
 */
async function requireConfiguration(interaction, next) {
  const configCheck = await checkConfiguration(interaction.guild.id);
  
  if (!configCheck.isConfigured) {
    await sendConfigurationError(interaction, configCheck);
    return false; // Stop execution
  }
  
  return true; // Continue execution
}

/**
 * Check if user has admin permissions for configuration
 */
async function checkConfigurationPermissions(interaction) {
  const { PermissionFlagsBits } = require('discord.js');
  
  // Check if user has Discord Administrator permission
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // Check if user has Manage Guild permission
  if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  return false;
}

/**
 * Handle configuration button click
 */
async function handleConfigurationButton(interaction) {
  // Check permissions
  const hasPermission = await checkConfigurationPermissions(interaction);
  
  if (!hasPermission) {
    await ephemeralManager.sendEphemeral(interaction,
      '❌ **Permission denied**\n\nYou need Administrator or Manage Server permissions to configure the bot.'
    );
    return;
  }

  // Show configuration options
  const configOptions = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_voting_channel')
        .setLabel('📺 Set Voting Channel')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_admin_channel')
        .setLabel('🔧 Set Admin Channel')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_viewing_channel')
        .setLabel('🎤 Set Viewing Channel')
        .setStyle(ButtonStyle.Secondary)
    );

  const configOptions2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_notification_role')
        .setLabel('🔔 Set Notification Role')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_admin_roles')
        .setLabel('👑 Set Admin Roles')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_show_guide')
        .setLabel('📖 Setup Guide')
        .setStyle(ButtonStyle.Primary)
    );

  await ephemeralManager.sendEphemeral(interaction,
    '⚙️ **Bot Configuration**\n\nChoose what you want to configure:',
    { components: [configOptions, configOptions2] }
  );
}

module.exports = {
  checkConfiguration,
  sendConfigurationError,
  requireConfiguration,
  checkConfigurationPermissions,
  handleConfigurationButton
};
