/**
 * quotes :: app
 *
 * The page is a thin shell around quotes.wasm. JavaScript only does what
 * WebAssembly cannot: read the local clock, touch the DOM, and set timers.
 * Choosing the quote, and storing every quote, happens inside the module.
 *
 * Append ?date=YYYY-MM-DD to the URL to preview another day, and
 * ?theme=day|night to force a theme.
 *
 * Keys: <- and -> walk through the days that have already happened.
 * Click the quote to copy it.
 */

import {
  dateKey, formatCountdown, isNight, localDateParts, msUntilNextLocalMidnight,
  msUntilNextThemeChange, parseDateKey,
} from "./clock.js?v=4c68bface613";

const WASM_URL = new URL("quotes.wasm?v=0ecf06eeb1a5", import.meta.url);
const WATCHDOG_MS = 60_000;
const FALLBACK = { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" };

const figure = /** @type {HTMLElement} */ (document.getElementById("quote"));
const textEl = /** @type {HTMLElement} */ (document.getElementById("quote-text"));
const authorEl = /** @type {HTMLElement} */ (document.getElementById("quote-author"));
const counterEl = /** @type {HTMLButtonElement} */ (document.getElementById("day-counter"));
const counterLabel = /** @type {HTMLElement} */ (document.getElementById("day-label"));
const counterNext = /** @type {HTMLElement} */ (document.getElementById("day-next"));
const toastEl = /** @type {HTMLElement} */ (document.getElementById("toast"));
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

/*
 * View state. Days are counted as days since 1970-01-01 (the module's unit).
 * `today` is the real (or pinned) date; `view` is what is on screen, which
 * the arrow keys can move back through past days.
 */
const state = {
  /** @type {QuoteEngine | null} */ engine: null,
  launch: 0,
  today: 0,
  view: 0,
};

/** @param {{year: number, month: number, day: number}} parts */
function toDay({ year, month, day }) {
  return state.engine.x.days_from_civil(year, month, day);
}

/** @param {number} z */
function entryFor(z) {
  return state.engine.quote(state.engine.x.entry_for_day(z));
}

function renderCounter() {
  counterEl.hidden = state.today - state.launch + 1 < 1;
  counterLabel.textContent = `Day ${state.view - state.launch + 1}`;
  counterEl.dataset.today = JSON.stringify(state.engine.partsFromDays(state.today));
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

/* ---------------------------------------------------------- rendering -- */

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** @param {{text: string, author: string}} quote */
function paint(quote) {
  textEl.textContent = quote.text;
  authorEl.textContent = quote.author;
  figure.setAttribute("aria-busy", "false");
}

/** First paint: a gentle fade in. @param {{text: string, author: string}} quote */
function reveal(quote) {
  paint(quote);
  // next task, not next frame: a throttled tab may never deliver a frame
  setTimeout(() => { figure.dataset.state = "ready"; }, 30);
}

/** @type {KeyframeAnimationOptions} */
const OUT = { duration: 520, easing: "cubic-bezier(0.55, 0, 0.8, 0.25)", fill: "forwards" };
/** @type {KeyframeAnimationOptions} */
const IN = { duration: 680, easing: "cubic-bezier(0.15, 0.75, 0.25, 1)", fill: "forwards" };
const OFFSCREEN = {
  // [where the old quote leaves to, where the new one comes from]
  down: ["translateY(100vh)", "translateY(-100vh)"],
  left: ["translateX(-100vw)", "translateX(100vw)"],
  right: ["translateX(100vw)", "translateX(-100vw)"],
};

/**
 * Scroll the quote off screen and the next one in, like turning a page.
 * @param {() => void} swap @param {"down" | "left" | "right"} direction
 */
async function slide(swap, direction) {
  // A hidden tab does not paint, so there is nothing to animate.
  if (reducedMotion() || document.hidden) { swap(); return; }
  const [exit, enter] = OFFSCREEN[direction];
  const leaving = figure.animate([{ transform: "none" }, { transform: exit }], OUT);
  await settle(leaving, OUT.duration);
  swap();
  const arriving = figure.animate([{ transform: enter }, { transform: "none" }], IN);
  leaving.cancel();
  await settle(arriving, IN.duration);
  arriving.cancel();
}

/**
 * Wait for an animation, but never longer than it should take: if the
 * document timeline stalls (throttled or occluded window), finish it by hand
 * so navigation can never get stuck.
 * @param {Animation} animation @param {number} duration
 */
function settle(animation, duration) {
  return Promise.race([
    animation.finished,
    new Promise((resolve) => setTimeout(() => { animation.finish(); resolve(undefined); }, duration + 150)),
  ]).catch(() => {});
}

/* --------------------------------------------------------- navigation -- */

let busy = false;
/** @type {{day: number, direction: "down" | "left" | "right"} | null} */
let queued = null;

/** @param {number} day @param {"down" | "left" | "right"} direction */
async function goTo(day, direction) {
  const first = Math.min(state.launch, state.today);
  const target = Math.max(first, Math.min(state.today, day));
  if (busy) { queued = { day: target, direction }; return; }
  if (target === state.view) return;
  busy = true;
  try {
    await slide(() => {
      state.view = target;
      paint(entryFor(target));
      renderCounter();
    }, direction);
  } finally {
    busy = false;
  }
  if (queued) {
    const next = queued;
    queued = null;
    goTo(next.day, next.direction);
  }
}

function wireKeys() {
  addEventListener("keydown", (event) => {
    if (archiveEl.open || event.altKey || event.ctrlKey || event.metaKey) return;
    const from = queued?.day ?? state.view;
    // <- goes back in time: the page moves right and yesterday comes in from the left
    if (event.key === "ArrowLeft") { event.preventDefault(); goTo(from - 1, "right"); }
    if (event.key === "ArrowRight") { event.preventDefault(); goTo(from + 1, "left"); }
  });
}

/* --------------------------------------------------------------- copy -- */

let toastTimer = 0;

/** @param {string} message */
function toast(message) {
  toastEl.textContent = message;
  toastEl.dataset.visible = "true";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.dataset.visible = "false"; }, 1600);
}

