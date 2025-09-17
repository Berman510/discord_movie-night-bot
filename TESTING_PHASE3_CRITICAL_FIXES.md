# 🚨 CRITICAL FIXES TESTING - PHASE 3

**PRODUCTION BLOCKERS ADDRESSED:**
1. **TV Show Admin Channel Posts** - Fixed `movieId: undefined` issue
2. **Content-Type Carryover Isolation** - Prevents movies in TV sessions and vice versa
3. **Complete TV Show Database Integration** - All functions now support TV shows
4. **Session Cancellation Parity** - Both content types marked for carryover

---

## 🎯 **TEST SUITE 9: TV SHOW ADMIN CHANNEL POSTS (CRITICAL)**

### **Test 9.1: TV Show Winner Selection**
**Steps:**
1. Create a TV show session with 2-3 TV shows
2. Close voting and select a winner
3. Check admin channel for TV show posts

**Expected Results:**
- ✅ TV shows appear in admin channel with proper embeds
- ✅ Winner selection buttons work for TV shows
- ✅ No `movieId: undefined` errors in logs

**Results:**
- [ ] PASS / [X] FAIL
- **Observations:**
No admin posts created for TV shows still - I am unable to select a winner as a result.
**Log Capture:**
```
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 21:43:44 🗄️ Using cached table name: movie_sessions
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 21:43:44 2025-09-17 04:43:44 [INFO ] ✅ Created Discord event: 🎬 TV Show Night (ID: 1417732737070137467) - Duration: 150 minutes
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 📅 Saving event ID 1417732737070137467 to session 10
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 🗄️ Database: Updating session 10 with event ID 1417732737070137467
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 21:43:44 2025-09-17 04:43:44 [DEBUG] 📅 Successfully saved event ID to database
09-16 21:43:44 2025-09-17 04:43:44 [INFO ] 📅 Created Discord event: 🎬 TV Show Night (1417732737070137467)
09-16 21:43:45 Error handling carryover content: contentType is not defined
09-16 21:43:45 2025-09-17 04:43:45 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 21:43:45 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 21:43:45 🗄️ Using cached table name: movie_sessions
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 Found 1 active threads, 0 archived threads
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417730108290109561) - pinned: false, archived: false
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 21:43:46 2025-09-17 04:43:46 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=tv_show
09-16 21:43:47 2025-09-17 04:43:47 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 21:43:47 2025-09-17 04:43:47 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 21:43:47 2025-09-17 04:43:47 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:43:47 🗄️ Using cached table name: movie_sessions
09-16 21:43:48 2025-09-17 04:43:48 [DEBUG] 🔧 Created and pinned admin control panel
09-16 21:43:48 2025-09-17 04:43:48 [DEBUG] ⏰ Session 10 voting ends in 24 days - will be checked daily
09-16 21:43:48 2025-09-17 04:43:48 [INFO ] 🎬 Voting session created: TV Show Night - Friday, October 10, 2025 by berman_wa
09-16 21:43:53 🗄️ Using cached table name: movie_sessions
09-16 21:44:03 2025-09-17 04:44:03 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Breaking Bad, episode: S1E3, where: Test
09-16 21:44:03 2025-09-17 04:44:03 [DEBUG] Content recommendation: Breaking Bad (S1E3) on Test
09-16 21:44:03 2025-09-17 04:44:03 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 21:44:03 2025-09-17 04:44:03 [DEBUG] 🔍 Combined search title: Breaking Bad S01E03
09-16 21:44:03 2025-09-17 04:44:03 [DEBUG] 🔍 Trying specific episode search for: Breaking Bad S1E3
09-16 21:44:03 🔍 Searching for episode: Breaking Bad S1E3
09-16 21:44:03 ✅ Found episode: ...And the Bag's in the River (2008)
09-16 21:44:03 2025-09-17 04:44:03 [DEBUG] ✅ Found specific episode: ...And the Bag's in the River
09-16 21:44:03 🗄️ Using cached table name: movie_sessions
09-16 21:44:03 IMDb search failed: Cannot read properties of undefined (reading 'episodeNotFound')
09-16 21:44:04 2025-09-17 04:44:04 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417732816560717876
09-16 21:44:07 🗄️ Using cached table name: movie_sessions
09-16 21:44:07 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Breaking Bad S01E03, where: Test, imdbId: tt1054725
09-16 21:44:07 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "...And the Bag's in the River"
09-16 21:44:07 🗄️ Using cached table name: movie_sessions
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] [{
09-16 21:44:07   "id": 1,
09-16 21:44:07   "guild_id": "1413732572424437944",
09-16 21:44:07   "movie_channel_id": "1414130515719618650",
09-16 21:44:07   "admin_roles": [
09-16 21:44:07     "1414419061856796763"
09-16 21:44:07   ],
09-16 21:44:07   "moderator_roles": [
09-16 21:44:07     "1414026783250059274"
09-16 21:44:07   ],
09-16 21:44:07   "voting_roles": [
09-16 21:44:07     "1414026866817236992"
09-16 21:44:07   ],
09-16 21:44:07   "default_timezone": "UTC",
09-16 21:44:07   "watch_party_channel_id": "1413978046523768963",
09-16 21:44:07   "admin_channel_id": "1413978094074855494",
09-16 21:44:07   "vote_cap_enabled": 1,
09-16 21:44:07   "vote_cap_ratio_up": "0.3333",
09-16 21:44:07   "vote_cap_ratio_down": "0.2000",
09-16 21:44:07   "vote_cap_min": 1,
09-16 21:44:07   "created_at": "2025-09-13T08:36:19.000Z",
09-16 21:44:07   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 21:44:07 }] Guild config for 1413732572424437944:
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 21:44:07 2025-09-17 04:44:07 [INFO ] 🎬 Creating TV show recommendation: ...And the Bag's in the River in Forum channel (movie-night-voting-forum)
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] 🔍 DEBUG: Created TV show embed for: ...And the Bag's in the River
09-16 21:44:07 2025-09-17 04:44:07 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 21:44:07 🔍 DEBUG: createForumMoviePost called with: {
09-16 21:44:07   channelId: '1414130515719618650',
09-16 21:44:07   channelName: 'movie-night-voting-forum',
09-16 21:44:07   channelType: 15,
09-16 21:44:07   movieTitle: "...And the Bag's in the River",
09-16 21:44:07   hasEmbed: true,
09-16 21:44:07   componentsLength: 0
09-16 21:44:07 }
09-16 21:44:07 2025-09-17 04:44:07 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: ...And the Bag's in the River in channel: movie-night-voting-forum
09-16 21:44:07 🔍 DEBUG: About to call channel.threads.create
09-16 21:44:08 2025-09-17 04:44:08 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 ...And the Bag's in the River (ID: 1417732834344308817) in channel: movie-night-voting-forum
09-16 21:44:08 2025-09-17 04:44:08 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417732834344308817
09-16 21:44:08 2025-09-17 04:44:08 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 21:44:08 2025-09-17 04:44:08 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417732834344308817 (up: 0, down: 0)
09-16 21:44:08 2025-09-17 04:44:08 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 21:44:09 🗄️ Using cached table name: movie_sessions
09-16 21:44:09 2025-09-17 04:44:09 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 21:44:09 2025-09-17 04:44:09 [DEBUG] 💾 Saving forum TV show to database: ...And the Bag's in the River (Message: 1417732834344308817, Thread: 1417732834344308817)
09-16 21:44:09 🗄️ Using cached table name: movie_sessions
09-16 21:44:09 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 21:44:09   hasMessage: true,
09-16 21:44:09   hasThread: true,
09-16 21:44:09   movieId: 22,
09-16 21:44:09   messageId: '1417732834344308817',
09-16 21:44:09   threadId: '1417732834344308817'
09-16 21:44:09 }
09-16 21:44:09 2025-09-17 04:44:09 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417732841344602162
09-16 21:44:17 2025-09-17 04:44:17 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Breaking Bad, episode: S2E2, where: Test
09-16 21:44:17 2025-09-17 04:44:17 [DEBUG] Content recommendation: Breaking Bad (S2E2) on Test
09-16 21:44:17 2025-09-17 04:44:17 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 21:44:17 2025-09-17 04:44:17 [DEBUG] 🔍 Combined search title: Breaking Bad S02E02
09-16 21:44:17 2025-09-17 04:44:17 [DEBUG] 🔍 Trying specific episode search for: Breaking Bad S2E2
09-16 21:44:17 🔍 Searching for episode: Breaking Bad S2E2
09-16 21:44:18 ✅ Found episode: Grilled (2009)
09-16 21:44:18 2025-09-17 04:44:18 [DEBUG] ✅ Found specific episode: Grilled
09-16 21:44:18 🗄️ Using cached table name: movie_sessions
09-16 21:44:18 IMDb search failed: Cannot read properties of undefined (reading 'episodeNotFound')
09-16 21:44:18 2025-09-17 04:44:18 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417732875909988493
09-16 21:44:20 🗄️ Using cached table name: movie_sessions
09-16 21:44:20 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Breaking Bad S02E02, where: Test, imdbId: tt1232249
09-16 21:44:20 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "Grilled"
09-16 21:44:20 🗄️ Using cached table name: movie_sessions
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] [{
09-16 21:44:20   "id": 1,
09-16 21:44:20   "guild_id": "1413732572424437944",
09-16 21:44:20   "movie_channel_id": "1414130515719618650",
09-16 21:44:20   "admin_roles": [
09-16 21:44:20     "1414419061856796763"
09-16 21:44:20   ],
09-16 21:44:20   "moderator_roles": [
09-16 21:44:20     "1414026783250059274"
09-16 21:44:20   ],
09-16 21:44:20   "voting_roles": [
09-16 21:44:20     "1414026866817236992"
09-16 21:44:20   ],
09-16 21:44:20   "default_timezone": "UTC",
09-16 21:44:20   "watch_party_channel_id": "1413978046523768963",
09-16 21:44:20   "admin_channel_id": "1413978094074855494",
09-16 21:44:20   "vote_cap_enabled": 1,
09-16 21:44:20   "vote_cap_ratio_up": "0.3333",
09-16 21:44:20   "vote_cap_ratio_down": "0.2000",
09-16 21:44:20   "vote_cap_min": 1,
09-16 21:44:20   "created_at": "2025-09-13T08:36:19.000Z",
09-16 21:44:20   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 21:44:20 }] Guild config for 1413732572424437944:
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 21:44:20 2025-09-17 04:44:20 [INFO ] 🎬 Creating TV show recommendation: Grilled in Forum channel (movie-night-voting-forum)
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 🔍 DEBUG: Created TV show embed for: Grilled
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 21:44:20 🔍 DEBUG: createForumMoviePost called with: {
09-16 21:44:20   channelId: '1414130515719618650',
09-16 21:44:20   channelName: 'movie-night-voting-forum',
09-16 21:44:20   channelType: 15,
09-16 21:44:20   movieTitle: 'Grilled',
09-16 21:44:20   hasEmbed: true,
09-16 21:44:20   componentsLength: 0
09-16 21:44:20 }
09-16 21:44:20 2025-09-17 04:44:20 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Grilled in channel: movie-night-voting-forum
09-16 21:44:20 🔍 DEBUG: About to call channel.threads.create
09-16 21:44:20 2025-09-17 04:44:20 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Grilled (ID: 1417732886424981645) in channel: movie-night-voting-forum
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417732886424981645
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417732886424981645 (up: 0, down: 0)
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 💾 Saving forum TV show to database: Grilled (Message: 1417732886424981645, Thread: 1417732886424981645)
09-16 21:44:20 🗄️ Using cached table name: movie_sessions
09-16 21:44:20 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 21:44:20   hasMessage: true,
09-16 21:44:20   hasThread: true,
09-16 21:44:20   movieId: 23,
09-16 21:44:20   messageId: '1417732886424981645',
09-16 21:44:20   threadId: '1417732886424981645'
09-16 21:44:20 }
09-16 21:44:20 2025-09-17 04:44:20 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417732888182653069
09-16 21:44:22 🗄️ Using cached table name: movie_sessions
09-16 21:44:31 🗄️ Using cached table name: movie_sessions
09-16 21:44:33 2025-09-17 04:44:33 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Breaking Bad, episode: S3E3, where: Test
09-16 21:44:33 2025-09-17 04:44:33 [DEBUG] Content recommendation: Breaking Bad (S3E3) on Test
09-16 21:44:33 2025-09-17 04:44:33 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 21:44:33 2025-09-17 04:44:33 [DEBUG] 🔍 Combined search title: Breaking Bad S03E03
09-16 21:44:33 2025-09-17 04:44:33 [DEBUG] 🔍 Trying specific episode search for: Breaking Bad S3E3
09-16 21:44:33 🔍 Searching for episode: Breaking Bad S3E3
09-16 21:44:33 ✅ Found episode: I.F.T. (2010)
09-16 21:44:33 2025-09-17 04:44:33 [DEBUG] ✅ Found specific episode: I.F.T.
09-16 21:44:33 🗄️ Using cached table name: movie_sessions
09-16 21:44:33 IMDb search failed: Cannot read properties of undefined (reading 'episodeNotFound')
09-16 21:44:34 2025-09-17 04:44:34 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417732942553284748
09-16 21:44:35 🗄️ Using cached table name: movie_sessions
09-16 21:44:35 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Breaking Bad S03E03, where: Test, imdbId: tt1615187
09-16 21:44:35 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "I.F.T."
09-16 21:44:35 🗄️ Using cached table name: movie_sessions
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] [{
09-16 21:44:35   "id": 1,
09-16 21:44:35   "guild_id": "1413732572424437944",
09-16 21:44:35   "movie_channel_id": "1414130515719618650",
09-16 21:44:35   "admin_roles": [
09-16 21:44:35     "1414419061856796763"
09-16 21:44:35   ],
09-16 21:44:35   "moderator_roles": [
09-16 21:44:35     "1414026783250059274"
09-16 21:44:35   ],
09-16 21:44:35   "voting_roles": [
09-16 21:44:35     "1414026866817236992"
09-16 21:44:35   ],
09-16 21:44:35   "default_timezone": "UTC",
09-16 21:44:35   "watch_party_channel_id": "1413978046523768963",
09-16 21:44:35   "admin_channel_id": "1413978094074855494",
09-16 21:44:35   "vote_cap_enabled": 1,
09-16 21:44:35   "vote_cap_ratio_up": "0.3333",
09-16 21:44:35   "vote_cap_ratio_down": "0.2000",
09-16 21:44:35   "vote_cap_min": 1,
09-16 21:44:35   "created_at": "2025-09-13T08:36:19.000Z",
09-16 21:44:35   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 21:44:35 }] Guild config for 1413732572424437944:
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 21:44:35 2025-09-17 04:44:35 [INFO ] 🎬 Creating TV show recommendation: I.F.T. in Forum channel (movie-night-voting-forum)
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 🔍 DEBUG: Created TV show embed for: I.F.T.
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 21:44:35 🔍 DEBUG: createForumMoviePost called with: {
09-16 21:44:35   channelId: '1414130515719618650',
09-16 21:44:35   channelName: 'movie-night-voting-forum',
09-16 21:44:35   channelType: 15,
09-16 21:44:35   movieTitle: 'I.F.T.',
09-16 21:44:35   hasEmbed: true,
09-16 21:44:35   componentsLength: 0
09-16 21:44:35 }
09-16 21:44:35 2025-09-17 04:44:35 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: I.F.T. in channel: movie-night-voting-forum
09-16 21:44:35 🔍 DEBUG: About to call channel.threads.create
09-16 21:44:35 2025-09-17 04:44:35 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 I.F.T. (ID: 1417732950161752064) in channel: movie-night-voting-forum
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417732950161752064
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417732950161752064 (up: 0, down: 0)
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 21:44:35 2025-09-17 04:44:35 [DEBUG] 💾 Saving forum TV show to database: I.F.T. (Message: 1417732950161752064, Thread: 1417732950161752064)
09-16 21:44:35 🗄️ Using cached table name: movie_sessions
09-16 21:44:35 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 21:44:35   hasMessage: true,
09-16 21:44:35   hasThread: true,
09-16 21:44:35   movieId: 24,
09-16 21:44:35   messageId: '1417732950161752064',
09-16 21:44:35   threadId: '1417732950161752064'
09-16 21:44:35 }
09-16 21:44:36 2025-09-17 04:44:36 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417732952057446433
```

