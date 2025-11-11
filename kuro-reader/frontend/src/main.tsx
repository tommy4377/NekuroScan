/**
 * MAIN - Application entry point
 * Initializes React root and registers service worker
 * 
 * UPDATED: 2025-11-10 - TypeScript ready, PWA optimized
 * Service worker registration handled after idle
 */

import ReactDOM from 'react-dom/client';
import App from './App';
import diagnostics from './utils/diagnostics';
import './utils/debugLogger'; // ✅ Inizializza debug logger (disabilita log per utenti normali)

// ========== SERVICE WORKER REGISTRATION ==========

// Service Worker registered after idle to avoid blocking
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const registerSW = async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Update in background - user will see new version on next manual refresh
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      
      // Pre-cache critical resources in background
      if ('caches' in window) {
        requestIdleCallback(() => {
          caches.open('nekuro-v4').then(cache => {
            const criticalUrls = [
              '/web-app-manifest-192x192.webp',
              '/favicon.svg'
            ];
            criticalUrls.forEach(url => cache.add(url).catch(() => {}));
          });
        });
      }
      
    } catch {
      // Silently fail in production
    }
  };
  
  // Register after page is fully loaded and idle
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(registerSW, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    window.addEventListener('load', () => {
      setTimeout(registerSW, 1000);
    });
  }
}

// ========== REACT ROOT ==========

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <App />
);

// ========== DEVELOPER TOOLS ==========

// Expose diagnostics to window for manual testing
if (typeof window !== 'undefined') {
  (window as any).nekuroDiagnostics = diagnostics;
  
  // Mostra comandi solo se debug abilitato o in dev
  const debugEnabled = localStorage.getItem('nekuro_debug_enabled') === 'true';
  if (import.meta.env.DEV || debugEnabled) {
    console.log('%c🔧 NeKuro Developer Tools', 'font-size: 16px; font-weight: bold; color: #805AD5');
    console.log('%cRun diagnostics: nekuroDiagnostics.runFullDiagnostics()', 'color: #48BB78');
    console.log('%cTest proxy: nekuroDiagnostics.testProxyConnection()', 'color: #48BB78');
    console.log('%cTest backend: nekuroDiagnostics.testBackendConnection()', 'color: #48BB78');
    console.log('%cTest manga API: nekuroDiagnostics.testMangaAPI()', 'color: #48BB78');
    console.log('%c────────────────────────────────', 'color: #718096');
    console.log('%cDebug: showLog("password")', 'color: #F56565');
    console.log('%cDebug: hideLog()', 'color: #F56565');
  }
}

