const CACHE_NAME = 'addon-manager-v2';
const URLS_TO_CACHE = ['/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For the configure page: network-first with cache fallback
  if (url.pathname === '/configure' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For manifest: cache-first (rarely changes)
  if (url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // For everything else: network only
  event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
});
