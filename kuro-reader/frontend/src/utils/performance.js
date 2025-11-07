// 🚀 PERFORMANCE UTILITIES
// Ottimizzazioni globali per il sito

// Debounce generico
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle per scroll events
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Preload immagini critiche
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Lazy load immagini con IntersectionObserver
export const lazyLoadImages = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });

    return imageObserver;
  }
};

// Ottimizza scroll per performance
export const optimizeScroll = () => {
  let ticking = false;
  
  return (callback) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        callback();
        ticking = false;
      });
      ticking = true;
    }
  };
};

// Check se dispositivo ha GPU potente
export const hasGoodGPU = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // Disabilita effetti 3D su GPU deboli
      return !renderer.toLowerCase().includes('swiftshader');
    }
    return true;
  } catch (e) {
    return true; // Assume good GPU se non possiamo testare
  }
};

// Pulisci memoria quando necessario
export const cleanupMemory = () => {
  // Revoca blob URLs non più usati
  if (window.URL && window.URL.revokeObjectURL) {
    const blobUrls = document.querySelectorAll('img[src^="blob:"]');
    blobUrls.forEach((img) => {
      if (!img.isConnected) {
        window.URL.revokeObjectURL(img.src);
      }
    });
  }
};

// Ottimizza rendering
export const requestIdleCallback = (callback) => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback);
  }
  // Fallback per browser che non supportano
  return setTimeout(callback, 1);
};

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

