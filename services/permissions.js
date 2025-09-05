/**
 * Permissions Service
 * Handles permission checking for bot commands
 */

const { PermissionFlagsBits } = require('discord.js');
const database = require('../database');

async function checkMovieAdminPermission(interaction) {
  // Check if user has Discord Administrator permission
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // Check if user has configured admin role
  if (database.isConnected) {
    try {
      const config = await database.getGuildConfig(interaction.guild.id);
      if (config && config.admin_roles && config.admin_roles.length > 0) {
        const userRoles = interaction.member.roles.cache.map(role => role.id);
        return config.admin_roles.some(roleId => userRoles.includes(roleId));
      }
    } catch (error) {
      console.error('Error checking admin roles:', error.message);
    }
  }

  return false;
}

async function checkChannelPermission(interaction, requiredChannel = null) {
  if (!database.isConnected) return true; // Allow if database not available

  try {
    const config = await database.getGuildConfig(interaction.guild.id);
    
    // If no movie channel is configured, allow anywhere
    if (!config || !config.movie_channel_id) {
      return true;
    }

    // If specific channel required, check against that
    if (requiredChannel) {
      return interaction.channel.id === requiredChannel;
    }

    // Check against configured movie channel
    return interaction.channel.id === config.movie_channel_id;
  } catch (error) {
    console.error('Error checking channel permission:', error.message);
    return true; // Allow on error
  }
}

function hasManageChannelsPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ManageChannels);
}

function hasCreateThreadsPermission(member) {
  return member.permissions.has(PermissionFlagsBits.CreatePublicThreads);
}

function hasSendMessagesPermission(member) {
  return member.permissions.has(PermissionFlagsBits.SendMessages);
}

module.exports = {
  checkMovieAdminPermission,
  checkChannelPermission,
  hasManageChannelsPermission,
  hasCreateThreadsPermission,
  hasSendMessagesPermission
};
