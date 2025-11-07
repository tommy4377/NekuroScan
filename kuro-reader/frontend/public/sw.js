// ✅ SERVICE WORKER AVANZATO - NeKuro Scan v3.0
const CACHE_NAME = 'NeKuro Scan-v3';
const RUNTIME_CACHE = 'runtime-v3';
const IMAGE_CACHE = 'images-v3';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/apple-touch-icon.png',
  '/site.webmanifest'
];

// Install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching essential resources...');
      try {
        // Cache essenziali uno per uno per vedere errori
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
            console.log(`[SW] ✅ Cached: ${url}`);
          } catch (err) {
            console.warn(`[SW] ⚠️ Failed to cache: ${url}`, err.message);
          }
        }
        console.log('[SW] ✅ All essential resources cached');
      } catch (error) {
        console.error('[SW] ❌ Cache error:', error);
      }
    })
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        console.log('[SW] Cleaning old caches...');
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== RUNTIME_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log(`[SW] 🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
  
  console.log('[SW] ✅ Service worker activated');
});

// Fetch with advanced strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip chrome extensions and non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // API requests: Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Images: Cache first, fallback to network
  if (request.destination === 'image' || 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }
  
  // Static assets: Stale while revalidate
  if (/\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // HTML: Network first with timeout
  if (request.mode === 'navigate' || 
      request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirstWithTimeout(request, 3000));
    return;
  }
  
  // Default: Network first
  event.respondWith(networkFirst(request));
});

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Cache first strategy (per immagini)
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log(`[SW] 📦 Cached hit: ${request.url.split('/').pop()}`);
    
    // Return cached, but update in background silently
    fetch(request).then(response => {
      if (response && response.status === 200) {
        caches.open(cacheName).then(cache => {
          cache.put(request, response);
        });
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  console.log(`[SW] 🌐 Network fetch: ${request.url.split('/').pop()}`);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log(`[SW] ✅ Cached: ${request.url.split('/').pop()}`);
    }
    return networkResponse;
  } catch (error) {
    console.warn(`[SW] ❌ Failed to fetch: ${request.url}`);
    return new Response('Image not available offline', { status: 503 });
  }
}

// Stale while revalidate
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      caches.open(RUNTIME_CACHE).then(cache => {
        cache.put(request, response.clone());
      });
    }
    return response;
  }).catch(() => {});
  
  return cachedResponse || fetchPromise;
}

// Network first with timeout
async function networkFirstWithTimeout(request, timeout) {
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    );
    
    const response = await Promise.race([networkPromise, timeoutPromise]);
    
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/index.html');
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reading-progress') {
    event.waitUntil(syncReadingProgress());
  }
});

async function syncReadingProgress() {
  // This would sync with your backend
  console.log('Syncing reading progress...');
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nuovo capitolo disponibile!',
    icon: data.icon || '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      {
        action: 'open',
        title: 'Leggi ora'
      },
      {
        action: 'close',
        title: 'Chiudi'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'NeKuro Scan', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});

// Message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Periodic background sync (experimental)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-new-chapters') {
    event.waitUntil(checkNewChapters());
  }
});

async function checkNewChapters() {
  // This would check for new chapters and notify users
  console.log('Checking for new chapters...');
}