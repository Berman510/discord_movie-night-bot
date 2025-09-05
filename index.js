/**
 * Movie Night Bot — Main Entry Point
 * Version: 1.9.0
 * 
 * A modular Discord bot for organizing movie nights with voting, sessions, and IMDb integration
 */

require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, InteractionType } = require('discord.js');
const database = require('./database');
const { commands, registerCommands } = require('./commands');
const { handleInteraction } = require('./handlers');
const { sessions } = require('./services');
const { embeds } = require('./utils');
const { startPayloadCleanup, BOT_VERSION } = require('./utils/constants');

// Environment variables
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, OMDB_API_KEY } = process.env;

// Validate required environment variables
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

if (!OMDB_API_KEY) {
  console.warn('⚠️ OMDB_API_KEY not set - IMDb features will be disabled');
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize REST client for command registration
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Bot ready event
client.once('ready', async () => {
  console.log(`🎬 Movie Night Bot v${BOT_VERSION} is ready!`);
  console.log(`📊 Logged in as ${client.user.tag}`);
  console.log(`🏠 Serving ${client.guilds.cache.size} guilds`);
  
  // Connect to database
  await database.connect();
  
  // Start cleanup processes
  startPayloadCleanup();
  
  // Register commands
  await registerCommands(rest, CLIENT_ID, GUILD_ID);
  
  console.log('✅ Bot initialization complete!');
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
        ephemeral: true
      }).catch(console.error);
    }
  }
});

// Handle slash commands
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'movie-night':
        await handleMovieNight(interaction);
        break;
      
      case 'movie-queue':
        await handleMovieQueue(interaction);
        break;
      
      case 'movie-help':
        await handleMovieHelp(interaction);
        break;
      
      case 'movie-session':
        await sessions.handleMovieSession(interaction);
        break;
      
      case 'movie-configure':
        await handleMovieConfigure(interaction);
        break;
      
      case 'movie-cleanup':
        await handleMovieCleanup(interaction);
        break;
      
      case 'movie-stats':
        await handleMovieStats(interaction);
        break;
      
      default:
        await interaction.reply({
          content: `❌ Unknown command: ${commandName}`,
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(`Error handling command ${commandName}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the command.',
        ephemeral: true
      }).catch(console.error);
    }
  }
}

// Placeholder command handlers - these will be implemented in the full refactor
async function handleMovieNight(interaction) {
  console.log('Movie night command called');
  await interaction.reply({
    content: 'Movie night command coming soon!',
    ephemeral: true
  });
}

async function handleMovieQueue(interaction) {
  console.log('Movie queue command called');
  await interaction.reply({
    content: 'Movie queue command coming soon!',
    ephemeral: true
  });
}

async function handleMovieHelp(interaction) {
  const helpEmbed = embeds.createHelpEmbed();
  await interaction.reply({
    embeds: [helpEmbed],
    ephemeral: true
  });
}

async function handleMovieConfigure(interaction) {
  console.log('Movie configure command called');
  await interaction.reply({
    content: 'Movie configure command coming soon!',
    ephemeral: true
  });
}

async function handleMovieCleanup(interaction) {
  console.log('Movie cleanup command called');
  await interaction.reply({
    content: 'Movie cleanup command coming soon!',
    ephemeral: true
  });
}

async function handleMovieStats(interaction) {
  console.log('Movie stats command called');
  await interaction.reply({
    content: 'Movie stats command coming soon!',
    ephemeral: true
  });
}

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
    await database.disconnect();
  }
  
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  if (database.isConnected) {
    await database.disconnect();
  }
  
  client.destroy();
  process.exit(0);
});

// Start the bot
client.login(DISCORD_TOKEN);
