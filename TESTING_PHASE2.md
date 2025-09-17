# 🧪 COMPREHENSIVE TESTING PLAN - PHASE 2

## 🚨 **CRITICAL FIXES DEPLOYED**
- ✅ **System Post Detection Fixed** - Sync no longer deletes movie posts
- ✅ **Mixed Content Type UI Added** - 🎬 Plan Mixed Session button available

---

## **TEST SUITE 4: SYNC OPERATION VERIFICATION**

### **Test 4.1: Movie Session Sync (CRITICAL)**
**Objective**: Verify sync no longer deletes movie posts

**Steps**:
1. Create movie session
2. Add 2-3 movies via recommendation button
3. Use "Sync Channels" button
4. Verify movies are preserved (not deleted)

**Expected Results**:
- ✅ Movies remain visible in forum
- ✅ Logs show "Updated existing forum post: [Movie Name]"
- ✅ NO logs showing "Deleted duplicate system post: 🎬 [Movie Name]"

**Results**:
```
PASS/FAIL: 
PASS
Logs:
09-16 20:48:38 🗄️ Using cached table name: movie_sessions
09-16 20:48:43 2025-09-17 03:48:43 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: The Rock, episode: null, where: Test
09-16 20:48:43 2025-09-17 03:48:43 [DEBUG] Content recommendation: The Rock on Test
09-16 20:48:44 🗄️ Using cached table name: movie_sessions
09-16 20:48:44 2025-09-17 03:48:44 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417718893132382238
09-16 20:48:46 🗄️ Using cached table name: movie_sessions
09-16 20:48:46 🔍 DEBUG: createMovieWithImdb (button handler) called with title: The Rock, where: Test, imdbId: tt0117500
09-16 20:48:46 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] 🔍 DEBUG: Detected content type: movie for "The Rock"
09-16 20:48:46 🗄️ Using cached table name: movie_sessions
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] [{
09-16 20:48:46   "id": 1,
09-16 20:48:46   "guild_id": "1413732572424437944",
09-16 20:48:46   "movie_channel_id": "1414130515719618650",
09-16 20:48:46   "admin_roles": [
09-16 20:48:46     "1414419061856796763"
09-16 20:48:46   ],
09-16 20:48:46   "moderator_roles": [
09-16 20:48:46     "1414026783250059274"
09-16 20:48:46   ],
09-16 20:48:46   "voting_roles": [
09-16 20:48:46     "1414026866817236992"
09-16 20:48:46   ],
09-16 20:48:46   "default_timezone": "UTC",
09-16 20:48:46   "watch_party_channel_id": "1413978046523768963",
09-16 20:48:46   "admin_channel_id": "1413978094074855494",
09-16 20:48:46   "vote_cap_enabled": 1,
09-16 20:48:46   "vote_cap_ratio_up": "0.3333",
09-16 20:48:46   "vote_cap_ratio_down": "0.2000",
09-16 20:48:46   "vote_cap_min": 1,
09-16 20:48:46   "created_at": "2025-09-13T08:36:19.000Z",
09-16 20:48:46   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 20:48:46 }] Guild config for 1413732572424437944:
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 20:48:46 2025-09-17 03:48:46 [INFO ] 🎬 Creating movie recommendation: The Rock in Forum channel (movie-night-voting-forum)
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] 🔍 DEBUG: Calling createForumMovieRecommendation
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMovieRecommendation called with:
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] 🔍 DEBUG: Created movie embed for: The Rock
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost
09-16 20:48:46 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:48:46   channelId: '1414130515719618650',
09-16 20:48:46   channelName: 'movie-night-voting-forum',
09-16 20:48:46   channelType: 15,
09-16 20:48:46   movieTitle: 'The Rock',
09-16 20:48:46   hasEmbed: true,
09-16 20:48:46   componentsLength: 0
09-16 20:48:46 }
09-16 20:48:46 2025-09-17 03:48:46 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: The Rock in channel: movie-night-voting-forum
09-16 20:48:46 🔍 DEBUG: About to call channel.threads.create
09-16 20:48:46 2025-09-17 03:48:46 [INFO ] [1413732572424437944] ✅ Created forum post: 🎬 The Rock (ID: 1417718904050028575) in channel: movie-night-voting-forum
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417718904050028575
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417718904050028575 (up: 0, down: 0)
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:48:46 2025-09-17 03:48:46 [DEBUG] 🔍 DEBUG: Created voting buttons for forum post: 1417718904050028575
09-16 20:48:47 2025-09-17 03:48:47 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 20:48:47 2025-09-17 03:48:47 [DEBUG] 💾 Saving forum movie to database: The Rock (Message: 1417718904050028575, Thread: 1417718904050028575)
09-16 20:48:47 🗄️ Using cached table name: movie_sessions
09-16 20:48:47 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 20:48:47   hasMessage: true,
09-16 20:48:47   hasThread: true,
09-16 20:48:47   movieId: 18,
09-16 20:48:47   messageId: '1417718904050028575',
09-16 20:48:47   threadId: '1417718904050028575'
09-16 20:48:47 }
09-16 20:48:47 🗄️ Using cached table name: movie_sessions
09-16 20:48:47 🔍 Active voting session for guild 1413732572424437944: Session 2
09-16 20:48:47 🔍 Movie 1417718904050028575 in voting session: true (movie session_id: 2)
09-16 20:48:47 2025-09-17 03:48:47 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 20:48:47 🗄️ Using cached table name: movie_sessions
09-16 20:48:48 2025-09-17 03:48:48 [DEBUG] 🔧 Updated pinned admin control panel
09-16 20:48:48 2025-09-17 03:48:48 [DEBUG] 📋 Posted movie to admin channel: The Rock
09-16 20:48:48 2025-09-17 03:48:48 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417718910236495936
09-16 20:48:51 🗄️ Using cached table name: movie_sessions
09-16 20:48:57 2025-09-17 03:48:57 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: The Matrix, episode: null, where: Test
09-16 20:48:57 2025-09-17 03:48:57 [DEBUG] Content recommendation: The Matrix on Test
09-16 20:48:57 🗄️ Using cached table name: movie_sessions
09-16 20:48:57 2025-09-17 03:48:57 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417718949247844502
09-16 20:48:59 🗄️ Using cached table name: movie_sessions
09-16 20:48:59 🔍 DEBUG: createMovieWithImdb (button handler) called with title: The Matrix, where: Test, imdbId: tt0133093
09-16 20:48:59 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: Detected content type: movie for "The Matrix"
09-16 20:48:59 🗄️ Using cached table name: movie_sessions
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] [{
09-16 20:48:59   "id": 1,
09-16 20:48:59   "guild_id": "1413732572424437944",
09-16 20:48:59   "movie_channel_id": "1414130515719618650",
09-16 20:48:59   "admin_roles": [
09-16 20:48:59     "1414419061856796763"
09-16 20:48:59   ],
09-16 20:48:59   "moderator_roles": [
09-16 20:48:59     "1414026783250059274"
09-16 20:48:59   ],
09-16 20:48:59   "voting_roles": [
09-16 20:48:59     "1414026866817236992"
09-16 20:48:59   ],
09-16 20:48:59   "default_timezone": "UTC",
09-16 20:48:59   "watch_party_channel_id": "1413978046523768963",
09-16 20:48:59   "admin_channel_id": "1413978094074855494",
09-16 20:48:59   "vote_cap_enabled": 1,
09-16 20:48:59   "vote_cap_ratio_up": "0.3333",
09-16 20:48:59   "vote_cap_ratio_down": "0.2000",
09-16 20:48:59   "vote_cap_min": 1,
09-16 20:48:59   "created_at": "2025-09-13T08:36:19.000Z",
09-16 20:48:59   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 20:48:59 }] Guild config for 1413732572424437944:
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 20:48:59 2025-09-17 03:48:59 [INFO ] 🎬 Creating movie recommendation: The Matrix in Forum channel (movie-night-voting-forum)
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: Calling createForumMovieRecommendation
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMovieRecommendation called with:
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: Created movie embed for: The Matrix
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost
09-16 20:48:59 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:48:59   channelId: '1414130515719618650',
09-16 20:48:59   channelName: 'movie-night-voting-forum',
09-16 20:48:59   channelType: 15,
09-16 20:48:59   movieTitle: 'The Matrix',
09-16 20:48:59   hasEmbed: true,
09-16 20:48:59   componentsLength: 0
09-16 20:48:59 }
09-16 20:48:59 2025-09-17 03:48:59 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: The Matrix in channel: movie-night-voting-forum
09-16 20:48:59 🔍 DEBUG: About to call channel.threads.create
09-16 20:48:59 2025-09-17 03:48:59 [INFO ] [1413732572424437944] ✅ Created forum post: 🎬 The Matrix (ID: 1417718957389123745) in channel: movie-night-voting-forum
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417718957389123745
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417718957389123745 (up: 0, down: 0)
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: Created voting buttons for forum post: 1417718957389123745
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 20:48:59 2025-09-17 03:48:59 [DEBUG] 💾 Saving forum movie to database: The Matrix (Message: 1417718957389123745, Thread: 1417718957389123745)
09-16 20:48:59 🗄️ Using cached table name: movie_sessions
09-16 20:48:59 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 20:48:59   hasMessage: true,
09-16 20:48:59   hasThread: true,
09-16 20:48:59   movieId: 19,
09-16 20:48:59   messageId: '1417718957389123745',
09-16 20:48:59   threadId: '1417718957389123745'
09-16 20:48:59 }
09-16 20:48:59 🗄️ Using cached table name: movie_sessions
09-16 20:48:59 🔍 Active voting session for guild 1413732572424437944: Session 2
09-16 20:48:59 🔍 Movie 1417718957389123745 in voting session: true (movie session_id: 2)
09-16 20:49:00 2025-09-17 03:49:00 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 20:49:00 🗄️ Using cached table name: movie_sessions
09-16 20:49:00 2025-09-17 03:49:00 [DEBUG] 🔧 Updated pinned admin control panel
09-16 20:49:00 2025-09-17 03:49:00 [DEBUG] 📋 Posted movie to admin channel: The Matrix
09-16 20:49:00 2025-09-17 03:49:00 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417718962434867261
09-16 20:49:03 🗄️ Using cached table name: movie_sessions
09-16 20:49:04 🗄️ Using cached table name: movie_sessions
09-16 20:49:07 2025-09-17 03:49:07 [DEBUG]  Saved 0 RSVPs for session 2
09-16 20:49:07 2025-09-17 03:49:07 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: The Matrix, episode: null, where: Test
09-16 20:49:07 2025-09-17 03:49:07 [DEBUG] Content recommendation: The Matrix on Test
09-16 20:49:10 2025-09-17 03:49:10 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417719002179833886
09-16 20:49:12 🗄️ Using cached table name: movie_sessions
09-16 20:49:12 🔍 DEBUG: createMovieWithImdb (button handler) called with title: The Matrix, where: Test, imdbId: tt0234215
09-16 20:49:12 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] 🔍 DEBUG: Detected content type: movie for "The Matrix Reloaded"
09-16 20:49:12 🗄️ Using cached table name: movie_sessions
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] [{
09-16 20:49:12   "id": 1,
09-16 20:49:12   "guild_id": "1413732572424437944",
09-16 20:49:12   "movie_channel_id": "1414130515719618650",
09-16 20:49:12   "admin_roles": [
09-16 20:49:12     "1414419061856796763"
09-16 20:49:12   ],
09-16 20:49:12   "moderator_roles": [
09-16 20:49:12     "1414026783250059274"
09-16 20:49:12   ],
09-16 20:49:12   "voting_roles": [
09-16 20:49:12     "1414026866817236992"
09-16 20:49:12   ],
09-16 20:49:12   "default_timezone": "UTC",
09-16 20:49:12   "watch_party_channel_id": "1413978046523768963",
09-16 20:49:12   "admin_channel_id": "1413978094074855494",
09-16 20:49:12   "vote_cap_enabled": 1,
09-16 20:49:12   "vote_cap_ratio_up": "0.3333",
09-16 20:49:12   "vote_cap_ratio_down": "0.2000",
09-16 20:49:12   "vote_cap_min": 1,
09-16 20:49:12   "created_at": "2025-09-13T08:36:19.000Z",
09-16 20:49:12   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 20:49:12 }] Guild config for 1413732572424437944:
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 20:49:12 2025-09-17 03:49:12 [INFO ] 🎬 Creating movie recommendation: The Matrix Reloaded in Forum channel (movie-night-voting-forum)
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] 🔍 DEBUG: Calling createForumMovieRecommendation
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMovieRecommendation called with:
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] 🔍 DEBUG: Created movie embed for: The Matrix Reloaded
09-16 20:49:12 2025-09-17 03:49:12 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost
09-16 20:49:12 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:49:12   channelId: '1414130515719618650',
09-16 20:49:12   channelName: 'movie-night-voting-forum',
09-16 20:49:12   channelType: 15,
09-16 20:49:12   movieTitle: 'The Matrix Reloaded',
09-16 20:49:12   hasEmbed: true,
09-16 20:49:12   componentsLength: 0
09-16 20:49:12 }
09-16 20:49:12 2025-09-17 03:49:12 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: The Matrix Reloaded in channel: movie-night-voting-forum
09-16 20:49:12 🔍 DEBUG: About to call channel.threads.create
09-16 20:49:13 2025-09-17 03:49:13 [INFO ] [1413732572424437944] ✅ Created forum post: 🎬 The Matrix Reloaded (ID: 1417719014230327406) in channel: movie-night-voting-forum
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417719014230327406
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417719014230327406 (up: 0, down: 0)
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] 🔍 DEBUG: Created voting buttons for forum post: 1417719014230327406
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] 💾 Saving forum movie to database: The Matrix Reloaded (Message: 1417719014230327406, Thread: 1417719014230327406)
09-16 20:49:13 🗄️ Using cached table name: movie_sessions
09-16 20:49:13 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 20:49:13   hasMessage: true,
09-16 20:49:13   hasThread: true,
09-16 20:49:13   movieId: 20,
09-16 20:49:13   messageId: '1417719014230327406',
09-16 20:49:13   threadId: '1417719014230327406'
09-16 20:49:13 }
09-16 20:49:13 🗄️ Using cached table name: movie_sessions
09-16 20:49:13 🔍 Active voting session for guild 1413732572424437944: Session 2
09-16 20:49:13 🔍 Movie 1417719014230327406 in voting session: true (movie session_id: 2)
09-16 20:49:13 2025-09-17 03:49:13 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 20:49:13 🗄️ Using cached table name: movie_sessions
09-16 20:49:14 2025-09-17 03:49:14 [DEBUG] 🔧 Updated pinned admin control panel
09-16 20:49:14 2025-09-17 03:49:14 [DEBUG] 📋 Posted movie to admin channel: The Matrix Reloaded
09-16 20:49:14 2025-09-17 03:49:14 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417719019141861457
09-16 20:50:04 🗄️ Using cached table name: movie_sessions
09-16 20:51:04 🗄️ Using cached table name: movie_sessions
09-16 20:51:06 2025-09-17 03:51:06 [DEBUG] 📋 Syncing forum channel: movie-night-voting-forum
09-16 20:51:06 🗄️ Using cached table name: movie_sessions
09-16 20:51:06 2025-09-17 03:51:06 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417719014230327406 (up: 0, down: 0)
09-16 20:51:06 2025-09-17 03:51:06 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] 📝 Skipping forum post title update for: The Matrix Reloaded (votes: +0/-0) to avoid spam messages
09-16 20:51:07 📝 Updated existing forum post: The Matrix Reloaded
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417718957389123745 (up: 0, down: 0)
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] 📝 Skipping forum post title update for: The Matrix (votes: +0/-0) to avoid spam messages
09-16 20:51:07 📝 Updated existing forum post: The Matrix
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417718904050028575 (up: 0, down: 0)
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] 📝 Skipping forum post title update for: The Rock (votes: +0/-0) to avoid spam messages
09-16 20:51:07 📝 Updated existing forum post: The Rock
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] [1413732572424437944] 📋 Found 4 active threads, 0 archived threads
09-16 20:51:07 2025-09-17 03:51:07 [DEBUG] [1413732572424437944] 📋 Thread: 🎬 The Matrix Reloaded (1417719014230327406) - pinned: false, archived: false
09-16 20:51:08 2025-09-17 03:51:08 [DEBUG] [1413732572424437944] 📋 Thread: 🎬 The Matrix (1417718957389123745) - pinned: false, archived: false
09-16 20:51:08 2025-09-17 03:51:08 [DEBUG] [1413732572424437944] 📋 Thread: 🎬 The Rock (1417718904050028575) - pinned: false, archived: false
09-16 20:51:08 2025-09-17 03:51:08 [DEBUG] [1413732572424437944] 📋 Thread: 🍿 Recommend Movies (1417717834188062864) - pinned: false, archived: false
09-16 20:51:08 2025-09-17 03:51:08 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 20:51:08 2025-09-17 03:51:08 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 20:51:08 2025-09-17 03:51:08 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🍿 Recommend Movies
09-16 20:51:08 2025-09-17 03:51:08 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=movie
09-16 20:51:09 2025-09-17 03:51:09 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post

Discord UI Observations:
- The "Are you sure" post for duplicate entries should not appear until after the confirmation of movie title - an example: The Matrix and The Matrix: Reloaded are not duplicate entries. We should wait to check for duplicate entries until after the confirmation has been chosen, and then verify against the confirmed title.


```

