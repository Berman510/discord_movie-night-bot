/**
 * Deep Purge Service
 * Comprehensive guild data removal system with confirmations and selective clearing
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const database = require('../database');

/**
 * Create deep purge selection embed
 */
function createDeepPurgeSelectionEmbed(guildName) {
  const embed = new EmbedBuilder()
    .setTitle('💥 Deep Purge System')
    .setDescription(`**⚠️ WARNING: This will permanently delete data for ${guildName}**`)
    .setColor(0xed4245)
    .addFields(
      {
        name: '🗂️ Available Data Categories',
        value: `Select which data categories to remove:
• **Movies** - All movie recommendations and records
• **Sessions** - All movie sessions and events
• **Votes** - All voting data
• **Participants** - Session participant records
• **Attendees** - Session attendance tracking
• **Configuration** - Guild bot configuration`,
        inline: false
      },
      {
        name: '⚠️ Important Notes',
        value: `• This action is **IRREVERSIBLE**
• Banned movies will also be removed
• All historical data will be lost
• Bot will need to be reconfigured after purge`,
        inline: false
      }
    )
    .setFooter({ text: 'Select categories below, then confirm to proceed' })
    .setTimestamp();

  return embed;
}

/**
 * Create deep purge selection menu with submit button
 */
function createDeepPurgeSelectionMenu(selectedCategories = []) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('deep_purge_select_categories')
    .setPlaceholder('Select data categories to remove...')
    .setMinValues(1)
    .setMaxValues(6)
    .addOptions([
      {
        label: 'Movies',
        description: 'All movie recommendations and records',
        value: 'movies',
        emoji: '🎬'
      },
      {
        label: 'Sessions',
        description: 'All movie sessions and events',
        value: 'sessions',
        emoji: '🎪'
      },
      {
        label: 'Votes',
        description: 'All voting data',
        value: 'votes',
        emoji: '🗳️'
      },
      {
        label: 'Participants',
        description: 'Session participant records',
        value: 'participants',
        emoji: '👥'
      },
      {
        label: 'Attendees',
        description: 'Session attendance tracking',
        value: 'attendees',
        emoji: '📊'
      },
      {
        label: 'Configuration',
        description: 'Guild bot configuration',
        value: 'config',
        emoji: '⚙️'
      }
    ]);

  // Update placeholder to show selected categories
  if (selectedCategories && selectedCategories.length > 0) {
    const categoryNames = {
      movies: 'Movies',
      sessions: 'Sessions',
      votes: 'Votes',
      participants: 'Participants',
      attendees: 'Attendees',
      config: 'Configuration'
    };
    const selectedNames = selectedCategories.map(cat => categoryNames[cat]).join(', ');
    selectMenu.setPlaceholder(`Selected: ${selectedNames} (click to change)`);
  }

  // Encode selected categories in the button ID for persistence
  const encodedCategories = selectedCategories && selectedCategories.length > 0
    ? selectedCategories.join(',')
    : '';

  const submitButton = new ButtonBuilder()
    .setCustomId(`deep_purge_submit:${encodedCategories}`)
    .setLabel('🚨 Proceed with Deep Purge')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('deep_purge_cancel')
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  const buttonRow = new ActionRowBuilder().addComponents(submitButton, cancelButton);

  return [selectRow, buttonRow];
}

/**
 * Update selection display with current selections
 */
