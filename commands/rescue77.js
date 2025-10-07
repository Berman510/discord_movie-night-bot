/**
 * Emergency rescue command for session 77
 * Temporary command to fix Migration 36 failure
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rescue77')
    .setDescription('Emergency rescue command for session 77 (Migration 36 fix)')
    .setDefaultMemberPermissions(0), // Admin only
};