---

## 🎯 **TEST SUITE 10: CONTENT-TYPE CARRYOVER ISOLATION (CRITICAL)**

### **Test 10.1: Movie Session Carryover Isolation**
**Steps:**
1. Create a TV show session with 2 TV shows
2. Cancel the session (to mark TV shows for carryover)
3. Create a MOVIE session
4. Check that only movies appear, no TV shows

**Expected Results:**
- ✅ Movie session only shows movies
- ✅ TV shows from cancelled session do NOT appear
- ✅ Logs show content-type filtering working

**Results:**
- [X] PASS / [ ] FAIL
- **Observations:**

### **Test 10.2: TV Show Session Carryover Isolation**
**Steps:**
1. Create a movie session with 2 movies
2. Cancel the session (to mark movies for carryover)
3. Create a TV SHOW session
4. Check that only TV shows appear, no movies

**Expected Results:**
- ✅ TV show session only shows TV shows
- ✅ Movies from cancelled session do NOT appear
- ✅ Logs show content-type filtering working

**Results:**
- [X] PASS / [ ] FAIL
- **Observations:**

### **Test 10.3: Mixed Session Gets Both Content Types**
**Steps:**
1. Have both movies and TV shows marked for carryover (from previous tests)
2. Create a MIXED session
3. Check that both movies and TV shows appear

