/**
 * quotes :: app
 *
 * The page is a thin shell around quotes.wasm. JavaScript only does what
 * WebAssembly cannot: read the local clock, touch the DOM, and set timers.
 * Choosing the quote, and storing every quote, happens inside the module.
 *
 * Append ?date=YYYY-MM-DD to the URL to preview another day.
 */

import { dateKey, localDateParts, msUntilNextLocalMidnight, parseDateKey } from "./clock.js?v=%%BUILD%%";

const WASM_URL = new URL("quotes.wasm?v=%%WASM_HASH%%", import.meta.url);
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
    /** @type {Map<number, {index: number, text: string, author: string}>} */
    this.cache = new Map();
  }

  /** Decoded quote by index; there are only N distinct quotes, so memoise them. */
  quote(index) {
    let hit = this.cache.get(index);
    if (!hit) {
      hit = {
        index,
        text: this.read(this.x.quote_text_ptr(index), this.x.quote_text_len(index)),
        author: this.read(this.x.quote_author_ptr(index), this.x.quote_author_len(index)),
      };
      this.cache.set(index, hit);
    }
    return hit;
  }

  /** @param {number} ptr @param {number} len */
  read(ptr, len) {
    return decoder.decode(new Uint8Array(this.x.memory.buffer, ptr, len));
  }

  /** @param {{year: number, month: number, day: number}} parts */
  forDate({ year, month, day }) {
    const index = this.x.quote_for_date(year, month, day);
    if (index < 0) throw new RangeError(`invalid date ${year}-${month}-${day}`);
    return this.quote(index);
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

/*
 * The archive can span tens of thousands of days (DAY 18000 is only ~2075),
 * so it is rendered lazily: one page on open, then another whenever a
 * sentinel at the bottom of the list scrolls near the viewport.
 */
const ARCHIVE_PAGE = 30;
const CLOSE_MS = 280;

/** @type {{engine: QuoteEngine, launch: number, next: number} | null} */
let archive = null;
const sentinel = document.createElement("li");
sentinel.className = "archive-sentinel";
sentinel.setAttribute("aria-hidden", "true");

const observer = new IntersectionObserver(
  (entries) => { if (entries.some((entry) => entry.isIntersecting)) appendArchivePage(); },
  { root: archiveList, rootMargin: "0px 0px 800px 0px" },
);

/** @param {QuoteEngine} engine @param {number} n */
function archiveItem(engine, n) {
  const parts = engine.partsFromDays(archive.launch + n - 1);
  const quote = engine.quote(engine.x.entry_for_day(archive.launch + n - 1));
  const li = document.createElement("li");
  const meta = document.createElement("p");
  meta.className = "archive-meta";
  meta.textContent = `Day ${n} · ${MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
  const text = document.createElement("blockquote");
  text.textContent = quote.text;
  const author = document.createElement("p");
  author.className = "archive-author";
  author.textContent = quote.author;
  li.append(meta, text);
  if (quote.author) li.append(author); // dedications may be unsigned
  return li;
}

function appendArchivePage() {
  if (!archive || archive.next < 1) return;
  const fragment = document.createDocumentFragment();
  const stop = Math.max(1, archive.next - ARCHIVE_PAGE + 1);
  for (let n = archive.next; n >= stop; n--) fragment.append(archiveItem(archive.engine, n));
  archive.next = stop - 1;
  sentinel.before(fragment);
  if (archive.next < 1) {
    observer.disconnect();
    sentinel.remove();
  } else {
    // re-observe so a sentinel that is still visible fires again
    observer.unobserve(sentinel);
    observer.observe(sentinel);
  }
}

/** @param {QuoteEngine} engine */
function openArchive(engine) {
  const today = JSON.parse(counterEl.dataset.today ?? "null");
  if (!today || archiveEl.open) return;
  archive = { engine, launch: engine.x.launch_day(), next: engine.dayNumber(today) };
  archiveList.replaceChildren(sentinel);
  appendArchivePage();
  archiveEl.classList.remove("is-closing");
  archiveEl.showModal();
  archiveList.scrollTop = 0;
  if (archive && archive.next >= 1) observer.observe(sentinel);
}

let closeTimer = 0;

function closeArchive() {
  if (!archiveEl.open || archiveEl.classList.contains("is-closing")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    archiveEl.close();
    return;
  }
  archiveEl.classList.add("is-closing");
  closeTimer = setTimeout(() => archiveEl.close(), CLOSE_MS);
}

/** @param {QuoteEngine} engine */
function wireArchive(engine) {
  counterEl.addEventListener("click", () => openArchive(engine));
  document.getElementById("archive-close")?.addEventListener("click", closeArchive);
  // click on the backdrop closes too
  archiveEl.addEventListener("click", (event) => { if (event.target === archiveEl) closeArchive(); });
  // belt and braces for fast flings: top up whenever we get near the bottom
  archiveList.addEventListener("scroll", () => {
    if (archiveList.scrollHeight - archiveList.scrollTop - archiveList.clientHeight < 800) appendArchivePage();
  }, { passive: true });
  // Esc: animate out instead of vanishing. Handle the key itself, because
  // browsers only let a page cancel the native dialog close after a user gesture.
  archiveEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); closeArchive(); }
  });
  archiveEl.addEventListener("cancel", (event) => { event.preventDefault(); closeArchive(); });
  archiveEl.addEventListener("close", () => {
    clearTimeout(closeTimer);
    archiveEl.classList.remove("is-closing");
    observer.disconnect();
    archive = null;
    archiveList.replaceChildren();
    counterEl.focus({ preventScroll: true });
  });
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
