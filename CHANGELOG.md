# Changelog

All notable changes to **Watch Party Bot** will be documented in this file.

## [1.16.0-rc1] - 2025-09-15

### 🎯 Major Features
- **Spell Checking Suggestions**: Added intelligent fuzzy matching for movie titles
  - Automatically suggests corrections for common typos and misspellings
  - Provides "Did you mean...?" interface when no exact matches are found
  - Includes common movie title corrections (e.g., "spiderman" → "spider-man")
  - Supports variations like adding/removing "The", number/word conversions
  - Enhanced user experience with clear suggestion buttons and fallback options

- **TV Shows Support**: Extended bot to support TV shows alongside movies
  - Search and recommend TV series with seasons and episodes
  - Enhanced IMDb integration with series-specific metadata
  - Visual distinction between movies (🍿) and TV shows (📺)
  - Database schema updated to store content type and season information
  - Unified content search across both movies and TV shows

- **Complete Rebranding to "Watch Party"**: Comprehensive rebrand from "Movie Night" to "Watch Party"
  - Updated all command names: `/movienight` → `/watchparty`, `/movienight-setup` → `/watchparty-setup`
  - Refreshed user interface text and embed titles throughout the bot
  - Updated documentation, README, and package.json to reflect new branding
  - Enhanced terminology: "movie recommendations" → "content recommendations"
  - Modernized bot identity to better reflect expanded TV show support

### 🔧 Technical Improvements
- Added `fuse.js` dependency for advanced fuzzy matching capabilities
- Enhanced IMDb service with `searchContentWithSuggestions()` and `searchContent()` functions
- New spelling suggestion UI components with interactive buttons
- Database migration (31) adds TV show support fields to movies table
- Updated embed formatting to handle both movies and TV series
- Improved error handling and user feedback for failed searches
- Comprehensive command and interface rebranding across all modules

## [1.15.1] - 2025-09-14

### Enhanced
- **Time Display Consistency**: Improved time formatting with cleaner on-the-hour display (7 PM instead of 7:00 PM)
- **Documentation Accuracy**: Fixed date format references to reflect correct MM/DD/YYYY format
- **User Experience**: More professional and readable time displays across all bot interactions

### Changed
- Session time buttons now show cleaner format (7 PM, 8 PM, 9 PM)
- Updated formatTime function to use cleaner display for on-the-hour times
- Standardized time selection logic for better consistency

### Technical Improvements
- Code cleanup and optimization phase completion
- Unified version numbering system with dashboard
- Enhanced time formatting utilities

## [1.15.0] - 2025-09-14

### Major Features
- **Dashboard Integration**: Full WebSocket communication with Movie Night Dashboard
- **Real-time Synchronization**: Automatic sync between bot and dashboard configurations
- **Enhanced Configuration**: WebSocket handlers for vote caps and guild configuration updates

### Added
- WebSocket client for dashboard communication with automatic reconnection
- Handlers for `get_guild_roles`, `get_guild_channels`, `get_member_roles`
- Configuration update handlers: `update_vote_caps`, `update_guild_config`
- Real-time event emission: `vote_update`, `session_created/updated/cancelled`, `winner_selected`
- Auto-sync functionality triggered from dashboard configuration changes
- Enhanced logging and debugging capabilities for WebSocket operations

### Fixed
- **Critical**: WebSocket client initialization - properly assign to global.wsClient
- WebSocket message handling and response sending
- Dashboard communication reliability and error handling
- Configuration synchronization between bot and dashboard

### Changed
- Bot now serves as single source of truth for configuration changes
- Dashboard becomes read-only for state management with bot as writer
- Enhanced WebSocket resilience with periodic connection checks
- Improved error handling and connection diagnostics

### Technical Improvements
- Comprehensive WebSocket debugging and logging
- Better separation of concerns in configuration management
- Enhanced error recovery and connection stability
- Improved message routing and response handling






## [1.14.3] - 2025-09-14
### Highlights (final)
- Dashboard parity and live updates foundation: bot emits lightweight events after key actions (vote_update, session_created/updated/cancelled, winner_selected) enabling the dashboard’s real-time SSE UI.
- Configuration via bot only: new WS handlers `update_vote_caps` and `update_guild_config`; emits `caps_updated`/`config_updated` so admin forms refresh automatically. Dashboard becomes read-only for state; bot is the single writer.
- Discord Event titles are sanitized to remove dates/times; localized times are shown in descriptions via `<t:...>`.
- IMDb display and sync safety: resilient display of IMDb data in posts/threads and safer Sync operations that do not revive concluded sessions.
- WebSocket resilience and clearer diagnostics across handlers.


## [1.14.3-rc13] - 2025-09-14
### Changed
- WS client: add handlers `update_vote_caps` and `update_guild_config` so dashboard delegates configuration changes to the bot.
- Emits `caps_updated` and `config_updated` events for live dashboard refresh via SSE.
- Continues the pattern: dashboard is read-only for state; bot is single writer.

## [1.14.3-rc12] - 2025-09-13
### Fixed/Changed
- Discord Events: strengthen title sanitization to robustly strip date/time words (days, months, 24h/12h times, 4-digit years). Keeps optional movie title segment only when not date-like; otherwise falls back to base title.
- Applies to both event creation and update paths via unified buildEventTitle().


## [1.14.3-rc11] - 2025-09-13
### Fixed/Changed
- Discord Events: event titles are now guaranteed to never include date/time, even if the session name contains them. Times are shown in the description using localized Discord timestamps instead.
- Event edits use the same title sanitization path as creation.


## [1.14.3-rc7] - 2025-09-13
### Fixed/Changed
- IMDb display fallback: if imdb_cache is empty, fall back to stored movie.imdb_data or perform a one-time live OMDb fetch for display only. Applies to:
  - Text post embeds and discussion thread details at creation
  - Winner announcements (text and forum)
  - Discord Scheduled Event updates after winner selection
- Sync Channels safety: avoids reviving concluded sessions by only recreating missing movie posts when an active voting session exists, and only re-adding voting buttons when a session is active.

## [1.14.3-rc6] - 2025-09-13
### Changed
- IMDb normalization (bot-side): all reads now pull from imdb_cache only; no fallback to movies.imdb_data. Future DB can omit imdb_data entirely.
- WebSocket resilience: periodic connection checks with change-only logging; auto-reconnect. Admin Control Panel shows WS status.
- Sync Channels behavior: avoids refreshing Admin Channel mirror to keep admin action buttons usable.




## [1.14.3-rc3] - 2025-09-12
### Changed
- Rename “Viewing Channel” to “Watch Party Channel” across UI and DB: `session_viewing_channel_id` -> `watch_party_channel_id`
- Guided Setup and Config flows updated (buttons, selects, copy)
- Slash command renames for consistency:
  - `movie-night` -> `movienight`
  - `movie-setup` -> `movienight-setup`
  - `movie-queue` -> `movienight-queue`
  - `movie-plan` -> `movienight-plan`
  - `movie-watched` -> `movienight-watched`
  - `movie-skip` -> `movienight-skip`
  - `admin-panel` -> `movienight-admin-panel`
  - `debug-config` -> `movienight-debug-config`
- Deprecated/removed redundant commands: `movie-session`, `movie-cleanup`, `movie-stats`, `movie-help`

### Docs
- README cleanup: removed ad-hoc TODO and What's New sections; added Quick Start and Role-based Access; updated movienight-* command references
- Added ROADMAP.md to document future ideas/goals that were previously in README

## [1.14.3-rc2] - 2025-09-12
### Breaking/Changed
- Database schema: renamed `viewer_roles` -> `voting_roles`; removed `notification_role_id` entirely (clean slate)
- Removed all migrations and legacy notification role code/handlers
- Announcements now always use Voting Roles from `voting_roles` (supports multiple roles)
- Updated Guided Setup, Config UI, and permissions to use `voting_roles`

## [1.14.3-rc1] - 2025-09-12
### Changed
- Enforce Voting Roles on votes: Discord button clicks and dashboard WS `vote_movie` now require Voting Roles or Moderator/Admin
- Behavior when no Voting Roles configured: only Admins/Moderators can vote (strict enforcement)
- "Manage Server" permission counts as implicit Admin for permission checks
- Copy: ephemeral messages and logs updated to say "Voting Roles"
- Announcements now ping Voting Roles (supports multiple roles); legacy `notification_role_id` is still read as a fallback but is deprecated
- Bot Configuration menu and Guided Setup copy updated to "Voting Roles"; the in-bot "Notification Role" action now points you to the dashboard to configure Voting Roles



## [1.14.2-rc1] - 2025-09-11
### Added
- Migration 30: Backfill missing active voting session records for guilds that have pending movies but no session, and link those movies to the new session.

### Notes
- Addresses dashboards showing movies but no active session/reschedule controls for legacy servers.
- Safe and idempotent: runs once, skips if an active session already exists or no channel can be determined.
- After updating, restart the bot or run `npm run migrate` to apply.


## [1.14.1] - 2025-09-11
### Highlights (final)
- WebSocket-only integration complete; legacy webhooks removed. Dashboard→bot actions over WS now include voting, ban/unban, remove, pick winner, sync channels, and refresh panel.
- Winner selection: dashboard “Pick Winner” triggers session finalization; forum threads update and winner announcement posts when applicable.
- Reschedule polish: session name auto-syncs to new date/time; pinned “Recommend a Movie” post updates accordingly.
- Reliability: improved WS reconnect logs with codes/reasons and backoff timing; numerous logging and permission polish items.




## [1.14.1-rc12] - 2025-09-11
### Fixed
- Ban behavior: prevent duplicate “system/admin” rows when banning movies that already exist; only create marker rows if none exist.
- Discord cleanup on ban: archive forum threads and delete/disable text messages for banned movies.

### Improved
- WebSocket resiliency: clearer close/reconnect logging with codes/reasons and backoff timing.


## [1.14.1-rc11] - 2025-09-11
### Changed
- Webhook removal: fully removed legacy webhook server and dashboard webhook client usage; WS-only operation.
- Logging sweep (incremental): add [guild_id] context to forum post creation, movie creation debug, and session viewing join/leave + monitoring messages.


## [1.14.1-rc10] - 2025-09-11
### Changed
- WS voting (forum): also updates the forum starter message embed and voting buttons so counts reflect immediately (previously only the thread title changed).
- Permissions: Moderators can now use Remove and Skip actions in the admin movie controls; admin remains required for ban/unban/pick-winner/watched.
- Admin mirror: stop posting banned movies during Sync; banned management will live in a dedicated list/UI.
- Webhook server: removed startup; bot runs WS-only without logging the disabled webhook server.


## [1.14.1-rc9] - 2025-09-11
### Changed
- Logging: add `[guild_id]` context to WebSocket handlers and related warnings/errors:
  - vote_movie (cap checks, message updates, errors)
  - movie_status_changed updates
  - sync_guild / refresh_admin_panel
  - plan_session / reschedule_session / cancel_session


## [1.14.1-rc5] - 2025-09-10
### Changed
- Permissions: Moderators can now use the “Details” button in the moderation/admin channel. Admin remains required for mutating actions (ban/unban, schedule, remove, pick winner, etc.).

## [1.14.1-rc6] - 2025-09-10
### Fixed
- Startup: fixed a missing closing brace in initializeTables() that caused a parse error near runMigrations on some Node builds.


## [1.14.1-rc7] - 2025-09-10
## [1.14.1-rc8] - 2025-09-11
### Changed
- Permissions: Moderators can now use Sync Channels and Refresh Panel buttons in the Admin Control Panel. Other actions remain admin-only.


### Added
- WebSocket voting: new `vote_movie` handler processes dashboard votes (up/down/clear), enforces per-session vote caps, updates Discord message/embed/buttons, and logs diagnostics.



## [1.14.1-rc4] - 2025-09-10
### Added
- Database: viewer_roles JSON column on guild_config
  - Ensured in base schema, initializeTables, and Migration 29 (idempotent)
  - Parsed and exposed via getGuildConfig()

### Notes
- No behavior change yet; dashboard will begin gating the Voting section by viewer roles in addition to moderators/admins.

## [1.14.1-rc3] - 2025-09-10
### Added
- WebSocket: dashboard→bot admin actions now supported over WS
  - `sync_guild` syncs Admin Panel and voting posts (forum-aware) like the webhook path
  - `refresh_admin_panel` re-renders the Admin Control Panel in the configured admin channel

### Notes
- For PebbleHost/beta, set in the bot .env:
  - `MOVIENIGHT_WS_ENABLED=true`
  - `MOVIENIGHT_WS_URL=wss://bot-movienight-beta.bermanoc.net/socket`
  - `MOVIENIGHT_WS_TOKEN=<the WS token from AWS Secrets Manager>`
- To fetch the token (read-only), run:
  - `aws secretsmanager get-secret-value --secret-id movienight-dashboard/beta/ws --query SecretString --output text`

## [1.14.1-rc2] - 2025-09-10

## [1.14.3-rc4] - 2025-09-12
### Fixed
- Sync Channel: Do not mirror queue to Admin Channel when no active session (keeps only the Admin Control Panel)
- Sync Channel: Do not recreate Voting Channel movie posts when no active session (forum: cleaned; text: show "no active session" notice only)

### Added
- WebSocket: dashboard→bot session controls over WS
  - `plan_session` creates a new voting session (Discord event + DB + scheduler)
  - `reschedule_session` updates existing session/event and reschedules voting end
- Webhook server: support `MOVIENIGHT_WEBHOOK_PORT` to bind PebbleHost-assigned fixed port (still optional; WS is preferred)



## [1.14.1] - 2025-09-10
### Added
- Asymmetric per-session vote caps to keep voting decisive and reduce "vote for everything":
  - Upvotes: max(1, floor(n/3)) where n = movies in the session
  - Downvotes: max(1, floor(n/5))
- Clear ephemeral feedback when a user hits their limit, including a list of movies they have already voted on in the session and guidance to unvote to free a slot.
- Administration panel: new "Vote Caps" configuration with Enable/Disable, Set Ratios/Min (modal), and Reset to Defaults.

- Cross-guild IMDb cache table (imdb_cache) with TTL refresh and hard-limit + LRU eviction; reduces OMDb usage. New env: IMDB_CACHE_ENABLED, IMDB_CACHE_TTL_DAYS, IMDB_CACHE_MAX_ROWS. Excluded from deep purge.

### Notes
- Caps are enforced only for movies associated to an active voting session (session_id present).
- Caps are configurable per guild via Admin → Configure Bot → Vote Caps. Defaults: up 1/3, down 1/5, min 1.
- Memory-only mode defaults to open voting (no caps). Database-backed mode enforces caps.


- WebSocket handlers: dashboard→bot actions now supported directly over WS
  - `ban_movie`, `unban_movie` execute immediately via DB helpers
  - `movie_status_changed` refreshes the corresponding Discord post/thread (embed + buttons) just like the webhook path
