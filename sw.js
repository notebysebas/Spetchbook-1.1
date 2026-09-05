// Spetchbook — Service Worker
// Cache-first strategy: serve from cache when available, fall back to network,
// and opportunistically update the cache from network responses.
//
// IMPORTANT: bump CACHE_NAME on every deploy that changes index.html (or any
// precached asset) — this is the only thing that busts the old cache for
// returning visitors. See handoff.md / gotchas.md for the carried-over
// reminder this resolves.
const CACHE_NAME = 'spetchbook-v109';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // addAll fails atomically if any single URL 404s — fetch individually
      // so one missing icon (e.g. a size not yet generated) doesn't block
      // the whole install.
      return Promise.all(
        PRECACHE_URLS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('SW precache skipped:', url, err);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Only handle same-origin GET requests — let cross-origin requests
  // (Google Fonts CDN, etc.) pass straight through to the network.
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var networkFetch = fetch(event.request).then(function(response) {
        // Only cache valid, basic (same-origin) responses.
        if (response && response.status === 200 && response.type === 'basic') {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        // Network failed — fall back to whatever's cached, if anything.
        return cached;
      });

      // Cache-first: return cached immediately if we have it, but still
      // refresh the cache in the background from the network.
      return cached || networkFetch;
    })
  );
});
