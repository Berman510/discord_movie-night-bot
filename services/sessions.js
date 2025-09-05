/**
 * Session Management Service
 * Handles movie session creation, management, and interactions
 */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  StringSelectMenuBuilder,
  MessageFlags 
} = require('discord.js');

const database = require('../database');
const { TIMEZONE_OPTIONS } = require('../config/timezones');
const discordEvents = require('./discord-events');
const timezone = require('./timezone');

async function handleMovieSession(interaction) {
  const action = interaction.options.getString('action');
  const guildId = interaction.guild.id;

  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - session features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  switch (action) {
    case 'create':
      await showSessionCreationModal(interaction);
      break;
    case 'list':
      await listMovieSessions(interaction);
      break;
    case 'close':
      await closeSessionVoting(interaction);
      break;
    case 'winner':
      await pickSessionWinner(interaction);
      break;
    case 'add-movie':
      await addMovieToSession(interaction);
      break;
    case 'join':
      await joinSession(interaction);
      break;
    default:
      await interaction.reply({
        content: '❌ Unknown action. Use create, list, close, winner, add-movie, or join.',
        flags: MessageFlags.Ephemeral
      });
  }
}

async function showSessionCreationModal(interaction) {
  // First, show quick date/time selection buttons
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('Choose when you want to schedule your movie night:')
    .setColor(0x5865f2);

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
        .setLabel('Select Timezone')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🌍')
    );

  await interaction.reply({
    embeds: [embed],
    components: [quickDateButtons, timeButtons, actionButtons],
    flags: MessageFlags.Ephemeral
  });
}

// Placeholder functions - these will be fully implemented
async function listMovieSessions(interaction) {
  console.log('List sessions called');
  await interaction.reply({ content: 'Sessions list coming soon!', flags: MessageFlags.Ephemeral });
}

async function closeSessionVoting(interaction) {
  console.log('Close voting called');
  await interaction.reply({ content: 'Close voting coming soon!', flags: MessageFlags.Ephemeral });
}

async function pickSessionWinner(interaction) {
  console.log('Pick winner called');
  await interaction.reply({ content: 'Pick winner coming soon!', flags: MessageFlags.Ephemeral });
}

async function addMovieToSession(interaction) {
  console.log('Add movie called');
  await interaction.reply({ content: 'Add movie coming soon!', flags: MessageFlags.Ephemeral });
}

async function joinSession(interaction) {
  console.log('Join session called');
  await interaction.reply({ content: 'Join session coming soon!', flags: MessageFlags.Ephemeral });
}

async function handleCreateSessionFromMovie(interaction, messageId) {
  console.log(`Create session from movie: ${messageId}`);
  await interaction.reply({ content: 'Create session from movie coming soon!', flags: MessageFlags.Ephemeral });
}

async function handleSessionCreationButton(interaction) {
  console.log(`Session creation button: ${interaction.customId}`);
  await interaction.reply({ content: 'Session creation button coming soon!', flags: MessageFlags.Ephemeral });
}

async function createMovieSessionFromModal(interaction) {
  console.log('Create session from modal');
  await interaction.reply({ content: 'Session creation from modal coming soon!', flags: MessageFlags.Ephemeral });
}

async function showTimezoneSelector(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🌍 Select Your Timezone')
    .setDescription('Choose the timezone for your movie session:')
    .setColor(0x5865f2);

  const timezoneSelect = new StringSelectMenuBuilder()
    .setCustomId('session_timezone_selected')
    .setPlaceholder('Choose your timezone...')
    .addOptions(
      TIMEZONE_OPTIONS.map(tz => ({
        label: tz.label,
        value: tz.value,
        emoji: tz.emoji
      }))
    );

  const row = new ActionRowBuilder().addComponents(timezoneSelect);

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

module.exports = {
  handleMovieSession,
  showSessionCreationModal,
  listMovieSessions,
  closeSessionVoting,
  pickSessionWinner,
  addMovieToSession,
  joinSession,
  handleCreateSessionFromMovie,
  handleSessionCreationButton,
  createMovieSessionFromModal,
  showTimezoneSelector
};
