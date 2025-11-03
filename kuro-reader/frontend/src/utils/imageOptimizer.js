// 🖼️ IMAGE OPTIMIZER - Ottimizzazione immagini con WebP

export const imageOptimizer = {
  // Converti URL immagine in WebP se supportato
  getOptimizedUrl(url, options = {}) {
    if (!url) return url;
    
    const {
      width = null,
      quality = 80,
      format = 'auto' // auto, webp, jpeg
    } = options;
    
    // Controlla supporto WebP
    const supportsWebP = this.supportsWebP();
    
    // Se l'URL è già ottimizzato o locale, ritorna così com'è
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // Per immagini remote, aggiungi parametri di ottimizzazione se supportati
    try {
      const urlObj = new URL(url);
      
      // Se supporta WebP e non è già WebP
      if (supportsWebP && format === 'auto' && !url.endsWith('.webp')) {
        urlObj.searchParams.set('format', 'webp');
      }
      
      if (width) {
        urlObj.searchParams.set('w', width.toString());
      }
      
      if (quality && quality !== 80) {
        urlObj.searchParams.set('q', quality.toString());
      }
      
      return urlObj.toString();
    } catch {
      // Se non è un URL valido, ritorna originale
      return url;
    }
  },

  // Check supporto WebP
  supportsWebP() {
    if (typeof window === 'undefined') return false;
    
    // Check cached result
    if (this._webpSupport !== undefined) return this._webpSupport;
    
    // Test WebP support
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      this._webpSupport = elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } else {
      this._webpSupport = false;
    }
    
    return this._webpSupport;
  },

  // Preload immagine con fallback
  preloadImage(url, fallbackUrl = null) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(url);
      
      img.onerror = () => {
        if (fallbackUrl) {
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackUrl);
          fallbackImg.onerror = () => reject(new Error('Both URLs failed'));
          fallbackImg.src = fallbackUrl;
        } else {
          reject(new Error('Image load failed'));
        }
      };
      
      img.src = url;
    });
  },

  // Batch preload multiple images
  async preloadImages(urls, { onProgress = null } = {}) {
    const results = [];
    let loaded = 0;
    
    for (const url of urls) {
      try {
        await this.preloadImage(url);
        results.push({ url, success: true });
      } catch (error) {
        results.push({ url, success: false, error });
      }
      
      loaded++;
      if (onProgress) {
        onProgress(loaded, urls.length);
      }
    }
    
    return results;
  },

  // Get responsive image srcset
  getResponsiveSrcSet(baseUrl, sizes = [320, 640, 1024, 1920]) {
    if (!baseUrl) return '';
    
    return sizes
      .map(size => `${this.getOptimizedUrl(baseUrl, { width: size })} ${size}w`)
      .join(', ');
  },

  // Calcola dimensione ottimale per viewport
  getOptimalSize(containerWidth) {
    // Arrotonda al multiplo di 100 più vicino
    const rounded = Math.ceil(containerWidth / 100) * 100;
    
    // Limita tra 320 e 1920
    return Math.max(320, Math.min(1920, rounded));
  }
};

export default imageOptimizer;

