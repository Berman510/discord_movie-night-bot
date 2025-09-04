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

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, OMDB_API_KEY } = process.env;
const BOT_VERSION = require('./package.json').version;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

// In-memory vote store: { [messageId]: { up:Set<userId>, down:Set<userId> } }
const votes = new Map();

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

function makeVoteButtons(messageId, upCount = 0, downCount = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mn:up:${messageId}`).setLabel(`👍 ${upCount}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`mn:down:${messageId}`).setLabel(`👎 ${downCount}`).setStyle(ButtonStyle.Danger)
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

  // Forum/media channels: create a post with starter message
  if (channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildMedia) {
    const post = await channel.threads.create({
      name: `${title} — Discussion`,
      autoArchiveDuration: 1440,
      message: { embeds: [embed], components: [makeVoteButtons('pending', 0, 0)] },
    });
    const root = await post.fetchStarterMessage().catch(() => null);
    const baseMsg = root ?? await post.send({ embeds: [embed], components: [makeVoteButtons('pending', 0, 0)] });
    votes.set(baseMsg.id, { up: new Set(), down: new Set() });
    await baseMsg.edit({ components: [makeVoteButtons(baseMsg.id, 0, 0)] });

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
    return;
  }

  // Normal text channels: send a message, then thread
  const placeholder = await channel.send({ embeds: [embed], components: [makeVoteButtons('pending', 0, 0)] });
  votes.set(placeholder.id, { up: new Set(), down: new Set() });
  await placeholder.edit({ components: [makeVoteButtons(placeholder.id, 0, 0)] });

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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log('==============================');
  console.log(`🎬 Movie Night Bot v${BOT_VERSION}`);
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📦 Client ID: ${CLIENT_ID}`);
  console.log(GUILD_ID ? `🔧 Mode: Guild commands (server ${GUILD_ID})` : '🌍 Mode: Global commands (public)');
  console.log(OMDB_API_KEY ? '🔎 OMDb integration: ENABLED' : '🔎 OMDb integration: DISABLED');
  console.log('==============================');
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Slash command: /movie-night
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'movie-night') {
        await interaction.reply({ content: 'Start a recommendation:', components: [makeCreateButtonRow()] });
      }
      return;
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
        const messageId = msgId; // the recommendation message id
        // Ack ASAP to avoid 10062 Unknown interaction on slower edits or mobile
        await interaction.deferUpdate().catch(() => {});

        const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
        if (!message) return;

        if (!votes.has(messageId)) votes.set(messageId, { up: new Set(), down: new Set() });
        const state = votes.get(messageId);
        const userId = interaction.user.id;

        const isUp = action === 'up';
        const addSet = isUp ? state.up : state.down;
        const removeSet = isUp ? state.down : state.up;

        if (removeSet.has(userId)) removeSet.delete(userId);
        if (!addSet.has(userId)) addSet.add(userId); else addSet.delete(userId);

        const upCount = state.up.size;
        const downCount = state.down.size;

        try {
          await message.edit({ components: [makeVoteButtons(messageId, upCount, downCount)] });
        } catch (e) {
          console.warn('Vote update failed:', e?.message || e);
        }
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
  await registerCommands();
  await client.login(DISCORD_TOKEN);
})();
