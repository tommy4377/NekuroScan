// sw.js - Service Worker Avanzato con Cache Strategy
// Versione: 3.0

const CACHE_VERSION = 'nekuro-v3.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Risorse da cachare immediatamente
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// Durata cache (in secondi)
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60, // 7 giorni
  dynamic: 24 * 60 * 60, // 1 giorno
  images: 30 * 24 * 60 * 60, // 30 giorni
  api: 10 * 60 // 10 minuti
};

// Dimensione massima cache
const MAX_CACHE_SIZE = {
  images: 100, // max 100 immagini
  dynamic: 50,
  api: 30
};

// ========== INSTALL EVENT ==========
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting...');
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// ========== ACTIVATE EVENT ==========
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            // Elimina vecchie cache
            if (!cache.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients...');
        return self.clients.claim();
      })
  );
});

// ========== FETCH EVENT ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora richieste non-GET e chrome-extension
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Determina strategia basata sul tipo di risorsa
  if (isImageRequest(url)) {
    event.respondWith(imageCacheStrategy(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(apiCacheStrategy(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(staticCacheStrategy(request));
  } else {
    event.respondWith(dynamicCacheStrategy(request));
  }
});

// ========== CACHE STRATEGIES ==========

/**
 * Static Cache: Cache First, fallback to Network
 * Per: HTML, CSS, JS, Fonts
 */
async function staticCacheStrategy(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached && !isCacheExpired(cached, CACHE_DURATION.static)) {
      return cached;
    }
    
    // Network request
    const response = await fetch(request);
    
    // Cache solo se successo
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (err) {
    // Fallback a cache anche se scaduta
    const cached = await caches.match(request);
    if (cached) return cached;
    
    throw err;
  }
}

/**
 * Dynamic Cache: Network First, fallback to Cache
 * Per: Pagine dinamiche
 */
async function dynamicCacheStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      
      // Limita dimensione cache
      await limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE.dynamic);
    }
    
    return response;
  } catch (err) {
    // Fallback a cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Fallback pagina offline
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    throw err;
  }
}

/**
 * Image Cache: Cache First, lazy fetch
 * Per: Immagini
 */
async function imageCacheStrategy(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    
    // Ritorna subito cache se presente
    if (cached && !isCacheExpired(cached, CACHE_DURATION.images)) {
      return cached;
    }
    
    // Fetch in background
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
      await limitCacheSize(IMAGE_CACHE, MAX_CACHE_SIZE.images);
    }
    
    return response;
  } catch (err) {
    // Fallback a cache anche se scaduta
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Placeholder immagine
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#4A5568"/></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

/**
 * API Cache: Network First con stale-while-revalidate
 * Per: API calls
 */
async function apiCacheStrategy(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  
  // Network request
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
        limitCacheSize(API_CACHE, MAX_CACHE_SIZE.api);
      }
      return response;
    })
    .catch(() => null);
  
  // Se cache è fresca, ritorna cache e aggiorna in background
  if (cached && !isCacheExpired(cached, CACHE_DURATION.api)) {
    networkPromise; // Fire and forget
    return cached;
  }
  
  // Altrimenti aspetta network, fallback a cache
  return networkPromise.then(response => {
    return response || cached || Promise.reject('No network or cache');
  });
}

// ========== UTILITY FUNCTIONS ==========

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i.test(url.pathname) ||
         url.hostname.includes('cdn.mangaworld.cx') ||
         url.hostname.includes('wsrv.nl') ||
         url.hostname.includes('imagekit.io');
}

function isAPIRequest(url) {
  return url.pathname.includes('/api/') ||
         url.hostname.includes('kuro-proxy-server.onrender.com') ||
         url.hostname.includes('kuro-auth-backend.onrender.com');
}

function isStaticAsset(url) {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
         url.pathname === '/' ||
         url.pathname.endsWith('.html');
}

function isCacheExpired(response, maxAge) {
  const cachedDate = new Date(response.headers.get('date'));
  const now = new Date();
  const ageInSeconds = (now - cachedDate) / 1000;
  
  return ageInSeconds > maxAge;
}

async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Elimina le più vecchie
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxSize); // Ricorsivo
  }
}

// ========== MESSAGE EVENT ==========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => caches.delete(cache))
        );
      })
    );
  }
});

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Sincronizza dati quando torna online
    console.log('[SW] Syncing data...');
    // Qui puoi implementare logica di sincronizzazione
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nuovo contenuto disponibile!',
    icon: '/web-app-manifest-192x192.png',
    badge: '/favicon-96x96.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'NeKuro Scan', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});

console.log('[SW] Service Worker loaded successfully');
