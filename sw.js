const CACHE_NAME = 'deutsch-ki-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Best effort caching
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

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  
  // Navigation: Network First, Fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html')
        .then(res => res || new Response('Offline mode unavailable. Check connection.', { status: 503 })))
    );
    return;
  }

  // Assets: Cache First, Fallback to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).catch(err => {
        // If it's an image we can return a placeholder or just fail silently
        // For now, allow the error to bubble for non-critical assets
        return new Response(null, { status: 404, statusText: 'Not Found (Offline)' });
      });
    })
  );
});