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

