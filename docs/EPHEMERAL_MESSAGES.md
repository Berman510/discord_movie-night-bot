# Ephemeral Messages Catalog

Purpose: Inventory of every ephemeral message path in this repository so we can decide per‑message expiration behavior. You can mark each item’s desired policy in the "Proposed Expiration" column.

Legend

- Send method:
  - MF.E = flags: MessageFlags.Ephemeral
  - EM.send = ephemeralManager.sendEphemeral()
  - Defer MF.E = interaction.deferReply({ flags: MessageFlags.Ephemeral })
  - FU MF.E = interaction.followUp({ flags: MessageFlags.Ephemeral })
  - Legacy eph = { ephemeral: true } (to be modernized to MF.E where found)
- Auto-dismiss: best-effort deleteReply timers present in code (not guaranteed)

Notes

- Some flows use EM.send which always sends ephemeral with MF.E under the hood.
- Where auto-dismiss timers exist, they are listed; these can be adjusted centrally later.
- Throttling: ephemeralManager.startThrottle/isThrottled used to curb repeated panels.

---

## handlers/index.js

- [IDX-ERR] Unknown/global handler error reply — Send: MF.E — Purpose: generic error — Proposed Expiration: \_\_\_\_

## handlers/commands.js

- [CMD-UNKNOWN] Unknown command — Send: MF.E — Purpose: guard — Proposed: \_\_\_\_
- [CMD-NOSESSION-ADD] No active voting session msg (recommend gate) — Send: MF.E — Purpose: guidance — Proposed: \_\_\_\_
- [CMD-PLANNED-EMBED] "Queued for Next" embed when there’s no active session but planned items exist — Send: MF.E — Proposed: \_\_\_\_
- [CMD-QUEUE-EMPTY] Active session exists but queue empty — Send: MF.E — Proposed: \_\_\_\_
- [CMD-QUEUE-LIST] Current queue summary embed — Send: MF.E — Proposed: \_\_\_\_
- [CMD-HELP] Help embed — Send: MF.E — Proposed: \_\_\_\_
- [CMD-CONFIG-PERM] Configure permission denied — Send: MF.E — Proposed: \_\_\_\_
- [CMD-CONFIG-NODB] Configure DB not available — Send: MF.E — Proposed: \_\_\_\_
- [CMD-CONFIG-UNKNOWN] Configure unknown action — Send: MF.E — Proposed: \_\_\_\_
- [CMD-CONFIG-ERR] Configure error — Send: MF.E — Proposed: \_\_\_\_
- [CMD-SETUP-PERM] Setup permission denied — Send: MF.E — Proposed: \_\_\_\_
- [CMD-WATCHED-PERM] Mark watched permission denied — Send: MF.E — Proposed: \_\_\_\_
- [CMD-WATCHED-NOTFOUND] Mark watched movie not found — Send: MF.E — Proposed: \_\_\_\_
- [CMD-WATCHED-OK] Mark watched success — Send: MF.E — Proposed: \_\_\_\_
- [CMD-WATCHED-ERR] Mark watched error — Send: MF.E — Proposed: \_\_\_\_
- [CMD-SKIP-PERM] Skip permission denied — Send: MF.E — Proposed: \_\_\_\_
- [CMD-SKIP-NOTFOUND] Skip movie not found — Send: MF.E — Proposed: \_\_\_\_
- [CMD-SKIP-OK] Skip success — Send: MF.E — Proposed: \_\_\_\_
- [CMD-SKIP-ERR] Skip error — Send: MF.E — Proposed: \_\_\_\_
- [CMD-PLAN-PERM] Plan permission denied — Send: MF.E — Proposed: \_\_\_\_
- [CMD-PLAN-NOTFOUND] Plan movie not found — Send: MF.E — Proposed: \_\_\_\_
- [CMD-PLAN-OK] Plan success — Send: MF.E — Proposed: \_\_\_\_
- [CMD-PLAN-ERR] Plan error — Send: MF.E — Proposed: \_\_\_\_
- [CMD-DBG-CONFIG] Debug config info — Send: MF.E — Proposed: \_\_\_\_
- [CMD-DBG-CONFIG-ERR] Debug config error — Send: MF.E — Proposed: \_\_\_\_
- [CMD-DBG-SESSION] Debug session info — Send: MF.E — Proposed: \_\_\_\_
- [CMD-DBG-SESSION-ERR] Debug session error — Send: MF.E — Proposed: \_\_\_\_

