/**
 * Configuration Service Module
 * Handles server configuration and settings management
 *
 * TODO: Watch Party Channel Configuration
 * - Add configuration for session viewing channel (voice/text channel where movie nights happen)
 * - Add database field for watch_party_channel_id in guild_config table
 * - Add configuration command: /movienight-configure action:set-watch-party-channel
 * - This channel would be monitored during scheduled session times for automatic participant tracking
 * - Could support both voice channels (for watch parties) and text channels (for chat-based viewing)
 * - Add validation to ensure configured channel exists and bot has proper permissions
 */

const { MessageFlags, EmbedBuilder } = require('discord.js');
const database = require('../database');

async function configureMovieChannel(interaction, guildId) {
  const channel = interaction.options?.getChannel('channel');
  const forumChannels = require('./forum-channels');

  // If no channel specified (button interaction), show channel selector
  if (!channel) {
    const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');

    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('config_select_voting_channel')
      .setPlaceholder('Select a channel for movie voting')
      .setChannelTypes([ChannelType.GuildText, ChannelType.GuildForum]);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content:
        '🎬 **Select Voting Channel**\n\nChoose a Text channel or Forum channel for movie recommendations:',
      embeds: [],
      components: [row],
    });
    return;
  }

  // Validate channel type
  if (!forumChannels.isTextChannel(channel) && !forumChannels.isForumChannel(channel)) {
    await interaction.update({
      content: '❌ Movie channel must be a Text channel or Forum channel.',
      embeds: [],
      components: [],
    });
    return;
  }

  const success = await database.setMovieChannel(guildId, channel.id);
  if (success) {
    const channelType = forumChannels.getChannelTypeString(channel);
    const description = forumChannels.isForumChannel(channel)
      ? 'Each movie recommendation will create a new forum post for voting and discussion.'
      : 'Movie recommendations will be posted as messages with voting buttons and discussion threads.';

    await interaction.update({
      content: `✅ **Movie channel set to ${channel}**\n\n📋 **Channel Type**: ${channelType}\n🎬 **Behavior**: ${description}\n\n🔧 Cleanup commands will only work in this channel.`,
      embeds: [],
      components: [],
    });
  } else {
    await interaction.update({
      content: '❌ Failed to set movie channel.',
      embeds: [],
      components: [],
    });
  }
}

