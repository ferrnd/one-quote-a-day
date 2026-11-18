"""Generate generated/quotes.wat: hand-written runtime + generated data.

Linear memory layout (all integers little-endian):

    0x0000  header (128 bytes, see HEADER_FIELDS)
    0x0080  records: K blocks, one per locale, of R = N + D records each
            (N quotes, then D dedications); record (i, k) sits at
            records_ptr + (k * R + i) * 16
              +0 text_ptr  +4 text_len  +8 author_ptr  +12 author_len
              (an unsigned dedication has author_ptr = author_len = 0)
    ......  locales: K entries of 16 bytes
              +0 code_ptr  +4 code_len  +8 name_ptr  +12 name_len
    ......  string pool: every distinct string once, UTF-8
    ......  dedications: (i32 day, u32 record index) pairs, sorted by day
    ......  schedule: one u16 quote index per day, one Gregorian cycle long
    ......  scratch: N x u32 used by the runtime to materialise permutations
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from pathlib import Path

from . import __version__
from .civil import WEEKDAYS, civil_from_days, days_from_civil, weekday
from .database import Catalog, calendar_of
from .schedule import BASE_DAY, SEED, SEQUENCE, WINDOW

MAGIC = 0x44544F51  # "QOTD"
FORMAT = 4
PAGE = 65_536
HEADER_SIZE = 128
RECORD_SIZE = 16
LOCALE_SIZE = 16
HEADER_FIELDS = (
    "magic", "format", "quote_count", "author_count",
    "records_ptr", "pool_ptr", "pool_len", "schedule_ptr",
    "schedule_base", "schedule_len", "scratch_ptr", "pool_fnv1a",
    "dedication_count", "dedications_ptr", "launch_day", "legacy_count",
    "locale_count", "locales_ptr", "records_per_locale",
)
DEDICATION_SIZE = 8


def fnv1a32(data: bytes) -> int:
    h = 0x811C9DC5
    for byte in data:
        h = ((h ^ byte) * 0x01000193) & 0xFFFF_FFFF
    return h


def align(value: int, to: int) -> int:
    return (value + to - 1) // to * to


def hex_bytes(data: bytes) -> str:
    return "".join(f"\\{b:02x}" for b in data)


def wat_string(text: str) -> str:
    """A WAT string literal. Printable ASCII stays readable, the rest is escaped."""
    out = []
    for ch in text.encode("utf-8"):
        if ch in (0x22, 0x5C) or not 0x20 <= ch <= 0x7E:
            out.append(f"\\{ch:02x}")
        else:
            out.append(chr(ch))
    return '"' + "".join(out) + '"'


@dataclass
class Pool:
    """Interned UTF-8 strings laid out from `base`; each distinct string once."""

    base: int
    data: bytearray = field(default_factory=bytearray)
    index: dict[str, tuple[int, int]] = field(default_factory=dict)
    order: list[tuple[int, str, str]] = field(default_factory=list)  # (ptr, text, label)

    def add(self, text: str, label: str) -> tuple[int, int]:
        if text not in self.index:
            raw = text.encode("utf-8")
            ptr = self.base + len(self.data)
            self.index[text] = (ptr, len(raw))
            self.order.append((ptr, text, label))
            self.data += raw
        return self.index[text]


@dataclass(frozen=True)
class Layout:
    records_ptr: int
    locales_ptr: int
    pool_ptr: int
    pool: bytes
    strings: list[tuple[int, str, str]]
    records: list[list[tuple[int, int, int, int]]]  # [locale][record]
    locale_entries: list[tuple[int, int, int, int]]
    dedications_ptr: int
    schedule_ptr: int
    scratch_ptr: int
    end: int
    author_ptrs: list[tuple[int, int]]
    quote_ptrs: list[tuple[int, int]]
    dedication_ptrs: list[tuple[int, int, int, int]]

    @property
    def pages(self) -> int:
        return max(1, -(-self.end // PAGE))


def plan(catalog: Catalog) -> Layout:
    n = len(catalog)
    per_locale = n + len(catalog.dedications)
    locales = catalog.locales
    records_ptr = HEADER_SIZE
    locales_ptr = records_ptr + per_locale * len(locales) * RECORD_SIZE
    pool = Pool(locales_ptr + len(locales) * LOCALE_SIZE)

    locale_entries = [pool.add(code, "locale") + pool.add(name, "locale") for code, name in locales]
    records = []
    for k, (code, _name) in enumerate(locales):
        authors = catalog.authors if k == 0 else catalog.author_names[code]
        bodies = [q.body for q in catalog.quotes] if k == 0 else catalog.translations[code]
        dedications = ([(d.body, d.author) for d in catalog.dedications] if k == 0
                       else catalog.dedication_texts[code])
        author_ptrs = [pool.add(name, f"a{i:04d} {code}") for i, name in enumerate(authors)]
        block = []
        for i, quote in enumerate(catalog.quotes):
            block.append(pool.add(bodies[i], f"#{i:04d} {code}") + author_ptrs[quote.author_id - 1])
        for j, (body, author) in enumerate(dedications):
            text = pool.add(body, f"#{n + j:04d} {code} dedication")
            block.append(text + (pool.add(author, "dedication author") if author else (0, 0)))
        records.append(block)

    base_authors = [pool.index[name] for name in catalog.authors]
    dedications_ptr = align(pool.base + len(pool.data), 8)
    schedule_ptr = align(dedications_ptr + len(catalog.dedications) * DEDICATION_SIZE, 8)
    scratch_ptr = align(schedule_ptr + WINDOW * 2, 8)
    end = scratch_ptr + n * 4
    return Layout(
        records_ptr=records_ptr, locales_ptr=locales_ptr, pool_ptr=pool.base,
        pool=bytes(pool.data), strings=pool.order, records=records,
        locale_entries=locale_entries, dedications_ptr=dedications_ptr,
        schedule_ptr=schedule_ptr, scratch_ptr=scratch_ptr, end=end,
        author_ptrs=base_authors,
        quote_ptrs=[r[:2] for r in records[0][:n]],
        dedication_ptrs=records[0][n:],
    )


def dedication_day(iso_date: str) -> int:
    y, m, d = (int(part) for part in iso_date.split("-"))
    return days_from_civil(y, m, d)


def header_bytes(catalog: Catalog, layout: Layout) -> bytes:
    values = (
        MAGIC, FORMAT, len(catalog), len(catalog.authors),
        layout.records_ptr, layout.pool_ptr, len(layout.pool), layout.schedule_ptr,
        BASE_DAY, WINDOW, layout.scratch_ptr, fnv1a32(layout.pool),
        len(catalog.dedications), layout.dedications_ptr,
        calendar_of(catalog).launch, catalog.legacy_quotes,
        len(catalog.locales), layout.locales_ptr, len(catalog) + len(catalog.dedications),
    )
    raw = struct.pack(f"<{len(HEADER_FIELDS)}I", *(v & 0xFFFF_FFFF for v in values))
    return raw.ljust(HEADER_SIZE, b"\0")


def render(catalog: Catalog, fragments: list[Path]) -> str:
    layout = plan(catalog)
    calendar = calendar_of(catalog)
    table = calendar.table()
    n = len(catalog)
    head, *body, tail = fragments
    out: list[str] = []
    emit = out.append

    emit(head.read_text(encoding="utf-8").rstrip("\n"))
    emit("")
    emit(";; ------------------------------------------------------------ build --")
    emit(f";;  generator     qotd {__version__}")
    emit(f";;  quotes        {n}")
    emit(f";;  authors       {len(catalog.authors)}")
    emit(f";;  themes        {len(catalog.themes)}")
    emit(f";;  dedications   {len(catalog.dedications)}")
    emit(f";;  locales       {', '.join(code for code, _ in catalog.locales)}")
    emit(f";;  calendar      day 1 {catalog.launch_day}, {catalog.legacy_quotes} legacy quotes; new quotes")
    emit(f";;                from day {calendar.legacy + 1}, full rotation from day {calendar.n + 1}")
    emit(f";;  pool          {len(layout.pool)} bytes, {len(layout.strings)} strings, "
         f"fnv1a {fnv1a32(layout.pool):#010x}")
    emit(f";;  schedule      {WINDOW} days from 2000-01-01, seed {SEED:#018x}")
    emit(f";;  sequence      {SEQUENCE:#018x}")
    emit(f";;  memory        {layout.end} bytes in {layout.pages} pages")
    emit("")
    emit(f'  (memory (export "memory") {layout.pages})')
    emit("")
    for fragment in body:
        emit(fragment.read_text(encoding="utf-8").rstrip("\n"))
        emit("")

    emit("  ;; ======================================================== header ==")
    emit("  ;;  " + ", ".join(HEADER_FIELDS))
    emit(f'  (data (i32.const 0) "{hex_bytes(header_bytes(catalog, layout))}")')
    emit("")

    emit("  ;; ======================================================= records ==")
    emit(f"  (data (i32.const {layout.records_ptr})")
    for k, (code, _name) in enumerate(catalog.locales):
        emit(f"    ;; ---- locale {k}: {code}")
        for i, quote in enumerate(catalog.quotes):
            emit(f'    "{hex_bytes(struct.pack("<4I", *layout.records[k][i]))}" ;; #{i:04d} {quote.theme}')
        for j, ded in enumerate(catalog.dedications):
            emit(f'    "{hex_bytes(struct.pack("<4I", *layout.records[k][n + j]))}" '
                 f";; #{n + j:04d} dedication {ded.day}")
    emit("  )")
    emit("")

    emit("  ;; ======================================================= locales ==")
    emit(f"  (data (i32.const {layout.locales_ptr})")
    for k, (code, _name) in enumerate(catalog.locales):
        emit(f'    "{hex_bytes(struct.pack("<4I", *layout.locale_entries[k]))}" ;; {k} {code}')
    emit("  )")
    emit("")

    emit("  ;; ======================================================== strings ==")
    emit("  ;;  Every distinct string once: author names, quotes, dedications and")
    emit("  ;;  locale names, in every language. Non-ASCII bytes are escaped.")
    for ptr, text, label in layout.strings:
        emit(f"  (data (i32.const {ptr}) {wat_string(text)}) ;; {label}")
    emit("")

    if catalog.dedications:
        emit("  ;; =================================================== dedications ==")
        emit("  ;;  Messages pinned to one exact date. They override the rotation on")
        emit("  ;;  that day only and are never part of the schedule below.")
        emit(f"  (data (i32.const {layout.dedications_ptr})")
        for j, ded in enumerate(catalog.dedications):
            pair = struct.pack("<iI", dedication_day(ded.day), n + j)
            emit(f'    "{hex_bytes(pair)}" ;; {ded.day} -> #{n + j:04d}')
        emit("  )")
        emit("")

    emit("  ;; ====================================================== schedule ==")
    emit("  ;;  One little-endian u16 per day. The calendar repeats every 146097")
    emit("  ;;  days, so this table covers every weekday/date combination there is.")
    emit(f"  (data (i32.const {layout.schedule_ptr})")
    for offset, index in enumerate(table):
        day = BASE_DAY + offset
        y, m, d = civil_from_days(day)
        author = catalog.quotes[index].author
        emit(f'    "{hex_bytes(struct.pack("<H", index))}" '
             f";; {y:04d}-{m:02d}-{d:02d} {WEEKDAYS[weekday(day)]} #{index:04d} {author}")
    emit("  )")
    emit("")

    emit(tail.read_text(encoding="utf-8").rstrip("\n"))
    return "\n".join(out) + "\n"


def write(catalog: Catalog, fragments_dir: Path, target: Path) -> int:
    fragments = sorted(fragments_dir.glob("*.wat"))
    if len(fragments) < 2:
        raise FileNotFoundError(f"no WAT fragments in {fragments_dir}")
    text = render(catalog, fragments)
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="ascii", newline="\n") as fh:
        fh.write(text)
    return len(text)
