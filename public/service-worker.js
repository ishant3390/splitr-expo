// Splitr PWA Service Worker
// BUILD_HASH is replaced by post-export.sh on each build
const CACHE_NAME = "splitr-__BUILD_HASH__";
const PRECACHE_URLS = ["/manifest.json", "/favicon.ico"];
const MAX_STATIC_ENTRIES = 200;

// Install: pre-cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: route requests by type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, PATCH, DELETE)
  if (request.method !== "GET") return;

  // Skip API calls — path check is primary, hostname is defense-in-depth
  if (url.pathname.startsWith("/v1/")) return;

  // Skip Clerk auth and API subdomain requests
  if (url.hostname.includes("clerk") || url.hostname.startsWith("api")) return;

  // Skip chrome-extension and other non-http protocols
  if (!url.protocol.startsWith("http")) return;

  // Navigation requests (HTML): network-first, update cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
        }
        return response;
      }).catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets (hashed by Metro): cache-first with eviction
  if (url.pathname.startsWith("/_expo/static/") || url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              // Evict oldest entries if cache grows too large
              cache.keys().then((keys) => {
                if (keys.length > MAX_STATIC_ENTRIES) {
                  cache.delete(keys[0]);
                }
              });
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
