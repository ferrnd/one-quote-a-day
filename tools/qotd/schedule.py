"""The daily schedule: which quote is shown on which day.

Base rotation: time is cut into blocks of N consecutive days. Each block
shows every quote exactly once, in an order given by a Fisher-Yates shuffle
driven by PCG32 seeded with the block number. If a block would open with the
quote that closed the previous one, its first two days are swapped, so the
same quote is never shown two days in a row.

Growing the database without rewriting history (see `Calendar`): the site
launched with L quotes. Every day before launch + L keeps exactly the order the
L-quote rotation gave it. The N - L quotes added later follow in a shuffled run
of their own, and only after that does the rotation cycle through all N.

The WebAssembly runtime embeds this table for one full Gregorian cycle
(2000-01-01 .. 2399-12-31) and recomputes it on the fly outside that window
with the exact same algorithm (src/wat/40-shuffle.wat, 50-schedule.wat).
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from .civil import DAYS_PER_ERA, days_from_civil
from .pcg32 import MASK64, Pcg32

SEED = 0x853C49E6748FEA9B
SEQUENCE = 0xDA3E39CB94B95BDB
BASE_DAY = days_from_civil(2000, 1, 1)
WINDOW = DAYS_PER_ERA
FRESH_BLOCK = 0x4000_0000  # seeds the one-off shuffle of newly added quotes


@lru_cache(maxsize=16)
def raw_permutation(block: int, n: int) -> tuple[int, ...]:
    rng = Pcg32(SEED ^ (block & MASK64), SEQUENCE)
    order = list(range(n))
    for i in range(n - 1, 0, -1):
        j = rng.bounded(i + 1)
        order[i], order[j] = order[j], order[i]
    return tuple(order)


def seamed(order: list[int], previous: int) -> list[int]:
    """Never open with the quote that was shown the day before."""
    if order[0] == previous:
        order[0], order[1] = order[1], order[0]
    return order


def block_permutation(block: int, n: int) -> list[int]:
    if n < 3:
        raise ValueError("the schedule needs at least three quotes")
    return seamed(list(raw_permutation(block, n)), raw_permutation(block - 1, n)[n - 1])


def quote_for_day(day: int, n: int) -> int:
    block, pos = divmod(day - BASE_DAY, n)
    return block_permutation(block, n)[pos]


def build_table(n: int, length: int = WINDOW) -> list[int]:
    table: list[int] = []
    block = 0
    while len(table) < length:
        table.extend(block_permutation(block, n))
        block += 1
    return table[:length]


@dataclass(frozen=True)
class Calendar:
    """The schedule for N quotes, of which the first `legacy` existed at launch."""

    n: int
    legacy: int
    launch: int

    @property
    def grown(self) -> bool:
        return 3 <= self.legacy < self.n

    @property
    def fresh_start(self) -> int:
        return self.launch + self.legacy

    @property
    def cycle_start(self) -> int:
        return self.fresh_start + (self.n - self.legacy)

    def fresh_order(self) -> list[int]:
        return [self.legacy + i for i in raw_permutation(FRESH_BLOCK, self.n - self.legacy)]

    def cycle_block(self, block: int) -> list[int]:
        previous = (self.fresh_order()[-1] if block == 0
                    else raw_permutation(block - 1, self.n)[self.n - 1])
        return seamed(list(raw_permutation(block, self.n)), previous)

    def quote_for_day(self, day: int) -> int:
        if not self.grown:
            return quote_for_day(day, self.n)
        if day < self.fresh_start:
            return quote_for_day(day, self.legacy)
        if day < self.cycle_start:
            return self.fresh_order()[day - self.fresh_start]
        block, pos = divmod(day - self.cycle_start, self.n)
        return self.cycle_block(block)[pos]

    def table(self, length: int = WINDOW) -> list[int]:
        """quote_for_day for every day of the window, built block by block."""
        if not self.grown:
            return build_table(self.n, length)
        end = BASE_DAY + length
        legacy_days = max(0, min(self.fresh_start, end) - BASE_DAY)
        table = build_table(self.legacy, legacy_days) if legacy_days else []
        fresh = self.fresh_order()
        for day in range(max(BASE_DAY, self.fresh_start), min(self.cycle_start, end)):
            table.append(fresh[day - self.fresh_start])
        block = 0
        while BASE_DAY + len(table) < end:
            table.extend(self.cycle_block(block))
            block += 1
        return table[:length]