- Dashboard prefers WS automatically when connected; webhook is used as a fallback only


### Fixed
- Over-limit warning for vote caps now uses an ephemeral user message; no longer edits the public movie post.

- Recreated/synced/carryover movie posts now include IMDb details immediately (text and forum channels), rather than only after the first button press.

- IMDb calls are now avoided for carryover/sync flows; we use cached imdb_data in DB and only fetch once if missing.




## [1.14.0] - 2025-09-10
### Highlights
- Reschedule flow now uses the exact same modal as Plan Next Session with all fields pre-filled; updates Discord event, admin panel, and voting posts.
- Voting Ends (Date + Time) is optional. If omitted, voting ends 1 hour before the session start. Inputs accept 12-hour or 24-hour formats (e.g., 7:30 PM or 19:30) with validation.
- Ephemeral UX polish: success toasts auto-dismiss (~8s); confirmation prompts auto-expire (~30s); cancel flow success fixed to auto-close.
- Carryover reliability: voting buttons now reference the correct new message IDs so voting works immediately after carryover.
- Admin channel auto-syncs after session creation (including carryover) so Pick Winner / controls appear without pressing Sync.
- Discord Event RSVP tracking: every 5 minutes, Interested users are recorded per session and stored in `movie_sessions.rsvp_user_ids` (JSON column).
- Discord.js v14 compatibility and modal/timing improvements; consistent timezone handling during reschedule.

### Fixes and improvements
- Forum/text parity and robust sync across cancel, reschedule, winner, and purge flows.
- Modal handling: early defers and editReply to prevent timeouts; respect Discord’s 45-character modal title limit.
- Purge Current Queue: forum-safe operations; reuse existing system post; cleaner ephemeral updates.
- Timezone and event updates: removed "UTC" suffix from titles; update scheduledEndTime safely when start changes.
- Creation/reschedule validation, improved placeholders, and clearer field guidance.


## [1.13.0-rc129] - 2025-09-09
### Fixed
- Database: Migration 26 adds UNIQUE(movie_sessions.guild_id, id) and retries composite foreign keys to resolve errno 150 warnings on MariaDB.
- Build: refreshed package-lock.json to align with package.json versioning.

## [1.13.0-rc128] - 2025-09-09
### Changed
- Winner selection flows (Pick Winner, Choose Winner) now require an explicit confirmation step to prevent accidental session closure.
- Winner announcements and Discord Event updates now include which admin selected the winner (mentions the user).

## [1.13.0-rc127] - 2025-09-09
### Added
- Dashboard integration via secured webhook actions. New actions handled at `POST /hooks/dashboard`:
  - `sync_guild` – sync admin panel and voting channel (forum-aware) for a guild
  - `refresh_admin_panel` – re-render Admin Control Panel in the configured admin channel
  - `movie_status_changed` – refresh the corresponding Discord post/thread when dashboard updates a movie’s status

### Notes
- Enable with `MOVIENIGHT_WEBHOOK_ENABLED=true`. Configure `MOVIENIGHT_WEBHOOK_TOKEN` and `MOVIENIGHT_WEBHOOK_PORTS`/`PORT` on the bot host.

## [1.13.0-rc126] - 2025-09-09
### Added
- Deps: add `jimp` for event cover image composition (16:9 poster banners) when updating Discord Scheduled Events after winner selection.

### Changed
- Event description builder now prefers stored `poster_url` and falls back to legacy `imdb_poster` field.


## [1.13.0-rc124] - 2025-09-09
## [1.13.0-rc125] - 2025-09-09
### Changed
- Reschedule: prefill event description with the existing base description only (no auto-added vote/channel/time text), preventing duplicate info when editing.
- Reschedule: best-effort cleanup of the ephemeral date/time panel after successful update.

### Added
- Webhook server (optional): built-in minimal HTTP server gated by env. Start by setting `MOVIENIGHT_WEBHOOK_ENABLED=true`. Pick port from `MOVIENIGHT_WEBHOOK_PORTS` or `PORT`. Endpoints: `GET /health`, `GET /info`, `POST /hooks/dashboard` (Bearer token via `MOVIENIGHT_WEBHOOK_TOKEN`).


### Added
- Database: added movies.poster_url column; migration backfills from stored imdb_data when available. New saves populate poster_url automatically; IMDB updates will also set poster_url.

### Changed
- Reschedule UX: no longer prompts for timezone or movie selection; it retains the session’s existing timezone and jumps straight to details after picking date/time. Movie association remains unchanged.
- Plan Next Voting Session modal: date format switched to MM/DD/YYYY (slashes) to match preference.

### Notes
- Event cover resizing relies on the jimp dependency; the code gracefully falls back to the raw poster if jimp is not installed on the host.


## [1.13.0-rc123] - 2025-09-09
### Fixed
- Reschedule session: export handler and start flow via existing creation UI; implement reschedule completion to update the existing session (name/description/time/timezone) and edit the Discord Scheduled Event instead of creating a new one. Movie post is updated accordingly.
- Removed call to missing `showDateSelection()`; now uses `showSessionCreationModal()` for date selection.
- More robust timezone handling during reschedule.


## [1.13.0-rc122] - 2025-09-09
### Changed
- Event cover image is now a composed 16:9 banner using Jimp: portrait posters are centered on a 1280x720 canvas with side letterboxing so they don’t appear zoom-cropped in Discord’s banner view.

### Notes
- Still memory-only; no tmp files. If composition or fetch fails, we fall back gracefully (description keeps the poster URL).



## [1.13.0-rc118] - 2025-09-09
## [1.13.0-rc119] - 2025-09-09
## [1.13.0-rc121] - 2025-09-09
### Added
- Event cover image: when a winner is chosen (manual or automatic), the bot now downloads the IMDb poster and uploads it to the Discord Scheduled Event as the cover image. Discord hosts the image; no persistent hosting is required.

### Notes
- Safe fallbacks: if image fetch fails or is too large, we skip setting the cover image and keep the description link.


## [1.13.0-rc120] - 2025-09-09
### Fixed
- Forum cleanup after winner/cancel: canceling a session after a winner is chosen now clears the original recommendation thread and any winner announcement threads. `clearForumMoviePosts()` now supports an option to remove winner announcements and is used by Cancel Session and Deep Purge.
- Winner flows (manual + automatic): forum mode now removes ALL movie threads (including the winner’s original) before posting the dedicated winner announcement, then resets the pinned system post to "No Active Voting Session".
- Logger TDZ: initialized logger at the top of `postForumWinnerAnnouncement()` to avoid "Cannot access 'logger' before initialization" in some code paths.

### Changed
- Discord Events: when a winner is chosen (manual or automatic), the event description now includes the IMDb poster URL when available.


### Added
- Web Dashboard messaging in initial setup, guided setup, and admin panels. Manage the bot  at https://movienight.bermanoc.net.


### Fixed
- Forum cleanup no longer deletes movie records; threads are removed and DB thread refs are cleared so movies carry over properly after cancel/winner.
- Admin Control Panel: add channel permission checks; skip and log [Missing Access] instead of erroring; startup only counts panels that were actually created/updated.
- Events: add session start time using Discord timestamp markdown (<t:…:F>/<t:…:R>) to the event description on update.

## [1.13.0-rc117] - 2025-09-09
### Fixed
- Admin panel: refresh Admin Control Panel immediately after winner selection (both paths) so Cancel/Reschedule are present until event start.
- Deep Purge: forum-aware clearing now removes winner announcement threads too (do not preserve winner during deep purge); also delete archived threads in text channels.
- Event details: enriched event update after winner with IMDb rating and synopsis in the description.


## [1.13.0-rc116] - 2025-09-09
### Changed
- README: Added “Next Up (1.13.x Short-Term)” TODOs covering Cancel/Reschedule persistence, ephemeral success auto-expire, guild_id logging sweep, deep purge parity, event polish, admin panel dedupe, and configuration permission docs.


## [1.13.0-rc115] - 2025-09-09
### Fixed
- Event update after winner: pass the session scheduled date to avoid "@ Invalid Date" in event titles; add safe fallback to use existing event start time if none provided.
- Admin panel timing: refresh the Admin Control Panel immediately after session creation so Cancel/Reschedule buttons are available before the first recommendation.
- Timezone: prefer `default_timezone` from guild config (fallback to `timezone`, then UTC) when creating sessions to avoid scheduling drift.


## [1.13.0-rc114] - 2025-09-09
### Fixed
- Forum winner announcement: corrected allowedMentions to avoid Discord API error (roles list only), restoring winner thread posting and role pings.
- IMDb title usage: recommendation posts now use the canonical IMDb Title when a match is selected (instead of the user-typed text).
- Discord Events: event titles now include the start time (e.g., "@ 7:30 PM"); event updates enrich descriptions with IMDb details (Year, Runtime, Genre, Rating, Plot when available).
- Admin panel UX: throttle duplicate ephemeral "Administration" panels per user (15s) to prevent multiple panels opening back-to-back.
- Deep Purge (forum-aware): after clearing threads, re-create the correct system post in forum mode (No Active Voting Session) instead of text quick action.

### Notes
- Follow-ups queued: ensure Cancel/Reschedule buttons remain available until event starts across all winner flows; optional ephemeral auto-expire/edit for success toasts; expand guild_id coverage in logs.

## [1.13.0-rc96] - 2025-09-08
### Fixed
- Fully removed the top-level try/catch wrapper around runMigrations() to prevent parser issues on certain Node.js builds. All migration statements remain individually guarded; functionality unchanged.

## [1.13.0-rc97] - 2025-09-08
### Fixed
- Moved generateMovieUID implementation into constructor to avoid any parser confusion with class method shorthand on certain Node builds.

## [1.13.0-rc98] - 2025-09-08
### Fixed
- Fixed a missing closing brace in Migration 19 (fk_votes_movie catch block) that caused parser to exit class context on some Node builds.

## [1.13.0-rc99] - 2025-09-08
### Added
- Migration 21: Automated cleanup of orphaned rows (participants/attendees/movies-session links and session winner/associated references) followed by re-attempting composite FK creation. Fully idempotent and safe; does not remove valid data.

## [1.13.0-rc100] - 2025-09-08
### Fixed
- Migration 22: Normalize column definitions (types/collations) for guild_id/message_id/session_id to satisfy MySQL FK requirements and retry FK creation. Includes diagnostics logging of actual column definitions at runtime.

## [1.13.0-rc101] - 2025-09-08
### Added
- Improve Migration 22 diagnostics: pretty-print column definitions; add MySQL version and SHOW CREATE TABLE outputs for movies and movie_sessions to pinpoint FK mismatch cause on hosts.

## [1.13.0-rc102] - 2025-09-08
### Added
- Migration 23: Add simple single-column FKs and guild-enforcing triggers as a robust fallback on MariaDB hosts. Triggers prevent cross-guild references on insert/update while keeping data intact. Idempotent creation guarded via information_schema.

## [1.13.0-rc103] - 2025-09-08
### Fixed
- Migration 23 triggers: remove DECLARE usage and use subqueries in IF conditions to satisfy MariaDB trigger syntax rules (DECLARE must be first). This resolves syntax errors and ensures guild-scope enforcement works.

## [1.13.0-rc104] - 2025-09-08
### Fixed
- Migration 24: Ensure movie_sessions.id is AUTO_INCREMENT and has a PRIMARY KEY on hosts where this was missing, preventing "Field 'id' doesn't have a default value" when creating sessions.


## [1.13.0-rc105] - 2025-09-08
### Fixed
- Forum tie-break: detect forum channels and skip channel.send during tie announcement to avoid `votingChannel.send is not a function` crash; admins still receive tie-break options in admin channel
- Ephemeral IMDb selection: replace deferUpdate with update+auto-dismiss so the selection popup clears after choosing a movie
- Forum post duplication: remove redundant follow-up details post; initial forum starter embed now contains full info + buttons
- Event notification noise (forum mode): skip "New Movie Night Event!" message when voting channel is a forum
- System post cleanup: remove lingering "No Active Voting Session" thread once a new session begins


## [1.13.0-rc106] - 2025-09-08
### Fixed
- Tie-break admin UI: add missing admin-mirror.postTieBreakingMovie to render tied movies with a "Choose Winner" button (admin_choose_winner:<message_id>)




## [1.13.0-rc107] - 2025-09-08
### Fixed
- IMDb selection buttons: truncate long labels to <= 80 chars to satisfy Discord builder validation
- Tie-break cleanup: after choosing a winner, remove tie-break candidate messages in admin channel (keep control panel)
- Sync-after-winner: avoid double-reply error by syncing admin mirror directly instead of using interaction-bound sync handler





## [1.13.0-rc108] - 2025-09-09
### Added
- IMDb selection: added explicit Cancel button to abort a recommendation after seeing results
- Forum: tie announcement now appears on the pinned "Recommend a Movie" post and gets cleared after winner selection

### Changed
- Movie embeds now show vote percentage alongside up/down and score
- Admin panel: Cancel/Reschedule buttons remain available after winner selection until the event starts
- Admin mirror: suppress "Mark Watched" button until the scheduled event start time

### Fixed
- Choosing winner via tie-break now clears forum posts, posts a winner announcement, and resets the pinned post to "No Active Session"


## [1.13.0-rc109] - 2025-09-09
### Fixed
- Resolve syntax error in forum-channels helper (extra closing braces) causing Sync Channels to fail with "Unexpected token '}'" on voting channel sync


## [1.13.0-rc110] - 2025-09-09
### Fixed
- Forum sync: Add missing closing brace in services/forum-channels.js (createNoActiveSessionPost) that caused "Unexpected end of input (/home/container/services/forum-channels.js:980)" when clicking Sync Channels in the admin panel.






## [1.13.0-rc111] - 2025-09-09

## [1.13.0-rc112] - 2025-09-09

## [1.13.0-rc113] - 2025-09-09
### Improved
- Winner flow (forum): clear ALL voting posts including the winner’s original recommendation thread, then post a dedicated winner announcement thread and the No Active Voting Session pin.
- Winner announcement (forum + text): include IMDb details (Year, Runtime, Genre, Rating where available) and mention the configured notification role if set.
- Discord Event update: include IMDb details and a link back to the configured voting channel in the event description.
- Admin tie-break posts: remove Message ID and UID from footer to reduce clutter.

### Fixed
- Recommendation modal: prevent Discord modal timeout (“Something went wrong. Try again”) by deferring the reply before IMDb network calls and using followUp when deferred. Also adjusted success/error paths in createMovieWithoutImdb to respect deferred interactions.

### Fixed
- IMDb selection: limit the per-row button count to Discord’s 5-component maximum by showing up to 3 results plus “None of these” and “Cancel”. Fixes Invalid Form Body error (data.components[0].components must be 1–5) when submitting recommendations.

