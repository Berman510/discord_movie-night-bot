# Movie Night Bot

Discord bot to create in-channel movie recommendations with a modal (Title, MPAA rating, Where to stream), post an embed with 👍/👎 vote buttons, open a discussion thread, and (optionally) enrich with IMDb/OMDb details.

**Version:** 1.1.0

---

## Prerequisites
- Node.js 18+ (includes `fetch`).
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
```

---

## Windows Setup (PowerShell)
```powershell
# 1) Create folder & move into it
mkdir "$env:USERPROFILE\movie-night-bot"
cd "$env:USERPROFILE\movie-night-bot"

# 2) Initialize project & install deps
npm init -y
npm install discord.js dotenv

# 3) Create .env from template (edit values)
@"
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_APPLICATION_ID
GUILD_ID=YOUR_SERVER_ID
OMDB_API_KEY=YOUR_OMDB_API_KEY
"@ | Out-File -FilePath ".env" -Encoding utf8

# 4) Add the files from this repo (package.json/index.js/README.md)
#    Paste the contents into matching files in this folder.

# 5) Run
node index.js
```
> If PowerShell blocks scripts, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## Linux Setup (Debian/Ubuntu/DietPi)
```bash
# 1) System update
sudo apt update && sudo apt -y upgrade

# 2) Node.js & npm (NodeSource LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# 3) Project
mkdir -p ~/movie-night-bot && cd ~/movie-night-bot
npm init -y
npm i discord.js dotenv

# 4) .env
cat > .env << 'EOF'
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_APPLICATION_ID
GUILD_ID=YOUR_SERVER_ID
OMDB_API_KEY=YOUR_OMDB_API_KEY
EOF

# 5) Add files (package.json/index.js/README.md) and run
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
1. In a server text channel, run `/movie-night`.
2. Click **🎬 Create recommendation**.
3. Fill the modal (Title, MPAA rating, Where to stream) → Submit.
4. The bot posts an embed with vote buttons.
5. A thread is created for discussion, seeded with IMDb/OMDb details (if API key set).

If multiple IMDb matches are found, the bot sends you a private selector to confirm the exact title before posting.

---

## Troubleshooting
- **Slash command not appearing**: set `GUILD_ID` in `.env` for instant registration; restart the bot.
- **“The application did not respond”**: ensure `index.js` has the `interactionCreate` handler (this repo includes it), and that your process restarted after edits.
- **No IMDb selector**: verify your OMDb key:
  ```bash
  curl "https://www.omdbapi.com/?apikey=YOUR_OMDB_API_KEY&type=movie&s=Dogma"
  ```
  Should return `Response: True`.
- **Threads not created**: ensure bot has *Create Public Threads* and *Send Messages in Threads* permissions in that channel/category.
- **Different Prod/Beta bots**: create two apps & tokens; run each with its own `.env`.

---

## Versioning
- `package.json` holds the canonical version (`1.1.0`).
- `index.js` reads it via `require('./package.json').version` and logs on startup.

---

## License
MIT
