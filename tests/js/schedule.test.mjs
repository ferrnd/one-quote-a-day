import assert from "node:assert/strict";
import { before, test } from "node:test";
import { loadEngine } from "./helpers.mjs";

let x;
before(async () => { ({ x } = await loadEngine()); });

test("the embedded table covers 2000-01-01 .. 2399-12-31", () => {
  assert.equal(x.schedule_base(), x.days_from_civil(2000, 1, 1));
  assert.equal(x.schedule_length(), 146_097);
  assert.equal(x.schedule_base() + x.schedule_length() - 1, x.days_from_civil(2399, 12, 31));
});

test("the embedded table agrees with the on-the-fly algorithm", () => {
  const base = x.schedule_base();
  const n = x.quote_count();
  const days = [];
  for (let i = 0; i < 3 * n + 3; i++) days.push(base + i);
  for (let i = 0; i < x.schedule_length(); i += 389) days.push(base + i);
  days.push(base + x.schedule_length() - 1);
  for (const day of days) {
    assert.equal(x.quote_for_day(day), x.quote_for_day_computed(day), `day ${day}`);
  }
});

test("never the same quote two days in a row, across the whole window", () => {
  const base = x.schedule_base();
  let previous = -1;
  for (let i = 0; i < x.schedule_length(); i++) {
    const index = x.quote_for_day(base + i);
    assert.notEqual(index, previous);
    previous = index;
  }
});

test("every quote appears exactly once per block", () => {
  const base = x.schedule_base();
  const n = x.quote_count();
  for (const block of [0, 1, 17, 190]) {
    const seen = new Set();
    for (let i = 0; i < n; i++) seen.add(x.quote_for_day(base + block * n + i));
    assert.equal(seen.size, n);
  }
});

test("dates outside the window still get a quote, seamlessly", () => {
  const before = x.schedule_base();
  const after = before + x.schedule_length();
  for (const edge of [before, after]) {
    let previous = -1;
    for (let day = edge - 900; day < edge + 900; day++) {
      const index = x.quote_for_day(day);
      assert.ok(index >= 0 && index < x.quote_count());
      assert.notEqual(index, previous, `repeat at day ${day}`);
      previous = index;
    }
  }
});

test("quote_for_date rejects impossible dates", () => {
  assert.equal(x.quote_for_date(2026, 2, 30), -1);
  assert.equal(x.quote_for_date(2026, 13, 1), -1);
  assert.ok(x.quote_for_date(2026, 11, 17) >= 0);
});

test("quote_for_date is quote_for_day of days_from_civil", () => {
  for (const [y, m, d] of [[2026, 11, 17], [2027, 1, 1], [2100, 2, 28], [1999, 12, 31], [2400, 1, 1]]) {
    assert.equal(x.quote_for_date(y, m, d), x.quote_for_day(x.days_from_civil(y, m, d)));
  }
});

test("day_number counts from DAY 1 on 2026-11-17", () => {
  assert.equal(x.launch_day(), x.days_from_civil(2026, 11, 17));
  assert.equal(x.day_number(2026, 11, 17), 1);
  assert.equal(x.day_number(2026, 11, 18), 2);
  assert.equal(x.day_number(2027, 11, 17), 366);
  assert.equal(x.day_number(2026, 11, 16), 0);
});
