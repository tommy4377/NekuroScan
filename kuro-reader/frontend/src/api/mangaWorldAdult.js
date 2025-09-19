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
    t = t.replace(/^(vol\.\s*\d+\s*-\s*)?(cap\.|capitolo|ch\.)\s*/i, '');
    const match = t.match(/(\d+(?:\.\d+)?)/);
    if (match) return match[1];
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

      const title = doc.querySelector('h1.name, .info h1, .manga-title')?.textContent?.trim() || 'Unknown Title';
      const coverImg = doc.querySelector('.thumb img, .manga-image img, .cover img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';

      const infoDiv = doc.querySelector('div.info, .manga-info, .meta-data');
      const info = { genres: [], status: '', type: 'Manga', year: '' };
      if (infoDiv) {
        infoDiv.querySelectorAll('a[href*="/archive?genre"]').forEach(link => info.genres.push({ genre: link.textContent.trim() }));
        const statusLink = infoDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) info.status = statusLink.textContent.trim();
        const yearLink = infoDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) info.year = yearLink.textContent.trim();
        const typeLink = infoDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) info.type = typeLink.textContent.trim();
      }

      const plot = doc.querySelector('#noidungm, .comic-description, .description')?.textContent?.trim() || '';

      const chapters = [];
      const chapterLinks = doc.querySelectorAll('.chapters-wrapper a, #chapterList a, .list-chapters a, .chapters a, a[href*="/read/"]');

      chapterLinks.forEach((a, i) => {
        const href = a.getAttribute('href');
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
        const rawText = a.textContent?.trim() || `Capitolo ${i + 1}`;
        const chapterNumberStr = this.normalizeChapterLabel(rawText);
        const chapterNumber = parseFloat(chapterNumberStr);
        chapters.push({
          url: fullUrl,
          chapterNumber: isNaN(chapterNumber) ? i + 1 : chapterNumber,
          title: `Capitolo ${chapterNumberStr}`,
          dateAdd: ''
        });
      });

      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      return {
        url,
        title,
        coverUrl,
        genres: info.genres,
        status: info.status,
        type: info.type,
        year: info.year,
        plot,
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
      let url = chapterUrl.includes('style=list') ? chapterUrl : (chapterUrl.includes('?') ? `${chapterUrl}&style=list` : `${chapterUrl}?style=list`);
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);

      const pages = [];
      const selectors = ['#page img', '.page img', '#reader img', '.chapter-content img', '.reading-content img', 'img[data-src]', 'img[data-lazy]', 'img[data-original]'];
      for (const sel of selectors) {
        const images = doc.querySelectorAll(sel);
        if (images.length) {
          images.forEach(img => {
            const src = img.src || img.dataset?.src || img.dataset?.lazy || img.dataset?.original;
            if (src && src.includes('http') && !pages.includes(src)) pages.push(src);
          });
          if (pages.length) break;
        }
      }

      if (!pages.length) {
        doc.querySelectorAll('script').forEach(s => {
          const c = s.textContent || '';
          let m;
          const reg = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
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
      const selectors = ['.comics-flex .entry.vertical', '#chapters-slide .entry', '.hot-manga .entry', '.trending .entry'];
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
