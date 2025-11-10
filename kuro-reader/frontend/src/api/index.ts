/**
 * API MANAGER - Central API coordinator
 * Manages all manga sources, caching, and search
 * 
 * UPDATED: 2025-11-10 - Enhanced debug logging
 * Added: Detailed logging for trending, latest, and content loading
 */

import { MangaWorldAPI } from './mangaWorld';
import { MangaWorldAdultAPI } from './mangaWorldAdult';
import type { Manga, MangaDetails, MangaSource } from '@/types/manga';
import type { SearchMangaResponse } from '@/types/api';

// ========== TYPES ==========

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface SearchOptions {
  includeAdult?: boolean;
  limit?: number;
}

interface APIs {
  mangaWorld: MangaWorldAPI;
  mangaWorldAdult: MangaWorldAdultAPI;
}

// ========== CONSTANTS ==========

const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const LONG_CACHE_TIMEOUT = 30 * 60 * 1000; // 30 minutes for static content

// ========== API MANAGER CLASS ==========

class APIManager {
  private readonly apis: APIs;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly cacheTimeout: number = CACHE_TIMEOUT;
  private readonly longCacheTimeout: number = LONG_CACHE_TIMEOUT;

  constructor() {
    this.apis = {
      mangaWorld: new MangaWorldAPI(),
      mangaWorldAdult: new MangaWorldAdultAPI()
    };
  }

  // ========== CACHE METHODS ==========

