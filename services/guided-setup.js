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
    .setDescription(`Welcome! Let's get your Movie Night Bot configured in just a few steps.\n\n**What we'll set up:**\n• 📺 Voting channel (where movies are recommended)\n• 🔧 Admin channel (for bot management)\n• 🎬 Watch Party Channel (where you watch movies)\n• 👑 Admin roles (who can manage the bot)\n• 👥 Voting Roles (also used for announcements)\n\n**Note:** The bot already has its own "${interaction.client.user.displayName}" role with required permissions.\n\n**Prefer a browser?** Manage the bot (minus voting) from the dashboard: https://movienight.bermanoc.net`)
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

  const baseDesc = 'Choose what to configure. ✅ = Configured, ❌ = Not set\n\nTip: You can also manage via the Web Dashboard: https://movienight.bermanoc.net (minus voting)';
  let description = baseDesc;
  if (successMessage) {
    description = `${successMessage}\n\n${baseDesc}`;
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
        name: `${currentConfig.watch_party_channel_id ? '✅' : '❌'} Watch Party Channel`,
        value: currentConfig.watch_party_channel_id ? `<#${currentConfig.watch_party_channel_id}>` : 'Not configured',
        inline: true
      },
      {
        name: `${currentConfig.admin_roles?.length > 0 ? '✅' : '❌'} Admin Roles`,
        value: currentConfig.admin_roles?.length > 0 ? `${currentConfig.admin_roles.length} role(s)` : 'Not configured',
        inline: true
      },
      {
        name: `${currentConfig.moderator_roles?.length > 0 ? '✅' : '❌'} Moderator Roles`,
        value: currentConfig.moderator_roles?.length > 0 ? `${currentConfig.moderator_roles.length} role(s)` : 'Not configured',
        inline: true
      },
      {
        name: `${currentConfig.voting_roles?.length > 0 ? '✅' : '❌'} Voting Roles`,
        value: currentConfig.voting_roles?.length > 0 ? `${currentConfig.voting_roles.length} role(s)` : 'Not configured',
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
        .setCustomId('setup_watch_party_channel')
        .setLabel('🎬 Watch Party Channel')
        .setStyle(currentConfig.watch_party_channel_id ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

  const menuButtons2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_admin_roles')
        .setLabel('👑 Admin Roles')
        .setStyle(currentConfig.admin_roles?.length > 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_moderator_roles')
        .setLabel('🛡️ Moderator Roles')
        .setStyle(currentConfig.moderator_roles?.length > 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_voting_roles')
        .setLabel('👥 Voting Roles')
        .setStyle(currentConfig.voting_roles?.length > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

  const menuButtons3 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_finish')
        .setLabel('✅ Finish Setup')
        .setStyle(ButtonStyle.Primary)
    );

  // Use update if this is a button interaction, otherwise send new
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    await interaction.update({
      content: '',
      embeds: [embed],
      components: [menuButtons, menuButtons2, menuButtons3]
    });
  } else {
    await ephemeralManager.sendEphemeral(interaction, '', {
      embeds: [embed],
      components: [menuButtons, menuButtons2, menuButtons3]
    });
  }
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

  await interaction.update({
    content: '',
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

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [channelSelect, backButton]
  });
}

/**
 * Show Watch Party Channel selection
 */
async function showWatchPartyChannelSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Set Watch Party Channel')
    .setDescription('Choose the channel where you host watch parties together.\n\n**Recommended:** A voice channel like #movie-night-vc (or a text channel if you prefer chat-only)\n\n**Required Bot Permissions:**\n• View Channel\n• Connect (to track attendance)\n• Create Events (for scheduled sessions)')
    .setColor(0x5865f2);

  const channelSelect = new ActionRowBuilder()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select_watch_party_channel')
        .setPlaceholder('Select a channel for watch parties (voice or text)')
        .setChannelTypes(ChannelType.GuildVoice)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({
    content: '',
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

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [roleSelect, backButton]
  });
}

/**
 * Show moderator roles selection
 */
async function showModeratorRolesSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Configure Moderator Roles')
    .setDescription('Select roles that can moderate movies and sessions.\n\n**Moderators can:**\n• Sync channels and manage movie queue\n• Cancel and reschedule sessions\n• View guild stats and banned movies\n• Access moderation controls\n\n**Note:** Admin roles automatically have moderator permissions.')
    .setColor(0x5865f2)
    .setFooter({ text: 'Optional - You can skip this step' });

  const roleSelect = new ActionRowBuilder()
    .addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('setup_select_moderator_roles')
        .setPlaceholder('Select roles for movie moderation')
        .setMaxValues(10)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_skip_moderator_roles')
        .setLabel('⏭️ Skip This Step')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [roleSelect, backButton]
  });
}

/**
 * Show voting roles selection
 */
