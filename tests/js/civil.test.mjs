import assert from "node:assert/strict";
import { before, test } from "node:test";
import { jsDays, loadEngine } from "./helpers.mjs";

let x;
before(async () => { ({ x } = await loadEngine()); });

test("epoch is day zero", () => {
  assert.equal(x.days_from_civil(1970, 1, 1), 0);
  assert.equal(x.civil_from_days(0), 19700101);
});

test("days_from_civil matches Date for every day of 1999-2101", () => {
  const start = jsDays(1999, 1, 1);
  const end = jsDays(2101, 12, 31);
  for (let z = start; z <= end; z++) {
    const d = new Date(z * 86_400_000);
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    assert.equal(x.days_from_civil(y, m, day), z);
    assert.equal(x.civil_from_days(z), y * 10000 + m * 100 + day);
  }
});

test("days_from_civil handles distant and negative years", () => {
  for (const [y, m, d] of [[1, 1, 1], [-400, 3, 1], [1600, 2, 29], [9999, 12, 31], [-4713, 11, 24]]) {
    assert.equal(x.days_from_civil(y, m, d), jsDays(y, m, d), `${y}-${m}-${d}`);
  }
});

test("weekday agrees with Date.getUTCDay", () => {
  for (let z = -10_000; z < 10_000; z += 7 * 13 + 1) {
    assert.equal(x.weekday(z), new Date(z * 86_400_000).getUTCDay());
  }
});

test("leap years and month lengths", () => {
  assert.equal(x.is_leap_year(2000), 1);
  assert.equal(x.is_leap_year(1900), 0);
  assert.equal(x.is_leap_year(2024), 1);
  assert.equal(x.days_in_month(2024, 2), 29);
  assert.equal(x.days_in_month(2026, 2), 28);
  assert.equal(x.days_in_month(2026, 11), 30);
  assert.equal(x.days_in_month(2026, 13), 0);
  assert.equal(x.days_in_month(2026, 0), 0);
});

test("is_valid_date", () => {
  assert.equal(x.is_valid_date(2026, 11, 17), 1);
  assert.equal(x.is_valid_date(2026, 2, 29), 0);
  assert.equal(x.is_valid_date(2028, 2, 29), 1);
  assert.equal(x.is_valid_date(2026, 4, 31), 0);
  assert.equal(x.is_valid_date(2026, 1, 0), 0);
});
