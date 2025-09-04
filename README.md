# Movie Night Bot

Discord bot to create in-channel movie recommendations via a modal (Title + Where to stream), post an embed with live 👍/👎 vote buttons, open a discussion thread, and enrich with IMDb/OMDb details.

**Version:** 1.3.1

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
```

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
1. In a server text channel, run `/movie-night`.
2. Click **🎬 Create recommendation**.
3. Fill the modal (Title + Where to stream) → Submit.
4. If multiple IMDb matches are found, the bot sends you a private selector to confirm the title.
5. The bot posts an embed with poster, Rated/IMDb/Metascore, and live vote buttons; a discussion thread opens automatically.

No spammy confirmations — voting buttons update silently.

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
