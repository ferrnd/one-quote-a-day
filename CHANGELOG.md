# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-17

### Added

- Day counter in the bottom-right corner and an archive of every past day,
  rendered lazily so it opens instantly decades from now.
- Dedications: messages pinned to one exact date, optionally unsigned, that
  override the rotation for that day only. DAY 1 (2026-11-16) carries one.

### Changed

- DAY 1 is now 2026-11-16.
- WebAssembly memory format 2: dedication records and a date lookup table.

## [1.0.0] - 2026-11-17

### Added

- SQLite schema with themes, authors, quotes, an `intake` view with an
  `INSTEAD OF` trigger, and catalog/statistics views.
- 764 quotes about overcoming from 413 authors across 15 themes.
- Hand-written WebAssembly Text runtime: Gregorian calendar math, PCG32,
  Fisher-Yates shuffling, a seam-aware daily schedule, string accessors and a
  self-validating start function.
- Python build pipeline (`python -m tools.qotd`) that compiles the database
  into `generated/quotes.wat`, with an annotated 400-year schedule.
- wabt-based assembler producing `docs/quotes.wasm`.
- A black-on-white page in Cormorant Garamond that changes at local midnight,
  with DST-safe timers, a watchdog, `?date=` previews and an offline-capable
  service worker.
- Python and Node test suites and a CI workflow that checks the committed
  build is reproducible.