## [1.13.0-rc95] - 2025-09-08
### Fixed
- Resolve startup crash on some Node runtimes by flattening Migration 19/20 structure (removed outer try/catch wrappers). All statements still guarded individually with warnings; functional behavior unchanged.


## [1.13.0-rc94] - 2025-09-08
### Added
- Event descriptions now end with a clear CTA linking to the configured voting channel: "Join the conversation and vote for your favorite movie!"
- Start-of-voting ping: when a voting session is created, the configured notification role is pinged in the voting channel
- Standalone migration script: `npm run migrate` to apply DB migrations without starting the bot

### Changed
- Removed `SESSION_UID` from Discord event descriptions (we store `discord_event_id` in DB and sync via that)

### Fixed
- Addressed a syntax issue in the migration block that could cause startup failure on some Node runtimes

## [1.13.0-rc93] - 2025-09-08
### Fixed
- 🧱 Migration 20: Align session_participants/session_attendees charsets to utf8mb4 (required for composite foreign keys on varchar columns)
- 🔁 Re-apply supporting indexes and add composite FKs that were missed previously:
  - session_participants(guild_id, session_id) → movie_sessions(guild_id, id) ON DELETE CASCADE
  - session_attendees(guild_id, session_id) → movie_sessions(guild_id, id) ON DELETE CASCADE
  - movies(guild_id, session_id) → movie_sessions(guild_id, id) ON DELETE SET NULL
  - movie_sessions(guild_id, winner_message_id/associated_movie_id) → movies(guild_id, message_id) ON DELETE SET NULL

### Notes
- Live DB verification shows zero cross-guild mismatches; this migration ensures MySQL can successfully create the intended composite FKs.

## [1.13.0-rc92] - 2025-09-08
### Fixed
- 🧰 Migration 19 data backfill: auto-correct legacy cross-guild mismatches so composite FKs can be created cleanly
  - Align session_participants/session_attendees.guild_id to their movie_session.guild_id
  - Null movies.session_id when it points to a session in another guild
  - Null session.winner_message_id/associated_movie_id when message refers to a movie from a different guild
- 🗂️ Added helpful indexes on movie_sessions for (guild_id, winner_message_id) and (guild_id, associated_movie_id)

### Notes
- This addresses “Foreign key constraint is incorrectly formed” warnings seen during rc91 deployment.

## [1.13.0-rc91] - 2025-09-08
### Changed
- 🛡️ Database hardening: Enforce guild-scoped uniqueness and composite foreign keys across core tables (movies, votes, movie_sessions, session_participants, session_attendees)
- 🗳️ Votes: UNIQUE(message_id, user_id) → UNIQUE(guild_id, message_id, user_id); composite FK votes(guild_id, message_id) → movies(guild_id, message_id)
- 🎬 Sessions: Composite FKs for participants/attendees → movie_sessions(guild_id, id); movies(guild_id, session_id) → movie_sessions(guild_id, id); session winner/associated → movies(guild_id, message_id)
- 🔧 API: incrementWatchCount/getWatchCount now accept optional guildId; button handler passes guildId; removeVote accepts optional guildId
- 🔁 Migrations: Added Migration 19 with idempotent guards; legacy single-column FKs dropped when present

### Notes
- All operations are now strictly guild-scoped to prevent any cross-guild data contamination.

## [1.13.0-rc90] - 2025-09-08
### Fixed
- **🧷 Single-creation logic**: When no pinned system post is found, create the "No Active Voting Session" thread once, then try to pin and remove duplicates, avoiding multiple creations during the same operation
- **🧹 System post dedupe**: After creating the system post, scan and delete other system posts (Recommend/No Session) in one pass
- **📌 Safer pin retry**: If pin limit is hit, unpin others (keeping the new thread) and retry; otherwise proceed without pin

## [1.13.0-rc89] - 2025-09-08
### Changed
- **🧹 Forum Session End Cleanup**: Always remove forum system posts (Recommend/No Session) when a winner is chosen, then re-create the proper "No Active Voting Session" post
- **🏆 Winner Announcement**: Forum winner announcement now supports optional event info (event ID, start time)
- **🧭 Manual Winner Flow**: Posts "No Active Voting Session" in forum channels (previously only text channels)
- **🤖 Auto Closure Flow**: Same forum behavior applied to automatic winner selection

## [1.13.0-rc88] - 2025-09-08
### Fixed
- **🔧 Aggressive Discord API Bug Workaround**: Added aggressive unpinning approach to handle Discord's pinned status reporting bug
- **📌 Universal Unpin Strategy**: Modified unpinOtherForumPosts to attempt unpinning ALL threads when pin limits are reported
- **🛡️ Fallback Creation**: Added fallback logic to create posts without pinning when Discord API is inconsistent
- **🔄 Multi-Level Retry**: Enhanced error handling with multiple fallback strategies for post creation
- **📋 API Inconsistency Handling**: Addresses cases where Discord reports pin limits but all threads show pinned: false

## [1.13.0-rc87] - 2025-09-08
### Fixed
- **⏱️ Session Creation Timing**: Added delay and retry logic during voting session creation to handle Discord API consistency issues
- **🔄 Retry Mechanism**: Added 3-attempt retry with progressive delays for forum channel setup during session creation
- **🔍 Hidden Pin Detection**: Added logic to detect and handle cases where Discord reports pin limits but pinned status isn't visible
- **🛡️ Graceful Degradation**: Session creation now continues even if forum setup fails, with completion on next sync operation
- **📋 Improved Reliability**: Reduced likelihood of duplicate recommendation posts during rapid session creation operations

## [1.13.0-rc86] - 2025-09-08
### Fixed
- **🔧 Discord.js Thread Pinned Status Bug**: Fixed issue where thread.pinned was returning undefined instead of boolean values
- **🔄 Force Thread Refresh**: Added force refresh when fetching threads to get accurate pinned status from Discord API
- **🧹 Duplicate System Post Cleanup**: Added logic to detect and clean up multiple recommendation/no session posts
- **📌 Improved Unpinning Logic**: Enhanced unpinOtherForumPosts to use force-fetched thread data for accurate pinned detection
- **🗑️ Automatic Cleanup**: Function now automatically removes duplicate system posts before creating new ones

## [1.13.0-rc85] - 2025-09-08
### Fixed
- **🔍 Enhanced Debugging**: Added detailed logging for pinned post detection and thread enumeration in forum channels
- **📌 Improved Unpinning Logic**: Enhanced unpinOtherForumPosts function with better error handling and logging
- **🛡️ Error Recovery**: Added try-catch blocks around retry operations to prevent cascading failures
- **📋 Thread Analysis**: Added comprehensive logging to diagnose why pinned posts aren't being detected properly

## [1.13.0-rc84] - 2025-09-08
### Fixed
- **📋 Forum Channel Pin Management**: Fixed issue where starting new voting sessions in forum channels failed due to Discord pin limits
- **🔧 Recommendation Post Replacement**: Properly replace "No Active Voting Session" posts with "Recommend a Movie" posts instead of creating duplicates
- **📌 Automatic Pin Cleanup**: Added automatic unpinning of old posts when pin limits are reached
- **🐛 Error Logging**: Fixed `[object Object]` error logging by properly serializing error details with JSON.stringify()
- **🔄 Fallback Logic**: Added robust fallback logic that unpins and recreates posts when editing fails

## [1.13.0-rc83] - 2025-09-08
### Fixed
- **🔧 Forum Channel Sync**: Fixed "Missing catch or finally after try" error in sync channels operation for forum channels
- **📋 Syntax Error**: Corrected malformed try-catch block in ensureRecommendationPost function that was causing sync failures

## [1.13.0-rc82] - 2025-09-07
### 🎯 Major Release: Forum Channels, Safety Features & Professional Logging

### Added
- **📋 Forum Channel Support**: Full support for Discord forum channels as voting channels
- **🔒 Deep Purge Safety**: Submit button prevents accidental data deletion operations
- **📊 Professional Logging**: Configurable log levels (ERROR/WARN/INFO/DEBUG) with colored output
- **🎬 Interactive Guided Setup**: New `/movie-setup` command with ephemeral-based configuration flow
- **🌍 Global Command Registration**: Commands now register globally for all servers automatically
- **⚡ Instant Guild Setup**: Commands register immediately when bot joins new servers
- **🧹 Automatic Ephemeral Cleanup**: Smart ephemeral message management prevents accumulation
- **🔧 Configuration Validation**: Commands check configuration before execution with helpful guidance
- **📋 Permission Guidance**: Setup process includes detailed permission requirements for each channel/role
- **🎯 Bot Discovery Ready**: Streamlined setup perfect for bot discovery website reviews
- **👥 Moderation System**: Role-based permission system with moderator and administrator levels
- **🎬 Enhanced Movie Posts**: Comprehensive movie information with detailed discussion threads
- **📝 Thread Discussions**: First message in threads contains synopsis, cast, awards, and viewing info

### Enhanced
- **📋 Forum Integration**: Movies post as forum threads with voting buttons and discussion
- **🔒 Safety Improvements**: Two-step confirmation for dangerous operations with explicit submit buttons
- **📊 Environment Logging**: LOG_LEVEL, DEBUG_LOGGING, LOG_COLORS environment variables
- **⚙️ Setup Experience**: Visual progress indicators, navigation buttons, and clear instructions
- **🔄 Role Naming**: Dynamic bot role name display instead of hardcoded "Movie Night Bot"
- **📝 Command Structure**: Consolidated setup commands into single intuitive interface
- **🎪 Voice Monitoring**: Only logs activity in configured session viewing channels
- **🔧 Configuration Labels**: "set-voting-channel" instead of generic "set-channel"

