const CACHE_NAME = 'zenion-pwa-v4';

function toScopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

const CORE_ASSETS = [
  './',
  './index.html',
  './card.json',
  './card-data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
].map(toScopedUrl);

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isCardJson = url.pathname.endsWith('/card.json');

  // Always try to get fresh card data so edits to card.json reflect immediately.
  if (isCardJson) {
    event.respondWith((async () => {
      try {
        const res = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, res.clone());
        return res;
      } catch (err) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // Default: cache-first for performance/offline.
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
