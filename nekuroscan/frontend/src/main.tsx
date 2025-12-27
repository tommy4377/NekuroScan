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
import { cleanupOrphanedLocalStorageData } from './utils/cleanupLocalStorage'; // ✅ Pulizia dati orfani
import { mobileDebug } from './utils/mobileDebug'; // ✅ Mobile debug utility

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

// ========== CLEANUP ORPHANED DATA ==========

// ✅ FIX: Pulisci dati desyncati all'avvio dell'app
// ✅ MOBILE FIX: Fallback per requestIdleCallback + try-catch per localStorage
if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(() => {
    try {
      cleanupOrphanedLocalStorageData();
    } catch (e) {
      // Silent fail - localStorage potrebbe non essere disponibile
      console.warn('[Main] Cleanup failed (private mode?):', e);
    }
  }, { timeout: 3000 });
} else {
  // Fallback per browser senza requestIdleCallback (alcuni mobile)
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        cleanupOrphanedLocalStorageData();
      } catch (e) {
        // Silent fail - localStorage potrebbe non essere disponibile
        console.warn('[Main] Cleanup failed (private mode?):', e);
      }
    }, 2000);
  });
}

// ========== REACT ROOT ==========

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ [Main] Root element not found!');
  throw new Error('Root element not found');
}

// ✅ MOBILE DEBUG: Log info prima del render
if (typeof window !== 'undefined') {
  try {
    mobileDebug.logDeviceInfo();
  } catch (e) {
    console.warn('[Main] Mobile debug log failed:', e);
  }
}

// ✅ MOBILE FIX: Wrappare il render in try-catch per catturare errori silenti
try {
  console.log('[Main] 🚀 Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('[Main] ✅ React root created, rendering App...');
  root.render(<App />);
  
  // ✅ MOBILE DEBUG: Verifica dopo il render
  setTimeout(() => {
    try {
      mobileDebug.logReactRoot();
      mobileDebug.checkInitialization();
    } catch (e) {
      console.warn('[Main] Mobile debug check failed:', e);
    }
  }, 1000);
  
} catch (error) {
  console.error('❌ [Main] Fatal error during React render:', error);
  
  // Mostra errore visibile nella pagina
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #1A202C; font-family: system-ui; min-height: 100vh;">
      <h1 style="color: #F56565;">❌ Errore di inizializzazione</h1>
      <p>L'applicazione non è riuscita a caricarsi. Controlla la console per i dettagli.</p>
      <pre style="background: #2D3748; padding: 15px; border-radius: 8px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #805AD5; color: white; border: none; border-radius: 6px; cursor: pointer;">🔄 Ricarica</button>
    </div>
  `;
  
  throw error; // Re-throw per error tracking
}

// ========== DEVELOPER TOOLS ==========

// Expose diagnostics to window for manual testing
// ✅ MOBILE FIX: Wrappare localStorage in try-catch per evitare errori in modalità privata
if (typeof window !== 'undefined') {
  (window as any).nekuroDiagnostics = diagnostics;
  
  // Mostra comandi solo se debug abilitato o in dev
  try {
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
  } catch (e) {
    // Silent fail - localStorage potrebbe non essere disponibile in modalità privata
    console.warn('[Main] localStorage not available (private mode?)');
  }
}