### **Test 4.2: TV Show Session Sync**
**Objective**: Verify TV show sync continues working

**Steps**:
1. Create TV show session
2. Add 2 TV shows
3. Use "Sync Channels" button

**Expected Results**:
- ✅ TV shows preserved and updated
- ✅ Logs show "Updated existing TV show forum post"

**Results**:
```
PASS/FAIL:
PASS AND FAIL
Logs:
09-16 20:54:08 2025-09-17 03:54:08 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 20:54:08 2025-09-17 03:54:08 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 20:54:08 2025-09-17 03:54:08 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 20:54:08 🗄️ Using cached table name: movie_sessions
09-16 20:54:08 2025-09-17 03:54:08 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 20:54:08 2025-09-17 03:54:08 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 20:54:09 2025-09-17 03:54:09 [INFO ] ✅ Created Discord event: 🎬 TV Show Night (ID: 1417720256125735032) - Duration: 150 minutes
09-16 20:54:09 2025-09-17 03:54:09 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 20:54:09 2025-09-17 03:54:09 [DEBUG] 📅 Saving event ID 1417720256125735032 to session 3
09-16 20:54:09 2025-09-17 03:54:09 [DEBUG] 🗄️ Database: Updating session 3 with event ID 1417720256125735032
09-16 20:54:09 2025-09-17 03:54:09 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 20:54:09 2025-09-17 03:54:09 [DEBUG] 📅 Successfully saved event ID to database
09-16 20:54:09 2025-09-17 03:54:09 [INFO ] 📅 Created Discord event: 🎬 TV Show Night (1417720256125735032)
09-16 20:54:09 2025-09-17 03:54:09 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 20:54:09 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 20:54:09 🗄️ Using cached table name: movie_sessions
09-16 20:54:10 2025-09-17 03:54:10 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 20:54:10 2025-09-17 03:54:10 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 20:54:10 2025-09-17 03:54:10 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 20:54:10 2025-09-17 03:54:10 [DEBUG] [1413732572424437944] 📋 Found 1 active threads, 0 archived threads
09-16 20:54:10 2025-09-17 03:54:10 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417719765136572628) - pinned: false, archived: false
09-16 20:54:10 2025-09-17 03:54:10 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 20:54:10 2025-09-17 03:54:10 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 20:54:11 2025-09-17 03:54:11 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 20:54:11 2025-09-17 03:54:11 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=tv_show
09-16 20:54:11 2025-09-17 03:54:11 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 20:54:12 2025-09-17 03:54:12 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 20:54:12 2025-09-17 03:54:12 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 20:54:12 🗄️ Using cached table name: movie_sessions
09-16 20:54:12 2025-09-17 03:54:12 [DEBUG] 🔧 Created and pinned admin control panel
09-16 20:54:12 2025-09-17 03:54:12 [DEBUG] ⏰ Session 3 voting ends in 24 days - will be checked daily
09-16 20:54:12 2025-09-17 03:54:12 [INFO ] 🎬 Voting session created: TV Show Night - Friday, October 10, 2025 by berman_wa
09-16 20:54:22 🗄️ Using cached table name: movie_sessions
09-16 20:54:36 2025-09-17 03:54:36 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Saturday Night Live, episode: S27E8, where: Test
09-16 20:54:36 2025-09-17 03:54:36 [DEBUG] Content recommendation: Saturday Night Live (S27E8) on Test
09-16 20:54:36 2025-09-17 03:54:36 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 20:54:36 2025-09-17 03:54:36 [DEBUG] 🔍 Combined search title: Saturday Night Live S27E08
09-16 20:54:36 2025-09-17 03:54:36 [DEBUG] 🔍 Trying specific episode search for: Saturday Night Live S27E8
09-16 20:54:36 🔍 Searching for episode: Saturday Night Live S27E8
09-16 20:54:36 ❌ Episode not found: Series or episode not found!
09-16 20:54:36 2025-09-17 03:54:36 [DEBUG] ❌ Episode not found, falling back to series search
09-16 20:54:36 🗄️ Using cached table name: movie_sessions
09-16 20:54:36 2025-09-17 03:54:36 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417720369841963161
09-16 20:54:47 Error handling IMDb selection: Error [InteractionAlreadyReplied]: The reply to this interaction has already been sent or deferred.
09-16 20:54:47     at ButtonInteraction.update (/home/container/node_modules/discord.js/src/structures/interfaces/InteractionResponses.js:342:46)
09-16 20:54:47     at handleImdbSelection (/home/container/handlers/buttons.js:885:25)
09-16 20:54:47     at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
09-16 20:54:47     at async Object.handleButton (/home/container/handlers/buttons.js:181:7)
09-16 20:54:47     at async handleInteraction (/home/container/handlers/index.js:16:9)
09-16 20:54:47     at async Client.<anonymous> (/home/container/index.js:165:5) {
09-16 20:54:47   code: 'InteractionAlreadyReplied'
09-16 20:54:47 }
09-16 20:54:51 🗄️ Using cached table name: movie_sessions
09-16 20:55:04 🗄️ Using cached table name: movie_sessions
09-16 20:55:11 2025-09-17 03:55:11 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Saturday Night Live, episode: S40E3, where: Test
09-16 20:55:11 2025-09-17 03:55:11 [DEBUG] Content recommendation: Saturday Night Live (S40E3) on Test
09-16 20:55:11 2025-09-17 03:55:11 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 20:55:11 2025-09-17 03:55:11 [DEBUG] 🔍 Combined search title: Saturday Night Live S40E03
09-16 20:55:12 2025-09-17 03:55:12 [DEBUG] 🔍 Trying specific episode search for: Saturday Night Live S40E3
09-16 20:55:12 🔍 Searching for episode: Saturday Night Live S40E3
09-16 20:55:12 ✅ Found episode: Bill Hader/Hozier (2014)
09-16 20:55:12 2025-09-17 03:55:12 [DEBUG] ✅ Found specific episode: Bill Hader/Hozier
09-16 20:55:12 🗄️ Using cached table name: movie_sessions
09-16 20:55:12 IMDb search failed: Cannot read properties of undefined (reading 'episodeNotFound')
09-16 20:55:12 2025-09-17 03:55:12 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417720520522338386
09-16 20:55:14 🗄️ Using cached table name: movie_sessions
09-16 20:55:14 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Saturday Night Live S40E03, where: Test, imdbId: tt4046642
09-16 20:55:14 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "Bill Hader/Hozier"
09-16 20:55:14 🗄️ Using cached table name: movie_sessions
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] [{
09-16 20:55:14   "id": 1,
09-16 20:55:14   "guild_id": "1413732572424437944",
09-16 20:55:14   "movie_channel_id": "1414130515719618650",
09-16 20:55:14   "admin_roles": [
09-16 20:55:14     "1414419061856796763"
09-16 20:55:14   ],
09-16 20:55:14   "moderator_roles": [
09-16 20:55:14     "1414026783250059274"
09-16 20:55:14   ],
09-16 20:55:14   "voting_roles": [
09-16 20:55:14     "1414026866817236992"
09-16 20:55:14   ],
09-16 20:55:14   "default_timezone": "UTC",
09-16 20:55:14   "watch_party_channel_id": "1413978046523768963",
09-16 20:55:14   "admin_channel_id": "1413978094074855494",
09-16 20:55:14   "vote_cap_enabled": 1,
09-16 20:55:14   "vote_cap_ratio_up": "0.3333",
09-16 20:55:14   "vote_cap_ratio_down": "0.2000",
09-16 20:55:14   "vote_cap_min": 1,
09-16 20:55:14   "created_at": "2025-09-13T08:36:19.000Z",
09-16 20:55:14   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 20:55:14 }] Guild config for 1413732572424437944:
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 20:55:14 2025-09-17 03:55:14 [INFO ] 🎬 Creating TV show recommendation: Bill Hader/Hozier in Forum channel (movie-night-voting-forum)
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] 🔍 DEBUG: Created TV show embed for: Bill Hader/Hozier
09-16 20:55:14 2025-09-17 03:55:14 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 20:55:14 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:55:14   channelId: '1414130515719618650',
09-16 20:55:14   channelName: 'movie-night-voting-forum',
09-16 20:55:14   channelType: 15,
09-16 20:55:14   movieTitle: 'Bill Hader/Hozier',
09-16 20:55:14   hasEmbed: true,
09-16 20:55:14   componentsLength: 0
09-16 20:55:14 }
09-16 20:55:14 2025-09-17 03:55:14 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Bill Hader/Hozier in channel: movie-night-voting-forum
09-16 20:55:14 🔍 DEBUG: About to call channel.threads.create
09-16 20:55:15 2025-09-17 03:55:15 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Bill Hader/Hozier (ID: 1417720532928823408) in channel: movie-night-voting-forum
09-16 20:55:15 2025-09-17 03:55:15 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417720532928823408
09-16 20:55:15 2025-09-17 03:55:15 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 20:55:15 2025-09-17 03:55:15 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417720532928823408 (up: 0, down: 0)
09-16 20:55:15 2025-09-17 03:55:15 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:55:15 2025-09-17 03:55:15 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 20:55:15 2025-09-17 03:55:15 [DEBUG] 💾 Saving forum TV show to database: Bill Hader/Hozier (Message: 1417720532928823408, Thread: 1417720532928823408)
09-16 20:55:15 🗄️ Using cached table name: movie_sessions
09-16 20:55:15 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 20:55:15   hasMessage: true,
09-16 20:55:15   hasThread: true,
09-16 20:55:15   movieId: undefined,
09-16 20:55:15   messageId: '1417720532928823408',
09-16 20:55:15   threadId: '1417720532928823408'
09-16 20:55:15 }
09-16 20:55:15 2025-09-17 03:55:15 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417720534699081768
09-16 20:55:24 🗄️ Using cached table name: movie_sessions
09-16 20:55:34 2025-09-17 03:55:34 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Viva Variety, episode: S1E2, where: Test
09-16 20:55:34 2025-09-17 03:55:34 [DEBUG] Content recommendation: Viva Variety (S1E2) on Test
09-16 20:55:34 2025-09-17 03:55:34 [DEBUG] [[object Object]] 🔍 Parsed episode info:
09-16 20:55:34 2025-09-17 03:55:34 [DEBUG] 🔍 Combined search title: Viva Variety S01E02
09-16 20:55:34 2025-09-17 03:55:34 [DEBUG] 🔍 Trying specific episode search for: Viva Variety S1E2
09-16 20:55:34 🔍 Searching for episode: Viva Variety S1E2
09-16 20:55:34 ❌ Episode not found: Series or episode not found!
09-16 20:55:34 2025-09-17 03:55:34 [DEBUG] ❌ Episode not found, falling back to series search
09-16 20:55:34 🗄️ Using cached table name: movie_sessions
09-16 20:55:34 2025-09-17 03:55:34 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417720614243930212
09-16 20:55:39 🗄️ Using cached table name: movie_sessions
09-16 20:55:39 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Viva Variety S01E02, where: Test, imdbId: tt0132665
09-16 20:55:39 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "Viva Variety"
09-16 20:55:39 🗄️ Using cached table name: movie_sessions
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] [{
09-16 20:55:39   "id": 1,
09-16 20:55:39   "guild_id": "1413732572424437944",
09-16 20:55:39   "movie_channel_id": "1414130515719618650",
09-16 20:55:39   "admin_roles": [
09-16 20:55:39     "1414419061856796763"
09-16 20:55:39   ],
09-16 20:55:39   "moderator_roles": [
09-16 20:55:39     "1414026783250059274"
09-16 20:55:39   ],
09-16 20:55:39   "voting_roles": [
09-16 20:55:39     "1414026866817236992"
09-16 20:55:39   ],
09-16 20:55:39   "default_timezone": "UTC",
09-16 20:55:39   "watch_party_channel_id": "1413978046523768963",
09-16 20:55:39   "admin_channel_id": "1413978094074855494",
09-16 20:55:39   "vote_cap_enabled": 1,
09-16 20:55:39   "vote_cap_ratio_up": "0.3333",
09-16 20:55:39   "vote_cap_ratio_down": "0.2000",
09-16 20:55:39   "vote_cap_min": 1,
09-16 20:55:39   "created_at": "2025-09-13T08:36:19.000Z",
09-16 20:55:39   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 20:55:39 }] Guild config for 1413732572424437944:
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 20:55:39 2025-09-17 03:55:39 [INFO ] 🎬 Creating TV show recommendation: Viva Variety in Forum channel (movie-night-voting-forum)
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] 🔍 DEBUG: Created TV show embed for: Viva Variety
09-16 20:55:39 2025-09-17 03:55:39 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 20:55:39 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:55:39   channelId: '1414130515719618650',
09-16 20:55:39   channelName: 'movie-night-voting-forum',
09-16 20:55:39   channelType: 15,
09-16 20:55:39   movieTitle: 'Viva Variety',
09-16 20:55:39   hasEmbed: true,
09-16 20:55:39   componentsLength: 0
09-16 20:55:39 }
09-16 20:55:39 2025-09-17 03:55:39 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Viva Variety in channel: movie-night-voting-forum
09-16 20:55:39 🔍 DEBUG: About to call channel.threads.create
09-16 20:55:40 2025-09-17 03:55:40 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Viva Variety (ID: 1417720636947824822) in channel: movie-night-voting-forum
09-16 20:55:40 2025-09-17 03:55:40 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417720636947824822
09-16 20:55:40 2025-09-17 03:55:40 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 20:55:40 2025-09-17 03:55:40 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417720636947824822 (up: 0, down: 0)
09-16 20:55:40 2025-09-17 03:55:40 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:55:40 2025-09-17 03:55:40 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 20:55:40 2025-09-17 03:55:40 [DEBUG] 💾 Saving forum TV show to database: Viva Variety (Message: 1417720636947824822, Thread: 1417720636947824822)
09-16 20:55:40 🗄️ Using cached table name: movie_sessions
09-16 20:55:40 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 20:55:40   hasMessage: true,
09-16 20:55:40   hasThread: true,
09-16 20:55:40   movieId: undefined,
09-16 20:55:40   messageId: '1417720636947824822',
09-16 20:55:40   threadId: '1417720636947824822'
09-16 20:55:40 }
09-16 20:55:40 2025-09-17 03:55:40 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417720641448050741
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] 📋 Syncing forum channel: movie-night-voting-forum
09-16 20:55:52 🗄️ Using cached table name: movie_sessions
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417720636947824822 (up: 0, down: 0)
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] 📝 Skipping forum post title update for: Viva Variety (votes: +0/-0) to avoid spam messages
09-16 20:55:52 📝 Updated existing TV show forum post: Viva Variety
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417720532928823408 (up: 0, down: 0)
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] 📝 Skipping forum post title update for: Bill Hader/Hozier (votes: +0/-0) to avoid spam messages
09-16 20:55:52 📝 Updated existing TV show forum post: Bill Hader/Hozier
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 20:55:52 2025-09-17 03:55:52 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 20:55:53 2025-09-17 03:55:53 [DEBUG] [1413732572424437944] 📋 Found 3 active threads, 0 archived threads
09-16 20:55:53 2025-09-17 03:55:53 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Viva Variety (1417720636947824822) - pinned: false, archived: false
09-16 20:55:54 2025-09-17 03:55:54 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Bill Hader/Hozier (1417720532928823408) - pinned: false, archived: false
09-16 20:55:54 2025-09-17 03:55:54 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Recommend TV Shows (1417719765136572628) - pinned: false, archived: false
09-16 20:55:54 2025-09-17 03:55:54 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 20:55:54 2025-09-17 03:55:54 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 20:55:54 2025-09-17 03:55:54 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 📺 Recommend TV Shows
09-16 20:55:54 2025-09-17 03:55:54 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=tv_show
09-16 20:55:54 2025-09-17 03:55:54 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post

Discord UI Observations:
- Admin channel posts to select winner, etc, never appeared.
```

