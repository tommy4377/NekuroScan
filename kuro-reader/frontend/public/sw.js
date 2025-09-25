// Service Worker per notifiche push
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/web-app-manifest-192x192.png',
      badge: data.badge || '/web-app-manifest-192x192.png',
      vibrate: data.vibrate || [200, 100, 200],
      data: data.data || {},
      actions: data.actions || [
        { action: 'open', title: 'Leggi ora' },
        { action: 'close', title: 'Chiudi' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'KuroReader', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Cache per offline
const CACHE_NAME = 'kuroreader-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});