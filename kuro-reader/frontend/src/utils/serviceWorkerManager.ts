/**
 * SERVICE WORKER MANAGER
 * Gestione Service Worker, caching e prefetching intelligente
 */

// ========== TYPES ==========

export type ResourceType = 'script' | 'style' | 'image' | 'font' | 'document';
export type PrefetchPriority = 'high' | 'medium' | 'low';

export interface PrefetchOptions extends RequestInit {
  priority?: 'high' | 'low';
}

export interface PrefetchItem {
  url: string;
  options: PrefetchOptions;
}

export interface CacheStats {
  [cacheName: string]: {
    entries: number;
    size: string;
  };
}

export interface ServiceWorkerUpdateCallback {
  onUpdateFound?: () => void;
  onUpdateAvailable?: () => void;
}

// ========== SERVICE WORKER ==========

/**
 * Registra Service Worker con gestione update
 */
export async function registerServiceWorker(
  callbacks?: ServiceWorkerUpdateCallback
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    // Gestisci update
    registration.addEventListener('updatefound', () => {
      callbacks?.onUpdateFound?.();
      
      const newWorker = registration.installing;
      if (!newWorker) return;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          callbacks?.onUpdateAvailable?.();
          
          // Mostra notifica all'utente (opzionale)
          if (window.confirm('Nuova versione disponibile! Ricaricare?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });
    
    // Reload quando nuovo SW prende controllo
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // SW updated silently
    });
    
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister Service Worker (per debug)
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  } catch (error) {
    console.error('Error unregistering Service Worker:', error);
  }
}

/**
 * Clear tutte le cache
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) return;
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cache => caches.delete(cache)));
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

// ========== PREFETCH MANAGER ==========

/**
 * Prefetch intelligente delle risorse
 * Carica risorse in background quando il browser è idle
 */
export class PrefetchManager {
  private queue: Set<string> = new Set();
  private prefetched: Set<string> = new Set();
  private isRunning: boolean = false;
  private priority: Record<PrefetchPriority, PrefetchItem[]> = {
    high: [],
    medium: [],
    low: []
  };
  
  /**
   * Aggiungi URL alla coda di prefetch
   */
  add(url: string, priority: PrefetchPriority = 'medium', options: PrefetchOptions = {}): void {
    if (this.prefetched.has(url) || this.queue.has(url)) {
      return;
    }
    
    this.queue.add(url);
    this.priority[priority].push({ url, options });
    
    if (!this.isRunning) {
      void this.start();
    }
  }
  
  /**
   * Avvia prefetching intelligente
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    const work = async (): Promise<void> => {
      const priorities: PrefetchPriority[] = ['high', 'medium', 'low'];
      
      for (const priority of priorities) {
        while (this.priority[priority].length > 0) {
          const item = this.priority[priority].shift();
          if (!item) continue;
          
          await this.prefetchOne(item.url, item.options);
          
          // Verifica connessione
          const connection = (navigator as any).connection;
          if (connection?.saveData) {
            this.isRunning = false;
            return;
          }
          
          // Throttle per non sovraccaricare
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.isRunning = false;
    };
    
    // Usa requestIdleCallback se disponibile
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => void work());
    } else {
      setTimeout(() => void work(), 0);
    }
  }
  
  /**
   * Prefetch singola risorsa
   */
  private async prefetchOne(url: string, options: PrefetchOptions = {}): Promise<void> {
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
        await cache.put(url, response.clone());
      }
      
      this.prefetched.add(url);
      this.queue.delete(url);
    } catch (error) {
      this.queue.delete(url);
    }
  }
  
  /**
   * Prefetch pagine linkate nella viewport
   */
  prefetchLinksInViewport(): void {
    if (!('IntersectionObserver' in window)) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement;
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
    
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => {
      observer.observe(link);
    });
  }
  
  /**
   * Prefetch su hover (per desktop)
   */
  setupHoverPrefetch(): void {
    let timeout: NodeJS.Timeout | undefined;
    
    document.addEventListener('mouseover', (e) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      
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
      if (timeout) clearTimeout(timeout);
    });
  }
  
  /**
   * Clear coda
   */
  clear(): void {
    this.queue.clear();
    this.priority = { high: [], medium: [], low: [] };
    this.isRunning = false;
  }
  
  /**
   * Get statistiche prefetch
   */
  getStats(): { queued: number; prefetched: number } {
    return {
      queued: this.queue.size,
      prefetched: this.prefetched.size
    };
  }
}

// Singleton instance
export const prefetchManager = new PrefetchManager();

// ========== RESOURCE PRELOAD ==========

/**
 * Preload risorsa critica (high priority)
 */
export function preloadResource(url: string, as: ResourceType = 'script'): void {
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
 */
export function prefetchResource(url: string): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

// ========== CACHE STATS ==========

/**
 * Check stato cache e dimensioni
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  if (!('caches' in window)) return null;
  
  try {
    const cacheNames = await caches.keys();
    const stats: CacheStats = {};
    
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
        size: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
      };
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return null;
  }
}

// ========== NETWORK OPTIMIZATION ==========

/**
 * Ottimizzazione Network Information API
 * Adatta qualità immagini basato sulla connessione
 */
export function getOptimalImageQuality(): number {
  const connection = (navigator as any).connection;
  
  if (!connection) return 85; // Default
  
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
    default:
      return 85;
  }
}

/**
 * Check se connessione è costosa (mobile data)
 */
export function isExpensiveConnection(): boolean {
  const connection = (navigator as any).connection;
  
  if (!connection) return false;
  
  return connection.saveData || 
         ['slow-2g', '2g'].includes(connection.effectiveType);
}

/**
 * Check se connessione è veloce
 */
export function isFastConnection(): boolean {
  const connection = (navigator as any).connection;
  
  if (!connection) return true; // Assume fast if API not available
  
  return connection.effectiveType === '4g' && !connection.saveData;
}

// ========== EXPORT DEFAULT ==========

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  clearAllCaches,
  prefetchManager,
  preloadResource,
  prefetchResource,
  getCacheStats,
  getOptimalImageQuality,
  isExpensiveConnection,
  isFastConnection
};

