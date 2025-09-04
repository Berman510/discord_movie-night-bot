# Movie Night Bot

Discord bot to create in-channel movie recommendations with persistent voting, status tracking, queue management, and IMDb integration. Features MySQL database storage, movie night statistics, and smart suggestion management.

**Version:** 1.5.1

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

## Database Setup (PebbleHost)
1. Log into your PebbleHost panel
2. Go to "MySQL Database" section
3. Create a new database (you get 1 free with bot hosting)
4. Copy the connection details to your `.env` file
5. The bot will automatically create the required tables on first run

**Note:** The bot works without a database (memory-only mode) but you'll lose data on restarts and won't have access to queue management or statistics features.

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
- **Queue:** Run `/movie-queue` to see pending and planned movies
- **Stats:** Run `/movie-stats` to view top-rated movies and viewing history

### Movie Night Sessions
- **Create Event:** `/movie-session create name:"Friday Night" date:"2025-09-06 8pm"`
- **List Sessions:** `/movie-session list` to see active movie night events
- **Pick Winner:** `/movie-session winner` to automatically select the top-voted movie
- **Event Organization:** Sessions help organize specific movie night events with dates and times

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
- **Global vs Guild**: remove `GUILD_ID` for public/global; keep it set for instant updates in a test server.

---

## Versioning
- `package.json` holds the canonical version (`1.3.0`).
- `index.js` reads it via `require('./package.json').version` and logs on startup.

---

## License
ISC (adapt as needed).
