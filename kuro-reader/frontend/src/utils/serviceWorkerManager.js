// serviceWorkerManager.js - Gestione Service Worker e Prefetching

/**
 * Registra Service Worker con gestione update
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker non supportato');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('✅ Service Worker registered:', registration.scope);
    
    // Gestisci update
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Nuovo SW disponibile
          console.log('🔄 Nuovo Service Worker disponibile');
          
          // Mostra notifica all'utente
          if (window.confirm('Nuova versione disponibile! Ricaricare?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });
    
    // Reload quando nuovo SW prende controllo
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // ❌ NON ricaricare automaticamente - può interrompere la lettura
      // L'utente vedrà la nuova versione al prossimo refresh manuale
      console.log('🔄 Service Worker aggiornato (verrà applicato al prossimo refresh)');
    });
    
    return registration;
  } catch (err) {
    console.error('❌ Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Unregister Service Worker (per debug)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  
  console.log('Service Worker unregistered');
}

/**
 * Clear tutte le cache
 */
export async function clearAllCaches() {
  if (!('caches' in window)) return;
  
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cache => caches.delete(cache))
  );
  
  console.log('Tutte le cache eliminate');
}

/**
 * Prefetch intelligente delle risorse
 * Carica risorse in background quando il browser è idle
 */
export class PrefetchManager {
  constructor() {
    this.queue = new Set();
    this.prefetched = new Set();
    this.isRunning = false;
    this.priority = {
      high: [],
      medium: [],
      low: []
    };
  }
  
  /**
   * Aggiungi URL alla coda di prefetch
   * @param {string} url - URL da prefetchare
   * @param {string} priority - 'high' | 'medium' | 'low'
   * @param {Object} options - Opzioni fetch
   */
  add(url, priority = 'medium', options = {}) {
    if (this.prefetched.has(url) || this.queue.has(url)) {
      return;
    }
    
    this.queue.add(url);
    this.priority[priority].push({ url, options });
    
    if (!this.isRunning) {
      this.start();
    }
  }
  
  /**
   * Avvia prefetching intelligente
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Usa requestIdleCallback se disponibile
    const scheduleWork = window.requestIdleCallback || setTimeout;
    
    const work = async () => {
      // Priorità: high -> medium -> low
      const priorities = ['high', 'medium', 'low'];
      
      for (const priority of priorities) {
        while (this.priority[priority].length > 0) {
          const { url, options } = this.priority[priority].shift();
          
          await this.prefetchOne(url, options);
          
          // Verifica connessione
          const connection = navigator.connection;
          if (connection && connection.saveData) {
            console.log('⚠️ Save-Data mode, stopping prefetch');
            this.isRunning = false;
            return;
          }
          
          // Throttle per non sovraccaricare
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.isRunning = false;
    };
    
    scheduleWork(work);
  }
  
  /**
   * Prefetch singola risorsa
   */
  async prefetchOne(url, options = {}) {
    try {
      // Check se già in cache
      if ('caches' in window) {
        const cache = await caches.open('nekuro-v3.0-dynamic');
        const cached = await cache.match(url);
        
        if (cached) {
          this.prefetched.add(url);
          return;
        }
      }
      
      // Fetch con priority bassa
      const response = await fetch(url, {
        ...options,
        priority: 'low',
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (response.ok && 'caches' in window) {
        const cache = await caches.open('nekuro-v3.0-dynamic');
        await cache.put(url, response);
      }
      
      this.prefetched.add(url);
      this.queue.delete(url);
      
      console.log(`✅ Prefetched: ${url}`);
    } catch (err) {
      console.warn(`⚠️ Prefetch failed for ${url}:`, err);
      this.queue.delete(url);
    }
  }
  
  /**
   * Prefetch pagine linkate nella viewport
   */
  prefetchLinksInViewport() {
    if (!('IntersectionObserver' in window)) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const link = entry.target;
          const href = link.getAttribute('href');
          
          if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
            this.add(href, 'low');
          }
          
          observer.unobserve(link);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    document.querySelectorAll('a[href]').forEach(link => {
      observer.observe(link);
    });
  }
  
  /**
   * Prefetch su hover (per desktop)
   */
  setupHoverPrefetch() {
    let timeout;
    
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a[href]');
      
      if (link) {
        const href = link.getAttribute('href');
        
        // Delay per evitare prefetch accidentali
        timeout = setTimeout(() => {
          if (href && !href.startsWith('#')) {
            this.add(href, 'high');
          }
        }, 100);
      }
    });
    
    document.addEventListener('mouseout', () => {
      clearTimeout(timeout);
    });
  }
  
  /**
   * Clear coda
   */
  clear() {
    this.queue.clear();
    this.priority = { high: [], medium: [], low: [] };
    this.isRunning = false;
  }
}

// Singleton instance
export const prefetchManager = new PrefetchManager();

/**
 * Preload risorsa critica (high priority)
 * @param {string} url - URL risorsa
 * @param {string} as - Tipo risorsa ('script', 'style', 'image', 'font')
 */
export function preloadResource(url, as = 'script') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = url;
  
  if (as === 'font') {
    link.crossOrigin = 'anonymous';
  }
  
  document.head.appendChild(link);
}

/**
 * Prefetch risorsa (low priority)
 * @param {string} url - URL risorsa
 */
export function prefetchResource(url) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Check stato cache e dimensioni
 */
export async function getCacheStats() {
  if (!('caches' in window)) return null;
  
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    stats[cacheName] = {
      entries: keys.length,
      size: (totalSize / 1024 / 1024).toFixed(2) + ' MB'
    };
  }
  
  return stats;
}

/**
 * Ottimizzazione Network Information API
 * Adatta qualità immagini basato sulla connessione
 */
export function getOptimalImageQuality() {
  if (!('connection' in navigator)) return 85; // Default
  
  const connection = navigator.connection;
  
  // Save-Data mode
  if (connection.saveData) {
    return 60;
  }
  
  // Effective connection type
  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 50;
    case '3g':
      return 70;
    case '4g':
      return 85;
    default:
      return 85;
  }
}

/**
 * Check se connessione è costosa (mobile data)
 */
export function isExpensiveConnection() {
  if (!('connection' in navigator)) return false;
  
  const connection = navigator.connection;
  return connection.saveData || 
         ['slow-2g', '2g'].includes(connection.effectiveType);
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  clearAllCaches,
  prefetchManager,
  preloadResource,
  prefetchResource,
  getCacheStats,
  getOptimalImageQuality,
  isExpensiveConnection
};

