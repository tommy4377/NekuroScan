import { config } from '../config';
import { normalizeChapterLabel } from './shared';

export class MangaWorldAPI {
  constructor() {
    this.baseUrl = 'https://www.mangaworld.cx/';
  }

  async makeRequest(url) {
    try {
      // Prova prima con il proxy
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
    } catch (error) {
      console.warn('Proxy failed, trying direct request:', error.message);
      
      // Fallback: richiesta diretta (può fallire per CORS)
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
            'Referer': this.baseUrl
          }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      } catch (directError) {
        console.error('Direct request also failed:', directError.message);
        throw new Error('Impossibile caricare i dati. I server potrebbero essere temporaneamente non disponibili.');
      }
    }
  }

  parseHTML(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  async getMangaFromUrl(url) {
    try {
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);

      // Titolo
      const titleElem = doc.querySelector('h1.name, .info h1, .manga-title, .title, h1');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';

      // Cover
      const coverImg = doc.querySelector('.thumb img, .manga-image img, .cover img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';

      // Info base
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
          const g = link.textContent.trim();
          if (g) info.genres.push({ genre: g });
        });
        
        const authorLinks = infoDiv.querySelectorAll('a[href*="/archive?author"]');
        authorLinks.forEach(link => {
          const a = link.textContent.trim();
          if (a) info.authors.push(a);
        });
        
        const statusLink = infoDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) info.status = statusLink.textContent.trim();
        
        const yearLink = infoDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) info.year = yearLink.textContent.trim();
        
        const typeLink = infoDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) info.type = typeLink.textContent.trim();
      }

      // Trama
      const plot = doc.querySelector('#noidungm, .comic-description, .description')?.textContent?.trim() || '';

      // ================== CAPITOLI (ESTRAZIONE ROBUSTA) ==================
      // DOM reale (esempio):
      // #chapterList .chapters-wrapper .chapter > a.chap
      //    <span>Capitolo 42</span>
      //    <i class="chap-date">30 Settembre 2025</i>
      const chapters = [];
      const seenUrls = new Set();
      const seenNumbers = new Set();

      const selCandidates = [
        '#chapterList .chapters-wrapper .chapter a.chap',
        '.chapters-wrapper .chapter a.chap',
        '#chapterList a.chap',
        '.chapter-list a.chap'
      ];

      let anchors = [];
      for (const sel of selCandidates) {
        const list = [...doc.querySelectorAll(sel)];
        if (list.length) {
          anchors = list;
          break;
        }
      }
      if (anchors.length === 0) {
        // Fallback
        anchors = [...doc.querySelectorAll('a[href*="/read/"]')];
      }

      const toNumber = (s) => {
        const n = parseFloat(String(s).replace(',', '.'));
        return isNaN(n) ? null : n;
      };

      anchors.forEach((a) => {
  const href = a.getAttribute('href');
  if (!href) return;
  const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
  if (seenUrls.has(fullUrl)) return;

  const spanText = a.querySelector('span')?.textContent?.trim() || '';
  const titleAttr = a.getAttribute('title') || '';
  const aText = a.textContent?.trim() || '';

  let rawSource = spanText || titleAttr || aText;
  let match = rawSource.match(/cap(?:itolo)?\s*(\d+(?:\.\d+)?)/i);

  let chapterNumber = null;
  if (match && match[1]) {
    chapterNumber = parseFloat(match[1].replace(',', '.'));
  } else {
    const nums = [...rawSource.matchAll(/\b\d+(?:\.\d+)?\b/g)]
      .map(m => parseFloat(m[0].replace(',', '.')))
      .filter(n => !isNaN(n) && n < 1000);
    if (nums.length) chapterNumber = Math.max(...nums);
  }

  if (chapterNumber === null || isNaN(chapterNumber)) return;
  if (seenNumbers.has(chapterNumber)) return;

  seenUrls.add(fullUrl);
  seenNumbers.add(chapterNumber);

  // ⬇️ niente dateAdd qui
  chapters.push({
    url: fullUrl,
    chapterNumber,
    title: spanText || `Capitolo ${chapterNumber}`
  });
});

      // Ordina per numero crescente
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

  // frontend/src/api/mangaWorld.js
// Aggiungi questo metodo nella classe MangaWorldAPI

async search(query) {
  try {
    if (!query || query.trim() === '') return [];
    
    const searchUrl = `${this.baseUrl}archive?keyword=${encodeURIComponent(query)}`;
    const html = await this.makeRequest(searchUrl);
    const doc = this.parseHTML(html);
    
    const results = [];
    const entries = doc.querySelectorAll('.entry');
    
    entries.forEach((entry, index) => {
      if (index >= 20) return; // Limita a 20 risultati
      
      const link = entry.querySelector('a');
      const img = entry.querySelector('img');
      const title = entry.querySelector('.manga-title, .name, .title');
      
      if (link?.href && title) {
        const href = link.getAttribute('href');
        results.push({
          url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
          title: title.textContent.trim(),
          cover: img?.src || img?.dataset?.src || '',
          source: 'mangaWorld',
          type: 'manga',
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