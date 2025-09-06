# Changelog

All notable changes to **Movie Night Bot** will be documented in this file.

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
- **Movie Channel Validation:** Ensures cleanup operations target the correct configured channel

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
