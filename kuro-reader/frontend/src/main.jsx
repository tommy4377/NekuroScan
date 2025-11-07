import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registra Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrato:', registration);
        
        // Forza il pre-cache del logo e risorse critiche
        if (registration.active) {
          const criticalUrls = [
            '/web-app-manifest-192x192.png',
            '/web-app-manifest-512x512.png',
            '/favicon.svg',
            '/apple-touch-icon.png'
          ];
          
          caches.open('NeKuro Scan-v3').then(cache => {
            criticalUrls.forEach(url => {
              cache.add(url).then(() => {
                console.log(`[Cache] ✅ Pre-cached: ${url}`);
              }).catch(err => {
                console.warn(`[Cache] ⚠️ Failed to pre-cache: ${url}`, err);
              });
            });
          });
        }
      })
      .catch((err) => {
        console.error('❌ Service Worker registration failed:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);