/**
 * PERFORMANCE UTILITIES - Ottimizzazioni globali
 */

// ========== TYPES ==========

type DebouncedFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => void;
type ThrottledFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => void;

// ========== DEBOUNCE & THROTTLE ==========

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): DebouncedFunction<T> => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>): void {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number = 100
): ThrottledFunction<T> => {
  let inThrottle = false;
  
  return function(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
};

// ========== IMAGE UTILITIES ==========

export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const lazyLoadImages = (): IntersectionObserver | undefined => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return undefined;
  }

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          delete img.dataset.src;
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  document.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => {
    imageObserver.observe(img);
  });

  return imageObserver;
};

// ========== SCROLL OPTIMIZATION ==========

export const optimizeScroll = (): ((callback: () => void) => void) => {
  let ticking = false;
  
  return (callback: () => void): void => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        callback();
        ticking = false;
      });
      ticking = true;
    }
  };
};

// ========== GPU CHECK ==========

export const hasGoodGPU = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!gl) return false;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      return !renderer.toLowerCase().includes('swiftshader');
    }
    
    return true;
  } catch {
    return true;
  }
};

// ========== MEMORY CLEANUP ==========

export const cleanupMemory = (): void => {
  if (typeof window === 'undefined' || !window.URL?.revokeObjectURL) return;
  
  const blobUrls = document.querySelectorAll<HTMLImageElement>('img[src^="blob:"]');
  blobUrls.forEach((img) => {
    if (!img.isConnected && img.src) {
      window.URL.revokeObjectURL(img.src);
    }
  });
};

// ========== IDLE CALLBACK ==========

export const requestIdleCallback = (callback: IdleRequestCallback): number => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback);
  }
  // Fallback
  return setTimeout(() => callback({
    didTimeout: false,
    timeRemaining: () => 50
  } as IdleDeadline), 1) as unknown as number;
};

// ========== DEFAULT EXPORT ==========

export default {
  debounce,
  throttle,
  preloadImage,
  lazyLoadImages,
  optimizeScroll,
  hasGoodGPU,
  cleanupMemory,
  requestIdleCallback
};

