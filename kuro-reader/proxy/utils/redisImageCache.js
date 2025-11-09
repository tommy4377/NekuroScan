// ✅ Redis Image Cache - Production-Ready con fallback in-memory
import crypto from 'crypto';

class RedisImageCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackCache = new Map();
    
    this.metrics = {
      hits: 0,
      misses: 0,
      conversions: 0,
      totalSaved: 0,
      deduplicatedUrls: 0,
      readerBypass: 0,
      startTime: Date.now()
    };
    
    this.ttl = 7 * 24 * 60 * 60;
    
    this.init();
    
    // Cleanup fallback cache ogni ora
    setInterval(() => this.cleanupFallback(), 3600000);
  }

  cleanupFallback() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [hash, entry] of this.fallbackCache.entries()) {
      if (now - entry.timestamp > this.ttl * 1000) {
        this.fallbackCache.delete(hash);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Fallback cache cleanup: ${cleaned} entries removed`);
    }
  }

  async init() {
    if (!process.env.REDIS_URL) {
      console.warn('⚠️  REDIS_URL not configured, using in-memory cache');
      return;
    }

    try {
      const { createClient } = await import('redis').catch(err => {
        console.error('❌ Redis module not found:', err.message);
        console.warn('⚠️  Install redis: npm install redis');
        throw err;
      });
      
      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis: max reconnect attempts, using fallback');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.warn('⚠️  Redis disconnected, using fallback');
        this.isConnected = false;
      });

      await this.client.connect();
      await this.client.ping();
      console.log('✅ Redis Image Cache initialized');
      
    } catch (error) {
      console.error('❌ Redis init failed:', error.message);
      this.isConnected = false;
    }
  }

  generateHash(imageUrl) {
    if (!imageUrl) return null;
    
    try {
      const url = new URL(imageUrl);
      url.search = '';
      url.hash = '';
      
      const normalizedUrl = url.toString().toLowerCase().replace(/^https?:\/\//, '');
      
      return crypto.createHash('sha256').update(normalizedUrl).digest('hex').substring(0, 16);
    } catch (error) {
      return crypto.createHash('sha256').update(imageUrl.toLowerCase()).digest('hex').substring(0, 16);
    }
  }

  async get(imageUrl) {
    if (!imageUrl) return null;
    
    const hash = this.generateHash(imageUrl);
    const key = `img:${hash}`;
    
    try {
      if (this.isConnected && this.client) {
        const cached = await this.client.get(key);
        
        if (cached) {
          this.metrics.hits++;
          const data = JSON.parse(cached);
          
          return {
            url: data.optimizedUrl,
            originalUrl: imageUrl,
            hash,
            cached: true,
            timestamp: data.timestamp,
            format: data.format,
            originalSize: data.originalSize,
            optimizedSize: data.optimizedSize,
            saved: data.originalSize - data.optimizedSize
          };
        }
      } else {
        const cached = this.fallbackCache.get(hash);
        if (cached && Date.now() - cached.timestamp < this.ttl * 1000) {
          this.metrics.hits++;
          return { ...cached, cached: true };
        }
      }
      
      this.metrics.misses++;
      return null;
      
    } catch (error) {
      const cached = this.fallbackCache.get(hash);
      if (cached) {
        this.metrics.hits++;
        return { ...cached, cached: true };
      }
      this.metrics.misses++;
      return null;
    }
  }

  async set(imageUrl, optimizedUrl, metadata = {}) {
    if (!imageUrl || !optimizedUrl) return;
    
    const hash = this.generateHash(imageUrl);
    const key = `img:${hash}`;
    
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
    
    try {
      if (this.isConnected && this.client) {
        await this.client.setEx(key, this.ttl, JSON.stringify(cacheEntry));
      }
      
      this.fallbackCache.set(hash, cacheEntry);
      
      this.metrics.conversions++;
      if (metadata.originalSize && metadata.optimizedSize) {
        this.metrics.totalSaved += (metadata.originalSize - metadata.optimizedSize);
      }
      
    } catch (error) {
      this.fallbackCache.set(hash, cacheEntry);
    }
  }

  incrementReaderBypass() {
    this.metrics.readerBypass++;
  }

  async getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses + this.metrics.readerBypass;
    const hitRate = (this.metrics.hits + this.metrics.misses) > 0 
      ? ((this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100).toFixed(2) 
      : 0;
    
    const uptimeMs = Date.now() - this.metrics.startTime;
    const uptimeHours = (uptimeMs / (1000 * 60 * 60)).toFixed(2);
    
    let cacheSize = this.fallbackCache.size;
    
    if (this.isConnected && this.client) {
      try {
        // SCAN invece di KEYS (non blocca Redis)
        let cursor = 0;
        let keys = [];
        
        do {
          const reply = await this.client.scan(cursor, {
            MATCH: 'img:*',
            COUNT: 100
          });
          cursor = reply.cursor;
          keys.push(...reply.keys);
        } while (cursor !== 0);
        
        cacheSize = keys.length;
      } catch (error) {
        // Fallback to in-memory size
      }
    }
    
    return {
      redis: {
        connected: this.isConnected,
        fallbackSize: this.fallbackCache.size
      },
      cache: {
        size: cacheSize,
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
        uniqueImages: cacheSize
      },
      uptime: {
        ms: uptimeMs,
        hours: `${uptimeHours}h`,
        since: new Date(this.metrics.startTime).toISOString()
      }
    };
  }

  async clear() {
    try {
      if (this.isConnected && this.client) {
        // SCAN invece di KEYS (non blocca Redis)
        let cursor = 0;
        let deletedCount = 0;
        
        do {
          const reply = await this.client.scan(cursor, {
            MATCH: 'img:*',
            COUNT: 100
          });
          cursor = reply.cursor;
          
          if (reply.keys.length > 0) {
            await this.client.del(reply.keys);
            deletedCount += reply.keys.length;
          }
        } while (cursor !== 0);
        
        console.log(`🗑️ Redis cache cleared: ${deletedCount} entries`);
      }
      
      this.fallbackCache.clear();
      console.log('🗑️ Fallback cache cleared');
      
    } catch (error) {
      console.error('❌ Redis CLEAR error:', error.message);
      this.fallbackCache.clear();
    }
  }

  async has(imageUrl) {
    const result = await this.get(imageUrl);
    return result !== null;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

const redisImageCache = new RedisImageCache();

process.on('SIGTERM', async () => {
  await redisImageCache.disconnect();
});

process.on('SIGINT', async () => {
  await redisImageCache.disconnect();
});

export default redisImageCache;
export { isReaderImage, getImageType } from './imageCache.js';

