const CACHE_NAME = "pwa-hand-loans-v1";
const ASSETS = [
  "/modules/core/mobile-hand-loans.html",
  "/modules/core/mobile-hand-loans-manifest.json",
  "/core/firebase-init.js?v=2",
  "/core/dashboard-core.js?v=62",
  "/core/scrap-vba-core.js?v=1",
  "https://img.icons8.com/color/192/handshake.png",
  "https://img.icons8.com/color/512/handshake.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("pwa-hand-loans-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
