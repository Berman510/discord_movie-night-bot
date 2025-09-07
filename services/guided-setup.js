/**
 * Guided Setup Service
 * Interactive ephemeral-based configuration for easy bot setup
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType } = require('discord.js');
const ephemeralManager = require('../utils/ephemeral-manager');
const database = require('../database');

/**
 * Start the guided setup process
 */
async function startGuidedSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Movie Night Bot - Quick Setup')
    .setDescription(`Welcome! Let's get your Movie Night Bot configured in just a few steps.\n\n**What we'll set up:**\n• 📺 Voting channel (where movies are recommended)\n• 🔧 Admin channel (for bot management)\n• 🎤 Viewing channel (where you watch movies)\n• 👑 Admin roles (who can manage the bot)\n• 🔔 Viewer role (gets pinged for events)\n\n**Note:** The bot already has its own "${interaction.client.user.displayName}" role with required permissions.`)
    .setColor(0x5865f2)
    .setFooter({ text: 'This setup takes about 2 minutes' });

  const startButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_skip')
        .setLabel('⏭️ Skip Setup')
        .setStyle(ButtonStyle.Secondary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [startButton]
  });
}

/**
 * Show the main setup menu
 */
async function showSetupMenu(interaction, currentConfig = null) {
  await showSetupMenuWithMessage(interaction, currentConfig, null);
}

/**
 * Show the main setup menu with an optional success message
 */
async function showSetupMenuWithMessage(interaction, currentConfig = null, successMessage = null) {
  if (!currentConfig) {
    currentConfig = await database.getGuildConfig(interaction.guild.id) || {};
  }

  let description = 'Choose what to configure. ✅ = Configured, ❌ = Not set';
  if (successMessage) {
    description = `${successMessage}\n\n${description}`;
  }

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Bot Configuration Menu')
    .setDescription(description)
    .setColor(successMessage ? 0x57f287 : 0x5865f2)
    .addFields(
      {
        name: `${currentConfig.movie_channel_id ? '✅' : '❌'} Voting Channel`,
        value: currentConfig.movie_channel_id ? `<#${currentConfig.movie_channel_id}>` : 'Not configured',
        inline: true
      },
      {
        name: `${currentConfig.admin_channel_id ? '✅' : '❌'} Admin Channel`,
        value: currentConfig.admin_channel_id ? `<#${currentConfig.admin_channel_id}>` : 'Not configured',
        inline: true
      },
      {
        name: `${currentConfig.session_viewing_channel_id ? '✅' : '❌'} Viewing Channel`,
        value: currentConfig.session_viewing_channel_id ? `<#${currentConfig.session_viewing_channel_id}>` : 'Not configured',
        inline: true
      },
      {
        name: `${currentConfig.admin_roles?.length > 0 ? '✅' : '❌'} Admin Roles`,
        value: currentConfig.admin_roles?.length > 0 ? `${currentConfig.admin_roles.length} role(s)` : 'Not configured',
        inline: true
      },
      {
        name: `${currentConfig.notification_role_id ? '✅' : '❌'} Viewer Role`,
        value: currentConfig.notification_role_id ? `<@&${currentConfig.notification_role_id}>` : 'Not configured',
        inline: true
      }
    );

  const menuButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_voting_channel')
        .setLabel('📺 Voting Channel')
        .setStyle(currentConfig.movie_channel_id ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_admin_channel')
        .setLabel('🔧 Admin Channel')
        .setStyle(currentConfig.admin_channel_id ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_viewing_channel')
        .setLabel('🎤 Viewing Channel')
        .setStyle(currentConfig.session_viewing_channel_id ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

  const menuButtons2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_admin_roles')
        .setLabel('👑 Admin Roles')
        .setStyle(currentConfig.admin_roles?.length > 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_notification_role')
        .setLabel('🔔 Viewer Role')
        .setStyle(currentConfig.notification_role_id ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_finish')
        .setLabel('✅ Finish Setup')
        .setStyle(ButtonStyle.Primary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [menuButtons, menuButtons2]
  });
}

/**
 * Show voting channel selection
 */
async function showVotingChannelSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📺 Set Voting Channel')
    .setDescription('Choose the channel where users will recommend movies and vote.\n\n**Recommended:** A dedicated text channel like #movie-voting\n\n**Required Bot Permissions:**\n• View Channel\n• Send Messages\n• Embed Links\n• Add Reactions\n• Create Public Threads\n• Send Messages in Threads')
    .setColor(0x5865f2);

  const channelSelect = new ActionRowBuilder()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select_voting_channel')
        .setPlaceholder('Select a text or forum channel for voting')
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildForum)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [channelSelect, backButton]
  });
}

