
const CACHE_NAME = 'deutsch-ki-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install: Cache core assets gracefully
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // AddAll is atomic; if one fails, all fail. We use loop to be safer.
      for (const asset of ASSETS_TO_CACHE) {
         try {
           await cache.add(asset);
         } catch (err) {
           console.warn('Failed to cache asset:', asset, err);
         }
      }
    })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First for HTML, Cache First for assets
self.addEventListener('fetch', (event) => {
  // Ignore non-http schemes (extensions, etc)
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  
  // Navigation requests (HTML) -> Network First to allow updates
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static Assets -> Cache First, fallback to Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then(response => {
          // Optionally cache new assets on the fly?
          // For now, stick to strict cache first to ensure speed.
          return response;
      }).catch(err => {
          // If offline and not in cache, we just fail for non-nav requests
          throw err;
      });
    })
  );
});
