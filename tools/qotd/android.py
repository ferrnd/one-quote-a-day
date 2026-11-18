"""Export the catalog for the native Android app (android/).

The app carries the same data the WebAssembly module embeds, as one JSON
asset, and recomputes the schedule itself in Kotlin (Schedule.kt). A golden
file of (day, entry) pairs, written from the Python reference, lets the JVM
unit tests prove the Kotlin port agrees bit for bit.
"""

from __future__ import annotations

import json
from pathlib import Path

from .civil import days_from_civil
from .database import Catalog, calendar_of

GOLDEN_DAYS = (
    list(range(days_from_civil(2026, 11, 1), days_from_civil(2030, 1, 1)))  # launch and growth seams
    + list(range(days_from_civil(1999, 12, 1), days_from_civil(2000, 2, 1)))  # table start
    + list(range(days_from_civil(2399, 12, 1), days_from_civil(2400, 2, 1)))  # table end
    + [days_from_civil(1970, 1, 1), days_from_civil(2100, 3, 1), days_from_civil(3000, 6, 15)]
)


def export(catalog: Catalog) -> dict:
    authors_of = {q.author_id - 1 for q in catalog.quotes}
    assert authors_of <= set(range(len(catalog.authors)))
    codes = [code for code, _ in catalog.locales]
    return {
        "format": 1,
        "launch": catalog.launch_day,
        "legacy": catalog.legacy_quotes,
        "locales": [{"code": code, "name": name} for code, name in catalog.locales],
        "author": [q.author_id - 1 for q in catalog.quotes],
        "text": {code: ([q.body for q in catalog.quotes] if code == "en"
                        else catalog.translations[code]) for code in codes},
        "authors": {code: (catalog.authors if code == "en" else catalog.author_names[code])
                    for code in codes},
        "dedications": [
            {"day": d.day,
             "text": {code: list((d.body, d.author) if code == "en"
                                 else catalog.dedication_texts[code][i]) for code in codes}}
            for i, d in enumerate(catalog.dedications)
        ],
    }


def golden(catalog: Catalog) -> str:
    cal = calendar_of(catalog)
    pinned = {}
    for i, d in enumerate(catalog.dedications):
        y, m, dd = (int(p) for p in d.day.split("-"))
        pinned[days_from_civil(y, m, dd)] = len(catalog) + i
    lines = [f"# n={cal.n} legacy={cal.legacy} launch={cal.launch}; day entry (entries >= n are dedications)"]
    lines += [f"{day} {pinned.get(day, cal.quote_for_day(day))}" for day in sorted(set(GOLDEN_DAYS))]
    return "\n".join(lines) + "\n"


def write(catalog: Catalog, assets: Path, golden_file: Path) -> int:
    assets.mkdir(parents=True, exist_ok=True)
    golden_file.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(export(catalog), ensure_ascii=False, separators=(",", ":"))
    (assets / "quotes.json").write_text(data, encoding="utf-8", newline="\n")
    golden_file.write_text(golden(catalog), encoding="utf-8", newline="\n")
    return len(data.encode("utf-8"))
