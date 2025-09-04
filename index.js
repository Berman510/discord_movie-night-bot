/**
 * Movie Night Bot — IMDb (OMDb) lookup + threads + clean UI + forum fallback + better perms
 * Version: 1.3.3
 */

require('dotenv').config();
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  InteractionType,
  ModalBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const database = require('./database');
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, OMDB_API_KEY } = process.env;
const BOT_VERSION = require('./package.json').version;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

// In-memory vote store: { [messageId]: { up:Set<userId>, down:Set<userId> } }
const votes = new Map();

// Track the last guide message per channel to keep only the most recent one
const lastGuideMessages = new Map(); // { [channelId]: messageId }

// Temporary store for modal → select payloads (title/where), keyed by a short token
const pendingPayloads = new Map(); // key -> { title, where, createdAt }
// TTL cleanup (15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingPayloads) {
    if (now - (v.createdAt || 0) > 15 * 60 * 1000) pendingPayloads.delete(k);
  }
}, 60 * 1000);

const COMMANDS = [
  {
    name: 'movie-night',
    description: 'Post a “Create Recommendation” button in this channel',
  },
  {
    name: 'movie-queue',
    description: 'View the current movie queue and manage suggestions',
  },
  {
    name: 'movie-stats',
    description: 'View movie night statistics and leaderboards',
  },
  {
    name: 'movie-session',
    description: 'Create and manage movie night events',
    options: [
      {
        name: 'action',
        description: 'What to do with movie sessions',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'create', value: 'create' },
          { name: 'list', value: 'list' },
          { name: 'close-voting', value: 'close' },
          { name: 'pick-winner', value: 'winner' }
        ]
      },
      {
        name: 'name',
        description: 'Name for the movie night session (for create action)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'date',
        description: 'Date/time for the movie night (e.g., "Friday 8pm" or "2025-09-05 20:00")',
        type: 3, // STRING
        required: false
      }
    ]
  },
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: COMMANDS });
    console.log(`✅ Registered GUILD commands to ${GUILD_ID}`);
  } else {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: COMMANDS });
    console.log('✅ Registered GLOBAL commands (public)');
  }
}

function makeCreateButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mn:create').setLabel('🎬 Create recommendation').setStyle(ButtonStyle.Primary)
  );
}

function makeQuickGuideEmbed() {
  return new EmbedBuilder()
    .setTitle('🎬 Movie Night Bot - Quick Guide')
    .setDescription('Use the button above to add a movie recommendation!')
    .addFields(
      { name: '🗳️ Commands', value: '`/movie-queue` - View pending movies\n`/movie-stats` - See statistics\n`/movie-session create` - Organize events', inline: true },
      { name: '🎯 Voting', value: 'Use 👍/👎 to vote on movies\nUse status buttons to manage movies', inline: true },
      { name: '📊 Status Options', value: '✅ Watched - Mark as completed\n📌 Plan Later - Save for future\n⏭️ Skip - Remove from queue', inline: false }
    )
    .setColor(0x2b2d31)
    .setFooter({ text: 'Movie recommendations are saved permanently with database!' });
}

async function postPersistentGuide(channel) {
  try {
    // Delete the previous guide message if it exists
    const lastGuideId = lastGuideMessages.get(channel.id);
    if (lastGuideId) {
      try {
        const lastGuide = await channel.messages.fetch(lastGuideId);
        await lastGuide.delete();
      } catch (e) {
        // Message might already be deleted or not found, that's okay
      }
    }

    // Post the new guide message
    const guideMessage = await channel.send({
      embeds: [makeQuickGuideEmbed()],
      components: [makeCreateButtonRow()]
    });

    // Track this as the latest guide message for this channel
    lastGuideMessages.set(channel.id, guideMessage.id);
  } catch (e) {
    console.warn('Failed to post persistent guide:', e?.message || e);
  }
}

