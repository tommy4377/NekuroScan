/**
 * IMAGE OPTIMIZER - Ottimizzazione immagini con WebP e lazy loading
 */

// ========== TYPES ==========

type ImageFormat = 'auto' | 'webp' | 'jpeg' | 'png';

interface OptimizationOptions {
  width?: number | null;
  quality?: number;
  format?: ImageFormat;
}

interface PreloadResult {
  url: string;
  success: boolean;
  error?: Error;
}

interface PreloadOptions {
  onProgress?: ((loaded: number, total: number) => void) | null;
}

interface ImageOptimizer {
  _webpSupport?: boolean;
  supportsWebP(): boolean;
  getOptimizedUrl(url: string, options?: OptimizationOptions): string;
  preloadImage(url: string, fallbackUrl?: string | null): Promise<string>;
  preloadImages(urls: string[], options?: PreloadOptions): Promise<PreloadResult[]>;
  getResponsiveSrcSet(baseUrl: string, sizes?: number[]): string;
  getOptimalSize(containerWidth: number): number;
}

// ========== IMPLEMENTATION ==========

export const imageOptimizer: ImageOptimizer = {
  _webpSupport: undefined,

  supportsWebP(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Usa cached result
    if (this._webpSupport !== undefined) return this._webpSupport;
    
    // Test WebP support con canvas
    const elem = document.createElement('canvas');
    if (elem.getContext?.('2d')) {
      this._webpSupport = elem.toDataURL('image/webp').startsWith('data:image/webp');
    } else {
      this._webpSupport = false;
    }
    
    return this._webpSupport;
  },

  getOptimizedUrl(url: string, options: OptimizationOptions = {}): string {
    if (!url) return url;
    
    const {
      width = null,
      quality = 80,
      format = 'auto'
    } = options;
    
    // Skip data URLs e blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    try {
      const urlObj = new URL(url);
      
      // Applica formato WebP se supportato
      const supportsWebP = this.supportsWebP();
      if (supportsWebP && format === 'auto' && !url.endsWith('.webp')) {
        urlObj.searchParams.set('format', 'webp');
      }
      
      // Width parameter
      if (width && width > 0) {
        urlObj.searchParams.set('w', width.toString());
      }
      
      // Quality parameter (solo se diverso da default)
      if (quality && quality !== 80) {
        urlObj.searchParams.set('q', quality.toString());
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  },

  preloadImage(url: string, fallbackUrl: string | null = null): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(url);
      
      img.onerror = () => {
        if (fallbackUrl) {
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackUrl);
          fallbackImg.onerror = () => reject(new Error('Both URLs failed to load'));
          fallbackImg.src = fallbackUrl;
        } else {
          reject(new Error('Image failed to load'));
        }
      };
      
      img.src = url;
    });
  },

  async preloadImages(urls: string[], options: PreloadOptions = {}): Promise<PreloadResult[]> {
    const { onProgress = null } = options;
    const results: PreloadResult[] = [];
    let loaded = 0;
    
    for (const url of urls) {
      try {
        await this.preloadImage(url);
        results.push({ url, success: true });
      } catch (error) {
        results.push({ url, success: false, error: error as Error });
      }
      
      loaded++;
      onProgress?.(loaded, urls.length);
    }
    
    return results;
  },

  getResponsiveSrcSet(baseUrl: string, sizes: number[] = [320, 640, 1024, 1920]): string {
    if (!baseUrl) return '';
    
    return sizes
      .map(size => `${this.getOptimizedUrl(baseUrl, { width: size })} ${size}w`)
      .join(', ');
  },

  getOptimalSize(containerWidth: number): number {
    // Arrotonda al multiplo di 100 più vicino
    const rounded = Math.ceil(containerWidth / 100) * 100;
    
    // Limita tra 320 e 1920
    return Math.max(320, Math.min(1920, rounded));
  }
};

export default imageOptimizer;