### Fixed
- **🎬 IMDb Data Display**: Movie information now shows immediately on creation (not after first vote)
- **📋 Forum Channel Selection**: Forum channels now appear in guided setup channel selector
- **🔧 Discord.js Compatibility**: Fixed deprecated fetchPinned() → fetchPins() and isForumChannel() issues
- **🔄 Admin Panel Duplication**: Robust message detection prevents multiple admin control panels
- **🧹 Ephemeral Message Persistence**: All ephemeral messages now auto-cleanup properly
- **⚡ Command Registration**: No more GUILD_ID requirement for production deployments
- **🎯 Setup Button Conflicts**: Removed old setup guide handlers causing button failures
- **📋 Voice Channel Logging**: Eliminated irrelevant voice state change logs
- **🔧 Function Import Errors**: Fixed multiple "function is not a function" errors in button handlers
- **💥 Deep Purge Selection**: Fixed issue where selections were lost when clicking away from dropdown
- **📌 Pinned Message Errors**: Fixed "pinnedMessages.find is not a function" error in admin controls
- **🧹 Ephemeral Message Cleanup**: Improved ephemeral message management to prevent accumulation
- **🔧 Discord.js Collection Methods**: Fixed "pinnedMessages.values is not a function" by using Collection.find() directly
- **💥 Deep Purge setDefaultValues**: Fixed "setDefaultValues is not a function" by using placeholder text instead
- **🧵 Thread Recreation**: Fixed missing threads after sync by properly recreating movie records and threads
- **🗃️ Database Foreign Keys**: Fixed foreign key constraint errors during movie record updates
- **🔧 Guided Setup Ephemeral**: Fixed ephemeral message accumulation during /movie-setup by using interaction.update()
- **📊 Migration Warnings**: Fixed charset migration warnings and improved logging system usage
- **📋 Logging System**: Converted console.warn/error calls to use proper logging system with levels
- **💥 Deep Purge Selection Persistence**: Fixed selections disappearing by encoding categories in button custom IDs
- **🛡️ Moderator Roles Configuration**: Added moderator roles display to /movie-configure view-settings
- **🔧 Admin Control Panel Restructure**: Reorganized panel with Sync Channels, Purge Current Queue, Cancel/Reschedule Session, and Administration button
- **📋 Removed Populate Forums**: Integrated forum population into intelligent Sync Channels button
- **🔧 Fixed Setup Ephemeral Persistence**: Setup completion now properly updates existing message instead of creating new ones
- **🎯 Setup Channel Initialization**: Setup completion automatically initializes admin panel and voting channel messages
- **📊 Improved LOG_LEVEL Enforcement**: ERROR level now properly suppresses INFO/DEBUG messages, removed confusing DEBUG_LOGGING option
- **🧹 Ephemeral Manager Logging**: Converted ephemeral tracking messages to use debug level logging
- **🔧 Fixed Setup Completion Error**: Added missing EmbedBuilder import in completeSetupAndInitialize function
- **💬 Fixed Administration Panel Ephemeral**: Admin panel now updates existing ephemeral message instead of creating new ones
- **🛡️ Added Moderator Roles Setup**: Added moderator roles configuration to guided setup process with proper UI and handlers
- **🔧 Fixed Missing Configuration Handlers**: Added handlers for config_voting_channel, config_admin_channel, and config_viewing_channel buttons
- **📊 Comprehensive Logging System Enforcement**: Converted all console.log/warn/error statements to use proper logger with levels
- **🎯 Consistent Log Level Enforcement**: All application messages now respect LOG_LEVEL configuration (ERROR, WARN, INFO, DEBUG)
- **🧹 Cleaned Up Raw Console Output**: Eliminated inconsistent logging where some messages had levels and others didn't
- **🔧 Fixed Remaining Console Bypass**: Converted database connection, migration, session scheduler, and admin panel messages to use proper logger
- **📊 Migration Messages to DEBUG Level**: All database migration status messages now use logger.debug() to reduce startup noise
- **⏰ Session Scheduler Logging**: Converted session scheduler initialization and scheduling messages to use proper log levels
- **🔧 Fixed Session Scheduler Logger Error**: Added missing logger imports causing "logger is not defined" errors
- **🗃️ Added Moderator Roles Database Migration**: Added Migration 18 to create moderator_roles JSON column in guild_config table
- **🛡️ Fixed Moderator Roles Database Operations**: Fixed null handling in addModeratorRole and removeModeratorRole functions
- **📊 Fixed Remaining Console.error Statements**: Converted database role management errors to use proper logger.error()
- **💬 Fixed Setup Ephemeral Message Accumulation**: Fixed setup error handlers to use interaction.update() instead of creating new ephemeral messages
- **🔧 Fixed Pinned Messages Collection Error**: Added proper Collection type checking for pinnedMessages.find() to prevent "is not a function" errors
- **📊 Comprehensive Console.log Cleanup**: Converted 20+ remaining console.log statements to proper logger with appropriate levels
- **🎬 Session Creation Logging**: Session times, Discord event creation, and database operations now use debug/info levels appropriately
- **🍿 Movie Recommendation Logging**: Movie recommendation debug messages and database operations now use proper log levels
- **💬 Fixed Voting Session Ephemeral Messages**: Voting session creation now updates existing ephemeral message instead of creating new ones
- **🎭 Fixed Movie Recommendation Ephemeral Messages**: Movie recommendation success now uses interaction.reply() instead of ephemeralManager
- **🏆 Fixed Winner Selection No Session Message**: After selecting a winner, "No Active Voting Session" message now properly appears in voting channel
- **📅 Fixed Reschedule Button Implementation**: Reschedule button now uses implemented functionality instead of showing "coming soon" message
- **🖼️ Added Movie Poster to Discord Events**: Discord events now include movie poster URLs in description when available
- **📋 Added Multiple Voting Sessions to TODO**: Added comprehensive TODO items for supporting concurrent voting sessions
- **💬 CRITICAL Ephemeral Message Fixes**: Converted ephemeralManager.sendEphemeral() calls to interaction.reply() and interaction.update() to prevent message accumulation
- **🧹 Fixed Setup Skip Message**: Setup skip now uses interaction.update() instead of creating new ephemeral message
- **⚙️ Fixed Configuration Messages**: Configuration error and menu messages now use interaction.reply() instead of ephemeralManager
- **🗑️ CRITICAL: Fixed Deep Purge No Session Message**: Deep purge now properly adds "No Active Voting Session" message after clearing data
- **📊 Deep Purge Logging Cleanup**: All deep purge console.log statements converted to proper logger with appropriate levels
- **🎬 Movie Creation Logging Cleanup**: All movie creation debug messages converted to logger.debug() for proper log level control
- **🔧 Fixed Configuration Button Error**: Fixed "Cannot read properties of undefined (reading 'getChannel')" error in configuration
- **📝 Fixed MessageFlags Import**: Added missing MessageFlags import to config-check.js to prevent "MessageFlags is not defined" errors
- **🧵 Thread Creation Logging**: Thread creation and detailed info messages now use proper log levels
- **🚀 CRITICAL: Fixed Bot Startup Crash**: Fixed Discord API "Missing Access" error that prevented bot from starting
- **🛡️ Resilient Command Registration**: Bot now continues startup even if development guild command registration fails
- **⚠️ Graceful Permission Handling**: Missing permissions for guild command registration are now handled as warnings, not fatal errors
- **🔍 Enhanced Guild Validation**: Added check to verify bot is in development guild before attempting command registration
- **📋 Root Cause Analysis**: Issue was caused by GUILD_ID pointing to guild where bot lost permissions (from rc45 GUILD_ID changes)
- **🔧 CRITICAL: Fixed Configuration System Crashes**: Fixed "Cannot read properties of undefined (reading 'getChannel')" errors in all configuration functions
- **💬 Fixed Configuration Ephemeral Messages**: Configuration actions now use interaction.update() instead of interaction.reply() to prevent message accumulation
- **🔧 Fixed Missing Admin Roles Handler**: Added missing admin_roles and notification_role cases to configuration action handler
- **🔍 Fixed Remaining Pinned Messages Error**: Applied Collection type checking fix to cleanup.js to prevent "pinnedMessages.find is not a function" errors
- **🎯 CRITICAL: Fixed Configuration Button Flow**: Configuration buttons now show proper channel/role selectors instead of requiring parameters
- **📋 Interactive Configuration System**: Added ChannelSelectMenuBuilder and RoleSelectMenuBuilder for voting channel, admin channel, viewing channel, and notification role selection
- **🔧 Fixed GUILD_ID Warning**: Moved development guild command registration after Discord login to ensure guild cache is populated
- **⚡ Enhanced Configuration UX**: Configuration buttons now provide interactive selection menus with proper validation and feedback
- **🔧 CRITICAL: Fixed Mock Interaction Object**: Fixed "interaction.update is not a function" error in configuration select handlers
- **🛠️ Proper Prototype Inheritance**: Changed from spread operator to Object.create() for mock interactions to preserve method inheritance
- **🔧 Fixed Session Creation Logger Error**: Fixed "logger is not defined" error after voting session creation in voting-sessions.js
- **🧵 Fixed Thread Creation for Deleted Messages**: Added message existence check before creating threads to prevent "Unknown Message" errors
- **📊 Enhanced Sync Error Handling**: Improved error handling in thread recreation with proper logger usage and message validation
- **📊 COMPREHENSIVE: Fixed All Missing Logging Levels**: Converted 15+ remaining console.log statements to proper logger with appropriate levels
- **⏰ Session Scheduler Logging**: All session recovery, scheduling, and closure messages now use logger.info/debug
- **🗑️ Discord Event Deletion Logging**: Event deletion messages now use logger.info with proper formatting
- **✅ Database Operation Logging**: "Marked non-winning movies for next session" now uses logger.info
- **❌ Session Cancellation Logging**: Session cancellation messages now use logger.info with user attribution
- **🔧 Fixed Channel Validation Errors**: Added proper validation for undefined channels in cleanup operations to prevent "Cannot read properties of undefined (reading 'fetch')" errors
- **🔙 Added Back to Moderation Button**: Administration panel now includes "Back to Moderation" button to return to main admin control panel
- **🛡️ Enhanced Error Handling**: All cleanup and sync operations now validate channel objects before attempting operations
- **🔒 CRITICAL: Made Administration Panel Ephemeral**: Administration panel now shows as ephemeral message instead of editing shared moderation panel
- **👥 Fixed Security Issue**: Non-admin moderators can no longer see or access administrator-only buttons in shared channel
- **🔙 Enhanced Back Button**: Back to Moderation button now auto-dismisses ephemeral message after 3 seconds for clean UX
- **📋 Enhanced Forum Recommendation Post Debugging**: Added comprehensive logging and error details for forum recommendation post creation issues
- **🔍 Detailed Forum Post Error Tracking**: Added session validation, channel type checking, and stack trace logging for forum post troubleshooting
- **🔧 CRITICAL: Fixed Admin Panel Disappearing**: Removed automatic admin panel refresh after session creation that was replacing existing panels
- **📊 Additional Logging Cleanup**: Fixed more console.log statements including forum sync, event notifications, session creation, and Discord event sync
- **🛡️ Admin Panel Persistence**: Admin panel now stays visible during session creation and other operations
- **🔧 CRITICAL: Fixed "Skip to Next Session" for Forum Channels**: Movies skipped to next session now properly archive forum threads instead of failing to delete
- **📦 Forum Thread Archiving**: Skip to Next Session now archives forum threads instead of attempting deletion, preserving discussion history
- **🔍 Fixed "Cannot read properties of undefined (reading 'fetch')" Error**: Enhanced error handling in removeMoviePost function
- **📊 Additional Logging Cleanup**: Fixed forum post title updates, voting actions, button creation debug messages, and error logging
- **🛡️ Enhanced Forum Channel Support**: Proper handling of forum vs text channels when skipping movies to next session
- **🔧 CRITICAL: Fixed Session Cancellation for Forum Channels**: Session cancellation now properly archives forum posts and removes recommendation post
- **📦 Forum Session Cancellation**: Cancelled sessions now archive all movie forum posts and remove "Recommend a Movie" post
- **⏭️ Auto-Queue Cancelled Movies**: Movies from cancelled sessions are automatically moved to next session queue (like skip to next)
- **📊 CRITICAL: Fixed Guild Stats Accuracy**: Stats now show accurate counts based on active sessions and queue status
- **🔢 Enhanced Stats Display**: Added "Current Voting" (active session only) and "Queued for Next" (skip to next queue) fields
- **🎯 Accurate Vote Counts**: "Current Voting" shows 0 when no active session, "Queued for Next" shows movies waiting for next session
- **📋 Additional Logging Cleanup**: Fixed "Error clearing voting channel" and Discord event deletion logging
- **🔧 CRITICAL: Fixed Forum "No Active Session" Message**: Forum channels now show proper "No Active Session" post when no voting session is active
- **📋 Forum No Session Post**: Creates pinned forum post explaining no active session and how to start one when syncing channels
- **🔧 CRITICAL: Fixed Admin Panel Disappearing Issue**: Admin panel no longer gets deleted when update fails, preventing disappearance
- **⚡ Added /admin-panel Slash Command**: New command to restore admin control panel if it disappears (requires Manage Channels permission)
- **🛡️ Enhanced Admin Panel Persistence**: Improved error handling prevents admin panel deletion during temporary update failures
- **📊 Additional Critical Logging Cleanup**: Fixed carryover movie logging, next_session flag clearing, and logger initialization errors
- **🔍 Fixed "Cannot access 'logger' before initialization"**: Resolved logger declaration conflicts in session creation
- **🔧 CRITICAL: Fixed Forum Pin Limit Error**: Enhanced pin handling when forum channels reach maximum pinned threads (Discord limit: 1)
- **📌 Smart Pin Management**: Automatically unpins old posts to make room for winner announcements and important posts
- **🔧 CRITICAL: Fixed "votingChannel.send is not a function"**: Added proper forum vs text channel detection in winner announcements
- **🏆 Enhanced Winner Announcement Logic**: Forum channels use forum-specific announcement posts, text channels use regular messages
- **📊 Additional Forum Logging Cleanup**: Fixed forum post archiving, title updates, tag updates, and content updates to use proper logger
- **🧹 Comprehensive Forum Error Handling**: All forum operations now have proper error handling with appropriate log levels
- **🔧 CRITICAL: Fixed Forum Posts Not Being Archived**: Sync Channels now properly cleans up old movie posts when no active session
- **📋 Enhanced Forum Cleanup During Sync**: When no active session exists, all old movie forum posts are archived before showing "No Active Session"
- **🔍 Enhanced Forum Post Detection**: Improved getForumMoviePosts to fetch more archived threads and provide detailed logging
- **📊 Better Forum Cleanup Logging**: Added detailed logging to show which posts are found and processed during cleanup operations
- **🧹 Comprehensive Forum Sync Behavior**: Sync Channels now properly handles forum state transitions between active and inactive sessions
- **🔧 CRITICAL: Added Guild ID to All Log Lines**: Enhanced logger to include guild ID for multi-guild support and better debugging
- **📊 Multi-Guild Logging Support**: All log messages now include guild ID in format [GUILD_ID] for easy filtering and debugging
- **🔍 Fixed "logger is not defined" Error**: Resolved logger declaration conflicts in session creation by moving logger to function scope
- **📋 Enhanced Session Creation Logging**: Fixed all remaining console.log statements in voting session creation to use proper logger
- **🎬 Carryover Movie Logging Cleanup**: All carryover movie operations now use proper logger with appropriate levels
- **🛡️ Improved Logger Architecture**: Enhanced logger to support guild context while maintaining backward compatibility
- **🔧 CRITICAL: Fixed Forum Post Filtering Logic**: Fixed clearForumMoviePosts to properly skip system posts like "No Active Voting Session"
- **📋 Enhanced Forum Post Detection**: Improved getForumMoviePosts to exclude system posts from movie post filtering
- **🧹 Proper System Post Handling**: System posts (🚫 No Active Session, 🍿 Recommend) are now properly excluded from cleanup operations
- **🎯 Fixed Forum Sync Behavior**: Sync Channels now properly archives only actual movie posts, not system posts
- **📊 Enhanced Guild-Aware Logging**: All forum operations now use guild ID in logging for better multi-guild debugging
- **✅ Text Channel Compatibility Verified**: All forum-specific code properly gated with isForumChannel() checks - text channels unaffected
- **🔧 CRITICAL: Database-Driven Safe Deletion System**: Completely rewrote forum cleanup to use database-tracked message/thread IDs only
- **🛡️ Enhanced Safety for Mixed-Use Channels**: Only deletes threads/messages that are tracked in bot database - ignores all other content
- **🗑️ Proper Deletion vs Archiving**: Forum posts are now properly deleted (not archived) when sessions end or sync occurs
- **📊 Database-First Approach**: Uses getMoviesByGuild() to identify what to delete, ensuring only bot-created content is affected
- **🔍 Thread ID Tracking**: Leverages existing thread_id column in database for precise forum thread identification and deletion
- **⚡ Immediate Cleanup Results**: Forum posts are deleted immediately during sync operations, providing instant visual feedback
- **🧹 Professional Forum State Management**: Clean transitions between active/inactive sessions with proper content lifecycle management
- **🔧 CRITICAL: Fixed Session Creation Syntax Error**: Resolved malformed try-catch block causing "Unexpected token 'catch'" error
- **🛡️ Channel Safety Confirmation System**: Added safety checks for existing channels during configuration to prevent conflicts
- **⚠️ Existing Channel Warning**: Configuration now detects existing content and shows confirmation dialog with safety recommendations
- **🏗️ Dedicated Category Creation Guide**: Added comprehensive guide for creating dedicated Movie Night category with proper permissions
- **📋 Enhanced Channel Safety**: Checks for existing messages/threads before allowing channel configuration
- **🎯 Smart Configuration Flow**: Guides users toward dedicated channels while supporting mixed-use scenarios safely
- **📊 Comprehensive Permission Documentation**: Detailed permission requirements for each channel type in setup process
- **🔧 CRITICAL: Fixed Forum Pin Management**: Added unpinOtherForumPosts() to properly manage Discord's 1-pin limit in forum channels
- **📌 Smart Pin Transitions**: Automatically unpins old posts before pinning new ones to prevent "Maximum number pinned threads" errors
- **🔄 CRITICAL: Fixed Carryover Movies Missing**: Fixed order of operations in session cancellation to preserve movies for next session
- **⚡ Database Operation Order Fix**: markMoviesForNextSession() now called BEFORE clearForumMoviePosts() to prevent data loss
- **🎬 Enhanced Session Cancellation**: Movies from cancelled sessions now properly carry over to next session as intended
- **📋 Improved Forum State Management**: Better handling of pin transitions between "No Active Session" and "Recommend a Movie" posts
- **🛡️ Robust Pin Error Handling**: Graceful handling of Discord API pin limit errors with automatic recovery
- **🔧 HOTFIX: Fixed Duplicate Logger Declaration**: Removed duplicate logger declaration causing "Identifier 'logger' has already been declared" syntax error
- **🔧 CRITICAL: Fixed Forum Pin Management Logic**: Fixed unpinOtherForumPosts() to properly unpin threads using thread.unpin() instead of setArchived(true)
- **📌 Proper Thread Unpinning**: Unarchive threads first if needed, then call unpin() to properly remove pin status
- **📋 Comprehensive Permission Documentation**: Enhanced permission documentation with separate bot and user permissions for each channel type
- **🎯 Accurate Forum Channel Permissions**: Clarified that users should NOT have "Send Messages" in main forum channel, only in threads
- **🏗️ Enhanced Category Creation Guide**: Detailed permission setup for forum channels, admin channels, and voice channels with proper restrictions
- **🛡️ Professional Permission Guidance**: Clear separation of bot permissions vs user permissions for optimal security and functionality
- **🔧 CRITICAL: Fixed System Posts Not Being Deleted**: Added system post deletion (No Active Session, Recommend a Movie) during forum cleanup when no active session
- **🗑️ Complete Forum Cleanup**: System posts are now properly deleted during sync operations when no active session exists
- **⚡ Fixed /admin-panel Command Registration**: Added admin-panel command to command index so it's properly registered and available
- **🔧 Enhanced Admin Panel Restoration**: Improved admin panel restoration timing with delay to ensure proper restoration after notifications
- **📋 Comprehensive Forum State Management**: Both movie posts and system posts are now properly cleaned up during sync operations
- **🔧 FINAL SOLUTION: Simple Pin Post Editing**: Completely rewrote forum post management to edit existing pinned posts instead of create/delete
- **📌 No More Pin Errors**: Single pinned post that gets edited between "No Active Session" and "Recommend a Movie" states
- **⚡ Robust Admin Panel Restoration**: Enhanced admin panel restoration with 2-second delay and setTimeout for reliable restoration
- **🎯 Simple and Reliable**: Eliminated complex pin management, thread creation/deletion - just edit the one pinned post
- **🛡️ Bulletproof Forum Management**: One pinned post, edit content and title based on session state - no more pin limit errors
- **🔧 CRITICAL SYNTAX FIX**: Fixed missing closing bracket in voting-sessions.js causing "Missing catch or finally after try" error
- **⚡ Session Creation Fix**: Added missing closing bracket for try block in channel update logic
- **🛡️ Syntax Error Resolution**: Fixed malformed try-catch block preventing session creation from completing properly
- **🔧 FINAL SYNTAX FIX**: Removed extra closing bracket that was added in previous fix causing continued syntax errors
- **⚡ Bracket Balance Fix**: Properly balanced brackets in try-catch block - removed duplicate closing bracket on line 465
- **🛡️ Clean Syntax**: Final resolution of "Missing catch or finally after try" error with proper bracket structure

