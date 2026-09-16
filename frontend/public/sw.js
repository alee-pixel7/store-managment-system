const CACHE_NAME = 'store-mgmt-v2';
const API_CACHE = 'store-mgmt-api-v2';

// App shell files to cache for offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

function isDevMode() {
  return self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
}

// Install: cache app shell (only in production)
self.addEventListener('install', (event) => {
  if (isDevMode()) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: skip caching entirely in dev mode
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and auth requests
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/auth')) return;

  // In dev mode: always go to network, never cache
  if (isDevMode()) return;

  // API requests: network-first with short timeout
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({ error: 'Offline — data may be stale' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // App shell: network-first in production
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
