// ✅ SERVICE WORKER - NeKuro Scan
const CACHE_NAME = 'nekuro-v4';
const RUNTIME_CACHE = 'runtime-v4';
const IMAGE_CACHE = 'images-v4';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/apple-touch-icon.png'
];

// Install - Cache risorse essenziali
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching app shell...');
      try {
        await cache.addAll(urlsToCache);
        console.log('[SW] ✅ App shell cached');
      } catch (err) {
        console.error('[SW] Failed to cache app shell:', err);
      }
    })
  );
});

// Activate - Pulizia vecchie cache
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Activated');
      return self.clients.claim();
    })
  );
});

// Fetch - Strategie di caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-http
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // App shell - Cache first
  if (urlsToCache.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }
  
  // JS/CSS assets - Cache with network update
  if (/\.(js|css|woff|woff2)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => {});
        return cached || fetchPromise;
      })
    );
    return;
  }
  
  // Immagini - Cache first con update in background
  if (request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Update in background
          fetch(request).then(response => {
            if (response.status === 200) {
              caches.open(IMAGE_CACHE).then(cache => cache.put(request, response.clone()));
            }
          }).catch(() => {});
          return cached;
        }
        
        return fetch(request).then(response => {
          if (response.status === 200) {
            caches.open(IMAGE_CACHE).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => {
          return new Response('Image offline', { status: 503 });
        });
      })
    );
    return;
  }
  
  // Default - Network first
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          return cached || caches.match('/index.html');
        });
      })
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

