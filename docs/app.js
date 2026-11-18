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
 * Keys: <- and -> (or a horizontal swipe) walk through past days.
 * Click the quote to copy it; right-click it (or the author) to search the
 * web. The gear opens settings, help, sharing and credits.
 */

import {
  dateKey, formatCountdown, isNight, localDateParts, msUntilNextLocalMidnight,
  msUntilNextThemeChange, parseDateKey,
} from "./clock.js?v=aba96b4ba423";

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
const settingsButton = /** @type {HTMLButtonElement} */ (document.getElementById("settings-button"));
const panelEl = /** @type {HTMLDialogElement} */ (document.getElementById("panel"));
const archiveEl = /** @type {HTMLDialogElement} */ (document.getElementById("archive"));
const archiveList = /** @type {HTMLOListElement} */ (document.getElementById("archive-list"));
const decoder = new TextDecoder("utf-8", { fatal: true });

/* -------------------------------------------------------- preferences -- */
/* Per-visitor settings, kept in this browser only. Every read and write is
 * guarded: private windows and blocked storage simply fall back to defaults. */

const PREFS_KEY = "quotes:prefs";
const DEFAULT_PREFS = { theme: "auto", size: "m", motion: "on", counter: "show", copy: "author", search: "google" };
/** @type {typeof DEFAULT_PREFS} */
let prefs = loadPrefs();

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return { ...DEFAULT_PREFS, ...(saved && typeof saved === "object" ? saved : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

function applyPrefs() {
  const root = document.documentElement;
  root.dataset.size = prefs.size;
  root.dataset.motion = prefs.motion;
  root.dataset.counter = prefs.counter;
  layoutCorner();
  for (const group of document.querySelectorAll(".choices[data-pref]")) {
    const key = /** @type {HTMLElement} */ (group).dataset.pref;
    for (const button of group.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.value === prefs[key]));
    }
  }
  applyTheme();
}

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

/*
 * Bottom-right corner: [gear] DAY 2. The counter's width is set explicitly
 * and animated, so when hovering swaps "Day 2" for the longer countdown, the
 * gear glides left to make room. With the counter hidden, the gear takes its
 * place in the corner.
 */
function layoutCorner() {
  const root = document.documentElement;
  const shown = !counterEl.hidden && prefs.counter !== "hide";
  const hovering = counterEl.matches(":hover, :focus-visible");
  const target = hovering ? counterNext : counterLabel;
  const width = shown ? target.getBoundingClientRect().width : 0;
  root.style.setProperty("--counter-w", `${width}px`);
  root.style.setProperty("--counter-h", `${shown ? counterLabel.getBoundingClientRect().height : 0}px`);
  root.dataset.corner = shown ? "with-counter" : "alone";
  // animate later changes (hover, toggling the counter), never the first layout
  if (shown && !root.dataset.cornerReady) setTimeout(() => { root.dataset.cornerReady = "true"; }, 60);
}

function renderCounter() {
  counterEl.hidden = state.today - state.launch + 1 < 1;
  counterLabel.textContent = `Day ${state.view - state.launch + 1}`;
  counterEl.dataset.today = JSON.stringify(state.engine.partsFromDays(state.today));
  layoutCorner();
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

/** Animate a dialog out, then close it. @param {HTMLDialogElement} dialog */
function closeDialog(dialog) {
  if (!dialog.open || dialog.classList.contains("is-closing")) return;
  if (reducedMotion()) {
    dialog.close();
    return;
  }
  dialog.classList.add("is-closing");
  closeTimer = setTimeout(() => dialog.close(), CLOSE_MS);
}

/**
 * Close button, backdrop click and Esc all animate the dialog out. Esc is
 * handled on keydown because browsers only let a page cancel the native
 * dialog close right after a user gesture.
 * @param {HTMLDialogElement} dialog @param {Element | null} closeButton
 */
function wireDismiss(dialog, closeButton) {
  closeButton?.addEventListener("click", () => closeDialog(dialog));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(dialog); });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); closeDialog(dialog); }
  });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener("close", () => {
    clearTimeout(closeTimer);
    dialog.classList.remove("is-closing");
  });
}

