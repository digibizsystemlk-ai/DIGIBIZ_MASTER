const CACHE_NAME = "digibiz-master-os-v70";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/core/pwa-init.js?v=1",
  "/core/sms-wallet-core.js?v=4",
  "/auth/login.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isCriticalCoreScript =
    url.pathname === "/core/sidebar.js" ||
    url.pathname === "/core/dashboard-core.js";

  // Always prefer network for critical boot scripts so page-to-page navigation
  // never uses stale sidebar/dashboard logic from old SW cache.
  if (isCriticalCoreScript) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (event.request.url.includes(".js") || event.request.url.includes(".css") || event.request.url.includes(".png") || event.request.url.includes(".svg") || event.request.url.includes(".jpg") || event.request.url.includes(".jpeg")) {
              cache.put(event.request, copy);
            }
          });
          return response;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
