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

-- @section intake ------------------------------------------------------------
--  Seeds never touch the normalised tables directly. They insert denormalised
--  rows into the `intake` view and this trigger resolves (or creates) the
--  author and resolves the theme, aborting the whole build on unknown themes.

CREATE VIEW intake AS
    SELECT q.body AS body, a.name AS author, t.slug AS theme
      FROM quotes q
      JOIN authors a ON a.id = q.author_id
      JOIN themes  t ON t.id = q.theme_id;

CREATE TRIGGER intake_insert INSTEAD OF INSERT ON intake
BEGIN
    SELECT RAISE(ABORT, 'intake: unknown theme')
     WHERE NOT EXISTS (SELECT 1 FROM themes WHERE slug = NEW.theme);

    INSERT OR IGNORE INTO authors (name) VALUES (NEW.author);

    INSERT INTO quotes (body, author_id, theme_id)
    VALUES (NEW.body,
            (SELECT id FROM authors WHERE name = NEW.author),
            (SELECT id FROM themes  WHERE slug = NEW.theme));
END;

-- @section catalog -----------------------------------------------------------
--  Read models consumed by the build pipeline and handy for ad-hoc queries.

CREATE VIEW catalog AS
    SELECT q.id   AS id,
           q.body AS body,
           a.id   AS author_id,
           a.name AS author,
           t.slug AS theme
      FROM quotes q
      JOIN authors a ON a.id = q.author_id
      JOIN themes  t ON t.id = q.theme_id
  ORDER BY q.id;

CREATE VIEW theme_stats AS
    SELECT t.slug AS theme, t.title AS title, count(q.id) AS quotes
      FROM themes t
 LEFT JOIN quotes q ON q.theme_id = t.id
  GROUP BY t.id
  ORDER BY t.id;

CREATE VIEW author_stats AS
    SELECT a.name AS author, count(q.id) AS quotes
      FROM authors a
      JOIN quotes q ON q.author_id = a.id
  GROUP BY a.id
  ORDER BY quotes DESC, a.name;

-- @section dedications -------------------------------------------------------
--  A dedication pins a message to one exact calendar date, overriding the
--  rotation for that day only. It sits outside the quote pool: it never shows
--  up on any other day and does not change N or the schedule. The author is
--  optional; NULL means the message is shown unsigned.

CREATE TABLE dedications (
    id     INTEGER PRIMARY KEY,
    day    TEXT    NOT NULL UNIQUE
                   CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                          AND strftime('%Y-%m-%d', julianday(day)) = day),
    body   TEXT    NOT NULL
                   CHECK (length(body) BETWEEN 2 AND 280
                          AND body = trim(body)
                          AND body NOT GLOB '*[^ -~]*'),
    author TEXT    CHECK (author IS NULL
                          OR (length(author) BETWEEN 2 AND 64
                              AND author = trim(author)
                              AND author NOT GLOB '*[^ -~]*'))
) STRICT;

-- @section calendar ----------------------------------------------------------
--  How the schedule grows when quotes are added. The site launched on
--  launch_day with legacy_quotes quotes. Those days keep exactly the order
--  they had, the quotes added since are shown next in a shuffled run of
--  their own, and only then does the rotation cycle through all of them.

CREATE TABLE calendar (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    launch_day    TEXT    NOT NULL
                          CHECK (launch_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                                 AND strftime('%Y-%m-%d', julianday(launch_day)) = launch_day),
    legacy_quotes INTEGER NOT NULL CHECK (legacy_quotes >= 3)
) STRICT;

-- @section locales -----------------------------------------------------------
--  Languages the site speaks. English is the source language at position 0;
--  every other locale carries a hand-made translation of every quote.

CREATE TABLE locales (
    code     TEXT    PRIMARY KEY
                     CHECK (code GLOB '[a-z][a-z]' OR code GLOB '[a-z][a-z]-[A-Z][A-Z]'),
    name     TEXT    NOT NULL CHECK (length(name) BETWEEN 2 AND 40),
    position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
) STRICT;

-- @section translations ------------------------------------------------------
--  Translations are written by hand to carry the meaning of each quote, not
--  its words. Seeds refer to quotes by their English text, so a typo in a
--  seed aborts the build instead of attaching a translation to the wrong quote.

CREATE TABLE quote_translations (
    quote_id INTEGER NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
    locale   TEXT    NOT NULL REFERENCES locales (code),
    body     TEXT    NOT NULL CHECK (length(body) BETWEEN 2 AND 320 AND body = trim(body)),
    PRIMARY KEY (quote_id, locale)
) STRICT;

CREATE TABLE author_translations (
    author_id INTEGER NOT NULL REFERENCES authors (id) ON DELETE CASCADE,
    locale    TEXT    NOT NULL REFERENCES locales (code),
    name      TEXT    NOT NULL CHECK (length(name) BETWEEN 2 AND 64 AND name = trim(name)),
    PRIMARY KEY (author_id, locale)
) STRICT;

CREATE TABLE dedication_translations (
    dedication_id INTEGER NOT NULL REFERENCES dedications (id) ON DELETE CASCADE,
    locale        TEXT    NOT NULL REFERENCES locales (code),
    body          TEXT    NOT NULL CHECK (length(body) BETWEEN 2 AND 320 AND body = trim(body)),
    author        TEXT,
    PRIMARY KEY (dedication_id, locale)
) STRICT;

CREATE VIEW translation_intake AS
    SELECT q.body AS original, t.locale AS locale, t.body AS body
      FROM quote_translations t
      JOIN quotes q ON q.id = t.quote_id;

CREATE TRIGGER translation_intake_insert INSTEAD OF INSERT ON translation_intake
BEGIN
    SELECT RAISE(ABORT, 'translation: no quote has this English text')
     WHERE NOT EXISTS (SELECT 1 FROM quotes WHERE body = NEW.original);
    INSERT INTO quote_translations (quote_id, locale, body)
    VALUES ((SELECT id FROM quotes WHERE body = NEW.original), NEW.locale, NEW.body);
END;

CREATE VIEW author_translation_intake AS
    SELECT a.name AS original, t.locale AS locale, t.name AS name
      FROM author_translations t
      JOIN authors a ON a.id = t.author_id;

CREATE TRIGGER author_translation_intake_insert INSTEAD OF INSERT ON author_translation_intake
BEGIN
    SELECT RAISE(ABORT, 'author translation: unknown author')
     WHERE NOT EXISTS (SELECT 1 FROM authors WHERE name = NEW.original);
    INSERT INTO author_translations (author_id, locale, name)
    VALUES ((SELECT id FROM authors WHERE name = NEW.original), NEW.locale, NEW.name);
END;

CREATE VIEW translation_stats AS
    SELECT l.code AS locale, l.name AS name, count(t.quote_id) AS translated
      FROM locales l
 LEFT JOIN quote_translations t ON t.locale = l.code
  GROUP BY l.code
  ORDER BY l.position;