function updateSelectionDisplay(selectedCategories) {
  const embed = new EmbedBuilder()
    .setTitle('💥 Deep Purge - Select Categories')
    .setDescription('⚠️ **WARNING: This will permanently delete selected data**\n\nSelect the categories you want to remove, then click the submit button.')
    .setColor(0xed4245);

  if (selectedCategories && selectedCategories.length > 0) {
    const categoryEmojis = {
      movies: '🎬',
      sessions: '🎪',
      votes: '🗳️',
      participants: '👥',
      attendees: '📊',
      config: '⚙️'
    };

    const categoryNames = {
      movies: 'Movies',
      sessions: 'Sessions',
      votes: 'Votes',
      participants: 'Participants',
      attendees: 'Attendees',
      config: 'Configuration'
    };

    const selectedList = selectedCategories.map(cat =>
      `${categoryEmojis[cat]} **${categoryNames[cat]}**`
    ).join('\n');

    embed.addFields({
      name: `📋 Selected Categories (${selectedCategories.length})`,
      value: selectedList,
      inline: false
    });

    embed.setFooter({ text: 'Click "Proceed with Deep Purge" to continue or "Cancel" to abort.' });
  } else {
    embed.addFields({
      name: '📋 No Categories Selected',
      value: 'Please select at least one category to purge.',
      inline: false
    });
    embed.setFooter({ text: 'Select categories from the dropdown menu above.' });
  }

  return embed;
}

/**
 * Create confirmation embed with summary
 */
async function createConfirmationEmbed(guildId, guildName, selectedCategories) {
  const embed = new EmbedBuilder()
    .setTitle('💥 Deep Purge Confirmation')
    .setDescription(`**⚠️ FINAL WARNING: About to permanently delete data for ${guildName}**`)
    .setColor(0xed4245);

  // Get counts for selected categories
  const counts = await getDataCounts(guildId, selectedCategories);
  
  const categoryDescriptions = {
    movies: 'Movie recommendations and records',
    sessions: 'Movie sessions and events',
    votes: 'Voting data',
    participants: 'Session participant records',
    attendees: 'Session attendance records',
    config: 'Guild bot configuration'
  };

  const summaryLines = [];
  let totalItems = 0;

  for (const category of selectedCategories) {
    const count = counts[category] || 0;
    totalItems += count;
    summaryLines.push(`• **${categoryDescriptions[category]}**: ${count} items`);
  }

  embed.addFields(
    {
      name: '🗑️ Items to be deleted',
      value: summaryLines.join('\n') + `\n\n**Total: ${totalItems} items**`,
      inline: false
    },
    {
      name: '⚠️ This action will',
      value: `• **Permanently delete** all selected data
• **Cannot be undone** - no recovery possible
• Require **bot reconfiguration** if config is deleted
• **Remove all history** for selected categories`,
      inline: false
    }
  );

  embed.setFooter({ text: 'Type "DELETE EVERYTHING" to confirm this irreversible action' });
  embed.setTimestamp();

  return embed;
}

/**
 * Get data counts for categories
 */
async function getDataCounts(guildId, categories) {
  const counts = {};

  if (!database.isConnected) {
    // Return zero counts if database is not connected
    categories.forEach(category => {
      counts[category] = 0;
    });
    return counts;
  }

  try {
    for (const category of categories) {
      switch (category) {
        case 'movies':
          const [movieRows] = await database.pool.execute(
            'SELECT COUNT(*) as count FROM movies WHERE guild_id = ?',
            [guildId]
          );
          counts.movies = movieRows[0].count;
          break;

        case 'sessions':
          const [sessionRows] = await database.pool.execute(
            'SELECT COUNT(*) as count FROM movie_sessions WHERE guild_id = ?',
            [guildId]
          );
          counts.sessions = sessionRows[0].count;
          break;

        case 'votes':
          const [voteRows] = await database.pool.execute(
            'SELECT COUNT(*) as count FROM votes WHERE guild_id = ?',
            [guildId]
          );
          counts.votes = voteRows[0].count;
          break;

        case 'participants':
          const [participantRows] = await database.pool.execute(
            'SELECT COUNT(*) as count FROM session_participants WHERE guild_id = ?',
            [guildId]
          );
          counts.participants = participantRows[0].count;
          break;

        case 'attendees':
          const [attendeeRows] = await database.pool.execute(
            'SELECT COUNT(*) as count FROM session_attendees WHERE guild_id = ?',
            [guildId]
          );
          counts.attendees = attendeeRows[0].count;
          break;

        case 'config':
          const [configRows] = await database.pool.execute(
            'SELECT COUNT(*) as count FROM guild_config WHERE guild_id = ?',
            [guildId]
          );
          counts.config = configRows[0].count;
          break;
      }
    }
  } catch (error) {
    console.error('Error getting data counts:', error);
    // Return zero counts on error
    categories.forEach(category => {
      if (!(category in counts)) {
        counts[category] = 0;
      }
    });
  }

  return counts;
}