const anyDialogOpen = () => document.querySelector("dialog[open]") !== null;

/** @param {QuoteEngine} engine */
function wireArchive(engine) {
  counterEl.addEventListener("click", () => openArchive(engine));
  wireDismiss(archiveEl, document.getElementById("archive-close"));
  // belt and braces for fast flings: top up whenever we get near the bottom
  archiveList.addEventListener("scroll", () => {
    if (archiveList.scrollHeight - archiveList.scrollTop - archiveList.clientHeight < 800) appendArchivePage();
  }, { passive: true });
  archiveEl.addEventListener("close", () => {
    observer.disconnect();
    archive = null;
    archiveList.replaceChildren();
    counterEl.focus({ preventScroll: true });
  });
}

/* ---------------------------------------------------------- rendering -- */

function reducedMotion() {
  return prefs.motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

/**
 * Move one day back (-1) or forward (+1). Going back, the page moves right
 * and yesterday comes in from the left; going forward, the opposite.
 * @param {-1 | 1} delta
 */
function step(delta) {
  const from = queued?.day ?? state.view;
  goTo(from + delta, delta > 0 ? "left" : "right");
}

function wireKeys() {
  addEventListener("keydown", (event) => {
    if (anyDialogOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
  });
}

/* -------------------------------------------------------------- swipe -- */

const SWIPE_MIN = 50; // CSS px of horizontal travel
const SWIPE_MAX_MS = 800;
let swipedAt = 0;

/** A horizontal swipe does what the arrow keys do: finger left = next day. */
function wireSwipe() {
  /** @type {{x: number, y: number, at: number} | null} */
  let start = null;
  addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1 || anyDialogOpen()) { start = null; return; }
    const touch = event.touches[0];
    start = { x: touch.clientX, y: touch.clientY, at: performance.now() };
  }, { passive: true });
  addEventListener("touchcancel", () => { start = null; }, { passive: true });
  addEventListener("touchend", (event) => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const quick = performance.now() - start.at <= SWIPE_MAX_MS;
    start = null;
    if (!quick || Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swipedAt = performance.now();
    step(dx < 0 ? 1 : -1);
  }, { passive: true });
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
    if (performance.now() - swipedAt < 500) return; // the tail end of a swipe, not a tap
    const text = textEl.textContent ?? "";
    const author = authorEl.textContent ?? "";
    const payload = author && prefs.copy === "author" ? `“${text}” — ${author}` : `“${text}”`;
    try {
      await navigator.clipboard.writeText(payload);
      toast("Copied");
    } catch {
      toast("Could not copy");
    }
  });
}

/* ------------------------------------------------------------- search -- */

const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q=",
};

/** Right-click the quote or the author to search for it in a new tab. */
function wireSearch() {
  /** @param {HTMLElement} el @param {() => string} query */
  const searchable = (el, query) => {
    el.addEventListener("contextmenu", (event) => {
      const q = query().trim();
      if (!q) return; // nothing to search: keep the native menu
      event.preventDefault();
      const engine = SEARCH_ENGINES[prefs.search] ?? SEARCH_ENGINES.google;
      window.open(engine + encodeURIComponent(q), "_blank", "noopener,noreferrer");
    });
  };
  searchable(textEl, () => `"${textEl.textContent ?? ""}"`);
  searchable(authorEl, () => authorEl.textContent ?? "");
}

/* -------------------------------------------------------------- share -- */

const CARD = 1080;

