# 🚨 FINAL CRITICAL FIXES TESTING - PHASE 3B

**SPECIFIC FIXES DEPLOYED:**

1. **Database Schema Fix** - Added missing `next_session` column to `tv_shows` table (Migration 35)
2. **Carryover Logic Fix** - Fixed `contentType is not defined` error in voting sessions
3. **TV Show Vote Counting Fix** - Fixed `getVoteCounts()` to check both `votes` and `votes_tv` tables

---

## 🎯 **CRITICAL TEST: TV SHOW ADMIN CHANNEL POSTS**

### **Test: TV Show Winner Selection (RETRY)**

**Steps:**

1. **RESTART THE BOT** (to run Migration 35 and get latest fixes)
2. Create a TV show session with 2-3 TV shows
3. Vote on the TV shows (to create entries in votes_tv table)
4. Check admin channel for TV show posts with vote counts

**Expected Results:**

- ✅ TV shows appear in admin channel with proper vote counts
- ✅ Winner selection buttons work for TV shows
- ✅ No database errors in logs
- ✅ Vote counts display correctly (not 0/0)

**Results:**

- [ ] PASS / [X] FAIL
- **Observations:**
  Still no Admin channel posting!!!!!!
  **Log Capture:**

```
09-16 22:06:08 🗄️ Using cached table name: movie_sessions
09-16 22:06:09 🗄️ Using cached table name: movie_sessions
09-16 22:06:09 🗑️ Deleted Discord event: 🎬 TV Show Night (1417737784139059221)
09-16 22:06:09 2025-09-17 05:06:09 [INFO ] ✅ Marked non-winning movies for next session
09-16 22:06:09 2025-09-17 05:06:09 [INFO ] ✅ Marked non-winning TV shows for next session
09-16 22:06:09 2025-09-17 05:06:09 [INFO ] 📋 Marked cancelled session content (movies & TV shows) for next session carryover
09-16 22:06:09 🗄️ Using cached table name: movie_sessions
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] 📦 Clearing forum channel after session cancellation
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944] 🧹 Clearing forum content posts in channel: movie-night-voting-forum (DATABASE-DRIVEN)
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944] 📋 Found 0 database-tracked forum movies and 1 TV shows to process
09-16 22:06:09 2025-09-17 05:06:09 [INFO ] [1413732572424437944] 🗑️ Deleted forum thread: Office Olympics (1417738165585707119)
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944] 🗄️ Cleared thread reference for TV show: Office Olympics
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944] 🧹 Deleting system posts (Recommend/No Session/Winner)
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944] 🔍 Thread: "📺 Recommend TV Shows"
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944]    - hasNoSession: false, hasRecommendMovie: false
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944]    - hasRecommendTV: true, hasRecommendContent: false
09-16 22:06:09 2025-09-17 05:06:09 [DEBUG] [1413732572424437944]    - isSystemPost: true, isWinnerAnnouncement: false
09-16 22:06:10 2025-09-17 05:06:10 [INFO ] [1413732572424437944] 🗑️ Deleted system post: 📺 Recommend TV Shows
09-16 22:06:10 2025-09-17 05:06:10 [INFO ] [1413732572424437944] 🧹 Forum cleanup complete: 2 deleted, 0 kept (winner/system)
09-16 22:06:10 2025-09-17 05:06:10 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 22:06:10 2025-09-17 05:06:10 [DEBUG] [null] 📋 Active session provided: 1413732572424437944
09-16 22:06:10 2025-09-17 05:06:10 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 22:06:10 2025-09-17 05:06:10 [DEBUG] [1413732572424437944] 📋 Found 0 active threads, 0 archived threads
09-16 22:06:10 2025-09-17 05:06:10 [DEBUG] [1413732572424437944] 📋 Found 0 system posts, pinned post: none
09-16 22:06:10 2025-09-17 05:06:10 [DEBUG] [1413732572424437944] 📋 Created and pinned new no session post
09-16 22:06:11 2025-09-17 05:06:11 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 22:06:11 🗄️ Using cached table name: movie_sessions
09-16 22:06:12 2025-09-17 05:06:12 [DEBUG] 🔧 Updated pinned admin control panel
09-16 22:06:12 2025-09-17 05:06:12 [INFO ] ❌ Session TV Show Night - Friday, October 10, 2025 cancelled by berman_wa
09-16 22:06:29 2025-09-17 05:06:29 [DEBUG] 🧹 Cleaning up ephemeral message tracking for user 1407961422540968118: 1417738168530370592
09-16 22:06:29 2025-09-17 05:06:29 [DEBUG] 🧹 Removed ephemeral message tracking for user 1407961422540968118
09-16 22:07:04 🗄️ Using cached table name: movie_sessions
09-16 22:07:15 🗄️ Using cached table name: movie_sessions
09-16 22:07:15 2025-09-17 05:07:15 [DEBUG] 🔧 Refreshed admin control panel
09-16 22:07:29 2025-09-17 05:07:29 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 22:07:29 2025-09-17 05:07:29 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 22:07:29 2025-09-17 05:07:29 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 22:07:29 🗄️ Using cached table name: movie_sessions
09-16 22:07:29 2025-09-17 05:07:29 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 22:07:29 2025-09-17 05:07:29 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 22:07:30 2025-09-17 05:07:30 [INFO ] ✅ Created Discord event: 🎬 TV Show Night (ID: 1417738715056308285) - Duration: 150 minutes
09-16 22:07:30 2025-09-17 05:07:30 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 22:07:30 2025-09-17 05:07:30 [DEBUG] 📅 Saving event ID 1417738715056308285 to session 2
09-16 22:07:30 2025-09-17 05:07:30 [DEBUG] 🗄️ Database: Updating session 2 with event ID 1417738715056308285
09-16 22:07:30 2025-09-17 05:07:30 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 22:07:30 2025-09-17 05:07:30 [DEBUG] 📅 Successfully saved event ID to database
09-16 22:07:30 2025-09-17 05:07:30 [INFO ] 📅 Created Discord event: 🎬 TV Show Night (1417738715056308285)
09-16 22:07:30 2025-09-17 05:07:30 [INFO ] 🔄 Found 0 carryover TV shows from previous session
09-16 22:07:30 2025-09-17 05:07:30 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 22:07:30 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 22:07:30 🗄️ Using cached table name: movie_sessions
09-16 22:07:31 2025-09-17 05:07:31 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 22:07:31 2025-09-17 05:07:31 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 22:07:31 2025-09-17 05:07:31 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 22:07:31 2025-09-17 05:07:31 [DEBUG] [1413732572424437944] 📋 Found 1 active threads, 0 archived threads
09-16 22:07:31 2025-09-17 05:07:31 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417738382406324286) - pinned: false, archived: false
09-16 22:07:31 2025-09-17 05:07:31 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 22:07:31 2025-09-17 05:07:31 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 22:07:32 2025-09-17 05:07:32 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 22:07:32 2025-09-17 05:07:32 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=tv_show
09-16 22:07:32 2025-09-17 05:07:32 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 22:07:32 2025-09-17 05:07:32 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 22:07:32 2025-09-17 05:07:32 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 22:07:33 🗄️ Using cached table name: movie_sessions
09-16 22:07:33 2025-09-17 05:07:33 [DEBUG] 🔧 Created and pinned admin control panel
09-16 22:07:33 2025-09-17 05:07:33 [DEBUG] ⏰ Session 2 voting ends in 24 days - will be checked daily
09-16 22:07:33 2025-09-17 05:07:33 [INFO ] 🎬 Voting session created: TV Show Night - Friday, October 10, 2025 by berman_wa
09-16 22:07:42 🗄️ Using cached table name: movie_sessions
09-16 22:07:56 2025-09-17 05:07:56 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Stranger Things, episode: S4E2, where: Test
09-16 22:07:56 2025-09-17 05:07:56 [DEBUG] Content recommendation: Stranger Things (S4E2) on Test
09-16 22:07:56 2025-09-17 05:07:56 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 22:07:56 2025-09-17 05:07:56 [DEBUG] 🔍 Combined search title: Stranger Things S04E02
09-16 22:07:57 2025-09-17 05:07:57 [DEBUG] 🔍 Trying specific episode search for: Stranger Things S4E2
09-16 22:07:57 🔍 Searching for episode: Stranger Things S4E2
09-16 22:07:57 ✅ Found episode: Chapter Two: Vecna's Curse (2022)
09-16 22:07:57 2025-09-17 05:07:57 [DEBUG] ✅ Found specific episode: Chapter Two: Vecna's Curse
09-16 22:07:57 🗄️ Using cached table name: movie_sessions
09-16 22:07:57 IMDb search failed: Cannot read properties of undefined (reading 'episodeNotFound')
09-16 22:07:57 2025-09-17 05:07:57 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417738828470419517
09-16 22:08:00 🗄️ Using cached table name: movie_sessions
09-16 22:08:00 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Stranger Things S04E02, where: Test, imdbId: tt11171932
09-16 22:08:00 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "Chapter Two: Vecna's Curse"
09-16 22:08:00 🗄️ Using cached table name: movie_sessions
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] [{
09-16 22:08:00   "id": 1,
09-16 22:08:00   "guild_id": "1413732572424437944",
09-16 22:08:00   "movie_channel_id": "1414130515719618650",
09-16 22:08:00   "admin_roles": [
09-16 22:08:00     "1414419061856796763"
09-16 22:08:00   ],
09-16 22:08:00   "moderator_roles": [
09-16 22:08:00     "1414026783250059274"
09-16 22:08:00   ],
09-16 22:08:00   "voting_roles": [
09-16 22:08:00     "1414026866817236992"
09-16 22:08:00   ],
09-16 22:08:00   "default_timezone": "UTC",
09-16 22:08:00   "watch_party_channel_id": "1413978046523768963",
09-16 22:08:00   "admin_channel_id": "1413978094074855494",
09-16 22:08:00   "vote_cap_enabled": 1,
09-16 22:08:00   "vote_cap_ratio_up": "0.3333",
09-16 22:08:00   "vote_cap_ratio_down": "0.2000",
09-16 22:08:00   "vote_cap_min": 1,
09-16 22:08:00   "created_at": "2025-09-13T08:36:19.000Z",
09-16 22:08:00   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 22:08:00 }] Guild config for 1413732572424437944:
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 22:08:00 2025-09-17 05:08:00 [INFO ] 🎬 Creating TV show recommendation: Chapter Two: Vecna's Curse in Forum channel (movie-night-voting-forum)
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] 🔍 DEBUG: Created TV show embed for: Chapter Two: Vecna's Curse
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 22:08:00 🔍 DEBUG: createForumMoviePost called with: {
09-16 22:08:00   channelId: '1414130515719618650',
09-16 22:08:00   channelName: 'movie-night-voting-forum',
09-16 22:08:00   channelType: 15,
09-16 22:08:00   movieTitle: "Chapter Two: Vecna's Curse",
09-16 22:08:00   hasEmbed: true,
09-16 22:08:00   componentsLength: 0
09-16 22:08:00 }
09-16 22:08:00 2025-09-17 05:08:00 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Chapter Two: Vecna's Curse in channel: movie-night-voting-forum
09-16 22:08:00 🔍 DEBUG: About to call channel.threads.create
09-16 22:08:00 2025-09-17 05:08:00 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Chapter Two: Vecna's Curse (ID: 1417738844295397427) in channel: movie-night-voting-forum
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417738844295397427
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417738844295397427 (up: 0, down: 0)
09-16 22:08:00 2025-09-17 05:08:00 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 22:08:01 2025-09-17 05:08:01 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 22:08:01 2025-09-17 05:08:01 [DEBUG] 💾 Saving forum TV show to database: Chapter Two: Vecna's Curse (Message: 1417738844295397427, Thread: 1417738844295397427)
09-16 22:08:01 🗄️ Using cached table name: movie_sessions
09-16 22:08:01 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 22:08:01   hasMessage: true,
09-16 22:08:01   hasThread: true,
09-16 22:08:01   movieId: 27,
09-16 22:08:01   messageId: '1417738844295397427',
09-16 22:08:01   threadId: '1417738844295397427'
09-16 22:08:01 }
09-16 22:08:01 2025-09-17 05:08:01 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417738845922787420
09-16 22:08:02 🗄️ Using cached table name: movie_sessions
09-16 22:08:04 🗄️ Using cached table name: movie_sessions
09-16 22:08:08 2025-09-17 05:08:08 [DEBUG]  Saved 0 RSVPs for session 2
09-16 22:08:15 2025-09-17 05:08:15 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: The Simpsons, episode: S20E9, where: Test
09-16 22:08:15 2025-09-17 05:08:15 [DEBUG] Content recommendation: The Simpsons (S20E9) on Test
09-16 22:08:15 2025-09-17 05:08:15 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 22:08:15 2025-09-17 05:08:15 [DEBUG] 🔍 Combined search title: The Simpsons S20E09
09-16 22:08:15 2025-09-17 05:08:15 [DEBUG] 🔍 Trying specific episode search for: The Simpsons S20E9
09-16 22:08:15 🔍 Searching for episode: The Simpsons S20E9
09-16 22:08:15 ✅ Found episode: Lisa the Drama Queen (2009)
09-16 22:08:15 2025-09-17 05:08:15 [DEBUG] ✅ Found specific episode: Lisa the Drama Queen
09-16 22:08:15 🗄️ Using cached table name: movie_sessions
09-16 22:08:15 IMDb search failed: Cannot read properties of undefined (reading 'episodeNotFound')
09-16 22:08:16 2025-09-17 05:08:16 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417738906199392361
09-16 22:08:17 🗄️ Using cached table name: movie_sessions
09-16 22:08:17 🔍 DEBUG: createMovieWithImdb (button handler) called with title: The Simpsons S20E09, where: Test, imdbId: tt1291173
09-16 22:08:17 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "Lisa the Drama Queen"
09-16 22:08:17 🗄️ Using cached table name: movie_sessions
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] [{
09-16 22:08:17   "id": 1,
09-16 22:08:17   "guild_id": "1413732572424437944",
09-16 22:08:17   "movie_channel_id": "1414130515719618650",
09-16 22:08:17   "admin_roles": [
09-16 22:08:17     "1414419061856796763"
09-16 22:08:17   ],
09-16 22:08:17   "moderator_roles": [
09-16 22:08:17     "1414026783250059274"
09-16 22:08:17   ],
09-16 22:08:17   "voting_roles": [
09-16 22:08:17     "1414026866817236992"
09-16 22:08:17   ],
09-16 22:08:17   "default_timezone": "UTC",
09-16 22:08:17   "watch_party_channel_id": "1413978046523768963",
09-16 22:08:17   "admin_channel_id": "1413978094074855494",
09-16 22:08:17   "vote_cap_enabled": 1,
09-16 22:08:17   "vote_cap_ratio_up": "0.3333",
09-16 22:08:17   "vote_cap_ratio_down": "0.2000",
09-16 22:08:17   "vote_cap_min": 1,
09-16 22:08:17   "created_at": "2025-09-13T08:36:19.000Z",
09-16 22:08:17   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 22:08:17 }] Guild config for 1413732572424437944:
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 22:08:17 2025-09-17 05:08:17 [INFO ] 🎬 Creating TV show recommendation: Lisa the Drama Queen in Forum channel (movie-night-voting-forum)
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] 🔍 DEBUG: Created TV show embed for: Lisa the Drama Queen
09-16 22:08:17 2025-09-17 05:08:17 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 22:08:17 🔍 DEBUG: createForumMoviePost called with: {
09-16 22:08:17   channelId: '1414130515719618650',
09-16 22:08:17   channelName: 'movie-night-voting-forum',
09-16 22:08:17   channelType: 15,
09-16 22:08:17   movieTitle: 'Lisa the Drama Queen',
09-16 22:08:17   hasEmbed: true,
09-16 22:08:17   componentsLength: 0
09-16 22:08:17 }
09-16 22:08:17 2025-09-17 05:08:17 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Lisa the Drama Queen in channel: movie-night-voting-forum
09-16 22:08:17 🔍 DEBUG: About to call channel.threads.create
09-16 22:08:18 2025-09-17 05:08:18 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Lisa the Drama Queen (ID: 1417738916613722113) in channel: movie-night-voting-forum
09-16 22:08:18 2025-09-17 05:08:18 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417738916613722113
09-16 22:08:18 2025-09-17 05:08:18 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 22:08:18 2025-09-17 05:08:18 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417738916613722113 (up: 0, down: 0)
09-16 22:08:18 2025-09-17 05:08:18 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 22:08:18 2025-09-17 05:08:18 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 22:08:18 2025-09-17 05:08:18 [DEBUG] 💾 Saving forum TV show to database: Lisa the Drama Queen (Message: 1417738916613722113, Thread: 1417738916613722113)
09-16 22:08:18 🗄️ Using cached table name: movie_sessions
09-16 22:08:18 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 22:08:18   hasMessage: true,
09-16 22:08:18   hasThread: true,
09-16 22:08:18   movieId: 28,
09-16 22:08:18   messageId: '1417738916613722113',
09-16 22:08:18   threadId: '1417738916613722113'
09-16 22:08:18 }
09-16 22:08:18 2025-09-17 05:08:18 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417738918606147695
```

