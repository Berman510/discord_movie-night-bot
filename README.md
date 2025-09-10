# Movie Night Bot

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/Berman510/discord_movie-night-bot)](https://github.com/Berman510/discord_movie-night-bot/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A comprehensive Discord bot for managing movie recommendations, voting, and organized movie night sessions. Features persistent voting, IMDb integration, session scheduling with Discord events, and comprehensive movie night statistics.

> **🏗️ Modular Architecture**: Clean, maintainable codebase with separation of concerns. See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

## ✨ Key Features

### 🍿 **Movie Recommendations**
- **IMDb Integration**: Automatic movie data fetching with posters, ratings, and details
- **Smart Duplicate Detection**: Warns when movies have been previously recommended
- **Persistent Voting**: Real-time vote counting with button persistence
- **Status Tracking**: Movies progress through pending → planned → watched/skipped
- **Discussion Threads**: Automatic thread creation for movie discussions

### 🗳️ **Advanced Voting System**
- **Automatic Voting Closure**: Sessions automatically close at scheduled times with winner selection
- **Intelligent Winner Selection**: Automatic winner selection with tie-breaking interface for admins
- **Real-time Vote Counts**: Live updates on recommendation posts with persistent buttons
- **Movie Carryover System**: Non-winning movies automatically carry over to next session
- **User Vote Tracking**: Complete database tracking of all voting activity

### 🎪 **Enhanced Session Management**
- **Discord Event Integration**: Full event creation, updates, and RSVP functionality with channel integration
- **Timezone Support**: Configurable guild timezones with 12-hour or 24-hour time formats (e.g., 7:30 PM or 19:30) and US dates (MM/DD/YYYY)
- **Session Descriptions**: Themed session messaging with custom descriptions in voting channels
- **Automatic Event Updates**: Events update with winner information, IMDB details, and vote counts
- **Event RSVP Tracking**: Every 5 minutes, the bot records users who clicked Interested on the scheduled event (stored per session for analytics)

- **Session Participants**: Track who joins sessions vs. who actually attends with comprehensive analytics

### 🔧 **Admin Control Panel**
- **Comprehensive Admin Interface**: Complete session management, movie controls, and system operations
- **Movie Management**: Pick Winner, Skip to Next, Remove, Ban Movie, and Details buttons for each movie
- **Admin Channel Mirroring**: Dedicated admin channel with movie posts and management controls
- **Sync Operations**: Channel synchronization and cleanup tools
- **Session Controls**: Plan, cancel, reschedule sessions with proper state management

### 📊 **Statistics & Analytics**
- **Movie Statistics**: Track recommendations, votes, and watch history
- **User Analytics**: Individual user stats and preferences
- **Guild Overview**: Server-wide movie night statistics
- **Voting Patterns**: Complete voting history and trends

### ⚙️ **Enhanced Configuration**
- **Channel Management**: Dedicated movie recommendation channels with admin channel support
- **Session Viewing Channels**: Configurable channels for Discord events (Voice, Stage, or Text channels)
- **Admin Roles**: Role-based permission system with comprehensive admin controls
- **Timezone Settings**: Server-wide timezone configuration with automatic voting closure
- **Notification Roles**: Ping roles for movie night events with Discord event integration
- **Time Formats**: User-friendly 12-hour or 24-hour time formats and US date format (MM/DD/YYYY)

---


### ✅ What's New in 1.14.1
- Asymmetric per-session vote caps: users can upvote up to max(1, floor(n/3)) and downvote up to max(1, floor(n/5)) movies per session. Friendly ephemeral message appears if a user hits the limit, listing their current votes.

### 🚀 Next Up (1.14.1)
- [ ] Dashboard: clarify actions
  - Rename “Planned” → “Plan for later” (move out of active voting, keep in backlog)
  - Add “Add to Next Session” / “Remove from Next Session” actions
- [ ] Bi-directional integration with dashboard
  - Real-time updates via WebSocket bridge; mirror movie status changes in Discord immediately
  - Sync admin panel and voting posts on dashboard actions
- [ ] Dashboard UI polish
  - Tooltips and confirmation dialogs for destructive actions (ban/remove)
  - Inline status and vote summaries
- [ ] Analytics
  - Surface RSVP list/count per session on dashboard (using bot’s stored rsvp_user_ids)
  - Basic attendance analytics groundwork
- [ ] Docs
  - Add dashboard integration section (env vars, WS token, feature list)


## 📋 TODO List

### 🔄 **Message Tracking System**
- [ ] **Track all bot messages**: Store message IDs for notifications, admin panels, recommendations
- [ ] **Message update system**: Update tracked messages when sessions are rescheduled
- [ ] **Bidirectional sync**: Remove SESSION_UID from event descriptions once message tracking is implemented
- [ ] **Message cleanup**: Proper cleanup of tracked messages when sessions end

### 📅 **Reschedule Functionality**
- [x] **Reschedule button**: Add reschedule button to admin panel (implemented)
- [x] **Same modal as Plan Next Session**: Reschedule opens the exact same modal used by Plan Next Session, with all fields pre-filled from the current session
- [x] **Event updates**: Update Discord events when sessions are rescheduled
- [x] **Post updates**: Refresh Admin Control Panel and forum recommendation post (or text quick-action) after reschedule

### 🗳️ **Multiple Voting Sessions**
- [ ] **Concurrent voting sessions**: Support multiple active voting sessions simultaneously
- [ ] **Session queue management**: Queue system for multiple planned sessions

### 🗳️ Vote Caps Configuration
- [ ] Make vote caps configurable by admin roles:
  - Global per-guild defaults (enable/disable, upvote ratio default 1/3, downvote ratio default 1/5, min votes default 1)
  - Optional per-session overrides by the admin/mod who creates the session
  - Document settings in README and expose via slash commands/admin panel

- [ ] **Session-specific voting channels**: Separate voting channels or sections for each session
- [ ] **Session priority system**: Handle overlapping session times and priorities

### 🎯 **Future Enhancements**
- [ ] **Forum channel tags**: Implement status-based tags for forum posts
- [ ] **Advanced analytics**: More detailed voting and attendance statistics
- [ ] **Movie recommendations API**: Integration with additional movie databases
- [ ] **Automated reminders**: Reminder notifications before voting ends
- [ ] Vote caps: allow overrides configurable by admin roles globally and by admin/mods per voting session (UI in Administration panel)

- [ ] Repository consolidation: Consider moving bot and dashboard into a single monorepo once WS integration stabilizes (keep separate deployment methods).

- [ ] Monorepo planning: evaluate hosting the bot in AWS (e.g., ECS/Fargate) instead of PebbleHost to reduce operational issues; align CI/CD, secrets (AWS Secrets Manager), and env parity with the dashboard.


---

## Prerequisites
- Node.js 18+ (fetch built-in).
- Discord application + bot token.
- (Optional) OMDb API key: <http://www.omdbapi.com/apikey.aspx>

### Required OAuth Scopes

### IMDb Caching (cross-guild)
To reduce OMDb usage, the bot caches full IMDb responses globally across servers in a lightweight imdb_cache table.
- Enabled by default; respects TTL and hard row limit with LRU eviction
- Deep purge does not clear this cache

Env toggles:
- IMDB_CACHE_ENABLED=true
- IMDB_CACHE_TTL_DAYS=90
- IMDB_CACHE_MAX_ROWS=10000

- `bot`
- `applications.commands`

### Required Bot Permissions
- **Send Messages** (post movie recommendations and responses)
- **Embed Links** (rich movie information displays)
- **Read Message History** (access existing movie posts)
- **Use Slash Commands** (all bot commands)
- **Add Reactions** (voting system)
- **Manage Messages** (update movie posts when scheduled)
- **Create Public Threads** (movie discussion threads)
- **Send Messages in Threads** (participate in discussions)
- **Manage Events** (create Discord events for movie nights)
- **Mention Everyone** (ping notification roles for events)

**Updated Permissions Integer:** `2147765248`

### Required Gateway Intents
In Discord Developer Portal → Bot section, enable:
- ✅ **Message Content Intent** (required for reading movie recommendations)

### Discord Developer Portal Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create **New Application** → give it a name (e.g., "Movie Night Bot")
3. Go to **Bot** section → **Add Bot** → copy the **Bot Token**
4. Enable **Message Content Intent** in Bot section
5. Go to **OAuth2 → URL Generator**:
   - **Scopes**: `bot` + `applications.commands`
   - **Permissions**: Use the permissions listed above
6. Use generated URL to invite bot to your server

**Invite link template:**
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=2147765248
```

---

## .env
Create a `.env` in the project root (copy from `.env.example`):
```
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_APPLICATION_ID
# Optional: set for additional instant command registration to development servers
GUILD_ID=YOUR_SERVER_ID
# Optional: OMDb API key
OMDB_API_KEY=YOUR_OMDB_API_KEY

# MySQL Database (get these from PebbleHost panel)
DB_HOST=YOUR_DB_HOST
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
```

### Optional: Dashboard Integration (WS/Webhook)
WS (recommended; bot-initiated):
```
MOVIENIGHT_WS_ENABLED=true
MOVIENIGHT_WS_URL=wss://bot-movienight.bermanoc.net/socket
MOVIENIGHT_WS_TOKEN=YOUR_LONG_RANDOM_TOKEN
```

Webhook server (optional fallback; PebbleHost fixed port):
```
MOVIENIGHT_WEBHOOK_ENABLED=true
# PebbleHost assigns a fixed external port per server; set it here so the bot binds that exact port
MOVIENIGHT_WEBHOOK_PORT=12345
# Legacy alternative: MOVIENIGHT_WEBHOOK_PORTS=12345,23456 (comma-separated)
MOVIENIGHT_WEBHOOK_TOKEN=YOUR_DASHBOARD_WEBHOOK_TOKEN
```


## Database Setup (Optional but Recommended)

### MySQL Database Configuration
The bot supports MySQL for persistent data storage. Here's how to set it up:

#### Option 1: Hosting Provider Database
**PebbleHost, Railway, Heroku, etc.**
1. Access your hosting provider's database section
2. Create a new MySQL database
3. Copy the connection details (host, user, password, database name)
4. Add them to your `.env` file
5. The bot will automatically create required tables on first run

#### Option 2: Self-Hosted MySQL
**Local or VPS MySQL installation**
1. Install MySQL on your server
2. Create a database: `CREATE DATABASE movie_night_bot;`
3. Create a user with permissions: `CREATE USER 'moviebot'@'%' IDENTIFIED BY 'your_password';`
4. Grant permissions: `GRANT ALL PRIVILEGES ON movie_night_bot.* TO 'moviebot'@'%';`
5. Add connection details to your `.env` file

#### Option 3: Cloud Database Services
**AWS RDS, Google Cloud SQL, Azure Database, PlanetScale, etc.**
1. Create a MySQL instance through your cloud provider
2. Configure connection settings and security groups
3. Add the connection details to your `.env` file

### Storage Options Comparison

| Feature | MySQL Database | JSON File Storage | Memory-Only |
|---------|----------------|-------------------|-------------|
| **Basic Functionality** | ✅ Full | ✅ Full | ✅ Full |
| **Movie Recommendations** | ✅ Persistent | ✅ Persistent | ✅ Works until restart |
| **Voting** | ✅ Permanent | ✅ Permanent | ✅ Works until restart |
| **Status Management** | ✅ Permanent | ✅ Permanent | ❌ Lost on restart |
| **Queue Management** | ✅ `/movie-queue` | ✅ `/movie-queue` | ❌ Not available |
| **Statistics** | ✅ `/movie-stats` | ✅ `/movie-stats` | ❌ Not available |
| **Session Management** | ✅ `/movie-session` | ✅ `/movie-session` | ❌ Not available |
| **Configuration** | ✅ `/movie-configure` | ✅ `/movie-configure` | ❌ Not available |
| **Channel Cleanup** | ✅ `/movie-cleanup` | ✅ `/movie-cleanup` | ❌ Not available |
| **Data Persistence** | ✅ Survives restarts | ✅ Survives restarts | ❌ Lost on restart |
| **Setup Complexity** | 🔧 Moderate | ✅ Simple | ✅ None |
| **Scalability** | ✅ Excellent | ⚠️ Good for small/medium | ⚠️ Session only |
| **Backup/Migration** | ✅ Standard tools | ✅ Simple file copy | ❌ Not applicable |

### JSON File Storage (Recommended for Small Servers)
If you don't want to set up MySQL, the bot can use a local JSON file for persistence:

1. **Automatic Fallback:** If no database credentials are provided, the bot automatically uses JSON storage
2. **Manual Enable:** Set `USE_JSON_STORAGE=true` in your `.env` file to force JSON mode
3. **File Location:** Data is stored in `movie-bot-data.json` in the bot's directory
4. **Backup:** Simply copy the JSON file to backup your data
5. **Migration:** Easy to move between servers or upgrade to MySQL later

**Perfect for:** Self-hosted bots, small servers, development, or when you want persistence without database complexity.

### Advantages of Database Mode
- **Persistent Data:** All votes, movies, and settings survive bot restarts
- **Advanced Features:** Queue management, statistics, and session tracking
- **Configuration:** Server-specific settings and admin role management
- **Scalability:** Handles large amounts of data efficiently
- **History:** Complete viewing history and recommendation tracking

- **Advanced Rules:** Per-session vote caps (up ~1/3, down ~1/5 by default) with admin-configurable ratios in the Administration panel; requires database. In memory-only mode, voting remains open (no caps).

### Memory-Only Mode (No Database)
The bot will automatically fall back to memory-only mode if no database is configured. This provides:
- ✅ **Core Features:** Movie recommendations, voting, and discussions work perfectly
- ✅ **IMDb Integration:** Movie details and posters still work
- ✅ **Real-time Voting:** Vote counts update live during the session
- ⚠️ **Session-Based:** Data is lost when the bot restarts
- ⚠️ **Open Voting:** Per-session vote caps are not enforced without a database (configurable caps are a database-backed feature).

- ❌ **Limited Commands:** Advanced management features unavailable

**Perfect for:** Testing, small servers, or temporary setups where persistence isn't critical.

---

## Windows Setup (PowerShell)
```powershell
mkdir "$env:USERPROFILE\movie-night-bot"
cd "$env:USERPROFILE\movie-night-bot"

# Files: paste package.json, index.js, .env

npm install
node index.js
```
> If PowerShell blocks scripts, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## Linux Setup (Debian/Ubuntu/DietPi)
```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs git

mkdir -p ~/movie-night-bot && cd ~/movie-night-bot
# Files: paste package.json, index.js, .env

npm install
node index.js
```

### Keep it running (optional)
**PM2**
```bash
sudo npm i -g pm2
pm2 start index.js --name movie-night-bot
pm2 save
pm2 startup  # follow the printed instructions
```

---

## Usage

### Creating Recommendations
1. In a server text channel, run `/movie-night`
2. Click **🎬 Create recommendation**
3. Fill the modal (Title + Where to stream) → Submit
4. If multiple IMDb matches are found, select the correct one from the dropdown
5. The bot posts an embed with poster, ratings, and interactive buttons

### Managing Movies
- **Vote:** Use 👍/👎 buttons to vote on recommendations
- **Status:** Use ✅ Watched, 📌 Plan Later, or ⏭️ Skip buttons to manage movies
- **Finality:** Marking a movie as "Watched" removes all buttons and closes the discussion thread
- **Queue:** Run `/movie-queue` to see pending and planned movies
- **Stats:** Run `/movie-stats` to view top-rated movies and viewing history
- **Help:** Run `/movie-help` for comprehensive help and current status

### Enhanced Movie Night Sessions
- **Admin Control Panel:** Comprehensive admin interface with "Plan Next Session" button and session management
- **User-Friendly Formats:** 12-hour or 24-hour time formats (e.g., 7:30 PM or 19:30) and US date format (MM/DD/YYYY)
- **Session Descriptions:** Add custom themes like "Holiday Movie Night - Let's watch festive films!"
- **Automatic Voting Closure:** Sessions automatically close at scheduled voting end times
- **Intelligent Winner Selection:** Automatic winner selection with tie-breaking interface for admins
- **Discord Event Integration:** Full event creation with channel integration, RSVP functionality, and winner updates
- **Movie Carryover System:** Non-winning movies automatically carry over to next session with fresh votes
- **Rich Event Details:** Events include IMDB information, plot summaries, and comprehensive movie details

### Admin Control Panel
- **Comprehensive Interface:** Dedicated admin channel with complete session and movie management
- **Session Controls:** Plan Next Session, Cancel Event, Reschedule Session with proper state management
- **Movie Management:** Pick Winner, Skip to Next, Remove Suggestion, Ban Movie, and Details for each movie
- **Admin Channel Mirroring:** All movies appear in admin channel with management buttons
- **Sync Operations:** Channel synchronization and cleanup tools with carryover movie handling
- **Real-time Updates:** Admin interface updates automatically with session changes

### Enhanced Server Configuration
- **Channel Setup:** `/movie-configure set-channel` for voting channel and admin channel configuration
- **Session Viewing Channels:** Configure channels for Discord events (Voice, Stage, or Text channels)
- **Timezone Management:** `/movie-configure set-timezone` with automatic voting closure support
- **Admin Roles:** `/movie-configure add-admin-role @role` for comprehensive admin access
- **Notification Roles:** Configure roles for Discord event notifications and session announcements
- **View Settings:** `/movie-configure view-settings` shows all current configuration including new features

### Logging Configuration
- **Log Levels:** `ERROR`, `WARN`, `INFO`, `DEBUG` - Control console output verbosity
- **Debug Mode:** Enable detailed debugging for troubleshooting and development
- **Colored Output:** Optional colored console logs for better readability
- **Environment Variables:** Configure logging behavior via `.env` file

### Channel Maintenance
- **Cleanup:** `/movie-cleanup` updates old bot messages to current format (Configured admins only)
- **Thread Creation:** Automatically creates missing discussion threads for movies up for vote
- **Channel Safety:** Cleanup only works in the configured movie channel
- **Permission Control:** Requires either Administrator permission or configured admin role
- **Legacy Support:** Modernizes messages posted before new features were added

### Features
- **Persistent Data:** All votes and movie data survive bot restarts (with database)
- **Smart Organization:** Movies are automatically categorized by status
- **Discussion Threads:** Each recommendation gets its own discussion thread
- **IMDb Integration:** Automatic movie details, posters, and ratings
- **Always-Available Interface:** Every movie post includes a recommendation button and quick guide
- **Bot-Only Channels:** Perfect for channels where only the bot can post - users always have access to features

---

## Troubleshooting
- **Slash command not appearing**: Commands are registered globally and to new guilds automatically. Wait up to 1 hour for global propagation or restart the bot.
- **“Invalid Form Body … SELECT_COMPONENT_OPTION_VALUE_DUPLICATED”**: fixed by deduping `imdbID` in v1.3.0.
- **Threads not created**: ensure bot has *Create Public Threads* and *Send Messages in Threads*.
- **Missing discussion threads**: run `/movie-cleanup` to automatically create threads for movies that are missing them.
- **Global vs Guild**: Commands are now registered globally for all servers. `GUILD_ID` is optional for additional development server registration.

---

## Version Information
- **Release History**: See [CHANGELOG.md](CHANGELOG.md) for detailed release notes
- **Version Source**: `package.json` holds the canonical version
- **Startup Logging**: Bot displays current version on startup

---

## 🚀 Future Features (Planned)

### Enhanced Session Participant Tracking
- **Automatic Attendance Monitoring**: Bot monitors configured viewing channels during session times
- **Real-time Participant Tracking**: Track users who join/leave voice channels during movie nights
- **Attendance Analytics**: Compare registered participants vs. actual attendees
- **Session Duration Tracking**: Monitor how long users stay for each session
- **Viewing Channel Configuration**: Set dedicated channels where movie nights happen
- **Attendance Reports**: Generate detailed reports for completed sessions

### Advanced Voting Analytics
- **User Voting Patterns**: Analyze individual user preferences and voting history
- **Taste Similarity Analysis**: Find users with similar movie preferences
- **Voting Trends**: Track voting patterns over time and by genre
- **Recommendation Success Rates**: Analyze which movies get the most votes
- **Most Active Voters**: Identify and celebrate engaged community members
- **Preference Learning**: Bot learns user tastes for better recommendations

### Enhanced Configuration
- **Session Viewing Channels**: Configure voice/text channels for automatic attendance tracking
- **Flexible Session Duration**: Configurable session lengths for different types of events
- **Advanced Permissions**: Granular permission control for different bot features
- **Custom Status Emojis**: Personalize movie status indicators per server
- **Notification Preferences**: Fine-grained control over who gets pinged for what events

---

## License
MIT License - See [LICENSE](LICENSE) file for details.
