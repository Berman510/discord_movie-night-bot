/**
 * Help System Service
 * Comprehensive help with organized sections, commands, and support links
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
// const { getContentTypeInfo } = require('../utils/content-types'); // Reserved for future use

/**
 * Main help command handler
 */
async function handleHelp(interaction) {
  const embed = createMainHelpEmbed();
  const components = createMainHelpButtons();

  await interaction.reply({
    embeds: [embed],
    components: components,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Create the main help embed
 */
function createMainHelpEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🎬 Watch Party Bot - Help Center')
    .setDescription(
      '**Welcome to Watch Party Bot!** 🎪\n\n' +
      'Create movie nights and TV show sessions with voting, recommendations, and Discord Events integration. ' +
      'Choose a topic below to get detailed help and guidance.\n\n' +
      '**Quick Start:** Use `/watchparty-setup` for guided configuration!'
    )
    .setColor(0x00d4aa)
    .addFields(
      {
        name: '🎯 Core Features',
        value: 
          '• **Movie & TV Show Sessions** - Create voting sessions for any content type\n' +
          '• **Smart Recommendations** - IMDb integration with rich details\n' +
          '• **Discord Events** - Automatic event creation with posters\n' +
          '• **Admin Controls** - Comprehensive moderation and management\n' +
          '• **Dashboard Integration** - Web interface at watchparty.bermanoc.net',
        inline: false,
      },
      {
        name: '📋 Available Commands',
        value: 
          '**`/watchparty`** - Main command with all actions\n' +
          '**`/watchparty-queue`** - View current recommendations\n' +
          '**`/watchparty-setup`** - Interactive bot setup\n' +
          '**`/movienight-configure`** - Advanced configuration\n' +
          '**`/help`** - This help system',
        inline: true,
      },
      {
        name: '🔗 Quick Links',
        value: 
          '🌐 **[Dashboard](https://watchparty.bermanoc.net)**\n' +
          '💬 **[Support Server](https://discord.gg/Tj2TswbZ)**\n' +
          '☕ **[Support Development](https://ko-fi.com/bermanoc)**',
        inline: true,
      }
    )
    .setFooter({
      text: 'Click the buttons below for detailed help on specific topics',
    })
    .setTimestamp();

  return embed;
}

/**
 * Create main help navigation buttons
 */
function createMainHelpButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_commands')
      .setLabel('📋 Commands Guide')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help_setup')
      .setLabel('⚙️ Setup & Config')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help_roles')
      .setLabel('👥 Roles & Permissions')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_sessions')
      .setLabel('🎪 Sessions & Voting')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('help_admin')
      .setLabel('🛠️ Admin Features')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('help_troubleshooting')
      .setLabel('🔧 Troubleshooting')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * Handle help button interactions
 */
async function handleHelpButton(interaction) {
  const buttonId = interaction.customId;

  let embed, components;

  switch (buttonId) {
    case 'help_commands':
      embed = createCommandsHelpEmbed();
      components = createBackButton();
      break;
    case 'help_setup':
      embed = createSetupHelpEmbed();
      components = createBackButton();
      break;
    case 'help_roles':
      embed = createRolesHelpEmbed();
      components = createBackButton();
      break;
    case 'help_sessions':
      embed = createSessionsHelpEmbed();
      components = createBackButton();
      break;
    case 'help_admin':
      embed = createAdminHelpEmbed();
      components = createBackButton();
      break;
    case 'help_troubleshooting':
      embed = createTroubleshootingHelpEmbed();
      components = createBackButton();
      break;
    case 'help_back':
      embed = createMainHelpEmbed();
      components = createMainHelpButtons();
      break;
    default:
      return;
  }

  await interaction.update({
    embeds: [embed],
    components: components,
  });
}

/**
 * Commands help embed
 */
function createCommandsHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('📋 Commands Guide')
    .setDescription('Complete list of all available commands organized by user type.')
    .setColor(0x5865f2)
    .addFields(
      {
        name: '🎬 For Everyone',
        value:
          '**`/watchparty recommend-content`** - Suggest a movie or TV show\n' +
          '**`/watchparty list-sessions`** - View upcoming sessions\n' +
          '**`/watchparty join-session [id]`** - Join a session for updates\n' +
          '**`/watchparty-queue`** - View current recommendations and votes\n' +
          '**`/help`** - Access this help system',
        inline: false,
      },
      {
        name: '👮 For Moderators',
        value:
          '**`/watchparty close-voting`** - Close voting and pick winner\n' +
          '**`/watchparty pick-winner`** - Manually select a winner\n' +
          '**`/watchparty-skip`** - Skip current movie pick\n' +
          '**`/watchparty-admin-panel`** - Refresh admin control panel',
        inline: false,
      },
      {
        name: '👑 For Admins',
        value:
          '**`/watchparty create-session`** - Create new voting sessions\n' +
          '**`/watchparty configure`** - Configure bot settings\n' +
          '**`/watchparty-setup`** - Interactive guided setup\n' +
          '**`/movienight-configure`** - Advanced configuration options\n' +
          '**`/movienight-debug-config`** - Debug configuration issues',
        inline: false,
      },
      {
        name: '📊 Statistics & Analytics',
        value:
          '**`/watchparty stats`** - View voting statistics\n' +
          '**`/movie-stats overview`** - Server overview stats\n' +
          '**`/movie-stats top-movies`** - Most popular content\n' +
          '**`/movie-stats user-stats [@user]`** - Individual user stats',
        inline: false,
      }
    )
    .setFooter({ text: 'Tip: Commands are organized by permission level - everyone can use basic commands!' });
}

/**
 * Setup help embed
 */
function createSetupHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('⚙️ Setup & Configuration Guide')
    .setDescription('Step-by-step guide to get your Watch Party Bot up and running.')
    .setColor(0x57f287)
    .addFields(
      {
        name: '🚀 Quick Setup (Recommended)',
        value:
          '**1.** Run **`/watchparty-setup`** for interactive guided setup\n' +
          '**2.** Follow the prompts to configure channels and roles\n' +
          '**3.** Test with **`/watchparty recommend-content`**\n\n' +
          '✅ This handles everything automatically!',
        inline: false,
      },
      {
        name: '🔧 Manual Configuration',
        value:
          '**Channels:**\n' +
          '• **`/movienight-configure set-voting-channel #channel`** - Where voting happens\n' +
          '• **`/movienight-configure set-admin-channel #channel`** - Admin controls\n' +
          '• **`/movienight-configure set-watch-party-channel #voice`** - Voice/Stage channel\n\n' +
          '**Roles:**\n' +
          '• **`/movienight-configure add-admin-role @role`** - Add admin role\n' +
          '• Configure viewer/voter roles in dashboard',
        inline: false,
      },
      {
        name: '📋 Required Permissions',
        value:
          '**Bot Needs:**\n' +
          '• Send Messages, Embed Links, Use Slash Commands\n' +
          '• Manage Messages (for vote buttons)\n' +
          '• Create Public Threads (for forum channels)\n' +
          '• Manage Events (for Discord Events)\n\n' +
          '**You Need:**\n' +
          '• Administrator or Manage Server permissions',
        inline: false,
      },
      {
        name: '🌐 Dashboard Access',
        value:
          'Visit **[watchparty.bermanoc.net](https://watchparty.bermanoc.net)** for:\n' +
          '• Web-based configuration\n' +
          '• Real-time voting dashboard\n' +
          '• Advanced role management\n' +
          '• Session planning tools',
        inline: false,
      }
    )
    .setFooter({ text: 'Need help? Join our support server: discord.gg/Tj2TswbZ' });
}

