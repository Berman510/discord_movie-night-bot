# Watch Party Bot - Technical Setup Guide

This guide is for developers and self-hosters who want to run their own instance of the Watch Party Bot.

## Prerequisites

- Node.js 18+ (fetch built-in)
- Discord application + bot token
- (Optional) OMDb API key: <http://www.omdbapi.com/apikey.aspx>

## Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create **New Application** → give it a name (e.g., "Movie Night Bot")
3. Go to **Bot** section → **Add Bot** → copy the **Bot Token**
4. (Optional) Enable **Message Content Intent** in Bot section if you use message-based features
5. Go to **OAuth2 → URL Generator**:
   - **Scopes**: `bot` + `applications.commands`
   - **Permissions**: Use the permissions listed below
6. Use generated URL to invite bot to your server

### Required OAuth Scopes

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

- ✅ **Guild Voice States** (required for attendance tracking in Watch Party Channel)
- ✅ **Message Content Intent** (optional; only needed if you use legacy message-based features)

**Invite link template:**

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=2147765248
```

## Environment Configuration

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

### Dashboard Integration (WS-only)

Use the WebSocket bridge (bot-initiated):

```
WATCHPARTY_WS_ENABLED=true
WATCHPARTY_WS_URL=wss://bot-watchparty.bermanoc.net/socket
WATCHPARTY_WS_TOKEN=YOUR_LONG_RANDOM_TOKEN
```

Note: for beta use `wss://bot-watchparty-beta.bermanoc.net/socket`.

Webhook support has been removed. The bot now operates WS-only.

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

### JSON File Storage (Recommended for Small Servers)

If you don't want to set up MySQL, the bot can use a local JSON file for persistence:

1. **Automatic Fallback:** If no database credentials are provided, the bot automatically uses JSON storage
2. **Manual Enable:** Set `USE_JSON_STORAGE=true` in your `.env` file to force JSON mode
3. **File Location:** Data is stored in `movie-bot-data.json` in the bot's directory
4. **Backup:** Simply copy the JSON file to backup your data
5. **Migration:** Easy to move between servers or upgrade to MySQL later

**Perfect for:** Self-hosted bots, small servers, development, or when you want persistence without database complexity.

### Memory-Only Mode (No Database)

The bot will automatically fall back to memory-only mode if no database is configured. This provides:

- ✅ **Core Features:** Movie recommendations, voting, and discussions work perfectly
- ✅ **IMDb Integration:** Movie details and posters still work
- ✅ **Real-time Voting:** Vote counts update live during the session
- ⚠️ **Session-Based:** Data is lost when the bot restarts
- ⚠️ **Open Voting:** Per-session vote caps are not enforced without a database (configurable caps are a database-backed feature)
- ❌ **Limited Commands:** Advanced management features unavailable

**Perfect for:** Testing, small servers, or temporary setups where persistence isn't critical.

## Installation

### Windows Setup (PowerShell)

```powershell
mkdir "$env:USERPROFILE\movie-night-bot"
cd "$env:USERPROFILE\movie-night-bot"

# Files: paste package.json, index.js, .env

npm install
node index.js
```

> If PowerShell blocks scripts, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Linux Setup (Debian/Ubuntu/DietPi)

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

## IMDb Caching (cross-guild)

The bot prefers the imdb_cache table for all IMDb data. If a movie is not in cache, the bot will perform a one-time live OMDb fetch for display and attempt to cache the result when possible. This ensures posters/ratings/plots appear reliably in:

- Movie recommendation embeds (text/forum)
- Discussion thread details
- Winner announcements and Discord Event updates
- Designed to minimize OMDb usage while keeping UX complete
- Deep purge does not clear this cache

Notes:

- Set `OMDB_API_KEY` to enable the live fetch fallback
- Cache maintenance/env toggles:
  - IMDB_CACHE_ENABLED=true
  - IMDB_CACHE_TTL_DAYS=90
  - IMDB_CACHE_MAX_ROWS=10000

## Troubleshooting

- **Slash command not appearing**: Commands are registered globally and to new guilds automatically. Wait up to 1 hour for global propagation or restart the bot.
- **"Invalid Form Body … SELECT_COMPONENT_OPTION_VALUE_DUPLICATED"**: fixed by deduping `imdbID` in v1.3.0.
- **Threads not created**: ensure bot has _Create Public Threads_ and _Send Messages in Threads_.
- **Missing discussion threads**: run `/movie-cleanup` to automatically create threads for movies that are missing them.
- **Global vs Guild**: Commands are now registered globally for all servers. `GUILD_ID` is optional for additional development server registration.

## Version Information

- **Release History**: See [CHANGELOG.md](CHANGELOG.md) for detailed release notes
- **Version Source**: `package.json` holds the canonical version
- **Startup Logging**: Bot displays current version on startup
