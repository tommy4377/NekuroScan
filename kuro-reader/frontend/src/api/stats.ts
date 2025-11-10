/**
 * STATS API - Trending, popular, and category queries
 * Provides aggregated manga data and statistics
 */

import { BaseAPI } from './baseAPI';
import { getBaseUrl } from '@/config/sources';
import type { Manga } from '@/types/manga';

// ========== TYPES ==========

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ========== CONSTANTS ==========

const GENRES = [
  'adulti', 'arti-marziali', 'avventura', 'azione', 'commedia', 'doujinshi', 'drammatico', 'ecchi',
  'fantasy', 'gender-bender', 'harem', 'hentai', 'horror', 'josei', 'lolicon', 'maturo', 'mecha', 'mistero',
  'psicologico', 'romantico', 'sci-fi', 'scolastico', 'seinen', 'shotacon', 'shoujo', 'shoujo-ai', 'shounen',
  'shounen-ai', 'slice-of-life', 'smut', 'soprannaturale', 'sport', 'storico', 'tragico', 'yaoi', 'yuri'
] as const;

const BASE = (adult: boolean): string => getBaseUrl(adult ? 'ma' : 'm');

// ========== CLASS ==========

export class StatsAPI extends BaseAPI {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    super(''); // No base URL needed for stats
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private hasMoreFromPagination(doc: Document, currentResults: any[], page: number): boolean {
    if (currentResults.length >= 15) return true;
    
    const nextBtn = doc.querySelector(
      'ul.pagination li.page-item.next:not(.disabled), ul.pagination li.next:not(.disabled), a.next'
    );
    if (nextBtn) return true;
    
    if (page <= 3 && currentResults.length > 0) return true;
    
    return false;
  }

  private parseLatestGrid(doc: Document, base: string): Manga[] {
    const list: Manga[] = [];
    const entries = doc.querySelectorAll('.comics-grid .entry, .entry');
    
    entries.forEach((entry, index) => {
      if (index >= 20) return;
      
      const link = entry.querySelector('a.thumb, a');
      const img = entry.querySelector('img') as HTMLImageElement | null;
      const titleElem = entry.querySelector('.manga-title, .name');
      
      const firstChapter = entry.querySelector('.content .xanh');
      const latestChapter = firstChapter?.textContent
        ?.replace(/^cap\.\s*/i, '')
        ?.trim();
      
      const href = link?.getAttribute('href');
      if (href && titleElem?.textContent) {
        list.push({
          url: href.startsWith('http') ? href : `${base}/${href.replace(/^\//, '')}`,
          title: titleElem.textContent.trim(),
          coverUrl: img?.src || img?.dataset?.src || '',
          lastChapter: latestChapter || undefined,
          source: 'mangaWorld',
          type: 'manga',
          isAdult: false
        });
      }
    });
    
    return list;
  }

  async getLatest(page: number = 1, includeAdult: boolean = false): Promise<{ results: Manga[], hasMore: boolean }> {
    try {
      const cacheKey = `latest_${page}_${includeAdult}`;
      const cached = this.getCached<{ results: Manga[], hasMore: boolean }>(cacheKey);
      if (cached) return cached;
      
      const base = BASE(includeAdult);
      const url = `${base}/latest?page=${page}`;
      const html = await this.makeRequest<string>(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseLatestGrid(doc, base);
      const hasMore = this.hasMoreFromPagination(doc, results, page);
      
      const response = { results, hasMore };
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      return { results: [], hasMore: false };
    }
  }

  async getPopular(page: number = 1, includeAdult: boolean = false): Promise<{ results: Manga[], hasMore: boolean }> {
    try {
      const cacheKey = `popular_${page}_${includeAdult}`;
      const cached = this.getCached<{ results: Manga[], hasMore: boolean }>(cacheKey);
      if (cached) return cached;
      
      const base = BASE(includeAdult);
      const url = `${base}/archive?sort=most_read&page=${page}`;
      const html = await this.makeRequest<string>(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseLatestGrid(doc, base);
      const hasMore = this.hasMoreFromPagination(doc, results, page);
      
      const response = { results, hasMore };
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      return { results: [], hasMore: false };
    }
  }

  async getTrending(includeAdult: boolean = false): Promise<Manga[]> {
    try {
      const cacheKey = `trending_${includeAdult}`;
      const cached = this.getCached<Manga[]>(cacheKey);
      if (cached) return cached;
      
      const base = BASE(includeAdult);
      const url = `${base}`;
      const html = await this.makeRequest<string>(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseLatestGrid(doc, base).slice(0, 12);
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      return [];
    }
  }

  async getByGenre(genre: string, page: number = 1, includeAdult: boolean = false): Promise<{ results: Manga[], hasMore: boolean }> {
    try {
      const cacheKey = `genre_${genre}_${page}_${includeAdult}`;
      const cached = this.getCached<{ results: Manga[], hasMore: boolean }>(cacheKey);
      if (cached) return cached;
      
      const base = BASE(includeAdult);
      const url = `${base}/archive?genre=${encodeURIComponent(genre)}&page=${page}`;
      const html = await this.makeRequest<string>(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseLatestGrid(doc, base);
      const hasMore = this.hasMoreFromPagination(doc, results, page);
      
      const response = { results, hasMore };
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      return { results: [], hasMore: false };
    }
  }

  async getAllCategories(): Promise<{ genres: { id: string, name: string }[], types: { id: string, name: string }[] }> {
    const genres = GENRES.map((g) => ({ id: g, name: g }));
    const types = [
      { id: 'manga', name: 'Manga' },
      { id: 'manhwa', name: 'Manhwa' },
      { id: 'manhua', name: 'Manhua' },
      { id: 'novel', name: 'Light Novel' }
    ];
    return { genres, types };
  }

  async getLatestUpdates(includeAdult: boolean = false, page: number = 1): Promise<{ results: Manga[], hasMore: boolean }> {
    return this.getLatest(page, includeAdult);
  }

  async getMostFavorites(includeAdult: boolean = false, page: number = 1): Promise<{ results: Manga[], hasMore: boolean }> {
    return this.getPopular(page, includeAdult);
  }

  async getTopByType(_type: string, includeAdult: boolean = false, page: number = 1): Promise<{ results: Manga[], hasMore: boolean }> {
    return this.getPopular(page, includeAdult);
  }

  async searchAdvanced(options: {
    genres?: string[],
    type?: string,
    status?: string,
    year?: string,
    sort?: string,
    page?: number,
    includeAdult?: boolean,
    minChapters?: number
  }): Promise<{ results: Manga[], hasMore: boolean }> {
    const { page = 1, includeAdult = false } = options;
    // For now, use existing methods - can be enhanced later
    if (options.genres && options.genres.length > 0) {
      const genre = options.genres[0];
      if (genre) {
        return this.getByGenre(genre, page, includeAdult);
      }
    }
    return this.getPopular(page, includeAdult);
  }

  getGenres(): readonly string[] {
    return GENRES;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Create and export singleton instance
const statsAPI = new StatsAPI();
export default statsAPI;

