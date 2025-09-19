# PebbleHost Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Upload Files

- Delete all existing files on PebbleHost
- Upload all bot files via SFTP
- **IMPORTANT**: Make sure to upload `package.json` and `package-lock.json`

### 2. Install Dependencies

**CRITICAL**: After uploading files, run this command in PebbleHost terminal:

```bash
npm install
```

This installs required packages including:

- `fuse.js` (for spell checking suggestions)
- `discord.js`, `mysql2`, etc.

### 3. Environment Variables

Ensure these are set in your `.env` file:

```env
# Enable migrations for TV shows table
DB_MIGRATIONS_ENABLED=true

# Database connection
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

# Discord bot token
DISCORD_TOKEN=your-bot-token

# OMDb API for TV shows/movies
OMDB_API_KEY=your-omdb-key
```

### 4. Start Bot

```bash
npm start
```

## 🔧 Troubleshooting

### "fuse.js not available" Warning

**Cause**: Dependencies not installed
**Fix**: Run `npm install` in PebbleHost terminal

### "tv_shows table doesn't exist" Error

**Cause**: Migrations not enabled
**Fix**: Set `DB_MIGRATIONS_ENABLED=true` in `.env` and restart bot

### Missing Features After Update

**Cause**: Old code cached or dependencies not updated
**Fix**:

1. Delete all files on PebbleHost
2. Upload fresh files
3. Run `npm install`
4. Restart bot

## 📋 Migration Status

The bot will automatically create these tables when `DB_MIGRATIONS_ENABLED=true`:

- ✅ `tv_shows` - TV show recommendations
- ✅ `votes_tv` - TV show voting
- ✅ `movie_sessions.content_type` - Session type tracking

## 🎯 Version Info

**Current Version**: v1.16.0-watch-party
**Features**:

- ✅ Separate Movie/TV Show session planning
- ✅ Content-specific recommendation forms
- ✅ Spell checking suggestions (requires fuse.js)
- ✅ TV show episode support with IMDb integration

## 📞 Support

If you encounter issues:

1. Check PebbleHost console logs
2. Verify all environment variables are set
3. Ensure `npm install` was run after file upload
4. Check database connection and migrations
