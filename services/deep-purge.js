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
 * Create deep purge selection menu
 */
function createDeepPurgeSelectionMenu() {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('deep_purge_select')
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

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return [row];
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
async function executeDeepPurge(guildId, categories, reason = null) {
  const options = {};
  categories.forEach(category => {
    options[category] = true;
  });

  console.log(`🗑️ Executing deep purge for guild ${guildId}:`, categories);
  if (reason) {
    console.log(`📝 Purge reason: ${reason}`);
  }

  const result = await database.deepPurgeGuildData(guildId, options);
  
  console.log(`✅ Deep purge completed: ${result.deleted} items deleted`);
  if (result.errors.length > 0) {
    console.error('Deep purge errors:', result.errors);
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
  createConfirmationEmbed,
  createConfirmationModal,
  executeDeepPurge,
  createSuccessEmbed,
  getDataCounts
};
