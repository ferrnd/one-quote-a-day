/**
 * quotes :: clock
 *
 * Local-time helpers. Everything here works in the visitor's own time zone,
 * so the quote turns over at their midnight, including on DST days when a
 * day is 23 or 25 hours long.
 */

/** @param {Date} now */
export function localDateParts(now) {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** @param {Date} now @returns {string} YYYY-MM-DD in local time */
export function dateKey(now) {
  const { year, month, day } = localDateParts(now);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** @param {Date} now @returns {Date} the next local 00:00:00.000 */
export function nextLocalMidnight(now) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
}

/** @param {Date} now @returns {number} milliseconds until the next local midnight */
export function msUntilNextLocalMidnight(now) {
  return Math.max(0, nextLocalMidnight(now).getTime() - now.getTime());
}

/**
 * Parse a strict YYYY-MM-DD string into date parts, or null.
 * @param {string | null} value
 */
export function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}