  private getCached<T>(key: string, useLongCache: boolean = false): T | null {
    // Try SessionStorage first (faster, survives reloads)
    try {
      const sessionCached = sessionStorage.getItem(`api_${key}`);
      if (sessionCached) {
        const parsed = JSON.parse(sessionCached);
        const timeout = useLongCache ? this.longCacheTimeout : this.cacheTimeout;
        if (Date.now() - parsed.timestamp < timeout) {
          return parsed.data;
        }
        sessionStorage.removeItem(`api_${key}`);
      }
    } catch {
      // SessionStorage unavailable
    }
    
    // Fallback to in-memory cache
    const cached = this.cache.get(key);
    const timeout = useLongCache ? this.longCacheTimeout : this.cacheTimeout;
    if (cached && Date.now() - cached.timestamp < timeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    // Save in SessionStorage for better performance
    try {
      sessionStorage.setItem(`api_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch {
      // SessionStorage full or unavailable
    }
    
    // Also save in memory
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // ========== SEARCH ==========

  async searchAll(query: string, options: SearchOptions = {}): Promise<SearchMangaResponse> {
    const { includeAdult = false, limit = 20 } = options;
    
    // Check cache
    const cacheKey = `search_${query}_${includeAdult}`;
    const cached = this.getCached<SearchMangaResponse>(cacheKey);
    if (cached) return cached;
    
    const results: SearchMangaResponse = {
      manga: [],
      mangaAdult: [],
      all: []
    };

    try {
      // Search normal source
      const mangaWorldResults = await this.apis.mangaWorld.search(query);
      
      mangaWorldResults.forEach(item => {
        const enrichedItem = {
          ...item,
          source: 'mangaWorld' as MangaSource,
          type: 'manga' as const,
          isAdult: false
        };
        results.manga.push(enrichedItem);
        results.all.push(enrichedItem);
      });

      // Search adult source if requested
      if (includeAdult) {
        const adultResults = await this.apis.mangaWorldAdult.search(query);
        
        adultResults.forEach(item => {
          const enrichedItem = {
            ...item,
            source: 'mangaWorldAdult' as MangaSource,
            type: 'manga' as const,
            isAdult: true
          };
          results.mangaAdult.push(enrichedItem);
          results.all.push(enrichedItem);
        });
      }

      // Remove duplicates
      results.all = this.removeDuplicates(results.all);
      
      // Limit results
      results.all = results.all.slice(0, limit);
      results.manga = results.manga.slice(0, limit);
      results.mangaAdult = results.mangaAdult.slice(0, limit);
      
      // Cache results
      this.setCache(cacheKey, results);
      
      return results;
      
    } catch (error) {
      return results;
    }
  }

  async searchManga(query: string, limit: number = 20): Promise<SearchMangaResponse> {
    return this.searchAll(query, { includeAdult: false, limit });
  }

  async searchAdult(query: string = '', limit: number = 20): Promise<Manga[]> {
    try {
      if (!query) {
        // Get all adult manga
        const adultAPI = this.apis.mangaWorldAdult;
        const url = adultAPI.baseUrl + 'archive';
        const html = await adultAPI['makeRequest'](url) as string;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        const results: Manga[] = [];
        const entries = doc.querySelectorAll('div.entry');
        
        entries.forEach((entry, i) => {
          if (i >= limit) return;
          
          const link = entry.querySelector('a');
          const img = entry.querySelector('img') as HTMLImageElement | null;
          const titleElem = entry.querySelector('.manga-title, .name, p');
          
          if (link?.href) {
            const href = link.getAttribute('href')!;
            results.push({
              url: new URL(href, adultAPI.baseUrl).href,
              title: titleElem?.textContent?.trim() || 'Unknown',
              coverUrl: img?.src || '',
              source: 'mangaWorldAdult',
              isAdult: true,
              type: 'manga'
            });
          }
        });
        
        return results;
      }
      
      // Otherwise search normally
      const results = await this.searchAll(query, { includeAdult: true, limit });
      return results.mangaAdult;
      
    } catch (error) {
      return [];
    }
  }

  // ========== MANGA DETAILS ==========

  async getMangaDetails(url: string, source: MangaSource): Promise<MangaDetails | null> {
    const cacheKey = `manga_${url}`;
    const cached = this.getCached<MangaDetails>(cacheKey);
    if (cached) return cached;

    try {
      const api = this.apis[source];
      if (!api) {
        throw new Error(`Unknown source: ${source}`);
      }
      
      const details = await api.getMangaFromUrl(url);
      
      if (details) {
        // Metadata already set by API
        this.setCache(cacheKey, details);
      }
      
      return details;
      
    } catch (error) {
      // Try alternative source if first fails
      const alternativeSource: MangaSource = source === 'mangaWorld' ? 'mangaWorldAdult' : 'mangaWorld';
      try {
        const details = await this.apis[alternativeSource].getMangaFromUrl(url);
        if (details) {
          // Metadata already set by API
          this.setCache(cacheKey, details);
        }
        return details;
      } catch {
        return null;
      }
    }
  }

  // ========== CHAPTER DETAILS ==========

  async getChapterPages(chapterUrl: string, source: MangaSource): Promise<string[]> {
    const cacheKey = `chapter_${chapterUrl}`;
    const cached = this.getCached<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const api = this.apis[source];
      if (!api) throw new Error(`Unknown source: ${source}`);
      
      const chapterData = await api.getChapterDetail(chapterUrl);
      const pages = chapterData?.pages || [];
      
      if (pages.length > 0) {
        this.setCache(cacheKey, pages);
      }
      
      return pages;
    } catch (error) {
      return [];
    }
  }

  // ========== TRENDING ==========

  async getTrending(includeAdult: boolean = false): Promise<Manga[]> {
    console.log('[API] 📥 getTrending called, includeAdult:', includeAdult);
    const cacheKey = `trending_${includeAdult}`;
    const cached = this.getCached<Manga[]>(cacheKey, true);
    if (cached) {
      console.log('[API] ✅ Returning cached trending:', cached.length, 'items');
      return cached;
    }

    try {
      const results: Manga[] = [];
      
      // Get from normal source
      console.log('[API] 📡 Fetching trending from mangaWorld...');
      const normal = await this.apis.mangaWorld.getTrending();
      console.log('[API] ✅ MangaWorld trending:', normal.length, 'items');
      results.push(...normal);
      
      // Get from adult source if requested
      if (includeAdult) {
        console.log('[API] 📡 Fetching trending from mangaWorldAdult...');
        const adult = await this.apis.mangaWorldAdult.getTrending();
        console.log('[API] ✅ MangaWorldAdult trending:', adult.length, 'items');
        results.push(...adult);
      }
      
      const unique = this.removeDuplicates(results);
      console.log('[API] ✅ Trending total after dedup:', unique.length, 'items');
      this.setCache(cacheKey, unique);
      return unique;
    } catch (error) {
      console.error('[API] ❌ getTrending error:', error);
      return [];
    }
  }

  // ========== UTILITIES ==========

  private removeDuplicates(manga: Manga[]): Manga[] {
    const seen = new Map<string, Manga>();
    
    manga.forEach(m => {
      const normalizedTitle = m.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(normalizedTitle)) {
        seen.set(normalizedTitle, m);
      }
    });
    
    return Array.from(seen.values());
  }

  clearCache(): void {
    this.cache.clear();
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('api_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {
      // Silent fail
    }
  }

  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size
    };
  }
}

// ========== SINGLETON EXPORT ==========

const apiManager = new APIManager();

export default apiManager;
export { APIManager };

