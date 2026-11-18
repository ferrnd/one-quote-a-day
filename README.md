# quotes

A white page with one sentence in the middle. Every day at midnight, in your
own time zone, it changes. That is the whole site.

Behind it is a deliberately over-engineered machine: a SQLite database of more
than 700 quotes about overcoming, a Python compiler that turns that database
into a single 7.7 MB WebAssembly Text file, and a runtime written by hand in
raw WebAssembly that does the calendar math, the pseudo-random scheduling and
the string storage. JavaScript only reads the clock and paints the text.

## How it works

1. `database/schema.sql` defines a normalised schema (themes, authors, quotes)
   with an `intake` view whose `INSTEAD OF` trigger lets seeds insert
   denormalised rows.
2. `database/seeds/*.sql` hold the quotes, ten per file, grouped by theme.
3. `python -m tools.qotd wat` compiles the database in memory, validates it,
   computes the schedule and writes `generated/quotes.wat`: the hand-written
   fragments from `src/wat/` plus data segments for every record, string and day.
4. `node tools/assemble.mjs` assembles that file into `docs/quotes.wasm` with wabt.
5. `python -m tools.qotd site` copies `web/` into `docs/` and stamps
   cache-busting hashes into every URL.
6. In the browser, `app.js` instantiates the module, asks it for
   `quote_for_date(y, m, d)` using the local date, decodes the strings straight
   out of linear memory and sleeps until the next local midnight.

## Architecture

```
 database/schema.sql ─┐
 database/seeds/*.sql ┴─► sqlite3 ─► catalog ─┬─► schedule (PCG32 + Fisher-Yates)
                                              │            │
 src/wat/*.wat ───────────────────────────────┴─► watgen ◄─┘
                                                     │
                                       generated/quotes.wat   (7.7 MB of WAT)
                                                     │  wabt
                                              docs/quotes.wasm (370 KB)
                                                     │
 web/ ──────────────────────────────────────► docs/  ─► GitHub Pages
```

Linear memory of the module:

| Region   | Contents                                                          |
| -------- | ----------------------------------------------------------------- |
| header   | magic `QOTD`, format, counts, pointers, FNV-1a of the string pool |
| records  | 16 bytes per quote: text pointer/length, author pointer/length    |
| pool     | every author name and quote body, ASCII                           |
| schedule | one `u16` quote index per day for 146,097 days                    |
| scratch  | room for the runtime to materialise a permutation                 |

The start function validates the header and recomputes the pool checksum, so a
corrupted module refuses to instantiate instead of showing garbage.

## The schedule

Time is cut into blocks of N days, where N is the number of quotes. Each block
shows every quote exactly once, in an order produced by a Fisher-Yates shuffle
driven by PCG32 seeded with the block number. If a block would open with the
quote that closed the previous one, its first two days are swapped, so the same
quote never appears two days in a row.

Adding quotes never rewrites days already planned. The `calendar` table
records the launch day and how many quotes existed then; those first days keep
their original order, the quotes added later appear next in a shuffled run of
their own, and only after that does the rotation include everything.

The table embedded in the module covers 2000-01-01 to 2399-12-31: exactly one
Gregorian cycle, after which weekdays and leap years repeat. Outside that
window the module recomputes the identical schedule on the fly. Both paths are
tested against each other and against the Python reference implementation.

Every line of the schedule in `generated/quotes.wat` is annotated with its date,
weekday, quote index and author, so the calendar can be audited with `grep`:

```sh
grep "2026-12-25" generated/quotes.wat
```

## Building

Requirements: Python 3.10+ (standard library only) and Node.js 20+.

```sh
npm ci            # installs wabt, the only dependency
npm run build     # database -> WAT -> wasm -> docs/
npm run serve     # http://localhost:8000
```

Other commands:

```sh
npm run stats                 # quotes per theme
npm run today                 # today's quote, from the Python reference
npm run today -- 2027-01-01   # any other day
npm run build:db              # write build/quotes.sqlite for ad-hoc queries
```

Append `?date=YYYY-MM-DD` to the page URL to preview another day.

## Testing

```sh
npm test
```

- `tests/python`: PCG32 reference vectors, calendar math against `datetime`
  for four full centuries, schedule invariants, database constraints, and a
  check that `generated/quotes.wat` is up to date.
- `tests/js`: the shipped `quotes.wasm` itself: calendar math against `Date`,
  the embedded table against the on-the-fly algorithm, no repeats across the
  whole 400-year window, trap behaviour, a corrupted-binary check, and
  midnight/DST handling in the clock module.

CI runs the full build, fails if the committed `generated/` or `docs/` differ
from a fresh build, then runs both suites.

## Deploying

The built site lives in `docs/`. In the repository settings, under
**Pages**, choose **Deploy from a branch**, branch `main`, folder `/docs`.

## Project layout

```
database/        schema and seeds (the source of truth)
src/wat/         the hand-written WebAssembly Text runtime
tools/qotd/      the Python build pipeline
tools/           the wabt assembler script
web/             page, styles, clock, service worker
generated/       the generated WAT module (committed)
docs/            the deployable site (committed)
tests/           Python and Node test suites
```

## License

Code is MIT licensed. The quotes are short excerpts attributed to their authors.
