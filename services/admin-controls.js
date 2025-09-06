/**
 * Admin Controls Service
 * Manages persistent admin control panel with quick action buttons
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database');

/**
 * Create the admin control panel embed
 */
function createAdminControlEmbed(guildName) {
  const embed = new EmbedBuilder()
    .setTitle('🔧 Movie Night Admin Control Panel')
    .setDescription(`Administrative controls for **${guildName}**`)
    .setColor(0x5865f2)
    .addFields(
      {
        name: '📋 Quick Actions',
        value: `• **Sync** - Update admin channel with current movies
• **Purge** - Clear movie queue while preserving records
• **Deep Purge** - Complete guild data removal (with confirmations)
• **Stats** - View guild movie statistics`,
        inline: false
      },
      {
        name: '⚡ Status',
        value: 'Control panel active and ready for use.',
        inline: false
      }
    )
    .setFooter({ text: 'Use the buttons below for quick admin actions' })
    .setTimestamp();

  return embed;
}

/**
 * Create admin control action buttons
 */
function createAdminControlButtons() {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_sync')
        .setLabel('🔄 Sync Channel')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_purge')
        .setLabel('🗑️ Purge Queue')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_stats')
        .setLabel('📊 Guild Stats')
        .setStyle(ButtonStyle.Success)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_ctrl_deep_purge')
        .setLabel('💥 Deep Purge')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_banned_list')
        .setLabel('🚫 Banned Movies')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_ctrl_refresh')
        .setLabel('🔄 Refresh Panel')
        .setStyle(ButtonStyle.Secondary)
    );

  return [row1, row2];
}

/**
 * Post or update the admin control panel in the admin channel
 */
async function ensureAdminControlPanel(client, guildId) {
  try {
    const config = await database.getGuildConfig(guildId);
    if (!config || !config.admin_channel_id) {
      console.log('No admin channel configured for guild:', guildId);
      return null;
    }

    const adminChannel = await client.channels.fetch(config.admin_channel_id);
    if (!adminChannel) {
      console.log('Admin channel not found:', config.admin_channel_id);
      return null;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log('Guild not found:', guildId);
      return null;
    }

    // Check if control panel already exists
    const messages = await adminChannel.messages.fetch({ limit: 50 });
    const existingPanel = messages.find(msg => 
      msg.author.id === client.user.id && 
      msg.embeds.length > 0 && 
      msg.embeds[0].title && 
      msg.embeds[0].title.includes('Admin Control Panel')
    );

    const embed = createAdminControlEmbed(guild.name);
    const components = createAdminControlButtons();

    if (existingPanel) {
      // Update existing panel
      await existingPanel.edit({
        embeds: [embed],
        components: components
      });
      console.log('🔧 Updated admin control panel');
      return existingPanel;
    } else {
      // Create new panel
      const controlPanel = await adminChannel.send({
        embeds: [embed],
        components: components
      });
      console.log('🔧 Created admin control panel');
      return controlPanel;
    }

  } catch (error) {
    console.error('Error ensuring admin control panel:', error);
    return null;
  }
}

/**
 * Handle sync channel action - syncs both admin and voting channels
 */