## commands/admin-panel.js

- [PAN-PERM] Permission denied (Administrator/Manage Channels) — Send: Legacy eph — Proposed: \_\_\_\_
- [PAN-RESTORED] Admin panel restored confirmation — Send: Legacy eph — Proposed: \_\_\_\_
- [PAN-ERR] Error restoring admin panel — Send: Legacy eph — Proposed: \_\_\_\_

## handlers/selects.js

- [SEL-CLEANUP] Force cleanup previous ephemerals on select open — Note: tracking only
- [SEL-UNKNOWN] Unknown select menu — Send: MF.E — Proposed: \_\_\_\_
- [SEL-ERR] Select processing error — Send: MF.E — Proposed: \_\_\_\_
- [SEL-DP-PERM] Deep purge: permission denied — Send: MF.E — Proposed: \_\_\_\_
- [SEL-DP-PREP-ERR] Deep purge: preparation error — Send: MF.E — Proposed: \_\_\_\_
- [SEL-DP-CAT-PERM] Deep purge category select: permission denied — Send: MF.E — Proposed: \_\_\_\_
- [SEL-DP-CAT-ERR] Deep purge category update error — Send: MF.E — Proposed: \_\_\_\_
- [SEL-IMDB-DUMMY] IMDb selection processed (placeholder) — Send: MF.E — Proposed: \_\_\_\_

## handlers/modals.js (Movie/TV recommendation)

- [MOD-UNKNOWN] Unknown modal — Send: MF.E — Proposed: \_\_\_\_
- [MOD-ERR] Modal processing error — Send: MF.E — Proposed: \_\_\_\_
- [MOD-STATUS-CONFIRM] Status change requires confirmation (with buttons) — Send: MF.E — Proposed: \_\_\_\_
- [MOD-DEFER] Defer for IMDb/network ops — Send: Defer MF.E — Proposed: \_\_\_\_
- [MOD-WRONG-CONTENT] Wrong content type for session — Send: MF.E — Proposed: \_\_\_\_
- [MOD-EP-NOTFOUND] Episode not found (with suggestions) — Send: MF.E — Proposed: \_\_\_\_
- [MOD-IMDB-SELECT] IMDb search results panel — Send: EM.send — Proposed: \_\_\_\_
- [MOD-SPELL-SUGG] Spell correction suggestions — Send: EM.send — Proposed: \_\_\_\_
- [MOD-CREATE-OK] Create recommendation: success confirmation — Send: MF.E — Auto-dismiss: 5s — Proposed: \_\_\_\_
- [MOD-CREATE-ERR] Create recommendation: error — Send: MF.E — Proposed: \_\_\_\_
- [MOD-DP-PERM] Deep purge modal: permission denied — Send: MF.E — Proposed: \_\_\_\_
- [MOD-DP-CONFIRM-TXT] Deep purge modal: confirmation text invalid — Send: MF.E — Proposed: \_\_\_\_
- [MOD-DP-DEFER] Deep purge modal: defer — Send: Defer MF.E — Proposed: \_\_\_\_

## handlers/buttons.js (Voting, Admin, Setup, IMDb flows)

Voting

- [BTN-VOTE-PERM] Voting permission required — Send: MF.E — Proposed: \_\_\_\_
- [BTN-VOTE-UNKNOWN] Unknown button — Send: MF.E — Proposed: \_\_\_\_
- [BTN-VOTE-ERR] Voting generic error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-VOTE-CONTENT-MISSING] Content not found in DB — Send: FU Legacy eph — Proposed: \_\_\_\_
- [BTN-VOTE-CAP] Vote cap reached warning — Send: FU Legacy eph — Proposed: \_\_\_\_
- [BTN-VOTE-SAVE-ERR] Failed to save vote — Send: FU Legacy eph — Proposed: \_\_\_\_
- [BTN-STATUS-ERR] Update status error (reply/followUp) — Send: MF.E — Proposed: \_\_\_\_
- [BTN-PARSE-ERR] Parse info error — Send: MF.E — Proposed: \_\_\_\_

