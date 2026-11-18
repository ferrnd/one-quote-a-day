/**
 * quotes :: app
 *
 * The page is a thin shell around quotes.wasm. JavaScript only does what
 * WebAssembly cannot: read the local clock, touch the DOM, and set timers.
 * Choosing the quote, and storing every quote, happens inside the module.
 *
 * Append ?date=YYYY-MM-DD to the URL to preview another day.
 */

import { dateKey, localDateParts, msUntilNextLocalMidnight, parseDateKey } from "./clock.js?v=496930dd93c2";

const WASM_URL = new URL("quotes.wasm?v=9e9675a3a529", import.meta.url);
const FADE_MS = 900;
const WATCHDOG_MS = 60_000;
const FALLBACK = { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" };

const figure = /** @type {HTMLElement} */ (document.getElementById("quote"));
const textEl = /** @type {HTMLElement} */ (document.getElementById("quote-text"));
const authorEl = /** @type {HTMLElement} */ (document.getElementById("quote-author"));
const counterEl = /** @type {HTMLButtonElement} */ (document.getElementById("day-counter"));
const archiveEl = /** @type {HTMLDialogElement} */ (document.getElementById("archive"));
const archiveList = /** @type {HTMLOListElement} */ (document.getElementById("archive-list"));
const decoder = new TextDecoder("utf-8", { fatal: true });

/** @param {URL} url */
async function instantiate(url) {
  if (typeof WebAssembly.instantiateStreaming === "function") {
    try {
      const { instance } = await WebAssembly.instantiateStreaming(fetch(url), {});
      return instance;
    } catch {
      // Wrong MIME type or no streaming support: fall back to a plain fetch.
    }
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`quotes.wasm: HTTP ${response.status}`);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {});
  return instance;
}

class QuoteEngine {
  /** @param {WebAssembly.Instance} instance */
  constructor(instance) {
    this.x = /** @type {any} */ (instance.exports);
    this.count = this.x.quote_count();
  }

  /** @param {number} ptr @param {number} len */
  read(ptr, len) {
    return decoder.decode(new Uint8Array(this.x.memory.buffer, ptr, len));
  }

  /** @param {{year: number, month: number, day: number}} parts */
  forDate({ year, month, day }) {
    const index = this.x.quote_for_date(year, month, day);
    if (index < 0) throw new RangeError(`invalid date ${year}-${month}-${day}`);
    return {
      index,
      text: this.read(this.x.quote_text_ptr(index), this.x.quote_text_len(index)),
      author: this.read(this.x.quote_author_ptr(index), this.x.quote_author_len(index)),
    };
  }

  /** @param {{year: number, month: number, day: number}} parts */
  dayNumber({ year, month, day }) {
    return this.x.day_number(year, month, day);
  }

  /** Days since 1970-01-01 -> {year, month, day}, via the module's calendar. */
  partsFromDays(z) {
    const packed = this.x.civil_from_days(z);
    return { year: Math.floor(packed / 10000), month: Math.floor(packed / 100) % 100, day: packed % 100 };
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** @param {QuoteEngine} engine @param {{year: number, month: number, day: number}} today */
function updateCounter(engine, today) {
  const n = engine.dayNumber(today);
  counterEl.hidden = n < 1;
  counterEl.textContent = `Day ${n}`;
  counterEl.dataset.today = JSON.stringify(today);
}

/** @param {QuoteEngine} engine */
function openArchive(engine) {
  const today = JSON.parse(counterEl.dataset.today ?? "null");
  if (!today) return;
  const last = engine.dayNumber(today);
  const launch = engine.x.launch_day();
  const items = [];
  for (let n = last; n >= 1; n--) {
    const parts = engine.partsFromDays(launch + n - 1);
    const quote = engine.forDate(parts);
    const li = document.createElement("li");
    const meta = document.createElement("p");
    meta.className = "archive-meta";
    meta.textContent = `Day ${n} · ${MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
    const text = document.createElement("blockquote");
    text.textContent = quote.text;
    const author = document.createElement("p");
    author.className = "archive-author";
    author.textContent = quote.author;
    li.append(meta, text, author);
    items.push(li);
  }
  archiveList.replaceChildren(...items);
  archiveEl.showModal();
  archiveList.scrollTop = 0;
}

/** @param {QuoteEngine} engine */
function wireArchive(engine) {
  counterEl.addEventListener("click", () => openArchive(engine));
  document.getElementById("archive-close")?.addEventListener("click", () => archiveEl.close());
  // click on the backdrop closes too
  archiveEl.addEventListener("click", (event) => { if (event.target === archiveEl) archiveEl.close(); });
}

let rendered = false;
let swapTimer = 0;

/** @param {{text: string, author: string}} quote */
function show(quote) {
  const apply = () => {
    textEl.textContent = quote.text;
    authorEl.textContent = quote.author;
    figure.setAttribute("aria-busy", "false");
    requestAnimationFrame(() => { figure.dataset.state = "ready"; });
  };
  clearTimeout(swapTimer);
  if (!rendered || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    rendered = true;
    apply();
    return;
  }
  figure.dataset.state = "leaving";
  swapTimer = setTimeout(apply, FADE_MS);
}

/** @param {QuoteEngine} engine */
function startClock(engine) {
  let currentKey = "";
  let midnightTimer = 0;

  const tick = () => {
    const now = new Date();
    const key = dateKey(now);
    if (key !== currentKey) {
      currentKey = key;
      const today = localDateParts(now);
      show(engine.forDate(today));
      updateCounter(engine, today);
    }
    clearTimeout(midnightTimer);
    // Wake just after midnight; the watchdog below covers sleep and clock changes.
    midnightTimer = setTimeout(tick, msUntilNextLocalMidnight(now) + 250);
  };

  tick();
  setInterval(tick, WATCHDOG_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  addEventListener("focus", tick);
  addEventListener("pageshow", tick);
}

async function main() {
  try {
    const engine = new QuoteEngine(await instantiate(WASM_URL));
    const pinned = parseDateKey(new URLSearchParams(location.search).get("date"));
    wireArchive(engine);
    if (pinned) {
      show(engine.forDate(pinned));
      updateCounter(engine, pinned);
    } else {
      startClock(engine);
    }
  } catch (error) {
    console.error(error);
    show(FALLBACK);
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

main();
