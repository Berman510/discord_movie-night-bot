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
  // Enhanced session creation with prominent timezone selection
  const embed = new EmbedBuilder()
    .setTitle('🎬 Create Movie Night Session')
    .setDescription('**Step 1:** Choose your timezone first, then select date and time.\n\n*Timezone selection ensures everyone sees the correct time!*')
    .setColor(0x5865f2)
    .addFields({
      name: '🌍 Current Selection',
      value: 'No timezone selected yet',
      inline: false
    });

  // Prominent timezone selection first
  const timezoneButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_timezone_select')
        .setLabel('🌍 Choose Your Timezone First')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🌍')
    );

  const quickDateButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_date:tonight')
        .setLabel('Tonight')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🌙')
        .setDisabled(true), // Disabled until timezone selected
      new ButtonBuilder()
        .setCustomId('session_date:tomorrow')
        .setLabel('Tomorrow')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📅')
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_date:this_friday')
        .setLabel('This Friday')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎉')
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_date:this_weekend')
        .setLabel('This Weekend')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏖️')
        .setDisabled(true)
    );

  const timeButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_time:7pm')
        .setLabel('7:00 PM')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_time:8pm')
        .setLabel('8:00 PM')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_time:9pm')
        .setLabel('9:00 PM')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('session_time:custom')
        .setLabel('Custom Time')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

  await interaction.reply({
    embeds: [embed],
    components: [timezoneButton, quickDateButtons, timeButtons],
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