async function showVotingRolesSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('👥 Configure Voting Roles')
    .setDescription('Select roles that are allowed to vote. These roles will also be pinged for announcements.')
    .setColor(0x5865f2);

  const roleSelect = new ActionRowBuilder()
    .addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('setup_select_voting_roles')
        .setPlaceholder('Select roles allowed to vote (also used for announcements)')
        .setMaxValues(25)
    );

  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('← Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({
    content: '',
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
        value: '• Use `/movie-night action:create-session` to create your first movie session\n• Users can recommend movies with the 🍿 button in your voting channel\n• Manage everything from your admin channel\n• Or manage via the Web Dashboard: https://movienight.bermanoc.net (minus voting)',
        inline: false
      },
      {
        name: '📚 Need Help?',
        value: 'Use `/movie-night action:help` for detailed usage instructions, or visit the Web Dashboard: https://movienight.bermanoc.net',
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

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [actionButtons]
  });
}

/**
 * Handle channel selection with safety checks
 */
async function handleChannelSelection(interaction, channelType) {
  const selectedChannel = interaction.values[0];
  const channel = interaction.guild.channels.cache.get(selectedChannel);

  // Check if channel has existing messages (safety check)
  const hasExistingContent = await checkChannelForExistingContent(channel);

  if (hasExistingContent) {
    // Show confirmation dialog for existing channel
    await showChannelSafetyConfirmation(interaction, channel, channelType);
    return;
  }

  // Channel is safe, proceed with configuration
  await configureChannelDirectly(interaction, channel, channelType);
}

/**
 * Check if channel has existing content
 */
async function checkChannelForExistingContent(channel) {
  try {
    // For forum channels, check for existing threads
    if (channel.type === 15) { // Forum channel
      const threads = await channel.threads.fetchActive();
      const archivedThreads = await channel.threads.fetchArchived({ limit: 10 });
      return threads.threads.size > 0 || archivedThreads.threads.size > 0;
    }

    // For text channels, check for existing messages
    const messages = await channel.messages.fetch({ limit: 10 });
    return messages.size > 0;
  } catch (error) {
    // If we can't check, assume it's safe
    return false;
  }
}

/**
 * Show channel safety confirmation dialog
 */
async function showChannelSafetyConfirmation(interaction, channel, channelType) {
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const channelTypeNames = {
    'voting': 'Voting Channel',
    'admin': 'Admin Channel',
    'viewing': 'Watch Party Channel'
  };

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Channel Safety Warning')
    .setDescription(`**${channel}** appears to have existing content.\n\n**⚠️ STRONGLY RECOMMENDED:** Use dedicated channels for the Movie Night Bot to avoid conflicts with existing content.\n\n**🏗️ Consider creating a dedicated category:**\n• \`#movie-voting\` - For movie recommendations and voting\n• \`#movie-admin\` - For bot administration (private)\n• \`#movie-night-vc\` - Voice channel for watching together\n\n**Required Permissions:**\n${getChannelPermissionInfo(channelType)}\n\n**Are you sure you want to use this existing channel?**`)
    .setColor(0xfee75c)
    .setFooter({ text: 'Using existing channels may cause conflicts with other content' });

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_confirm_channel_${channelType}_${channel.id}`)
        .setLabel('⚠️ Use Existing Channel')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('setup_create_category')
        .setLabel('🏗️ Create Dedicated Category')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`setup_${channelType}_channel`)
        .setLabel('🔙 Choose Different Channel')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [buttons]
  });
}

/**
 * Get permission info for channel type
 */
function getChannelPermissionInfo(channelType) {
  switch (channelType) {
    case 'voting':
      return '**Bot Permissions:**\n• View Channel\n• Send Messages\n• Embed Links\n• Add Reactions\n• Create Public Threads\n• Send Messages in Threads\n• Manage Threads (delete/archive)\n• Manage Messages (delete/edit)\n\n**User Permissions:**\n• View Channel\n• Create Public Threads\n• Send Messages in Threads\n• Add Reactions\n• Read Message History\n\n*Note: Users should NOT have "Send Messages" in main channel - only in threads*';
    case 'admin':
      return '**Bot Permissions:**\n• View Channel\n• Send Messages\n• Embed Links\n• Manage Messages\n• Manage Threads\n• Add Reactions\n\n**User Permissions:**\n• View Channel (Admins/Mods only)\n• Send Messages (Admins/Mods only)\n• Add Reactions (Admins/Mods only)\n• Read Message History';
    case 'viewing':
      return '**Bot Permissions:**\n• View Channel\n• Connect\n• Create Events\n• Manage Events\n\n**User Permissions:**\n• View Channel\n• Connect\n• Speak (optional)\n• Use Voice Activity';
    default:
      return '• View Channel\n• Send Messages';
  }
}

/**
 * Configure channel directly (after safety check passed)
 */
async function configureChannelDirectly(interaction, channel, channelType) {
  let success = false;
  let message = '';

  try {
    switch (channelType) {
      case 'voting':
        success = await database.setMovieChannel(interaction.guild.id, channel.id);
        message = success ?
          `✅ **Voting channel set to ${channel}**\n\nUsers can now recommend movies here!` :
          '❌ Failed to set voting channel.';
        break;

      case 'admin':
        success = await database.setAdminChannel(interaction.guild.id, channel.id);
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
          `✅ **Admin channel set to ${channel}**\n\nAdmin controls will appear here!\n\n🌐 You can also manage from the Web Dashboard: https://movienight.bermanoc.net` :
          '❌ Failed to set admin channel.';
        break;

      case 'viewing':
        success = await database.setWatchPartyChannel(interaction.guild.id, channel.id);
        message = success ?
          `✅ **Watch Party Channel set to ${channel}**\n\nThe bot will track attendance during movie sessions!` :
          '❌ Failed to set watch party channel.';
        break;
    }

    // Show the menu with success message embedded
    const updatedConfig = await database.getGuildConfig(interaction.guild.id);
    await showSetupMenuWithMessage(interaction, updatedConfig, message);

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error handling channel selection:', error);
    await interaction.update({
      content: '❌ An error occurred while setting the channel.',
      embeds: [],
      components: []
    });
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
        for (const roleId of selectedRoles) {
          await database.addAdminRole(interaction.guild.id, roleId);
        }
        success = true;
        const roleNames = selectedRoles.map(id => `<@&${id}>`).join(', ');
        message = `✅ **Admin roles set:** ${roleNames}\n\nThese roles can now manage the bot!`;
        break;

      case 'moderator':
        for (const roleId of selectedRoles) {
          await database.addModeratorRole(interaction.guild.id, roleId);
        }
        success = true;
        const modRoleNames = selectedRoles.map(id => `<@&${id}>`).join(', ');
        message = `✅ **Moderator roles set:** ${modRoleNames}\n\nThese roles can now moderate movies and sessions!`;
        break;

      case 'voting':
        for (const roleId of selectedRoles) {
          await database.addVotingRole(interaction.guild.id, roleId);
        }
        success = true;
        const votingRoleNames = selectedRoles.map(id => `<@&${id}>`).join(', ');
        message = `✅ **Voting roles set:** ${votingRoleNames}\n\nMembers with these roles can vote and will be pinged for announcements.`;
        break;
    }

    // Show the menu with success message embedded
    const updatedConfig = await database.getGuildConfig(interaction.guild.id);
    await showSetupMenuWithMessage(interaction, updatedConfig, message);

  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error handling role selection:', error);
    await interaction.update({
      content: '❌ An error occurred while setting the roles.',
      embeds: [],
      components: []
    });
  }
}

