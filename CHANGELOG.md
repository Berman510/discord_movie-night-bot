# Changelog

All notable changes to **Movie Night Bot** will be documented in this file.

## [1.9.1] - 2025-09-05
### Fixed
- **Session Command UX:** Improved parameter descriptions for `/movie-session` command clarity
- **Discord.js Compatibility:** Fixed deprecation warning by updating `ready` event to `clientReady`
- **Command Registration:** Fixed missing Routes import causing command registration failures
- **User Experience:** Clarified that session-id and movie-title parameters are only needed for specific actions

---

## [1.9.0] - 2025-09-05
### Added
- **Thread Recovery:** Cleanup feature now creates missing discussion threads for movies up for vote
- **Interactive Session Creation:** Modal-based session creation with intuitive date/time selection
- **Smart Date Selection:** Quick buttons for "Tonight", "Tomorrow", "This Friday", "This Weekend"
- **Time Presets:** Easy selection for 7pm, 8pm, 9pm, or custom times
- **Timezone Support:** Full timezone awareness with selection during session creation
- **Discord Event Integration:** Automatically creates Discord scheduled events for sessions with dates
- **Guild Timezone Configuration:** Server admins can set default timezone via `/movie-configure set-timezone`
- **Planned Movie Integration:** "Create Session" button on planned movies for direct session creation
- **Enhanced Session Management:** Improved listing with detailed session information including timezone
- **Session Joining:** Users can join sessions to receive updates and see session details
- **Movie-Session Association:** Sessions can be linked to specific planned movies

### Changed
- **Major Code Refactoring:** Split monolithic 2800+ line index.js into modular architecture
- **Modular Structure:** Organized code into commands/, handlers/, services/, utils/, and config/ directories
- **Improved Maintainability:** Each module has single responsibility and clear interfaces
- Extended cleanup functionality to ensure all pending movies have discussion threads
- Replaced text-based session creation with interactive button/modal interface
- Enhanced session listing with organizer, date, timezone, featured movies, and Discord event status
- Improved session commands with focused actions (create, list, join, add-movie, winner)
- Added flexible date parsing supporting natural language like "Friday 8pm" and "Tomorrow 7:30pm"
- All session dates now display with proper timezone information
- Database schema updated to support timezone and Discord event tracking

---

## [1.8.1] - 2025-09-04
### Added
- **JSON File Storage Option:** Alternative to MySQL for simple persistent storage
- **Automatic Fallback:** Bot automatically uses JSON storage if no database configured
- **Flexible Storage:** Three modes - MySQL, JSON file, or memory-only
- **Generalized Documentation:** Updated README for various hosting providers and database options

### Changed
- **Enhanced Storage Flexibility:** Multiple persistence options for different use cases
- **Improved Setup Documentation:** Clear comparison of storage options and their trade-offs
- **Better Fallback Handling:** Graceful degradation from MySQL → JSON → Memory-only

---

## [1.7.1] - 2025-09-04
### Added
- **Comprehensive Help Command:** `/movie-help` shows all commands, current status, and admin information
- **Real-Time Status Display:** Shows current queue, recent activity, and active sessions
- **Permission-Aware Help:** Different information shown based on user's admin status
- **System Status Monitoring:** Displays database, API, and configuration status

### Changed
- Enhanced user experience with centralized help and status information
- Improved discoverability of all bot features and current server state

---

## [1.7.0] - 2025-09-04
### Added
- **Guild Configuration System:** `/movie-configure` command for server-specific settings
- **Channel Restrictions:** Configure specific channels where movie commands can be used
- **Custom Admin Roles:** Add/remove roles that can use admin commands beyond Discord Administrators
- **Enhanced Security:** Cleanup commands now require proper configuration and permissions
- **Configuration Management:** View, modify, and reset server-specific bot settings

### Changed
- **Improved Safety:** Cleanup commands now restricted to configured channels and authorized users
- **Better Permission System:** Supports both Discord Administrator permissions and custom admin roles
- **Enhanced Database Schema:** Added guild configuration storage for persistent settings

### Security
- **Channel Isolation:** Prevents accidental cleanup in wrong channels
- **Role-Based Access:** Granular control over who can use administrative features
- **Configuration Protection:** Only Discord Administrators can modify bot configuration

---

## [1.6.0] - 2025-09-04
### Added
- **Channel Cleanup System:** `/movie-cleanup` command to update old bot messages to current format
- **Automatic Message Modernization:** Updates old movie posts with new button layouts and database integration
- **Guide Message Cleanup:** Removes duplicate guide messages, keeping only the most recent
- **Admin-Only Access:** Cleanup command requires Administrator permissions for safety

### Changed
- Enhanced channel maintenance with retroactive format updates
- Improved consistency across all bot messages regardless of when they were posted
- Better handling of legacy messages from previous bot versions

---

## [1.5.2] - 2025-09-04
### Added
- **Automatic Thread Closure:** When a movie is marked as "Watched", its discussion thread is automatically archived
- **Complete Voting Closure:** Watched movies have all buttons removed - no more voting or status changes possible

### Changed
- Enhanced "Watched" status behavior to properly close discussions and voting
- Improved status management with clear finality for watched movies
- Better user feedback indicating when discussions are closed

---

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
