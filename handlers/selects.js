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
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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

  // Create updated embed showing timezone selection
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 2:** Now choose your date and time.\n\n*All times will be displayed in your selected timezone.*')
    .setColor(0x57f287) // Green to show progress
    .addFields({
      name: '🌍 Selected Timezone',
      value: `**${timezoneName}**`,
      inline: false
    });

  // Enable date/time buttons now that timezone is selected
  const quickDateButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_date:tonight')
        .setLabel('Tonight')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🌙'),
      new ButtonBuilder()
        .setCustomId('session_date:tomorrow')
        .setLabel('Tomorrow')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📅'),
      new ButtonBuilder()
        .setCustomId('session_date:this_friday')
        .setLabel('This Friday')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎉'),
      new ButtonBuilder()
        .setCustomId('session_date:this_weekend')
        .setLabel('This Weekend')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🏖️')
    );

  const timeButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_time:7pm')
        .setLabel('7:00 PM')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_time:8pm')
        .setLabel('8:00 PM')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_time:9pm')
        .setLabel('9:00 PM')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('session_time:custom')
        .setLabel('Custom Time')
        .setStyle(ButtonStyle.Secondary)
    );

  const actionButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_create:no_date')
        .setLabel('No Specific Date')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId('session_create:custom_date')
        .setLabel('Custom Date/Time')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⏰'),
      new ButtonBuilder()
        .setCustomId('session_timezone_select')
        .setLabel('Change Timezone')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

  await interaction.update({
    embeds: [embed],
    components: [quickDateButtons, timeButtons, actionButtons]
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
