/**
 * Movie Night Bot — Main Entry Point
 * Version: 1.10.8
 * 
 * A modular Discord bot for organizing movie nights with voting, sessions, and IMDb integration
 */

require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, InteractionType, MessageFlags, EmbedBuilder } = require('discord.js');
const database = require('./database');
const { commands, registerCommands } = require('./commands');
const { handleInteraction } = require('./handlers');
const { handleSlashCommand } = require('./handlers/commands');
const { embeds } = require('./utils');
const { startPayloadCleanup, BOT_VERSION } = require('./utils/constants');

// Environment variables
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, OMDB_API_KEY } = process.env;

// Validate required environment variables
if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is required');
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error('❌ CLIENT_ID is required');
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildVoiceStates  // For voice channel monitoring
  ]
});

// Bot ready event
client.once('clientReady', () => {
  console.log(`✅ ${client.user.tag} is online!`);
  console.log(`🎬 Movie Night Bot v${BOT_VERSION} ready`);
  console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
  
  // Set bot status
  client.user.setActivity('🍿 Movie Night', { type: 3 }); // 3 = WATCHING
});

// Handle all interactions
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.type === InteractionType.ApplicationCommand) {
      await handleSlashCommand(interaction);
      return;
    }

    // Handle other interactions (buttons, modals, selects)
    await handleInteraction(interaction);

  } catch (error) {
    console.error('Error handling interaction:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
});

// Handle voice state changes for session participant tracking
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const { sessionTracking } = require('./services');
    await sessionTracking.handleVoiceStateChange(oldState, newState);
  } catch (error) {
    console.error('Error handling voice state change:', error);
  }
});

// Slash commands are now handled by the modular command handler

// All command handlers have been moved to handlers/commands.js

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');

  if (database.isConnected) {
    await database.close();
  }

  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');

  if (database.isConnected) {
    await database.close();
  }

  client.destroy();
  process.exit(0);
});

// Start the bot
async function startBot() {
  try {
    console.log(`🎬 Movie Night Bot v${BOT_VERSION} starting...`);
    
    // Initialize database
    await database.connect();
    
    // Register commands
    await registerCommands(DISCORD_TOKEN, CLIENT_ID, GUILD_ID);
    
    // Login to Discord
    await client.login(DISCORD_TOKEN);
    
    // Start payload cleanup
    startPayloadCleanup();
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
