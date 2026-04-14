const CACHE_NAME = "digibiz-master-os-v31";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/core/firebase-init.js?v=31",
  "/core/event-validation.js?v=4",
  "/core/event-bus.js?v=4",
  "/core/accounts-core.js?v=4",
  "/core/auth-roles.js?v=31",
  "/core/business-types.js?v=31",
  "/core/dashboard-core.js?v=31",
  "/core/subscription-manager.js?v=4",
  "/core/distributor-inventory.js?v=31",
  "/core/mw-trading-dsl-config.js?v=31",
  "/core/sidebar.js?v=31",
  "/modules/core/dashboard.html"
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