function makeVoteButtons(messageId, upCount = 0, downCount = 0, status = 'pending') {
  const voteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mn:up:${messageId}`).setLabel(`👍 ${upCount}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`mn:down:${messageId}`).setLabel(`👎 ${downCount}`).setStyle(ButtonStyle.Danger)
  );

  // Add status management buttons for pending movies
  if (status === 'pending') {
    const statusRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mn:watched:${messageId}`).setLabel('✅ Watched').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`mn:planned:${messageId}`).setLabel('📌 Plan Later').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`mn:skipped:${messageId}`).setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary)
    );
    return [voteRow, statusRow];
  }

  return [voteRow];
}

function makeStatusButtons(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mn:watched:${messageId}`).setLabel('✅ Watched').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mn:planned:${messageId}`).setLabel('📌 Plan Later').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mn:skipped:${messageId}`).setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary)
  );
}

function makeModal() {
  const modal = new ModalBuilder().setCustomId('mn:modal').setTitle('New Movie Recommendation');

  const title = new TextInputBuilder()
    .setCustomId('mn:title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Barbie (2023)')
    .setRequired(true);

  const where = new TextInputBuilder()
    .setCustomId('mn:where')
    .setLabel('Where to stream')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Max, Netflix, Prime Video, etc.')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(where)
  );
  return modal;
}

function makeRecommendationEmbed({ title, where, user, imdb }) {
  const embed = new EmbedBuilder()
    .setTitle(`🍿 ${title}`)
    .setDescription(`**Where to watch:** ${where}\n\nRecommended by <@${user.id}>`)
    .setColor(0x5865f2)
    .setTimestamp(new Date());
  if (imdb?.Poster && imdb.Poster !== 'N/A') embed.setThumbnail(imdb.Poster);
  if (imdb?.Rated && imdb.Rated !== 'N/A') embed.addFields({ name: 'Rated', value: imdb.Rated, inline: true });
  if (imdb?.imdbRating && imdb.imdbRating !== 'N/A') embed.addFields({ name: 'IMDb', value: `${imdb.imdbRating}/10`, inline: true });
  if (imdb?.Metascore && imdb.Metascore !== 'N/A') embed.addFields({ name: 'Metascore', value: imdb.Metascore, inline: true });
  return embed;
}

function humanizePerm(flag) {
  const map = {
    [PermissionFlagsBits.ViewChannel]: 'View Channel',
    [PermissionFlagsBits.ReadMessageHistory]: 'Read Message History',
    [PermissionFlagsBits.EmbedLinks]: 'Embed Links',
    [PermissionFlagsBits.SendMessages]: 'Send Messages',
    [PermissionFlagsBits.CreatePublicThreads]: 'Create Public Threads',
    [PermissionFlagsBits.SendMessagesInThreads]: 'Send Messages in Threads',
  };
  return map[flag] || `Perm ${String(flag)}`;
}

function getRequiredPermsFor(channel) {
  const base = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
  ];
  if (channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildMedia) {
    // Creating a forum post (thread) with a starter message
    return base.concat([
      PermissionFlagsBits.SendMessages, // "Create Posts"
      PermissionFlagsBits.SendMessagesInThreads,
    ]);
  }
  // Normal text channel: send a message, then create a public thread, then send in thread
  return base.concat([
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.CreatePublicThreads,
    PermissionFlagsBits.SendMessagesInThreads,
  ]);
}

function checkChannelPerms(interaction) {
  const channel = interaction.channel;
  const me = interaction.guild?.members?.me;
  if (!channel || !me) return { ok: false, missing: ['Unknown (no channel/member)'] };
  const needed = getRequiredPermsFor(channel);
  const perms = channel.permissionsFor(me);
  if (!perms) return { ok: false, missing: ['View Channel'] };
  const missing = needed.filter((f) => !perms.has(f));
  return { ok: missing.length === 0, missing: missing.map(humanizePerm), type: channel.type };
}

