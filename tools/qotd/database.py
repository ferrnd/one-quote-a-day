"""Compile database/*.sql into a SQLite database and read the catalog back."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

MIN_QUOTES = 500


class DatabaseError(RuntimeError):
    pass


@dataclass(frozen=True)
class Quote:
    id: int
    body: str
    author_id: int
    author: str
    theme: str


@dataclass(frozen=True)
class Catalog:
    quotes: list[Quote]
    authors: list[str]  # index i holds the author with id i + 1
    themes: list[tuple[str, str, int]]

    def __len__(self) -> int:
        return len(self.quotes)


def seed_files(root: Path) -> list[Path]:
    return sorted((root / "seeds").glob("*.sql"))


def compile_database(root: Path, target: Path | str = ":memory:") -> sqlite3.Connection:
    if target != ":memory:":
        target = Path(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.unlink(missing_ok=True)
    conn = sqlite3.connect(str(target))
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        conn.executescript((root / "schema.sql").read_text(encoding="utf-8"))
        for path in seed_files(root):
            try:
                conn.executescript(path.read_text(encoding="utf-8"))
            except sqlite3.DatabaseError as exc:
                raise DatabaseError(f"{path.name}: {exc}") from exc
        conn.commit()
    except Exception:
        conn.close()
        raise
    verify(conn)
    return conn


def verify(conn: sqlite3.Connection) -> None:
    (status,) = conn.execute("PRAGMA integrity_check").fetchone()
    if status != "ok":
        raise DatabaseError(f"integrity check failed: {status}")
    if conn.execute("PRAGMA foreign_key_check").fetchall():
        raise DatabaseError("foreign key check failed")
    (count,) = conn.execute("SELECT count(*) FROM quotes").fetchone()
    if count < MIN_QUOTES:
        raise DatabaseError(f"only {count} quotes, at least {MIN_QUOTES} required")
    empty = [row[0] for row in conn.execute("SELECT theme FROM theme_stats WHERE quotes = 0")]
    if empty:
        raise DatabaseError(f"themes without quotes: {', '.join(empty)}")
    (gaps,) = conn.execute("SELECT max(id) - count(*) FROM quotes").fetchone()
    if gaps:
        raise DatabaseError("quote ids are not contiguous")


def read_catalog(conn: sqlite3.Connection) -> Catalog:
    quotes = [Quote(*row) for row in conn.execute(
        "SELECT id, body, author_id, author, theme FROM catalog")]
    authors = [row[0] for row in conn.execute("SELECT name FROM authors ORDER BY id")]
    themes = [tuple(row) for row in conn.execute("SELECT theme, title, quotes FROM theme_stats")]
    if [a.id for a in quotes] != list(range(1, len(quotes) + 1)):
        raise DatabaseError("catalog ids are not 1..N")
    return Catalog(quotes=quotes, authors=authors, themes=themes)


def load(root: Path) -> Catalog:
    conn = compile_database(root)
    try:
        return read_catalog(conn)
    finally:
        conn.close()