### **Test 4.3: Mixed Session Sync**
**Objective**: Verify mixed sessions sync both content types

**Steps**:
1. Create mixed session (🎬 Plan Mixed Session)
2. Add 1 movie and 1 TV show
3. Use "Sync Channels" button

**Expected Results**:
- ✅ Both movie and TV show preserved
- ✅ Mixed content handled correctly

**Results**:
```
PASS/FAIL:
PASS AND FAIL
Logs:
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 🕐 Session times (America/Los_Angeles):
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG]    Session: 10/10/2025, 11:00:00 PM (2025-10-11T06:00:00.000Z)
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG]    Voting ends: 10/10/2025, 10:00:00 PM (2025-10-11T05:00:00.000Z)
09-16 20:57:52 🗄️ Using cached table name: movie_sessions
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 📍 Found Watch Party Channel: Movie Night VC (2)
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 📍 Setting voice event in channel: #Movie Night VC
09-16 20:57:52 2025-09-17 03:57:52 [INFO ] ✅ Created Discord event: 🎬 Watch Party (ID: 1417721192608960627) - Duration: 150 minutes
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 📢 Skipping event notification message in forum mode
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 📅 Saving event ID 1417721192608960627 to session 4
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 🗄️ Database: Updating session 4 with event ID 1417721192608960627
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 🗄️ Database: Update result - affected rows: 1
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 📅 Successfully saved event ID to database
09-16 20:57:52 2025-09-17 03:57:52 [INFO ] 📅 Created Discord event: 🎬 Watch Party (1417721192608960627)
09-16 20:57:52 2025-09-17 03:57:52 [DEBUG] 📋 Fetching voting channel: 1414130515719618650
09-16 20:57:52 📋 Voting channel is a forum channel: movie-night-voting-forum
09-16 20:57:52 🗄️ Using cached table name: movie_sessions
09-16 20:57:53 2025-09-17 03:57:53 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 20:57:53 2025-09-17 03:57:53 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 20:57:53 2025-09-17 03:57:53 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 20:57:54 2025-09-17 03:57:54 [DEBUG] [1413732572424437944] 📋 Found 1 active threads, 0 archived threads
09-16 20:57:54 2025-09-17 03:57:54 [DEBUG] [1413732572424437944] 📋 Thread: 🚫 No Active Voting Session (1417721114284654603) - pinned: false, archived: false
09-16 20:57:54 2025-09-17 03:57:54 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 20:57:54 2025-09-17 03:57:54 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 20:57:54 2025-09-17 03:57:54 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🚫 No Active Voting Session
09-16 20:57:54 2025-09-17 03:57:54 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=mixed
09-16 20:57:55 2025-09-17 03:57:55 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 20:57:55 2025-09-17 03:57:55 [DEBUG] 📋 Forum channel setup complete - movies will appear as individual posts
09-16 20:57:55 2025-09-17 03:57:55 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 20:57:55 🗄️ Using cached table name: movie_sessions
09-16 20:57:55 2025-09-17 03:57:55 [DEBUG] 🔧 Created and pinned admin control panel
09-16 20:57:55 2025-09-17 03:57:55 [DEBUG] ⏰ Session 4 voting ends in 24 days - will be checked daily
09-16 20:57:55 2025-09-17 03:57:55 [INFO ] 🎬 Voting session created: Watch Party - Friday, October 10, 2025 by berman_wa
09-16 20:58:04 🗄️ Using cached table name: movie_sessions
09-16 20:58:06 🗄️ Using cached table name: movie_sessions
09-16 20:58:14 2025-09-17 03:58:14 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: The Matrix, episode: null, where: Test
09-16 20:58:14 2025-09-17 03:58:14 [DEBUG] Content recommendation: The Matrix on Test
09-16 20:58:15 🗄️ Using cached table name: movie_sessions
09-16 20:58:15 2025-09-17 03:58:15 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417721288021245962
09-16 20:58:16 🗄️ Using cached table name: movie_sessions
09-16 20:58:16 🔍 DEBUG: createMovieWithImdb (button handler) called with title: The Matrix, where: Test, imdbId: tt0133093
09-16 20:58:16 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] 🔍 DEBUG: Detected content type: movie for "The Matrix"
09-16 20:58:16 🗄️ Using cached table name: movie_sessions
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] [{
09-16 20:58:16   "id": 1,
09-16 20:58:16   "guild_id": "1413732572424437944",
09-16 20:58:16   "movie_channel_id": "1414130515719618650",
09-16 20:58:16   "admin_roles": [
09-16 20:58:16     "1414419061856796763"
09-16 20:58:16   ],
09-16 20:58:16   "moderator_roles": [
09-16 20:58:16     "1414026783250059274"
09-16 20:58:16   ],
09-16 20:58:16   "voting_roles": [
09-16 20:58:16     "1414026866817236992"
09-16 20:58:16   ],
09-16 20:58:16   "default_timezone": "UTC",
09-16 20:58:16   "watch_party_channel_id": "1413978046523768963",
09-16 20:58:16   "admin_channel_id": "1413978094074855494",
09-16 20:58:16   "vote_cap_enabled": 1,
09-16 20:58:16   "vote_cap_ratio_up": "0.3333",
09-16 20:58:16   "vote_cap_ratio_down": "0.2000",
09-16 20:58:16   "vote_cap_min": 1,
09-16 20:58:16   "created_at": "2025-09-13T08:36:19.000Z",
09-16 20:58:16   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 20:58:16 }] Guild config for 1413732572424437944:
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 20:58:16 2025-09-17 03:58:16 [INFO ] 🎬 Creating movie recommendation: The Matrix in Forum channel (movie-night-voting-forum)
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] 🔍 DEBUG: Calling createForumMovieRecommendation
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMovieRecommendation called with:
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] 🔍 DEBUG: Created movie embed for: The Matrix
09-16 20:58:16 2025-09-17 03:58:16 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost
09-16 20:58:16 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:58:16   channelId: '1414130515719618650',
09-16 20:58:16   channelName: 'movie-night-voting-forum',
09-16 20:58:16   channelType: 15,
09-16 20:58:16   movieTitle: 'The Matrix',
09-16 20:58:16   hasEmbed: true,
09-16 20:58:16   componentsLength: 0
09-16 20:58:16 }
09-16 20:58:16 2025-09-17 03:58:16 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: The Matrix in channel: movie-night-voting-forum
09-16 20:58:16 🔍 DEBUG: About to call channel.threads.create
09-16 20:58:17 2025-09-17 03:58:17 [INFO ] [1413732572424437944] ✅ Created forum post: 🎬 The Matrix (ID: 1417721296422436915) in channel: movie-night-voting-forum
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417721296422436915
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417721296422436915 (up: 0, down: 0)
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] 🔍 DEBUG: Created voting buttons for forum post: 1417721296422436915
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] 💾 Saving forum movie to database: The Matrix (Message: 1417721296422436915, Thread: 1417721296422436915)
09-16 20:58:17 🗄️ Using cached table name: movie_sessions
09-16 20:58:17 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 20:58:17   hasMessage: true,
09-16 20:58:17   hasThread: true,
09-16 20:58:17   movieId: 21,
09-16 20:58:17   messageId: '1417721296422436915',
09-16 20:58:17   threadId: '1417721296422436915'
09-16 20:58:17 }
09-16 20:58:17 🗄️ Using cached table name: movie_sessions
09-16 20:58:17 🔍 Active voting session for guild 1413732572424437944: Session 4
09-16 20:58:17 🔍 Movie 1417721296422436915 in voting session: true (movie session_id: 4)
09-16 20:58:17 2025-09-17 03:58:17 [DEBUG] Pinned messages result is not a Collection, skipping pinned search
09-16 20:58:18 🗄️ Using cached table name: movie_sessions
09-16 20:58:18 2025-09-17 03:58:18 [DEBUG] 🔧 Updated pinned admin control panel
09-16 20:58:18 2025-09-17 03:58:18 [DEBUG] 📋 Posted movie to admin channel: The Matrix
09-16 20:58:18 2025-09-17 03:58:18 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417721302076362822
09-16 20:59:04 🗄️ Using cached table name: movie_sessions
09-16 20:59:07 2025-09-17 03:59:07 [DEBUG]  Saved 0 RSVPs for session 4
09-16 20:59:17 🗄️ Using cached table name: movie_sessions
09-16 20:59:27 2025-09-17 03:59:27 [DEBUG] 🔍 DEBUG: handleMovieRecommendationModal called with title: Breaking Bad S3E2, episode: null, where: Test
09-16 20:59:27 2025-09-17 03:59:27 [DEBUG] Content recommendation: Breaking Bad S3E2 on Test
09-16 20:59:28 🔍 Detected episode request: Breaking Bad S3E2
09-16 20:59:28 🔍 Searching for episode: Breaking Bad S3E2
09-16 20:59:28 ✅ Found episode: Caballo sin Nombre (2010)
09-16 20:59:28 🗄️ Using cached table name: movie_sessions
09-16 20:59:28 2025-09-17 03:59:28 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417721593597005896
09-16 20:59:30 🗄️ Using cached table name: movie_sessions
09-16 20:59:30 🔍 DEBUG: createMovieWithImdb (button handler) called with title: Breaking Bad S3E2, where: Test, imdbId: tt1615186
09-16 20:59:30 🔍 DEBUG: About to call movieCreation.createMovieRecommendation with IMDb data from button handler
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 🔍 DEBUG: Detected content type: tv_show for "Caballo sin Nombre"
09-16 20:59:30 🗄️ Using cached table name: movie_sessions
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] [{
09-16 20:59:30   "id": 1,
09-16 20:59:30   "guild_id": "1413732572424437944",
09-16 20:59:30   "movie_channel_id": "1414130515719618650",
09-16 20:59:30   "admin_roles": [
09-16 20:59:30     "1414419061856796763"
09-16 20:59:30   ],
09-16 20:59:30   "moderator_roles": [
09-16 20:59:30     "1414026783250059274"
09-16 20:59:30   ],
09-16 20:59:30   "voting_roles": [
09-16 20:59:30     "1414026866817236992"
09-16 20:59:30   ],
09-16 20:59:30   "default_timezone": "UTC",
09-16 20:59:30   "watch_party_channel_id": "1413978046523768963",
09-16 20:59:30   "admin_channel_id": "1413978094074855494",
09-16 20:59:30   "vote_cap_enabled": 1,
09-16 20:59:30   "vote_cap_ratio_up": "0.3333",
09-16 20:59:30   "vote_cap_ratio_down": "0.2000",
09-16 20:59:30   "vote_cap_min": 1,
09-16 20:59:30   "created_at": "2025-09-13T08:36:19.000Z",
09-16 20:59:30   "updated_at": "2025-09-15T02:35:38.000Z"
09-16 20:59:30 }] Guild config for 1413732572424437944:
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] Configured movie channel ID: 1414130515719618650
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] [1413732572424437944] 🔍 DEBUG: Fetched channel: movie-night-voting-forum (1414130515719618650) type=15 forum=true text=false
09-16 20:59:30 2025-09-17 03:59:30 [INFO ] 🎬 Creating TV show recommendation: Caballo sin Nombre in Forum channel (movie-night-voting-forum)
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 🔍 DEBUG: Calling createForumTVShowRecommendation
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] [[object Object]] 🔍 DEBUG: createForumTVShowRecommendation called with:
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 🔍 DEBUG: Created TV show embed for: Caballo sin Nombre
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 🔍 DEBUG: About to call createForumMoviePost for TV show
09-16 20:59:30 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:59:30   channelId: '1414130515719618650',
09-16 20:59:30   channelName: 'movie-night-voting-forum',
09-16 20:59:30   channelType: 15,
09-16 20:59:30   movieTitle: 'Caballo sin Nombre',
09-16 20:59:30   hasEmbed: true,
09-16 20:59:30   componentsLength: 0
09-16 20:59:30 }
09-16 20:59:30 2025-09-17 03:59:30 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Caballo sin Nombre in channel: movie-night-voting-forum
09-16 20:59:30 🔍 DEBUG: About to call channel.threads.create
09-16 20:59:30 2025-09-17 03:59:30 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Caballo sin Nombre (ID: 1417721604385013842) in channel: movie-night-voting-forum
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417721604385013842
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] [[object Object]] 🔍 DEBUG: createForumMoviePost result:
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417721604385013842 (up: 0, down: 0)
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 🔍 DEBUG: Updated forum post with voting buttons and IMDb data
09-16 20:59:30 2025-09-17 03:59:30 [DEBUG] 💾 Saving forum TV show to database: Caballo sin Nombre (Message: 1417721604385013842, Thread: 1417721604385013842)
09-16 20:59:30 🗄️ Using cached table name: movie_sessions
09-16 20:59:30 🔍 DEBUG: movieCreation.createMovieRecommendation with IMDb result from button handler: {
09-16 20:59:30   hasMessage: true,
09-16 20:59:30   hasThread: true,
09-16 20:59:30   movieId: undefined,
09-16 20:59:30   messageId: '1417721604385013842',
09-16 20:59:30   threadId: '1417721604385013842'
09-16 20:59:30 }
09-16 20:59:31 2025-09-17 03:59:31 [DEBUG] 📝 Tracked ephemeral message for user 1407961422540968118: 1417721606851264512
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 📋 Syncing forum channel: movie-night-voting-forum
09-16 20:59:57 🗄️ Using cached table name: movie_sessions
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417721296422436915 (up: 0, down: 0)
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 📝 Skipping forum post title update for: The Matrix (votes: +0/-0) to avoid spam messages
09-16 20:59:57 📝 Updated existing forum post: The Matrix
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417721604385013842 (up: 0, down: 0)
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 📝 Skipping forum post title update for: Caballo sin Nombre (votes: +0/-0) to avoid spam messages
09-16 20:59:57 📝 Updated existing TV show forum post: Caballo sin Nombre
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417720636947824822 (up: 0, down: 0)
09-16 20:59:57 2025-09-17 03:59:57 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:59:57 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:59:57   channelId: '1414130515719618650',
09-16 20:59:57   channelName: 'movie-night-voting-forum',
09-16 20:59:57   channelType: 15,
09-16 20:59:57   movieTitle: 'Viva Variety',
09-16 20:59:57   hasEmbed: true,
09-16 20:59:57   componentsLength: 1
09-16 20:59:57 }
09-16 20:59:57 2025-09-17 03:59:57 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Viva Variety in channel: movie-night-voting-forum
09-16 20:59:57 🔍 DEBUG: About to call channel.threads.create
09-16 20:59:58 2025-09-17 03:59:58 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Viva Variety (ID: 1417721720013324310) in channel: movie-night-voting-forum
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417721720013324310
09-16 20:59:58 📝 Created new TV show forum post: Viva Variety (Thread: 1417721720013324310)
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] 🔍 DEBUG: Creating voting buttons for message: 1417720532928823408 (up: 0, down: 0)
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] 🔍 DEBUG: Created 1 button rows
09-16 20:59:58 🔍 DEBUG: createForumMoviePost called with: {
09-16 20:59:58   channelId: '1414130515719618650',
09-16 20:59:58   channelName: 'movie-night-voting-forum',
09-16 20:59:58   channelType: 15,
09-16 20:59:58   movieTitle: 'Bill Hader/Hozier',
09-16 20:59:58   hasEmbed: true,
09-16 20:59:58   componentsLength: 1
09-16 20:59:58 }
09-16 20:59:58 2025-09-17 03:59:58 [INFO ] [1413732572424437944] 📋 Creating forum post for movie: Bill Hader/Hozier in channel: movie-night-voting-forum
09-16 20:59:58 🔍 DEBUG: About to call channel.threads.create
09-16 20:59:58 2025-09-17 03:59:58 [INFO ] [1413732572424437944] ✅ Created forum post: 📺 Bill Hader/Hozier (ID: 1417721721187729429) in channel: movie-night-voting-forum
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] [1413732572424437944] 🔍 DEBUG: Got starter message: 1417721721187729429
09-16 20:59:58 📝 Created new TV show forum post: Bill Hader/Hozier (Thread: 1417721721187729429)
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] [1413732572424437944] 📋 Ensuring recommendation post in forum channel: movie-night-voting-forum
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] [[object Object]] 📋 Active session provided: 1413732572424437944
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] [1413732572424437944] 📋 Fetching threads to find pinned posts...
09-16 20:59:58 2025-09-17 03:59:58 [DEBUG] [1413732572424437944] 📋 Found 5 active threads, 0 archived threads
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Bill Hader/Hozier (1417721721187729429) - pinned: false, archived: false
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Viva Variety (1417721720013324310) - pinned: false, archived: false
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Thread: 📺 Caballo sin Nombre (1417721604385013842) - pinned: false, archived: false
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Thread: 🎬 The Matrix (1417721296422436915) - pinned: false, archived: false
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Thread: 🎬 Recommend Content (1417721114284654603) - pinned: false, archived: false
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Found 1 system posts, pinned post: none
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 No pinned post detected but 1 system posts exist - checking for hidden pins
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Attempted to unpin potentially hidden pinned post: 🎬 Recommend Content
09-16 20:59:59 2025-09-17 03:59:59 [DEBUG] [1413732572424437944] 📋 Content type determination: content_type=mixed
09-16 21:00:00 2025-09-17 04:00:00 [DEBUG] [1413732572424437944] 📋 Reused existing system post as recommendation post
09-16 21:00:04 🗄️ Using cached table name: movie_sessions
09-16 21:01:04 🗄️ Using cached table name: movie_sessions

Discord UI Observations:
- "Recommend Content" fields doesn't allow for specifying a TV show (should be optional, but recommended for adding TV shows)
- No Admin channel post for the added TV show (only seems to work for movies)
- Carryover TV shows appeared, but not carryover movies
- After sync, only admin channel post for the movie appeared (no post for TV shows)

```

