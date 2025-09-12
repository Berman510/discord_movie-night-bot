# Movie Night Bot – Roadmap

This document captures planned features, technical improvements, and operational work that were previously listed as an ad‑hoc TODO in the README. It reflects intent rather than a strict promise; priorities can change based on feedback.

## Guiding Principles
- Keep the bot reliable during live events (resilient connections, predictable behavior)
- Make administration easy (clear controls, role‑based permissions, safe defaults)
- Preserve community fun (simple recommending/voting, good UX in Discord and Dashboard)

---

## Near‑Term Candidates

### Message Tracking System
Track and manage the bot’s own messages to enable robust updates and cleanup.
- [ ] Track message IDs for notifications, admin panel, recommendation posts
- [ ] Update tracked messages when sessions are rescheduled (embed + buttons + pins)
- [ ] Bidirectional sync: remove temporary markers (e.g., SESSION_UID) once tracking is in place
- [ ] Cleanup: remove/refresh obsolete tracked messages when sessions end

### Vote Caps Configuration
Expose configuration for asymmetric vote caps.
- [ ] Global per‑guild defaults (enable/disable, upvote ratio default 1/3, downvote ratio default 1/5, min votes 1)
- [ ] Optional per‑session overrides by the admin/mod who creates the session
- [ ] Document settings in README and surface in Admin Panel and/or slash commands

### Operational: PebbleHost Start Script
- [ ] Provide scripts/start-pebble.sh and README docs for a reliable “fetch/reset, npm ci, start” flow

### WS Resilience & Observability (ongoing polish)
- [ ] Jittered exponential backoff on reconnect and explicit offline timer
- [ ] Detailed logs on close codes/reasons and next reconnect attempt

---

## Medium‑Term

### Multiple Voting Sessions
- [ ] Support multiple active voting sessions concurrently
- [ ] Queue management for planned/upcoming sessions
- [ ] Handle overlapping session times and priorities

### Session‑specific Voting Channels
- [ ] Optionally scope recommendations and voting UI to per‑session channels/threads

### Administration Quality‑of‑Life
- [ ] Unban controls exposed in Admin Panel (and slash command fallback)
- [ ] “Channel Sync” improvements for creating missing threads and fixing broken links

### Analytics & Insights
- [ ] Surface RSVP list and counts consistently in Dashboard (and export)
- [ ] Voting analytics (top movies, engagement by time/genre, repeat recommendations)
- [ ] Attendance vs. RSVP comparisons per session; session duration reporting

---

## Longer‑Term / Exploratory

### Forum/Channel Enhancements
- [ ] Status‑based tags for forum posts (e.g., pending/planned/watched/banned)
- [ ] Custom status emojis / per‑server personalization

### Recommendation Intelligence
- [ ] Integrations with additional movie databases/APIs
- [ ] Taste similarity; opt‑in “you might enjoy” nudges; per‑guild preferences

### Reminders & Notifications
- [ ] Automated reminders before voting ends and session start (respecting Voting Roles)
- [ ] Opt‑in notification preferences (granular pings)

### Architecture / Infra
- [ ] Consider consolidating bot + dashboard into a monorepo once WS integration stabilizes
- [ ] Evaluate hosting the bot on AWS (ECS/Fargate) vs. PebbleHost; align CI/CD, secrets, and env parity with dashboard

---

## Delivered (recent highlights)
- [x] Dashboard ↔ Bot WebSocket integration with real‑time actions
- [x] Role‑based voting enforcement (Admins/Mods/Voting Roles; strict gating if none configured)
- [x] “Viewing Channel” renamed to “Watch Party Channel” across UI and DB
- [x] Slash commands consolidated to /movienight‑* and documented in README
- [x] Dashboard Setup Guide added; README streamlined with Quick Start and Access model

If you’d like any of these moved up in priority, please open an issue or discuss on the project board.