---

## 🎯 **CRITICAL TEST: CARRYOVER SYSTEM**

### **Test: Mixed Session Carryover (RETRY)**

**Steps:**

1. Create a movie session, add 1 movie, cancel it
2. Create a TV show session, add 1 TV show, cancel it
3. Create a MIXED session
4. Check that both movie and TV show appear as carryover

**Expected Results:**

- ✅ No "contentType is not defined" errors
- ✅ No "Unknown column 'next_session'" errors
- ✅ Both movie and TV show appear in mixed session
- ✅ Carryover logs show proper content type filtering

**Results:**

- [ ] PASS / [X] FAIL
- **Observations:**
  NO admin channel posts at all for mixed session - impossible to select winner.
  **Log Capture:**

```
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 22:10:25 🗄️ Using cached table name: movie_sessions
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 22:10:25 2025-09-17 05:10:25 [INFO ] ✅ Created Discord event: 🎬 Watch Party (ID: 1417739450154487848) - Duration: 150 minutes
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 📅 Saving event ID 1417739450154487848 to session 5
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🗄️ Database: Updating session 5 with event ID 1417739450154487848
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 📅 Successfully saved event ID to database
09-16 22:10:25 2025-09-17 05:10:25 [INFO ] 📅 Created Discord event: 🎬 Watch Party (1417739450154487848)
09-16 22:10:25 2025-09-17 05:10:25 [INFO ] 🔄 Found 1 carryover movies and 2 carryover TV shows from previous session
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🔄 Added carryover movie: The Matrix
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🔄 Added carryover TV show: Chapter Two: Vecna's Curse
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🔄 Added carryover TV show: Lisa the Drama Queen
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] ✅ Cleared next_session flags for movies
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] ✅ Cleared next_session flags for TV shows
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 22:10:25 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 📝 Creating posts for 1 carryover movies and 2 carryover TV shows
09-16 22:10:25 🔍 DEBUG: createForumMoviePost called with: {
09-16 22:10:25   channelId: '1414130515719618650',
09-16 22:10:25   channelName: 'movie-night-voting-forum',
09-16 22:10:25   channelType: 15,
09-16 22:10:25   movieTitle: 'The Matrix',
09-16 22:10:25   hasEmbed: true,
09-16 22:10:25   componentsLength: 0
09-16 22:10:25 }
09-16 22:10:25 2025-09-17 05:10:25 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: The Matrix in channel: movie-night-voting-forum
09-16 22:10:25 🔍 DEBUG: About to call channel.threads.create
09-16 22:10:25 2025-09-17 05:10:25 [INFO ] [1413732572424437944] ✅ Created forum post: 🎬 The Matrix (ID: 1417739452360429618) in channel: movie-night-voting-forum
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417739452360429618
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417739452360429618 (up: 0, down: 0)
09-16 22:10:25 2025-09-17 05:10:25 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 22:10:26 2025-09-17 05:10:26 [INFO ] 📝 Created forum post for carryover movie: The Matrix (Thread: 1417739452360429618)
09-16 22:10:26 🔍 DEBUG: createForumMoviePost called with: {
09-16 22:10:26   channelId: '1414130515719618650',
09-16 22:10:26   channelName: 'movie-night-voting-forum',
09-16 22:10:26   channelType: 15,
09-16 22:10:26   movieTitle: "Chapter Two: Vecna's Curse",
09-16 22:10:26   hasEmbed: true,
09-16 22:10:26   componentsLength: 0
09-16 22:10:26 }
09-16 22:10:26 2025-09-17 05:10:26 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Chapter Two: Vecna's Curse in channel: movie-night-voting-forum
09-16 22:10:26 🔍 DEBUG: About to call channel.threads.create
09-16 22:10:26 2025-09-17 05:10:26 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Chapter Two: Vecna's Curse (ID: 1417739454084419636) in channel: movie-night-voting-forum
09-16 22:10:26 2025-09-17 05:10:26 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417739454084419636
09-16 22:10:26 2025-09-17 05:10:26 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417739454084419636 (up: 0, down: 0)
09-16 22:10:26 2025-09-17 05:10:26 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 22:10:26 2025-09-17 05:10:26 [INFO ] 📝 Created forum post for carryover TV show: Chapter Two: Vecna's Curse (Thread: 1417739454084419636)
09-16 22:10:26 🔍 DEBUG: createForumMoviePost called with: {
09-16 22:10:26   channelId: '1414130515719618650',
09-16 22:10:26   channelName: 'movie-night-voting-forum',
09-16 22:10:26   channelType: 15,
09-16 22:10:26   movieTitle: 'Lisa the Drama Queen',
09-16 22:10:26   hasEmbed: true,
09-16 22:10:26   componentsLength: 0
09-16 22:10:26 }
09-16 22:10:26 2025-09-17 05:10:26 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Lisa the Drama Queen in channel: movie-night-voting-forum
09-16 22:10:26 🔍 DEBUG: About to call channel.threads.create
09-16 22:10:26 2025-09-17 05:10:26 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Lisa the Drama Queen (ID: 1417739455963598869) in channel: movie-night-voting-forum
09-16 22:10:26 2025-09-17 05:10:26 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417739455963598869
09-16 22:10:26 2025-09-17 05:10:26 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417739455963598869 (up: 0, down: 0)
09-16 22:10:26 2025-09-17 05:10:26 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 22:10:27 2025-09-17 05:10:27 [INFO ] 📝 Created forum post for carryover TV show: Lisa the Drama Queen (Thread: 1417739455963598869)
09-16 22:10:27 🗄️ Using cached table name: movie_sessions
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Found 4 active threads, 0 archived threads
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Lisa the Drama Queen (1417739455963598869) - pinned: false, archived: false
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Chapter Two: Vecna's Curse (1417739454084419636) - pinned: false, archived: false
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Thread: 🎬 The Matrix (1417739452360429618) - pinned: false, archived: false
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417739390461022341) - pinned: false, archived: false
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 22:10:28 2025-09-17 05:10:28 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 22:10:29 2025-09-17 05:10:29 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 22:10:29 2025-09-17 05:10:29 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=mixed
09-16 22:10:29 2025-09-17 05:10:29 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 22:10:30 2025-09-17 05:10:30 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 22:10:30 2025-09-17 05:10:30 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 22:10:30 🗄️ Using cached table name: movie_sessions
09-16 22:10:30 2025-09-17 05:10:30 [DEBUG] 🔧 Created and pinned admin control panel
09-16 22:10:30 2025-09-17 05:10:30 [DEBUG] ⏰ Session 5 voting ends in 24 days - will be checked daily
09-16 22:10:30 2025-09-17 05:10:30 [INFO ] 🎬 Voting session created: Watch Party - Friday, October 10, 2025 by berman_wa
```

