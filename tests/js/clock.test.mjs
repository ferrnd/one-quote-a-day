import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const previousTz = process.env.TZ;
let clock;

before(async () => {
  process.env.TZ = "America/New_York";
  // clock.js is a browser module; strip the cache-busting query from its import.
  clock = await import(new URL("../../web/clock.js", import.meta.url));
});

after(() => {
  if (previousTz === undefined) delete process.env.TZ;
  else process.env.TZ = previousTz;
});

test("dateKey formats the local date", () => {
  assert.equal(clock.dateKey(new Date(2026, 10, 17, 23, 59, 59)), "2026-11-17");
  assert.equal(clock.dateKey(new Date(2027, 0, 1, 0, 0, 0)), "2027-01-01");
});

test("midnight is exactly one day away at 00:00 on an ordinary day", () => {
  assert.equal(clock.msUntilNextLocalMidnight(new Date(2026, 10, 17)), 86_400_000);
});

test("midnight one millisecond before", () => {
  assert.equal(clock.msUntilNextLocalMidnight(new Date(2026, 10, 17, 23, 59, 59, 999)), 1);
});

test("DST spring forward makes the day 23 hours long", () => {
  assert.equal(clock.msUntilNextLocalMidnight(new Date(2026, 2, 8)), 23 * 3_600_000);
});

test("DST fall back makes the day 25 hours long", () => {
  assert.equal(clock.msUntilNextLocalMidnight(new Date(2026, 10, 1)), 25 * 3_600_000);
});

test("year and month boundaries roll over", () => {
  assert.equal(clock.nextLocalMidnight(new Date(2026, 11, 31, 12)).getFullYear(), 2027);
  assert.equal(clock.nextLocalMidnight(new Date(2028, 1, 28, 12)).getDate(), 29);
});

test("parseDateKey accepts real dates only", () => {
  assert.deepEqual(clock.parseDateKey("2026-11-17"), { year: 2026, month: 11, day: 17 });
  assert.equal(clock.parseDateKey("2026-02-30"), null);
  assert.equal(clock.parseDateKey("2026-1-1"), null);
  assert.equal(clock.parseDateKey(null), null);
});
