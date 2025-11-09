// ✅ Image Request Queue - Batch loading con priorità
class ImageQueue {
  constructor(concurrency = 15, maxCacheSize = 100) {
    this.concurrency = concurrency;
    this.maxCacheSize = maxCacheSize;
    this.queue = [];
    this.active = 0;
    this.cache = new Map();
  }
  
  add(url, priority = 0) {
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }
    
    return new Promise((resolve, reject) => {
      this.queue.push({ url, priority, resolve, reject });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.process();
    });
  }
  
  async process() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    
    const item = this.queue.shift();
    this.active++;
    
    try {
      const img = new Image();
      img.src = item.url;
      
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load'));
        setTimeout(() => reject(new Error('Timeout')), 30000);
      });
      
      // LRU cache: rimuovi vecchia entry se troppo grande
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      this.cache.set(item.url, img);
      item.resolve(img);
    } catch (error) {
      item.reject(error);
    } finally {
      this.active--;
      this.process();
    }
  }
  
  clear() {
    this.queue = [];
    this.cache.clear();
  }
  
  getStats() {
    return {
      queued: this.queue.length,
      active: this.active,
      cached: this.cache.size
    };
  }
}

const imageQueue = new ImageQueue(15, 100);

export default imageQueue;

export function preloadImage(url, priority = 0) {
  return imageQueue.add(url, priority);
}

export function clearImageQueue() {
  imageQueue.clear();
}

export function getQueueStats() {
  return imageQueue.getStats();
}

