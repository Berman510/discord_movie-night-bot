/**
 * Statistics Service Module
 * Handles movie night statistics and analytics
 */

const { MessageFlags, EmbedBuilder } = require('discord.js');
const database = require('../database');
const ephemeralManager = require('../utils/ephemeral-manager');

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
      flags: MessageFlags.Ephemeral,
    });
  }
}

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
      { name: '🗳️ Current Voting', value: stats.pendingMovies.toString(), inline: true },
      { name: '⏭️ Queued for Next', value: stats.queuedMovies.toString(), inline: true },
      { name: '👥 Active Users', value: stats.activeUsers.toString(), inline: true },
      { name: '🎪 Scheduled Events', value: activeScheduledEvents.toString(), inline: true }
    )
    .setFooter({ text: `Stats for ${interaction.guild.name}` })
    .setTimestamp();

  await ephemeralManager.sendEphemeral(interaction, '', {
    embeds: [embed],
  });
}

async function showTopMovies(interaction) {
  const topMovies = await database.getTopVotedMovies(interaction.guild.id, 10);

  if (!topMovies || topMovies.length === 0) {
    await interaction.reply({
      content: '📊 No movies with votes found yet!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Top Voted Movies')
    .setDescription('Movies with the highest vote scores')
    .setColor(0xffd700);

  topMovies.forEach((movie, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    embed.addFields({
      name: `${medal} ${movie.title}`,
      value: `👍 ${movie.upvotes} 👎 ${movie.downvotes} • Score: ${movie.score} • <@${movie.recommended_by}>`,
      inline: false,
    });
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

async function showUserStats(interaction, user) {
  const targetUser = user || interaction.user;
  const userStats = await database.getUserStats(interaction.guild.id, targetUser.id);

  if (!userStats) {
    await interaction.reply({
      content: `📊 No statistics found for ${targetUser.displayName || targetUser.username}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 Movie Stats for ${targetUser.displayName || targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL())
    .setColor(0x5865f2)
    .addFields(
      {
        name: '🍿 Movies Recommended',
        value: userStats.moviesRecommended.toString(),
        inline: true,
      },
      { name: '✅ Movies Watched', value: userStats.moviesWatched.toString(), inline: true },
      { name: '📌 Movies Planned', value: userStats.moviesPlanned.toString(), inline: true },
      { name: '🗳️ Total Votes Cast', value: userStats.totalVotes.toString(), inline: true },
      { name: '👍 Upvotes Given', value: userStats.upvotesGiven.toString(), inline: true },
      { name: '👎 Downvotes Given', value: userStats.downvotesGiven.toString(), inline: true },
      { name: '⬆️ Upvotes Received', value: userStats.upvotesReceived.toString(), inline: true },
      {
        name: '⬇️ Downvotes Received',
        value: userStats.downvotesReceived.toString(),
        inline: true,
      },
      { name: '🎪 Sessions Created', value: userStats.sessionsCreated.toString(), inline: true }
    )
    .setFooter({ text: `Stats for ${interaction.guild.name}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

async function showMonthlyStats(interaction) {
  const monthlyStats = await database.getMonthlyStats(interaction.guild.id);

  if (!monthlyStats || monthlyStats.length === 0) {
    await interaction.reply({
      content: '📊 No monthly statistics available yet!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📅 Monthly Movie Activity')
    .setDescription('Movie recommendations and activity by month')
    .setColor(0x5865f2);

  monthlyStats.forEach((month) => {
    embed.addFields({
      name: `${month.month_name} ${month.year}`,
      value: `🍿 ${month.movies_added} movies • ✅ ${month.movies_watched} watched • 🗳️ ${month.total_votes} votes`,
      inline: false,
    });
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleMovieStats,
  showOverviewStats,
  showTopMovies,
  showUserStats,
  showMonthlyStats,
};
