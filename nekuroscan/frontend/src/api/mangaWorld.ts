/**
 * MANGA WORLD API - Normal manga source
 * Extends BaseAPI for common functionality
 * 
 * UPDATED: 2025-11-10 - TypeScript conversion verified
 * Status: Production ready, stable scraping
 */

import { BaseAPI } from './baseAPI';
import { getBaseUrl } from '@/config/sources';
import type { MangaDetails, ChapterListItem } from '@/types/manga';

// ========== TYPES ==========

interface ChapterDetail {
  url: string;
  pages: string[];
  type: 'images';
  title: string;
  originalPages: string[];
}

interface SearchResult {
  url: string;
  title: string;
  cover: string;
  source: 'mangaWorld';
  type: 'manga';
  isAdult: false;
}

// ========== API CLASS ==========

export class MangaWorldAPI extends BaseAPI {
  constructor() {
    super(getBaseUrl('m') + '/');
  }

  async getMangaFromUrl(url: string): Promise<MangaDetails> {
    try {
      // Validate URL
      if (!url || !url.includes('mangaworld')) {
        throw new Error('Invalid manga URL');
      }
      
      const html = await this.makeRequest<string>(url);
      
      // Validate HTML
      if (!html || typeof html !== 'string' || html.length < 100) {
        throw new Error('Invalid HTML response');
      }
      
      const doc = this.parseHTML(html);

      // Extract title
      const titleElem = doc.querySelector('h1.name, .info h1, .manga-title, .title, h1');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';

      // Extract cover
      const coverImg = doc.querySelector('.thumb img, .manga-image img, .cover img') as HTMLImageElement | null;
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';

      // Extract info
      const infoDiv = doc.querySelector('div.info, .manga-info, .meta-data');
      const info = { 
        alternativeTitles: [] as string[], 
        authors: [] as string[], 
        artists: [] as string[], 
        genres: [] as string[], 
        status: '', 
        type: 'Manga', 
        year: '' 
      };

      if (infoDiv) {
        infoDiv.querySelectorAll('a[href*="/archive?genre"]').forEach(link => {
          const g = link.textContent?.trim();
          if (g) info.genres.push(g);
        });
        
        infoDiv.querySelectorAll('a[href*="/archive?author"]').forEach(link => {
          const a = link.textContent?.trim();
          if (a) info.authors.push(a);
        });
        
        const statusLink = infoDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) info.status = statusLink.textContent?.trim() || '';
        
        const yearLink = infoDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) info.year = yearLink.textContent?.trim() || '';
        
        const typeLink = infoDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) info.type = typeLink.textContent?.trim() || 'Manga';
      }

      // Extract plot
      const plotElem = doc.querySelector('#noidungm, .comic-description, .description');
      const plot = plotElem?.textContent?.trim() || '';

      // Extract chapters
      const chapters: ChapterListItem[] = [];
      const seenUrls = new Set<string>();
      const seenNumbers = new Set<number>();

      const selCandidates = [
        '#chapterList .chapters-wrapper .chapter a.chap',
        '.chapters-wrapper .chapter a.chap',
        '#chapterList a.chap',
        '.chapter-list a.chap'
      ];

      let anchors: Element[] = [];
      for (const sel of selCandidates) {
        const list = Array.from(doc.querySelectorAll(sel));
        if (list.length) {
          anchors = list;
          break;
        }
      }
      
      if (anchors.length === 0) {
        anchors = Array.from(doc.querySelectorAll('a[href*="/read/"]'));
      }

      anchors.forEach((a) => {
        const href = a.getAttribute('href');
        if (!href) return;
        
        const fullUrl = href.startsWith('http') 
          ? href 
          : `${this.baseUrl}${href.replace(/^\//, '')}`;
          
        if (seenUrls.has(fullUrl)) return;

        const spanText = a.querySelector('span')?.textContent?.trim() || '';
        const titleAttr = a.getAttribute('title') || '';
        const aText = a.textContent?.trim() || '';

        const rawSource = spanText || titleAttr || aText;
        const match = rawSource.match(/cap(?:itolo)?\s*(\d+(?:\.\d+)?)/i);

        let chapterNumber: number | null = null;
        if (match?.[1]) {
          chapterNumber = parseFloat(match[1].replace(',', '.'));
        } else {
          const nums = Array.from(rawSource.matchAll(/\b\d+(?:\.\d+)?\b/g))
            .map(m => parseFloat(m[0].replace(',', '.')))
            .filter(n => !isNaN(n) && n < 1000);
          if (nums.length) chapterNumber = Math.max(...nums);
        }

        if (chapterNumber === null || isNaN(chapterNumber)) return;
        if (seenNumbers.has(chapterNumber)) return;

        seenUrls.add(fullUrl);
        seenNumbers.add(chapterNumber);

        chapters.push({
          id: `ch-${chapterNumber}`,
          url: fullUrl,
          chapterNumber,
          title: spanText || `Capitolo ${chapterNumber}`
        });
      });

      // Sort by chapter number
      chapters.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));

      // Final validation
      if (!title || title === 'Unknown Title') {
        throw new Error('Manga title not found');
      }

      return {
        url,
        title,
        coverUrl: coverUrl || '',
        alternativeTitles: info.alternativeTitles,
        authors: info.authors,  // ✅ FIX: Ritorna array, non string
        artists: info.artists,  // ✅ FIX: Ritorna array, non string
        author: info.authors.join(', ') || undefined,  // ✅ AGGIUNTO: Per compatibilità
        artist: info.artists.join(', ') || undefined,  // ✅ AGGIUNTO: Per compatibilità
        genres: info.genres,
        status: this.normalizeStatus(info.status),
        type: 'manga',
        year: parseInt(info.year) || undefined,
        plot: plot || 'No description available',  // ✅ FIX: 'plot' non 'synopsis'
        synopsis: plot || 'No description available',  // ✅ AGGIUNTO: Per compatibilità
        description: plot || 'No description available',  // ✅ AGGIUNTO: Per compatibilità
        chapters: chapters.map(ch => ({
          ...ch,
          pages: []
        })),
        chaptersNumber: chapters.length,
        totalChapters: chapters.length,
        source: 'mangaWorld',
        isAdult: false
      };
      
    } catch (error) {
      throw error;
    }
  }

  async getChapterDetail(chapterUrl: string): Promise<ChapterDetail> {
    try {
      let url = chapterUrl;
      if (!url.includes('style=list')) {
        url = url.includes('?') ? `${chapterUrl}&style=list` : `${chapterUrl}?style=list`;
      }
      
      let html: string;
      try {
        html = await this.makeRequest<string>(url);
      } catch (proxyError) {
        // Try direct fetch (may fail due to CORS)
        try {
          const directResponse = await fetch(url);
          html = await directResponse.text();
        } catch {
          throw new Error('Unable to load chapter. Proxy server may be offline.');
        }
      }
      
      if (!html || typeof html !== 'string') {
        throw new Error('HTML response is empty or invalid');
      }
      
      const doc = this.parseHTML(html);
      const pages: string[] = [];
      const seenUrls = new Set<string>();

      // Try to find images in DOM
      const selectors = [
        '#page img',
        '.page img',
        '.page-break img',
        '#reader img',
        '.chapter-content img',
        '.reading-content img',
        'img[data-src]',
        'img[data-lazy]',
        'img.page-image',
        '.img-loading'
      ];
      
      for (const sel of selectors) {
        const images = doc.querySelectorAll(sel);
        if (images.length > 0) {
          images.forEach(img => {
            const htmlImg = img as HTMLImageElement;
            const src = htmlImg.getAttribute('src') || 
                       htmlImg.dataset?.src || 
                       htmlImg.dataset?.lazy || 
                       htmlImg.dataset?.original ||
                       htmlImg.getAttribute('data-src') ||
                       htmlImg.getAttribute('data-lazy') ||
                       htmlImg.getAttribute('data-original');
                       
            if (src && src.startsWith('http') && !seenUrls.has(src)) {
              // Filter thumbnails and icons
              if (!src.includes('thumb') && !src.includes('icon') && !src.includes('logo')) {
                seenUrls.add(src);
                pages.push(src);
              }
            }
          });
          
          if (pages.length > 0) break;
        }
      }

      // Try to find in JavaScript
      if (pages.length === 0) {
        doc.querySelectorAll('script').forEach(script => {
          const content = script.textContent || '';
          
          // Pattern for image arrays
          const arrayPattern = /(?:pages|images|imgs)\s*[:=]\s*\[([\s\S]*?)\]/gi;
          let arrayMatch: RegExpExecArray | null;
          while ((arrayMatch = arrayPattern.exec(content)) !== null) {
            if (!arrayMatch[1]) continue;
            
            const urlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
            let urlMatch: RegExpExecArray | null;
            while ((urlMatch = urlPattern.exec(arrayMatch[1])) !== null) {
              const cleanUrl = urlMatch[1];
              if (cleanUrl && !seenUrls.has(cleanUrl) && !cleanUrl.includes('thumb')) {
                seenUrls.add(cleanUrl);
                pages.push(cleanUrl);
              }
            }
          }
          
          // Fallback: find all image URLs
          if (pages.length === 0) {
            const imageUrlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
            let match: RegExpExecArray | null;
            while ((match = imageUrlPattern.exec(content)) !== null) {
              const cleanUrl = match[1];
              if (cleanUrl && !seenUrls.has(cleanUrl) && 
                  !cleanUrl.includes('thumb') && !cleanUrl.includes('icon')) {
                seenUrls.add(cleanUrl);
                pages.push(cleanUrl);
              }
            }
          }
        });
      }

      // Final validation
      if (pages.length === 0) {
        throw new Error('No pages found for this chapter. Site structure may have changed.');
      }
      
      return { 
        url: chapterUrl, 
        pages, 
        type: 'images', 
        title: '',
        originalPages: pages
      };
    } catch (error) {
      throw error;
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      if (!query || query.trim() === '') return [];
      
      const searchUrl = `${this.baseUrl}archive?keyword=${encodeURIComponent(query)}`;
      const html = await this.makeRequest<string>(searchUrl);
      const doc = this.parseHTML(html);
      
      const results: SearchResult[] = [];
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach((entry, index) => {
        if (index >= 20) return;
        
        const link = entry.querySelector('a');
        const img = entry.querySelector('img') as HTMLImageElement | null;
        const titleElem = entry.querySelector('.manga-title, .name, .title');
        
        if (link?.href && titleElem) {
          const href = link.getAttribute('href');
          if (href) {
            results.push({
              url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
              title: titleElem.textContent?.trim() || '',
              cover: img?.src || img?.dataset?.src || '',
              source: 'mangaWorld',
              type: 'manga',
              isAdult: false
            });
          }
        }
      });
      
      return results;
    } catch (error) {
      return [];
    }
  }

  async getTrending(): Promise<SearchResult[]> {
    try {
      const html = await this.makeRequest<string>(this.baseUrl);
      const doc = this.parseHTML(html);
      const trending: SearchResult[] = [];
      
      const selectors = [
        '.comics-flex .entry.vertical',
        '#chapters-slide .entry',
        '.hot-manga .entry',
        '.trending .entry',
        '.popular .entry'
      ];
      
      for (const sel of selectors) {
        const entries = doc.querySelectorAll(sel);
        if (entries.length) {
          entries.forEach((entry, i) => {
            if (i >= 10) return;
            
            const link = entry.querySelector('a.thumb, a');
            const img = entry.querySelector('img') as HTMLImageElement | null;
            const titleElem = entry.querySelector('.manga-title, .name');
            
            if (link?.getAttribute('href')) {
              const href = link.getAttribute('href')!;
              trending.push({
                url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
                title: titleElem?.textContent?.trim() || 'Unknown',
                cover: img?.src || img?.dataset?.src || '',
                type: 'manga',
                source: 'mangaWorld',
                isAdult: false
              });
            }
          });
          break;
        }
      }
      
      return trending;
    } catch (error) {
      return [];
    }
  }

  private normalizeStatus(status?: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | undefined {
    if (!status) return undefined;
    const s = status.toLowerCase();
    if (s.includes('corso') || s.includes('ongoing')) return 'ongoing';
    if (s.includes('complet') || s.includes('finito')) return 'completed';
    if (s.includes('pausa') || s.includes('hiatus')) return 'hiatus';
    if (s.includes('cancel') || s.includes('drop')) return 'cancelled';
    return undefined;
  }
}

export default MangaWorldAPI;

