import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registra Service Worker con gestione aggiornamenti
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registrato');
      
      // Gestisci aggiornamenti
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] Aggiornamento disponibile...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] Nuovo service worker pronto, refresh necessario');
            // Auto-refresh per aggiornare
            if (confirm('Nuova versione disponibile! Ricaricare?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });
      
      // Pre-cache risorse critiche
      const cache = await caches.open('nekuro-v4');
      const criticalUrls = [
        '/web-app-manifest-192x192.png',
        '/web-app-manifest-512x512.png',
        '/favicon.svg'
      ];
      
      for (const url of criticalUrls) {
        try {
          await cache.add(url);
          console.log(`[Cache] ✅ ${url}`);
        } catch (err) {
          console.warn(`[Cache] Failed: ${url}`);
        }
      }
      
    } catch (err) {
      console.error('❌ Service Worker failed:', err);
    }
  });
  
  // Reload quando il service worker prende controllo
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);