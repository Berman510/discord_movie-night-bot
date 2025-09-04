# Changelog

All notable changes to **Movie Night Bot** will be documented in this file.

## [1.5.1] - 2025-09-04
### Added
- **Persistent Recommendation Button:** Only the most recent movie post includes a quick guide and recommendation button
- **Smart Guide Management:** Previous guide messages are automatically deleted when new movies are posted
- **Always-Available Interface:** Users can always create new recommendations from the latest bot message
- **Quick Command Reference:** Embedded guide shows available commands and features

### Changed
- Enhanced user experience with persistent access to bot features without spam
- Improved discoverability of commands and functionality
- Intelligent cleanup prevents multiple guide messages in the same channel

---

## [1.5.0] - 2025-09-04
### Added
- **Movie Session Management:** `/movie-session` command for organizing movie night events
- **Event Creation:** Create named movie sessions with optional dates/times
- **Session Tracking:** List active movie sessions and their details
- **Winner Selection:** Automatically pick the highest-voted movie as the session winner
- **Event Integration:** Sessions integrate with existing voting and queue systems

### Changed
- Enhanced command structure with sub-options for better organization
- Improved database schema to support movie session tracking

---

## [1.4.0] - 2025-09-04
### Added
- **MySQL Database Integration:** Full persistent storage for movies, votes, and statistics
- **Movie Status Management:** Mark movies as "Watched ✅", "Planned 📌", or "Skipped ⏭️"
- **Enhanced Queue System:** `/movie-queue` command to view pending and planned movies
- **Statistics Dashboard:** `/movie-stats` command showing top-rated movies and viewing history
- **Persistent Voting:** Votes are now saved to database and survive bot restarts
- **Smart Status Tracking:** Movies show visual status indicators and updated colors

### Changed
- Vote buttons now include status management options for better organization
- Database operations with graceful fallback to memory-only mode if database unavailable
- Enhanced embed styling with status-based colors and footers

### Fixed
- Updated `ready` event to `clientReady` to resolve discord.js deprecation warning

---

## [1.3.4] - 2025-09-04
### Fixed
- Updated `ready` event to `clientReady` to resolve discord.js deprecation warning and ensure compatibility with future versions.

---

## [1.3.3] - 2025-09-04
### Added
- **Forum/Media channel support:** Bot now creates a **post** with embed + vote buttons and seeds details automatically if used in a Forum/Media channel.
- **Preflight permission checks:** Bot checks channel permissions before posting and responds with an ephemeral message listing any missing ones.

### Changed
- Improved logging for posting failures with clearer messages.
- Always seeds a starter message in discussion threads, even when IMDb lookup fails.

### Fixed
- `Missing Permissions (50013)` errors now produce a clear, user-facing explanation instead of a generic failure.

---

## [1.3.2] - 2025-09-03
### Fixed
- **Unknown interaction (10062)** on slow/mobile vote clicks by acknowledging first (`deferUpdate`) before editing the message.
- **Empty discussion threads**: a starter message is now always posted even if IMDb lookup is unavailable.

---

## [1.3.1] - 2025-09-03
### Fixed
- **Selection expired** bug: selector payload key no longer includes colons, so parsing is stable.

---

## [1.3.0] - 2025-09-03
### Added
- IMDb selector now uses a **short in-memory payload key** to keep `customId` small and reliable.
- **Deduplicates OMDb results** by `imdbID` and caps options at Discord’s limit (25) to prevent duplicate-value errors.

### Changed
- **Silent voting:** removed ephemeral "Your vote is in" replies. Buttons update counts with no extra messages.
- Modal remains **Title + Where to stream** only; rating pulled from OMDb.
- Thread seed message tightened to synopsis + compact details (Rated/Runtime/Genre/Director/Cast).

### Fixed
- `Invalid Form Body … SELECT_COMPONENT_OPTION_VALUE_DUPLICATED` when OMDb returned duplicate IDs.

---

## [1.2.0] - 2025-09-03
### Changed
- Removed manual **film rating** question from the modal; rating is now pulled from OMDb and shown in the embed.

---

## [1.1.0] - 2025-09-03
### Added
- Rich startup logging (version, mode, client ID, OMDb status).
- Version read from `package.json` and displayed at boot.

### Changed
- `/movie-night` registers as **guild-scoped** when `GUILD_ID` is set; otherwise **global**.

---

## [1.0.0] - 2025-09-03
### Added
- Initial public-ready bot:
  - `/movie-night` command posts **Create recommendation** button.
  - Modal to collect **Title**, **Rating**, **Where to stream**.
  - OMDb lookup for IMDb details; posts embed with **poster**, **MPAA rating**, **IMDb rating**, **Metascore**.
  - Auto-creates **discussion thread** and seeds with synopsis/details.
  - **👍/👎 voting** with live-updating counts.
