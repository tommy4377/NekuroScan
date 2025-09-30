import { config } from '../config';
import { normalizeChapterLabel } from './shared';

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
        if (i >= 20) return;
        
        const link = entry.querySelector('a.thumb, a');
        const img = entry.querySelector('img');
        const titleElem = entry.querySelector('.manga-title, .name, h3, h2');
        const title = titleElem?.textContent?.trim() || 'Unknown';
        
        if (link?.href) {
          const href = link.getAttribute('href');
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
          
          results.push({
            url: fullUrl,
            title: title,
            cover: img?.src || img?.dataset?.src || '',
            type: 'manga',
            source: 'mangaWorldAdult',
            isAdult: true
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
      
      const titleElem = doc.querySelector('h1.name, h1.bigger, .info h1, h1');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';
      
      const coverImg = doc.querySelector('.thumb img, .manga-image img, .cover img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';
      
      const info = {
        alternativeTitles: [],
        authors: [],
        artists: [],
        genres: [],
        status: '',
        type: 'Manga',
        year: ''
      };
      
      const metaDiv = doc.querySelector('.meta-data, .info, .comic-info');
      if (metaDiv) {
        const genreLinks = metaDiv.querySelectorAll('a[href*="/archive?genre"]');
        genreLinks.forEach(link => {
          const genre = link.textContent.trim();
          if (genre) {
            info.genres.push({ genre });
          }
        });
        
        const authorLinks = metaDiv.querySelectorAll('a[href*="/archive?author"]');
        authorLinks.forEach(link => {
          info.authors.push(link.textContent.trim());
        });
        
        const statusLink = metaDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) {
          info.status = statusLink.textContent.trim();
        }
        
        const yearLink = metaDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) {
          info.year = yearLink.textContent.trim();
        }
        
        const typeLink = metaDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) {
          info.type = typeLink.textContent.trim();
        }
      }
      
      const plotDiv = doc.querySelector('#noidungm, .comic-description, .description');
      const plotText = plotDiv?.textContent?.trim() || '';
      const plot = plotText.replace(/^TRAMA:?\s*/i, '').trim();
      
      // ✅ ESTRAZIONE CAPITOLI MIGLIORATA (mangaWorld.js)
const chapters = [];
const processedUrls = new Set();
const processedNumbers = new Set(); // ✅ Traccia numeri già usati

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
    console.log(`✅ Found ${l.length} chapters with selector: ${sel}`);
    break; 
  }
}

links.forEach((a) => {
  const href = a.getAttribute('href');
  const full = href?.startsWith('http') ? href : `${this.baseUrl}${href?.replace(/^\//, '')}`;
  
  // ✅ Skip duplicati per URL
  if (processedUrls.has(full)) return;
  processedUrls.add(full);
  
  const raw = a.textContent?.trim() || '';
  const chapterNumber = normalizeChapterLabel(raw, href);
  
  // ✅ Validazione: salta capitoli invalidi O duplicati per numero
  if (chapterNumber === null || chapterNumber === undefined || isNaN(chapterNumber)) {
    console.warn('⚠️ Skipping invalid chapter:', raw, href);
    return;
  }
  
  if (processedNumbers.has(chapterNumber)) {
    console.warn(`⚠️ Skipping duplicate chapter number: ${chapterNumber}`);
    return;
  }
  
  processedNumbers.add(chapterNumber);
  
  chapters.push({
    url: full,
    chapterNumber: chapterNumber,
    title: `Capitolo ${chapterNumber}`,
    dateAdd: ''
  });
});

// ✅ ORDINA solo per numero, NON rinumerare
chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

console.log(`✅ Total chapters extracted: ${chapters.length}`);

