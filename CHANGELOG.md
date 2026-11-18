# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.7.0] - 2026-11-18

### Added

- Languages. A Language tab in the panel switches between Auto (the
  browser's language), English and Português (Brasil), live.
- 1,000 hand-made pt-BR translations, written to carry each quote's meaning
  rather than its words, plus Portuguese author names (proverbs, classical
  authors) and the Day 1 dedication in its original words.
- The whole interface in pt-BR, with localized dates and countdowns.
- WebAssembly format 4: one record block per locale and an interned UTF-8
  string pool. The build fails if a locale is only partly translated.

## [1.6.0] - 2026-11-18

### Added

- 236 new quotes, bringing the database to exactly 1,000 with no repeats.
- A calendar table and a three-phase schedule, so growing the database never
  rewrites history: the first 764 days from launch keep exactly the order
  they had, the 236 new quotes follow in a shuffled run of their own, and
  only then does the rotation cycle through all 1,000. WebAssembly format 3.

## [1.5.0] - 2026-11-17

### Changed

- The gear now sits just left of the day counter and glides along as the
  counter grows into the countdown on hover; with the counter hidden it takes
  the corner.
- Share buttons carry app logos (Simple Icons, CC0); the image download moved
  from the page into the Share tab as "Save image".

## [1.4.0] - 2026-11-17

### Added

- A gear button replaces "!" and opens a panel with a rail of tabs on the
  left (on top on phones): Settings, How it works, Share and Credits.
- Settings, saved on this device: theme (auto, light, dark), text size,
  animations, day counter, copy format and search engine.
- Share tab: WhatsApp, Facebook, X, Telegram, Discord (copies a ready
  message), Instagram story (image via the share sheet), email and link.

## [1.3.0] - 2026-11-17

### Added

- Share button next to "!": renders the quote on screen as a 1080x1080
  image in the current theme; opens the share sheet on phones and saves the
  picture on computers.
- Right-click the quote to search for it on the web, or the author to look
  them up.
- Link previews: Open Graph and Twitter card tags with a 1200x630 image,
  rendered at build time by a dependency-free Python PNG rasteriser.

## [1.2.0] - 2026-11-17

### Added

- A "!" button in the bottom-left corner opens a card explaining every
  feature, including a live countdown for devices that cannot hover.
- Horizontal swipes on touch screens walk through past days, like the
  arrow keys.
- Quotes now scroll instead of fading: at midnight the old one drops off the
  bottom and the new one comes down from the top.
- Left and right arrow keys walk through past days with a sideways slide,
  from DAY 1 up to today.
- Click the quote to copy it, with its author.
- Hovering the day counter shows the time left until the next quote.
- Night mode from 21:00 to 06:00 local time: white on black, with a slow
  cross-fade. Force it with `?theme=day` or `?theme=night`.

### Changed

- Sizes are derived from the viewport, so browser zoom no longer changes
  the layout; the day counter sits the same distance from both edges.

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