---

## **TEST SUITE 5: MIXED CONTENT TYPE FUNCTIONALITY**

### **Test 5.1: Mixed Session Creation**
**Objective**: Test new mixed session UI

**Steps**:
1. Click "🎬 Plan Mixed Session" button
2. Fill in session details
3. Create session

**Expected Results**:
- ✅ Button appears in admin panel
- ✅ Session creates with "Watch Party" name
- ✅ Recommendation post shows "🎬 Recommend Content"
- ✅ Button says "🎬 Recommend Content"

**Results**:
```
PASS/FAIL:
PASS
Session Name Created:
Used default
Recommendation Post Title:
Recommend Content
Button Text:
Recommend Content
Logs:
See logs from Test 4.3

```

### **Test 5.2: Mixed Session Content Addition**
**Objective**: Verify mixed sessions accept both movies and TV shows

**Steps**:
1. In mixed session, add 1 movie
2. Add 1 TV show episode
3. Verify both appear correctly

**Expected Results**:
- ✅ Movie appears with 🍿 emoji
- ✅ TV show appears with 📺 emoji
- ✅ No content type mismatch errors

**Results**:
```
PASS/FAIL:
FAIL
Movie Post Title:
🎬 The Matrix
TV Show Post Title:
📺 Caballo sin Nombre (should be Breaking Bad - S3E2)
Any Errors:
See logs from Test 4.3

```

