/**
 * READER HELPERS - Utilities for reader optimization
 * Proxy handling, image preloading, device detection
 */

// ========== TYPES ==========

type ImagePriority = 'high' | 'low' | 'auto';

interface ProxyOptions {
  maxWidth?: number | null;
  quality?: string | number;
  mobile?: boolean;
}

// ========== CONFIG ==========

// Use relative URL in production (Vercel rewrites), localhost in dev
const PROXY_URL = import.meta.env.VITE_PROXY_URL || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ========== CACHE ==========

const CDN_CHECK_CACHE = new Map<string, boolean>();

// ========== IMAGE PROXY ==========

export function getProxyImageUrl(originalUrl: string, options: ProxyOptions = {}): string {
  if (!originalUrl) return '';
  
  const {
    maxWidth = null,
    quality = 'auto',
    mobile = false
  } = options;
  
  const params = new URLSearchParams({
    url: originalUrl
  });
  
  if (maxWidth || mobile) {
    params.set('w', mobile ? '800' : (maxWidth?.toString() || '1200'));
  }
  
  if (quality !== 'auto') {
    params.set('q', quality.toString());
  }
  
  return `${PROXY_URL}/api/image-proxy?${params}`;
}

export function needsProxy(url: string): boolean {
  if (!url) return false;
  
  if (CDN_CHECK_CACHE.has(url)) {
    return CDN_CHECK_CACHE.get(url)!;
  }
  
  try {
    const urlObj = new URL(url);
    const needs = urlObj.hostname.includes('mangaworld') || 
                  urlObj.hostname.includes('cdn');
    
    CDN_CHECK_CACHE.set(url, needs);
    return needs;
  } catch {
    return true;
  }
}

// ========== PRELOADING ==========

export function preloadReaderImage(url: string, priority: ImagePriority = 'low'): Promise<void> {
  return new Promise((resolve) => {
    const proxiedUrl = getProxyImageUrl(url);
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = proxiedUrl;
    link.fetchPriority = priority;
    
    document.head.appendChild(link);
    
    setTimeout(() => {
      link.remove();
      resolve();
    }, 10000);
  });
}

export function preloadNextPages(pages: string[], currentIndex: number, count: number = 2): Promise<void[]> {
  const promises: Promise<void>[] = [];
  
  for (let i = 1; i <= count; i++) {
    const nextIdx = currentIndex + i;
    if (nextIdx < pages.length) {
      const pageUrl = pages[nextIdx];
      if (pageUrl) {
        const priority: ImagePriority = i === 1 ? 'high' : 'low';
        promises.push(preloadReaderImage(pageUrl, priority));
      }
    }
  }
  
  return Promise.all(promises);
}

// ========== DEVICE DETECTION ==========

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function getOptimalImageWidth(): number {
  if (typeof window === 'undefined') return 1200;
  
  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;
  
  if (width < 768) {
    return Math.min(800, width * dpr);
  }
  
  if (width < 1200) {
    return Math.min(1200, width * dpr);
  }
  
  return 1600;
}

// ========== DEFAULT EXPORT ==========

export default {
  getProxyImageUrl,
  preloadReaderImage,
  preloadNextPages,
  isMobileDevice,
  getOptimalImageWidth,
  needsProxy
};