async function postRecommendation(interaction, { title, where, imdb }) {
  const embed = makeRecommendationEmbed({ title, where, user: interaction.user, imdb });
  const channel = interaction.channel;
  const components = makeVoteButtons('pending', 0, 0, 'pending');

  // Forum/media channels: create a post with starter message
  if (channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildMedia) {
    const post = await channel.threads.create({
      name: `${title} — Discussion`,
      autoArchiveDuration: 1440,
      message: { embeds: [embed], components },
    });
    const root = await post.fetchStarterMessage().catch(() => null);
    const baseMsg = root ?? await post.send({ embeds: [embed], components });

    // Store in memory for immediate use
    votes.set(baseMsg.id, { up: new Set(), down: new Set() });

    // Save to database
    await database.saveMovie({
      messageId: baseMsg.id,
      guildId: interaction.guild.id,
      channelId: channel.id,
      title,
      whereToWatch: where,
      recommendedBy: interaction.user.id,
      imdbId: imdb?.imdbID || null,
      imdbData: imdb || null
    });

    const finalComponents = makeVoteButtons(baseMsg.id, 0, 0, 'pending');
    await baseMsg.edit({ components: finalComponents });

    // Seed details
    const base = `Discussion for **${title}** (recommended by <@${interaction.user.id}>)`;
    if (imdb) {
      const synopsis = imdb.Plot && imdb.Plot !== 'N/A' ? imdb.Plot : 'No synopsis available.';
      const details = [
        imdb.Year && `**Year:** ${imdb.Year}`,
        imdb.Rated && imdb.Rated !== 'N/A' && `**Rated:** ${imdb.Rated}`,
        imdb.Runtime && imdb.Runtime !== 'N/A' && `**Runtime:** ${imdb.Runtime}`,
        imdb.Genre && imdb.Genre !== 'N/A' && `**Genre:** ${imdb.Genre}`,
        imdb.Director && imdb.Director !== 'N/A' && `**Director:** ${imdb.Director}`,
        imdb.Actors && imdb.Actors !== 'N/A' && `**Top cast:** ${imdb.Actors}`,
      ].filter(Boolean).join(String.fromCharCode(10));
      await post.send({ content: `${base}\n\n**Synopsis:** ${synopsis}\n\n${details}` });
    } else {
      await post.send({ content: `${base}\n\nIMDb details weren’t available at creation time.` });
    }

    // Add persistent recommendation button and guide (only for the latest movie)
    await postPersistentGuide(post);
    return;
  }

  // Normal text channels: send a message, then thread
  const placeholder = await channel.send({ embeds: [embed], components });

  // Store in memory for immediate use
  votes.set(placeholder.id, { up: new Set(), down: new Set() });

  // Save to database
  await database.saveMovie({
    messageId: placeholder.id,
    guildId: interaction.guild.id,
    channelId: channel.id,
    title,
    whereToWatch: where,
    recommendedBy: interaction.user.id,
    imdbId: imdb?.imdbID || null,
    imdbData: imdb || null
  });

  const finalComponents = makeVoteButtons(placeholder.id, 0, 0, 'pending');
  await placeholder.edit({ components: finalComponents });

  // Create a thread for discussion and seed details from IMDb
  try {
    const thread = await placeholder.startThread({ name: `${title} — Discussion`, autoArchiveDuration: 1440 });
    const base = `Discussion for **${title}** (recommended by <@${interaction.user.id}>)`;
    if (imdb) {
      const synopsis = imdb.Plot && imdb.Plot !== 'N/A' ? imdb.Plot : 'No synopsis available.';
      const details = [
        imdb.Year && `**Year:** ${imdb.Year}`,
        imdb.Rated && imdb.Rated !== 'N/A' && `**Rated:** ${imdb.Rated}`,
        imdb.Runtime && imdb.Runtime !== 'N/A' && `**Runtime:** ${imdb.Runtime}`,
        imdb.Genre && imdb.Genre !== 'N/A' && `**Genre:** ${imdb.Genre}`,
        imdb.Director && imdb.Director !== 'N/A' && `**Director:** ${imdb.Director}`,
        imdb.Actors && imdb.Actors !== 'N/A' && `**Top cast:** ${imdb.Actors}`,
      ].filter(Boolean).join(String.fromCharCode(10));
      await thread.send({ content: `${base}\n\n**Synopsis:** ${synopsis}\n\n${details}` });
    } else {
      await thread.send({ content: `${base}\n\nIMDb details weren’t available at creation time.` });
    }
  } catch (e) {
    console.warn('Thread creation failed:', e?.message || e);
  }

  // Add persistent recommendation button and guide (only for the latest movie)
  await postPersistentGuide(channel);
}