### Technical
- **� Forum Channel Architecture**: Complete forum post creation, voting, and discussion system
- **🔒 Safety Architecture**: Two-step confirmation system with global state management
- **📊 Logging Infrastructure**: Professional logging utility with environment-based configuration
- **�🔄 Hybrid Registration**: Global + guild-specific registration for best user experience
- **💾 Memory Management**: Ephemeral messages tracked in memory only (no database bloat)
- **🎪 Event Handlers**: Added guildCreate/guildDelete handlers for automatic setup
- **📋 Documentation**: Updated README and .env.example for new registration system
- **🔧 Discord.js Updates**: Compatibility improvements for newer Discord.js versions

### Environment Variables
- **LOG_LEVEL**: Set logging verbosity (ERROR/WARN/INFO/DEBUG, default: INFO)
- **DEBUG_LOGGING**: Force debug mode regardless of LOG_LEVEL (true/false, default: false)
- **LOG_COLORS**: Enable colored console output (true/false, default: true)
- **GUILD_ID**: Now optional - only needed for instant development command testing

## [1.12.1] - 2025-09-07
### 🎉 Major Release: Enhanced Administration & Automatic Voting System

### Added
- **🔧 Admin Control Panel**: Comprehensive admin interface with session management, movie controls, and system operations
- **⏰ Automatic Voting Closure**: Sessions automatically close at scheduled voting end times with winner selection
- **🏆 Intelligent Winner Selection**: Automatic winner selection with tie-breaking interface for admins
- **🔄 Movie Carryover System**: Non-winning movies automatically carry over to next session with vote reset
- **📅 Discord Event Integration**: Full Discord event creation, updates, and RSVP functionality
- **🕐 Timezone Support**: Configurable guild timezones with proper datetime handling
- **🎬 Enhanced IMDB Integration**: Rich movie information in events, announcements, and carryover restoration
- **🗑️ Remove Suggestion Feature**: Complete movie removal from queue with proper cleanup
- **📝 Session Descriptions**: Themed session messaging with custom descriptions in voting channels
- **🔗 Event Links**: Clickable Discord event links in winner announcements and session messages

### Enhanced
- **🎯 User Experience**: 12-hour time format (7:30 PM) and US date format (MM/DD/YYYY) for better usability
- **📋 Movie Queue Display**: Enhanced `/movie-queue` with carryover movie visibility and session context
- **🔧 Admin Movie Management**: Pick Winner, Skip to Next, Remove, Ban Movie, and Details buttons for each movie
- **📅 Event Management**: Events use session viewing channels with proper channel type detection
- **🎬 Winner Announcements**: Rich announcements with IMDB info, event links, and comprehensive movie details
- **⚡ Performance**: Optimized database queries with carryover movie filtering and better indexing

### Fixed
- **🔧 Critical Fixes**: Discord event ID storage, timezone handling, and automatic voting closure
- **🔄 Sync Channel Issues**: Proper carryover movie isolation preventing interference with sync operations
- **⚠️ Deprecation Warnings**: Replaced deprecated `ephemeral: true` with `flags: MessageFlags.Ephemeral`
- **📅 Event Updates**: Comprehensive event updating with winner information for both automatic and manual selection
- **🗄️ Database Integrity**: Enhanced migrations, proper column creation, and data consistency

### Technical
- **🗄️ Database Enhancements**: 6 new migrations (10-16) with timezone, admin channels, voting end times, and carryover flags
- **🔧 New Database Functions**: 15+ new functions for session management, carryover handling, and admin operations
- **⏰ Voting Closure System**: Complete automatic voting system with minute-aligned timing and comprehensive logging
- **🎯 Admin Architecture**: Modular admin system with control panels, movie mirroring, and session management
- **📅 Event System**: Full Discord event lifecycle management with channel integration and metadata handling
- **🔄 State Management**: Sophisticated movie state handling with session transitions and carryover preservation

### Migration Notes
- **Database**: Automatic migrations handle all schema updates
- **Configuration**: New timezone and admin channel settings available
- **Compatibility**: Fully backward compatible with existing data
- **Features**: All new features are opt-in through admin configuration

## [1.11.29] - 2025-09-06
### Added
- **Guild ID Normalization**: Added `guild_id` columns to `votes`, `session_participants`, and `session_attendees` tables
- **Enhanced User Statistics**: Comprehensive user analytics including votes given/received, movies planned, and session creation counts
- **Database Migration 11**: Automatic population of existing data via parent table joins with proper indexing

### Enhanced
- **Query Performance**: New indexes on guild_id columns for faster multi-guild operations
- **Statistics Display**: More detailed user statistics with better organization and additional metrics
- **Database Management**: Direct guild filtering capabilities for easier database maintenance and debugging

### Removed
- **Dead Code Cleanup**: Removed unused `user_stats` table definition and all references (manual table drop required)
- **Schema Optimization**: Eliminated redundant table that was never used in favor of dynamic calculations

### Technical
- **Backward Compatibility**: Updated database methods with optional guild_id parameters and fallback lookups
- **Data Integrity**: Enhanced guild context for all records with explicit foreign key relationships
- **Code Quality**: Removed dead code references and improved method signatures

## [1.11.28] - 2025-09-06
### Fixed
- **CRITICAL:** Fixed purge operation incorrectly deleting session data and attendance records
- **Session Preservation:** Purge now properly preserves all session data for analytics as intended
- **Data Integrity:** Fixed unintended deletion of session_attendees and session_participants
- **Analytics Protection:** Session data now preserved even when associated movies are purged

### Added
- **updateSessionMovieAssociation:** New database function to update session-movie associations
- **Session Data Protection:** Enhanced purge logic to preserve session analytics while removing movie associations
- **Better Logging:** Added logging for session preservation during purge operations

### Enhanced
- **Purge Behavior:** Purge now matches its description - preserves session data for analytics
- **Data Separation:** Better separation between movie data and session analytics data
- **Historical Preservation:** Session attendance and participation data preserved for long-term analytics
- **User Experience:** Purge summary now correctly shows session data preservation

### Technical
- **Database Operations:** Enhanced session management with movie association updates
- **Cascade Prevention:** Prevents unintended cascade deletion of session data during purge
- **Analytics Integrity:** Maintains session analytics data integrity during cleanup operations
- **Data Relationships:** Better handling of movie-session relationships during purge

## [1.11.27] - 2025-09-06
### Fixed
- **Database Schema:** Added 'active' status to movie_sessions ENUM to fix status update errors
- **Session Status Updates:** Fixed "Data truncated for column 'status'" error when updating sessions
- **ENUM Compatibility:** Enhanced session status ENUM to include all required status values

### Added
- **Migration 10:** Database migration to add 'active' status to movie_sessions status ENUM
- **Status Support:** Full support for session status progression: planning → active → completed
- **Error Prevention:** Prevents database truncation errors during session status updates

### Enhanced
- **Session Lifecycle:** Complete session status lifecycle support with proper database schema
- **Status Management:** Proper ENUM values for all session states and transitions
- **Database Integrity:** Enhanced database schema to support all session tracking features

### Technical
- **ENUM Update:** Modified movie_sessions status column to include 'active' status
- **Migration System:** Added Migration 10 for session status ENUM enhancement
- **Schema Validation:** Better database schema validation for session status values

## [1.11.26] - 2025-09-06
### Fixed
- **CRITICAL BUG:** Fixed variable name conflict causing session monitoring to never start
- **Session Status Updates:** Fixed sessions remaining in "planning" status instead of becoming "active"
- **Automatic Status Change:** Sessions now automatically change from "planning" to "active" when events start
- **Monitoring Initialization:** Fixed periodic check function that was preventing session monitoring

### Enhanced
- **Variable Naming:** Fixed activeSessions array vs Map confusion in periodic checks
- **Status Management:** Automatic session status updates when Discord events become active
- **Logging:** Added comprehensive logging for session monitoring and status changes
- **Error Prevention:** Better variable naming to prevent type confusion

### Technical
- **Array vs Map Fix:** Fixed .has() method being called on array instead of Map
- **Session Lifecycle:** Proper session status progression from planning → active → completed
- **Monitoring Logic:** Enhanced session monitoring startup and management
- **Database Updates:** Automatic session status updates during periodic checks

## [1.11.25] - 2025-09-06
### Fixed
- **Session Tracking:** Fixed session attendance tracking not starting automatically when events become active
- **Existing User Detection:** Added detection of users already in viewing channel when session starts
- **Automatic Monitoring:** Added periodic checks to start monitoring for active sessions
- **Real-time Attendance:** Session tracking now properly records attendance during active events

### Added
- **checkExistingUsersInChannel:** Function to detect users already in viewing channel at session start
- **checkForActiveSessionsToMonitor:** Periodic check for sessions that should be monitored
- **Global Client Access:** Made Discord client globally available for session tracking operations
- **Automatic Session Start:** Sessions now automatically begin monitoring when they become active

### Enhanced
- **Session Monitoring:** Improved session monitoring to handle users present before session start
- **Real-time Tracking:** Better real-time attendance tracking during active sessions
- **Database Updates:** Proper population of session_attendees and session_participants tables
- **Event Integration:** Better integration between Discord events and session tracking

### Technical
- **Client Reference:** Added global Discord client reference for session tracking access
- **Periodic Monitoring:** Added 60-second interval checks for active sessions
- **Error Handling:** Enhanced error handling for session monitoring operations
- **Database Integration:** Improved database updates during session tracking

## [1.11.24] - 2025-09-06
### Fixed
- **IMDb Data Recreation:** Fixed missing IMDb information in recreated movie posts
- **JSON Parsing:** Enhanced JSON parsing to handle double-encoded IMDb data
- **Data Integrity:** Improved IMDb data preservation during movie post recreation
- **Error Handling:** Better error handling for malformed IMDb data during recreation

### Enhanced
- **Recreation Robustness:** More reliable IMDb data parsing with fallback handling
- **Logging:** Added success/failure logging for IMDb data parsing during recreation
- **Data Validation:** Better validation of IMDb data before embed creation
- **Double-Encoding Support:** Handles both single and double-encoded JSON data

### Technical
- **JSON Handling:** Enhanced JSON parsing logic to handle various encoding scenarios
- **Error Recovery:** Graceful fallback when IMDb data parsing fails
- **Data Preservation:** Better preservation of movie metadata during recreation
- **Debugging:** Improved logging for troubleshooting IMDb data issues

## [1.11.23] - 2025-09-06
### Changed
- **Removed Admin Buttons:** Eliminated Watched/Plan Later/Skip buttons from all movie posts
- **Voting Only Interface:** Movie posts now only show Vote Up and Vote Down buttons
- **Slash Command Transition:** Admin functions moved to dedicated slash commands (/movie-watched, /movie-skip, /movie-plan)
- **Cleaner UI:** Simplified movie post interface focuses on community voting

### Enhanced
- **Consistent Button Interface:** All movie posts (new and recreated) have same button layout
- **Admin Workflow:** Clean separation between voting (buttons) and admin actions (slash commands)
- **Status Updates:** Movies with changed status (watched/skipped/planned) have no buttons
- **User Experience:** Simplified interface reduces button clutter on movie posts

### Technical
- **Button Creation:** Updated all movie post creation to use createVotingButtons instead of createStatusButtons
- **Status Handling:** Status changes remove buttons entirely for completed movies
- **Interface Consistency:** Unified button interface across all movie post creation paths

## [1.11.22] - 2025-09-06
### Fixed
- **Database Save Error:** Fixed "Bind parameters must not contain undefined" error during movie recreation
- **Thread Cleanup Logic:** Enhanced thread cleanup to be smarter about what constitutes orphaned threads
- **Missing Thread Recreation:** Added detection and recreation of missing discussion threads for existing posts
- **Movie Record Creation:** Fixed saveMovie function call to use proper parameter object format

### Added
- **recreateMissingThreads:** New function to detect and recreate missing discussion threads
- **Intelligent Thread Cleanup:** Thread cleanup now checks movie database and post existence before deletion
- **Thread-Post Synchronization:** Ensures all movie posts have corresponding discussion threads

### Enhanced
- **Thread Management:** Better logic for determining when threads should be preserved vs deleted
- **Database Operations:** Improved parameter handling for movie record creation during recreation
- **Sync Completeness:** Comprehensive sync now handles both missing posts AND missing threads
- **Error Prevention:** Better validation to prevent database constraint errors

### Technical
- **Parameter Validation:** Fixed saveMovie calls to use proper object parameter format
- **Thread Detection:** Enhanced thread cleanup logic to check movie existence in database
- **Post-Thread Mapping:** Better correlation between movie posts and discussion threads
- **Cleanup Intelligence:** Smarter cleanup that preserves relevant threads while removing orphaned ones

