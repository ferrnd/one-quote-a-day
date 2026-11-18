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