Recommendation/Selection flows

- [BTN-NOSESSION-ADD] No active session (button path) — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SEL-EXPIRED] Selection expired — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SEL-MISMATCH] Session/content mismatch warning — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SEL-ERR] Selection processing error (reply/followUp) — Send: MF.E — Proposed: \_\_\_\_
- [BTN-CREATE-OK-NOIMDB] Created without IMDb — Send: EM.send — Proposed: \_\_\_\_
- [BTN-CREATE-OK-IMDB] Created with IMDb — Send: EM.send — Proposed: \_\_\_\_
- [BTN-CREATE-ERR] Create movie error (w/ EM.send fallback) — Send: EM.send — Proposed: \_\_\_\_

Admin movie actions

- [BTN-ADMIN-PERM] Admin/mod permission required — Send: MF.E — Proposed: \_\_\_\_
- [BTN-ADMIN-PANEL-CANCEL] Admin pick winner cancel — Send: MF.E — Proposed: \_\_\_\_
- [BTN-ADMIN-UNKNOWN] Unknown admin action — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SCHEDULE-OK] Schedule movie success — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SCHEDULE-ERR] Schedule movie error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-BAN-OK] Ban movie success — Send: MF.E — Proposed: \_\_\_\_
- [BTN-BAN-ERR] Ban movie error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-UNBAN-OK] Unban movie success — Send: MF.E — Proposed: \_\_\_\_
- [BTN-UNBAN-ERR] Unban movie error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-WATCHED-OK] Mark watched success — Send: MF.E — Proposed: \_\_\_\_
- [BTN-WATCHED-ERR] Mark watched error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-DETAILS] Movie details embed — Send: MF.E — Proposed: \_\_\_\_

Winner selection flow

- [BTN-WINNER-CONFIRM] Winner confirm prompt (with buttons) — Send: MF.E — Auto-dismiss: 30s — Proposed: \_\_\_\_
- [BTN-WINNER-DEFER] Winner processing defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [BTN-WINNER-FAILURE] Winner failure reply — Send: MF.E — Proposed: \_\_\_\_
- [BTN-CHOOSE-CONFIRM] Choose winner confirm prompt (with buttons) — Send: MF.E — Auto-dismiss: 30s — Proposed: \_\_\_\_
- [BTN-NOSESSION-WINNER] No active session (choose) — Send: MF.E — Proposed: \_\_\_\_
- [BTN-MOVIE-NOTFOUND] Movie not found — Send: MF.E — Proposed: \_\_\_\_
- [BTN-FINALIZE-FAIL] Finalize voting failed — Send: MF.E — Proposed: \_\_\_\_
- [BTN-WINNER-OK] Winner chosen success — Send: MF.E — Auto-dismiss: 30s — Proposed: \_\_\_\_
- [BTN-CHOOSE-ERR] Choose winner error — Send: MF.E — Proposed: \_\_\_\_

Skip to next session

- [BTN-SKIP-NOTFOUND] Movie not found — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SKIP-FAIL] Skip failed — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SKIP-OK] Skip success — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SKIP-ERR] Skip error catch — Send: MF.E — Proposed: \_\_\_\_

Admin control panel access

- [BTN-ADMIN-ACCESS-DENIED] Access denied to admin panel — Send: EM.send — Proposed: \_\_\_\_
- [BTN-ADMIN-THROTTLED] Admin panel already open (throttled) — Send: EM.send — Proposed: \_\_\_\_
- [BTN-ADMIN-PANEL] Admin panel embed + buttons — Send: MF.E — Proposed: \_\_\_\_

Admin controls: deep purge/sync/setup/etc.

