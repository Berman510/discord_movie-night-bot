/**
 * Watch Party Bot — Main Entry Point
 * Version: 1.14.1
 *
 * A modular Discord bot for organizing movie nights with voting, sessions, and IMDb integration
 */
// Ensure production dependencies are installed when running from a clean git pull (e.g., PebbleHost)
try {
  require.resolve('discord.js');
} catch (_) {
  const cp = require('child_process');
  try {
    console.log('[startup] Installing dependencies (npm ci --omit=dev)...');
    cp.execSync('npm ci --omit=dev', { stdio: 'inherit' });
    console.log('[startup] Dependencies installed.');
  } catch (err) {
    console.warn('[startup] npm ci failed, attempting npm install --only=prod');
    try {
      cp.execSync('npm install --only=prod', { stdio: 'inherit' });
      console.log('[startup] Dependencies installed via npm install.');
    } catch (err2) {
      console.error(
        '[startup] Failed to install dependencies automatically. Please run npm install.',
        err2?.message || err2
      );
    }
  }
}

try {
  require('dotenv').config();
} catch (err) {
  console.warn('[startup] dotenv not found; proceeding with process.env only');
}

const {
  Client,
  GatewayIntentBits,
  REST: _REST,
  Routes: _Routes,
  InteractionType,
  MessageFlags,
  EmbedBuilder: _EmbedBuilder,
} = require('discord.js');
const logger = require('./utils/logger');
const database = require('./database');
const { commands: _commands, registerCommands } = require('./commands');
const { handleInteraction } = require('./handlers');
const { handleSlashCommand } = require('./handlers/commands');
const { embeds: _embeds } = require('./utils');
const { startPayloadCleanup, BOT_VERSION } = require('./utils/constants');
const { initWebSocketClient } = require('./services/ws-client');

// Environment variables
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, OMDB_API_KEY: _OMDB_API_KEY } = process.env;

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
    GatewayIntentBits.GuildVoiceStates, // For voice channel monitoring
  ],
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

  // Skip automatic admin panel initialization on startup to prevent message recreation
  // Admin panels will be created on-demand when users interact with the bot
  logger.info(
    '🔧 Skipping automatic admin panel initialization to prevent startup message recreation'
  );

  // Initialize smart session scheduler (replaces old polling system)
  try {
    const sessionScheduler = require('./services/session-scheduler');
    await sessionScheduler.initialize(client);
  } catch (error) {
    logger.error('Error starting session scheduler:', error);
  }

  // Webhook server removed (WS-only mode)
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
      const panel = await adminControls.ensureAdminControlPanel(client, guild.id);
      if (panel) {
        logger.info(`🔧 Admin control panel initialized for ${guild.name}`);
      } else {
        logger.warn(
          `⚠️ Skipped admin panel for ${guild.name} (Missing Access or channel not found)`
        );
      }
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
      await interaction
        .reply({
          content: '❌ An error occurred while processing your request.',
          flags: MessageFlags.Ephemeral,
        })
        .catch(console.error);
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

    // Login to Discord first
    await client.login(DISCORD_TOKEN);

    // Wait a moment for guild cache to populate
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Also register to specific development guilds if specified for instant testing
    if (GUILD_ID && GUILD_ID.trim()) {
      const guildIds = GUILD_ID.split(',')
        .map((id) => id.trim())
        .filter((id) => id);
      logger.info(
        `🧪 Also registering to ${guildIds.length} development guild(s) for instant testing`
      );
      for (const guildId of guildIds) {
        try {
          // Check if bot is actually in the guild before trying to register commands
          const guild = client.guilds.cache.get(guildId);
          if (!guild) {
            logger.warn(
              `⚠️ Bot is not in development guild ${guildId} - skipping command registration`
            );
            continue;
          }

          await registerCommands(DISCORD_TOKEN, CLIENT_ID, guildId);
          logger.info(`✅ Commands registered to development guild: ${guild.name}`);
        } catch (error) {
          logger.warn(
            `⚠️ Failed to register commands to development guild ${guildId}: ${error.message}`
          );
          logger.debug('This is non-critical - bot will continue with global commands only');
        }
      }
    }

    // Discord login moved above for guild cache population

    // Initialize WebSocket client to dashboard (no-op if disabled)
    try {
      global.wsClient = initWebSocketClient(logger);
      logger.info(
        `🔗 WebSocket client initialized: ${global.wsClient?.enabled ? 'enabled' : 'disabled'}`
      );
    } catch (e) {
      logger.warn(`WS init failed: ${e?.message || e}`);
      global.wsClient = { enabled: false };
    }

    // Start payload cleanup
    startPayloadCleanup();
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