/**
 * Create confirmation modal
 */
function createConfirmationModal(selectedCategories) {
  const modal = new ModalBuilder()
    .setCustomId(`deep_purge_confirm:${selectedCategories.join(',')}`)
    .setTitle('Deep Purge Final Confirmation');

  const confirmationInput = new TextInputBuilder()
    .setCustomId('confirmation_text')
    .setLabel('Type "DELETE EVERYTHING" to confirm')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('DELETE EVERYTHING')
    .setRequired(true)
    .setMaxLength(50);

  const reasonInput = new TextInputBuilder()
    .setCustomId('purge_reason')
    .setLabel('Reason for purge (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Why are you performing this deep purge?')
    .setRequired(false)
    .setMaxLength(500);

  const firstRow = new ActionRowBuilder().addComponents(confirmationInput);
  const secondRow = new ActionRowBuilder().addComponents(reasonInput);

  modal.addComponents(firstRow, secondRow);
  return modal;
}

/**
 * Execute deep purge
 */
async function executeDeepPurge(guildId, categories, reason = null, client = null) {
  const options = {};
  categories.forEach(category => {
    options[category] = true;
  });

  const logger = require('../utils/logger');
  logger.info(`🗑️ Executing deep purge for guild ${guildId}:`, categories);
  if (reason) {
    logger.info(`📝 Purge reason: ${reason}`);
  }

  // Clear Discord content if movies/sessions are being purged
  if ((options.movies || options.sessions) && client) {
    try {
      const config = await database.getGuildConfig(guildId);

      // Delete Discord events if sessions are being purged
      if (options.sessions) {
        try {
          const guild = await client.guilds.fetch(guildId);
          const events = await guild.scheduledEvents.fetch();

          for (const [eventId, event] of events) {
            try {
              if (event.name.includes('Movie Night')) {
                await event.delete();
                logger.debug(`🗑️ Deleted Discord event: ${event.name} (${eventId})`);
              }
            } catch (error) {
              logger.warn(`Failed to delete Discord event ${eventId}:`, error.message);
            }
          }
        } catch (error) {
          logger.warn('Error deleting Discord events during deep purge:', error.message);
        }
      }

      // Clear voting channel
      if (config && config.movie_channel_id) {
        try {
          const votingChannel = await client.channels.fetch(config.movie_channel_id);
          if (votingChannel) {
            const messages = await votingChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);

            for (const [messageId, message] of botMessages) {
              try {
                await message.delete();
              } catch (error) {
                logger.warn(`Failed to delete voting message ${messageId}:`, error.message);
              }
            }

            const forumChannels = require('./forum-channels');
            if (forumChannels.isForumChannel(votingChannel)) {
              // Use forum-aware clear that handles active+archived and system posts; do NOT preserve winner during a deep purge
              await forumChannels.clearForumMoviePosts(votingChannel, null, { deleteWinnerAnnouncements: true });
              // Add system post if configuration still exists
              const configAfterPurge = await database.getGuildConfig(guildId);
              if (configAfterPurge) {
                await forumChannels.ensureRecommendationPost(votingChannel, null);
                logger.debug('✅ Added No Active Voting Session post in forum after deep purge');
              } else {
                logger.debug('✅ Forum voting channel cleared, no messages added (configuration cleared)');
              }
            } else {
              // Clear threads (active and archived) for text channels
              const activeThreads = await votingChannel.threads.fetchActive();
              for (const [threadId, thread] of activeThreads.threads) {
                try { await thread.delete(); } catch (error) { logger.warn(`Failed to delete thread ${threadId}:`, error.message); }
              }
              const archivedThreads = await votingChannel.threads.fetchArchived({ limit: 50 });
              for (const [threadId, thread] of archivedThreads.threads) {
                try { await thread.delete(); } catch (error) { logger.warn(`Failed to delete archived thread ${threadId}:`, error.message); }
              }

              // Add system post if configuration still exists
              const configAfterPurge = await database.getGuildConfig(guildId);
              if (configAfterPurge) {
                const cleanup = require('./cleanup');
                await cleanup.ensureQuickActionPinned(votingChannel);
                logger.debug('✅ Added quick action/no session message after deep purge');
              } else {
                logger.debug('✅ Voting channel cleared, no messages added (configuration cleared)');
              }
            }
          }
        } catch (error) {
          console.warn('Error clearing voting channel during deep purge:', error.message);
        }
      }

      // Clear admin channel
      if (config && config.admin_channel_id) {
        try {
          const adminChannel = await client.channels.fetch(config.admin_channel_id);
          if (adminChannel) {
            const messages = await adminChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);

            for (const [messageId, message] of botMessages) {
              try {
                const isControlPanel = message.embeds.length > 0 &&
                                      message.embeds[0].title &&
                                      message.embeds[0].title.includes('Admin Control Panel');

                if (!isControlPanel) {
                  await message.delete();
                }
              } catch (error) {
                logger.warn(`Failed to delete admin message ${messageId}:`, error.message);
              }
            }

            // Update admin panel - will show setup panel if config was cleared
            try {
              const adminControls = require('./admin-controls');
              await adminControls.ensureAdminControlPanel(client, guildId);
              logger.debug('✅ Updated admin control panel after deep purge');
            } catch (error) {
              logger.warn('Error updating admin control panel after deep purge:', error.message);
            }
          }
        } catch (error) {
          const logger = require('../utils/logger');
          logger.warn('Error clearing admin channel during deep purge:', error.message);
        }
      }
    } catch (error) {
      const logger = require('../utils/logger');
      logger.warn('Error during Discord cleanup in deep purge:', error.message);
    }
  }

  const result = await database.deepPurgeGuildData(guildId, options);

  logger.info(`✅ Deep purge completed: ${result.deleted} items deleted`);
  if (result.errors.length > 0) {
    logger.error('Deep purge errors:', result.errors);
  }

  return result;
}

