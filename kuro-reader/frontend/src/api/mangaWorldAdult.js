// frontend/src/api/mangaWorldAdult.js
import { config } from '../config';

export class MangaWorldAdultAPI {
  constructor() {
    this.baseUrl = 'https://www.mangaworldadult.net/';
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
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
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

  normalizeChapterLabel(text) {
    if (!text) return '';
    let t = text.replace(/\s+/g, ' ').trim();
    // Rimuovi prefissi
    t = t.replace(/^(vol\.\s*\d+\s*-\s*)?(cap\.|capitolo)\s*/i, '');
    // Prendi il primo numero (es: 108, 108.5, 01, 01.3)
    const m = t.match(/(\d+(?:\.\d+)?)/);
    if (m) return m[1];
    return t;
  }

  async search(searchTerm) {
    try {
      const url = `${this.baseUrl}archive?keyword=${encodeURIComponent(searchTerm)}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      const results = [];
      doc.querySelectorAll('div.entry').forEach((entry, i) => {
        if (i >= 20) return;
        const link = entry.querySelector('a.thumb, a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.manga-title, .name, .title')?.textContent?.trim() || 'Unknown';
        if (link?.href) {
          const href = link.getAttribute('href');
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
          results.push({
            url: fullUrl,
            title,
            cover: img?.src || img?.dataset?.src || '',
            type: 'manga',
            source: 'mangaWorldAdult',
            isAdult: true
          });
        }
      });
      return results;
    } catch (e) {
      console.error('Adult search error:', e);
      return [];
    }
  }

  async getMangaFromUrl(url) {
    try {
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);

      const titleElem = doc.querySelector('h1.name, h1.bigger, .info h1, .manga-title, .title');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';

      const coverImg = doc.querySelector('.thumb img, .manga-image img, .cover img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';

      const info = { alternativeTitles: [], authors: [], artists: [], genres: [], status: '', type: 'Manga', year: '' };
      const metaDiv = doc.querySelector('.meta-data, .info, .manga-info, .details');

      if (metaDiv) {
        metaDiv.querySelectorAll('a[href*="/archive?genre"]').forEach(a => {
          const g = a.textContent?.trim();
          if (g) info.genres.push({ genre: g });
        });
        const statusLink = metaDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) info.status = statusLink.textContent?.trim() || '';
        const yearLink = metaDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) info.year = yearLink.textContent?.trim() || '';
        const typeLink = metaDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) info.type = typeLink.textContent?.trim() || 'Manga';
      }

      // Capitoli (estrai e normalizza numero)
      const chapters = [];
      const containers = [
        '.chapters-wrapper',
        '#chapterList',
        '.list-chapters',
        '.chapters',
        '.manga-chapters',
        '.chapter-list'
      ];
      let foundLinks = [];
      for (const sel of containers) {
        const box = doc.querySelector(sel);
        if (box) {
          foundLinks = [...box.querySelectorAll('a[href*="/read/"]')];
          if (foundLinks.length) break;
        }
      }
      if (!foundLinks.length) {
        foundLinks = [...doc.querySelectorAll('a[href*="/read/"]')];
      }

      foundLinks.forEach((a, i) => {
        const href = a.getAttribute('href');
        const full = href?.startsWith('http') ? href : `${this.baseUrl}${href?.replace(/^\//, '')}`;
        const rawText = a.textContent?.trim() || '';
        const label = this.normalizeChapterLabel(rawText);
        chapters.push({
          url: full,
          chapterNumber: isNaN(parseFloat(label)) ? i + 1 : parseFloat(label),
          title: `Capitolo ${label.slice(0, 2)}`,
          
          dateAdd: '' // non mostrare date sull’adult
        });
      });

      // Ordina ASC per coerenza
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
        plot: doc.querySelector('#noidungm, .comic-description, .description')?.textContent?.trim() || '',
        chapters,
        chaptersNumber: chapters.length,
        source: 'mangaWorldAdult',
        isAdult: true
      };
    } catch (e) {
      console.error('Get adult manga error:', e);
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

      const selectors = [
        '#page img',
        '.page img',
        '#reader img',
        '.chapter-content img',
        '.reading-content img',
        'img[data-src]',
        'img[data-lazy]',
        'img[data-original]',
        'img.page-image'
      ];

      for (const sel of selectors) {
        const imgs = doc.querySelectorAll(sel);
        if (imgs.length) {
          imgs.forEach(img => {
            const src = img.getAttribute('src') || img.dataset?.src || img.dataset?.lazy || img.dataset?.original;
            if (src && /^https?:\/\//.test(src) && !pages.includes(src)) pages.push(src);
          });
          if (pages.length) break;
        }
      }

      if (!pages.length) {
        doc.querySelectorAll('script').forEach(s => {
          const c = s.textContent || '';
          const reg = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
          let m;
          while ((m = reg.exec(c)) !== null) {
            const u = m[1];
            if (u && !pages.includes(u)) pages.push(u);
          }
        });
      }

      return { url: chapterUrl, pages, type: 'images' };
    } catch (e) {
      console.error('Adult chapter error:', e);
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
        '.trending .entry'
      ];
      for (const sel of selectors) {
        const entries = doc.querySelectorAll(sel);
        if (entries.length) {
          entries.forEach((entry, i) => {
            if (i >= 10) return;
            const link = entry.querySelector('a.thumb, a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.manga-title, .name')?.textContent?.trim() || 'Unknown';
            if (link?.href) {
              const href = link.getAttribute('href');
              trending.push({
                url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                type: 'manga',
                source: 'mangaWorldAdult',
                isAdult: true
              });
            }
          });
          break;
        }
      }
      return trending;
    } catch (e) {
      console.error('Adult trending error:', e);
      return [];
    }
  }
}

