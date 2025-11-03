// 💾 CHAPTER CACHE - Sistema di cache intelligente per capitoli letti

const CACHE_PREFIX = 'chapter_cache_';
const CACHE_EXPIRY_DAYS = 7; // Cache per 7 giorni
const MAX_CACHE_SIZE_MB = 50; // Max 50MB di cache

export const chapterCache = {
  // Salva capitolo in cache
  saveChapter(mangaUrl, chapterUrl, images) {
    try {
      const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
      const cacheData = {
        images,
        timestamp: Date.now(),
        mangaUrl,
        chapterUrl,
        size: JSON.stringify(images).length
      };
      
      // Check cache size before saving
      const currentSize = this.getCacheSize();
      if (currentSize + cacheData.size > MAX_CACHE_SIZE_MB * 1024 * 1024) {
        // Rimuovi cache più vecchie
        this.cleanOldCache();
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Salva metadata
      this.updateCacheMetadata(cacheKey, cacheData);
      
      return true;
    } catch (error) {
      console.error('Error saving chapter cache:', error);
      return false;
    }
  },

  // Ottieni capitolo dalla cache
  getChapter(mangaUrl, chapterUrl) {
    try {
      const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      
      // Check expiry
      const age = Date.now() - cacheData.timestamp;
      const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      if (age > maxAge) {
        // Expired, rimuovi
        this.removeChapter(mangaUrl, chapterUrl);
        return null;
      }
      
      // Update last accessed
      cacheData.lastAccessed = Date.now();
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      return cacheData.images;
    } catch (error) {
      console.error('Error getting chapter cache:', error);
      return null;
    }
  },

  // Check se capitolo è in cache
  hasChapter(mangaUrl, chapterUrl) {
    const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
    return localStorage.getItem(cacheKey) !== null;
  },

  // Rimuovi capitolo dalla cache
  removeChapter(mangaUrl, chapterUrl) {
    const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
    localStorage.removeItem(cacheKey);
    this.removeCacheMetadata(cacheKey);
  },

  // Pulisci cache vecchie
  cleanOldCache() {
    try {
      const metadata = this.getCacheMetadata();
      const now = Date.now();
      const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      // Ordina per lastAccessed (rimuovi prima i meno usati)
      const sorted = Object.entries(metadata).sort((a, b) => {
        const aAccessed = a[1].lastAccessed || a[1].timestamp;
        const bAccessed = b[1].lastAccessed || b[1].timestamp;
        return aAccessed - bAccessed;
      });
      
      // Rimuovi finché non siamo sotto il limite
      let currentSize = this.getCacheSize();
      const targetSize = MAX_CACHE_SIZE_MB * 0.7 * 1024 * 1024; // 70% del max
      
      for (const [key, data] of sorted) {
        if (currentSize <= targetSize) break;
        
        // Rimuovi anche se vecchio
        const age = now - data.timestamp;
        if (age > maxAge || currentSize > targetSize) {
          localStorage.removeItem(key);
          currentSize -= data.size;
        }
      }
      
      // Aggiorna metadata
      this.cleanCacheMetadata();
    } catch (error) {
      console.error('Error cleaning cache:', error);
    }
  },

  // Ottieni dimensione cache totale
  getCacheSize() {
    let size = 0;
    const metadata = this.getCacheMetadata();
    
    for (const data of Object.values(metadata)) {
      size += data.size || 0;
    }
    
    return size;
  },

  // Ottieni metadata cache
  getCacheMetadata() {
    try {
      const meta = localStorage.getItem('chapter_cache_metadata');
      return meta ? JSON.parse(meta) : {};
    } catch {
      return {};
    }
  },

  // Aggiorna metadata cache
  updateCacheMetadata(key, data) {
    try {
      const metadata = this.getCacheMetadata();
      metadata[key] = {
        timestamp: data.timestamp,
        size: data.size,
        mangaUrl: data.mangaUrl,
        chapterUrl: data.chapterUrl,
        lastAccessed: Date.now()
      };
      localStorage.setItem('chapter_cache_metadata', JSON.stringify(metadata));
    } catch (error) {
      console.error('Error updating cache metadata:', error);
    }
  },

  // Rimuovi metadata
  removeCacheMetadata(key) {
    try {
      const metadata = this.getCacheMetadata();
      delete metadata[key];
      localStorage.setItem('chapter_cache_metadata', JSON.stringify(metadata));
    } catch (error) {
      console.error('Error removing cache metadata:', error);
    }
  },

  // Pulisci metadata orfani
  cleanCacheMetadata() {
    try {
      const metadata = this.getCacheMetadata();
      const cleaned = {};
      
      for (const [key, data] of Object.entries(metadata)) {
        if (localStorage.getItem(key)) {
          cleaned[key] = data;
        }
      }
      
      localStorage.setItem('chapter_cache_metadata', JSON.stringify(cleaned));
    } catch (error) {
      console.error('Error cleaning cache metadata:', error);
    }
  },

  // Ottieni statistiche cache
  getCacheStats() {
    const metadata = this.getCacheMetadata();
    const totalSize = this.getCacheSize();
    const totalChapters = Object.keys(metadata).length;
    
    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      totalChapters,
      maxSizeMB: MAX_CACHE_SIZE_MB,
      usagePercent: ((totalSize / (MAX_CACHE_SIZE_MB * 1024 * 1024)) * 100).toFixed(1),
      expiryDays: CACHE_EXPIRY_DAYS
    };
  },

  // Svuota tutta la cache
  clearAll() {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      localStorage.removeItem('chapter_cache_metadata');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  },

  // Pre-cache capitoli successivi
  async precacheNextChapters(manga, currentChapterIndex, count = 2) {
    if (!manga?.chapters) return;
    
    const startIndex = currentChapterIndex + 1;
    const endIndex = Math.min(startIndex + count, manga.chapters.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const chapter = manga.chapters[i];
      
      // Skip se già in cache
      if (this.hasChapter(manga.url, chapter.url)) continue;
      
      try {
        // Qui dovresti chiamare la tua API per ottenere le immagini
        // Esempio: const images = await apiManager.getChapterImages(chapter.url);
        // this.saveChapter(manga.url, chapter.url, images);
        
        console.log(`Pre-caching chapter ${i + 1}/${manga.chapters.length}`);
      } catch (error) {
        console.error('Error pre-caching chapter:', error);
      }
    }
  }
};

export default chapterCache;