## [1.11.21] - 2025-09-06
### Fixed
- **Thread Cleanup Order:** Fixed thread cleanup to run BEFORE recreation instead of after
- **Database Foreign Key Error:** Fixed foreign key constraint error when updating message IDs
- **Vote Preservation:** Enhanced vote transfer system for recreated posts
- **Thread Recreation:** Recreated posts now properly keep their discussion threads

### Enhanced
- **Movie Record Management:** Improved database record handling during recreation
- **Vote Transfer:** Better vote preservation when recreating movie posts
- **Error Handling:** Enhanced error handling for database operations during recreation
- **Logging:** Added detailed logging for vote transfer and record updates

### Technical
- **Database Operations:** Changed from UPDATE to CREATE/DELETE approach for message ID changes
- **Vote System:** Enhanced vote transfer to handle foreign key constraints properly
- **Thread Management:** Corrected sync process order to prevent thread deletion after creation
- **Record Integrity:** Better handling of database record transitions during recreation

## [1.11.20] - 2025-09-06
### Added
- **Admin Slash Commands:** New admin-only commands for movie management
  - `/movie-watched <title>` - Mark a movie as watched
  - `/movie-skip <title>` - Skip a movie
  - `/movie-plan <title>` - Plan a movie for later
- **Permission Checks:** All admin commands require proper admin role permissions
- **Autocomplete Support:** Movie title autocomplete for admin commands

### Fixed
- **Thread Cleanup Order:** Fixed orphaned thread cleanup to run before recreation
- **Thread Recreation:** Recreated movie posts now properly get discussion threads
- **Sync Process:** Improved sync order to prevent deletion of newly created threads

### Enhanced
- **Admin Workflow:** Clean slash command interface for movie status management
- **Permission Security:** Admin commands properly validate user permissions
- **User Experience:** Autocomplete makes it easy to select movies by title

### Technical
- **Command Registration:** Added new admin commands to command registration system
- **Handler Integration:** Integrated admin commands with existing permission system
- **Error Handling:** Comprehensive error handling for admin command operations

## [1.11.19] - 2025-09-06
### Fixed
- **Movie Recreation Data:** Fixed field mapping to use correct database schema (where_to_watch, recommended_by)
- **Thread Recreation:** Fixed thread creation for recreated movie posts - now always creates discussion threads
- **IMDb Data Restoration:** Added IMDb data parsing for recreated posts to restore full movie information
- **Debug Logging:** Enhanced logging to track movie data during recreation process

### Enhanced
- **Thread Creation:** Recreated movie posts now automatically get discussion threads
- **Data Integrity:** Better handling of database field mapping during post recreation
- **Error Handling:** Improved error handling for thread creation during recreation
- **Button Simplification:** Recreated posts use voting buttons only (admin buttons require permission checks)

### Technical
- **Field Mapping:** Corrected platform→where_to_watch and addedBy→recommended_by mapping
- **IMDb Integration:** Added JSON parsing for stored IMDb data during recreation
- **Thread Logic:** Fixed thread creation logic to always create threads for movie posts
- **Debug Enhancement:** Added detailed logging for troubleshooting recreation issues

## [1.11.18] - 2025-09-06
### Fixed
- **Movie Recreation Error:** Fixed CombinedPropertyError when recreating movie posts during sync
- **Field Mapping:** Corrected field mapping between database schema and embed creation function
- **Undefined Values:** Added safety checks for undefined/null values in movie data

### Enhanced
- **Error Handling:** Better handling of missing or incomplete movie data during recreation
- **Data Validation:** Added fallback values for required fields to prevent embed creation errors
- **Sync Reliability:** Improved reliability of movie post recreation during sync operations

### Technical
- **Field Mapping Fix:** Changed platform→where_to_watch and addedBy→recommended_by mapping
- **Safety Checks:** Added null/undefined checks for all movie fields during recreation
- **Embed Creation:** Enhanced robustness of movie embed creation with fallback values

## [1.11.17] - 2025-09-06
### Fixed
- **Purge Database Cleanup:** Fixed purge not deleting movies from database when channel was switched
- **Cross-Channel Cleanup:** Purge now cleans up movies from all channels in guild, not just current channel
- **Debug Logging:** Added detailed logging to track purge operations and identify issues

### Added
- **getAllMovies:** New database function to get all movies for a guild regardless of channel
- **Enhanced Purge Logic:** Purge now handles movies that may be in different channels due to channel switches
- **Better Debugging:** Detailed console output for purge operations to track what's being deleted

### Technical
- **Channel Migration Support:** Purge operations now work correctly after channel configuration changes
- **Database Query Enhancement:** Added guild-wide movie queries for comprehensive cleanup
- **Logging Improvements:** Better tracking of purge operations for troubleshooting

## [1.11.16] - 2025-09-06
### Fixed
- **Critical Sync Logic:** Fixed sync deleting movies instead of recreating missing posts
- **Thread Cleanup Permissions:** Added permission checks for ManageThreads before attempting deletion
- **Thread Detection:** Improved orphaned thread detection by checking for parent message existence
- **Sync Behavior:** Sync now properly recreates missing movie posts instead of treating them as orphaned

### Enhanced
- **Permission Validation:** Bot checks for ManageThreads permission before attempting thread operations
- **Error Handling:** Better error handling for thread operations with clear permission warnings
- **Thread Cleanup:** More robust thread cleanup that handles permission errors gracefully

### Technical
- **Logic Correction:** Changed "orphaned database entries" logic to "missing post recreation"
- **Permission Checks:** Added runtime permission validation for thread management operations
- **Error Recovery:** Improved error handling for thread fetch and deletion operations

## [1.11.15] - 2025-09-06
### Fixed
- **Purge Error:** Fixed "preservedScheduled is not defined" error during purge operations
- **Sync Completeness:** Sync now properly recreates missing movie posts from database
- **Missing Posts:** Movies in database without Discord messages are now recreated during sync

### Added
- **recreateMissingMoviePosts:** Function to recreate Discord posts for movies that exist in database
- **recreateMoviePost:** Comprehensive movie post recreation with proper embeds, buttons, and threads
- **Post Recovery:** Sync operations now recover missing movie posts with full functionality

### Enhanced
- **Sync Reporting:** Added count of recreated posts to sync summary
- **Thread Recreation:** Missing movie posts get their discussion threads recreated
- **Button Restoration:** Recreated posts have proper voting or session management buttons

### Technical
- **Database Sync:** Improved synchronization between database records and Discord messages
- **Message ID Updates:** Recreated posts get proper message ID updates in database
- **Error Handling:** Better error handling for post recreation operations

## [1.11.14] - 2025-09-06
### Fixed
- **Critical Startup Error:** Fixed "Identifier 'cleanup' has already been declared" syntax error
- **Duplicate Requires:** Moved cleanup service require to top of handler files to prevent redeclaration
- **Module Organization:** Consolidated require statements for better code organization

### Technical
- **Import Management:** Proper module import organization in button and modal handlers
- **Code Quality:** Eliminated duplicate const declarations that caused startup crashes

## [1.11.13] - 2025-09-06
### Major Improvements
- **Cleanup Commands Work Anywhere:** No longer restricted to movie channel - can be run from any channel
- **Automatic Thread Cleanup:** Removes orphaned discussion threads during sync and purge operations
- **Enhanced Purge Behavior:** Completely clears movie channel while preserving watched movies in database
- **Channel Configuration Required:** Cleanup commands now require proper movie channel configuration

### Added
- **cleanupOrphanedThreads:** Intelligent cleanup of threads that no longer have corresponding movie posts
- **cleanupAllThreads:** Complete thread removal for purge operations
- **Movie Voting Channel Validation:** Ensures cleanup operations target the correct configured channel

### Enhanced
- **Purge Operations:** Now completely clear the movie channel including all threads and messages
- **Database Preservation:** Watched movies and session analytics preserved during purge for historical data
- **Better Error Handling:** Clear error messages when movie channel is not configured or found

### Fixed
- **Thread Accumulation:** Prevents orphaned threads from cluttering the movie channel
- **Channel Restrictions:** Cleanup commands no longer require being run in the movie channel
- **Purge Completeness:** Purge now truly clears the channel instead of selective deletion

### Technical
- **Function Parameters:** Updated cleanup functions to accept movie channel parameter
- **Thread Management:** Comprehensive thread lifecycle management during cleanup operations
- **Configuration Validation:** Robust checking of guild configuration before cleanup operations

## [1.11.12] - 2025-09-06
### Enhanced
- **Shorter Guide Messages:** Replaced verbose help embeds with concise quick action messages
- **Guide Message Cleanup:** Automatically removes duplicate guide/action messages to prevent clutter
- **Improved UX:** Quick action message mentions `/movie-help` for full commands while keeping interface clean

### Added
- **createQuickActionEmbed:** New concise embed for bottom-of-channel quick actions
- **cleanupOldGuideMessages:** Function to remove duplicate guide messages before posting new ones
- **ensureQuickActionAtBottom:** Comprehensive function that cleans up and posts single action message

### Fixed
- **Duplicate Guide Messages:** Purge operations no longer leave multiple guide messages
- **Message Clutter:** Only one guide/action message exists at bottom of channel at any time
- **Verbose Interface:** Replaced detailed help with simple "Ready to recommend?" message

### Technical
- **Message Management:** Improved tracking and cleanup of bot-generated guide messages
- **Function Consolidation:** Replaced multiple postQuickGuide functions with centralized cleanup approach
- **Better UX Flow:** Users can still access full help via `/movie-help` command when needed

## [1.11.11] - 2025-09-06
### Fixed
- **Session Cancellation:** Fixed "ReferenceError: restoreMoviePost is not defined" error during session cancellation
- **Movie Post Restoration:** Added missing restoreMoviePost function to properly restore movie posts after session cancellation
- **Duplicate Functions:** Removed duplicate updateMoviePostForSession function that was causing confusion

### Added
- **Movie Post Restoration:** Proper restoration of movie posts to voting state when sessions are cancelled
- **Vote Button Restoration:** Movie posts now properly restore voting buttons and status after session cancellation

### Technical
- **Function Organization:** Cleaned up duplicate function definitions in sessions service
- **Error Handling:** Improved error handling for movie post restoration operations

## [1.11.10] - 2025-09-06
### Fixed
- **Critical Syntax Error:** Fixed missing catch/finally block in discord-events.js causing bot startup crash
- **Extra Brace:** Removed duplicate closing brace that broke try-catch structure
- **Bot Startup:** Resolved "SyntaxError: Missing catch or finally after try" preventing bot from starting

### Technical
- **Code Structure:** Fixed malformed try-catch block in Discord event sync function
- **Startup Stability:** Bot now starts successfully without syntax errors

## [1.11.9] - 2025-09-06
### Documentation
- **CHANGELOG Update:** Added comprehensive release notes for versions 1.11.0 through 1.11.8
- **Release History:** Complete documentation of all features, fixes, and technical improvements
- **Version Tracking:** Proper categorization of changes (Added, Fixed, Enhanced, Technical)

### Technical
- **Documentation Maintenance:** Established proper changelog maintenance workflow
- **Release Notes:** Detailed documentation for all major features and bug fixes

## [1.11.8] - 2025-09-06
### Fixed
- **Foreign Key Constraints:** Fixed "Cannot delete or update a parent row: foreign key constraint fails" error
- **Database Integrity:** Enhanced updateMovieMessageId to properly update votes table references
- **SESSION_UID Unknown:** Added automatic fixing of Discord events showing "SESSION_UID:unknown"
- **Event Sync:** Enhanced bidirectional sync between Discord events and database sessions

### Added
- **Database Cleanup:** Added cleanupOrphanedData function for automatic maintenance
- **Orphaned Data Removal:** Automatically removes orphaned votes, participants, and attendees
- **Cleanup Reporting:** Detailed statistics for database maintenance operations

### Technical
- **Data Integrity:** Prevents database constraint violations during message recreation
- **Event Repair:** Intelligent Discord event description fixing during sync operations
- **Maintenance Automation:** Prevents database bloat from deleted movies and sessions

## [1.11.7] - 2025-09-06
### Fixed
- **Session ID Display:** Fixed SESSION_UID:unknown in Discord events by properly setting session IDs
- **Purge Functionality:** Fixed purge operations breaking scheduled movie session management
- **Button Restoration:** Added automatic session management button restoration after purge

### Added
- **Session Management Buttons:** Created createSessionManagementButtons utility for consistency
- **Purge Preservation:** Scheduled movies maintain full functionality through purge operations

### Technical
- **Session Data Flow:** Proper session ID propagation from database to Discord events
- **Button Management:** Consistent session management button creation across operations

## [1.11.6] - 2025-09-06
### Fixed
- **Permission Errors:** Fixed session cancel/reschedule permission errors (checkMovieAdminPermission undefined)
- **Module Imports:** Removed incorrect require statements in session management functions
- **Session Management:** Proper permission checking for all session operations

### Added
- **Voice Tracking Debug:** Added debug logging to voice state tracking for troubleshooting
- **Configuration Diagnostics:** Enhanced troubleshooting for viewing channel setup issues

### Technical
- **Permission System:** Cleaned up permission module usage in session handlers
- **Debug Logging:** Improved diagnostics for session monitoring configuration

## [1.11.5] - 2025-09-06
### Enhanced
- **Command Registration:** Clear logging for development vs production command registration modes
- **Development Mode:** GUILD_ID present - registers to specific guilds for instant updates
- **Production Mode:** No GUILD_ID - registers globally for all servers (1 hour propagation)
- **Deployment Flexibility:** Better support for public bot distribution

### Technical
- **Registration Modes:** Automatic detection of development vs production deployment
- **Guild Management:** Improved filtering and error handling for guild IDs
- **Public Bot Ready:** Optimized for public distribution while maintaining dev flexibility

## [1.11.4] - 2025-09-06
### Added
- **Viewing Channel Config:** Added 'set-viewing-channel' option to /movie-configure command
- **Session Monitoring Setup:** Voice/text channel configuration for session attendance tracking
- **Settings Display:** Enhanced view-settings to show configured viewing channel
- **Complete Interface:** Full configuration interface for session participant tracking

### Technical
- **Channel Validation:** Support for both voice and text channels for different viewing setups
- **Configuration Integration:** Seamless integration with existing guild configuration system

## [1.11.3] - 2025-09-06
### Fixed
- **Session Description Error:** Fixed session description generation error (interaction is not defined)
- **Parameter Passing:** Proper parameter passing to generateSessionDescription function
- **Console Errors:** Session creation with pre-selected movies now works without errors

### Technical
- **Function Signatures:** Corrected function parameter requirements for session generation
- **Error Handling:** Improved error handling in session creation workflow

## [1.11.2] - 2025-09-06
### Fixed
- **Create Session Button:** Fixed "Create Session from Movie" button functionality
- **Function References:** Replaced undefined createMovieSession with proper showSessionCreationModal
- **Movie Pre-selection:** Enhanced movie pre-selection in session creation workflow

