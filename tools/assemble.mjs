#!/usr/bin/env node
/**
 * Assemble generated/quotes.wat into docs/quotes.wasm with wabt.
 *
 *   node tools/assemble.mjs [input.wat] [output.wasm]
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import createWabt from "wabt";

const [input = "generated/quotes.wat", output = "docs/quotes.wasm"] = process.argv.slice(2);

const started = performance.now();
const wabt = await createWabt();
const source = await readFile(input, "utf8");
const module = wabt.parseWat(input, source, { mutable_globals: true });

try {
  module.resolveNames();
  module.validate();
  const { buffer } = module.toBinary({ log: false, canonicalize_lebs: true, write_debug_names: true });
  await WebAssembly.compile(buffer); // let the engine double-check what wabt produced
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, buffer);
  const ms = (performance.now() - started).toFixed(0);
  console.log(`wrote ${output}: ${buffer.byteLength.toLocaleString("en-US")} bytes from ${source.length.toLocaleString("en-US")} bytes of WAT in ${ms} ms`);
} finally {
  module.destroy();
}
