import { config } from '../config';

export class MangaWorldAdultAPI {
  constructor() {
    this.baseUrl = 'https://www.mangaworldadult.net/';
  }

  // Aggiungi questa funzione nella classe MangaWorldAdultAPI, dopo il costruttore

normalizeChapterNumber(text, url) {
  if (!text) return null;
  
  // Rimuovi spazi extra e trim
  let cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Rimuovi date
  cleanText = cleanText.replace(/\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}.*$/, '');
  cleanText = cleanText.replace(/\s+\d{4}[\/-]\d{1,2}[\/-]\d{1,2}.*$/, '');
  
  // Rimuovi prefissi comuni
  cleanText = cleanText.replace(/^(vol\.\s*\d+\s*-\s*)?/i, '');
  cleanText = cleanText.replace(/^(capitolo|cap\.|ch\.|chapter|episodio|ep\.)\s*/i, '');
  
  // Estrai numero dal testo
  const textPatterns = [
    /^(\d+(?:\.\d+)?)/,
    /\s+(\d+(?:\.\d+)?)\s*$/,
    /(\d+(?:\.\d+)?)/
  ];
  
  for (const pattern of textPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      let num = match[1];
      // Fix per numeri a 4 cifre tipo 0176 -> diventa 01
      if (num.length >= 4 && num.startsWith('0')) {
        num = num.substring(0, 2);
      }
      // Rimuovi zeri iniziali ma mantieni almeno una cifra
      num = num.replace(/^0+(\d)/, '$1');
      return parseFloat(num);
    }
  }
  
  // Prova a estrarre dall'URL se non trova nel testo
  if (url) {
    const urlPatterns = [
      /\/capitolo[_-](\d+(?:\.\d+)?)/i,
      /\/chapter[_-](\d+(?:\.\d+)?)/i,
      /\/cap[_-](\d+(?:\.\d+)?)/i,
      /\/(\d+(?:\.\d+)?)(?:\?|\/|$)/  // Numero alla fine dell'URL
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        let num = match[1];
        // Stesso fix per numeri a 4 cifre
        if (num.length >= 4 && num.startsWith('0')) {
          num = num.substring(0, 2);
        }
        num = num.replace(/^0+(\d)/, '$1');
        return parseFloat(num);
      }
    }
  }
  
  return null;
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
      
      // Titolo
      const titleElem = doc.querySelector('h1.name, h1.bigger, .info h1, h1');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';
      
      // Cover
      const coverImg = doc.querySelector('.thumb img, .manga-image img, .cover img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';
      
      // Info
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
        // Generi
        const genreLinks = metaDiv.querySelectorAll('a[href*="/archive?genre"]');
        genreLinks.forEach(link => {
          const genre = link.textContent.trim();
          if (genre) {
            info.genres.push({ genre });
          }
        });
        
        // Autori
        const authorLinks = metaDiv.querySelectorAll('a[href*="/archive?author"]');
        authorLinks.forEach(link => {
          info.authors.push(link.textContent.trim());
        });
        
        // Status
        const statusLink = metaDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) {
          info.status = statusLink.textContent.trim();
        }
        
        // Anno
        const yearLink = metaDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) {
          info.year = yearLink.textContent.trim();
        }
        
        // Tipo
        const typeLink = metaDiv.querySelector('a[href*="/archive?type"]');
        if (typeLink) {
          info.type = typeLink.textContent.trim();
        }
      }
      
      // Trama
      const plotDiv = doc.querySelector('#noidungm, .comic-description, .description');
      const plotText = plotDiv?.textContent?.trim() || '';
      const plot = plotText.replace(/^TRAMA:?\s*/i, '').trim();
      
      // Sostituisci la sezione dei capitoli nella funzione getMangaFromUrl con questo codice:

// CAPITOLI - FIX COMPLETO
const chapters = [];
const processedUrls = new Set();

// Trova il contenitore dei capitoli
const chapterContainer = doc.querySelector('.chapters-wrapper, #chapterList, .chapters');

