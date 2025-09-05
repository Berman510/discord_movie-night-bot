# Changelog

All notable changes to **Movie Night Bot** will be documented in this file.

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
