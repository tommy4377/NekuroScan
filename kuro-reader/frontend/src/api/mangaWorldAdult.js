import { config } from '../config';

export class MangaWorldAdultAPI {
  constructor() {
    this.baseUrl = 'https://www.mangaworldadult.net/';
  }

  async makeRequest(url) {
    try {
      const response = await fetch(`${config.PROXY_URL}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Request failed');
      
      return data.data;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
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
      const entries = doc.querySelectorAll('div.entry');
      
      entries.forEach((entry, i) => {
        if (i >= 10) return;
        
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.manga-title, .name, p')?.textContent || 'Unknown';
        
        if (link?.href) {
          results.push({
            url: new URL(link.getAttribute('href'), this.baseUrl).href,
            title: title.trim(),
            cover: img?.src || '',
            type: 'manga'
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
      
      const infoDiv = doc.querySelector('div.info');
      let title = 'Unknown Title';
      if (infoDiv) {
        const titleElem = infoDiv.querySelector('h1, h2');
        if (titleElem) {
          title = titleElem.textContent.trim();
        }
      }
      
      let coverUrl = '';
      const thumbDiv = doc.querySelector('div.thumb');
      if (thumbDiv) {
        const img = thumbDiv.querySelector('img');
        if (img) {
          coverUrl = img.src || '';
        }
      }
      
      const genres = [];
    const genreContainer = doc.querySelector('.meta-data') || doc.querySelector('.info');
    if (genreContainer) {
      // Cerca specificamente i link dei generi
      const genreLinks = genreContainer.querySelectorAll('a[href*="/genre/"], a[href*="/archive?genre"]');
      genreLinks.forEach(link => {
        const genre = link.textContent.trim();
        if (genre && genre.length < 30) { // Filtra generi troppo lunghi
          genres.push({ genre });
        }
      });
    }
    
    // Se ancora non trova generi, cerca con pattern più generale
    if (genres.length === 0) {
      const allLinks = doc.querySelectorAll('.info a');
      allLinks.forEach(link => {
        const text = link.textContent.trim();
        const href = link.getAttribute('href') || '';
        // Solo link che sembrano generi
        if (href.includes('genre') || href.includes('tag')) {
          if (text && text.length < 30) {
            genres.push({ genre: text });
          }
        }
      });
    }
    
    // Limita i generi a massimo 10
    manga['genres'] = genres.slice(0, 10);
    
    // Parsing capitoli migliorato
    const chapters = [];
    const chapterElements = doc.querySelectorAll('.chapter a, .chapters-wrapper a, div.chapter > a');
    
    chapterElements.forEach((elem, i) => {
      const href = elem.getAttribute('href');
      if (!href) return;
      
      const chapterText = elem.textContent.trim();
      let chapterNumber = i + 1; // Default
      
      // Estrai numero capitolo con pattern più precisi
      const patterns = [
        /capitolo\s+(\d+(?:\.\d+)?)/i,
        /chapter\s+(\d+(?:\.\d+)?)/i,
        /cap\.\s*(\d+(?:\.\d+)?)/i,
        /ch\.\s*(\d+(?:\.\d+)?)/i,
        /^(\d+(?:\.\d+)?)[:\s-]/
      ];
      
      for (const pattern of patterns) {
        const match = chapterText.match(pattern);
        if (match) {
          chapterNumber = parseFloat(match[1]);
          break;
        }
      }
      
      chapters.push({
        url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
        chapterNumber,
        title: chapterText,
        dateAdd: ''
      });
    });
    
    // Ordina e deduplica
    const uniqueChapters = [];
    const seen = new Set();
    
    chapters
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .forEach(ch => {
        if (!seen.has(ch.chapterNumber)) {
          seen.add(ch.chapterNumber);
          uniqueChapters.push(ch);
        }
      });
    
    manga['chapters'] = uniqueChapters;
    manga['chaptersNumber'] = uniqueChapters.length;
    
    return manga;
    
  } catch (error) {
    console.error('Get manga error:', error);
    return null;
  }
}

  async getChapterDetail(chapterUrl) {
    try {
      const html = await this.makeRequest(chapterUrl);
      const doc = this.parseHTML(html);
      
      const pageUrls = [];
      const pageDiv = doc.querySelector('#page, .chapter-pages, .reader-pages');
      
      if (pageDiv) {
        pageDiv.querySelectorAll('img').forEach(img => {
          const src = img.src || img.dataset.src || img.dataset.lazy;
          if (src && src.includes('http')) {
            pageUrls.push(src);
          }
        });
      }
      
      return {
        url: chapterUrl,
        pages: pageUrls,
        type: 'images'
      };
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
      const entries = doc.querySelectorAll('#chapters-slide div.entry, .trending-section div.entry');
      
      entries.forEach((entry, i) => {
        if (i >= 10) return;
        
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title')?.textContent || 'Unknown';
        
        if (link?.href) {
          trending.push({
            url: new URL(link.getAttribute('href'), this.baseUrl).href,
            title: title.trim(),
            cover: img?.src || '',
            type: 'manga'
          });
        }
      });
      
      return trending;
    } catch (error) {
      console.error('Get trending error:', error);
      return [];
    }
  }
}

