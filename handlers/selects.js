/**
 * Select Menu Interaction Handlers
 * Handles all select menu interactions
 */

const { MessageFlags } = require('discord.js');
const database = require('../database');
const { TIMEZONE_OPTIONS } = require('../config/timezones');

async function handleSelect(interaction) {
  const customId = interaction.customId;

  try {
    // Timezone selection for session creation
    if (customId === 'session_timezone_selected') {
      await handleSessionTimezoneSelection(interaction);
      return;
    }

    // Configuration timezone selection
    if (customId === 'config_timezone_selected') {
      await handleConfigTimezoneSelection(interaction);
      return;
    }

    // IMDb movie selection
    if (customId.startsWith('mn:imdbpick:')) {
      await handleImdbSelection(interaction);
      return;
    }

    // Unknown select menu
    console.warn(`Unknown select menu interaction: ${customId}`);
    await interaction.reply({
      content: '❌ Unknown select menu interaction.',
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error handling select interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the selection.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

async function handleSessionTimezoneSelection(interaction) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
  const selectedTimezone = interaction.values[0];
  const timezoneName = TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone;

  // Store timezone selection in session state
  if (!global.sessionCreationState) {
    global.sessionCreationState = new Map();
  }

  const userId = interaction.user.id;
  let state = global.sessionCreationState.get(userId) || {};
  state.selectedTimezone = selectedTimezone;
  state.timezoneName = timezoneName;
  global.sessionCreationState.set(userId, state);

  // Show final step - session details
  await showSessionDetailsModal(interaction, state);
}

async function showSessionDetailsModal(interaction, state) {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 4:** Enter session details\n\n*Almost done! Just add a name and description for your session.*')
    .setColor(0x57f287) // Green to show progress
    .addFields(
      { name: '📅 Selected Date', value: state.dateDisplay, inline: true },
      { name: '🕐 Selected Time', value: state.timeDisplay || 'No specific time', inline: true },
      { name: '🌍 Selected Timezone', value: state.timezoneName, inline: true }
    );

  const createButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_create_final')
        .setLabel('📝 Enter Session Details')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId('session_back_to_timezone')
        .setLabel('🔄 Change Settings')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({
    embeds: [embed],
    components: [createButton]
  });
}

async function handleConfigTimezoneSelection(interaction) {
  const selectedTimezone = interaction.values[0];
  const timezoneName = TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone;
  
  const success = await database.setGuildTimezone(interaction.guild.id, selectedTimezone);
  
  if (success) {
    await interaction.update({
      content: `🌍 **Timezone Updated!**\n\nDefault timezone set to **${timezoneName}**\n\nThis will be used for movie sessions when users don't specify a timezone.`,
      embeds: [],
      components: []
    });
  } else {
    await interaction.update({
      content: '❌ Failed to update timezone. Please try again.',
      embeds: [],
      components: []
    });
  }
}

async function handleImdbSelection(interaction) {
  // TODO: Move IMDb selection logic here
  console.log(`IMDb selection: ${interaction.values[0]}`);
  
  await interaction.reply({
    content: 'IMDb selection processed.',
    flags: MessageFlags.Ephemeral
  });
}

module.exports = {
  handleSelect
};