function wireCopy() {
  figure.addEventListener("click", async () => {
    if (String(getSelection() ?? "")) return; // the visitor is selecting text, not clicking
    const text = textEl.textContent ?? "";
    const author = authorEl.textContent ?? "";
    const payload = author ? `“${text}” — ${author}` : `“${text}”`;
    try {
      await navigator.clipboard.writeText(payload);
      toast("Copied");
    } catch {
      toast("Could not copy");
    }
  });
}

/* ---------------------------------------------------------- countdown -- */

let countdownTimer = 0;

function wireCountdown() {
  const update = () => {
    counterNext.textContent = `Next in ${formatCountdown(msUntilNextLocalMidnight(new Date()))}`;
  };
  const start = () => { update(); clearInterval(countdownTimer); countdownTimer = setInterval(update, 1000); };
  const stop = () => clearInterval(countdownTimer);
  update();
  counterEl.addEventListener("mouseenter", start);
  counterEl.addEventListener("focus", start);
  counterEl.addEventListener("mouseleave", stop);
  counterEl.addEventListener("blur", stop);
}

/* -------------------------------------------------------------- theme -- */

const themeMeta = document.querySelector('meta[name="theme-color"]');
let themeTimer = 0;

/** Night (white on black) from 21:00 to 06:00 local time. */
function applyTheme() {
  const forced = new URLSearchParams(location.search).get("theme");
  const now = new Date();
  const night = forced === "night" || (forced !== "day" && isNight(now));
  document.documentElement.dataset.theme = night ? "night" : "day";
  themeMeta?.setAttribute("content", night ? "#000000" : "#ffffff");
  clearTimeout(themeTimer);
  themeTimer = setTimeout(applyTheme, msUntilNextThemeChange(now) + 250);
}

/* -------------------------------------------------------------- clock -- */

function startClock() {
  let currentKey = "";
  let midnightTimer = 0;

  const tick = () => {
    const now = new Date();
    const key = dateKey(now);
    applyTheme();
    if (key !== currentKey) {
      const firstRun = currentKey === "";
      const wasWatchingToday = state.view === state.today;
      currentKey = key;
      state.today = toDay(localDateParts(now));
      if (firstRun) {
        state.view = state.today;
        reveal(entryFor(state.today));
        renderCounter();
      } else if (wasWatchingToday) {
        // midnight: today's quote drops away and the new one comes down from above
        goTo(state.today, "down");
      } else {
        renderCounter();
      }
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
  applyTheme();
  try {
    state.engine = new QuoteEngine(await instantiate(WASM_URL));
    state.launch = state.engine.x.launch_day();
    const pinned = parseDateKey(new URLSearchParams(location.search).get("date"));
    wireArchive(state.engine);
    wireKeys();
    wireCopy();
    wireCountdown();
    if (pinned) {
      state.today = state.view = toDay(pinned);
      reveal(entryFor(state.today));
      renderCounter();
    } else {
      startClock();
    }
  } catch (error) {
    console.error(error);
    reveal(FALLBACK);
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

main();