/**
 * Roles help embed
 */
function createRolesHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('👥 Roles & Permissions Guide')
    .setDescription('Understanding the role system and how permissions work.')
    .setColor(0xfee75c)
    .addFields(
      {
        name: '👑 Admin Roles',
        value:
          '**Who:** Server admins who fully control the bot\n' +
          '**Examples:** `@Admins`, `@Server Staff`\n' +
          '**Permissions:** Full control - plan sessions, pick winners, ban movies, configure bot\n\n' +
          '💡 **Auto-Admin:** Users with Discord\'s "Administrator" or "Manage Server" permissions automatically have admin access!',
        inline: false,
      },
      {
        name: '👮 Moderator Roles',
        value:
          '**Who:** Trusted members who help manage sessions\n' +
          '**Examples:** `@Moderators`, `@Movie Mods`\n' +
          '**Permissions:** Close voting, pick winners, skip movies, refresh admin panels\n\n' +
          '⚙️ **Setup:** Configure in dashboard or via `/movienight-configure`',
        inline: false,
      },
      {
        name: '🗳️ Voter Roles',
        value:
          '**Who:** Members who can vote on recommendations\n' +
          '**Examples:** `@Members`, `@Movie Fans`\n' +
          '**Permissions:** Vote on movies/shows, view voting results\n' +
          '**Vote Caps:** Configurable limits (e.g., 3 upvotes, 1 downvote per session)',
        inline: false,
      },
      {
        name: '👀 Viewer Roles',
        value:
          '**Who:** Members who can see recommendations but not vote\n' +
          '**Examples:** `@Guests`, `@New Members`\n' +
          '**Permissions:** View movie list, see details, but cannot vote\n\n' +
          '🌐 **Dashboard Access:** Viewers can access dashboard with limited functionality',
        inline: false,
      },
      {
        name: '🔧 Role Configuration',
        value:
          '**Via Commands:**\n' +
          '• `/movienight-configure add-admin-role @role`\n' +
          '• `/watchparty-setup` (guided setup)\n\n' +
          '**Via Dashboard:**\n' +
          '• Visit [watchparty.bermanoc.net](https://watchparty.bermanoc.net)\n' +
          '• Configure all role types with advanced options',
        inline: false,
      }
    )
    .setFooter({ text: 'Tip: Start with admin roles, then add voter roles for your community!' });
}

