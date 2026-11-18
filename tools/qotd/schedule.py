"""The daily schedule: which quote is shown on which day.

Time is cut into blocks of N consecutive days, where N is the number of quotes.
Each block shows every quote exactly once, in an order given by a Fisher-Yates
shuffle driven by PCG32 seeded with the block number. If a block would open
with the quote that closed the previous block, its first two days are swapped,
so the same quote is never shown two days in a row.

The WebAssembly runtime embeds this table for one full Gregorian cycle
(2000-01-01 .. 2399-12-31) and recomputes it on the fly outside that window
with the exact same algorithm (src/wat/40-shuffle.wat, 50-schedule.wat).
"""

from __future__ import annotations

from functools import lru_cache

from .civil import DAYS_PER_ERA, days_from_civil
from .pcg32 import MASK64, Pcg32

SEED = 0x853C49E6748FEA9B
SEQUENCE = 0xDA3E39CB94B95BDB
BASE_DAY = days_from_civil(2000, 1, 1)
WINDOW = DAYS_PER_ERA


@lru_cache(maxsize=8)
def raw_permutation(block: int, n: int) -> tuple[int, ...]:
    rng = Pcg32(SEED ^ (block & MASK64), SEQUENCE)
    order = list(range(n))
    for i in range(n - 1, 0, -1):
        j = rng.bounded(i + 1)
        order[i], order[j] = order[j], order[i]
    return tuple(order)


def block_permutation(block: int, n: int) -> list[int]:
    if n < 3:
        raise ValueError("the schedule needs at least three quotes")
    order = list(raw_permutation(block, n))
    if order[0] == raw_permutation(block - 1, n)[n - 1]:
        order[0], order[1] = order[1], order[0]
    return order


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
