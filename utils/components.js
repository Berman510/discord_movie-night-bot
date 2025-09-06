/**
 * Component Builders
 * Utility functions for creating Discord UI components
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { VOTE_EMOJIS } = require('./constants');
const { TIMEZONE_OPTIONS } = require('../config/timezones');

function createVoteButtons(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mn:up:${messageId}`)
      .setLabel('Vote Up')
      .setStyle(ButtonStyle.Success)
      .setEmoji(VOTE_EMOJIS.up),
    new ButtonBuilder()
      .setCustomId(`mn:down:${messageId}`)
      .setLabel('Vote Down')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(VOTE_EMOJIS.down)
  );
}

function createVotingButtons(messageId, upCount = 0, downCount = 0) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mn:up:${messageId}`)
      .setLabel(`Vote Up (${upCount})`)
      .setStyle(ButtonStyle.Success)
      .setEmoji(VOTE_EMOJIS.up),
    new ButtonBuilder()
      .setCustomId(`mn:down:${messageId}`)
      .setLabel(`Vote Down (${downCount})`)
      .setStyle(ButtonStyle.Danger)
      .setEmoji(VOTE_EMOJIS.down)
  )];
}

function createStatusButtons(messageId, status = 'pending') {
  const buttons = [];

  // Always include vote buttons
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`mn:up:${messageId}`)
      .setLabel('Vote Up')
      .setStyle(ButtonStyle.Success)
      .setEmoji(VOTE_EMOJIS.up),
    new ButtonBuilder()
      .setCustomId(`mn:down:${messageId}`)
      .setLabel('Vote Down')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(VOTE_EMOJIS.down)
  );

  // Add status buttons for pending movies
  if (status === 'pending') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`mn:watched:${messageId}`)
        .setLabel('Watched')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`mn:planned:${messageId}`)
        .setLabel('Plan Later')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📌'),
      new ButtonBuilder()
        .setCustomId(`mn:skipped:${messageId}`)
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏭️')
    );
  }

  // Split into multiple rows if needed (max 5 buttons per row)
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  // For planned movies, add session creation button
  if (status === 'planned') {
    const sessionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mn:create_session:${messageId}`)
        .setLabel('🎪 Create Session')
        .setStyle(ButtonStyle.Primary)
    );
    rows.push(sessionRow);
  }

  return rows;
}

function createTimezoneSelect(customId = 'timezone_select', placeholder = 'Choose your timezone...') {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(
        TIMEZONE_OPTIONS.map(tz => ({
          label: tz.label,
          value: tz.value,
          emoji: tz.emoji
        }))
      )
  );
}

function createSessionDateButtons() {
  return new ActionRowBuilder().addComponents(
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
}

function createSessionTimeButtons() {
  return new ActionRowBuilder().addComponents(
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
}

function createSessionActionButtons() {
  return new ActionRowBuilder().addComponents(
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
}

function createConfigurationButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('config:set-channel')
        .setLabel('Set Movie Channel')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📺'),
      new ButtonBuilder()
        .setCustomId('config:set-timezone')
        .setLabel('Set Timezone')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🌍'),
      new ButtonBuilder()
        .setCustomId('config:manage-roles')
        .setLabel('Manage Admin Roles')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👑')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('config:view-settings')
        .setLabel('📊 View Full Settings')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('config:reset')
        .setLabel('🗑️ Reset Config')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

module.exports = {
  createVoteButtons,
  createVotingButtons,
  createStatusButtons,
  createTimezoneSelect,
  createSessionDateButtons,
  createSessionTimeButtons,
  createSessionActionButtons,
  createConfigurationButtons
};
