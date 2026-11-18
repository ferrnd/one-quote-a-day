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

The table embedded in the module covers 2000-01-01 to 2399-12-31: exactly one
Gregorian cycle, after which weekdays and leap years repeat. Outside that
window the module recomputes the identical schedule on the fly. Both paths are
tested against each other and against the Python reference implementation.

Every line of the schedule in `generated/quotes.wat` is annotated with its date,
weekday, quote index and author, so the calendar can be audited with `grep`:

```sh
grep "2026-12-25" generated/quotes.wat
```