/** @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} max */
function wrap(ctx, text, max) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw the quote on screen as a square card in the current theme. */
async function renderCard() {
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue("--ink").trim() || "#000";
  const paper = css.getPropertyValue("--paper").trim() || "#fff";
  const family = '"Cormorant Garamond", Garamond, serif';
  await Promise.all([
    document.fonts.load(`italic 400 64px ${family}`),
    document.fonts.load(`500 26px ${family}`),
    document.fonts.load(`700 24px ${family}`),
  ]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = CARD;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, CARD, CARD);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = `\u201C${textEl.textContent ?? ""}\u201D`;
  const author = (authorEl.textContent ?? "").toUpperCase();
  const max = CARD * 0.72;
  let size = 78;
  let lines;
  do {
    ctx.font = `italic 400 ${size}px ${family}`;
    lines = wrap(ctx, text, max);
    size -= 2;
  } while (lines.length * size * 1.22 > CARD * 0.52 && size > 34);
  size += 2;
  const lineHeight = size * 1.22;
  const authorBlock = author ? 150 : 0;
  let y = (CARD - lines.length * lineHeight - authorBlock) / 2 + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, CARD / 2, y);
    y += lineHeight;
  }

  if (author) {
    y += 40;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CARD / 2 - 32, y);
    ctx.lineTo(CARD / 2 + 32, y);
    ctx.stroke();
    ctx.font = `500 26px ${family}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
    ctx.fillText(author, CARD / 2 + 4, y + 62);
  }

  ctx.globalAlpha = 0.4;
  ctx.font = `700 24px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText("QUOTES", 72, CARD - 72);
  ctx.textAlign = "right";
  ctx.fillText(counterLabel.textContent?.toUpperCase() ?? "", CARD - 72, CARD - 72);
  return canvas;
}

/** @param {{story?: boolean}} [options] */
async function shareImage({ story = false } = {}) {
  const canvas = await renderCard();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) { toast("Could not share"); return; }
  const name = `${(counterLabel.textContent ?? "quote").toLowerCase().replace(/\s+/g, "-")}.png`;
  const file = new File([blob], name, { type: "image/png" });
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Quotes", url: location.origin + location.pathname });
      return;
    } catch (error) {
      if (/** @type {Error} */ (error).name === "AbortError") return; // the visitor changed their mind
    }
  }
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast(story ? "Image saved for your story" : "Image saved");
}


/* ---------------------------------------------------------- countdown -- */

let countdownTimer = 0;

function wireCountdown() {
  const update = () => {
    counterNext.textContent = `Next in ${formatCountdown(msUntilNextLocalMidnight(new Date()))}`;
  };
  const start = () => {
    update();
    layoutCorner();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => { update(); layoutCorner(); }, 1000);
  };
  const stop = () => { clearInterval(countdownTimer); layoutCorner(); };
  update();
  counterEl.addEventListener("mouseenter", start);
  counterEl.addEventListener("focus", start);
  counterEl.addEventListener("mouseleave", stop);
  counterEl.addEventListener("blur", stop);
}

/* -------------------------------------------------------------- panel -- */

const siteUrl = () => location.origin + location.pathname;
const enc = encodeURIComponent;
const openTab = (url) => window.open(url, "_blank", "noopener,noreferrer");

function currentQuoteText() {
  const text = textEl.textContent ?? "";
  const author = authorEl.textContent ?? "";
  return author ? `\u201C${text}\u201D \u2014 ${author}` : `\u201C${text}\u201D`;
}

/** @param {string} text @param {string} done */
async function copyText(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("Could not copy");
  }
}