/**
 * Show admin channel selection
 */
async function showAdminChannelSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🔧 Set Admin Channel')
    .setDescription('Choose the channel for bot administration and session management.\n\n**Recommended:** A private admin channel like #movie-admin\n\n**Required Bot Permissions:**\n• View Channel\n• Send Messages\n• Embed Links\n• Manage Messages (for admin controls)')
    .setColor(0x5865f2);

  const channelSelect = new ActionRowBuilder()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select_admin_channel')
        .setPlaceholder('Select a text channel for admin controls')
        .setChannelTypes(ChannelType.GuildText)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [channelSelect, backButton]
  });
}

/**
 * Show viewing channel selection
 */
async function showViewingChannelSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🎤 Set Viewing Channel')
    .setDescription('Choose the voice channel where you watch movies together.\n\n**Recommended:** A voice channel like #movie-night-vc\n\n**Required Bot Permissions:**\n• View Channel\n• Connect (to track attendance)\n• Create Events (for scheduled sessions)')
    .setColor(0x5865f2);

  const channelSelect = new ActionRowBuilder()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select_viewing_channel')
        .setPlaceholder('Select a voice channel for watching movies')
        .setChannelTypes(ChannelType.GuildVoice)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [channelSelect, backButton]
  });
}

/**
 * Show admin roles selection
 */
async function showAdminRolesSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('👑 Set Admin Roles')
    .setDescription('Choose roles that can manage the bot (in addition to Discord Administrators).\n\n**What Admin Roles Can Do:**\n• Create and manage movie sessions\n• Use admin control panel\n• Schedule and manage movies\n• Access cleanup and maintenance tools\n\n**Optional:** You can skip this if only Discord Admins should manage the bot.')
    .setColor(0x5865f2);

  const roleSelect = new ActionRowBuilder()
    .addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('setup_select_admin_roles')
        .setPlaceholder('Select roles that can manage the bot')
        .setMaxValues(5)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_skip_admin_roles')
        .setLabel('⏭️ Skip This Step')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [roleSelect, backButton]
  });
}

/**
 * Show notification role selection
 */
async function showNotificationRoleSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🔔 Set Viewer Role')
    .setDescription('Choose a role to ping when movie sessions are scheduled.\n\n**What This Role Gets:**\n• Notifications when new movie sessions are created\n• Pings for upcoming movie nights\n• Access to participate in voting and sessions\n\n**Suggested Names:** @Movie Viewers, @Movie Night, @Cinema Club\n\n**Optional:** You can skip this if you don\'t want role notifications.')
    .setColor(0x5865f2);

  const roleSelect = new ActionRowBuilder()
    .addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('setup_select_notification_role')
        .setPlaceholder('Select a role to notify for movie sessions')
        .setMaxValues(1)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_skip_notification_role')
        .setLabel('⏭️ Skip This Step')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [roleSelect, backButton]
  });
}

/**
 * Handle setup completion
 */
