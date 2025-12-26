/**
 * CHAPTER CACHE - Sistema di cache intelligente per capitoli
 * Con LRU eviction, expiry automatico e gestione dimensione
 */

import type { Manga } from '@/types/manga';

// ========== TYPES ==========

interface CacheData {
  images: string[];
  timestamp: number;
  mangaUrl: string;
  chapterUrl: string;
  size: number;
  lastAccessed?: number;
}

interface CacheMetadata {
  [key: string]: {
    timestamp: number;
    size: number;
    mangaUrl: string;
    chapterUrl: string;
    lastAccessed: number;
  };
}

interface CacheStats {
  totalSize: number;
  totalSizeMB: string;
  totalChapters: number;
  maxSizeMB: number;
  usagePercent: string;
  expiryDays: number;
}

// ========== CONSTANTS ==========

const CACHE_PREFIX = 'chapter_cache_';
const METADATA_KEY = 'chapter_cache_metadata';
const CACHE_EXPIRY_DAYS = 7;
const MAX_CACHE_SIZE_MB = 50;
const TARGET_SIZE_RATIO = 0.7; // 70% del max quando si pulisce

// ========== IMPLEMENTATION ==========

export const chapterCache = {
  saveChapter(mangaUrl: string, chapterUrl: string, images: string[]): boolean {
    try {
      const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
      const cacheData: CacheData = {
        images,
        timestamp: Date.now(),
        mangaUrl,
        chapterUrl,
        size: JSON.stringify(images).length
      };
      
      // Check cache size
      if (this.getCacheSize() + cacheData.size > MAX_CACHE_SIZE_MB * 1024 * 1024) {
        this.cleanOldCache();
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      this.updateCacheMetadata(cacheKey, cacheData);
      
      return true;
    } catch (error) {
      return false;
    }
  },

  getChapter(mangaUrl: string, chapterUrl: string): string[] | null {
    try {
      const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const cacheData: CacheData = JSON.parse(cached);
      
      // Check expiry
      const age = Date.now() - cacheData.timestamp;
      const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      if (age > maxAge) {
        this.removeChapter(mangaUrl, chapterUrl);
        return null;
      }
      
      // Update last accessed
      cacheData.lastAccessed = Date.now();
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      return cacheData.images;
    } catch {
      return null;
    }
  },

  hasChapter(mangaUrl: string, chapterUrl: string): boolean {
    const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
    return localStorage.getItem(cacheKey) !== null;
  },

  removeChapter(mangaUrl: string, chapterUrl: string): void {
    const cacheKey = `${CACHE_PREFIX}${mangaUrl}_${chapterUrl}`;
    localStorage.removeItem(cacheKey);
    this.removeCacheMetadata(cacheKey);
  },

  cleanOldCache(): void {
    try {
      const metadata = this.getCacheMetadata();
      const now = Date.now();
      const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      // Sort by lastAccessed (LRU)
      const sorted = Object.entries(metadata).sort((a, b) => {
        const aAccessed = a[1].lastAccessed || a[1].timestamp;
        const bAccessed = b[1].lastAccessed || b[1].timestamp;
        return aAccessed - bAccessed;
      });
      
      let currentSize = this.getCacheSize();
      const targetSize = MAX_CACHE_SIZE_MB * TARGET_SIZE_RATIO * 1024 * 1024;
      
      for (const [key, data] of sorted) {
        if (currentSize <= targetSize) break;
        
        const age = now - data.timestamp;
        if (age > maxAge || currentSize > targetSize) {
          localStorage.removeItem(key);
          currentSize -= data.size;
        }
      }
      
      this.cleanCacheMetadata();
    } catch (error) {
      // Silently fail
    }
  },

  getCacheSize(): number {
    const metadata = this.getCacheMetadata();
    return Object.values(metadata).reduce((sum, data) => sum + (data.size || 0), 0);
  },

  getCacheMetadata(): CacheMetadata {
    try {
      const meta = localStorage.getItem(METADATA_KEY);
      return meta ? JSON.parse(meta) : {};
    } catch {
      return {};
    }
  },

  updateCacheMetadata(key: string, data: CacheData): void {
    try {
      const metadata = this.getCacheMetadata();
      metadata[key] = {
        timestamp: data.timestamp,
        size: data.size,
        mangaUrl: data.mangaUrl,
        chapterUrl: data.chapterUrl,
        lastAccessed: Date.now()
      };
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch {
      // Silently fail
    }
  },

  removeCacheMetadata(key: string): void {
    try {
      const metadata = this.getCacheMetadata();
      delete metadata[key];
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch {
      // Silently fail
    }
  },

  cleanCacheMetadata(): void {
    try {
      const metadata = this.getCacheMetadata();
      const cleaned: CacheMetadata = {};
      
      for (const [key, data] of Object.entries(metadata)) {
        if (localStorage.getItem(key)) {
          cleaned[key] = data;
        }
      }
      
      localStorage.setItem(METADATA_KEY, JSON.stringify(cleaned));
    } catch {
      // Silently fail
    }
  },

  getCacheStats(): CacheStats {
    const metadata = this.getCacheMetadata();
    const totalSize = this.getCacheSize();
    const totalChapters = Object.keys(metadata).length;
    const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
    
    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      totalChapters,
      maxSizeMB: MAX_CACHE_SIZE_MB,
      usagePercent: ((totalSize / maxSizeBytes) * 100).toFixed(1),
      expiryDays: CACHE_EXPIRY_DAYS
    };
  },

  clearAll(): boolean {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem(METADATA_KEY);
      return true;
    } catch {
      return false;
    }
  },

  // Pre-cache capitoli successivi (placeholder - richiede API call)
  async precacheNextChapters(manga: Manga, currentChapterIndex: number, count: number = 2): Promise<void> {
    if (!manga?.chapters) return;
    
    const startIndex = currentChapterIndex + 1;
    const endIndex = Math.min(startIndex + count, manga.chapters.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const chapter = manga.chapters[i];
      if (!chapter) continue;
      
      if (this.hasChapter(manga.url, chapter.url)) continue;
      
      // TODO: Implementare chiamata API per ottenere immagini
      // const images = await apiManager.getChapterImages(chapter.url);
      // this.saveChapter(manga.url, chapter.url, images);
    }
  }
};

export default chapterCache;

