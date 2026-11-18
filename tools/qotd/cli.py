"""Command line interface: python -m tools.qotd <command>."""

from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

from . import __version__, database, site, watgen
from .civil import days_from_civil

ROOT = Path(__file__).resolve().parents[2]
DB_DIR = ROOT / "database"
WAT_DIR = ROOT / "src" / "wat"
WAT_OUT = ROOT / "generated" / "quotes.wat"
WEB_DIR = ROOT / "web"
DOCS_DIR = ROOT / "docs"
SQLITE_OUT = ROOT / "build" / "quotes.sqlite"


def cmd_db(args: argparse.Namespace) -> int:
    conn = database.compile_database(DB_DIR, SQLITE_OUT)
    catalog = database.read_catalog(conn)
    conn.close()
    print(f"wrote {SQLITE_OUT.relative_to(ROOT)}: {len(catalog)} quotes, "
          f"{len(catalog.authors)} authors, {len(catalog.themes)} themes")
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    catalog = database.load(DB_DIR)
    width = max(len(t[0]) for t in catalog.themes)
    for slug, title, count in catalog.themes:
        print(f"  {slug:<{width}}  {count:>4}  {'#' * (count // 2)}")
    print(f"  {'total':<{width}}  {len(catalog):>4}")
    return 0


def cmd_wat(args: argparse.Namespace) -> int:
    catalog = database.load(DB_DIR)
    size = watgen.write(catalog, WAT_DIR, WAT_OUT)
    print(f"wrote {WAT_OUT.relative_to(ROOT)}: {size:,} bytes, {len(catalog)} quotes")
    return 0


def cmd_site(args: argparse.Namespace) -> int:
    info = site.stage(WEB_DIR, DOCS_DIR)
    print(f"staged {DOCS_DIR.relative_to(ROOT)}: build {info['build']}, wasm {info['wasm']}")
    return 0


def cmd_today(args: argparse.Namespace) -> int:
    date = dt.date.fromisoformat(args.date) if args.date else dt.date.today()
    catalog = database.load(DB_DIR)
    day = days_from_civil(date.year, date.month, date.day)
    pinned = {d.day: d for d in catalog.dedications}.get(date.isoformat())
    if pinned:
        signature = f"\n\n  -- {pinned.author}" if pinned.author else ""
        print(f"{date.isoformat()}  (dedication)\n\n  {pinned.body}{signature}")
        return 0
    quote = catalog.quotes[database.calendar_of(catalog).quote_for_day(day)]
    print(f"{date.isoformat()}\n\n  {quote.body}\n\n  -- {quote.author}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="qotd", description=__doc__)
    parser.add_argument("--version", action="version", version=f"qotd {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("db", help="compile the SQLite database").set_defaults(func=cmd_db)
    sub.add_parser("stats", help="print quotes per theme").set_defaults(func=cmd_stats)
    sub.add_parser("wat", help="generate generated/quotes.wat").set_defaults(func=cmd_wat)
    sub.add_parser("site", help="stage web/ into docs/").set_defaults(func=cmd_site)
    today = sub.add_parser("today", help="print the quote for a date")
    today.add_argument("date", nargs="?", help="ISO date, defaults to today")
    today.set_defaults(func=cmd_today)
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except (database.DatabaseError, FileNotFoundError) as exc:
        print(f"qotd: error: {exc}", file=sys.stderr)
        return 1
