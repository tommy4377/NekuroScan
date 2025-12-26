// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ IMAGE CACHE & DEDUPLICATION SYSTEM
// Versione semplificata per proxy server

import crypto from 'crypto';

class ImageCache {
  constructor() {
    this.cache = new Map();
    this.urlToHash = new Map();
    
    this.metrics = {
      hits: 0,
      misses: 0,
      conversions: 0,
      totalSaved: 0,
      deduplicatedUrls: 0,
      readerBypass: 0,  // Reader images NON ottimizzate
      startTime: Date.now()
    };
    
    this.ttl = 24 * 60 * 60 * 1000; // 24 ore
    
    // Cleanup ogni ora
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  generateHash(imageUrl) {
    if (!imageUrl) return null;
    
    try {
      const url = new URL(imageUrl);
      url.search = '';
      url.hash = '';
      
      const normalizedUrl = url.toString().toLowerCase()
        .replace(/^https?:\/\//, '');
      
      return crypto
        .createHash('sha256')
        .update(normalizedUrl)
        .digest('hex')
        .substring(0, 16);
        
    } catch (error) {
      return crypto
        .createHash('sha256')
        .update(imageUrl.toLowerCase())
        .digest('hex')
        .substring(0, 16);
    }
  }

  get(imageUrl) {
    if (!imageUrl) return null;
    
    const hash = this.generateHash(imageUrl);
    const cached = this.cache.get(hash);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.metrics.hits++;
      
      return {
        url: cached.optimizedUrl,
        originalUrl: imageUrl,
        hash,
        cached: true,
        timestamp: cached.timestamp,
        format: cached.format,
        originalSize: cached.originalSize,
        optimizedSize: cached.optimizedSize,
        saved: cached.originalSize - cached.optimizedSize
      };
    }
    
    this.metrics.misses++;
    return null;
  }

  set(imageUrl, optimizedUrl, metadata = {}) {
    if (!imageUrl || !optimizedUrl) return;
    
    const hash = this.generateHash(imageUrl);
    
    const existingHash = this.urlToHash.get(imageUrl);
    if (existingHash && existingHash !== hash) {
      this.metrics.deduplicatedUrls++;
    }
    
    const cacheEntry = {
      originalUrl: imageUrl,
      optimizedUrl,
      hash,
      timestamp: Date.now(),
      format: metadata.format || 'unknown',
      originalSize: metadata.originalSize || 0,
      optimizedSize: metadata.optimizedSize || 0,
      ...metadata
    };
    
    this.cache.set(hash, cacheEntry);
    this.urlToHash.set(imageUrl, hash);
    
    this.metrics.conversions++;
    if (metadata.originalSize && metadata.optimizedSize) {
      this.metrics.totalSaved += (metadata.originalSize - metadata.optimizedSize);
    }
  }

  incrementReaderBypass() {
    this.metrics.readerBypass++;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [hash, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(hash);
        
        for (const [url, urlHash] of this.urlToHash.entries()) {
          if (urlHash === hash) {
            this.urlToHash.delete(url);
          }
        }
        
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Image cache cleanup: ${cleaned} expired entries removed`);
    }
  }

  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses + this.metrics.readerBypass;
    const hitRate = (this.metrics.hits + this.metrics.misses) > 0 
      ? ((this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100).toFixed(2) 
      : 0;
    
    const uptimeMs = Date.now() - this.metrics.startTime;
    const uptimeHours = (uptimeMs / (1000 * 60 * 60)).toFixed(2);
    
    return {
      cache: {
        size: this.cache.size,
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        hitRate: `${hitRate}%`,
        totalRequests
      },
      optimization: {
        conversions: this.metrics.conversions,
        readerBypass: this.metrics.readerBypass,
        totalSavedBytes: this.metrics.totalSaved,
        totalSavedMB: (this.metrics.totalSaved / (1024 * 1024)).toFixed(2),
        avgSavingPerImage: this.metrics.conversions > 0
          ? ((this.metrics.totalSaved / this.metrics.conversions) / 1024).toFixed(2) + ' KB'
          : '0 KB'
      },
      deduplication: {
        deduplicatedUrls: this.metrics.deduplicatedUrls,
        uniqueImages: this.cache.size
      },
      uptime: {
        ms: uptimeMs,
        hours: `${uptimeHours}h`,
        since: new Date(this.metrics.startTime).toISOString()
      }
    };
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.urlToHash.clear();
    console.log(`🗑️  Image cache cleared: ${size} entries removed`);
  }

  has(imageUrl) {
    if (!imageUrl) return false;
    const hash = this.generateHash(imageUrl);
    return this.cache.has(hash);
  }

  getSizeEstimate() {
    const avgEntrySize = 1024;
    return ((this.cache.size * avgEntrySize) / (1024 * 1024)).toFixed(2);
  }
}

const imageCache = new ImageCache();
export default imageCache;

/**
 * Determina se URL è un'immagine reader (NON ottimizzare)
 */
export function isReaderImage(imageUrl, requestPath) {
  if (!imageUrl) return false;
  
  // Check request path
  if (requestPath) {
    const readerPaths = [
      '/chapter-images',
      '/reader',
      '/read/',
      '/manga-page',
      '/page-',
      '/capitolo'
    ];
    
    if (readerPaths.some(path => requestPath.includes(path))) {
      return true;
    }
  }
  
  // Check URL patterns
  const readerPatterns = [
    /\/pages?\//i,
    /\/capitoli?\//i,
    /\/chapters?\//i,
    /\/scans?\//i,
    /page[-_]\d+/i,
    /ch[-_]\d+/i,
    /\/\d+\.(jpg|jpeg|png|webp)/i
  ];
  
  return readerPatterns.some(pattern => pattern.test(imageUrl));
}

/**
 * Determina tipo immagine
 */
export function getImageType(imageUrl, requestPath) {
  if (!imageUrl) return 'unknown';
  
  if (isReaderImage(imageUrl, requestPath)) {
    return 'reader';
  }
  
  if (imageUrl.includes('cover') || imageUrl.includes('copertina')) {
    return 'cover';
  }
  
  if (imageUrl.includes('avatar') || imageUrl.includes('profile')) {
    return 'avatar';
  }
  
  if (imageUrl.includes('banner')) {
    return 'banner';
  }
  
  if (imageUrl.includes('logo')) {
    return 'logo';
  }
  
  return 'generic';
}

/**
 * Log metrics
 */
export function logImageMetrics() {
  const stats = imageCache.getStats();
  
  console.log(`
╔════════════════════════════════════════════════════════════════
║  📊 IMAGE OPTIMIZATION METRICS
╠════════════════════════════════════════════════════════════════
║  Cache:
║    • Size: ${stats.cache.size} unique images (~${imageCache.getSizeEstimate()} MB)
║    • Hit rate: ${stats.cache.hitRate} (${stats.cache.hits} hits / ${stats.cache.misses} misses)
║    • Total requests: ${stats.cache.totalRequests}
║
║  Optimization:
║    • Conversions: ${stats.optimization.conversions}
║    • Reader bypass: ${stats.optimization.readerBypass} (original images)
║    • Total saved: ${stats.optimization.totalSavedMB} MB
║    • Avg saving: ${stats.optimization.avgSavingPerImage}
║
║  Deduplication:
║    • Deduplicated URLs: ${stats.deduplication.deduplicatedUrls}
║    • Unique images: ${stats.deduplication.uniqueImages}
║
║  Uptime: ${stats.uptime.hours} (since ${stats.uptime.since})
╚════════════════════════════════════════════════════════════════
  `);
}

// Log metrics ogni 30 minuti in production
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    logImageMetrics();
  }, 30 * 60 * 1000);
}