### Added
- **Session State Management:** Proper session state initialization with pre-selected movies
- **Workflow Integration:** Seamless integration from movie recommendations to session creation

### Technical
- **Function Mapping:** Corrected function calls in session creation from movie posts
- **State Persistence:** Improved session creation state management

## [1.11.1] - 2025-09-06
### Added
- **Multi-Guild Commands:** Support for multiple guild IDs in GUILD_ID environment variable
- **Development Flexibility:** Commands register instantly in multiple test/development servers
- **Comma-Separated IDs:** Use GUILD_ID=guild1,guild2,guild3 for multiple instant registrations

### Enhanced
- **Testing Efficiency:** Eliminates 1-hour wait for global command registration during development
- **Backwards Compatibility:** Maintains compatibility with single guild ID configuration

### Technical
- **Command Registration:** Enhanced command registration logic for multiple guilds
- **Development Workflow:** Improved development and testing experience

## [1.11.0] - 2025-09-06
### Added
- **Enhanced Session Participant Tracking:** Real-time voice channel monitoring for session attendance
- **Automatic Attendance Detection:** Bot automatically detects when users join/leave viewing channels
- **Session Attendees Table:** New database table for actual attendance vs registered participants
- **Voice State Monitoring:** Added GuildVoiceStates intent for voice channel activity tracking
- **Attendance Analytics:** Duration tracking and attendance rate calculations

### Enhanced
- **Database Structure:** Added session_attendees table and session_viewing_channel_id configuration
- **Guild Configuration:** Added viewing channel configuration for session monitoring
- **Session Tracking Service:** Comprehensive service for real-time participant monitoring

### Technical
- **Voice Channel Integration:** Automatic detection during scheduled movie session times
- **Database Migrations:** Added migrations for new attendance tracking tables and columns
- **Event Handling:** Voice state change event handler for real-time monitoring

## [1.10.25] - 2025-09-06
### Fixed
- **Startup Crash:** Fixed "Cannot find module ./votes" error after removing unused votes.js handler
- **Module Imports:** Removed import of deleted votes.js handler from handlers/index.js
- **Interaction Routing:** Removed voting interaction routing since voting is handled in buttons.js

### Technical
- **Code Cleanup:** Voting functionality remains fully functional through button handlers
- **Module Organization:** Consolidated all voting logic in buttons.js handler

## [1.10.24] - 2025-09-06
### Added
- **Comprehensive TODOs:** Added detailed future feature planning for enhanced functionality
- **Session Tracking TODOs:** Documented automatic participant tracking during session times
- **Voting Analytics TODOs:** Documented voting pattern analysis and user preference tracking
- **Configuration TODOs:** Documented session viewing channel configuration features

### Technical
- **Future Planning:** Enhanced session participant tracking with real-time monitoring
- **Analytics Framework:** Voting button clicks already tracked, ready for analytics features
- **Channel Monitoring:** Framework for automatic attendance tracking in viewing channels

## [1.10.23] - 2025-09-06
### Fixed
- **Interaction Timeout Errors:** Fixed "Unknown interaction" errors in modal submissions
- **Configuration Buttons:** Implemented all configuration button handlers instead of placeholders
- **Session Participants:** Added session participants tracking with database table

### Enhanced
- **Session Management:** Users can now join sessions and be tracked in participant list
- **Session Listings:** Enhanced to show participant counts and organizer information
- **Error Handling:** Improved interaction timeout handling throughout all handlers

### Technical
- **Database Schema:** Added session_participants table with proper foreign key constraints
- **Participant Functions:** Added addSessionParticipant() and getSessionParticipants() functions
- **Code Quality:** Removed unused votes.js handler, consolidated voting logic

## [1.10.22] - 2025-09-06
### Documentation
- **Comprehensive Changelog:** Updated with all versions from 1.10.9 to 1.10.21
- **README Updates:** Added "Recent Major Updates" section highlighting key improvements
- **Version Documentation:** Updated README version to reflect current functionality
- **Release Notes:** Detailed documentation of voting fixes, duplicate detection, and session management

## [1.10.21] - 2025-09-06
### Fixed
- **Button Persistence:** Fixed buttons disappearing after status changes (Watched, Skip, Plan Later)
- **Vote Count Preservation:** Fixed voting to preserve all buttons and embed data after voting
- **IMDb Data Preservation:** Status changes now maintain vote counts and IMDb information in embeds
- **Duplicate Movie Detection:** Added detection with status and watch date information

### Enhanced
- **Status Button Logic:** Improved button display for different movie statuses
- **Database Functions:** Added `findMovieByTitle()` for duplicate detection
- **User Experience:** Warns users before adding duplicate movies with current status info

## [1.10.20] - 2025-09-06
### Fixed
- **Critical Voting Bug:** Fixed voting buttons having null message IDs causing foreign key constraint errors
- **Message Creation Flow:** Changed to create message first, then add buttons with correct message ID
- **Database Voting:** Resolved "Cannot add or update a child row" errors in voting system

### Technical
- **Button Custom IDs:** Fixed buttons to reference actual Discord message IDs instead of null
- **Movie Creation:** Updated both IMDb and non-IMDb movie creation flows

## [1.10.19] - 2025-09-06
### Fixed
- **Function Name Standardization:** Removed duplicate `createVoteButtons`, standardized on `createVotingButtons`
- **Component Deduplication:** Fixed `createStatusButtons` to use consistent vote button logic
- **Function Exports:** Cleaned up component exports to remove unused functions

### Technical
- **Vote Button Logic:** Eliminated duplicate vote button creation code across components
- **Consistent Labeling:** All vote buttons now show current vote counts in format "Vote Up (5)"

## [1.10.18] - 2025-09-06
### Fixed
- **Missing Functions:** Added missing `createVotingButtons` function and permissions import
- **Session Management:** Fixed session cancel/reschedule permission checking
- **Foreign Key Constraints:** Added debugging logs for movie database save operations

### Enhanced
- **Error Handling:** Improved debugging for database operations
- **Function Organization:** Better component function exports and imports

## [1.10.17] - 2025-09-06
### Fixed
- **Function Name Cleanup:** Comprehensive cleanup of duplicate and mismatched function names
- **Database Functions:** Removed duplicate functions (`updateSessionDiscordEvent`, `updateMovieStatus`, `getMovieSessionById`)
- **Function Call Consistency:** Fixed all function name mismatches in sessions service
- **Modularization Issues:** Resolved function call inconsistencies from previous refactoring

### Technical
- **Database Standardization:** Consistent function naming across all modules
- **Function Deduplication:** Removed conflicting duplicate function definitions

## [1.10.16] - 2025-09-06
### Fixed
- **Session Management:** Fixed session creation, cancellation, and rescheduling functionality
- **Discord Events:** Restored Discord event creation and management for movie sessions
- **Database Integration:** Fixed session-related database operations and queries
- **Button Interactions:** Resolved session management button functionality

### Enhanced
- **Event Scheduling:** Improved Discord event creation with proper timezone handling
- **Session Workflow:** Complete session creation flow from planned movies to scheduled events

## [1.10.15] - 2025-09-06
### Fixed
- **Database Connection:** Fixed MySQL connection and initialization issues
- **Migration System:** Resolved database migration and table creation problems
- **Service Dependencies:** Fixed circular dependency issues between services
- **Error Handling:** Improved database error handling and connection management

### Technical
- **Database Architecture:** Streamlined database service initialization
- **Connection Management:** Better MySQL connection handling and error recovery

## [1.10.14] - 2025-09-06
### Fixed
- **Modular Architecture:** Completed transition to modular service-based architecture
- **Handler Organization:** Organized all interaction handlers into dedicated modules
- **Service Integration:** Fixed service imports and dependencies across modules
- **Code Structure:** Clean separation of concerns between handlers, services, and utilities

### Enhanced
- **Maintainability:** Improved code organization for easier maintenance and debugging
- **Scalability:** Better structure for adding new features and functionality

## [1.10.13] - 2025-09-06
### Fixed
- **Command Registration:** Fixed slash command registration and handling
- **Interaction Routing:** Resolved interaction handler routing issues
- **Service Integration:** Fixed service module imports and dependencies

### Technical
- **Command System:** Improved slash command processing and error handling
- **Module Structure:** Better organization of command handlers and services

## [1.10.12] - 2025-09-06
### Fixed
- **Module Imports:** Fixed import paths and module dependencies
- **Service Architecture:** Resolved service integration issues
- **Handler Organization:** Fixed interaction handler routing and processing

### Enhanced
- **Code Organization:** Improved modular structure for better maintainability
- **Error Handling:** Better error handling across all modules

## [1.10.11] - 2025-09-06
### Fixed
- **Database Integration:** Fixed database service integration and method calls
- **Service Dependencies:** Resolved service import and dependency issues
- **Module Structure:** Fixed modular architecture implementation

### Technical
- **Service Layer:** Improved service layer organization and functionality
- **Database Operations:** Better database operation handling and error management

## [1.10.10] - 2025-09-06
### Fixed
- **Modular Refactoring:** Initial modular architecture implementation
- **Service Separation:** Separated business logic into dedicated service modules
- **Handler Organization:** Organized interaction handlers by type

### Enhanced
- **Code Structure:** Improved code organization for better maintainability
- **Service Architecture:** Clean separation between handlers, services, and utilities

## [1.10.9] - 2025-09-06
### Fixed
- **Database Methods:** Fixed database method calls and service integration
- **Error Handling:** Improved error handling for database operations
- **Service Integration:** Fixed service module imports and dependencies

### Technical
- **Method Consistency:** Standardized database method naming and usage
- **Service Layer:** Better service layer organization and error handling

## [1.10.8] - 2025-09-05
### Fixed
- **IMDb Service Method:** Fixed `imdb.searchMovies is not a function` error by using correct `searchMovie` method
- **Database Method:** Fixed `database.addMovie is not a function` error by using correct `saveMovie` method
- **Movie Creation:** Fixed movie recommendation workflow to use proper database and service methods
- **IMDb Search Results:** Enhanced IMDb search to properly handle search result structure
- **Error Handling:** Improved error handling for movie creation and IMDb integration

### Technical
- **Method Names:** Updated all handlers to use correct database method `saveMovie` instead of `addMovie`
- **IMDb Integration:** Fixed IMDb service calls to use `searchMovie` and handle `Search` array properly
- **Result Validation:** Added proper validation for IMDb search results structure
- **Database Calls:** Corrected all database method calls throughout handlers

---

## [1.10.7] - 2025-09-05
### Fixed
- **Sync Data Loss:** Fixed sync function removing IMDb data from movie recommendations
- **Recommend Button Error:** Fixed "Unknown button interaction" error for create_recommendation button
- **IMDb Selection Missing:** Added missing IMDb selection handlers for movie recommendation workflow
- **Data Preservation:** Sync now preserves existing embed data including posters and ratings
- **Button Functionality:** Restored complete movie recommendation workflow from guide button

### Enhanced
- **Conservative Sync:** Sync only updates components when needed, preserves embed content
- **Complete Workflow:** Full movie recommendation flow: button → modal → IMDb search → selection → post
- **IMDb Integration:** Proper handling of IMDb movie selection with poster and rating preservation
- **Error Handling:** Enhanced error handling throughout movie creation process

### Added
- **Create Recommendation Handler:** Added missing button handler for guide recommendation button
- **IMDb Selection Handler:** Complete IMDb movie selection and creation workflow
- **Movie Creation Functions:** Both IMDb and non-IMDb movie creation paths
- **Data Validation:** Proper validation and error handling for movie recommendation process

### Technical
- **Button Handlers:** Added handleCreateRecommendation and handleImdbSelection functions
- **Data Preservation:** Modified syncMessageWithDatabase to preserve existing embeds
- **Workflow Completion:** Complete end-to-end movie recommendation functionality
- **Component Updates:** Smart component updating without overwriting embed data

---

## [1.10.6] - 2025-09-05
### Fixed
- **Configuration Service Error:** Fixed `Cannot read properties of undefined (reading 'checkMovieAdminPermission')`
- **Missing Configuration Module:** Created missing configuration service with all admin functions
- **Import Errors:** Fixed service import paths in cleanup and command handlers
- **Movie Configuration Commands:** Restored full functionality for `/movie-configure` command

### Added
- **Configuration Service:** Complete configuration service module with all admin functions
- **Channel Configuration:** `configureMovieChannel` function for setting movie channels
- **Role Management:** `addAdminRole` and `removeAdminRole` functions for admin role management
- **Notification Setup:** `setNotificationRole` function for event notification configuration
- **Settings Display:** `viewSettings` function for viewing current server configuration
- **Configuration Reset:** `resetConfiguration` function for clearing all settings

### Technical
- **Service Module:** Created `services/configuration.js` with all configuration functions
- **Service Index:** Added configuration service to services index exports
- **Import Fixes:** Fixed cleanup service permission import path
- **Error Handling:** Enhanced error handling in configuration operations

---

## [1.10.5] - 2025-09-05
### Fixed
- **Deprecation Warning:** Fixed Discord.js v14 deprecation warning for 'ready' event
- **Event Handler:** Updated to use 'clientReady' event instead of deprecated 'ready' event
- **Future Compatibility:** Ensures compatibility with Discord.js v15 when released

### Technical
- **Event Migration:** Changed from `client.once('ready')` to `client.once('clientReady')`
- **Clean Startup:** Eliminated deprecation warning during bot initialization
- **Forward Compatibility:** Prepared for Discord.js v15 breaking changes

---

## [1.10.4] - 2025-09-05
### Fixed
- **Command Registration Error:** Fixed `Cannot read properties of undefined (reading 'put')` error
- **Discord Intents Error:** Removed privileged MessageContent intent that was causing startup failure
- **REST API Setup:** Properly initialized REST client for command registration
- **Bot Status Setting:** Fixed activity type to use numeric value instead of string
- **Startup Reliability:** Enhanced error handling and parameter passing for command registration

### Technical
- **REST Client:** Added proper REST client initialization in command registration module
- **Intent Optimization:** Removed unnecessary MessageContent intent (bot uses slash commands only)
- **Parameter Passing:** Fixed registerCommands function to receive token, clientId, and guildId
- **Error Propagation:** Enhanced error handling in command registration process

---

## [1.10.3] - 2025-09-05
### Added
- **Enhanced Cleanup Command:** Added sync/purge options with admin-only access control
- **Purge Functionality:** Complete channel reset while preserving scheduled movies with active events
- **Admin Permission Control:** Cleanup commands now restricted to server admins and configured admin roles
- **Confirmation System:** Multi-step confirmation for destructive purge operations
- **Selective Preservation:** Purge protects scheduled movies with active Discord events

