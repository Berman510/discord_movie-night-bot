/**
 * Setup Guide Service Module
 * Provides comprehensive setup instructions for Movie Night Bot
 */

const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Show the main setup guide for administrators
 */
async function showSetupGuide(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Movie Night Bot Setup Guide')
    .setDescription('Complete setup instructions for administrators')
    .setColor(0x5865f2)
    .addFields(
      {
        name: '📋 Overview',
        value: 'This guide will help you set up Movie Night Bot for your server. Follow each step to configure channels, roles, and permissions.',
        inline: false
      },
      {
        name: '🔧 Quick Setup',
        value: 'Use the buttons below to jump to specific setup sections, or scroll down for detailed instructions.',
        inline: false
      }
    )
    .setFooter({ text: 'Movie Night Bot Setup Guide' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_channels')
        .setLabel('📺 Channels')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_roles')
        .setLabel('👥 Roles')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_permissions')
        .setLabel('🔒 Permissions')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_configuration')
        .setLabel('⚙️ Configuration')
        .setStyle(ButtonStyle.Success)
    );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Show channel setup instructions
 */
async function showChannelSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📺 Channel Setup Guide')
    .setDescription('Create the required channels for Movie Night Bot')
    .setColor(0x5865f2)
    .addFields(
      {
        name: '1️⃣ Movie Recommendations Channel (Public)',
        value: `**Purpose:** Where users recommend movies and vote
**Type:** Text Channel
**Visibility:** Public (all members can see and participate)
**Permissions Needed:**
• Bot: Send Messages, Embed Links, Add Reactions, Manage Messages, Create Public Threads
• Members: Send Messages, Add Reactions, Use Slash Commands`,
        inline: false
      },
      {
        name: '2️⃣ Watch Party Channel (Public)',
        value: `**Purpose:** Where watch parties happen and attendance is tracked
**Type:** Voice Channel OR Text Channel
**Visibility:** Public (all members can join)
**Permissions Needed:**
• Bot: View Channel, Connect (voice), Send Messages (text)
• Members: View Channel, Connect (voice), Send Messages (text)`,
        inline: false
      },
      {
        name: '3️⃣ Admin Maintenance Channel (Private)',
        value: `**Purpose:** Admin controls, movie management, and bot maintenance
**Type:** Text Channel
**Visibility:** Private (admin roles only)
**Permissions Needed:**
• Bot: Send Messages, Embed Links, Add Reactions, Manage Messages
• Admin Roles: View Channel, Send Messages, Use Slash Commands
• @everyone: Deny View Channel`,
        inline: false
      }
    )
    .setFooter({ text: 'Next: Set up roles with the Roles button' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_guide_back')
        .setLabel('← Back to Guide')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_roles')
        .setLabel('Next: Roles →')
        .setStyle(ButtonStyle.Primary)
    );

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

/**
 * Show role setup instructions
 */
async function showRoleSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('👥 Role Setup Guide')
    .setDescription('Create the required roles for Movie Night Bot')
    .setColor(0x5865f2)
    .addFields(
      {
        name: '1️⃣ Movie Night Viewers Role',
        value: `**Purpose:** Members who participate in movie nights
**Permissions:** Standard member permissions
**Features:**
• Get pinged for movie night events
• Can vote on movie recommendations
• Can join movie sessions
• Tracked for attendance during sessions`,
        inline: false
      },
      {
        name: '2️⃣ Movie Night Mods Role',
        value: `**Purpose:** Moderators who manage movie nights
**Permissions:** Moderate permissions + admin channel access
**Features:**
• Access to admin maintenance channel
• Can schedule movies from recommendations
• Can ban movies from being recommended
• Can use admin commands and controls
• Can manage movie sessions and events`,
        inline: false
      },
      {
        name: '💡 Role Assignment Tips',
        value: `• Make roles mentionable for notifications
• Consider role hierarchy (Mods above Viewers)
• Use distinctive colors for easy identification
• Set up role assignment methods (reactions, commands, etc.)`,
        inline: false
      }
    )
    .setFooter({ text: 'Next: Configure permissions with the Permissions button' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_channels')
        .setLabel('← Back to Channels')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_permissions')
        .setLabel('Next: Permissions →')
        .setStyle(ButtonStyle.Primary)
    );

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

/**
 * Show permission setup instructions
 */
async function showPermissionSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🔒 Permission Setup Guide')
    .setDescription('Configure channel permissions for optimal bot operation')
    .setColor(0x5865f2)
    .addFields(
      {
        name: '📺 Movie Recommendations Channel',
        value: `**Bot Permissions:**
✅ View Channel, Send Messages, Embed Links
✅ Add Reactions, Manage Messages
✅ Create Public Threads, Send Messages in Threads
✅ Use Slash Commands

**Member Permissions:**
✅ View Channel, Send Messages, Add Reactions
✅ Use Slash Commands, Read Message History`,
        inline: false
      },
      {
        name: '🎪 Movie Viewing Channel',
        value: `**For Voice Channels:**
✅ Bot: View Channel, Connect, Speak (optional)
✅ Members: View Channel, Connect, Speak

**For Text Channels:**
✅ Bot: View Channel, Send Messages, Read Message History
✅ Members: View Channel, Send Messages, Read Message History`,
        inline: false
      },
      {
        name: '🔧 Admin Maintenance Channel',
        value: `**Bot Permissions:**
✅ View Channel, Send Messages, Embed Links
✅ Add Reactions, Manage Messages
✅ Use Slash Commands

**Admin Role Permissions:**
✅ View Channel, Send Messages, Use Slash Commands
✅ Read Message History, Add Reactions

**@everyone Permissions:**
❌ View Channel (DENY)`,
        inline: false
      }
    )
    .setFooter({ text: 'Next: Configure the bot with the Configuration button' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_roles')
        .setLabel('← Back to Roles')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_configuration')
        .setLabel('Next: Configuration →')
        .setStyle(ButtonStyle.Success)
    );

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

/**
 * Show bot configuration instructions
 */
async function showConfigurationSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Bot Configuration Guide')
    .setDescription('Configure Movie Night Bot using slash commands')
    .setColor(0x57f287)
    .addFields(
      {
        name: '1️⃣ Configure Channels',
        value: `Use \`/movie-configure\` to set up your channels:
• \`action:set-voting-channel\` - Set movie recommendations/voting channel
• \`action:set-viewing-channel\` - Set movie viewing channel
• \`action:set-admin-channel\` - Set admin maintenance channel`,
        inline: false
      },
      {
        name: '2️⃣ Configure Roles',
        value: `Set up admin and notification roles:
• \`action:add-admin-role\` - Add Movie Night Mods role
• \`action:set-notification-role\` - Set Movie Night Viewers role for pings`,
        inline: false
      },
      {
        name: '3️⃣ Verify Setup',
        value: `Check your configuration:
• \`action:view-settings\` - View current bot settings
• Test movie recommendations in your movie channel
• Verify admin controls appear in admin channel`,
        inline: false
      },
      {
        name: '🎉 You\'re Ready!',
        value: `Once configured, your server will have:
✅ Movie recommendation and voting system
✅ Session scheduling and attendance tracking
✅ Admin controls for movie management
✅ Automated Discord event creation`,
        inline: false
      }
    )
    .setFooter({ text: 'Setup complete! Use /movie-configure to get started.' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_permissions')
        .setLabel('← Back to Permissions')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_guide_back')
        .setLabel('← Back to Guide')
        .setStyle(ButtonStyle.Primary)
    );

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

module.exports = {
  showSetupGuide,
  showChannelSetup,
  showRoleSetup,
  showPermissionSetup,
  showConfigurationSetup
};
