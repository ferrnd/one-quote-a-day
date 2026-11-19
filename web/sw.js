/**
 * quotes :: service worker
 *
 * Network first, cache as a fallback, so the quote of the day still appears
 * offline but a fresh deploy is never hidden behind a stale cache.
 *
 * Only this site's own files go through here. Google Fonts are left to the
 * browser: the Content-Security-Policy (connect-src 'self') forbids the worker
 * from fetching them, and its offline fallback would answer a stylesheet
 * request with index.html, which broke the fonts.
 */

const CACHE = "quotes-%%BUILD%%";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css?v=%%BUILD%%",
  "./app.js?v=%%BUILD%%",
  "./clock.js?v=%%BUILD%%",
  "./i18n.js?v=%%BUILD%%",
  "./blobs.js?v=%%BUILD%%",
  "./quotes.wasm?v=%%WASM_HASH%%",
  "./favicon.svg",
  "./manifest.webmanifest",
];

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
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      // offline: the cached copy, and the page itself only for page loads, never for a script or stylesheet
      .catch(() => caches.match(request).then((hit) => hit ?? (request.mode === "navigate" ? caches.match("./index.html") : Response.error()))),
  );
});