async function omdbSearch(title) {
  if (!OMDB_API_KEY) return [];
  try {
    const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}&type=movie&s=${encodeURIComponent(title)}`;
    console.log('🔎 OMDb search:', url);
    let res = await fetch(url);
    if (!res.ok) {
      console.warn('OMDb search HTTP error:', res.status, res.statusText);
      return [];
    }
    let data = await res.json();
    if (data.Response === 'True' && Array.isArray(data.Search)) {
      console.log(`✅ OMDb search results: ${data.Search.length}`);
      return data.Search;
    }
    const urlExact = `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}&type=movie&t=${encodeURIComponent(title)}`;
    console.log('🔎 OMDb exact title:', urlExact);
    res = await fetch(urlExact);
    if (!res.ok) return [];
    data = await res.json();
    if (data.Response === 'True' && data.imdbID) {
      console.log('✅ OMDb exact match found');
      return [{ Title: data.Title, Year: data.Year, imdbID: data.imdbID, Type: data.Type, Poster: data.Poster }];
    }
    console.warn('OMDb returned no results:', data?.Error || 'Unknown');
    return [];
  } catch (e) {
    console.error('OMDb search failed:', e?.message || e);
    return [];
  }
}

async function omdbById(imdbID) {
  if (!OMDB_API_KEY) return null;
  try {
    const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}&i=${encodeURIComponent(imdbID)}&plot=short`;
    console.log('📄 OMDb by ID:', url);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response === 'True') return data;
    console.warn('OMDb by ID error:', data?.Error || 'Unknown');
    return null;
  } catch (e) {
    console.error('OMDb by ID failed:', e?.message || e);
    return null;
  }
}

