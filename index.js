/**
 * Movie Night Bot — Main Entry Point
 * Version: 1.9.0
 * 
 * A modular Discord bot for organizing movie nights with voting, sessions, and IMDb integration
 */

require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, InteractionType, MessageFlags, EmbedBuilder } = require('discord.js');
const database = require('./database');
const { commands, registerCommands } = require('./commands');
const { handleInteraction } = require('./handlers');
const { handleSlashCommand } = require('./handlers/commands');
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
    GatewayIntentBits.Guilds
  ]
});

// Initialize REST client for command registration
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Bot ready event
client.once('clientReady', async () => {
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
        flags: MessageFlags.Ephemeral
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
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error(`Error handling command ${commandName}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing the command.',
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
}

// Movie recommendation command handler
async function handleMovieNight(interaction) {
  // Show the movie recommendation modal
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('mn:modal')
    .setTitle('New Movie Recommendation');

  const titleInput = new TextInputBuilder()
    .setCustomId('mn:title')
    .setLabel('Movie Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Clueless (1995)')
    .setRequired(true);

  const whereInput = new TextInputBuilder()
    .setCustomId('mn:where')
    .setLabel('Where to Watch')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Netflix, Hulu, Prime Video, etc.')
    .setRequired(true);

  const titleRow = new ActionRowBuilder().addComponents(titleInput);
  const whereRow = new ActionRowBuilder().addComponents(whereInput);

  modal.addComponents(titleRow, whereRow);

  await interaction.showModal(modal);
}

async function handleMovieQueue(interaction) {
  try {
    const movies = await database.getMoviesByStatus(interaction.guild.id, 'pending', 10);

    if (!movies || movies.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🍿 Movie Queue')
        .setDescription('No movies in the queue yet!\n\nUse `/movie-night` to add your first recommendation.')
        .setColor(0x5865f2);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }


    const embed = new EmbedBuilder()
      .setTitle('🍿 Current Movie Queue')
      .setDescription(`${movies.length} movie${movies.length === 1 ? '' : 's'} waiting for votes:`)
      .setColor(0x5865f2);

    for (const movie of movies) {
      const voteScore = (movie.upvotes || 0) - (movie.downvotes || 0);
      const voteText = voteScore > 0 ? `+${voteScore}` : voteScore.toString();

      embed.addFields({
        name: `🍿 ${movie.title}`,
        value: `📺 ${movie.where_to_watch}\n👤 <@${movie.recommended_by}>\n🗳️ Score: ${voteText} (${movie.upvotes || 0}👍 ${movie.downvotes || 0}👎)`,
        inline: true
      });
    }

    embed.setFooter({
      text: 'Vote on movies in the channel to help decide what to watch!'
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error showing movie queue:', error);
    await interaction.reply({
      content: '❌ Failed to retrieve movie queue.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMovieHelp(interaction) {
  const helpEmbed = embeds.createHelpEmbed();
  await interaction.reply({
    embeds: [helpEmbed],
    flags: MessageFlags.Ephemeral
  });
}

async function handleMovieConfigure(interaction) {
  const { permissions } = require('./services');

  // Check admin permissions
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this command.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - configuration features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const action = interaction.options.getString('action');
  const guildId = interaction.guild.id;

  try {
    switch (action) {
      case 'set-channel':
        await configureMovieChannel(interaction, guildId);
        break;

      case 'add-admin-role':
        await addAdminRole(interaction, guildId);
        break;
      case 'remove-admin-role':
        await removeAdminRole(interaction, guildId);
        break;
      case 'set-notification-role':
        await setNotificationRole(interaction, guildId);
        break;
      case 'view-settings':
        await viewSettings(interaction, guildId);
        break;
      case 'reset':
        await resetConfiguration(interaction, guildId);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown configuration action.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Configuration error:', error);
    await interaction.reply({
      content: '❌ Configuration failed. Check console for details.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMovieCleanup(interaction) {
  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - configuration features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if user has proper permissions
  const { permissions } = require('./services');
  const hasPermission = await permissions.checkMovieAdminPermission(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need Administrator permissions or a configured admin role to use this command.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if this is the configured movie channel (cleanup only works in movie channel)
  const config = await database.getGuildConfig(interaction.guild.id);
  if (config && config.movie_channel_id && config.movie_channel_id !== interaction.channel.id) {
    await interaction.reply({
      content: `❌ Cleanup can only be used in the configured movie channel: <#${config.movie_channel_id}>\n\n*Admin commands work anywhere, but cleanup must be in the movie channel for safety.*`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const action = interaction.options.getString('action');

  if (action === 'sync') {
    await handleCleanupSync(interaction);
  } else if (action === 'purge') {
    await handleCleanupPurge(interaction);
  } else {
    await interaction.reply({
      content: '❌ Invalid cleanup action. Use "sync" or "purge".',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleCleanupSync(interaction) {
  await interaction.reply({
    content: '🧹 Starting comprehensive channel sync... This may take a moment.',
    flags: MessageFlags.Ephemeral
  });

  try {
    const channel = interaction.channel;
    const botId = interaction.client.user.id;
    let updatedCount = 0;
    let processedCount = 0;
    let orphanedCount = 0;
    let syncedCount = 0;

    // Step 1: Get all movies from database for this channel
    const dbMovies = await database.getMoviesByChannel(interaction.guild.id, channel.id);
    const dbMovieIds = new Set(dbMovies.map(movie => movie.message_id));

    // Step 2: Fetch recent messages (Discord API limit is 100 per request)
    // Fetch up to 200 messages in two batches for more comprehensive cleanup
    let allMessages = new Map();

    try {
      // First batch (most recent 100)
      const firstBatch = await channel.messages.fetch({ limit: 100 });
      firstBatch.forEach((msg, id) => allMessages.set(id, msg));

      // Second batch (next 100) if first batch was full
      if (firstBatch.size === 100) {
        const lastMessageId = Array.from(firstBatch.keys()).pop();
        const secondBatch = await channel.messages.fetch({ limit: 100, before: lastMessageId });
        secondBatch.forEach((msg, id) => allMessages.set(id, msg));
      }
    } catch (error) {
      console.warn('Error fetching additional messages:', error.message);
      // Continue with what we have
    }

    const botMessages = new Map();
    for (const [id, msg] of allMessages) {
      if (msg.author.id === botId) {
        botMessages.set(id, msg);
      }
    }

    // Step 3: Process each bot message
    for (const [messageId, message] of botMessages) {
      processedCount++;

      // Check if this is a movie recommendation message
      const isMovieMessage = message.embeds.length > 0 &&
                            message.embeds[0].title &&
                            !message.embeds[0].title.includes('Quick Guide');

      if (isMovieMessage) {
        // Check if movie exists in database
        if (!dbMovieIds.has(messageId)) {
          // Orphaned message - movie was deleted from database
          try {
            await message.delete();
            orphanedCount++;
            console.log(`🗑️ Deleted orphaned movie message: ${messageId}`);
          } catch (error) {
            console.warn(`Failed to delete orphaned message ${messageId}:`, error.message);
          }
          continue;
        }

        // Sync message with database state
        const movie = dbMovies.find(m => m.message_id === messageId);
        if (movie) {
          // Sync message with database (may recreate at bottom for better UX)
          const synced = await syncMessageWithDatabase(message, movie);
          if (synced) {
            syncedCount++;
          }
        }
      }

      // Skip if message already has the current format
      if (isCurrentFormat(message)) {
        continue;
      }

      // Try to update the message to current format
      const updated = await updateMessageToCurrentFormat(message);
      if (updated) {
        updatedCount++;
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 4: Clean orphaned database entries (movies without Discord messages)
    const messageIds = new Set(botMessages.keys());
    const orphanedDbEntries = dbMovies.filter(movie => !messageIds.has(movie.message_id));
    let cleanedDbCount = 0;

    if (orphanedDbEntries.length > 0) {
      console.log(`🗑️ Found ${orphanedDbEntries.length} orphaned database entries, cleaning up...`);

      for (const orphanedMovie of orphanedDbEntries) {
        try {
          // Delete associated session if exists
          const session = await database.getSessionByMovieId(orphanedMovie.message_id);
          if (session) {
            await database.deleteMovieSession(session.id);
            console.log(`🗑️ Deleted orphaned session: ${session.name} (ID: ${session.id})`);
          }

          // Delete votes for this movie
          await database.deleteVotesByMessageId(orphanedMovie.message_id);

          // Delete the movie record
          await database.deleteMovie(orphanedMovie.message_id);
          cleanedDbCount++;

          console.log(`🗑️ Cleaned orphaned database entry: ${orphanedMovie.title} (Message ID: ${orphanedMovie.message_id})`);
        } catch (error) {
          console.error(`Error cleaning orphaned entry ${orphanedMovie.title}:`, error.message);
        }
      }
    }

    // Step 5: Sync Discord events with database
    let eventSyncResults = { syncedCount: 0, deletedCount: 0 };
    try {
      const discordEvents = require('./services/discord-events');
      eventSyncResults = await discordEvents.syncDiscordEventsWithDatabase(interaction.guild);
    } catch (error) {
      console.warn('Error syncing Discord events:', error.message);
    }

    const summary = [
      `✅ **Comprehensive cleanup complete!**`,
      `📊 Processed ${processedCount} messages (from ${allMessages.size} total fetched)`,
      `🔄 Updated ${updatedCount} to current format`,
      `🗑️ Removed ${orphanedCount} orphaned messages`,
      `🔗 Synced ${syncedCount} messages with database`,
      `🎪 Synced ${eventSyncResults.syncedCount} Discord events, deleted ${eventSyncResults.deletedCount} orphaned events`,
      `🗑️ Cleaned ${cleanedDbCount} orphaned database entries`
    ];

    // Note: Orphaned database entries are now automatically cleaned up

    await interaction.followUp({
      content: summary.join('\n'),
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    await interaction.followUp({
      content: '❌ Cleanup failed. Check console for details.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function syncMessageWithDatabase(message, movie) {
  try {
    const { embeds, components } = require('./utils');

    // Check if message status matches database status AND has proper IMDb data
    const currentEmbed = message.embeds[0];
    if (!currentEmbed) return false;

    // Extract current status from embed
    const statusField = currentEmbed.fields?.find(field => field.name === '📊 Status');
    let currentStatus = 'pending'; // default

    if (statusField) {
      if (statusField.value.includes('Watched')) currentStatus = 'watched';
      else if (statusField.value.includes('Planned')) currentStatus = 'planned';
      else if (statusField.value.includes('Scheduled')) currentStatus = 'scheduled';
      else if (statusField.value.includes('Skipped')) currentStatus = 'skipped';
    }

    // Check if IMDb data is missing (no thumbnail)
    const hasPoster = currentEmbed.thumbnail && currentEmbed.thumbnail.url;
    const shouldHavePoster = movie.imdb_data && movie.imdb_data.Poster && movie.imdb_data.Poster !== 'N/A';
    const needsIMDbRestore = shouldHavePoster && !hasPoster;

    // If status matches AND IMDb data is present, no sync needed
    if (currentStatus === movie.status && !needsIMDbRestore) {
      return false;
    }

    console.log(`🔄 Syncing message ${message.id}: ${currentStatus} → ${movie.status}${needsIMDbRestore ? ' (restoring IMDb data)' : ''}`);

    // For any movie that needs significant updates, recreate at bottom for better UX
    if (needsIMDbRestore || movie.status === 'planned' || movie.status === 'scheduled') {
      return await recreateMovieAtBottom(message, movie, message.channel);
    }

    // For simple status updates, sync in place
    const updatedEmbed = embeds.createMovieEmbed(movie);
    const updatedComponents = components.createStatusButtons(movie.message_id, movie.status);

    // Update the message
    await message.edit({
      embeds: [updatedEmbed],
      components: updatedComponents || []
    });

    return true;

  } catch (error) {
    console.error(`Error syncing message ${message.id}:`, error);
    return false;
  }
}

async function recreateMovieAtBottom(oldMessage, movie, channel) {
  try {
    console.log(`🔄 Recreating movie at bottom: ${movie.title} (status: ${movie.status})`);

    // CRITICAL: Preserve vote data before deleting message
    const oldMessageId = oldMessage.id;
    let voteData = { up: 0, down: 0 };

    try {
      voteData = await database.getVoteCounts(oldMessageId);
      console.log(`📊 Preserving votes: ${voteData.up} up, ${voteData.down} down`);
    } catch (error) {
      console.warn('Could not get vote counts:', error.message);
    }

    // Create new embed using the standard movie embed function (preserves IMDb data)
    const { embeds, components } = require('./utils');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    // Use the standard movie embed which properly handles IMDb data
    const imdbData = movie.imdb_data ? (typeof movie.imdb_data === 'string' ? JSON.parse(movie.imdb_data) : movie.imdb_data) : null;
    const movieEmbed = embeds.createMovieEmbed(movie, imdbData);
    let movieComponents;

    // Handle different statuses
    if (movie.status === 'scheduled') {
      // Get session info for scheduled movies
      const session = await database.getSessionByMovieId(movie.message_id);
      if (session) {
        // Update embed for scheduled status
        movieEmbed.setColor(0x57f287); // Green for scheduled

        // Update status field
        const statusFieldIndex = movieEmbed.data.fields?.findIndex(field => field.name === '📊 Status');
        if (statusFieldIndex !== -1) {
          movieEmbed.data.fields[statusFieldIndex] = {
            name: '📊 Status',
            value: `🗓️ **Scheduled for Session**\n📝 Session: ${session.name}\n🆔 Session ID: ${session.id}`,
            inline: true
          };
        }

        // Add session timing if available
        if (session.scheduled_date) {
          const timestamp = Math.floor(new Date(session.scheduled_date).getTime() / 1000);
          movieEmbed.addFields({
            name: '🗓️ Session Info',
            value: `📅 **When:** <t:${timestamp}:F>\n🎪 **Session:** ${session.name}`,
            inline: false
          });
        }

        movieEmbed.setFooter({ text: `Scheduled for movie session • Session ID: ${session.id}` });

        // Create session management buttons
        movieComponents = [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`session_reschedule:${session.id}:${movie.message_id}`)
              .setLabel('📅 Reschedule')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🔄'),
            new ButtonBuilder()
              .setCustomId(`session_cancel:${session.id}:${movie.message_id}`)
              .setLabel('❌ Cancel Event')
              .setStyle(ButtonStyle.Danger)
          )
        ];
      } else {
        // No session found, treat as planned
        movieComponents = components.createStatusButtons(movie.message_id, 'planned');
      }
    } else {
      // For all other statuses, use standard components
      movieComponents = components.createStatusButtons(movie.message_id, movie.status);
    }

    // Delete the old message
    await oldMessage.delete();
    console.log(`🗑️ Deleted old movie message: ${oldMessage.id}`);

    // Create new message at bottom (before guide)
    const newMessage = await channel.send({
      embeds: [movieEmbed],
      components: movieComponents
    });

    // CRITICAL: Transfer votes from old message to new message
    const newMessageId = newMessage.id;

    try {
      // Transfer all votes from old message ID to new message ID
      await database.transferVotes(oldMessageId, newMessageId);
      console.log(`📊 Transferred votes from ${oldMessageId} to ${newMessageId}`);

      // Update the movie record with new message ID
      await database.updateMovieMessageId(movie.guild_id, movie.title, newMessageId);

      // Update the message components with correct vote counts
      if (voteData.up > 0 || voteData.down > 0) {
        // Create vote buttons with counts and status buttons
        const voteButtons = components.createVoteButtons(newMessageId);
        const statusButtons = components.createStatusButtons(newMessageId, movie.status);

        // Combine vote and status buttons
        const updatedComponents = [voteButtons, ...statusButtons];

        await newMessage.edit({ components: updatedComponents });
        console.log(`📊 Updated vote display: ${voteData.up} up, ${voteData.down} down`);
      }
    } catch (error) {
      console.error('Error transferring votes:', error);
      // Continue anyway - movie is recreated even if votes fail
    }

    // Ensure guide message stays at bottom
    await ensureGuideAtBottom(channel);

    console.log(`✅ Recreated movie at bottom: ${movie.title} (new ID: ${newMessageId})`);
    return true;

  } catch (error) {
    console.error(`Error recreating movie at bottom:`, error);
    return false;
  }
}

async function ensureGuideAtBottom(channel) {
  try {
    // Find existing guide messages
    const messages = await channel.messages.fetch({ limit: 10 });
    const guideMessages = messages.filter(msg =>
      msg.author.id === channel.client.user.id &&
      msg.embeds.length > 0 &&
      msg.embeds[0].title &&
      msg.embeds[0].title.includes('Quick Guide')
    );

    if (guideMessages.size > 0) {
      // Delete existing guide messages
      for (const [, guideMsg] of guideMessages) {
        await guideMsg.delete();
      }
    }

    // Create new guide at bottom with recommendation button
    const { embeds } = require('./utils');
    const guideEmbed = embeds.createHelpEmbed();

    // Create recommendation button (not config buttons)
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const recommendButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_recommendation')
          .setLabel('🍿 Recommend a Movie')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({
      embeds: [guideEmbed],
      components: [recommendButton]
    });

    console.log('✅ Ensured guide message is at bottom');

  } catch (error) {
    console.warn('Error ensuring guide at bottom:', error.message);
  }
}

async function handleCleanupPurge(interaction) {
  await interaction.reply({
    content: '⚠️ **PURGE CONFIRMATION REQUIRED**\n\nThis will permanently delete ALL movie recommendations and their data (except scheduled movies with active events).\n\n**This action cannot be undone!**',
    flags: MessageFlags.Ephemeral
  });

  // Create confirmation buttons
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const confirmButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_purge')
        .setLabel('🗑️ YES, PURGE ALL RECOMMENDATIONS')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_purge')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.followUp({
    content: '**⚠️ FINAL WARNING:** This will delete all movie recommendations, votes, and discussion threads.\n\n**Scheduled movies with active Discord events will be preserved.**',
    components: [confirmButtons],
    flags: MessageFlags.Ephemeral
  });
}

async function executePurge(interaction) {
  try {
    await interaction.update({
      content: '🗑️ **PURGING ALL RECOMMENDATIONS...**\n\nThis may take a moment...',
      components: []
    });

    const channel = interaction.channel;
    const botId = interaction.client.user.id;
    let deletedMessages = 0;
    let deletedMovies = 0;
    let deletedVotes = 0;
    let preservedScheduled = 0;

    // Get all movies from database
    const allMovies = await database.getMoviesByChannel(interaction.guild.id, channel.id);

    // Separate scheduled movies with active events from others
    const moviesToDelete = [];
    const moviesToPreserve = [];

    for (const movie of allMovies) {
      if (movie.status === 'scheduled') {
        // Check if it has an active Discord event
        const session = await database.getSessionByMovieId(movie.message_id);
        if (session && session.discord_event_id) {
          try {
            const event = await interaction.guild.scheduledEvents.fetch(session.discord_event_id);
            if (event) {
              moviesToPreserve.push(movie);
              preservedScheduled++;
              continue;
            }
          } catch (error) {
            // Event doesn't exist, safe to delete
          }
        }
      }
      moviesToDelete.push(movie);
    }

    // Delete Discord messages for movies to be deleted
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(msg => msg.author.id === botId);

    for (const [messageId, message] of botMessages) {
      // Check if this message is for a movie we're deleting
      const movieToDelete = moviesToDelete.find(m => m.message_id === messageId);
      if (movieToDelete) {
        try {
          await message.delete();
          deletedMessages++;

          // Delete associated thread if exists
          if (message.hasThread) {
            await message.thread.delete();
          }
        } catch (error) {
          console.warn(`Failed to delete message ${messageId}:`, error.message);
        }
      }
    }

    // Delete database records for movies to be deleted
    for (const movie of moviesToDelete) {
      try {
        // Delete associated session if exists
        const session = await database.getSessionByMovieId(movie.message_id);
        if (session) {
          await database.deleteMovieSession(session.id);
        }

        // Delete votes
        await database.deleteVotesByMessageId(movie.message_id);
        deletedVotes++;

        // Delete movie
        await database.deleteMovie(movie.message_id);
        deletedMovies++;

      } catch (error) {
        console.error(`Error deleting movie ${movie.title}:`, error.message);
      }
    }

    // Recreate guide message
    await ensureGuideAtBottom(channel);

    const summary = [
      `✅ **PURGE COMPLETE**`,
      `🗑️ Deleted ${deletedMessages} Discord messages`,
      `🎬 Deleted ${deletedMovies} movie recommendations`,
      `📊 Deleted ${deletedVotes} vote records`,
      `🛡️ Preserved ${preservedScheduled} scheduled movies with active events`,
      `📋 Guide message recreated`
    ];

    await interaction.followUp({
      content: summary.join('\n'),
      flags: MessageFlags.Ephemeral
    });

    console.log(`✅ Purge complete: ${deletedMovies} movies, ${deletedMessages} messages, ${preservedScheduled} preserved`);

  } catch (error) {
    console.error('Error during purge:', error);
    await interaction.followUp({
      content: '❌ Error during purge operation. Check console for details.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMovieStats(interaction) {
  const type = interaction.options.getString('type') || 'overview';
  const user = interaction.options.getUser('user');

  try {
    switch (type) {
      case 'overview':
        await showOverviewStats(interaction);
        break;
      case 'top-movies':
        await showTopMovies(interaction);
        break;
      case 'user-stats':
        await showUserStats(interaction, user);
        break;
      case 'monthly':
        await showMonthlyStats(interaction);
        break;
      default:
        await showOverviewStats(interaction);
    }
  } catch (error) {
    console.error('Error showing movie stats:', error);
    await interaction.reply({
      content: '❌ Failed to retrieve statistics.',
      flags: MessageFlags.Ephemeral
    });
  }
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

// Helper functions for cleanup
function isCurrentFormat(message) {
  // Check if message has the current button format
  if (message.embeds.length === 0) return false;

  const embed = message.embeds[0];

  // Check if it's a movie recommendation embed
  if (!embed.title || !embed.title.includes('🍿')) return false;

  // Check if it has current button format
  if (message.components.length === 0) return false;

  const hasVoteButtons = message.components.some(row =>
    row.components.some(component =>
      component.customId && component.customId.includes('mn:up:')
    )
  );

  return hasVoteButtons;
}

async function updateMessageToCurrentFormat(message) {
  try {
    // Get movie data from database
    const movie = await database.getMovieByMessageId(message.id);
    if (!movie) return false;

    // Create updated embed and components
    const { embeds, components } = require('./utils');
    const embed = embeds.createMovieEmbed(movie);
    const movieComponents = components.createStatusButtons(message.id, movie.status);

    // Update the message
    await message.edit({
      embeds: [embed],
      components: movieComponents
    });

    return true;
  } catch (error) {
    console.warn(`Failed to update message ${message.id}:`, error.message);
    return false;
  }
}

// Configuration helper functions
async function configureMovieChannel(interaction, guildId) {
  const channel = interaction.options.getChannel('channel') || interaction.channel;

  const success = await database.setMovieChannel(guildId, channel.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Movie channel set to ${channel}**\n\nCleanup commands will only work in this channel for safety.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set movie channel.',
      flags: MessageFlags.Ephemeral
    });
  }
}



async function addAdminRole(interaction, guildId) {
  const role = interaction.options.getRole('role');
  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to add as admin.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.addAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Admin role added!**\n\nUsers with the ${role} role can now use admin commands.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to add admin role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function removeAdminRole(interaction, guildId) {
  const role = interaction.options.getRole('role');
  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to remove from admin.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.removeAdminRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Admin role removed!**\n\nUsers with the ${role} role can no longer use admin commands.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to remove admin role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function viewSettings(interaction, guildId) {
  const config = await database.getGuildConfig(guildId);

  if (!config) {
    await interaction.reply({
      content: '❌ Failed to retrieve guild configuration.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const hasAdminRoles = config.admin_roles && config.admin_roles.length > 0;

  const { embeds } = require('./utils');
  const embed = embeds.createSuccessEmbed(
    '🎬 Movie Bot Configuration',
    `**Movie Channel:** ${config.movie_channel_id ? `<#${config.movie_channel_id}>` : 'Not configured - bot works in any channel'}\n\n` +
    `**Admin Roles:** ${hasAdminRoles ? config.admin_roles.map(id => `<@&${id}>`).join(', ') : 'None - only Discord Administrators can use admin commands'}\n\n` +
    `**Notification Role:** ${config.notification_role_id ? `<@&${config.notification_role_id}>` : 'Not configured - no role will be pinged for events'}\n\n` +
    `**Timezone Handling:** Users select timezone when creating sessions (more flexible!)`
  );

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function setNotificationRole(interaction, guildId) {
  const role = interaction.options.getRole('role');

  if (!role) {
    await interaction.reply({
      content: '❌ Please specify a role to set as the notification role.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const success = await database.setNotificationRole(guildId, role.id);
  if (success) {
    await interaction.reply({
      content: `✅ **Notification role set to ${role}**\n\nThis role will be pinged when movie night events are created.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to set notification role.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function resetConfiguration(interaction, guildId) {
  const success = await database.resetGuildConfig(guildId);
  if (success) {
    await interaction.reply({
      content: '✅ **Configuration reset!**\n\nAll settings have been reset to defaults.',
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to reset configuration.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Statistics helper functions
async function showOverviewStats(interaction) {
  const guildId = interaction.guild.id;
  const stats = await database.getMovieStats(guildId);

  // Get accurate count of active scheduled events
  let activeScheduledEvents = 0;
  try {
    const sessions = await database.getAllSessions(guildId);
    for (const session of sessions) {
      if (session.discord_event_id) {
        try {
          const event = await interaction.guild.scheduledEvents.fetch(session.discord_event_id);
          if (event) {
            activeScheduledEvents++;
          }
        } catch (error) {
          // Event doesn't exist, don't count it
        }
      }
    }
  } catch (error) {
    console.warn('Error counting active events:', error.message);
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 Movie Night Statistics')
    .setDescription('Overview of movie recommendations and activity')
    .setColor(0x5865f2)
    .addFields(
      { name: '🍿 Total Movies', value: stats.totalMovies.toString(), inline: true },
      { name: '✅ Watched', value: stats.watchedMovies.toString(), inline: true },
      { name: '📌 Planned', value: stats.plannedMovies.toString(), inline: true },
      { name: '🗳️ Pending Votes', value: stats.pendingMovies.toString(), inline: true },
      { name: '👥 Active Users', value: stats.activeUsers.toString(), inline: true },
      { name: '🎪 Scheduled Events', value: activeScheduledEvents.toString(), inline: true }
    )
    .setFooter({ text: `Stats for ${interaction.guild.name}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function showTopMovies(interaction) {
  const topMovies = await database.getTopVotedMovies(interaction.guild.id, 10);

  if (!topMovies || topMovies.length === 0) {
    await interaction.reply({
      content: '📊 No movies with votes found yet!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Top Voted Movies')
    .setDescription('Movies ranked by vote score (upvotes - downvotes)')
    .setColor(0xffd700);

  topMovies.forEach((movie, index) => {
    const score = (movie.upvotes || 0) - (movie.downvotes || 0);
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

    embed.addFields({
      name: `${medal} ${movie.title}`,
      value: `📺 ${movie.where_to_watch}\n🗳️ Score: ${score > 0 ? '+' : ''}${score} (${movie.upvotes || 0}👍 ${movie.downvotes || 0}👎)\n👤 <@${movie.recommended_by}>`,
      inline: false
    });
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function showUserStats(interaction, user) {
  const targetUser = user || interaction.user;
  const userStats = await database.getUserStats(interaction.guild.id, targetUser.id);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${targetUser.displayName || targetUser.username}'s Movie Stats`)
    .setDescription('Personal movie recommendation statistics')
    .setColor(0x5865f2)
    .addFields(
      { name: '🍿 Movies Recommended', value: userStats.recommended.toString(), inline: true },
      { name: '👍 Total Upvotes Received', value: userStats.upvotesReceived.toString(), inline: true },
      { name: '👎 Total Downvotes Received', value: userStats.downvotesReceived.toString(), inline: true },
      { name: '🏆 Net Score', value: (userStats.upvotesReceived - userStats.downvotesReceived).toString(), inline: true },
      { name: '✅ Movies Watched', value: userStats.watched.toString(), inline: true },
      { name: '📌 Movies Planned', value: userStats.planned.toString(), inline: true }
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setFooter({ text: `Stats for ${interaction.guild.name}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function showMonthlyStats(interaction) {
  const monthlyStats = await database.getMonthlyStats(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('📅 Monthly Movie Activity')
    .setDescription('Movie recommendations by month')
    .setColor(0x5865f2);

  if (monthlyStats.length === 0) {
    embed.setDescription('No monthly data available yet.');
  } else {
    monthlyStats.forEach(stat => {
      embed.addFields({
        name: stat.month,
        value: `🍿 ${stat.movies} movies\n🎪 ${stat.sessions} sessions`,
        inline: true
      });
    });
  }

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

// Movie recommendation helper function
async function createMovieRecommendation(interaction, movieData) {
  try {
    // Add movie to database
    const success = await database.addMovie(
      movieData.guildId,
      movieData.channelId,
      movieData.title,
      movieData.whereToWatch,
      movieData.recommendedBy
    );

    if (!success) {
      return null;
    }

    // Create embed and components
    const { embeds, components } = require('./utils');
    const movie = {
      title: movieData.title,
      where_to_watch: movieData.whereToWatch,
      recommended_by: movieData.recommendedBy,
      status: 'pending',
      created_at: new Date()
    };

    const embed = embeds.createMovieEmbed(movie);
    const movieComponents = components.createStatusButtons('temp', 'pending');

    // Send message to channel
    const message = await interaction.channel.send({
      embeds: [embed],
      components: movieComponents
    });

    // Update database with message ID
    await database.updateMovieMessageId(movieData.guildId, movieData.title, message.id);

    return message.id;
  } catch (error) {
    console.error('Error creating movie recommendation:', error);
    return null;
  }
}

// Start the bot
client.login(DISCORD_TOKEN);