---

## **TEST SUITE 6: CARRYOVER & PERSISTENCE VERIFICATION**

### **Test 6.1: Mixed Content Carryover**
**Objective**: Test carryover with mixed content

**Steps**:
1. Create mixed session
2. Add 1 movie and 1 TV show
3. Cancel session
4. Create new mixed session
5. Check carryover

**Expected Results**:
- ✅ Both movie and TV show carry over
- ✅ Proper emojis maintained

**Results**:
```
PASS/FAIL:
FAIL
Carryover Logs:
See logs from Test 4.3

Content Carried Over:
All expected items

Discord UI Observations:
- Movie and TV shows carried over but only movie post had an accompanying Admin channel post.
```

### **Test 6.2: Cross-Type Carryover**
**Objective**: Test carryover between different session types

**Steps**:
1. Create movie session, add movies
2. Cancel, create TV session
3. Check if movies still carry over (should not)

**Expected Results**:
- ✅ Movies don't carry over to TV session
- ✅ Content type restrictions respected

**Results**:
```
PASS/FAIL:
FAIL
Behavior Observed:
Movie session created, added The Matrix, Canelled, created TV session, saw The Matrix carryover to TV session.

```

---

## **TEST SUITE 7: EDGE CASES & STRESS TESTING**

### **Test 7.1: Rapid Session Operations**
**Objective**: Test system stability