// Command handlers
async function handleMovieQueue(interaction) {
  const guildId = interaction.guild.id;

  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - queue features require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const pendingMovies = await database.getMoviesByStatus(guildId, 'pending', 10);
  const plannedMovies = await database.getMoviesByStatus(guildId, 'planned', 5);

  if (pendingMovies.length === 0 && plannedMovies.length === 0) {
    await interaction.reply({
      content: '🎬 No movies in the queue! Use `/movie-night` to add some recommendations.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🍿 Movie Queue')
    .setColor(0x5865f2)
    .setTimestamp();

  if (pendingMovies.length > 0) {
    const pendingList = pendingMovies.map((movie, i) =>
      `${i + 1}. **${movie.title}** (${movie.where_to_watch}) - 👍${movie.up_votes} 👎${movie.down_votes}`
    ).join('\n');
    embed.addFields({ name: '🗳️ Pending Votes', value: pendingList, inline: false });
  }

  if (plannedMovies.length > 0) {
    const plannedList = plannedMovies.map((movie, i) =>
      `${i + 1}. **${movie.title}** (${movie.where_to_watch})`
    ).join('\n');
    embed.addFields({ name: '📌 Planned for Later', value: plannedList, inline: false });
  }

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleMovieStats(interaction) {
  const guildId = interaction.guild.id;

  if (!database.isConnected) {
    await interaction.reply({
      content: '⚠️ Database not available - stats require database connection.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const topMovies = await database.getTopMovies(guildId, 5);
  const watchedMovies = await database.getMoviesByStatus(guildId, 'watched', 5);

  const embed = new EmbedBuilder()
    .setTitle('📊 Movie Night Statistics')
    .setColor(0x5865f2)
    .setTimestamp();

  if (topMovies.length > 0) {
    const topList = topMovies.map((movie, i) =>
      `${i + 1}. **${movie.title}** - Score: ${movie.score} (👍${movie.up_votes} 👎${movie.down_votes})`
    ).join('\n');
    embed.addFields({ name: '🏆 Top Rated (Pending)', value: topList, inline: false });
  }

  if (watchedMovies.length > 0) {
    const watchedList = watchedMovies.map((movie, i) =>
      `${i + 1}. **${movie.title}** - ${new Date(movie.watched_at).toLocaleDateString()}`
    ).join('\n');
    embed.addFields({ name: '✅ Recently Watched', value: watchedList, inline: false });
  }

  if (topMovies.length === 0 && watchedMovies.length === 0) {
    embed.setDescription('No movie data available yet. Start recommending movies with `/movie-night`!');
  }

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

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
      await createMovieSession(interaction);
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
    default:
      await interaction.reply({
        content: '❌ Unknown action. Use create, list, close, or winner.',
        flags: MessageFlags.Ephemeral
      });
  }
}

async function createMovieSession(interaction) {
  const name = interaction.options.getString('name') || `Movie Night - ${new Date().toLocaleDateString()}`;
  const dateStr = interaction.options.getString('date');
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;
  const createdBy = interaction.user.id;

  let scheduledDate = null;
  if (dateStr) {
    // Try to parse the date string
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      scheduledDate = parsed;
    }
  }

  const sessionId = await database.createMovieSession({
    guildId,
    channelId,
    name,
    scheduledDate,
    createdBy
  });

  if (!sessionId) {
    await interaction.reply({
      content: '❌ Failed to create movie session.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎬 Movie Night Session Created!')
    .setDescription(`**${name}**`)
    .setColor(0x5865f2)
    .addFields(
      { name: '📅 Scheduled', value: scheduledDate ? scheduledDate.toLocaleString() : 'Not set', inline: true },
      { name: '👤 Organizer', value: `<@${createdBy}>`, inline: true },
      { name: '📍 Channel', value: `<#${channelId}>`, inline: true }
    )
    .setFooter({ text: `Session ID: ${sessionId}` })
    .setTimestamp();

  await interaction.reply({
    content: '🎉 Movie night session created! Start adding recommendations with `/movie-night`',
    embeds: [embed]
  });
}

async function listMovieSessions(interaction) {
  const guildId = interaction.guild.id;
  const sessions = await database.getMovieSessions(guildId, 'planning', 5);

  if (sessions.length === 0) {
    await interaction.reply({
      content: '📅 No active movie sessions. Create one with `/movie-session create`!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎬 Active Movie Sessions')
    .setColor(0x5865f2)
    .setTimestamp();

  const sessionList = sessions.map(session => {
    const date = session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'TBD';
    return `**${session.name}** - ${date} (ID: ${session.id})`;
  }).join('\n');

  embed.setDescription(sessionList);
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function closeSessionVoting(interaction) {
  await interaction.reply({
    content: '🗳️ Voting closure feature coming soon! For now, use `/movie-session winner` to pick a winner.',
    flags: MessageFlags.Ephemeral
  });
}

async function pickSessionWinner(interaction) {
  const guildId = interaction.guild.id;
  const topMovies = await database.getTopMovies(guildId, 1);

  if (topMovies.length === 0) {
    await interaction.reply({
      content: '🎬 No movies to pick from! Add some recommendations first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const winner = topMovies[0];
  const embed = new EmbedBuilder()
    .setTitle('🏆 Movie Night Winner!')
    .setDescription(`**${winner.title}**`)
    .setColor(0xffd700)
    .addFields(
      { name: '📺 Where to Watch', value: winner.where_to_watch, inline: true },
      { name: '🗳️ Final Score', value: `👍${winner.up_votes} 👎${winner.down_votes} (Score: ${winner.score})`, inline: true },
      { name: '👤 Recommended by', value: `<@${winner.recommended_by}>`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({
    content: '🎉 The votes are in! Here\'s tonight\'s movie:',
    embeds: [embed]
  });

  // Mark the winning movie as watched
  await database.updateMovieStatus(winner.message_id, 'watched', new Date());
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
  console.log('==============================');
  console.log(`🎬 Movie Night Bot v${BOT_VERSION}`);
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📦 Client ID: ${CLIENT_ID}`);
  console.log(GUILD_ID ? `🔧 Mode: Guild commands (server ${GUILD_ID})` : '🌍 Mode: Global commands (public)');
  console.log(OMDB_API_KEY ? '🔎 OMDb integration: ENABLED' : '🔎 OMDb integration: DISABLED');
  console.log(database.isConnected ? '🗄️ Database: CONNECTED' : '🗄️ Database: DISCONNECTED (memory-only mode)');
  console.log('==============================');
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'movie-night') {
        await interaction.reply({ content: 'Start a recommendation:', components: [makeCreateButtonRow()] });
        return;
      }

      if (interaction.commandName === 'movie-queue') {
        await handleMovieQueue(interaction);
        return;
      }

      if (interaction.commandName === 'movie-stats') {
        await handleMovieStats(interaction);
        return;
      }

      if (interaction.commandName === 'movie-session') {
        await handleMovieSession(interaction);
        return;
      }
    }

    // Create button → open modal
    if (interaction.isButton()) {
      const [ns, action, msgId] = interaction.customId.split(':');

      if (interaction.customId === 'mn:create') {
        await interaction.showModal(makeModal());
        return;
      }

      // Voting handlers
      if (ns === 'mn' && (action === 'up' || action === 'down')) {
        const messageId = msgId;
        await interaction.deferUpdate().catch(() => {});

        const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
        if (!message) return;

        const userId = interaction.user.id;
        const isUp = action === 'up';

        // Handle database voting
        if (database.isConnected) {
          const currentVotes = await database.getVoteCounts(messageId);
          const userVotedUp = currentVotes.voters.up.includes(userId);
          const userVotedDown = currentVotes.voters.down.includes(userId);

          if (isUp) {
            if (userVotedUp) {
              await database.removeVote(messageId, userId);
            } else {
              await database.saveVote(messageId, userId, 'up');
            }
          } else {
            if (userVotedDown) {
              await database.removeVote(messageId, userId);
            } else {
              await database.saveVote(messageId, userId, 'down');
            }
          }

          // Get updated counts
          const updatedVotes = await database.getVoteCounts(messageId);
          const components = makeVoteButtons(messageId, updatedVotes.up, updatedVotes.down, 'pending');
          await message.edit({ components });
        } else {
          // Fallback to in-memory voting
          if (!votes.has(messageId)) votes.set(messageId, { up: new Set(), down: new Set() });
          const state = votes.get(messageId);

          const addSet = isUp ? state.up : state.down;
          const removeSet = isUp ? state.down : state.up;

          if (removeSet.has(userId)) removeSet.delete(userId);
          if (!addSet.has(userId)) addSet.add(userId); else addSet.delete(userId);

          const components = makeVoteButtons(messageId, state.up.size, state.down.size, 'pending');
          await message.edit({ components });
        }
        return;
      }

      // Status change handlers
      if (ns === 'mn' && (action === 'watched' || action === 'planned' || action === 'skipped')) {
        const messageId = msgId;
        await interaction.deferUpdate().catch(() => {});

        const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
        if (!message) return;

        // Update status in database
        const watchedAt = action === 'watched' ? new Date() : null;
        await database.updateMovieStatus(messageId, action, watchedAt);

        // Get current vote counts for display
        let upCount = 0, downCount = 0;
        if (database.isConnected) {
          const voteCounts = await database.getVoteCounts(messageId);
          upCount = voteCounts.up;
          downCount = voteCounts.down;
        } else if (votes.has(messageId)) {
          const state = votes.get(messageId);
          upCount = state.up.size;
          downCount = state.down.size;
        }

        // Update embed to show new status
        const embed = message.embeds[0];
        if (embed) {
          const newEmbed = EmbedBuilder.from(embed);
          const statusEmojis = { watched: '✅', planned: '📌', skipped: '⏭️' };
          const statusLabels = { watched: 'Watched', planned: 'Planned for Later', skipped: 'Skipped' };

          newEmbed.setColor(action === 'watched' ? 0x00ff00 : action === 'planned' ? 0xffaa00 : 0x888888);
          newEmbed.setFooter({ text: `${statusEmojis[action]} ${statusLabels[action]}` });

          // Remove status buttons for non-pending movies
          const components = makeVoteButtons(messageId, upCount, downCount, action);
          await message.edit({ embeds: [newEmbed], components });
        }

        // Send confirmation
        const statusLabels = { watched: 'marked as watched', planned: 'planned for later', skipped: 'skipped' };
        await interaction.followUp({
          content: `Movie ${statusLabels[action]}! 🎬`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    // IMDb selection menu handler
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('mn:imdbpick:')) {
      const permCheck = checkChannelPerms(interaction);
      if (!permCheck.ok) {
        console.warn('Missing perms for posting:', permCheck.missing.join(', '));
        await interaction.update({
          content: `I can't post here. Missing: ${permCheck.missing.join(', ')}. Ask an admin to grant these to my role in this channel.`,
          components: [],
        });
        return;
      }

      const key = interaction.customId.split(':')[2];
      const imdbID = interaction.values?.[0];
      const origPayload = pendingPayloads.get(key);
      if (!origPayload) {
        await interaction.update({ content: 'Selection expired. Please submit again.', components: [] });
        return;
      }
      const { title, where } = origPayload;

      let imdb = null;
      try { imdb = await omdbById(imdbID); } catch (_) {}

      // Post the recommendation message (handles forum fallback internally)
      try {
        await postRecommendation(interaction, { title, where, imdb });
        pendingPayloads.delete(key);
        await interaction.update({ content: '✅ Added! Posted to channel and opened a discussion thread.', components: [] });
      } catch (e) {
        console.error('Post failed:', e?.message || e);
        await interaction.update({ content: 'I could not post here due to channel permissions. Please adjust and try again.', components: [] });
      }
      return;
    }

    // Modal submit → search IMDb (OMDb), confirm with user, then post
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'mn:modal') {
      const rawTitle = interaction.fields.getTextInputValue('mn:title').trim();
      const where = interaction.fields.getTextInputValue('mn:where').trim();

      // Disambiguate via OMDb, if configured
      let results = [];
      if (OMDB_API_KEY) results = await omdbSearch(rawTitle);

      if (results && results.length > 0) {
        // Deduplicate by imdbID and cap at 25 (Discord select max)
        const seen = new Set();
        const unique = [];
        for (const r of results) {
          if (!r || !r.imdbID || seen.has(r.imdbID)) continue;
          seen.add(r.imdbID);
          unique.push(r);
          if (unique.length >= 25) break;
        }

        const options = unique.map((r) => ({
          label: `${(r.Title || 'Untitled').slice(0, 90)} (${(r.Year || 'n/a').toString().slice(0, 9)})`,
          value: r.imdbID,
          description: (r.Type ? r.Type.toUpperCase() : 'MOVIE').slice(0, 100),
        }));

        // Store payload in memory with a short key to avoid long custom_id
        const key = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
        pendingPayloads.set(key, { title: rawTitle, where, createdAt: Date.now() });

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`mn:imdbpick:${key}`)
            .setPlaceholder('Select the correct movie')
            .addOptions(options)
        );

        await interaction.reply({ content: 'Which title did you mean?', components: [row], flags: MessageFlags.Ephemeral });
        return;
      }

      // Fallback: post immediately without IMDb enrichment
      const permCheck = checkChannelPerms(interaction);
      if (!permCheck.ok) {
        await interaction.reply({ content: `I can't post here. Missing: ${permCheck.missing.join(', ')}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.reply({ content: 'Posting your recommendation…', flags: MessageFlags.Ephemeral });
      try {
        await postRecommendation(interaction, { title: rawTitle, where, imdb: null });
        await interaction.followUp({ content: '✅ Recommendation posted (no OMDb match found).', flags: MessageFlags.Ephemeral });
      } catch (e) {
        console.error('Post (no-OMDb) failed:', e?.message || e);
        await interaction.followUp({ content: 'I could not post here due to channel permissions. Please adjust and try again.', flags: MessageFlags.Ephemeral });
      }
      return;
    }
  } catch (err) {
    console.error(err);
    try {
      if (interaction.isRepliable()) {
        await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
      }
    } catch (_) {}
  }
});

(async () => {
  console.log('🚀 Starting Movie Night Bot...');
  console.log(`🔖 Version ${BOT_VERSION}`);

  // Connect to database
  await database.connect();

  await registerCommands();
  await client.login(DISCORD_TOKEN);
})();
