/**
 * quotes :: service worker
 *
 * Network first, cache as a fallback, so the quote of the day still appears
 * offline but a fresh deploy is never hidden behind a stale cache.
 */

const CACHE = "quotes-3ffaae9920fc";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css?v=3ffaae9920fc",
  "./app.js?v=3ffaae9920fc",
  "./clock.js?v=3ffaae9920fc",
  "./quotes.wasm?v=f5e5fca476c5",
  "./favicon.svg",
  "./manifest.webmanifest",
];
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !FONT_HOSTS.has(url.hostname)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok || response.type === "opaque") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match("./index.html"))),
  );
});
