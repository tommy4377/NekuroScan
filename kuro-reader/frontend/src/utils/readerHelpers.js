// ✅ Reader Helpers - Utility per ottimizzazione reader

const config = {
  PROXY_URL: import.meta.env.VITE_API_URL || 'https://kuro-proxy-server.onrender.com'
};

/**
 * Genera URL proxy per immagini manga
 */
export function getProxyImageUrl(originalUrl, options = {}) {
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
    params.set('w', mobile ? '800' : (maxWidth || '1200'));
  }
  
  if (quality !== 'auto') {
    params.set('q', quality);
  }
  
  return `${config.PROXY_URL}/api/image-proxy?${params}`;
}

/**
 * Preload immagini con proxy URL
 */
export function preloadReaderImage(url, priority = 'low') {
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

/**
 * Preload batch di immagini con priorità
 */
export function preloadNextPages(pages, currentIndex, count = 2) {
  const promises = [];
  
  for (let i = 1; i <= count; i++) {
    const nextIdx = currentIndex + i;
    if (nextIdx < pages.length) {
      const priority = i === 1 ? 'high' : 'low';
      promises.push(preloadReaderImage(pages[nextIdx], priority));
    }
  }
  
  return Promise.all(promises);
}

/**
 * Detect mobile device
 */
export function isMobileDevice() {
  return window.innerWidth < 768;
}

/**
 * Get optimal image width per device
 */
export function getOptimalImageWidth() {
  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;
  
  if (width < 768) {
    return Math.min(800, width * dpr);
  } else if (width < 1200) {
    return Math.min(1200, width * dpr);
  } else {
    return 1600;
  }
}

/**
 * Cache per evitare check ripetitivi
 */
const CDN_CHECK_CACHE = new Map();

export function needsProxy(url) {
  if (!url) return false;
  
  if (CDN_CHECK_CACHE.has(url)) {
    return CDN_CHECK_CACHE.get(url);
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

export default {
  getProxyImageUrl,
  preloadReaderImage,
  preloadNextPages,
  isMobileDevice,
  getOptimalImageWidth,
  needsProxy
};

