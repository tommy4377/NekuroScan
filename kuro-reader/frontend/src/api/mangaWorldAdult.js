import { config } from '../config';
import { normalizeChapterLabel } from './shared';

export class MangaWorldAdultAPI {
  constructor() {
    this.baseUrl = 'https://www.mangaworldadult.net/';
  }

  async makeRequest(url, retryCount = 0) {
    const MAX_RETRIES = 2;
    
    try {
      if (!url || !url.startsWith('http')) {
        throw new Error('URL non valido');
      }
      
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
        }),
        timeout: 15000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Richiesta fallita');
      }
      
      if (!data.data) {
        throw new Error('Dati mancanti');
      }
      
      return data.data;
      
    } catch (error) {
      console.error(`Errore richiesta adult (tentativo ${retryCount + 1}):`, error.message);
      
      if (retryCount < MAX_RETRIES && error.message.includes('server')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.makeRequest(url, retryCount + 1);
      }
      
      throw error;
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
          if (genre) info.genres.push({ genre });
        });
        
        const authorLinks = metaDiv.querySelectorAll('a[href*="/archive?author"]');
        authorLinks.forEach(link => {
          const author = link.textContent.trim();
          if (author) info.authors.push(author);
        });
        
        const statusLink = metaDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) info.status = statusLink.textContent.trim();
        
        const yearLink = metaDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) info.year = yearLink.textContent.trim();
        
        const typeLink = metaDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) info.type = typeLink.textContent.trim();
      }
      
      const plotDiv = doc.querySelector('#noidungm, .comic-description, .description');
      const plotText = plotDiv?.textContent?.trim() || '';
      const plot = plotText.replace(/^TRAMA:?\s*/i, '').trim();

      // ================== CAPITOLI (ESTRAZIONE ROBUSTA) ==================
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

      // Ordina crescente
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
        source: 'mangaWorldAdult',
        isAdult: true
      };
    } catch (error) {
      console.error('Get manga error:', error);
      return null;
    }
  }

  // frontend/src/api/mangaWorldAdult.js
// Aggiungi questo metodo nella classe MangaWorldAdultAPI

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
          source: 'mangaWorldAdult',
          type: 'manga',
          isAdult: true
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Search adult error:', error);
    return [];
  }
}


  async getChapterDetail(chapterUrl) {
    try {
      console.log('🔍 Loading adult chapter:', chapterUrl);
      
      let url = chapterUrl;
      if (!url.startsWith('http')) {
        url = `${this.baseUrl}${url.replace(/^\//, '')}`;
      }
      
      let html;
      try {
        html = await this.makeRequest(url);
      } catch (proxyError) {
        console.error('❌ Proxy request failed:', proxyError);
        // Prova a caricare direttamente senza proxy
        try {
          const directResponse = await fetch(url);
          html = await directResponse.text();
          console.log('✅ Direct request succeeded (bypassing proxy)');
        } catch (directError) {
          console.error('❌ Direct request also failed:', directError);
          throw new Error('Impossibile caricare il capitolo. Il server proxy potrebbe essere offline.');
        }
      }
      
      if (!html || typeof html !== 'string') {
        throw new Error('HTML response is empty or invalid');
      }
      
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
      
      // ✅ VALIDAZIONE: Non restituire un capitolo senza pagine
      if (pages.length === 0) {
        console.error('❌ No pages found! HTML snippet:', doc.body?.innerHTML?.substring(0, 1000));
        throw new Error('Nessuna pagina trovata per questo capitolo');
      }
      
      return {
        url: chapterUrl,
        pages,
        type: 'images',
        title: ''
      };
    } catch (error) {
      console.error('❌ Get chapter error:', error);
      throw error; // ✅ Propaga l'errore invece di restituire oggetto vuoto
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