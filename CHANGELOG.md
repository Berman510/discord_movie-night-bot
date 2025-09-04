# Changelog

All notable changes to **Movie Night Bot** will be documented in this file.

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