- [BTN-PURGE-CONFIRM] Deep purge confirmation embed — Send: MF.E — Proposed: \_\_\_\_
- [BTN-PURGE-ERR-SETUP] Deep purge prep/submit error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SYNC-DEFER] Sync channels defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [BTN-SYNC-RESULT] Sync result (editReply) — Auto-dismiss: 8s — Proposed: \_\_\_\_
- [BTN-SYNC-ERR] Sync error (edit/followUp) — Auto-dismiss: 8s — Proposed: \_\_\_\_
- [BTN-PURGE-PERM] Purge queue permission denied — Send: MF.E — Proposed: \_\_\_\_
- [BTN-PURGE-CONFIRM-UI] Purge queue confirm UI — Send: MF.E — Proposed: \_\_\_\_
- [BTN-PURGE-OK] Purge success summary — Send: MF.E — Proposed: \_\_\_\_
- [BTN-PURGE-ERR] Purge error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-STATS-ERR] Show guild stats error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-BANNED-LIST-DEFER] Banned list defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [BTN-REFRESH-ERR] Refresh panel error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-CANCEL-SESSION-NOACTIVE] Cancel session: no active — Send: MF.E — Proposed: \_\_\_\_
- [BTN-CANCEL-SESSION-CONFIRM] Cancel session confirm UI — Send: MF.E — Proposed: \_\_\_\_
- [BTN-CANCEL-SESSION-ERR] Cancel session error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-RESCHEDULE-NOACTIVE] Reschedule: no active — Send: MF.E — Proposed: \_\_\_\_
- [BTN-RESCHEDULE-ERR] Reschedule error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-REMOVE-SUGGESTION-DEFER] Remove suggestion defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [BTN-REMOVE-SUGGESTION-FAIL] Remove suggestion failed — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SETUP-FINISH] Setup finished final embed — Send: MF.E — Proposed: \_\_\_\_

IMDb suggestion quick actions

- [BTN-SUG-EXPIRED] Suggestion expired — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SUG-INVALID] Invalid suggestion — Send: MF.E — Proposed: \_\_\_\_
- [BTN-SUG-DEFER] Suggestion search defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [BTN-SUG-ERR] Suggestion processing error — Send: MF.E — Proposed: \_\_\_\_
- [BTN-NOIMDB-EXPIRED] Create w/o IMDb expired — Send: MF.E — Proposed: \_\_\_\_
- [BTN-NOIMDB-DEFER] Create w/o IMDb defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [BTN-NOIMDB-ERR] Create w/o IMDb error — Send: MF.E — Proposed: \_\_\_\_

## services/sessions.js (Session management)