### Enhanced
- **Cleanup Options:** `/movie-cleanup sync` for synchronization, `/movie-cleanup purge` for complete reset
- **Smart Preservation:** Purge automatically detects and preserves movies with active Discord events
- **Complete Cleanup:** Purge removes movies, votes, sessions, Discord messages, and threads
- **Guide Recreation:** Automatic guide message recreation after purge operations
- **Permission Validation:** Enhanced security with admin role checking for cleanup operations

### Fixed
- **Status Command Accuracy:** Fixed scheduled event counting to show only active Discord events
- **Movie-Night Command:** Restored modal functionality instead of parameter requirements
- **Event Count Verification:** Status now accurately reflects actual Discord events, not database entries
- **IMDb Search Integration:** Proper movie recommendation workflow with IMDb selection
- **Modal Processing:** Complete movie recommendation flow from modal to post creation

### Technical
- **Database Methods:** Added deleteMovieSession, deleteVotesByMessageId, deleteMovie for cleanup
- **Event Verification:** Real-time Discord event existence checking for accurate statistics
- **Purge Logic:** Intelligent separation of movies to delete vs preserve based on event status
- **Admin Security:** Comprehensive permission checking for all cleanup operations

---

## [1.10.2] - 2025-09-05
### Added
- **Complete Sync System:** Bidirectional synchronization between Discord events and database
- **Session UID Tracking:** Embedded session UIDs in Discord event descriptions for tracking
- **Discord Event Sync:** Automatic detection and cleanup of orphaned Discord events
- **Vote Preservation:** Complete vote data preservation during message recreation
- **IMDb Data Restoration:** Proper parsing and restoration of movie posters and details
- **Enhanced Database Methods:** getAllSessions, getMovieBySessionId, updateSessionEventId, transferVotes

### Enhanced
- **Cleanup System:** Now includes Discord event synchronization and orphan cleanup
- **Movie Recreation:** Recreates movies at bottom with full IMDb data and preserved votes
- **Guide Interface:** Proper recommendation button instead of admin configuration buttons
- **Event Management:** Automatic cleanup when Discord events are manually deleted
- **Data Integrity:** Complete consistency between Discord messages, events, and database

### Fixed
- **Missing IMDb Data:** Movies now properly restore posters and details during cleanup
- **Lost Vote Counts:** Vote preservation during message recreation (e.g., "3 👍 0 👎" maintained)
- **Wrong Guide Buttons:** Fixed guide showing admin config instead of recommendation button
- **Orphaned Events:** Automatic detection and cleanup of Discord events without database sessions
- **Status Sync:** Movies automatically return to "planned" when associated events are deleted

### Technical
- **Session UID Format:** `SESSION_UID:123` embedded in Discord event descriptions
- **Bidirectional Sync:** Discord events ↔ Database sessions with automatic reconciliation
- **Vote Transfer:** Database-level vote migration during message ID changes
- **Event Cleanup:** Comprehensive orphan detection and automatic status restoration

---

## [1.10.1] - 2025-09-05
### Added
- **Enhanced Cleanup System:** Comprehensive database sync during cleanup operations
- **Orphaned Message Removal:** Automatically deletes Discord messages for movies removed from database
- **Database Sync:** Syncs message status with database state during cleanup
- **Expanded Coverage:** Cleanup now processes 200 messages instead of 100
- **Missing Database Method:** Added `getMoviesByChannel()` for channel-specific movie queries

### Enhanced
- **Comprehensive Cleanup:** `/movie-cleanup` now performs full database synchronization
- **Orphan Detection:** Identifies and removes messages without corresponding database entries
- **Status Synchronization:** Ensures Discord message status matches database status
- **Better Reporting:** Detailed cleanup summary with sync statistics
- **Database Integrity:** Maintains consistency between Discord and database states

### Fixed
- **Button Interaction Failures:** Resolved "This interaction failed" errors for Plan Later and voting
- **Status Change Handlers:** Implemented proper interaction responses for all status buttons
- **Vote Processing:** Fixed voting button interactions with database integration
- **Error Handling:** Improved error handling prevents interaction timeouts

---

## [1.10.0] - 2025-09-05
### Added
- **Session Management Buttons:** Reschedule and Cancel buttons on scheduled movie posts
- **Reschedule Functionality:** Complete reschedule flow using same Date→Time→Timezone workflow
- **Cancel Session Feature:** Cancel sessions with confirmation dialog and automatic cleanup
- **Movie Post Restoration:** Cancelled movies automatically return to "Planned for later" status
- **Permission Controls:** Only session creators and admins can reschedule/cancel sessions

### Enhanced
- **Session Control:** Full lifecycle management from creation to cancellation
- **Movie Status Sync:** Automatic status updates when sessions are cancelled or rescheduled
- **Discord Event Management:** Automatic Discord event deletion when sessions are cancelled
- **User Experience:** Clear confirmation dialogs and status updates throughout process

### Fixed
- **Date/Time Display:** Fixed session info showing event END time instead of START time
- **Timezone Display:** Now uses Discord timestamps for accurate timezone display across all users
- **Session Information:** Consistent date/time formatting using `<t:timestamp:F>` format

---

## [1.9.12] - 2025-09-05
### Added
- **Role Notifications:** Configure notification role to be pinged when Discord events are created
- **Event Links in Movie Posts:** Movie posts now show clickable Discord event links instead of "Planned for later"
- **Notification Configuration:** `/movie-configure set-notification-role @role` to set up event notifications
- **Smart Channel Selection:** Notifications sent to movie channel, session channel, or suitable fallback

### Enhanced
- **Movie Post Integration:** Scheduled movies now display direct links to Discord events
- **Role Management:** Complete role notification system with database storage and configuration
- **User Experience:** Clear visual connection between movie recommendations and scheduled events
- **Event Visibility:** Role members automatically notified when new movie nights are scheduled

### Fixed
- **Movie Post Updates:** Fixed issue where scheduled movies still showed "Planned for later"
- **Event Integration:** Movie posts now properly reflect scheduled status with event links
- **Status Consistency:** Visual status now matches actual scheduling state

---

## [1.9.11] - 2025-09-05
### Added
- **Auto Movie Post Updates:** Automatically updates movie recommendation posts when scheduled for sessions
- **Movie Status Tracking:** New 'scheduled' status for movies that are assigned to sessions
- **Thread Integration:** Posts session details in movie recommendation threads
- **Visual Status Updates:** Movie posts change color and remove voting buttons when scheduled

### Enhanced
- **Complete Workflow Integration:** Session creation now updates the original movie recommendation
- **Status Synchronization:** Movie database status automatically updated to 'scheduled'
- **User Experience:** Clear visual indication when movies are scheduled vs. still pending
- **Thread Communication:** Session information automatically posted in movie discussion threads

### Fixed
- **Post Management:** Removes voting buttons from scheduled movies to prevent confusion
- **Status Consistency:** Database and UI status now stay synchronized
- **Information Flow:** Users can easily see which movies are scheduled and when
- **Timezone Handling:** Discord events now created in correct timezone (11 PM ET = 8 PM PT, not 4 PM PT)

---

## [1.9.10] - 2025-09-05
### Added
- **Smart Event Duration:** Discord events now use movie runtime + 30 minutes buffer for accurate end times
- **Runtime Integration:** Automatically calculates event duration based on selected movie's IMDb runtime data
- **Intelligent Fallback:** Uses 2.5 hour default duration when movie runtime is unavailable

### Enhanced
- **Discord Event Creation:** Fixed required end time issue with smart runtime-based duration calculation
- **Event Accuracy:** Events now reflect actual movie length plus conversation/setup time
- **User Experience:** More accurate event scheduling based on actual movie duration

### Fixed
- **Discord Events:** Resolved "An end time is required for external events" error
- **Event Duration:** Replaced arbitrary 3-hour duration with intelligent runtime-based calculation
- **IMDb Integration:** Enhanced runtime parsing from IMDb data for event scheduling

---

## [1.9.9] - 2025-09-05
### Fixed
- **Session Creation Reliability:** Resolved all database errors preventing session creation
- **Database Charset Issues:** Removed emojis from templates to prevent charset encoding errors
- **IMDb Integration:** Fixed import errors and added graceful error handling for missing data
- **Database Schema:** Added missing columns (discord_event_id) with proper migrations
- **Template Compatibility:** Smart templating now works reliably without database conflicts

### Enhanced
- **Error Handling:** Improved error handling for IMDb data fetching and database operations
- **Database Migrations:** Automatic schema updates with proper charset handling
- **Template Reliability:** Rich session descriptions without problematic characters
- **User Experience:** Session creation now works consistently with smart templating

---

## [1.9.8] - 2025-09-05
### Added
- **Smart Session Templating:** Auto-generated session names and descriptions based on selections
- **Rich Movie Descriptions:** Pre-filled descriptions with IMDb synopsis, genre, runtime, and rating
- **Database Migrations:** Automatic schema updates to ensure all columns exist
- **Editable Templates:** Users can modify auto-generated content before saving

### Fixed
- **Database Schema Issues:** Fixed "upvotes/downvotes" column errors with proper JOIN queries
- **Timezone Column Error:** Added migration to ensure timezone column exists in movie_sessions table
- **Vote Calculations:** Updated all vote-related queries to use proper votes table relationships
- **Session Creation:** Resolved "Failed to create movie session" errors

### Enhanced
- **Session Names:** Auto-generated format: "Watch Party - Movie Title - Saturday, 11PM Eastern"
- **Session Descriptions:** Rich content with movie synopsis, genre, runtime, IMDb rating, and session details
- **User Experience:** Pre-filled but editable templates save time while allowing customization
- **Database Reliability:** Automatic migrations ensure schema compatibility

---

## [1.9.7] - 2025-09-05
### Added
- **Movie Selection Step:** Added movie selection as Step 4 in session creation workflow
- **Smart Movie Categorization:** Movies grouped by Top Voted, Planned, Pending, and No Movie options
- **Movie Information Display:** Shows vote scores, platforms, and movie status in selection dropdown
- **Session-Movie Association:** Sessions can now be linked to specific movies from the queue
- **Navigation Controls:** Back buttons to change movie selection during session creation

### Enhanced
- **Complete Session Workflow:** Date → Time → Timezone → Movie → Details (5-step process)
- **Movie Integration:** Sessions automatically associate with selected movies in database
- **User Experience:** Clear categorization and information display for movie selection
- **Flexible Options:** Can create general sessions or movie-specific sessions

### Fixed
- **Missing Imports:** Added required Discord.js imports for enhanced select menu functionality
- **State Management:** Improved session creation state handling for movie selection
- **Database Integration:** Proper movie association with session creation

---

## [1.9.6] - 2025-09-05
### Enhanced
- **Session Creation UX:** Completely redesigned workflow with intuitive Date → Time → Timezone → Details flow
- **Better Date Selection:** Added all weekdays (Monday-Sunday), custom date input (MM/DD/YYYY), and clearer options
- **Improved Time Selection:** Extended time options (6 PM - 11 PM prime time, afternoon options), 12-hour format with AM/PM
- **Visual Progress:** Clear step-by-step workflow with current selections displayed throughout process
- **Custom Input Support:** Modal inputs for custom dates and times with proper validation

### Fixed
- **Session Creation Flow:** Replaced confusing quick-select approach with logical step-by-step process
- **Time Format:** Changed from 24-hour to user-friendly 12-hour format with AM/PM
- **Date Range:** Expanded from limited quick options to full week coverage plus custom dates
- **User Feedback:** Added proper validation and error messages for custom inputs

### Technical
- **Modal Handling:** Added comprehensive modal processing for custom date/time inputs
- **State Management:** Improved session creation state tracking across multiple steps
- **Database Integration:** Added Discord event integration and proper session creation workflow

---

## [1.9.5] - 2025-09-05
### Added
- **Complete Functionality:** Implemented all remaining placeholder commands
- **Movie Recommendations:** Full /movie-night command with database integration
- **Movie Queue:** Complete /movie-queue with vote scores and user display
- **Session Management:** All session actions now fully functional (list, join, add-movie, close, winner)
- **Statistics System:** Comprehensive /movie-stats with overview, top movies, user stats, and monthly data
- **Database Methods:** Added all missing database operations for sessions and statistics

### Fixed
- **Command Parameter Clarity:** Improved descriptions for session-id and movie-title parameters
- **Session Workflow:** Clear guidance on when to use which parameters
- **Permission Checking:** Proper organizer and admin permission validation
- **Error Handling:** Comprehensive error handling throughout all commands

### Enhanced
- **User Experience:** Clear feedback and guidance for all command interactions
- **Data Integrity:** Proper database relationships and data validation
- **Performance:** Optimized database queries for statistics and session management

---

## [1.9.4] - 2025-09-05
### Changed
- **Timezone Approach:** Pivoted from server-wide timezone config to per-session timezone selection
- **Session Creation UX:** Enhanced workflow with timezone selection as first step
- **Configuration Simplification:** Removed timezone from `/movie-configure` command
- **User Experience:** No server setup required - users select timezone when creating sessions

### Added
- **Progressive Session Creation:** Step-by-step workflow with visual progress indication
- **Flexible Timezone Selection:** Different sessions can use different timezones
- **Better Visual Feedback:** Clear indication of selected timezone throughout process
- **Change Timezone Option:** Users can modify timezone selection during session creation

### Removed
- **Server Timezone Configuration:** No longer needed with per-session approach
- **Database Timezone Dependency:** Simplified architecture without timezone storage
- **Complex Configuration:** Streamlined setup process for better user experience

---

## [1.9.3] - 2025-09-05
### Fixed
- **Configuration Commands:** Implemented real configuration functionality for all settings
- **Timezone Setting:** Users can now actually set server timezone through `/movie-configure`
- **Channel Configuration:** Movie channel can be set and managed properly
- **Admin Role Management:** Add/remove admin roles functionality now works
- **Settings Viewing:** Complete configuration overview with current settings display

### Added
- **Full Configuration System:** All configuration actions now functional instead of placeholders
- **Timezone Integration:** Proper timezone handling for session creation and display
- **Admin Permission System:** Role-based admin permissions with database storage
- **Configuration Reset:** Ability to reset all settings to defaults

---

## [1.9.2] - 2025-09-05
### Fixed
- **Cleanup Functionality:** Implemented real cleanup command to update old movie messages to current format
- **Create Session Buttons:** Planned movies now get Create Session buttons through cleanup process
- **Discord.js Compatibility:** Fixed all deprecation warnings by updating ephemeral to flags syntax
- **Message Format Detection:** Added helper functions to detect and update message formats
- **Admin Permissions:** Improved permission checking and error handling for cleanup command

### Added
- **Message Format Helpers:** Functions to detect current format and update old messages
- **Better Error Handling:** Comprehensive error handling and user feedback for cleanup process

---

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