/**
 * Create success embed
 */
function createSuccessEmbed(guildName, result, categories) {
  const embed = new EmbedBuilder()
    .setTitle('✅ Deep Purge Completed')
    .setDescription(`Successfully purged data for **${guildName}**`)
    .setColor(0x57f287)
    .addFields(
      {
        name: '🗑️ Purge Results',
        value: `• **Items deleted**: ${result.deleted}
• **Categories purged**: ${categories.length}
• **Errors**: ${result.errors.length}`,
        inline: false
      }
    );

  if (result.errors.length > 0) {
    embed.addFields({
      name: '⚠️ Errors encountered',
      value: result.errors.slice(0, 3).join('\n') + (result.errors.length > 3 ? '\n...' : ''),
      inline: false
    });
    embed.setColor(0xfee75c); // Yellow for warnings
  }

  if (categories.includes('config')) {
    embed.addFields({
      name: '🔧 Next Steps',
      value: 'Bot configuration was deleted. Use `/movie-configure` to set up the bot again.',
      inline: false
    });
  }

  embed.setFooter({ text: 'Deep purge operation completed' });
  embed.setTimestamp();

  return embed;
}

module.exports = {
  createDeepPurgeSelectionEmbed,
  createDeepPurgeSelectionMenu,
  updateSelectionDisplay,
  createConfirmationEmbed,
  createConfirmationModal,
  executeDeepPurge,
  createSuccessEmbed,
  getDataCounts
};