- [SES-NODB] DB not available — Send: MF.E — Proposed: \_\_\_\_
- [SES-UNKNOWN-ACTION] Unknown action — Send: MF.E — Proposed: \_\_\_\_
- [SES-CREATE-UI] Create session date/time chooser — Send: MF.E — Proposed: \_\_\_\_
- [SES-LIST-NOACTIVE] List sessions: no active session — Send: MF.E — Proposed: \_\_\_\_
- [SES-LIST] List sessions embed — Send: MF.E — Proposed: \_\_\_\_
- [SES-LIST-ERR] List sessions error — Send: MF.E — Proposed: \_\_\_\_
- [SES-CLOSE-NOID] Close: missing session id — Send: MF.E — Proposed: \_\_\_\_
- [SES-CLOSE-NOTFOUND] Close: session not found — Send: MF.E — Proposed: \_\_\_\_
- [SES-CLOSE-PERM] Close: organizer/admin only — Send: MF.E — Proposed: \_\_\_\_
- [SES-CLOSE-OK] Close: success — Send: MF.E — Proposed: \_\_\_\_
- [SES-CLOSE-FAIL] Close: failed — Send: MF.E — Proposed: \_\_\_\_
- [SES-CLOSE-ERR] Close: error — Send: MF.E — Proposed: \_\_\_\_
- [SES-WIN-NOID] Winner: missing session id — Send: MF.E — Proposed: \_\_\_\_
- [SES-WIN-NOTFOUND] Winner: not found — Send: MF.E — Proposed: \_\_\_\_
- [SES-WIN-PERM] Winner: organizer/admin only — Send: MF.E — Proposed: \_\_\_\_
- [SES-WIN-NOMOVIES] Winner: no movies — Send: MF.E — Proposed: \_\_\_\_
- [SES-WIN-OK] Winner: success — Send: MF.E — Proposed: \_\_\_\_
- [SES-WIN-FAIL] Winner: failed — Send: MF.E — Proposed: \_\_\_\_
- [SES-WIN-ERR] Winner: error — Send: MF.E — Proposed: \_\_\_\_
- [SES-ADD-NOMETA] Add movie: missing params — Send: MF.E — Proposed: \_\_\_\_
- [SES-ADD-NOTFOUND] Add movie: session not found — Send: MF.E — Proposed: \_\_\_\_
- [SES-ADD-NOMOVIE] Add movie: movie not found — Send: MF.E — Proposed: \_\_\_\_
- [SES-ADD-OK] Add movie: success — Send: MF.E — Proposed: \_\_\_\_
- [SES-ADD-FAIL] Add movie: failed — Send: MF.E — Proposed: \_\_\_\_
- [SES-ADD-ERR] Add movie: error — Send: MF.E — Proposed: \_\_\_\_
- [SES-JOIN-NOID] Join: missing id — Send: MF.E — Proposed: \_\_\_\_
- [SES-JOIN-NOTFOUND] Join: session not found — Send: MF.E — Proposed: \_\_\_\_
- [SES-JOIN-OK] Join: success embed — Send: MF.E — Proposed: \_\_\_\_
- [SES-JOIN-ERR] Join: error — Send: MF.E — Proposed: \_\_\_\_
- [SES-FROMMOVIE-NOTFOUND] Create-from-movie: not found — Send: MF.E — Proposed: \_\_\_\_
- [SES-CR-BTN-UNKNOWN] Create-session btn unknown — Send: MF.E — Proposed: \_\_\_\_
- [SES-CR-BTN-ERR] Create-session btn error — Send: MF.E — Proposed: \_\_\_\_
- [SES-CANCEL-PROMPT] Session cancel prompt — Send: MF.E — Proposed: \_\_\_\_
- [SES-CANCEL-CANCELLED] Cancel cancelled — Send: MF.E — Auto-dismiss: 8s — Proposed: \_\_\_\_
- [SES-CANCEL-OK] Session cancelled success — Send: MF.E — Auto-dismiss: 8s — Proposed: \_\_\_\_
- [SES-DATE-INVALID] Invalid date — Send: MF.E — Proposed: \_\_\_\_
- [SES-TIME-INVALID] Invalid time — Send: MF.E — Proposed: \_\_\_\_
- [SES-TIME-SAVED] Time saved prompt — Send: MF.E — Proposed: \_\_\_\_
- [SES-TIME-SAVED-ACK] Time saved ack — Send: MF.E — Proposed: \_\_\_\_
- [SES-CUSTOM-DT-ERR] Custom date/time modal err — Send: MF.E — Proposed: \_\_\_\_
- [SES-STATE-MISSING] Missing session state — Send: MF.E — Proposed: \_\_\_\_
- [SES-STATE-USER-MISSING] Missing user state — Send: MF.E — Proposed: \_\_\_\_
- [SES-DEFER-EDITOR] Defer for session editor — Send: Defer MF.E — Proposed: \_\_\_\_
- [SES-CREATE-FAIL] Create session failed — Send: MF.E — Proposed: \_\_\_\_
- [SES-CREATE-FAIL-FUP] Create session failed (followUp) — Send: FU MF.E — Proposed: \_\_\_\_

## services/voting-sessions.js (Plan Next Session wizard)