/**
 * Handle channel confirmation after safety warning
 */
async function handleChannelConfirmation(interaction, channelType, channelId) {
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    await interaction.update({
      content: '❌ Channel not found. Please try again.',
      embeds: [],
      components: []
    });
    return;
  }

  await configureChannelDirectly(interaction, channel, channelType);
}

/**
 * Show category creation guide
 */
async function showCategoryCreationGuide(interaction) {
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const embed = new EmbedBuilder()
    .setTitle('🏗️ Create Dedicated Movie Night Category')
    .setDescription(`**Recommended Setup:**\n\n**1. Create a new category:** \`Movie Night\`\n\n**2. Create these channels in the category:**\n• \`#movie-voting\` (Forum Channel) - For movie recommendations\n• \`#movie-admin\` (Text Channel, Private) - For bot administration\n• \`#movie-night-vc\` (Voice Channel) - For watching together\n\n**3. Set permissions carefully:**\n\n**Movie Voting (Forum):**\n• Everyone: View Channel, Create Threads, Send Messages in Threads, Add Reactions\n• Bot: View, Send Messages, Embed Links, Create Threads, Manage Threads, Manage Messages\n• **Important:** Users should NOT have "Send Messages" in main channel\n\n**Movie Admin (Text, Private):**\n• Admins/Mods only: View Channel, Send Messages, Add Reactions\n• Bot: View, Send Messages, Embed Links, Manage Messages\n• Everyone else: No access\n\n**Movie Night VC (Voice):**\n• Everyone: View Channel, Connect, Speak\n• Bot: View, Connect, Create Events, Manage Events\n\n**After creating the channels, return here to configure them!**`)
    .setColor(0x57f287)
    .setFooter({ text: 'Proper permissions are crucial for bot functionality' });

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back_to_menu')
        .setLabel('🔙 Back to Setup')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [buttons]
  });
}

module.exports = {
  startGuidedSetup,
  showSetupMenu,
  showSetupMenuWithMessage,
  showVotingChannelSetup,
  showAdminChannelSetup,
  showWatchPartyChannelSetup,
  showAdminRolesSetup,
  showModeratorRolesSetup,
  showVotingRolesSetup,

  showSetupComplete,
  handleChannelSelection,
  handleRoleSelection,
  handleChannelConfirmation,
  showCategoryCreationGuide
};