const SHARE_TARGETS = {
  whatsapp: () => openTab(`https://wa.me/?text=${enc(`${currentQuoteText()}\n\n${siteUrl()}`)}`),
  facebook: () => openTab(`https://www.facebook.com/sharer/sharer.php?u=${enc(siteUrl())}`),
  x: () => openTab(`https://x.com/intent/post?text=${enc(currentQuoteText())}&url=${enc(siteUrl())}`),
  telegram: () => openTab(`https://t.me/share/url?url=${enc(siteUrl())}&text=${enc(currentQuoteText())}`),
  // Discord has no share URL: hand over a message formatted for it
  discord: () => copyText(`> ${currentQuoteText().replace(" \u2014 ", "\n> \u2014 ")}\n${siteUrl()}`, "Copied for Discord"),
  // Stories need a picture; on a phone the share sheet offers Instagram
  instagram: () => shareImage({ story: true }).catch(() => toast("Could not share")),
  email: () => { location.href = `mailto:?subject=${enc("A quote for you")}&body=${enc(`${currentQuoteText()}\n\n${siteUrl()}`)}`; },
  link: () => copyText(siteUrl(), "Link copied"),
  image: () => shareImage().catch(() => toast("Could not share")),
};

/** @param {HTMLElement} tab */
function selectTab(tab) {
  const tabs = [...panelEl.querySelectorAll(".rail-tab")];
  for (const other of tabs) {
    const active = other === tab;
    other.setAttribute("aria-selected", String(active));
    other.tabIndex = active ? 0 : -1;
    const section = document.getElementById(other.getAttribute("aria-controls") ?? "");
    if (section) {
      section.hidden = !active;
      if (active) section.scrollTop = 0;
    }
  }
  const title = document.getElementById("panel-title");
  if (title) title.textContent = tab.dataset.title ?? "";
}

function wirePanel() {
  const next = document.getElementById("info-next");
  const stats = document.getElementById("info-stats");
  if (stats && state.engine) {
    stats.textContent = `${state.engine.count} quotes by ${state.engine.x.author_count()} authors`;
  }

  settingsButton.addEventListener("click", () => {
    if (anyDialogOpen()) return;
    // phones cannot hover the counter, so the countdown lives here as well
    if (next) next.textContent = `The next one arrives in ${formatCountdown(msUntilNextLocalMidnight(new Date()))}.`;
    panelEl.classList.remove("is-closing");
    panelEl.showModal();
  });
  wireDismiss(panelEl, document.getElementById("panel-close"));
  panelEl.addEventListener("close", () => settingsButton.focus({ preventScroll: true }));

  // the rail: click, or arrow keys between tabs
  const tabs = /** @type {HTMLElement[]} */ ([...panelEl.querySelectorAll(".rail-tab")]);
  for (const tab of tabs) {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      const i = tabs.indexOf(tab);
      const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (!move) return;
      event.preventDefault();
      const target = tabs[(i + move + tabs.length) % tabs.length];
      target.focus();
      selectTab(target);
    });
  }

  // settings: every choice applies and saves immediately
  panelEl.addEventListener("click", (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest(".choices button");
    if (button) {
      const key = /** @type {HTMLElement} */ (button.parentElement).dataset.pref;
      if (key && key in prefs) {
        prefs = { ...prefs, [key]: button.dataset.value };
        savePrefs();
        applyPrefs();
      }
      return;
    }
    const target = /** @type {HTMLElement} */ (event.target).closest("[data-share]");
    if (target) SHARE_TARGETS[/** @type {HTMLElement} */ (target).dataset.share]?.();
  });
}

/* -------------------------------------------------------------- theme -- */

const themeMeta = document.querySelector('meta[name="theme-color"]');
let themeTimer = 0;

/** Night (white on black) from 21:00 to 06:00 local time. */
function applyTheme() {
  const forced = new URLSearchParams(location.search).get("theme")
    ?? { light: "day", dark: "night" }[prefs.theme] ?? null;
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
  applyPrefs();
  addEventListener("resize", layoutCorner);
  document.fonts?.ready.then(layoutCorner);
  try {
    state.engine = new QuoteEngine(await instantiate(WASM_URL));
    state.launch = state.engine.x.launch_day();
    const pinned = parseDateKey(new URLSearchParams(location.search).get("date"));
    wireArchive(state.engine);
    wireKeys();
    wireSwipe();
    wireCopy();
    wireSearch();
    wirePanel();
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
