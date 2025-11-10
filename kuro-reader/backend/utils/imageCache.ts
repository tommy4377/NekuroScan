// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ IMAGE CACHE & DEDUPLICATION SYSTEM
// Sistema intelligente di caching con deduplica e metrics

import crypto from 'crypto';

/**
 * In-memory cache per immagini ottimizzate
 * In produzione: sostituire con Redis per persistenza e scaling
 */
class ImageCache {
  constructor() {
    // Cache principale: hash → URL Cloudinary
    this.cache = new Map();
    
    // Mapping URL originale → hash (per deduplica)
    this.urlToHash = new Map();
    
    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      conversions: 0,
      totalSaved: 0,
      deduplicatedUrls: 0,
      startTime: Date.now()
    };
    
    // Cache TTL (24 ore)
    this.ttl = 24 * 60 * 60 * 1000;
    
    // Cleanup ogni ora
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Genera hash univoco per URL immagine
   * Normalizza URL per deduplica (es. http vs https, query params)
   */
  generateHash(imageUrl) {
    if (!imageUrl) return null;
    
    try {
      // Normalizza URL
      const url = new URL(imageUrl);
      
      // Rimuovi query params che non impattano l'immagine
      url.search = '';
      url.hash = '';
      
      // Normalizza protocollo
      const normalizedUrl = url.toString().toLowerCase()
        .replace(/^https?:\/\//, ''); // Rimuovi protocollo
      
      // Genera SHA256 hash
      return crypto
        .createHash('sha256')
        .update(normalizedUrl)
        .digest('hex')
        .substring(0, 16); // Prime 16 chars
        
    } catch (error) {
      // Se non è URL valido, usa stringa as-is
      return crypto
        .createHash('sha256')
        .update(imageUrl.toLowerCase())
        .digest('hex')
        .substring(0, 16);
    }
  }

  /**
   * Ottieni URL ottimizzato dalla cache
   * @returns {Object|null} { url, cached, hash }
   */
  get(imageUrl) {
    if (!imageUrl) return null;
    
    const hash = this.generateHash(imageUrl);
    
    // Check se esiste in cache
    const cached = this.cache.get(hash);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      // Cache HIT
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
    
    // Cache MISS
    this.metrics.misses++;
    
    return null;
  }

  /**
   * Salva URL ottimizzato in cache
   */
  set(imageUrl, optimizedUrl, metadata = {}) {
    if (!imageUrl || !optimizedUrl) return;
    
    const hash = this.generateHash(imageUrl);
    
    // Check se è deduplica
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
    
    // Update metrics
    this.metrics.conversions++;
    if (metadata.originalSize && metadata.optimizedSize) {
      this.metrics.totalSaved += (metadata.originalSize - metadata.optimizedSize);
    }
  }

  /**
   * Cleanup cache entries scadute
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [hash, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(hash);
        
        // Rimuovi anche da urlToHash
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

  /**
   * Ottieni statistiche cache
   */
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 
      ? ((this.metrics.hits / totalRequests) * 100).toFixed(2) 
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

  /**
   * Clear cache (per testing o reset manuale)
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.urlToHash.clear();
    console.log(`🗑️  Image cache cleared: ${size} entries removed`);
  }

  /**
   * Check se URL è in cache
   */
  has(imageUrl) {
    if (!imageUrl) return false;
    const hash = this.generateHash(imageUrl);
    return this.cache.has(hash);
  }

  /**
   * Get cache size in MB
   */
  getSizeEstimate() {
    // Stima dimensione cache in memoria (rough estimate)
    const avgEntrySize = 1024; // ~1KB per entry (URL + metadata)
    return ((this.cache.size * avgEntrySize) / (1024 * 1024)).toFixed(2);
  }
}

// Singleton instance
const imageCache = new ImageCache();

export default imageCache;

/**
 * Helper functions
 */

/**
 * Determina se URL è un'immagine reader (non ottimizzare)
 */
export function isReaderImage(imageUrl, requestPath) {
  if (!imageUrl) return false;
  
  // Check request path (es. /api/chapter-images, /reader, ecc.)
  if (requestPath) {
    const readerPaths = [
      '/chapter-images',
      '/reader',
      '/read/',
      '/manga-page',
      '/page-'
    ];
    
    if (readerPaths.some(path => requestPath.includes(path))) {
      return true;
    }
  }
  
  // Check URL patterns (capitoli manga)
  const readerPatterns = [
    /\/pages?\//i,
    /\/capitoli?\//i,
    /\/chapters?\//i,
    /\/scans?\//i,
    /page[-_]\d+/i,
    /ch[-_]\d+/i
  ];
  
  return readerPatterns.some(pattern => pattern.test(imageUrl));
}

/**
 * Determina tipo immagine per ottimizzazione appropriata
 */
export function getImageType(imageUrl, requestPath) {
  if (!imageUrl) return 'unknown';
  
  // Reader images (NO optimization)
  if (isReaderImage(imageUrl, requestPath)) {
    return 'reader';
  }
  
  // Copertine manga
  if (imageUrl.includes('cover') || imageUrl.includes('copertina') || 
      requestPath?.includes('cover')) {
    return 'cover';
  }
  
  // Avatar utenti
  if (imageUrl.includes('avatar') || imageUrl.includes('profile') ||
      requestPath?.includes('avatar')) {
    return 'avatar';
  }
  
  // Banner
  if (imageUrl.includes('banner') || requestPath?.includes('banner')) {
    return 'banner';
  }
  
  // Logo
  if (imageUrl.includes('logo') || requestPath?.includes('logo')) {
    return 'logo';
  }
  
  return 'generic';
}

/**
 * Log metrics (chiamato periodicamente)
 */
export function logImageMetrics() {
  const stats = imageCache.getStats();
  
  console.log(`
╔════════════════════════════════════════════════════════════════
║  📊 IMAGE OPTIMIZATION METRICS
╠════════════════════════════════════════════════════════════════
║  Cache:
║    • Size: ${stats.cache.size} unique images (~${imageCache.getSizeEstimate()} MB in memory)
║    • Hit rate: ${stats.cache.hitRate} (${stats.cache.hits} hits / ${stats.cache.misses} misses)
║    • Total requests: ${stats.cache.totalRequests}
║
║  Optimization:
║    • Conversions: ${stats.optimization.conversions}
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

// Log metrics ogni 30 minuti
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    logImageMetrics();
  }, 30 * 60 * 1000);
}