async function handleSyncChannel(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const database = require('../database');
    const config = await database.getGuildConfig(interaction.guild.id);

    if (!config) {
      await interaction.editReply({
        content: '❌ No guild configuration found. Please run `/movie-configure` first.'
      });
      return;
    }

    let adminSynced = 0;
    let votingSynced = 0;
    const errors = [];

    // Sync admin channel if configured
    if (config.admin_channel_id) {
      try {
        const adminMirror = require('./admin-mirror');
        const adminResult = await adminMirror.syncAdminChannel(interaction.client, interaction.guild.id);

        if (adminResult.error) {
          errors.push(`Admin channel: ${adminResult.error}`);
        } else {
          adminSynced = adminResult.synced;
        }
      } catch (error) {
        errors.push(`Admin channel: ${error.message}`);
      }
    }

    // Sync voting channel if configured
    if (config.movie_channel_id) {
      try {
        const votingChannel = await interaction.client.channels.fetch(config.movie_channel_id);
        if (votingChannel) {
          const cleanup = require('./cleanup');
          votingSynced = await cleanup.recreateMissingMoviePosts(votingChannel, interaction.guild.id);

          // Also ensure quick action message at bottom
          await cleanup.ensureQuickActionAtBottom(votingChannel);
        } else {
          errors.push('Voting channel not found');
        }
      } catch (error) {
        errors.push(`Voting channel: ${error.message}`);
      }
    }

    // Prepare response
    const successParts = [];
    if (adminSynced > 0) {
      successParts.push(`${adminSynced} movies to admin channel`);
    }
    if (votingSynced > 0) {
      successParts.push(`${votingSynced} movies to voting channel`);
    }

    if (errors.length > 0) {
      await interaction.editReply({
        content: `⚠️ Sync completed with errors:\n${errors.join('\n')}\n\nSynced: ${successParts.join(', ')}`
      });
    } else if (successParts.length > 0) {
      await interaction.editReply({
        content: `✅ Successfully synced ${successParts.join(' and ')}.`
      });
    } else {
      await interaction.editReply({
        content: '✅ Sync completed. No movies found to sync.'
      });
    }

  } catch (error) {
    console.error('Error syncing channels:', error);
    await interaction.editReply({
      content: '❌ An error occurred while syncing the channels.'
    });
  }
}

/**
 * Handle purge queue action
 */
async function handlePurgeQueue(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await database.purgeGuildMovieQueue(interaction.guild.id);

    if (result.errors.length > 0) {
      await interaction.editReply({
        content: `⚠️ Purge completed with errors: ${result.errors.join(', ')}\nPurged: ${result.purged}, Preserved: ${result.preserved}`
      });
    } else {
      await interaction.editReply({
        content: `✅ Queue purged successfully!\nPurged: ${result.purged} items, Preserved: ${result.preserved} movie records`
      });

      // Refresh admin channel after purge
      const adminMirror = require('./admin-mirror');
      await adminMirror.syncAdminChannel(interaction.client, interaction.guild.id);
    }
  } catch (error) {
    console.error('Error purging queue:', error);
    await interaction.editReply({
      content: '❌ An error occurred while purging the queue.'
    });
  }
}

/**
 * Handle guild stats action
 */
async function handleGuildStats(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const stats = require('./stats');
    await stats.showGuildOverview(interaction);
  } catch (error) {
    console.error('Error showing guild stats:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching guild statistics.'
    });
  }
}

/**
 * Handle banned movies list action
 */
async function handleBannedMoviesList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const bannedMovies = await database.getBannedMovies(interaction.guild.id);

    if (bannedMovies.length === 0) {
      await interaction.editReply({
        content: '✅ No movies are currently banned in this guild.'
      });
      return;
    }

    const movieList = bannedMovies
      .map((movie, index) => `${index + 1}. **${movie.title}**`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🚫 Banned Movies')
      .setDescription(`${bannedMovies.length} movie(s) currently banned:\n\n${movieList}`)
      .setColor(0xed4245)
      .setFooter({ text: `Guild: ${interaction.guild.name}` })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error fetching banned movies:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching banned movies.'
    });
  }
}

/**
 * Handle refresh panel action
 */
async function handleRefreshPanel(interaction) {
  try {
    const guild = interaction.guild;
    const embed = createAdminControlEmbed(guild.name);
    const components = createAdminControlButtons();

    await interaction.update({
      embeds: [embed],
      components: components
    });

    console.log('🔧 Refreshed admin control panel');
  } catch (error) {
    console.error('Error refreshing admin panel:', error);
    await interaction.reply({
      content: '❌ An error occurred while refreshing the control panel.',
      ephemeral: true
    });
  }
}

module.exports = {
  createAdminControlEmbed,
  createAdminControlButtons,
  ensureAdminControlPanel,
  handleSyncChannel,
  handlePurgeQueue,
  handleGuildStats,
  handleBannedMoviesList,
  handleRefreshPanel
};
