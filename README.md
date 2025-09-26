# Watch Party Bot

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/Berman510/discord_movie-night-bot)](https://github.com/Berman510/discord_movie-night-bot/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A comprehensive Discord bot for organizing watch parties and TV show viewing sessions in your Discord community. Create voting sessions, get movie and TV show recommendations with IMDb data, and coordinate watch parties with Discord Events integration.

> **🌐 Web Dashboard**: Manage your bot through a beautiful web interface at [watchparty.bermanoc.net](https://watchparty.bermanoc.net)
> **📖 Full Documentation**: Complete setup and usage guide at [watchparty.bermanoc.net/docs](https://watchparty.bermanoc.net/docs)

## 🚀 Getting Started

### 1. Add the Bot to Your Server

[**→ Invite Watch Party Bot**](https://discord.com/oauth2/authorize?client_id=1320169088088748032&scope=bot%20applications.commands&permissions=2147765248)

### 2. Set Up Your Server

Run `/watchparty-setup` to configure:

- **Voting Channel** - Where movie recommendations are posted
- **Admin Channel** - Private channel for managing sessions
- **Watch Party Channel** - Voice/text channel for actual watch parties
- **Roles** - Who can vote, moderate, and administrate

### 3. Plan Your First Watch Party

Use `/watchparty create-session` to schedule:

- Session name and description
- Date and start time
- When voting should close (defaults to 1 hour before)

### 4. Start Recommending!

- Members use `/watchparty recommend-content` to suggest movies/shows
- Everyone votes with 👍/👎 buttons
- Bot automatically picks the winner when voting closes

## ✨ What Makes This Bot Special

### 🎬 **Smart Movie Recommendations**

- **IMDb Integration** - Automatic movie posters, ratings, and plot summaries
- **TV Show Support** - Recommend specific episodes like "Breaking Bad S03E07"
- **Duplicate Detection** - Warns if a movie was already suggested
- **Discussion Threads** - Each recommendation gets its own discussion thread

### 🗳️ **Fair Voting System**

- **Vote Caps** - Prevents "vote for everything" behavior with smart limits
- **Real-time Updates** - Vote counts update instantly across Discord and web
- **Automatic Winners** - Bot picks winners when voting closes
- **Carryover System** - Popular movies that don't win carry over to next session

### 🎪 **Discord Events Integration**

- **Automatic Events** - Creates Discord Events for each movie night
- **RSVP Tracking** - See who's planning to attend
- **Timezone Support** - Works with your server's timezone
- **Rich Descriptions** - Events include movie details and voting results

### 🔧 **Easy Administration**

- **Admin Control Panel** - Dedicated channel with management buttons
- **Session Planning** - Schedule movie nights with custom themes
- **Movie Management** - Skip, ban, or mark movies as watched
- **Channel Sync** - Keep everything organized automatically

### 📊 **Detailed Analytics**

- **Voting Statistics** - See what your community loves
- **User Preferences** - Track individual voting patterns
- **Session History** - Complete record of all movie nights
- **Web Dashboard** - Beautiful charts and insights

---

## 🏗️ Setting Up Your Server

### Channel Structure

Create a **Watch Party** category with these channels:

#### 🎬 Voting Channel (Public)

- **Purpose**: Where movie recommendations are posted and voted on
- **Type**: Text Channel or Forum Channel
- **Permissions**:
  - Everyone can view, react, and create threads
  - Only bot can send messages (users interact via threads)

#### 🔧 Admin Channel (Private)

- **Purpose**: Bot management and session controls
- **Type**: Text Channel
- **Permissions**:
  - Only admins/moderators can view and send messages
  - Bot needs full permissions

#### 🍿 Watch Party Channel (Public)

- **Purpose**: Where actual movie nights happen
- **Type**: Voice Channel (recommended) or Text Channel
- **Permissions**: Everyone can join and participate

### Role Setup

Configure these roles for proper permissions:

#### 🎭 Voting Roles

- **Who**: Regular members who can vote and get notifications
- **Examples**: `@Members`, `@Movie Fans`, `@everyone`
- **Permissions**: Can recommend movies and vote

#### 👮 Moderator Roles

- **Who**: Trusted members who help manage sessions
- **Examples**: `@Moderators`, `@Movie Mods`
- **Permissions**: Can skip movies, sync channels, refresh admin panel

#### 👑 Admin Roles

- **Who**: Server admins who fully control the bot
- **Examples**: `@Admins`, `@Server Staff`
- **Permissions**: Full control - plan sessions, pick winners, ban movies, configure bot

> **💡 Pro Tip**: Users with Discord's "Administrator" or "Manage Server" permissions automatically have admin access!

## 📚 Bot Commands

### 🎬 For Everyone

- **`/watchparty recommend-content`** - Suggest a movie or TV show
- **`/watchparty list-sessions`** - See upcoming movie nights
- **`/watchparty join-session [id]`** - Join a specific session for updates

### 👮 For Moderators

- **`/watchparty-skip`** - Skip the current movie pick
- **`/watchparty-admin-panel`** - Refresh the admin control panel

### 👑 For Admins

- **`/watchparty-setup`** - Interactive bot configuration wizard
- **`/watchparty create-session`** - Plan a new movie night
- **`/watchparty-plan`** - Alternative session planning command
- **`/watchparty-watched`** - Mark the winning movie as watched
- **`/watchparty-configure`** - Advanced configuration options

### 🔧 Configuration Commands

- **`/watchparty-configure set-voting-channel`** - Set where recommendations are posted
- **`/watchparty-configure set-admin-channel`** - Set private admin channel
- **`/watchparty-configure set-watch-party-channel`** - Set where movie nights happen
- **`/watchparty-configure add-admin-role`** - Add an admin role
- **`/watchparty-configure view-settings`** - See current configuration

### 🎯 Interactive Buttons

Most actions happen through buttons on bot messages:

- **👍/👎** - Vote on movie recommendations
- **✅ Watched** - Mark a movie as watched (admins)
- **📌 Plan Later** - Save for future sessions
- **⏭️ Skip** - Skip this movie
- **🎬 Create Session** - Turn a planned movie into a session
- **📅 Reschedule** - Change session date/time
- **❌ Cancel** - Cancel a session

---

## 🎯 How to Use the Bot

### Planning a Watch Party

1. **Create a Session**
   - Use `/watchparty create-session` or the admin panel
   - Set the date, time, and theme
   - Bot creates a Discord Event automatically

2. **Collect Recommendations**
   - Members use `/watchparty recommend-content`
   - Bot fetches IMDb data automatically
   - Each movie gets its own discussion thread

3. **Voting Phase**
   - Everyone votes with 👍/👎 buttons
   - Vote caps prevent "vote for everything" behavior
   - Real-time vote counts update live

4. **Winner Selection**
   - Bot automatically picks winner when voting closes
   - Discord Event updates with movie details
   - Non-winning movies carry over to next session

### Managing Your Community

**For Regular Members:**

- Recommend movies and TV shows
- Vote on recommendations (within your vote limits)
- Join discussion threads
- RSVP to Discord Events

**For Moderators:**

- Skip problematic movies
- Refresh admin panels
- Help manage sessions

**For Admins:**

- Plan and schedule sessions
- Pick winners manually if needed
- Ban inappropriate content
- Configure bot settings
- Access web dashboard

## 💡 Pro Tips

### Getting the Most Out of Your Watch Parties

**🎬 Recommendation Tips:**

- Be specific with TV shows: "Breaking Bad S03E07" works better than just "Breaking Bad"
- Include where to watch: "Netflix", "Amazon Prime", "Free on YouTube"
- Check for duplicates before recommending
- Use discussion threads to build hype

**🗳️ Voting Strategy:**

- Vote caps prevent spam - use your votes wisely!
- Upvote movies you really want to see
- Downvote only if you really don't want to watch
- Remember: popular movies carry over if they don't win

**📅 Session Planning:**

- Plan sessions 3-7 days in advance for best participation
- Use themed nights: "Horror October", "Holiday Movies", "Throwback Thursday"
- Set voting to close 1-2 hours before the session starts
- Include session descriptions to set the mood

**👥 Community Building:**

- Encourage discussion in movie threads
- Share reactions during and after movies
- Use Discord Events to track attendance
- Celebrate your community's movie history with stats

## ❓ Troubleshooting

### Common Issues

**"Bot isn't responding to commands"**

- Make sure the bot is online (green status in Discord)
- Check that you're using the right command format: `/watchparty` not `!watchparty`
- Verify the bot has permissions in the channel
- Try the command in a different channel

**"I can't vote on movies"**

- You need a configured Voting role to vote
- Ask an admin to add your role with `/watchparty-configure add-voting-role`
- Check if you've reached your vote limit for this session

**"Commands aren't showing up"**

- Slash commands can take up to 1 hour to appear globally
- Make sure the bot has "Use Slash Commands" permission
- Try refreshing Discord or restarting the app

**"Movies don't have posters/details"**

- The bot fetches data from IMDb automatically
- Some movies might not be found - try different spelling
- Very new or obscure content might not have full data

**"Session didn't create a Discord Event"**

- Bot needs "Manage Events" permission
- Check that a Watch Party Channel is configured
- Events are created when sessions are planned, not immediately

### Getting Help

**📖 Full Documentation**: [movienight.bermanoc.net/docs](https://movienight.bermanoc.net/docs)

**💬 Discord Support**: [Join our support server](https://discord.gg/Tj2TswbZ) for help from the community and developers

**🐛 Bug Reports**: Found a bug? Report it on GitHub Issues

**💡 Feature Requests**: Have an idea? Share it in our Discord or GitHub Discussions

---

## 🚀 What's Next?

The Watch Party Bot is constantly evolving! Check out our [roadmap](ROADMAP.md) to see what's coming:

- **Enhanced Analytics** - Deeper insights into your community's movie preferences
- **Attendance Tracking** - See who actually shows up to movie nights
- **Smart Recommendations** - Bot learns your community's taste over time
- **Custom Themes** - Personalize the bot's appearance for your server

---

## 🤝 Support & Community

**Need Help?**

- 📖 [Full Documentation](https://watchparty.bermanoc.net/docs)
- 💬 [Discord Support Server](https://discord.gg/Tj2TswbZ)
- 🐛 [Report Issues](https://github.com/Berman510/discord_movie-night-bot/issues)

**Want to Contribute?**

- ⭐ Star the project on GitHub
- 💡 Share feature ideas in our Discord
- ☕ [Support the developer](https://ko-fi.com/charlieberman)

---

## 📄 Technical Information

For developers and self-hosters, see [SETUP.md](SETUP.md) for:

- Installation instructions
- Database configuration
- Environment variables
- Hosting requirements

---

**Made with ❤️ for Discord communities who love movies and TV shows**

_MIT License - See [LICENSE](LICENSE) file for details_
