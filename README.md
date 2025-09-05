# Movie Night Bot

Discord bot to create in-channel movie recommendations with persistent voting, status tracking, queue management, and IMDb integration. Features MySQL database storage, movie night statistics, and smart suggestion management.

**Version:** 1.9.6

> **🏗️ Modular Architecture**: The bot has been refactored into a clean modular structure for better maintainability. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

---

## Prerequisites
- Node.js 18+ (fetch built-in).
- Discord application + bot token.
- (Optional) OMDb API key: <http://www.omdbapi.com/apikey.aspx>

### Required OAuth Scopes
- `bot`
- `applications.commands`

### Required Bot Permissions
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands
- Create Public Threads
- Send Messages in Threads

**Permissions integer:** `2147503104`

Invite link template:
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=2147503104
```

---

## .env
Create a `.env` in the project root (copy from `.env.example`):
```
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_APPLICATION_ID
# Optional: set for instant (guild) command registration; omit for global
GUILD_ID=YOUR_SERVER_ID
# Optional: OMDb API key
OMDB_API_KEY=YOUR_OMDB_API_KEY

# MySQL Database (get these from PebbleHost panel)
DB_HOST=YOUR_DB_HOST
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
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

### Memory-Only Mode (No Database)
The bot will automatically fall back to memory-only mode if no database is configured. This provides:
- ✅ **Core Features:** Movie recommendations, voting, and discussions work perfectly
- ✅ **IMDb Integration:** Movie details and posters still work
- ✅ **Real-time Voting:** Vote counts update live during the session
- ⚠️ **Session-Based:** Data is lost when the bot restarts
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

### Movie Night Sessions
- **Interactive Creation:** `/movie-session create` opens an intuitive interface with date/time buttons
- **Smart Date Selection:** Choose from "Tonight", "Tomorrow", "This Friday", or custom dates
- **Time Presets:** Quick selection for 7pm, 8pm, 9pm, or custom times
- **Timezone Support:** Select timezone during creation or use server default timezone
- **Discord Events:** Automatically creates Discord scheduled events for sessions with dates
- **Planned Movie Integration:** Create sessions directly from planned movies with "🎪 Create Session" button
- **Enhanced Listing:** `/movie-session list` shows detailed session info with organizer, date, timezone, and featured movies
- **Session Management:** `/movie-session join [id]` to follow sessions, `/movie-session add-movie [id] [title]` to add movies
- **Winner Selection:** `/movie-session winner` automatically selects the top-voted movie

### Server Configuration
- **Setup:** `/movie-configure set-channel` to designate the movie recommendation channel
- **Timezone:** `/movie-configure set-timezone` to set server's default timezone for movie sessions
- **Admin Roles:** `/movie-configure add-admin-role @role` to allow specific roles to use admin commands
- **View Settings:** `/movie-configure view-settings` to see current configuration
- **Security:** Only Discord Administrators can modify bot configuration

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
- **Slash command not appearing**: set `GUILD_ID` in `.env` for instant registration; restart the bot.
- **“Invalid Form Body … SELECT_COMPONENT_OPTION_VALUE_DUPLICATED”**: fixed by deduping `imdbID` in v1.3.0.
- **Threads not created**: ensure bot has *Create Public Threads* and *Send Messages in Threads*.
- **Missing discussion threads**: run `/movie-cleanup` to automatically create threads for movies that are missing them.
- **Global vs Guild**: remove `GUILD_ID` for public/global; keep it set for instant updates in a test server.

---

## Versioning
- `package.json` holds the canonical version (`1.3.0`).
- `index.js` reads it via `require('./package.json').version` and logs on startup.

---

## License
ISC (adapt as needed).
