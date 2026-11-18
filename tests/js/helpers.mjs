import { readFile } from "node:fs/promises";

const WASM = new URL("../../docs/quotes.wasm", import.meta.url);
const decoder = new TextDecoder("utf-8", { fatal: true });

/** Instantiate a fresh copy of the shipped module. */
export async function loadEngine() {
  const { instance } = await WebAssembly.instantiate(await readFile(WASM), {});
  const x = instance.exports;
  const read = (ptr, len) => decoder.decode(new Uint8Array(x.memory.buffer, ptr, len));
  return {
    x,
    text: (i) => read(x.quote_text_ptr(i), x.quote_text_len(i)),
    author: (i) => read(x.quote_author_ptr(i), x.quote_author_len(i)),
  };
}

/** Days since 1970-01-01 for a UTC civil date, computed by JavaScript. */
export function jsDays(y, m, d) {
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  date.setUTCHours(0, 0, 0, 0);
  return Math.round(date.getTime() / 86_400_000);
}
