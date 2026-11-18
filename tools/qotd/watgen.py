"""Generate generated/quotes.wat: hand-written runtime + generated data.

Linear memory layout (all integers little-endian):

    0x0000  header (64 bytes, see HEADER_FIELDS)
    0x0040  records: one 16-byte record per quote
              +0 text_ptr  +4 text_len  +8 author_ptr  +12 author_len
    ......  string pool: author names, then quote bodies (ASCII)
    ......  schedule: one u16 quote index per day, one Gregorian cycle long
    ......  scratch: N x u32 used by the runtime to materialise permutations
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from pathlib import Path

from . import __version__
from .civil import WEEKDAYS, civil_from_days, weekday
from .database import Catalog
from .schedule import BASE_DAY, SEED, SEQUENCE, WINDOW, build_table

MAGIC = 0x44544F51  # "QOTD"
FORMAT = 1
PAGE = 65_536
HEADER_SIZE = 64
RECORD_SIZE = 16
HEADER_FIELDS = (
    "magic", "format", "quote_count", "author_count",
    "records_ptr", "pool_ptr", "pool_len", "schedule_ptr",
    "schedule_base", "schedule_len", "scratch_ptr", "pool_fnv1a",
)


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
    out = []
    for ch in text.encode("ascii"):
        if ch in (0x22, 0x5C) or not 0x20 <= ch <= 0x7E:
            out.append(f"\\{ch:02x}")
        else:
            out.append(chr(ch))
    return '"' + "".join(out) + '"'


@dataclass(frozen=True)
class Layout:
    records_ptr: int
    pool_ptr: int
    pool: bytes
    author_ptrs: list[tuple[int, int]]
    quote_ptrs: list[tuple[int, int]]
    schedule_ptr: int
    scratch_ptr: int
    end: int

    @property
    def pages(self) -> int:
        return max(1, -(-self.end // PAGE))


def plan(catalog: Catalog) -> Layout:
    n = len(catalog)
    records_ptr = HEADER_SIZE
    pool_ptr = records_ptr + n * RECORD_SIZE
    pool = bytearray()
    author_ptrs = []
    for name in catalog.authors:
        raw = name.encode("ascii")
        author_ptrs.append((pool_ptr + len(pool), len(raw)))
        pool += raw
    quote_ptrs = []
    for quote in catalog.quotes:
        raw = quote.body.encode("ascii")
        quote_ptrs.append((pool_ptr + len(pool), len(raw)))
        pool += raw
    schedule_ptr = align(pool_ptr + len(pool), 8)
    scratch_ptr = align(schedule_ptr + WINDOW * 2, 8)
    end = scratch_ptr + n * 4
    return Layout(records_ptr, pool_ptr, bytes(pool), author_ptrs, quote_ptrs,
                  schedule_ptr, scratch_ptr, end)


def header_bytes(catalog: Catalog, layout: Layout) -> bytes:
    values = (
        MAGIC, FORMAT, len(catalog), len(catalog.authors),
        layout.records_ptr, layout.pool_ptr, len(layout.pool), layout.schedule_ptr,
        BASE_DAY, WINDOW, layout.scratch_ptr, fnv1a32(layout.pool),
    )
    raw = struct.pack("<12I", *(v & 0xFFFF_FFFF for v in values))
    return raw.ljust(HEADER_SIZE, b"\0")


def render(catalog: Catalog, fragments: list[Path]) -> str:
    layout = plan(catalog)
    table = build_table(len(catalog))
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
    emit(f";;  pool          {len(layout.pool)} bytes, fnv1a {fnv1a32(layout.pool):#010x}")
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
    for i, quote in enumerate(catalog.quotes):
        tp, tl = layout.quote_ptrs[i]
        ap, al = layout.author_ptrs[quote.author_id - 1]
        rec = struct.pack("<4I", tp, tl, ap, al)
        emit(f'    "{hex_bytes(rec)}" ;; #{i:04d} {quote.theme}')
    emit("  )")
    emit("")

    emit("  ;; ======================================================= authors ==")
    for i, name in enumerate(catalog.authors):
        ptr, _ = layout.author_ptrs[i]
        emit(f"  (data (i32.const {ptr}) {wat_string(name)}) ;; a{i:04d}")
    emit("")

    emit("  ;; ======================================================== quotes ==")
    for i, quote in enumerate(catalog.quotes):
        ptr, _ = layout.quote_ptrs[i]
        emit(f"  (data (i32.const {ptr}) {wat_string(quote.body)}) ;; #{i:04d}")
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