**Expected Results:**
- ✅ Mixed session shows both movies and TV shows
- ✅ All carryover content appears regardless of type
- ✅ Logs show both content types being processed

**Results:**
- [ ] PASS / [X] FAIL
- **Observations:**
No carryover content at all
**Log Capture:**
09-16 21:48:31 🗄️ Using cached table name: movie_sessions
09-16 21:48:44 🗄️ Using cached table name: movie_sessions
09-16 21:48:45 2025-09-17 04:48:45 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:48:45 🗄️ Using cached table name: movie_sessions
09-16 21:48:45 2025-09-17 04:48:45 [DEBUG] 🔧 Updated pinned admin control panel
09-16 21:48:45 🗑️ Admin purge executed by berman_wa in guild Berman_WA's server
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 21:48:53 🗄️ Using cached table name: movie_sessions
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 21:48:53 2025-09-17 04:48:53 [INFO ] ✅ Created Discord event: 🎬 Movie Night (ID: 1417734031495266405) - Duration: 150 minutes
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 📅 Saving event ID 1417734031495266405 to session 12
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 🗄️ Database: Updating session 12 with event ID 1417734031495266405
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 📅 Successfully saved event ID to database
09-16 21:48:53 2025-09-17 04:48:53 [INFO ] 📅 Created Discord event: 🎬 Movie Night (1417734031495266405)
09-16 21:48:53 Error handling carryover content: contentType is not defined
09-16 21:48:53 2025-09-17 04:48:53 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 21:48:53 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 21:48:53 🗄️ Using cached table name: movie_sessions
09-16 21:48:54 2025-09-17 04:48:54 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:48:54 2025-09-17 04:48:54 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 21:48:54 2025-09-17 04:48:54 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:48:55 2025-09-17 04:48:55 [DEBUG] [1413732572424437944] 📋 Found 0 active threads, 0 archived threads
09-16 21:48:55 2025-09-17 04:48:55 [DEBUG] [1413732572424437944] 📋 Found 0 system posts, pinned post: none
09-16 21:48:55 2025-09-17 04:48:55 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=movie
09-16 21:48:55 2025-09-17 04:48:55 [DEBUG] [1413732572424437944] 📋 Created new recommendation post
09-16 21:48:56 2025-09-17 04:48:56 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 21:48:56 2025-09-17 04:48:56 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:48:56 🗄️ Using cached table name: movie_sessions
09-16 21:48:57 2025-09-17 04:48:57 [DEBUG] 🔧 Created and pinned admin control panel
09-16 21:48:57 2025-09-17 04:48:57 [DEBUG] ⏰ Session 12 voting ends in 24 days - will be checked daily
09-16 21:48:57 2025-09-17 04:48:57 [INFO ] 🎬 Voting session created: Movie Night - Friday, October 10, 2025 by berman_wa
09-16 21:49:04 🗄️ Using cached table name: movie_sessions
09-16 21:49:09 2025-09-17 04:49:09 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: The Matrix, episode: null, where: Test
09-16 21:49:09 2025-09-17 04:49:09 [DEBUG] Content recommendation: The Matrix on Test
09-16 21:49:09 🗄️ Using cached table name: movie_sessions
09-16 21:49:10 2025-09-17 04:49:10 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417734100193644617
09-16 21:49:11 🗄️ Using cached table name: movie_sessions
09-16 21:49:11 🔍 DEBUG: createMovieWithImdb (button handler) called with title: The Matrix, where: Test, imdbId: tt0133093
09-16 21:49:11 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] 🔍 DEBUG: Detected content type: movie for "The Matrix"
09-16 21:49:11 🗄️ Using cached table name: movie_sessions
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] [{
09-16 21:49:11   "id": 1,
09-16 21:49:11   "guild_id": "1413732572424437944",
09-16 21:49:11   "movie_channel_id": "1414130515719618650",
09-16 21:49:11   "admin_roles": [
09-16 21:49:11     "1414419061856796763"
09-16 21:49:11   ],
09-16 21:49:11   "moderator_roles": [
09-16 21:49:11     "1414026783250059274"
09-16 21:49:11   ],
09-16 21:49:11   "voting_roles": [
09-16 21:49:11     "1414026866817236992"
09-16 21:49:11   ],
09-16 21:49:11   "default_timezone": "UTC",
09-16 21:49:11   "watch_party_channel_id": "1413978046523768963",
09-16 21:49:11   "admin_channel_id": "1413978094074855494",
09-16 21:49:11   "vote_cap_enabled": 1,
09-16 21:49:11   "vote_cap_ratio_up": "0.3333",
09-16 21:49:11   "vote_cap_ratio_down": "0.2000",
09-16 21:49:11   "vote_cap_min": 1,
09-16 21:49:11   "created_at": "2025-09-13T08:36:19.000Z",
09-16 21:49:11   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 21:49:11 }] Guild config for 1413732572424437944:
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 21:49:11 2025-09-17 04:49:11 [INFO ] 🎬 Creating movie recommendation: The Matrix in Forum channel (movie-night-voting-forum)
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] 🔍 DEBUG: Calling createForumMovieRecommendation
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMovieRecommendation called with:
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] 🔍 DEBUG: Created movie embed for: The Matrix
09-16 21:49:11 2025-09-17 04:49:11 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost
09-16 21:49:11 🔍 DEBUG: createForumMoviePost called with: {
09-16 21:49:11   channelId: '1414130515719618650',
09-16 21:49:11   channelName: 'movie-night-voting-forum',
09-16 21:49:11   channelType: 15,
09-16 21:49:11   movieTitle: 'The Matrix',
09-16 21:49:11   hasEmbed: true,
09-16 21:49:11   componentsLength: 0
09-16 21:49:11 }
09-16 21:49:11 2025-09-17 04:49:11 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: The Matrix in channel: movie-night-voting-forum
09-16 21:49:11 🔍 DEBUG: About to call channel.threads.create
09-16 21:49:12 2025-09-17 04:49:12 [INFO ] [1413732572424437944] ✅ Created forum post: 🎬 The Matrix (ID: 1417734108263481376) in channel: movie-night-voting-forum
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417734108263481376
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417734108263481376 (up: 0, down: 0)
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] 🔍 DEBUG: Created voting buttons for forum post: 1417734108263481376
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] 💾 Saving forum movie to database: The Matrix (Message: 1417734108263481376, Thread: 1417734108263481376)
09-16 21:49:12 🗄️ Using cached table name: movie_sessions
09-16 21:49:12 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 21:49:12   hasMessage: true,
09-16 21:49:12   hasThread: true,
09-16 21:49:12   movieId: 28,
09-16 21:49:12   messageId: '1417734108263481376',
09-16 21:49:12   threadId: '1417734108263481376'
09-16 21:49:12 }
09-16 21:49:12 🗄️ Using cached table name: movie_sessions
09-16 21:49:12 🔍 Active voting session for guild 1413732572424437944: Session 12
09-16 21:49:12 🔍 Movie 1417734108263481376 in voting session: true (movie session_id: 12)
09-16 21:49:12 🗄️ Using cached table name: movie_sessions
09-16 21:49:12 2025-09-17 04:49:12 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:49:13 🗄️ Using cached table name: movie_sessions
09-16 21:49:13 2025-09-17 04:49:13 [DEBUG] 🔧 Updated pinned admin control panel
09-16 21:49:13 2025-09-17 04:49:13 [DEBUG] 📋 Posted movie to admin channel: The Matrix
09-16 21:49:13 2025-09-17 04:49:13 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417734115498921987
09-16 21:49:16 2025-09-17 04:49:16 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Dune, episode: null, where: Test
09-16 21:49:16 2025-09-17 04:49:16 [DEBUG] Content recommendation: Dune on Test
09-16 21:49:16 🗄️ Using cached table name: movie_sessions
09-16 21:49:18 2025-09-17 04:49:18 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417734129646178415
09-16 21:49:25 🗄️ Using cached table name: movie_sessions
09-16 21:49:25 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Dune, where: Test, imdbId: tt1160419
09-16 21:49:25 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] 🔍 DEBUG: Detected content type: movie for "Dune: Part One"
09-16 21:49:25 🗄️ Using cached table name: movie_sessions
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] [{
09-16 21:49:25   "id": 1,
09-16 21:49:25   "guild_id": "1413732572424437944",
09-16 21:49:25   "movie_channel_id": "1414130515719618650",
09-16 21:49:25   "admin_roles": [
09-16 21:49:25     "1414419061856796763"
09-16 21:49:25   ],
09-16 21:49:25   "moderator_roles": [
09-16 21:49:25     "1414026783250059274"
09-16 21:49:25   ],
09-16 21:49:25   "voting_roles": [
09-16 21:49:25     "1414026866817236992"
09-16 21:49:25   ],
09-16 21:49:25   "default_timezone": "UTC",
09-16 21:49:25   "watch_party_channel_id": "1413978046523768963",
09-16 21:49:25   "admin_channel_id": "1413978094074855494",
09-16 21:49:25   "vote_cap_enabled": 1,
09-16 21:49:25   "vote_cap_ratio_up": "0.3333",
09-16 21:49:25   "vote_cap_ratio_down": "0.2000",
09-16 21:49:25   "vote_cap_min": 1,
09-16 21:49:25   "created_at": "2025-09-13T08:36:19.000Z",
09-16 21:49:25   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 21:49:25 }] Guild config for 1413732572424437944:
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 21:49:25 2025-09-17 04:49:25 [INFO ] 🎬 Creating movie recommendation: Dune: Part One in Forum channel (movie-night-voting-forum)
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] 🔍 DEBUG: Calling createForumMovieRecommendation
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMovieRecommendation called with:
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] 🔍 DEBUG: Created movie embed for: Dune: Part One
09-16 21:49:25 2025-09-17 04:49:25 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost
09-16 21:49:25 🔍 DEBUG: createForumMoviePost called with: {
09-16 21:49:25   channelId: '1414130515719618650',
09-16 21:49:25   channelName: 'movie-night-voting-forum',
09-16 21:49:25   channelType: 15,
09-16 21:49:25   movieTitle: 'Dune: Part One',
09-16 21:49:25   hasEmbed: true,
09-16 21:49:25   componentsLength: 0
09-16 21:49:25 }
09-16 21:49:25 2025-09-17 04:49:25 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Dune: Part One in channel: movie-night-voting-forum
09-16 21:49:25 🔍 DEBUG: About to call channel.threads.create
09-16 21:49:26 2025-09-17 04:49:26 [INFO ] [1413732572424437944] ✅ Created forum post: 🎬 Dune: Part One (ID: 1417734167659155580) in channel: movie-night-voting-forum
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417734167659155580
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417734167659155580 (up: 0, down: 0)
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] 🔍 DEBUG: Created voting buttons for forum post: 1417734167659155580
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] 💾 Saving forum movie to database: Dune: Part One (Message: 1417734167659155580, Thread: 1417734167659155580)
09-16 21:49:26 🗄️ Using cached table name: movie_sessions
09-16 21:49:26 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 21:49:26   hasMessage: true,
09-16 21:49:26   hasThread: true,
09-16 21:49:26   movieId: 29,
09-16 21:49:26   messageId: '1417734167659155580',
09-16 21:49:26   threadId: '1417734167659155580'
09-16 21:49:26 }
09-16 21:49:26 🗄️ Using cached table name: movie_sessions
09-16 21:49:26 🔍 Active voting session for guild 1413732572424437944: Session 12
09-16 21:49:26 🔍 Movie 1417734167659155580 in voting session: true (movie session_id: 12)
09-16 21:49:26 2025-09-17 04:49:26 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:49:28 🗄️ Using cached table name: movie_sessions
09-16 21:49:28 2025-09-17 04:49:28 [DEBUG] 🔧 Updated pinned admin control panel
09-16 21:49:28 2025-09-17 04:49:28 [DEBUG] 📋 Posted movie to admin channel: Dune: Part One
09-16 21:49:29 2025-09-17 04:49:29 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417734181244637194
09-16 21:49:31 🗄️ Using cached table name: movie_sessions
09-16 21:50:31 🗄️ Using cached table name: movie_sessions
09-16 21:50:46 🗄️ Using cached table name: movie_sessions
09-16 21:50:53 🗄️ Using cached table name: movie_sessions
09-16 21:50:53 🗑️ Deleted Discord event: 🎬 Movie Night (1417734031495266405)
09-16 21:50:53 2025-09-17 04:50:53 [INFO ] ✅ Marked non-winning movies for next session
09-16 21:50:53 Error marking TV shows for next session: Unknown column 'next_session' in 'field list'
09-16 21:50:53 2025-09-17 04:50:53 [INFO ] 📋 Marked cancelled session content (movies & TV shows) for next session carryover
09-16 21:50:53 🗄️ Using cached table name: movie_sessions
09-16 21:50:53 2025-09-17 04:50:53 [DEBUG] 📦 Clearing forum channel after session cancellation
09-16 21:50:53 2025-09-17 04:50:53 [DEBUG] [1413732572424437944] 🧹 Clearing forum content posts in channel: movie-night-voting-forum (DATABASE-DRIVEN)
09-16 21:50:53 2025-09-17 04:50:53 [DEBUG] [1413732572424437944] 📋 Found 2 database-tracked forum movies and 0 TV shows to process
09-16 21:50:53 2025-09-17 04:50:53 [INFO ] [1413732572424437944] 🗑️ Deleted forum thread: Dune: Part One (1417734167659155580)
09-16 21:50:53 2025-09-17 04:50:53 [DEBUG] [1413732572424437944] 🗄️ Cleared thread reference for movie: Dune: Part One
09-16 21:50:54 2025-09-17 04:50:54 [INFO ] [1413732572424437944] 🗑️ Deleted forum thread: The Matrix (1417734108263481376)
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944] 🗄️ Cleared thread reference for movie: The Matrix
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944] 🧹 Deleting system posts (Recommend/No Session/Winner)
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944] 🔍 Thread: "🍿 Recommend Movies"
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944]    - hasNoSession: false, hasRecommendMovie: true
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944]    - hasRecommendTV: false, hasRecommendContent: false
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944]    - isSystemPost: true, isWinnerAnnouncement: false
09-16 21:50:54 2025-09-17 04:50:54 [INFO ] [1413732572424437944] 🗑️ Deleted system post: 🍿 Recommend Movies
09-16 21:50:54 2025-09-17 04:50:54 [INFO ] [1413732572424437944] 🧹 Forum cleanup complete: 3 deleted, 0 kept (winner/system)
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [null] 📋 Active session provided: 1413732572424437944
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944] 📋 Found 0 active threads, 0 archived threads
09-16 21:50:54 2025-09-17 04:50:54 [DEBUG] [1413732572424437944] 📋 Found 0 system posts, pinned post: none
09-16 21:50:55 2025-09-17 04:50:55 [DEBUG] [1413732572424437944] 📋 Created and pinned new no session post
09-16 21:50:56 2025-09-17 04:50:56 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:50:56 🗄️ Using cached table name: movie_sessions
09-16 21:50:56 2025-09-17 04:50:56 [DEBUG] 🔧 Updated pinned admin control panel
09-16 21:50:57 2025-09-17 04:50:57 [INFO ] ❌ Session Movie Night - Friday, October 10, 2025 cancelled by berman_wa
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 21:51:11 🗄️ Using cached table name: movie_sessions
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 21:51:11 2025-09-17 04:51:11 [INFO ] ✅ Created Discord event: 🎬 TV Show Night (ID: 1417734609482809455) - Duration: 150 minutes
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 📅 Saving event ID 1417734609482809455 to session 13
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 🗄️ Database: Updating session 13 with event ID 1417734609482809455
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 📅 Successfully saved event ID to database
09-16 21:51:11 2025-09-17 04:51:11 [INFO ] 📅 Created Discord event: 🎬 TV Show Night (1417734609482809455)
09-16 21:51:11 Error handling carryover content: contentType is not defined
09-16 21:51:11 2025-09-17 04:51:11 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 21:51:11 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 21:51:11 🗄️ Using cached table name: movie_sessions
09-16 21:51:12 2025-09-17 04:51:12 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:51:12 2025-09-17 04:51:12 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 21:51:12 2025-09-17 04:51:12 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:51:12 2025-09-17 04:51:12 [DEBUG] [1413732572424437944] 📋 Found 1 active threads, 0 archived threads
09-16 21:51:13 2025-09-17 04:51:13 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417734541795393577) - pinned: false, archived: false
09-16 21:51:13 2025-09-17 04:51:13 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 21:51:13 2025-09-17 04:51:13 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 21:51:13 2025-09-17 04:51:13 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 21:51:13 2025-09-17 04:51:13 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=tv_show
09-16 21:51:13 2025-09-17 04:51:13 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 21:51:13 2025-09-17 04:51:13 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 21:51:14 2025-09-17 04:51:14 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:51:14 🗄️ Using cached table name: movie_sessions
09-16 21:51:14 2025-09-17 04:51:14 [DEBUG] 🔧 Created and pinned admin control panel
09-16 21:51:14 2025-09-17 04:51:14 [DEBUG] ⏰ Session 13 voting ends in 24 days - will be checked daily
09-16 21:51:14 2025-09-17 04:51:14 [INFO ] 🎬 Voting session created: TV Show Night - Friday, October 10, 2025 by berman_wa
09-16 21:51:31 🗄️ Using cached table name: movie_sessions
09-16 21:51:35 🗄️ Using cached table name: movie_sessions
09-16 21:51:36 🗄️ Using cached table name: movie_sessions
09-16 21:51:36 🗑️ Deleted Discord event: 🎬 TV Show Night (1417734609482809455)
09-16 21:51:36 2025-09-17 04:51:36 [INFO ] ✅ Marked non-winning movies for next session
09-16 21:51:36 Error marking TV shows for next session: Unknown column 'next_session' in 'field list'
09-16 21:51:36 2025-09-17 04:51:36 [INFO ] 📋 Marked cancelled session content (movies & TV shows) for next session carryover
09-16 21:51:36 🗄️ Using cached table name: movie_sessions
09-16 21:51:36 2025-09-17 04:51:36 [DEBUG] 📦 Clearing forum channel after session cancellation
09-16 21:51:36 2025-09-17 04:51:36 [DEBUG] [1413732572424437944] 🧹 Clearing forum content posts in channel: movie-night-voting-forum (DATABASE-DRIVEN)
09-16 21:51:36 2025-09-17 04:51:36 [DEBUG] [1413732572424437944] 📋 Found 0 database-tracked forum movies and 0 TV shows to process
09-16 21:51:36 2025-09-17 04:51:36 [DEBUG] [1413732572424437944] 🧹 Deleting system posts (Recommend/No Session/Winner)
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944] 🔍 Thread: "📺 Recommend TV Shows"
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944]    - hasNoSession: false, hasRecommendMovie: false
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944]    - hasRecommendTV: true, hasRecommendContent: false
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944]    - isSystemPost: true, isWinnerAnnouncement: false
09-16 21:51:37 2025-09-17 04:51:37 [INFO ] [1413732572424437944] 🗑️ Deleted system post: 📺 Recommend TV Shows
09-16 21:51:37 2025-09-17 04:51:37 [INFO ] [1413732572424437944] 🧹 Forum cleanup complete: 1 deleted, 0 kept (winner/system)
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [null] 📋 Active session provided: 1413732572424437944
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944] 📋 Found 0 active threads, 0 archived threads
09-16 21:51:37 2025-09-17 04:51:37 [DEBUG] [1413732572424437944] 📋 Found 0 system posts, pinned post: none
09-16 21:51:38 2025-09-17 04:51:38 [DEBUG] [1413732572424437944] 📋 Created and pinned new no session post
09-16 21:51:38 2025-09-17 04:51:38 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:51:39 🗄️ Using cached table name: movie_sessions
09-16 21:51:39 2025-09-17 04:51:39 [DEBUG] 🔧 Updated pinned admin control panel
09-16 21:51:39 2025-09-17 04:51:39 [INFO ] ❌ Session TV Show Night - Friday, October 10, 2025 cancelled by berman_wa
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 21:51:50 🗄️ Using cached table name: movie_sessions
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 21:51:50 2025-09-17 04:51:50 [INFO ] ✅ Created Discord event: 🎬 TV Show Night (ID: 1417734775350890606) - Duration: 150 minutes
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 📅 Saving event ID 1417734775350890606 to session 14
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 🗄️ Database: Updating session 14 with event ID 1417734775350890606
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 21:51:50 2025-09-17 04:51:50 [DEBUG] 📅 Successfully saved event ID to database
09-16 21:51:50 2025-09-17 04:51:50 [INFO ] 📅 Created Discord event: 🎬 TV Show Night (1417734775350890606)
09-16 21:51:51 Error handling carryover content: contentType is not defined
09-16 21:51:51 2025-09-17 04:51:51 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 21:51:51 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 21:51:51 🗄️ Using cached table name: movie_sessions
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 Found 1 active threads, 0 archived threads
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417734721844154470) - pinned: false, archived: false
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 21:51:52 2025-09-17 04:51:52 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=tv_show
09-16 21:51:53 2025-09-17 04:51:53 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 21:51:53 2025-09-17 04:51:53 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 21:51:53 2025-09-17 04:51:53 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:51:54 🗄️ Using cached table name: movie_sessions
09-16 21:51:54 2025-09-17 04:51:54 [DEBUG] 🔧 Created and pinned admin control panel
09-16 21:51:54 2025-09-17 04:51:54 [DEBUG] ⏰ Session 14 voting ends in 24 days - will be checked daily
09-16 21:51:54 2025-09-17 04:51:54 [INFO ] 🎬 Voting session created: TV Show Night - Friday, October 10, 2025 by berman_wa
09-16 21:51:57 🗄️ Using cached table name: movie_sessions
09-16 21:52:08 2025-09-17 04:52:08 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Breaking Bad, episode: S2E2, where: Test
09-16 21:52:08 2025-09-17 04:52:08 [DEBUG] Content recommendation: Breaking Bad (S2E2) on Test
09-16 21:52:08 2025-09-17 04:52:08 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 21:52:08 2025-09-17 04:52:08 [DEBUG] 🔍 Combined search title: Breaking Bad S02E02
09-16 21:52:08 2025-09-17 04:52:08 [DEBUG] 🔍 Trying specific episode search for: Breaking Bad S2E2
09-16 21:52:08 🔍 Searching for episode: Breaking Bad S2E2
09-16 21:52:08 ✅ Found episode: Grilled (2009)
09-16 21:52:08 2025-09-17 04:52:08 [DEBUG] ✅ Found specific episode: Grilled
09-16 21:52:08 🗄️ Using cached table name: movie_sessions
09-16 21:52:08 IMDb search failed: Cannot read properties of undefined (reading 'episodeNotFound')
09-16 21:52:08 2025-09-17 04:52:08 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417734850156167201
09-16 21:52:11 🗄️ Using cached table name: movie_sessions
09-16 21:52:11 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Breaking Bad S02E02, where: Test, imdbId: tt1232249
09-16 21:52:11 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "Grilled"
09-16 21:52:11 🗄️ Using cached table name: movie_sessions
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] [{
09-16 21:52:11   "id": 1,
09-16 21:52:11   "guild_id": "1413732572424437944",
09-16 21:52:11   "movie_channel_id": "1414130515719618650",
09-16 21:52:11   "admin_roles": [
09-16 21:52:11     "1414419061856796763"
09-16 21:52:11   ],
09-16 21:52:11   "moderator_roles": [
09-16 21:52:11     "1414026783250059274"
09-16 21:52:11   ],
09-16 21:52:11   "voting_roles": [
09-16 21:52:11     "1414026866817236992"
09-16 21:52:11   ],
09-16 21:52:11   "default_timezone": "UTC",
09-16 21:52:11   "watch_party_channel_id": "1413978046523768963",
09-16 21:52:11   "admin_channel_id": "1413978094074855494",
09-16 21:52:11   "vote_cap_enabled": 1,
09-16 21:52:11   "vote_cap_ratio_up": "0.3333",
09-16 21:52:11   "vote_cap_ratio_down": "0.2000",
09-16 21:52:11   "vote_cap_min": 1,
09-16 21:52:11   "created_at": "2025-09-13T08:36:19.000Z",
09-16 21:52:11   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 21:52:11 }] Guild config for 1413732572424437944:
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 21:52:11 2025-09-17 04:52:11 [INFO ] 🎬 Creating TV show recommendation: Grilled in Forum channel (movie-night-voting-forum)
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 🔍 DEBUG: Created TV show embed for: Grilled
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 21:52:11 🔍 DEBUG: createForumMoviePost called with: {
09-16 21:52:11   channelId: '1414130515719618650',
09-16 21:52:11   channelName: 'movie-night-voting-forum',
09-16 21:52:11   channelType: 15,
09-16 21:52:11   movieTitle: 'Grilled',
09-16 21:52:11   hasEmbed: true,
09-16 21:52:11   componentsLength: 0
09-16 21:52:11 }
09-16 21:52:11 2025-09-17 04:52:11 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Grilled in channel: movie-night-voting-forum
09-16 21:52:11 🔍 DEBUG: About to call channel.threads.create
09-16 21:52:11 2025-09-17 04:52:11 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Grilled (ID: 1417734861636243527) in channel: movie-night-voting-forum
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417734861636243527
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417734861636243527 (up: 0, down: 0)
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 💾 Saving forum TV show to database: Grilled (Message: 1417734861636243527, Thread: 1417734861636243527)
09-16 21:52:11 🗄️ Using cached table name: movie_sessions
09-16 21:52:11 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 21:52:11   hasMessage: true,
09-16 21:52:11   hasThread: true,
09-16 21:52:11   movieId: 25,
09-16 21:52:11   messageId: '1417734861636243527',
09-16 21:52:11   threadId: '1417734861636243527'
09-16 21:52:11 }
09-16 21:52:11 2025-09-17 04:52:11 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417734863091531797
09-16 21:52:15 🗄️ Using cached table name: movie_sessions
09-16 21:52:17 🗄️ Using cached table name: movie_sessions
09-16 21:52:17 🗑️ Deleted Discord event: 🎬 TV Show Night (1417734775350890606)
09-16 21:52:17 2025-09-17 04:52:17 [INFO ] ✅ Marked non-winning movies for next session
09-16 21:52:17 Error marking TV shows for next session: Unknown column 'next_session' in 'field list'
09-16 21:52:17 2025-09-17 04:52:17 [INFO ] 📋 Marked cancelled session content (movies & TV shows) for next session carryover
09-16 21:52:17 🗄️ Using cached table name: movie_sessions
09-16 21:52:17 2025-09-17 04:52:17 [DEBUG] 📦 Clearing forum channel after session cancellation
09-16 21:52:17 2025-09-17 04:52:17 [DEBUG] [1413732572424437944] 🧹 Clearing forum content posts in channel: movie-night-voting-forum (DATABASE-DRIVEN)
09-16 21:52:17 2025-09-17 04:52:17 [DEBUG] [1413732572424437944] 📋 Found 0 database-tracked forum movies and 1 TV shows to process
09-16 21:52:18 2025-09-17 04:52:18 [INFO ] [1413732572424437944] 🗑️ Deleted forum thread: Grilled (1417734861636243527)
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944] 🗄️ Cleared thread reference for TV show: Grilled
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944] 🧹 Deleting system posts (Recommend/No Session/Winner)
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944] 🔍 Thread: "📺 Recommend TV Shows"
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944]    - hasNoSession: false, hasRecommendMovie: false
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944]    - hasRecommendTV: true, hasRecommendContent: false
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944]    - isSystemPost: true, isWinnerAnnouncement: false
09-16 21:52:18 2025-09-17 04:52:18 [INFO ] [1413732572424437944] 🗑️ Deleted system post: 📺 Recommend TV Shows
09-16 21:52:18 2025-09-17 04:52:18 [INFO ] [1413732572424437944] 🧹 Forum cleanup complete: 2 deleted, 0 kept (winner/system)
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [null] 📋 Active session provided: 1413732572424437944
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944] 📋 Found 0 active threads, 0 archived threads
09-16 21:52:18 2025-09-17 04:52:18 [DEBUG] [1413732572424437944] 📋 Found 0 system posts, pinned post: none
09-16 21:52:19 2025-09-17 04:52:19 [DEBUG] [1413732572424437944] 📋 Created and pinned new no session post
09-16 21:52:19 2025-09-17 04:52:19 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:52:20 🗄️ Using cached table name: movie_sessions
09-16 21:52:20 2025-09-17 04:52:20 [DEBUG] 🔧 Updated pinned admin control panel
09-16 21:52:20 2025-09-17 04:52:20 [INFO ] ❌ Session TV Show Night - Friday, October 10, 2025 cancelled by berman_wa
09-16 21:52:30 2025-09-17 04:52:30 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 21:52:30 2025-09-17 04:52:30 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 21:52:30 2025-09-17 04:52:30 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 21:52:30 🗄️ Using cached table name: movie_sessions
09-16 21:52:30 2025-09-17 04:52:30 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 21:52:30 2025-09-17 04:52:30 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 21:52:31 2025-09-17 04:52:31 [INFO ] ✅ Created Discord event: 🎬 Watch Party (ID: 1417734943810785300) - Duration: 150 minutes
09-16 21:52:31 2025-09-17 04:52:31 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 21:52:31 2025-09-17 04:52:31 [DEBUG] 📅 Saving event ID 1417734943810785300 to session 15
09-16 21:52:31 2025-09-17 04:52:31 [DEBUG] 🗄️ Database: Updating session 15 with event ID 1417734943810785300
09-16 21:52:31 2025-09-17 04:52:31 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 21:52:31 2025-09-17 04:52:31 [DEBUG] 📅 Successfully saved event ID to database
09-16 21:52:31 2025-09-17 04:52:31 [INFO ] 📅 Created Discord event: 🎬 Watch Party (1417734943810785300)
09-16 21:52:31 🗄️ Using cached table name: movie_sessions
09-16 21:52:31 Error handling carryover content: contentType is not defined
09-16 21:52:31 2025-09-17 04:52:31 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 21:52:31 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 21:52:31 🗄️ Using cached table name: movie_sessions
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 Found 1 active threads, 0 archived threads
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417734893525536830) - pinned: false, archived: false
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 21:52:32 2025-09-17 04:52:32 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=mixed
09-16 21:52:33 2025-09-17 04:52:33 [DEBUG]  Saved 0 RSVPs for session 15
09-16 21:52:34 2025-09-17 04:52:34 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 21:52:35 2025-09-17 04:52:35 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 21:52:35 2025-09-17 04:52:35 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 21:52:35 🗄️ Using cached table name: movie_sessions
09-16 21:52:35 2025-09-17 04:52:35 [DEBUG] 🔧 Created and pinned admin control panel
09-16 21:52:35 2025-09-17 04:52:35 [DEBUG] ⏰ Session 15 voting ends in 24 days - will be checked daily
09-16 21:52:35 2025-09-17 04:52:35 [INFO ] 🎬 Voting session created: Watch Party - Friday, October 10, 2025 by berman_wa
```

---

## 🎯 **TEST SUITE 11: TV SHOW DATABASE INTEGRATION (HIGH)**

### **Test 11.1: TV Show Session Management**
**Steps:**
1. Create a TV show session
2. Add 2 TV shows
3. Check database for proper session_id assignment
4. Cancel session and check carryover marking

**Expected Results:**
- ✅ TV shows have proper session_id in database
- ✅ TV shows marked with next_session=TRUE on cancellation
- ✅ TV show votes reset properly
- ✅ No database errors in logs

**Results:**
- [ ] PASS / [ ] FAIL
- **Observations:**

### **Test 11.2: TV Show Vote Management**
**Steps:**
1. Add TV show to session
2. Vote on the TV show (up/down)
3. Check vote counts display correctly
4. Reset votes and verify clearing

**Expected Results:**
- ✅ TV show votes save to votes_tv table
- ✅ Vote counts display correctly on TV show posts
- ✅ Vote reset clears all TV show votes
- ✅ No vote-related errors

**Results:**
- [ ] PASS / [ ] FAIL
- **Observations:**

**Log Capture:**
```
[Paste relevant logs here]
```

---

## 🎯 **TEST SUITE 12: MIXED CONTENT TYPE FUNCTIONALITY (MEDIUM)**

### **Test 12.1: Mixed Session Creation and Management**
**Steps:**
1. Use "🎬 Plan Mixed Session" button
2. Add both movies and TV shows to the session
3. Vote on both content types
4. Close voting and select winner

**Expected Results:**
- ✅ Mixed session accepts both movies and TV shows
- ✅ Both content types appear in admin channel
- ✅ Winner selection works for both content types
- ✅ Session displays as "Watch Party" type

**Results:**
- [ ] PASS / [ ] FAIL
- **Observations:**

**Log Capture:**
```
[Paste relevant logs here]
```

---

## 📊 **OVERALL ASSESSMENT**

### **Critical Issues Found:**
- [ ] None - all critical fixes working
- [X] TV show admin channel posts still failing
- [ ] Content-type carryover contamination still occurring
- [X] Database integration issues remain
- [ ] Other: _______________

### **Production Readiness:**
- [ ] ✅ **READY FOR PRODUCTION** - All critical issues resolved
- [X] ❌ **NOT READY** - Critical issues remain

### **Next Steps:**
- [ ] Deploy to production
- [X] Additional fixes needed: Fix the admin channel posts for TV shows and the migration issue before I can comfortably apply this change to production and it's database
- [X] Further testing required: Need to keep testing future changes to ensure these issues are addressed.

### **Final Notes:**
```
- Migrations should work - we are moving away from movie_sessions to watch_sessions, yet this refuses to either create the new table and copy the data over from the old one then drop the old one, or just rename the old one to the new one. [medium]
- Either we aren't ever populating and using the imdb_cache table, or it is being cleared with purges. [minor]
- I need you to create a .md file that lists ALL ephemeral messages and their associated functions, so that we can decide which ones need to be auto-dismissed by a timer, which ones should be auto-dismissed by a followiing user interaction and which ones can stay persistent and expire naturally. [minor]
```

---

**Testing completed on:** _______________
**Bot restarted before testing:** [ ] Yes / [X] No
**All tests run on PebbleHost:** [X] Yes / [ ] No