**Steps**:
1. Create session
2. Rapidly add content (5+ items quickly)
3. Sync multiple times rapidly
4. Cancel session

**Expected Results**:
- ✅ No duplicate posts
- ✅ No crashes or errors
- ✅ Clean cancellation

**Results**:
```
PASS/FAIL:
PASS
Issues Encountered:


```

### **Test 7.2: Content Type Validation**
**Objective**: Verify content type restrictions work

**Steps**:
1. Create movie session
2. Try to add TV show (should be blocked)
3. Create TV session  
4. Try to add movie (should be blocked)
5. Create mixed session
6. Add both (should work)

**Expected Results**:
- ✅ Appropriate error messages for mismatches
- ✅ Mixed sessions accept everything

**Results**:
```
PASS/FAIL:
FAIL
Error Messages Seen:
- No errors, but no block (Added '30 Rock' to movie session, didn't get a warning/error)
- Creating a TV session, carryover movies showed up
- Creating a TV session, added I Know What You Did Last Summer (movie), no error

```

---

## **TEST SUITE 8: DISCORD EVENT LIFECYCLE**

### **Test 8.1: Event Management Across Types**
**Objective**: Verify Discord events work for all session types

**Steps**:
1. Create movie session → Check Discord events
2. Create TV session → Check Discord events  
3. Create mixed session → Check Discord events
4. Cancel each → Verify events deleted

**Expected Results**:
- ✅ All session types create Discord events
- ✅ All events properly deleted on cancellation

**Results**:
```
Movie Session Event: PASS
TV Session Event: PASS 
Mixed Session Event: PASS

Event Deletion: PASS

Notes:


```

---

## **OVERALL ASSESSMENT**

### **Critical Issues Found**:
```
[List any critical issues that break core functionality]
```

### **Minor Issues Found**:
```
[List any minor issues or improvements needed]
```

### **Performance Notes**:
```
[Any performance observations - speed, responsiveness, etc.]
```

### **Recommendation**:
```
READY FOR PRODUCTION: NO

Reason:
Too many small issues.

```

---

## **TESTING PRIORITY**
1. **Test Suite 4** (Sync Verification) - **CRITICAL** 
2. **Test Suite 5** (Mixed Content) - **HIGH**
3. **Test Suite 6** (Carryover) - **MEDIUM**
4. **Test Suite 7** (Edge Cases) - **MEDIUM**
5. **Test Suite 8** (Discord Events) - **LOW**

**Focus on Test Suites 4 and 5 first** - these validate the critical fixes.
