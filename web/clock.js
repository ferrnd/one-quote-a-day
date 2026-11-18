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

/** Night mode runs from 21:00 to 06:00 local time. */
export const NIGHT_STARTS_AT = 21;
export const NIGHT_ENDS_AT = 6;

/** @param {Date} now */
export function isNight(now) {
  const hour = now.getHours();
  return hour >= NIGHT_STARTS_AT || hour < NIGHT_ENDS_AT;
}

/** @param {Date} now @returns {Date} the next 06:00 or 21:00, whichever comes first */
export function nextThemeChange(now) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const hour = now.getHours();
  if (hour < NIGHT_ENDS_AT) next.setHours(NIGHT_ENDS_AT);
  else if (hour < NIGHT_STARTS_AT) next.setHours(NIGHT_STARTS_AT);
  else next.setDate(next.getDate() + 1), next.setHours(NIGHT_ENDS_AT);
  return next;
}

/** @param {Date} now */
export function msUntilNextThemeChange(now) {
  return Math.max(0, nextThemeChange(now).getTime() - now.getTime());
}

/** @param {number} ms @returns {string} "4h 12m", "12m", rounding up to the minute */
export function formatCountdown(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