/**
 * Sessions help embed
 */
function createSessionsHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('🎪 Sessions & Voting Guide')
    .setDescription('Learn how to create and manage watch party sessions.')
    .setColor(0xeb459e)
    .addFields(
      {
        name: '🎬 Session Types',
        value:
          '**Movie Sessions:** Only movies can be recommended and voted on\n' +
          '**TV Show Sessions:** Only TV shows and episodes can be added\n' +
          '**Mixed Sessions:** Both movies and TV shows are allowed\n\n' +
          '✨ **Auto-Detection:** Bot automatically detects content type from your search!',
        inline: false,
      },
      {
        name: '🗳️ How Voting Works',
        value:
          '**1.** Users recommend content with `/watchparty recommend-content`\n' +
          '**2.** Content appears in voting channel with ⬆️ ⬇️ buttons\n' +
          '**3.** Members vote based on their role permissions\n' +
          '**4.** Admin closes voting and picks winner (highest score wins)\n' +
          '**5.** Discord Event is created automatically',
        inline: false,
      },
      {
        name: '📅 Session Lifecycle',
        value:
          '**Planning** → Set date, time, and voting deadline\n' +
          '**Voting** → Members recommend and vote on content\n' +
          '**Decided** → Winner selected, event created\n' +
          '**Completed** → Session finished, stats recorded\n' +
          '**Cancelled** → Session cancelled, content carried over',
        inline: false,
      },
      {
        name: '🔄 Carryover System',
        value:
          'When sessions are cancelled or completed:\n' +
          '• Non-winning content automatically carries over\n' +
          '• Appears in next session of same type\n' +
          '• Vote counts reset for fair competition\n' +
          '• Maintains recommendation history',
        inline: false,
      }
    )
    .setFooter({ text: 'Pro tip: Use mixed sessions for variety, specific types for themed nights!' });
}

/**
 * Admin help embed
 */
function createAdminHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('🛠️ Admin Features Guide')
    .setDescription('Advanced features for server administrators and moderators.')
    .setColor(0xf23c50)
    .addFields(
      {
        name: '🎯 Session Management',
        value:
          '**Create Sessions:** `/watchparty create-session` with flexible time parsing\n' +
          '**Close Voting:** `/watchparty close-voting` to end voting period\n' +
          '**Pick Winner:** `/watchparty pick-winner` to manually select winner\n' +
          '**Plan Sessions:** Schedule future sessions with Discord Events',
        inline: false,
      },
      {
        name: '🔧 Admin Panel Features',
        value:
          '**Ban Content:** Remove inappropriate recommendations\n' +
          '**Skip Content:** Skip current pick without banning\n' +
          '**Sync Channels:** Refresh voting and admin channels\n' +
          '**Deep Purge:** Clean up old content with confirmations\n' +
          '**Pick Winner:** Select winner from admin channel',
        inline: false,
      },
      {
        name: '📊 Analytics & Insights',
        value:
          '**Server Stats:** `/movie-stats overview` for server analytics\n' +
          '**Top Content:** `/movie-stats top-movies` for popular picks\n' +
          '**User Stats:** `/movie-stats user-stats @user` for individual metrics\n' +
          '**Monthly Reports:** `/movie-stats monthly` for trends',
        inline: false,
      },
      {
        name: '🌐 Dashboard Integration',
        value:
          'Access [watchparty.bermanoc.net](https://watchparty.bermanoc.net) for:\n' +
          '• Real-time voting dashboard\n' +
          '• Advanced role configuration\n' +
          '• Session planning tools\n' +
          '• Comprehensive analytics\n' +
          '• Vote cap management',
        inline: false,
      }
    )
    .setFooter({ text: 'Remember: Great power comes with great responsibility! 🕷️' });
}

/**
 * Troubleshooting help embed
 */
function createTroubleshootingHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('🔧 Troubleshooting Guide')
    .setDescription('Common issues and solutions to get your bot working perfectly.')
    .setColor(0x95a5a6)
    .addFields(
      {
        name: '❌ Commands Not Appearing',
        value:
          '**Cause:** Slash commands need time to register\n' +
          '**Solution:** Wait up to 1 hour for global propagation, or restart bot\n' +
          '**Check:** Ensure bot has "Use Slash Commands" permission',
        inline: false,
      },
      {
        name: '🚫 Bot Not Responding',
        value:
          '**Check Permissions:** Bot needs Send Messages, Embed Links\n' +
          '**Check Channels:** Ensure bot can see configured channels\n' +
          '**Check Roles:** Verify bot role is above configured roles\n' +
          '**Restart:** Try `/watchparty-admin-panel` to refresh',
        inline: false,
      },
      {
        name: '🗳️ Voting Issues',
        value:
          '**No Vote Buttons:** Check "Manage Messages" permission\n' +
          '**Can\'t Vote:** Verify user has voter role configured\n' +
          '**Vote Caps:** Check dashboard for vote limit settings\n' +
          '**Sync Issues:** Use admin panel "Sync Channels" button',
        inline: false,
      },
      {
        name: '🎭 Forum Channel Issues',
        value:
          '**No Threads:** Bot needs "Create Public Threads" permission\n' +
          '**Missing Posts:** Run sync channels to recreate content\n' +
          '**Thread Errors:** Ensure "Send Messages in Threads" permission',
        inline: false,
      },
      {
        name: '🆘 Still Need Help?',
        value:
          '**Support Server:** [discord.gg/Tj2TswbZ](https://discord.gg/Tj2TswbZ)\n' +
          '**Dashboard:** [watchparty.bermanoc.net](https://watchparty.bermanoc.net)\n' +
          '**Debug Command:** `/movienight-debug-config` for detailed info\n' +
          '**Support Development:** [ko-fi.com/bermanoc](https://ko-fi.com/bermanoc)',
        inline: false,
      }
    )
    .setFooter({ text: 'Most issues are permission-related - check bot permissions first!' });
}

/**
 * Create back button
 */
function createBackButton() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_back')
        .setLabel('← Back to Main Help')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

module.exports = {
  handleHelp,
  handleHelpButton,
  createMainHelpEmbed,
  createMainHelpButtons,
};
