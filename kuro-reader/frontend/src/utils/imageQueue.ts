/**
 * IMAGE QUEUE - Batch loading con priorità e LRU cache
 * Gestisce caricamento concorrente con limite e ordinamento per priorità
 */

// ========== TYPES ==========

interface QueueItem {
  url: string;
  priority: number;
  resolve: (image: HTMLImageElement) => void;
  reject: (error: Error) => void;
}

interface QueueStats {
  queued: number;
  active: number;
  cached: number;
}

// ========== IMAGE QUEUE CLASS ==========

class ImageQueue {
  private readonly concurrency: number;
  private readonly maxCacheSize: number;
  private readonly timeout: number = 30000; // 30 secondi
  
  private queue: QueueItem[] = [];
  private active: number = 0;
  private cache: Map<string, HTMLImageElement> = new Map();
  
  constructor(concurrency: number = 15, maxCacheSize: number = 100) {
    this.concurrency = concurrency;
    this.maxCacheSize = maxCacheSize;
  }
  
  add(url: string, priority: number = 0): Promise<HTMLImageElement> {
    // Check cache
    const cached = this.cache.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }
    
    return new Promise<HTMLImageElement>((resolve, reject) => {
      this.queue.push({ url, priority, resolve, reject });
      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);
      this.process();
    });
  }
  
  private async process(): Promise<void> {
    if (this.active >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    const item = this.queue.shift();
    if (!item) return;
    
    this.active++;
    
    try {
      const img = await this.loadImage(item.url);
      
      // LRU cache: rimuovi entry più vecchia se cache piena
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
      
      this.cache.set(item.url, img);
      item.resolve(img);
    } catch (error) {
      item.reject(error as Error);
    } finally {
      this.active--;
      this.process();
    }
  }
  
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      const timeoutId = setTimeout(() => {
        img.src = '';
        reject(new Error(`Image load timeout: ${url}`));
      }, this.timeout);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Image load failed: ${url}`));
      };
      
      img.src = url;
    });
  }
  
  clear(): void {
    this.queue = [];
    this.cache.clear();
    this.active = 0;
  }
  
  getStats(): QueueStats {
    return {
      queued: this.queue.length,
      active: this.active,
      cached: this.cache.size
    };
  }
  
  // Utility per rimuovere specifico URL dalla cache
  removeFromCache(url: string): boolean {
    return this.cache.delete(url);
  }
  
  // Check se URL è in cache
  isCached(url: string): boolean {
    return this.cache.has(url);
  }
}

// ========== SINGLETON INSTANCE ==========

const imageQueue = new ImageQueue(15, 100);

export default imageQueue;

// ========== HELPER FUNCTIONS ==========

export function preloadImage(url: string, priority: number = 0): Promise<HTMLImageElement> {
  return imageQueue.add(url, priority);
}

export function clearImageQueue(): void {
  imageQueue.clear();
}

export function getQueueStats(): QueueStats {
  return imageQueue.getStats();
}

export function isImageCached(url: string): boolean {
  return imageQueue.isCached(url);
}

export function removeImageFromCache(url: string): boolean {
  return imageQueue.removeFromCache(url);
}

