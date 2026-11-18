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
  assert.throws(() => engine.x.quote_text_ptr(engine.x.record_count()), WebAssembly.RuntimeError);
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

test("every quote is available in every locale", async () => {
  const x = engine.x;
  const dec = new TextDecoder("utf-8", { fatal: true });
  const read = (p, l) => dec.decode(new Uint8Array(x.memory.buffer, p, l));
  const codes = Array.from({ length: x.locale_count() }, (_, k) => read(x.locale_code_ptr(k), x.locale_code_len(k)));
  assert.deepEqual(codes, ["en", "pt-BR", "es", "fr", "it"]);
  for (let i = 0; i < x.quote_count(); i++) {
    const en = read(x.localized_text_ptr(i, 0), x.localized_text_len(i, 0));
    const pt = read(x.localized_text_ptr(i, 1), x.localized_text_len(i, 1));
    assert.equal(en, engine.text(i));
    assert.notEqual(pt, en, `quote ${i} is untranslated`);
    assert.ok(x.localized_author_len(i, 1) > 0);
  }
  const day1 = x.quote_for_date(2026, 11, 16);
  assert.equal(read(x.localized_text_ptr(day1, 1), x.localized_text_len(day1, 1)), "Desculpe por fazer você sofrer. Eu te amo.");
  assert.throws(() => x.localized_text_ptr(0, x.locale_count()), WebAssembly.RuntimeError);
});
