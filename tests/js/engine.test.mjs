import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, test } from "node:test";
import { loadEngine } from "./helpers.mjs";

let engine;
before(async () => { engine = await loadEngine(); });

test("exports the public interface", () => {
  for (const name of [
    "memory", "quote_for_date", "quote_for_day", "quote_for_day_computed",
    "quote_text_ptr", "quote_text_len", "quote_author_ptr", "quote_author_len",
    "quote_count", "author_count", "days_from_civil", "civil_from_days", "fnv1a",
  ]) {
    assert.ok(name in engine.x, name);
  }
});

test("ships more than 500 quotes", () => {
  assert.ok(engine.x.quote_count() > 500);
  assert.ok(engine.x.author_count() > 100);
});

test("every quote and author decodes to non-empty ASCII", () => {
  for (let i = 0; i < engine.x.quote_count(); i++) {
    const text = engine.text(i);
    const author = engine.author(i);
    assert.match(text, /^[\x20-\x7e]{8,280}$/);
    assert.match(author, /^[\x20-\x7e]{2,64}$/);
  }
});

test("the string pool checksum in the header is genuine", () => {
  const header = new DataView(engine.x.memory.buffer, 0, 64);
  const pool = header.getUint32(20, true);
  const len = header.getUint32(24, true);
  assert.equal(engine.x.fnv1a(pool, len) >>> 0, header.getUint32(44, true));
});

test("pcg32 reproduces the reference vector", () => {
  engine.x.pcg32_seed(42n, 54n);
  const out = Array.from({ length: 6 }, () => engine.x.pcg32_next() >>> 0);
  assert.deepEqual(out, [0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e]);
});

test("accessors trap on out-of-range indices", () => {
  assert.throws(() => engine.x.quote_text_ptr(engine.x.quote_count()), WebAssembly.RuntimeError);
  assert.throws(() => engine.x.quote_text_ptr(-1), WebAssembly.RuntimeError);
});

test("a corrupted string pool refuses to instantiate", async () => {
  const bytes = new Uint8Array(await readFile(new URL("../../docs/quotes.wasm", import.meta.url)));
  const needle = new TextEncoder().encode("Fall seven times, stand up eight.");
  const at = bytes.findIndex((_, i) => needle.every((b, j) => bytes[i + j] === b));
  assert.ok(at > 0, "known quote not found in the binary");
  bytes[at] ^= 0x20; // "Fall" -> "fall"
  await assert.rejects(WebAssembly.instantiate(bytes, {}), WebAssembly.RuntimeError);
});
