"""Proleptic Gregorian calendar arithmetic, mirrored by src/wat/20-civil.wat.

Algorithms after Howard Hinnant, "chrono-Compatible Low-Level Date
Algorithms". Day 0 is 1970-01-01.
"""

from __future__ import annotations

WEEKDAYS = ("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
DAYS_PER_ERA = 146_097  # the Gregorian calendar repeats every 400 years


def _trunc_div(a: int, b: int) -> int:
    """C-style division (rounds toward zero), as i32.div_s does."""
    q = abs(a) // abs(b)
    return q if (a >= 0) == (b >= 0) else -q


def days_from_civil(y: int, m: int, d: int) -> int:
    y -= m <= 2
    era = _trunc_div(y if y >= 0 else y - 399, 400)
    yoe = y - era * 400
    mp = m - 3 if m > 2 else m + 9
    doy = (153 * mp + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * DAYS_PER_ERA + doe - 719_468


def civil_from_days(z: int) -> tuple[int, int, int]:
    z += 719_468
    era = _trunc_div(z if z >= 0 else z - 146_096, DAYS_PER_ERA)
    doe = z - era * DAYS_PER_ERA
    yoe = (doe - doe // 1460 + doe // 36_524 - doe // 146_096) // 365
    y = yoe + era * 400
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    d = doy - (153 * mp + 2) // 5 + 1
    m = mp + 3 if mp < 10 else mp - 9
    return y + (m <= 2), m, d


def is_leap_year(y: int) -> bool:
    return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)


def days_in_month(y: int, m: int) -> int:
    if m == 2:
        return 29 if is_leap_year(y) else 28
    return 30 if m in (4, 6, 9, 11) else 31


def weekday(z: int) -> int:
    """0 = Sunday ... 6 = Saturday."""
    return (z + 4) % 7


def iso(z: int) -> str:
    y, m, d = civil_from_days(z)
    return f"{y:04d}-{m:02d}-{d:02d}"