---

## 🎯 **CRITICAL TEST: DATABASE MIGRATION**

### **Test: Migration 35 Execution**

**Steps:**

1. Check bot startup logs for Migration 35
2. Verify `next_session` column exists in `tv_shows` table

**Expected Results:**

- ✅ Migration 35 runs successfully on startup
- ✅ "Added next_session column to tv_shows table" or "already exists" message
- ✅ No migration errors

**Results:**

- [x] PASS / [ ] FAIL
- **Migration Log:**

```
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] Migration 19: Backfilled session_participants.guild_id mismatches
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] Migration 19: Backfilled session_attendees.guild_id mismatches
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] Migration 19: Cleared movies.session_id that pointed across guilds
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] Migration 19: Cleared movie_sessions.winner_message_id mismatches
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] Migration 19: Cleared movie_sessions.associated_movie_id mismatches
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movies` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 19 fk_movies_session skipped/unsupported:
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 19 fk_sessions_winner_movie skipped/unsupported:
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 19 fk_sessions_associated_movie skipped/unsupported:
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] ✅ Migration 19: Guild-scoped constraints and FKs applied
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movies` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 20 fk_movies_session skipped/unsupported:
09-16 22:11:32 2025-09-17 05:11:32 [WARN ] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 20 fk_sessions_winner_movie warning:
09-16 22:11:32 2025-09-17 05:11:32 [WARN ] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 20 fk_sessions_associated_movie warning:
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] ✅ Migration 20: Charsets aligned and composite FKs ensured
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movies` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 21 fk_movies_session skipped/unsupported:
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 21 fk_sessions_winner_movie skipped/unsupported:
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 21 fk_sessions_associated_movie skipped/unsupported:
09-16 22:11:32 2025-09-17 05:11:32 [DEBUG] ✅ Migration 21: Orphans cleaned and FKs re-attempted
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movies` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 22 fk_movies_session skipped/unsupported:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 22 fk_sessions_winner_movie skipped/unsupported:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 22 fk_sessions_associated_movie skipped/unsupported:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [[
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movies",
09-16 22:11:33     "COLUMN_NAME": "guild_id",
09-16 22:11:33     "COLUMN_TYPE": "varchar(20)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": "utf8mb4_unicode_ci",
09-16 22:11:33     "CHARACTER_SET_NAME": "utf8mb4"
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movies",
09-16 22:11:33     "COLUMN_NAME": "id",
09-16 22:11:33     "COLUMN_TYPE": "int(11)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": null,
09-16 22:11:33     "CHARACTER_SET_NAME": null
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movies",
09-16 22:11:33     "COLUMN_NAME": "message_id",
09-16 22:11:33     "COLUMN_TYPE": "varchar(20)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": "utf8mb4_unicode_ci",
09-16 22:11:33     "CHARACTER_SET_NAME": "utf8mb4"
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movies",
09-16 22:11:33     "COLUMN_NAME": "session_id",
09-16 22:11:33     "COLUMN_TYPE": "int(11)",
09-16 22:11:33     "IS_NULLABLE": "YES",
09-16 22:11:33     "COLLATION_NAME": null,
09-16 22:11:33     "CHARACTER_SET_NAME": null
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movie_sessions",
09-16 22:11:33     "COLUMN_NAME": "associated_movie_id",
09-16 22:11:33     "COLUMN_TYPE": "varchar(20)",
09-16 22:11:33     "IS_NULLABLE": "YES",
09-16 22:11:33     "COLLATION_NAME": "utf8mb4_unicode_ci",
09-16 22:11:33     "CHARACTER_SET_NAME": "utf8mb4"
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movie_sessions",
09-16 22:11:33     "COLUMN_NAME": "guild_id",
09-16 22:11:33     "COLUMN_TYPE": "varchar(20)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": "utf8mb4_unicode_ci",
09-16 22:11:33     "CHARACTER_SET_NAME": "utf8mb4"
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movie_sessions",
09-16 22:11:33     "COLUMN_NAME": "id",
09-16 22:11:33     "COLUMN_TYPE": "int(11)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": null,
09-16 22:11:33     "CHARACTER_SET_NAME": null
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "movie_sessions",
09-16 22:11:33     "COLUMN_NAME": "winner_message_id",
09-16 22:11:33     "COLUMN_TYPE": "varchar(20)",
09-16 22:11:33     "IS_NULLABLE": "YES",
09-16 22:11:33     "COLLATION_NAME": "utf8mb4_unicode_ci",
09-16 22:11:33     "CHARACTER_SET_NAME": "utf8mb4"
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "session_attendees",
09-16 22:11:33     "COLUMN_NAME": "guild_id",
09-16 22:11:33     "COLUMN_TYPE": "varchar(20)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": "utf8mb4_unicode_ci",
09-16 22:11:33     "CHARACTER_SET_NAME": "utf8mb4"
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "session_attendees",
09-16 22:11:33     "COLUMN_NAME": "id",
09-16 22:11:33     "COLUMN_TYPE": "int(11)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": null,
09-16 22:11:33     "CHARACTER_SET_NAME": null
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "session_attendees",
09-16 22:11:33     "COLUMN_NAME": "session_id",
09-16 22:11:33     "COLUMN_TYPE": "int(11)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": null,
09-16 22:11:33     "CHARACTER_SET_NAME": null
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "session_participants",
09-16 22:11:33     "COLUMN_NAME": "guild_id",
09-16 22:11:33     "COLUMN_TYPE": "varchar(20)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": "utf8mb4_unicode_ci",
09-16 22:11:33     "CHARACTER_SET_NAME": "utf8mb4"
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "session_participants",
09-16 22:11:33     "COLUMN_NAME": "id",
09-16 22:11:33     "COLUMN_TYPE": "int(11)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": null,
09-16 22:11:33     "CHARACTER_SET_NAME": null
09-16 22:11:33   },
09-16 22:11:33   {
09-16 22:11:33     "TABLE_NAME": "session_participants",
09-16 22:11:33     "COLUMN_NAME": "session_id",
09-16 22:11:33     "COLUMN_TYPE": "int(11)",
09-16 22:11:33     "IS_NULLABLE": "NO",
09-16 22:11:33     "COLLATION_NAME": null,
09-16 22:11:33     "CHARACTER_SET_NAME": null
09-16 22:11:33   }
09-16 22:11:33 ]] Migration 22 diagnostics:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [{"version":"10.11.6-MariaDB-log","comment":"MariaDB Server"}] Migration 22 MySQL version:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 23: Simple FKs added and guild-scope triggers ensured
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [{"Table":"movies","Create Table":"CREATE TABLE `movies` (\n  `id` int(11) NOT NULL AUTO_INCREMENT,\n  `message_id` varchar(20) NOT NULL,\n  `thread_id` varchar(20) DEFAULT NULL,\n  `channel_type` enum('text','forum') DEFAULT 'text',\n  `guild_id` varchar(20) NOT NULL,\n  `channel_id` varchar(20) NOT NULL,\n  `title` varchar(255) NOT NULL,\n  `content_type` enum('movie','series') DEFAULT 'movie',\n  `season_number` int(11) DEFAULT NULL,\n  `episode_number` int(11) DEFAULT NULL,\n  `total_seasons` int(11) DEFAULT NULL,\n  `movie_uid` varchar(64) NOT NULL,\n  `where_to_watch` varchar(255) NOT NULL,\n  `recommended_by` varchar(20) NOT NULL,\n  `imdb_id` varchar(20) DEFAULT NULL,\n  `imdb_data` longtext DEFAULT NULL CHECK (json_valid(`imdb_data`)),\n  `poster_url` varchar(500) DEFAULT NULL,\n  `status` enum('pending','watched','planned','skipped','scheduled','banned') DEFAULT 'pending',\n  `session_id` int(11) DEFAULT NULL,\n  `next_session` tinyint(1) DEFAULT 0,\n  `is_banned` tinyint(1) DEFAULT 0,\n  `watch_count` int(11) DEFAULT 0,\n  `created_at` timestamp NULL DEFAULT current_timestamp(),\n  `watched_at` timestamp NULL DEFAULT NULL,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `message_id` (`message_id`),\n  UNIQUE KEY `uniq_movies_guild_message` (`guild_id`,`message_id`),\n  KEY `idx_guild_status` (`guild_id`,`status`),\n  KEY `idx_message_id` (`message_id`),\n  KEY `idx_movie_uid` (`guild_id`,`movie_uid`),\n  KEY `idx_banned` (`guild_id`,`is_banned`),\n  KEY `idx_movies_gid_sid` (`guild_id`,`session_id`),\n  KEY `fk_movies_session_simple` (`session_id`),\n  CONSTRAINT `fk_movies_session_simple` FOREIGN KEY (`session_id`) REFERENCES `movie_sessions` (`id`) ON DELETE SET NULL\n) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"}] Migration 22 SHOW CREATE TABLE movies:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [{"Table":"movie_sessions","Create Table":"CREATE TABLE `movie_sessions` (\n  `id` int(11) NOT NULL,\n  `guild_id` varchar(20) NOT NULL,\n  `channel_id` varchar(20) NOT NULL,\n  `name` varchar(255) NOT NULL,\n  `description` mediumtext DEFAULT NULL,\n  `scheduled_date` datetime DEFAULT NULL,\n  `voting_end_time` datetime DEFAULT NULL,\n  `timezone` varchar(50) DEFAULT 'UTC',\n  `content_type` enum('movie','tv_show','mixed') DEFAULT 'movie',\n  `voting_deadline` datetime DEFAULT NULL,\n  `status` enum('planning','voting','decided','active','completed','cancelled') DEFAULT 'planning',\n  `winner_message_id` varchar(20) DEFAULT NULL,\n  `associated_movie_id` varchar(20) DEFAULT NULL,\n  `discord_event_id` varchar(20) DEFAULT NULL,\n  `rsvp_user_ids` longtext DEFAULT NULL CHECK (json_valid(`rsvp_user_ids`)),\n  `created_by` varchar(20) NOT NULL,\n  `created_at` timestamp NULL DEFAULT current_timestamp(),\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uniq_ms_gid_id` (`guild_id`,`id`),\n  KEY `idx_guild_status` (`guild_id`,`status`),\n  KEY `idx_associated_movie` (`associated_movie_id`),\n  KEY `idx_discord_event` (`discord_event_id`),\n  KEY `idx_movie_sessions_gid_id` (`guild_id`,`id`),\n  KEY `idx_ms_gid_winner` (`guild_id`,`winner_message_id`),\n  KEY `idx_ms_gid_assoc` (`guild_id`,`associated_movie_id`),\n  KEY `fk_sessions_winner_movie_simple` (`winner_message_id`),\n  CONSTRAINT `fk_sessions_associated_movie_simple` FOREIGN KEY (`associated_movie_id`) REFERENCES `movies` (`message_id`) ON DELETE SET NULL,\n  CONSTRAINT `fk_sessions_winner_movie_simple` FOREIGN KEY (`winner_message_id`) REFERENCES `movies` (`message_id`) ON DELETE SET NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"}] Migration 22 SHOW CREATE TABLE movie_sessions:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 22: Column normalization and FK retry complete
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 24: Ensured AUTO_INCREMENT on movie_sessions.id
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 24: PRIMARY KEY already present on movie_sessions
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 25: Backfilled poster_url from imdb_data
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 26: UNIQUE KEY uniq_ms_gid_id already exists
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movies` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 26 fk_movies_session skipped/unsupported:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 26 fk_sessions_winner_movie skipped/unsupported:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] [Can't create table `customer_1122173_movie-night-beta`.`movie_sessions` (errno: 150 "Foreign key constraint is incorrectly formed")] Migration 26 fk_sessions_associated_movie skipped/unsupported:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 26: Ensured UNIQUE(parent) and retried composite FKs
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 27: Vote cap settings ensured on guild_config
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 28: imdb_cache table ensured
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 31: TV show support fields ensured on movies table
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 32: Created tv_shows and votes_tv tables
09-16 22:11:33 2025-09-17 05:11:33 [WARN ] [Duplicate column name 'content_type'] Migration 33 warning:
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 34: Dropped empty watch_sessions table, keeping movie_sessions with data
09-16 22:11:33 2025-09-17 05:11:33 [DEBUG] ✅ Migration 35: next_session column already exists in tv_shows table
09-16 22:11:33 2025-09-17 05:11:33 [INFO ] ✅ Database migrations completed
09-16 22:11:33 2025-09-17 05:11:33 [INFO ] ✅ Database tables initialized
```

---

## 📊 **FINAL PRODUCTION READINESS ASSESSMENT**

### **Critical Issues Status:**

- [ ] ✅ TV show admin channel posts working
- [ ] ✅ Carryover system functional
- [ ] ✅ Database schema complete
- [x] ✅ No critical errors in logs

### **Production Decision:**

- [ ] ✅ **READY FOR PRODUCTION** - All critical issues resolved
- [x] ❌ **NOT READY** - Issues remain: ******\_\_\_******

### **Final Notes:**

```
 - STILL SEEING movie_sessions table in database. This should be watch_sessions. Period. Figure out a way to rename it or create watch_sessions and copy data over. Why is this so hard???
 - Issue with SYnc Channel now:
⚠️ Sync completed with errors:
Voting channel: forumChannels.createNoActiveSessionPost is not a function (TypeError: forumChannels.createNoActiveSessionPost is not a function)

Synced:
 - Need to add TV Shows to Deep Purge list (and purge separately from Movies)
```

---

**Testing completed on:** ******\_\_\_******
**Bot restarted before testing:** [ ] Yes / [ ] No
**Migration 35 executed:** [ ] Yes / [ ] No
