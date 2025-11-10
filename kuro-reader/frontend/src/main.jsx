import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ✅ PERFORMANCE: Service Worker registrato dopo idle per non bloccare
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Usa requestIdleCallback per registrare SW quando il browser è idle
  const registerSW = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Sempre controlla aggiornamenti
      });
      
      if (import.meta.env.DEV) {
        console.log('✅ Service Worker registrato');
      }
      
      // Gestisci aggiornamenti
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // ❌ NON mostrare popup - aggiorna in background
            // L'utente vedrà la nuova versione al prossimo refresh manuale
            console.log('🔄 Nuova versione disponibile (verrà applicata al prossimo refresh)');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      
      // ✅ PERFORMANCE: Pre-cache risorse critiche in background
      if ('caches' in window) {
        requestIdleCallback(() => {
          caches.open('nekuro-v4').then(cache => {
            const criticalUrls = [
              '/web-app-manifest-192x192.png',
              '/favicon.svg'
            ];
            criticalUrls.forEach(url => cache.add(url).catch(() => {}));
          });
        });
      }
      
    } catch (err) {
      // Silently fail in production
      if (import.meta.env.DEV) {
        console.error('❌ Service Worker failed:', err);
      }
    }
  };
  
  // Registra dopo che la pagina è completamente caricata e idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(registerSW, { timeout: 2000 });
  } else {
    // Fallback per browser che non supportano requestIdleCallback
    window.addEventListener('load', () => setTimeout(registerSW, 1000));
  }
  
  // ❌ NON ricaricare quando il service worker cambia
  // Aggiornamento silenzioso, applicato al prossimo caricamento pagina
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service Worker controller cambiato');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);