## v1.16.0: Watch Party & Session Workflow (WIP)

This is a tracking PR to land the next wave of session-centric features, admin UX improvements, and reliability upgrades. Opening early for review, discussion, and CI.

### Summary

- Shift from ad-hoc voting to explicit, named sessions
- Cleaner admin operations (Ban/Skip/Pick Winner), safer purges
- Better Discord Events integration (descriptions, posters, reschedule)
- IMDb usage optimizations and cache-first rendering to avoid API limits
- Forum improvements (vote counts in body, sort by most-voted)

### Goals & Scope (for 1.16.0)

- Session-based workflow
  - Sessions have a lifecycle (planning → voting → decided/completed/cancelled)
  - Recommendation buttons visible only during active voting
  - Auto-generated session names (date-based) and inline session description above recommend UI
  - Carry non-winning movies to the next session automatically
- Admin channel & controls
  - Admin buttons: Ban / Skip / Pick Winner (no schedule)
  - Purge Queue mirrors /movie-cleanup purge with confirmation
  - Deep Purge with confirmations; transient admin buttons
- Winner selection & announcements
  - Announce winner with IMDb details and vote breakdowns
  - Tie handling: post tie announcement and update when winner chosen
  - Clear voting posts after winner; post "No Active Voting Session" message
- Discord Events
  - Event descriptions include voting end time (Discord timestamp) and channel links
  - Include IMDb poster and full details in event description where possible
  - Reschedule edits existing event/message (no recreation), uses requester's timezone
- Forums
  - Include current vote scores in the post body, sort posts by most-voted
  - When sessions are cancelled in forum channels, remove posts and show "no active session" message
- Data, caching, and logging
  - Store IMDb info with each movie; avoid re-lookup; cross-guild cache with TTL + hard limit
  - All logging includes guild_id; configurable log level and colors

### Notable Work Already Landed on the branch (highlights)

- Session scaffolding and admin UX surfaces
- Forum/text parity improvements for post content and updates
- IMDb info rendered on re-synced/recreated/carryover posts without user interaction
- Cross-guild IMDb cache (TTL + hard limit) to reduce OMDb calls; use cached lookups throughout
- Safer embed/button rebuilds and improved error handling paths
- WebSocket dashboard pathway preferred when available; webhook remains fallback

Note: Some items above are partially implemented or awaiting final wiring. This PR is opened as a WIP to align on scope and surface deltas early.

### Backwards compatibility

- Slash command shape and channel layout intended to remain compatible
- Where schema changes are involved, they are introduced via migrations; no manual DB edits
- Fresh installs create critical tables and columns even with migrations disabled

### Config / ENV

- Discord timestamps (<t:UNIX:FORMAT>) preferred over a static default timezone
- Reschedule uses requester's timezone; no manual TZ picker
- IMDb cache tuning via env (TTL, max rows), cache can be disabled if needed

### Testing Plan

- Unit/integration:
  - Session lifecycle: create → voting → decided/cancelled
  - Carryover correctness (next_session flags and reposts)
  - Admin actions: Ban/Skip/Pick Winner safely update posts/events
  - Event reschedule: edits existing objects (idempotent) and preserves links/posters
  - Forum ordering by vote count and inclusion of vote scores in body
- Manual:
  - Text + forum channels end-to-end during a dev-guild test cycle
  - Win + tie flows, cancellation, and restart of next session

### Deployment Notes

- Run database migrations when provided for new tables/columns
- For hosts without migrations enabled, initializeTables ensures critical structures (e.g., imdb_cache)
- Webhook port selection remains configurable; WS preferred for dashboard interop

### TODO (tracked for this release)

- [ ] Session-scoped recommend UI visibility and copy
- [ ] Plan Next Session flow with time field selection
- [ ] Auto-carryover of non-winning movies on closure/cancel
- [ ] Winner announcement with IMDb details and vote breakdowns; tie workflow
- [ ] Discord Event reschedule (edit existing) + poster inclusion if possible
- [ ] Forum: vote counts in body; sort by most-voted; cleanup after winner
- [ ] Admin panel: Ban/Skip/Pick Winner; Deep Purge confirmations
- [ ] Logging polish: guild_id on all lines; configurable LOG_LEVEL/DEBUG_LOGGING
- [ ] README/.env.example/CHANGELOG updates for 1.16.0

### Screenshots / Clips (later)

- Will attach once the flows are fully wired
