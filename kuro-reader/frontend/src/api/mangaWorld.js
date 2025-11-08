import { config } from '../config';
import { normalizeChapterLabel } from './shared';
import { getBaseUrl } from '../config/sources';

export class MangaWorldAPI {
  constructor() {
    // Offuscato per anti-scraping
    this.baseUrl = getBaseUrl('m') + '/';
  }

  async makeRequest(url, retryCount = 0) {
    const MAX_RETRIES = 2;
    
    try {
      // VALIDAZIONE URL
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        throw new Error('URL non valido');
      }
      
      const response = await fetch(`${config.PROXY_URL}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Referer': this.baseUrl
          }
        }),
        timeout: 15000
      });
      
      // VALIDAZIONE RISPOSTA HTTP
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          throw new Error(`RATE_LIMIT:${retryAfter}`);
        } else if (response.status === 403) {
          // 403 = TU sei bannato dal nostro server
          throw new Error('BANNED:Accesso negato');
        } else if (response.status === 502) {
          // 502 = sito sorgente blocca IL PROXY (non te!)
          throw new Error('Il sito sorgente sta temporaneamente bloccando le richieste. Riprova tra 1-2 minuti.');
        } else if (response.status === 504) {
          throw new Error('Timeout: server sorgente non risponde');
        } else if (response.status === 404) {
          throw new Error('Pagina non trovata');
        } else if (response.status >= 500) {
          throw new Error('Errore del server');
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // VALIDAZIONE DATI RISPOSTA
      if (!data || typeof data !== 'object') {
        throw new Error('Risposta non valida dal proxy');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Richiesta fallita');
      }
      
      if (!data.data) {
        throw new Error('Dati mancanti nella risposta');
      }
      
      return data.data;
      
    } catch (error) {
      console.error(`Errore richiesta (tentativo ${retryCount + 1}):`, error.message);
      
      // RETRY AUTOMATICO
      if (retryCount < MAX_RETRIES && 
          (error.message.includes('server') || error.message.includes('timeout'))) {
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
      // VALIDAZIONE URL
      if (!url || !url.includes('mangaworld')) {
        throw new Error('URL manga non valido');
      }
      
      const html = await this.makeRequest(url);
      
      // VALIDAZIONE HTML
      if (!html || typeof html !== 'string' || html.length < 100) {
        throw new Error('Risposta HTML non valida');
      }
      
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

      // VALIDAZIONE FINALE
      if (!title || title === 'Unknown Title') {
        throw new Error('Titolo manga non trovato');
      }
      
      if (chapters.length === 0) {
        console.warn('Nessun capitolo trovato per:', url);
      }

      const result = {
        url,
        title,
        coverUrl: coverUrl || '',
        alternativeTitles: info.alternativeTitles || [],
        authors: info.authors || [],
        artists: info.artists || [],
        genres: info.genres || [],
        status: info.status || 'Sconosciuto',
        type: info.type || 'Manga',
        year: info.year || '',
        plot: plot || 'Nessuna descrizione disponibile',
        chapters,
        chaptersNumber: chapters.length,
        source: 'mangaWorld',
        isAdult: false
      };
      
      return result;
      
    } catch (error) {
      console.error('Errore getMangaFromUrl:', error);
      throw error; // Propaga l'errore invece di return null
    }
  }


  async getChapterDetail(chapterUrl) {
    try {
      
      let url = chapterUrl;
      if (!url.includes('style=list')) {
        url = url.includes('?') ? `${chapterUrl}&style=list` : `${chapterUrl}?style=list`;
      }
      
      let html;
      try {
        html = await this.makeRequest(url);
      } catch (proxyError) {
        console.error('❌ Proxy request failed:', proxyError);
        // Prova a caricare direttamente senza proxy (potrebbe fallire per CORS)
        try {
          const directResponse = await fetch(url);
          html = await directResponse.text();
        } catch (directError) {
          console.error('❌ Direct request also failed:', directError);
          throw new Error('Impossibile caricare il capitolo. Il server proxy potrebbe essere offline.');
        }
      }
      
      if (!html || typeof html !== 'string') {
        throw new Error('HTML response is empty or invalid');
      }
      
      const doc = this.parseHTML(html);
      const pages = [];
      const seenUrls = new Set();

      // Prima prova: cerca immagini nel DOM
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
            const src = img.getAttribute('src') || 
                       img.dataset?.src || 
                       img.dataset?.lazy || 
                       img.dataset?.original ||
                       img.getAttribute('data-src') ||
                       img.getAttribute('data-lazy') ||
                       img.getAttribute('data-original');
                       
            if (src && src.startsWith('http') && !seenUrls.has(src)) {
              // Filtra miniature e icone
              if (!src.includes('thumb') && !src.includes('icon') && !src.includes('logo')) {
                seenUrls.add(src);
                pages.push(src);
              }
            }
          });
          if (pages.length > 0) {
            break;
          }
        }
      }

      // Seconda prova: cerca negli script JavaScript
      if (!pages.length) {
        doc.querySelectorAll('script').forEach(script => {
          const content = script.textContent || '';
          
          // Pattern per array di immagini
          const arrayPattern = /(?:pages|images|imgs)\s*[:=]\s*\[([\s\S]*?)\]/gi;
          let arrayMatch;
          while ((arrayMatch = arrayPattern.exec(content)) !== null) {
            const urlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
            let urlMatch;
            while ((urlMatch = urlPattern.exec(arrayMatch[1])) !== null) {
              const cleanUrl = urlMatch[1];
              if (cleanUrl && !seenUrls.has(cleanUrl) && !cleanUrl.includes('thumb')) {
                seenUrls.add(cleanUrl);
                pages.push(cleanUrl);
              }
            }
          }
          
          // Fallback: cerca tutte le URL di immagini
          if (!pages.length) {
            const imageUrlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
            let match;
            while ((match = imageUrlPattern.exec(content)) !== null) {
              const cleanUrl = match[1];
              if (cleanUrl && !seenUrls.has(cleanUrl) && !cleanUrl.includes('thumb') && !cleanUrl.includes('icon')) {
                seenUrls.add(cleanUrl);
                pages.push(cleanUrl);
              }
            }
          }
        });
      }

      // ✅ VALIDAZIONE FINALE
      if (!pages || pages.length === 0) {
        console.error('❌ No pages found for chapter:', chapterUrl);
        console.error('HTML preview:', html.substring(0, 500));
        throw new Error('Nessuna pagina trovata per questo capitolo. Il sito potrebbe aver cambiato struttura.');
      }
      
      // Proxy le immagini per evitare CORS
      const proxiedPages = pages.map(pageUrl => {
        // Se l'immagine è da mangaworld, prova a usare il proxy
        if (pageUrl.includes('mangaworld') || pageUrl.includes('cdn')) {
          return pageUrl; // Per ora restituisci l'URL originale
        }
        return pageUrl;
      });
      
      return { 
        url: chapterUrl, 
        pages: proxiedPages, 
        type: 'images', 
        title: '',
        originalPages: pages // Mantieni anche gli URL originali
      };
    } catch (error) {
      console.error('❌ Get chapter error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        chapterUrl
      });
      throw error;
    }
  }

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