// ✅ NO RINUMERAZIONE - mantieni i numeri originali!
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
  chapters: chapters, // ✅ Usa direttamente l'array ordinato
  chaptersNumber: chapters.length,
  source: 'mangaWorldAdult',
  isAdult: true
};
    } catch (error) {
      console.error('Get manga error:', error);
      return null;
    }
  }

  async getChapterDetail(chapterUrl) {
    try {
      let url = chapterUrl;
      if (!url.startsWith('http')) {
        url = `${this.baseUrl}${url.replace(/^\//, '')}`;
      }
      
      console.log('Loading adult chapter from:', url);
      
      let html = await this.makeRequest(url);
      let doc = this.parseHTML(html);
      
      const pages = [];
      const seenUrls = new Set();
      
      const addPage = (src) => {
        if (src && src.includes('http') && !src.includes('placeholder') && !src.includes('thumb') && !seenUrls.has(src)) {
          let cleanUrl = src.split('?')[0];
          if (src.includes('?') && (src.includes('token') || src.includes('expires'))) {
            cleanUrl = src;
          }
          seenUrls.add(cleanUrl);
          pages.push(cleanUrl);
          return true;
        }
        return false;
      };
      
      const imageSelectors = [
        '#page img:not([src*="loading"])',
        '.page img:not([src*="loading"])',
        '.page-break img',
        '#reader-pages img',
        '#reader img',
        '.reading-content img',
        '.chapter-content img',
        'img.page-image',
        '#content img',
        '.content img'
      ];
      
      let foundPages = false;
      
      for (const selector of imageSelectors) {
        const images = doc.querySelectorAll(selector);
        if (images.length > 0) {
          images.forEach(img => {
            const possibleSrcs = [
              img.src,
              img.getAttribute('data-src'),
              img.getAttribute('data-lazy'),
              img.getAttribute('data-original'),
              img.getAttribute('data-lazy-src'),
              img.dataset?.src,
              img.dataset?.lazy,
              img.dataset?.original
            ];
            
            for (const src of possibleSrcs) {
              if (src && src.trim() && addPage(src)) {
                foundPages = true;
                break;
              }
            }
          });
          
          if (foundPages && pages.length > 0) {
            console.log(`✅ Found ${pages.length} pages using selector: ${selector}`);
            break;
          }
        }
      }
      
      // Se non trova pagine, prova con style=list
      if (pages.length === 0) {
        const listUrl = url.includes('?') ? `${url}&style=list` : `${url}?style=list`;
        console.log('Trying with style=list:', listUrl);
        
        html = await this.makeRequest(listUrl);
        doc = this.parseHTML(html);
        
        for (const selector of imageSelectors) {
          const images = doc.querySelectorAll(selector);
          if (images.length > 0) {
            images.forEach(img => {
              const possibleSrcs = [
                img.src,
                img.getAttribute('data-src'),
                img.getAttribute('data-lazy'),
                img.getAttribute('data-original'),
                img.dataset?.src
              ];
              
              for (const src of possibleSrcs) {
                if (src && src.trim()) {
                  addPage(src);
                }
              }
            });
            
            if (pages.length > 0) break;
          }
        }
      }
      
      // Cerca negli script
      if (pages.length === 0) {
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || script.innerHTML || '';
          
          const arrayPatterns = [
  /pages\s*=\s*\[([\s\S]*?)\]/,
  /images\s*=\s*\[([\s\S]*?)\]/,
  /pageArray\s*=\s*\[([\s\S]*?)\]/,
  /imageArray\s*=\s*\[([\s\S]*?)\]/,
  /var\s+pages\s*=\s*\[([\s\S]*?)\]/,
  /const\s+pages\s*=\s*\[([\s\S]*?)\]/,
  /let\s+pages\s*=\s*\[([\s\S]*?)\]/
];
          
          for (const pattern of arrayPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              const urlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
              let urlMatch;
              while ((urlMatch = urlPattern.exec(match[1])) !== null) {
                addPage(urlMatch[1]);
              }
            }
          }
          
          if (pages.length === 0) {
            const singleUrlPattern = /["'](https?:\/\/[^"']+\/[^"']*\.(?:jpg|jpeg|png|gif|webp))["']/gi;
            let match;
            while ((match = singleUrlPattern.exec(content)) !== null) {
              if (!match[1].includes('thumb') && !match[1].includes('cover')) {
                addPage(match[1]);
              }
            }
          }
        });
      }
      
      // Controlla iframe
      if (pages.length === 0) {
        const iframes = doc.querySelectorAll('iframe[src*="read"], iframe[src*="chapter"], embed');
        for (const iframe of iframes) {
          const iframeSrc = iframe.src || iframe.getAttribute('src');
          if (iframeSrc) {
            console.log('Found iframe reader, loading it...');
            try {
              const iframeHtml = await this.makeRequest(iframeSrc);
              const iframeDoc = this.parseHTML(iframeHtml);
              
              const iframeImgs = iframeDoc.querySelectorAll('img');
              iframeImgs.forEach(img => {
                if (img.src && !img.src.includes('loading')) {
                  addPage(img.src);
                }
              });
            } catch (e) {
              console.error('Failed to load iframe:', e);
            }
          }
        }
      }
      
      console.log(`✅ Total pages found: ${pages.length}`);
      
      if (pages.length === 0) {
        console.error('❌ No pages found! HTML snippet:', doc.body?.innerHTML?.substring(0, 1000));
      }
      
      return {
        url: chapterUrl,
        pages,
        type: 'images'
      };
    } catch (error) {
      console.error('Get chapter error:', error);
      return {
        url: chapterUrl,
        pages: [],
        type: 'images'
      };
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
      
      for (const selector of selectors) {
        const entries = doc.querySelectorAll(selector);
        if (entries.length > 0) {
          entries.forEach((entry, i) => {
            if (i >= 10) return;
            
            const link = entry.querySelector('a.thumb, a');
            const img = entry.querySelector('img');
            const titleElem = entry.querySelector('.manga-title, .name');
            const title = titleElem?.textContent?.trim() || 'Unknown';
            
            if (link?.href) {
              const href = link.getAttribute('href');
              const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
              
              trending.push({
                url: fullUrl,
                title: title,
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
    } catch (error) {
      console.error('Get trending error:', error);
      return [];
    }
  }
}