- [VS-DEFER] Defer at start — Send: Defer MF.E — Proposed: \_\_\_\_
- [VS-STATE-MISSING] State not found — Send: MF.E — Proposed: \_\_\_\_
- [VS-DATE-INVALID] Invalid session date — Send: MF.E — Proposed: \_\_\_\_
- [VS-TIME-INVALID] Invalid session time — Send: MF.E — Proposed: \_\_\_\_
- [VS-VEND-INVALID] Invalid voting end time — Send: MF.E — Proposed: \_\_\_\_
- [VS-VEND-DATE-INVALID] Invalid voting end date — Send: MF.E — Proposed: \_\_\_\_
- [VS-DATETIME-IN-PAST] Session date/time in past — Send: MF.E — Proposed: \_\_\_\_
- [VS-VEND-IN-PAST] Voting end in past — Send: MF.E — Proposed: \_\_\_\_
- [VS-VEND-AFTER-SESSION] Voting ends after session start — Send: MF.E — Proposed: \_\_\_\_
- [VS-CREATE-FAIL] Create voting session failed — Send: MF.E — Proposed: \_\_\_\_
- [VS-ERR] Wizard error — Send: MF.E — Proposed: \_\_\_\_

## services/admin-controls.js (Admin actions)

- [AC-DEFER-SYNC] Sync defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [AC-SYNC-RESULT] Sync success/none/partial results — Send: editReply — Auto-dismiss: 8s — Proposed: \_\_\_\_
- [AC-SYNC-ERR] Sync error — Send: editReply/FU MF.E — Auto-dismiss: 8s — Proposed: \_\_\_\_
- [AC-PURGE-PERM] Purge permission denied — Send: MF.E — Proposed: \_\_\_\_
- [AC-PURGE-CONFIRM] Purge confirmation UI — Send: MF.E — Proposed: \_\_\_\_
- [AC-PURGE-OK] Purge success summary — Send: FU MF.E — Proposed: \_\_\_\_
- [AC-PURGE-ERR] Purge error — Send: MF.E — Proposed: \_\_\_\_
- [AC-STATS-ERR] Guild stats error — Send: MF.E — Proposed: \_\_\_\_
- [AC-BANNED-DEFER] Banned movies list defer — Send: Defer MF.E — Proposed: \_\_\_\_
- [AC-REFRESH-ERR] Refresh panel error — Send: MF.E — Proposed: \_\_\_\_

## services/stats.js

- [STATS-OVERVIEW] Overview stats embed — Send: EM.send — Proposed: \_\_\_\_
- [STATS-TOP-NONE] Top movies: none — Send: MF.E — Proposed: \_\_\_\_
- [STATS-TOP] Top movies embed — Send: MF.E — Proposed: \_\_\_\_
- [STATS-USER-NONE] User stats: none — Send: MF.E — Proposed: \_\_\_\_
- [STATS-USER] User stats embed — Send: MF.E — Proposed: \_\_\_\_
- [STATS-MONTHLY-NONE] Monthly stats: none — Send: MF.E — Proposed: \_\_\_\_
- [STATS-MONTHLY] Monthly stats embed — Send: MF.E — Proposed: \_\_\_\_
- [STATS-ERR] Stats service error — Send: MF.E — Proposed: \_\_\_\_

## utils/config-check.js

- [CFG-PROMPT] Config prompt with button — Send: MF.E — Proposed: \_\_\_\_
- [CFG-PERM] Config button: permission denied — Send: EM.send — Proposed: \_\_\_\_
- [CFG-MENU] Config menu (options rows) — Send: MF.E/FU MF.E — Proposed: \_\_\_\_

## services/guided-setup.js

- [GS-START] Guided setup start panel — Send: EM.send — Proposed: \_\_\_\_
- [GS-MENU] Guided setup menu panel/followUp — Send: EM.send or followUp — Proposed: \_\_\_\_

---

How to use this file

- For each ID above, fill in Proposed Expiration with one of:
  - timer:Ns (auto-dismiss after N seconds)
  - on-next-interaction (dismiss/ignore on next action in flow)
  - persistent (let Discord expire naturally)
  - throttle:key:Ns (use throttle to suppress repeats for N seconds)
- If a message should be consolidated/removed, write remove and we’ll dedupe.

Gaps to confirm

- Legacy ephemeral: true still exists in a few places (notably some followUps and commands/admin-panel.js). We can standardize to MF.E for consistency and centralized policy.
- If you find any ephemerals not listed above, add them with a new ID using the path/function.