if (chapterContainer) {
  // Cerca solo i link diretti dentro .chapter
  const chapterDivs = chapterContainer.querySelectorAll('.chapter');
  
  if (chapterDivs.length > 0) {
    // Metodo 1: Div .chapter con link dentro
    chapterDivs.forEach((chDiv, index) => {
      const link = chDiv.querySelector('a[href*="/read/"]');
      if (link) {
        const href = link.getAttribute('href');
        const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
        
        if (!processedUrls.has(fullUrl)) {
          processedUrls.add(fullUrl);
          
          // Prendi SOLO il testo del link, non tutto il div
          let chapterText = link.textContent?.trim() || '';
          
          // USA LA NUOVA FUNZIONE per estrarre e normalizzare il numero
          let chapterNumber = this.normalizeChapterNumber(chapterText, href);
          
          // Se non trova numero, usa l'indice
          if (chapterNumber === null) {
            chapterNumber = index + 1;
          }
          
          chapters.push({
            url: fullUrl,
            chapterNumber: chapterNumber,
            title: `Capitolo ${chapterNumber}`,
            dateAdd: ''
          });
        }
      }
    });
  } else {
    // Metodo 2: Link diretti nel container
    const directLinks = chapterContainer.querySelectorAll('a[href*="/read/"]');
    directLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
      
      if (!processedUrls.has(fullUrl)) {
        processedUrls.add(fullUrl);
        
        let chapterText = link.textContent?.trim() || '';
        
        // USA LA NUOVA FUNZIONE
        let chapterNumber = this.normalizeChapterNumber(chapterText, href);
        
        if (chapterNumber === null) {
          chapterNumber = index + 1;
        }
        
        chapters.push({
          url: fullUrl,
          chapterNumber: chapterNumber,
          title: `Capitolo ${chapterNumber}`,
          dateAdd: ''
        });
      }
    });
  }
}

// Se non trova capitoli nel container, cerca ovunque (fallback)
if (chapters.length === 0) {
  const allLinks = doc.querySelectorAll('a[href*="/read/"]');
  const filteredLinks = Array.from(allLinks).filter(link => {
    const parent = link.closest('.chapters-wrapper, .chapters, .volume-chapters, #chapterList');
    return parent !== null;
  });
  
  filteredLinks.forEach((link, index) => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
    
    if (!processedUrls.has(fullUrl)) {
      processedUrls.add(fullUrl);
      
      let chapterText = link.textContent?.trim() || '';
      // USA LA NUOVA FUNZIONE
      let chapterNumber = this.normalizeChapterNumber(chapterText, href);
      
      if (chapterNumber === null) {
        chapterNumber = index + 1;
      }
      
      chapters.push({
        url: fullUrl,
        chapterNumber: chapterNumber,
        title: `Capitolo ${chapterNumber}`,
        dateAdd: ''
      });
    }
  });
}

// IMPORTANTE: Ordina dal più basso al più alto
chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
      
      console.log(`Total chapters found: ${chapters.length}`);
      console.log('First 5 chapters:', chapters.slice(0, 5));
      
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

  async getChapterDetail(chapterUrl) {
    try {
      // Normalizza URL
      let url = chapterUrl;
      if (!url.startsWith('http')) {
        url = `${this.baseUrl}${url.replace(/^\//, '')}`;
      }
      
      console.log('Loading adult chapter from:', url);
      
      // Prima prova SENZA style=list (spesso nei siti adult le pagine sono già tutte caricate)
      let html = await this.makeRequest(url);
      let doc = this.parseHTML(html);
      
      const pages = [];
      const seenUrls = new Set();
      
      // Funzione helper per aggiungere pagina
      const addPage = (src) => {
        if (src && src.includes('http') && !src.includes('placeholder') && !src.includes('thumb') && !seenUrls.has(src)) {
          // Pulisci l'URL
          let cleanUrl = src.split('?')[0]; // Rimuovi query params se non necessari
          if (src.includes('?') && (src.includes('token') || src.includes('expires'))) {
            cleanUrl = src; // Mantieni params se sono per autenticazione
          }
          seenUrls.add(cleanUrl);
          pages.push(cleanUrl);
          return true;
        }
        return false;
      };
      
      // Strategia 1: Cerca le immagini delle pagine
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
            // Prova tutti i possibili attributi
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
            console.log(`Found ${pages.length} pages using selector: ${selector}`);
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
        
        // Riprova con i selettori
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
      
      // Strategia 2: Cerca negli script
      if (pages.length === 0) {
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || script.innerHTML || '';
          
          // Pattern per array di immagini
          const arrayPatterns = [
  /pages\s*=\s*```math([\s\S]*?)```/s,
  /images\s*=\s*```math([\s\S]*?)```/s,
  /pageArray\s*=\s*```math([\s\S]*?)```/s,
  /imageArray\s*=\s*```math([\s\S]*?)```/s
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
          
          // Pattern per URL singoli se non in array
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
      
      // Strategia 3: Controlla se c'è un iframe o embed
      if (pages.length === 0) {
        const iframes = doc.querySelectorAll('iframe[src*="read"], iframe[src*="chapter"], embed');
        for (const iframe of iframes) {
          const iframeSrc = iframe.src || iframe.getAttribute('src');
          if (iframeSrc) {
            console.log('Found iframe reader, loading it...');
            try {
              const iframeHtml = await this.makeRequest(iframeSrc);
              const iframeDoc = this.parseHTML(iframeHtml);
              
              // Cerca immagini nell'iframe
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
      
      console.log(`Total pages found: ${pages.length}`);
      
      if (pages.length === 0) {
        console.error('No pages found! HTML snippet:', doc.body?.innerHTML?.substring(0, 1000));
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


