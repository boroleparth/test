/* Service worker for CS Tutor.
 * Built by vite.config.js, which fills in the version and the precache file list.
 *
 * Strategy:
 *  - On install, download and cache the whole app shell (HTML, JS, CSS, icons).
 *  - Same-origin GET requests are answered from the cache first => instant, offline start.
 *  - Requests to other origins (the AI APIs) are NOT touched: chat always goes to the network.
 *  - A new deploy produces a new VERSION; old caches are deleted when it activates.
 */
const VERSION = '__VERSION__';
const CACHE = 'cs-tutor-' + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('cs-tutor-') && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// The page sends this when the user taps "Update" in the update banner.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never cache API traffic

  // Page navigations: serve the cached app shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./', { ignoreSearch: true }).then((cached) => cached || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
