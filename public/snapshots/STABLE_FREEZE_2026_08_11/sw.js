const CACHE_NAME = "digibiz-retail-v2058";
const PRECACHE_URLS = [
  "/assets/vendor/html2canvas.min.js",
  "/assets/vendor/sweetalert2.all.min.js",
  "/assets/vendor/firebase-app-compat.js",
  "/assets/vendor/firebase-auth-compat.js",
  "/assets/vendor/firebase-firestore-compat.js",
  "/modules/distributor/web/distributor-repapp.html",
  "/core/pwa-init.js",
  "/core/firebase-init.js",
  "/manifest.json"
];

// Force immediate activation and precache critical offline assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => console.warn('[SW] Precache warn:', err));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Network-First with full offline Cache Fallback Strategy
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Network-First with automatic Cache Fallback for pages and scripts
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request, { ignoreSearch: true });
        })
    );
    return;
  }

  // Fallback Network-first for static images/media
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