async function showSetupComplete(interaction) {
  const config = await database.getGuildConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('🎉 Setup Complete!')
    .setDescription('Your Movie Night Bot is now configured and ready to use!')
    .setColor(0x57f287)
    .addFields(
      {
        name: '🎬 What\'s Next?',
        value: '• Use `/movie-night action:create-session` to create your first movie session\n• Users can recommend movies with the 🍿 button in your voting channel\n• Manage everything from your admin channel',
        inline: false
      },
      {
        name: '📚 Need Help?',
        value: 'Use `/movie-night action:help` for detailed usage instructions',
        inline: false
      }
    );

  const actionButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_create_first_session')
        .setLabel('🎬 Create First Session')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('⚙️ Back to Config')
        .setStyle(ButtonStyle.Secondary)
    );

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
    components: [actionButtons]
  });
}

/**
 * Handle channel selection
 */
async function handleChannelSelection(interaction, channelType) {
  const selectedChannel = interaction.values[0];
  const channel = interaction.guild.channels.cache.get(selectedChannel);

  let success = false;
  let message = '';

  try {
    switch (channelType) {
      case 'voting':
        success = await database.setMovieChannel(interaction.guild.id, selectedChannel);
        message = success ?
          `✅ **Voting channel set to ${channel}**\n\nUsers can now recommend movies here!` :
          '❌ Failed to set voting channel.';
        break;

      case 'admin':
        success = await database.setAdminChannel(interaction.guild.id, selectedChannel);
        if (success) {
          // Create admin control panel in the new admin channel
          try {
            const adminControls = require('./admin-controls');
            await adminControls.ensureAdminControlPanel(interaction.client, interaction.guild.id);
          } catch (error) {
            console.error('Error creating admin control panel:', error);
          }
        }
        message = success ?
          `✅ **Admin channel set to ${channel}**\n\nAdmin controls will appear here!` :
          '❌ Failed to set admin channel.';
        break;

      case 'viewing':
        success = await database.setViewingChannel(interaction.guild.id, selectedChannel);
        message = success ?
          `✅ **Viewing channel set to ${channel}**\n\nThe bot will track attendance during movie sessions!` :
          '❌ Failed to set viewing channel.';
        break;
    }

    // Show the menu with success message embedded
    const updatedConfig = await database.getGuildConfig(interaction.guild.id);
    await showSetupMenuWithMessage(interaction, updatedConfig, message);

  } catch (error) {
    console.error('Error handling channel selection:', error);
    await ephemeralManager.sendEphemeral(interaction, '❌ An error occurred while setting the channel.');
  }
}

/**
 * Handle role selection
 */
async function handleRoleSelection(interaction, roleType) {
  const selectedRoles = interaction.values;

  let success = false;
  let message = '';

  try {
    switch (roleType) {
      case 'admin':
        // Add all selected roles as admin roles
        for (const roleId of selectedRoles) {
          await database.addAdminRole(interaction.guild.id, roleId);
        }
        success = true;
        const roleNames = selectedRoles.map(id => `<@&${id}>`).join(', ');
        message = `✅ **Admin roles set:** ${roleNames}\n\nThese roles can now manage the bot!`;
        break;

      case 'notification':
        const roleId = selectedRoles[0]; // Only one role for notifications
        success = await database.setNotificationRole(interaction.guild.id, roleId);
        message = success ?
          `✅ **Notification role set to <@&${roleId}>**\n\nThis role will be pinged for movie sessions!` :
          '❌ Failed to set notification role.';
        break;
    }

    // Show the menu with success message embedded
    const updatedConfig = await database.getGuildConfig(interaction.guild.id);
    await showSetupMenuWithMessage(interaction, updatedConfig, message);

  } catch (error) {
    console.error('Error handling role selection:', error);
    await ephemeralManager.sendEphemeral(interaction, '❌ An error occurred while setting the roles.');
  }
}

module.exports = {
  startGuidedSetup,
  showSetupMenu,
  showSetupMenuWithMessage,
  showVotingChannelSetup,
  showAdminChannelSetup,
  showViewingChannelSetup,
  showAdminRolesSetup,
  showNotificationRoleSetup,
  showSetupComplete,
  handleChannelSelection,
  handleRoleSelection
};
