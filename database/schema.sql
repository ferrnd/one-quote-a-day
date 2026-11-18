-- ============================================================================
--  quotes :: database schema (SQLite 3)
-- ============================================================================
--
--  The database is the single source of truth for every quote shown on the
--  site. It is rebuilt from scratch on every build: this file is applied
--  first, then every file in database/seeds/ in lexicographic order.
--
--  Quote ids are assigned in insertion order and are therefore stable for as
--  long as seeds are only ever appended. The daily schedule is derived from
--  the number of quotes, so appending a quote reshuffles the calendar.

PRAGMA foreign_keys = ON;

-- @section themes ------------------------------------------------------------
--  A theme groups quotes by the kind of struggle they speak to.

CREATE TABLE themes (
    id    INTEGER PRIMARY KEY,
    slug  TEXT    NOT NULL UNIQUE
                  CHECK (length(slug) BETWEEN 2 AND 32 AND slug NOT GLOB '*[^a-z-]*'),
    title TEXT    NOT NULL
                  CHECK (length(title) BETWEEN 2 AND 64)
) STRICT;

-- @section authors -----------------------------------------------------------
--  Authors are deduplicated by exact name. Proverbs use their origin as the
--  author ("Japanese Proverb") so that every quote can be attributed.

CREATE TABLE authors (
    id   INTEGER PRIMARY KEY,
    name TEXT    NOT NULL UNIQUE
                 CHECK (length(name) BETWEEN 2 AND 64 AND name = trim(name))
) STRICT;

-- @section quotes ------------------------------------------------------------
--  Bodies are plain printable ASCII so that the WebAssembly string pool stays
--  one byte per character and can be checksummed byte by byte.

CREATE TABLE quotes (
    id        INTEGER PRIMARY KEY,
    body      TEXT    NOT NULL UNIQUE
                      CHECK (length(body) BETWEEN 8 AND 280
                             AND body = trim(body)
                             AND body NOT GLOB '*[^ -~]*'),
    author_id INTEGER NOT NULL REFERENCES authors (id) ON DELETE RESTRICT,
    theme_id  INTEGER NOT NULL REFERENCES themes (id) ON DELETE RESTRICT
) STRICT;

-- @section indexes -----------------------------------------------------------

CREATE INDEX quotes_author_idx ON quotes (author_id);
CREATE INDEX quotes_theme_idx  ON quotes (theme_id);