async function addAdminRole(interaction, guildId) {
  const role = interaction.options?.getRole('role');

  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to add as admin.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const success = await database.addAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ Added ${role} as an admin role. Members with this role can now use admin commands.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to add admin role.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function removeAdminRole(interaction, guildId) {
  const role = interaction.options?.getRole('role');

  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to remove from admin.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const success = await database.removeAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ Removed ${role} from admin roles.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to remove admin role.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function viewSettings(interaction, guildId) {
  try {
    const config = await database.getGuildConfig(guildId);

    if (!config) {
      await interaction.reply({
        content: '❌ Failed to retrieve guild configuration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Server Configuration')
      .setDescription('Current bot settings for this server')
      .setColor(0x5865f2)
      .addFields(
        {
          name: '📺 Movie Voting Channel',
          value: config.movie_channel_id
            ? `<#${config.movie_channel_id}>\n*Movies and cleanup restricted to this channel*`
            : 'Not set\n*Bot works in any channel*',
          inline: false,
        },
        {
          name: '🔧 Admin Channel',
          value: config.admin_channel_id
            ? `<#${config.admin_channel_id}>\n*Admin controls and movie management*`
            : 'Not set\n*No admin channel configured*',
          inline: false,
        },
        {
          name: '👑 Admin Roles',
          value:
            config.admin_roles && config.admin_roles.length > 0
              ? `${config.admin_roles.map((id) => `<@&${id}>`).join('\n')}\n*These roles can use admin commands*`
              : 'None configured\n*Only Discord Administrators can use admin commands*',
          inline: false,
        },
        {
          name: '🛡️ Moderator Roles',
          value:
            config.moderator_roles && config.moderator_roles.length > 0
              ? `${config.moderator_roles.map((id) => `<@&${id}>`).join('\n')}\n*These roles can moderate movies and sessions*`
              : 'None configured\n*Only admins can moderate*',
          inline: false,
        },
        {
          name: '👥 Voting Roles (used for announcements)',
          value:
            config.voting_roles && config.voting_roles.length > 0
              ? `${config.voting_roles.map((id) => `<@&${id}>`).join('\n')}\n*Also used for event announcement pings*`
              : 'None configured\n*Only Admins/Moderators can vote; no announcement pings will be sent*',
          inline: false,
        },
        {
          name: '🎥 Watch Party Channel',
          value: config.watch_party_channel_id
            ? `<#${config.watch_party_channel_id}>\n*Bot tracks attendance during sessions in this channel*`
            : 'Not set\n*No automatic attendance tracking*',
          inline: false,
        }
      )
      .setFooter({ text: `Configuration for ${interaction.guild.name}` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error viewing settings:', error);
    await interaction.reply({
      content: '❌ Error retrieving configuration settings.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function resetConfiguration(interaction, guildId) {
  const success = await database.resetGuildConfig(guildId);
  if (success) {
    await interaction.reply({
      content: '✅ Server configuration reset. All settings cleared.',
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to reset server configuration.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function configureWatchPartyChannel(interaction, guildId) {
  const channel = interaction.options?.getChannel('channel');

  // If no channel specified (button interaction), show channel selector
  if (!channel) {
    const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');

    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('config_select_watch_party_channel')
      .setPlaceholder('Select a channel for watch parties')
      .setChannelTypes([ChannelType.GuildText]);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content:
        '🎥 **Select Watch Party Channel**\n\nChoose a Text channel where watch parties will be coordinated:',
      embeds: [],
      components: [row],
    });
    return;
  }

  // Validate channel type (voice or text)
  if (![0, 2].includes(channel.type)) {
    // 0 = text, 2 = voice
    await interaction.reply({
      content: '❌ Please select a text or voice channel for session viewing.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const success = await database.setWatchPartyChannel(guildId, channel.id);
  if (success) {
    const channelType = channel.type === 2 ? 'voice' : 'text';
    await interaction.reply({
      content: `✅ Watch Party Channel set to ${channel} (${channelType} channel). The bot will now track attendance during scheduled movie sessions.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set watch party channel.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function configureVoteCaps(interaction, guildId) {
  const cfg = await database.getGuildConfig(guildId).catch(() => null);
  const enabled =
    cfg && typeof cfg.vote_cap_enabled !== 'undefined'
      ? Boolean(Number(cfg.vote_cap_enabled))
      : true;
  const ratioUp = cfg && cfg.vote_cap_ratio_up != null ? Number(cfg.vote_cap_ratio_up) : 1 / 3;
  const ratioDown =
    cfg && cfg.vote_cap_ratio_down != null ? Number(cfg.vote_cap_ratio_down) : 1 / 5;
  const minCap = cfg && cfg.vote_cap_min != null ? Number(cfg.vote_cap_min) : 1;

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle('⚖️ Vote Caps Settings')
    .setColor(enabled ? 0x57f287 : 0xed4245)
    .setDescription('Limit how many movies each user can upvote/downvote per voting session.')
    .addFields(
      { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
      { name: 'Upvote Ratio', value: `${ratioUp}`, inline: true },
      { name: 'Downvote Ratio', value: `${ratioDown}`, inline: true },
      { name: 'Minimum Allowed', value: `${minCap}`, inline: true }
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('config_vote_caps_enable')
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('config_vote_caps_disable')
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('config_vote_caps_set')
      .setLabel('Set Ratios/Min')
      .setStyle(ButtonStyle.Primary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('config_vote_caps_reset')
      .setLabel('Reset to Defaults')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('open_configuration')
      .setLabel('⬅ Back')
      .setStyle(ButtonStyle.Secondary)
  );

  if (interaction.isButton()) {
    await interaction.update({
      content: '⚙️ Configure: Vote Caps',
      embeds: [embed],
      components: [row1, row2],
    });
  } else {
    await interaction.reply({
      content: '⚙️ Configure: Vote Caps',
      embeds: [embed],
      components: [row1, row2],
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function setVoteCapsEnabled(interaction, guildId, enabled) {
  await database.updateVoteCaps(guildId, { enabled });
  await configureVoteCaps(interaction, guildId);
}

async function resetVoteCapsDefaults(interaction, guildId) {
  await database.updateVoteCaps(guildId, {
    enabled: true,
    ratioUp: 1 / 3,
    ratioDown: 1 / 5,
    min: 1,
  });
  await configureVoteCaps(interaction, guildId);
}

async function openVoteCapsModal(interaction, guildId) {
  const cfg = await database.getGuildConfig(guildId).catch(() => null);
  const ratioUp = cfg && cfg.vote_cap_ratio_up != null ? String(cfg.vote_cap_ratio_up) : '0.3333';
  const ratioDown =
    cfg && cfg.vote_cap_ratio_down != null ? String(cfg.vote_cap_ratio_down) : '0.2';
  const minCap = cfg && cfg.vote_cap_min != null ? String(cfg.vote_cap_min) : '1';

  const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
  } = require('discord.js');
  const modal = new ModalBuilder().setCustomId('config_vote_caps_modal').setTitle('Set Vote Caps');

  const upInput = new TextInputBuilder()
    .setCustomId('ratio_up')
    .setLabel('Upvote ratio (e.g., 0.3333 for 1/3)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(ratioUp);

  const downInput = new TextInputBuilder()
    .setCustomId('ratio_down')
    .setLabel('Downvote ratio (e.g., 0.2 for 1/5)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(ratioDown);

  const minInput = new TextInputBuilder()
    .setCustomId('min_cap')
    .setLabel('Minimum votes allowed (integer, ≥1)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(minCap);

  modal.addComponents(
    new ActionRowBuilder().addComponents(upInput),
    new ActionRowBuilder().addComponents(downInput),
    new ActionRowBuilder().addComponents(minInput)
  );

  await interaction.showModal(modal);
}

async function applyVoteCapsFromModal(interaction) {
  const guildId = interaction.guild.id;
  const ratioUp = Number(interaction.fields.getTextInputValue('ratio_up'));
  const ratioDown = Number(interaction.fields.getTextInputValue('ratio_down'));
  const minCap = Math.max(1, parseInt(interaction.fields.getTextInputValue('min_cap'), 10) || 1);

  if (
    !isFinite(ratioUp) ||
    !isFinite(ratioDown) ||
    ratioUp <= 0 ||
    ratioUp > 1 ||
    ratioDown <= 0 ||
    ratioDown > 1
  ) {
    await interaction.reply({
      content: '❌ Invalid ratios. Use decimals in (0,1], e.g., 0.3333 for 1/3.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await database.updateVoteCaps(guildId, { ratioUp, ratioDown, min: minCap });
  await interaction.reply({ content: '✅ Vote caps updated.', flags: MessageFlags.Ephemeral });
}

async function configureAdminChannel(interaction, guildId) {
  const channel = interaction.options?.getChannel('channel');

  // If no channel specified (button interaction), show channel selector
  if (!channel) {
    const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');

    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('config_select_admin_channel')
      .setPlaceholder('Select a channel for admin operations')
      .setChannelTypes([ChannelType.GuildText]);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content:
        '🔧 **Select Admin Channel**\n\nChoose a Text channel for admin controls and management:',
      embeds: [],
      components: [row],
    });
    return;
  }

  // Validate channel type (text only)
  if (channel.type !== 0) {
    // 0 = text
    await interaction.reply({
      content: '❌ Please select a text channel for admin operations.',
      flags: MessageFlags.Ephemeral,
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
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set admin channel.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function configureVotingRoles(interaction, guildId) {
  const cfg = await database.getGuildConfig(guildId).catch(() => null);
  const count = cfg?.voting_roles?.length || 0;

  const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    RoleSelectMenuBuilder,
    EmbedBuilder,
  } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle('👥 Voting Roles')
    .setDescription(
      'Select roles that are allowed to vote. These roles will also be pinged for announcements.'
    )
    .setColor(count > 0 ? 0x57f287 : 0x5865f2)
    .addFields({ name: 'Currently configured', value: count > 0 ? `${count} role(s)` : 'None' });

  const roleSelect = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('config_select_voting_roles')
      .setPlaceholder('Select roles allowed to vote (also used for announcements)')
      .setMaxValues(25)
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_configuration')
      .setLabel('⬅ Back')
      .setStyle(ButtonStyle.Secondary)
  );

  if (interaction.isButton()) {
    await interaction.update({
      content: '⚙️ Configure: Voting Roles',
      embeds: [embed],
      components: [roleSelect, backRow],
    });
  } else {
    await interaction.reply({
      content: '⚙️ Configure: Voting Roles',
      embeds: [embed],
      components: [roleSelect, backRow],
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = {
  configureMovieChannel,
  addAdminRole,
  removeAdminRole,
  configureWatchPartyChannel,
  configureAdminChannel,
  viewSettings,
  resetConfiguration,
  configureVotingRoles,
  // Vote caps config
  configureVoteCaps,
  setVoteCapsEnabled,
  resetVoteCapsDefaults,
  openVoteCapsModal,
  applyVoteCapsFromModal,
};
