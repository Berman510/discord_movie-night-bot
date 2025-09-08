/**
 * Movie Night Bot — Main Entry Point
 * Version: 1.10.8
 * 
 * A modular Discord bot for organizing movie nights with voting, sessions, and IMDb integration
 */

require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, InteractionType, MessageFlags, EmbedBuilder } = require('discord.js');
const logger = require('./utils/logger');
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
  logger.error('❌ DISCORD_TOKEN is required');
  process.exit(1);
}

if (!CLIENT_ID) {
  logger.error('❌ CLIENT_ID is required');
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

// Make client globally available for session tracking
global.discordClient = client;

// Bot ready event
client.once('clientReady', async () => {
  logger.info(`✅ ${client.user.tag} is online!`);
  logger.info(`🎬 Movie Night Bot v${BOT_VERSION} ready`);
  logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

  // Set bot status
  client.user.setActivity('🍿 Movie Night', { type: 3 }); // 3 = WATCHING

  // Initialize admin control panels for all guilds with admin channels
  try {
    const adminControls = require('./services/admin-controls');
    let panelsCreated = 0;

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const config = await database.getGuildConfig(guildId);
        if (config && config.admin_channel_id) {
          await adminControls.ensureAdminControlPanel(client, guildId);
          panelsCreated++;
        }
      } catch (error) {
        logger.error(`Error initializing admin panel for guild ${guildId}:`, error);
      }
    }

    if (panelsCreated > 0) {
      logger.info(`🔧 Initialized ${panelsCreated} admin control panels`);
    }
  } catch (error) {
    logger.error('Error during admin panel initialization:', error);
  }

  // Initialize smart session scheduler (replaces old polling system)
  try {
    const sessionScheduler = require('./services/session-scheduler');
    await sessionScheduler.initialize(client);
  } catch (error) {
    logger.error('Error starting session scheduler:', error);
  }
});

// Bot joins a new guild
client.on('guildCreate', async (guild) => {
  logger.info(`🎉 Joined new guild: ${guild.name} (${guild.id})`);
  logger.info(`📊 Now serving ${client.guilds.cache.size} guilds`);

  try {
    // Register commands to this specific guild for instant availability
    logger.info(`⚡ Registering commands to ${guild.name} for instant availability`);
    try {
      await registerCommands(DISCORD_TOKEN, CLIENT_ID, guild.id);
      logger.info(`✅ Commands registered to ${guild.name}`);
    } catch (commandError) {
      logger.warn(`⚠️ Failed to register commands to ${guild.name}: ${commandError.message}`);
      logger.debug('Commands will still be available globally, just not instantly in this guild');
    }

    // Initialize admin control panel for this guild if it has an admin channel configured
    const config = await database.getGuildConfig(guild.id);
    if (config && config.admin_channel_id) {
      const adminControls = require('./services/admin-controls');
      await adminControls.ensureAdminControlPanel(client, guild.id);
      logger.info(`🔧 Admin control panel initialized for ${guild.name}`);
    }

  } catch (error) {
    logger.error(`❌ Error setting up new guild ${guild.name}:`, error);
  }
});

// Bot leaves a guild
client.on('guildDelete', (guild) => {
  logger.info(`👋 Left guild: ${guild.name} (${guild.id})`);
  logger.info(`📊 Now serving ${client.guilds.cache.size} guilds`);
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
  logger.info('🛑 Received SIGINT, shutting down gracefully...');

  if (database.isConnected) {
    await database.close();
  }

  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');

  if (database.isConnected) {
    await database.close();
  }

  client.destroy();
  process.exit(0);
});

// Start the bot
async function startBot() {
  try {
    logger.info(`🎬 Movie Night Bot v${BOT_VERSION} starting...`);

    // Initialize database
    await database.connect();

    // Register commands globally for all servers
    logger.info(`🌍 Registering commands globally for all servers`);
    await registerCommands(DISCORD_TOKEN, CLIENT_ID);

    // Also register to specific development guilds if specified for instant testing
    if (GUILD_ID && GUILD_ID.trim()) {
      const guildIds = GUILD_ID.split(',').map(id => id.trim()).filter(id => id);
      logger.info(`🧪 Also registering to ${guildIds.length} development guild(s) for instant testing`);
      for (const guildId of guildIds) {
        try {
          // Check if bot is actually in the guild before trying to register commands
          const guild = client.guilds.cache.get(guildId);
          if (!guild) {
            logger.warn(`⚠️ Bot is not in development guild ${guildId} - skipping command registration`);
            continue;
          }

          await registerCommands(DISCORD_TOKEN, CLIENT_ID, guildId);
          logger.info(`✅ Commands registered to development guild: ${guild.name}`);
        } catch (error) {
          logger.warn(`⚠️ Failed to register commands to development guild ${guildId}: ${error.message}`);
          logger.debug('This is non-critical - bot will continue with global commands only');
        }
      }
    }

    // Login to Discord
    await client.login(DISCORD_TOKEN);

    // Start payload cleanup
    startPayloadCleanup();

  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
