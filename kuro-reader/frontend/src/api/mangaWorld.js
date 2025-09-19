import { config } from '../config';
import { normalizeChapterLabel } from './shared';

export class MangaWorldAPI {
  constructor() {
    this.baseUrl = 'https://www.mangaworld.cx/';
  }

  async makeRequest(url) {
    const response = await fetch(`${config.PROXY_URL}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          'Referer': this.baseUrl
        }
      })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Request failed');
    return data.data;
  }

  parseHTML(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  async search(searchTerm) {
    try {
      const url = `${this.baseUrl}archive?keyword=${encodeURIComponent(searchTerm)}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      const results = [];
      
      doc.querySelectorAll('div.entry').forEach((entry, i) => {
        if (i >= 20) return;
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const titleElem = entry.querySelector('.manga-title, .name, .title, h3');
        
        if (link?.href) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
            title: titleElem?.textContent?.trim() || 'Unknown',
            cover: img?.src || img?.dataset?.src || '',
            type: 'manga',
            source: 'mangaWorld',
            isAdult: false
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async getMangaFromUrl(url) {
    try {
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);

      const titleElem = doc.querySelector('h1.name, .info h1, .manga-title, .title, h1');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';

      const coverImg = doc.querySelector('.thumb img, .manga-image img, .cover img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';

      const infoDiv = doc.querySelector('div.info, .manga-info, .meta-data');
      const info = { 
        alternativeTitles: [], 
        authors: [], 
        artists: [], 
        genres: [], 
        status: '', 
        type: 'Manga', 
        year: '' 
      };

      if (infoDiv) {
        infoDiv.querySelectorAll('a[href*="/archive?genre"]').forEach(link => {
          info.genres.push({ genre: link.textContent.trim() });
        });
        
        const authorLinks = infoDiv.querySelectorAll('a[href*="/archive?author"]');
        authorLinks.forEach(link => info.authors.push(link.textContent.trim()));
        
        const statusLink = infoDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) info.status = statusLink.textContent.trim();
        
        const yearLink = infoDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) info.year = yearLink.textContent.trim();
        
        const typeLink = infoDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) info.type = typeLink.textContent.trim();
      }

      const plot = doc.querySelector('#noidungm, .comic-description, .description')?.textContent?.trim() || '';

      // Capitoli
      const chapters = [];
      const processedUrls = new Set();
      
      const candidates = [
        '.chapters-wrapper a[href*="/read/"]',
        '.chapter-list a[href*="/read/"]',
        '.chapters a[href*="/read/"]',
        '.volume-chapters a[href*="/read/"]',
        '#chapterList a[href*="/read/"]',
        'a[href*="/read/"]'
      ];
      
      let links = [];
      for (const sel of candidates) {
        const l = [...doc.querySelectorAll(sel)];
        if (l.length) { 
          links = l; 
          console.log(`Found ${l.length} chapters with selector: ${sel}`);
          break; 
        }
      }
      
      links.forEach((a) => {
        const href = a.getAttribute('href');
        const full = href?.startsWith('http') ? href : `${this.baseUrl}${href?.replace(/^\//, '')}`;
        
        if (processedUrls.has(full)) return;
        processedUrls.add(full);
        
        const raw = a.textContent?.trim() || '';
        const chapterNumber = normalizeChapterLabel(raw, href);
        
        if (chapterNumber !== null) {
          chapters.push({
            url: full,
            chapterNumber: chapterNumber,
            title: `Capitolo ${chapterNumber}`,
            dateAdd: ''
          });
        }
      });

      // Se non riesce a estrarre numeri, usa indici
      if (chapters.length > 0 && chapters.every(ch => ch.chapterNumber === null)) {
        chapters.forEach((ch, i) => {
          ch.chapterNumber = i + 1;
          ch.title = `Capitolo ${i + 1}`;
        });
      }

      // ORDINA ASCENDENTE (1, 2, 3...)
      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      return {
        url,
        title,
        coverUrl,
        alternativeTitles: info.alternativeTitles,
        authors: info.authors,
        artists: info.artists,
        genres: info.genres,
        status: info.status,
        type: info.type,
        year: info.year,
        plot,
        chapters,
        chaptersNumber: chapters.length,
        source: 'mangaWorld',
        isAdult: false
      };
    } catch (error) {
      console.error('Get manga error:', error);
      return null;
    }
  }

  async getChapterDetail(chapterUrl) {
    try {
      let url = chapterUrl;
      if (!url.includes('style=list')) {
        url = url.includes('?') ? `${chapterUrl}&style=list` : `${chapterUrl}?style=list`;
      }
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      const pages = [];
      const seenUrls = new Set();

      const selectors = [
        '#page img',
        '.page img',
        '.page-break img',
        '#reader img',
        '.chapter-content img',
        '.reading-content img',
        'img[data-src]',
        'img[data-lazy]',
        'img.page-image'
      ];
      
      for (const sel of selectors) {
        const images = doc.querySelectorAll(sel);
        if (images.length > 0) {
          images.forEach(img => {
            const src = img.getAttribute('src') || 
                       img.dataset?.src || 
                       img.dataset?.lazy || 
                       img.dataset?.original ||
                       img.getAttribute('data-src') ||
                       img.getAttribute('data-lazy');
                       
            if (src && src.startsWith('http') && !seenUrls.has(src)) {
              seenUrls.add(src);
              pages.push(src);
            }
          });
          if (pages.length) break;
        }
      }

      // Fallback: cerca negli script
      if (!pages.length) {
        doc.querySelectorAll('script').forEach(script => {
          const content = script.textContent || '';
          const imageUrlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
          let match;
          while ((match = imageUrlPattern.exec(content)) !== null) {
            const cleanUrl = match[1];
            if (cleanUrl && !seenUrls.has(cleanUrl) && !cleanUrl.includes('thumb')) {
              seenUrls.add(cleanUrl);
              pages.push(cleanUrl);
            }
          }
        });
      }

      return { url: chapterUrl, pages, type: 'images' };
    } catch (error) {
      console.error('Get chapter error:', error);
      return null;
    }
  }

  async getTrending() {
    try {
      const html = await this.makeRequest(this.baseUrl);
      const doc = this.parseHTML(html);
      const trending = [];
      
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
            const img = entry.querySelector('img');
            const titleElem = entry.querySelector('.manga-title, .name');
            
            if (link?.href) {
              const href = link.getAttribute('href');
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
      console.error('Get trending error:', error);
      return [];
    }
  }
}
