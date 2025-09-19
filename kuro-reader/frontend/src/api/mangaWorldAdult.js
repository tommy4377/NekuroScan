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

  extractChapterNumber(text, url) {
    if (!text) return null;
    
    // Rimuovi date
    text = text.replace(/\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}.*$/, '');
    text = text.replace(/\s+\d{4}[\/-]\d{1,2}[\/-]\d{1,2}.*$/, '');
    text = text.trim();
    
    // Pattern per estrarre numero
    const patterns = [
      /capitolo\s+(\d+(?:\.\d+)?)/i,
      /cap\.\s*(\d+(?:\.\d+)?)/i,
      /ch\.\s*(\d+(?:\.\d+)?)/i,
      /chapter\s+(\d+(?:\.\d+)?)/i,
      /episodio\s+(\d+(?:\.\d+)?)/i,
      /ep\.\s*(\d+(?:\.\d+)?)/i,
      /^\s*(\d+(?:\.\d+)?)\s*$/,
      /\s+(\d+(?:\.\d+)?)\s*$/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let num = match[1];
        // Se il numero è tipo 0176, prendi solo 01
        if (num.length >= 4 && num.startsWith('0')) {
          num = num.substring(0, 2);
        }
        // Rimuovi zeri iniziali non necessari
        num = num.replace(/^0+(\d)/, '$1');
        return parseFloat(num);
      }
    }
    
    // Prova dall'URL
    if (url) {
      const urlPatterns = [
        /\/(\d+(?:\.\d+)?)\/?$/,
        /capitolo[_-](\d+(?:\.\d+)?)/i,
        /chapter[_-](\d+(?:\.\d+)?)/i
      ];
      
      for (const pattern of urlPatterns) {
        const match = url.match(pattern);
        if (match) {
          let num = match[1];
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
      
      // Capitoli - CORREZIONE COMPLETA
      const chapters = [];
      const processedUrls = new Set();
      
      // Selettori multipli per trovare i capitoli
      const chapterSelectors = [
        '.chapters-wrapper .chapter a',
        '.chapters-wrapper .chap a',
        '#chapterList .chapter a',
        '.volume-chapters a[href*="/read/"]',
        '.chapters .chapter a',
        '.chapter-list a[href*="/read/"]',
        'a[href*="/read/"]'
      ];
      
      let chapterLinks = [];
      for (const selector of chapterSelectors) {
        const links = doc.querySelectorAll(selector);
        if (links.length > 0) {
          chapterLinks = Array.from(links);
          console.log(`Found ${links.length} chapters with selector: ${selector}`);
          break;
        }
      }
      
      // Se non trova capitoli con i selettori standard, prova un approccio più generico
      if (chapterLinks.length === 0) {
        const allLinks = doc.querySelectorAll('a');
        chapterLinks = Array.from(allLinks).filter(link => {
          const href = link.getAttribute('href');
          return href && href.includes('/read/');
        });
      }
      
      // Processa ogni link trovato
      chapterLinks.forEach((elem) => {
        const href = elem.getAttribute('href');
        if (!href || !href.includes('/read/')) return;
        
        const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
        
        // Evita duplicati
        if (processedUrls.has(fullUrl)) return;
        processedUrls.add(fullUrl);
        
        // Estrai testo e numero capitolo
        let chapterText = elem.textContent?.trim() || '';
        const chapterNumber = this.extractChapterNumber(chapterText, href);
        
        if (chapterNumber !== null) {
          chapters.push({
            url: fullUrl,
            chapterNumber: chapterNumber,
            title: `Capitolo ${chapterNumber}`,
            dateAdd: ''
          });
        }
      });
      
      // Se non riesce a estrarre numeri, usa indici sequenziali
      if (chapters.every(ch => ch.chapterNumber === null)) {
        chapters.forEach((ch, i) => {
          ch.chapterNumber = i + 1;
          ch.title = `Capitolo ${i + 1}`;
        });
      }
      
      // IMPORTANTE: Ordina dal più basso al più alto
      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
      
      console.log(`Total chapters found: ${chapters.length}`);
      
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
      
      // Prima prova con style=list
      if (!url.includes('style=list')) {
        url = url.includes('?') ? `${url}&style=list` : `${url}?style=list`;
      }
      
      console.log('Loading adult chapter from:', url);
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const pages = [];
      const seenUrls = new Set();
      
      // Funzione helper per aggiungere pagina
      const addPage = (src) => {
        if (src && src.includes('http') && !src.includes('placeholder') && !src.includes('thumb') && !seenUrls.has(src)) {
          seenUrls.add(src);
          pages.push(src);
          return true;
        }
        return false;
      };
      
      // Strategia 1: Cerca immagini dirette
      const imageSelectors = [
        '#page img',
        '.page img',
        '.page-break img',
        '#reader-pages img',
        '#reader img',
        '.reading-content img',
        '.chapter-content img',
        'img.page-image',
        'img[data-src]',
        'img[data-lazy]',
        'img[data-original]'
      ];
      
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
              if (addPage(src)) break;
            }
          });
          
          if (pages.length > 0) {
            console.log(`Found ${pages.length} pages using selector: ${selector}`);
            break;
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
            /pages\s*=\s*```math
([\s\S]*?)```/,
            /images\s*=\s*```math
([\s\S]*?)```/,
            /pageArray\s*=\s*```math
([\s\S]*?)```/,
            /imageArray\s*=\s*```math
([\s\S]*?)```/
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
          
          // Pattern per URL singoli
          if (pages.length === 0) {
            const singleUrlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
            let match;
            while ((match = singleUrlPattern.exec(content)) !== null) {
              addPage(match[1]);
            }
          }
        });
      }
      
      // Strategia 3: Prova senza style=list
      if (pages.length === 0) {
        const altUrl = chapterUrl.replace(/[?&]style=list/, '');
        if (altUrl !== url) {
          console.log('Trying without style=list...');
          const altHtml = await this.makeRequest(altUrl);
          const altDoc = this.parseHTML(altHtml);
          
          // Cerca nel contenitore del reader
          const readerContainers = [
            '#reader',
            '.reader',
            '.reading-content',
            '.chapter-reader',
            '#chapter-reader'
          ];
          
          for (const containerSelector of readerContainers) {
            const container = altDoc.querySelector(containerSelector);
            if (container) {
              const imgs = container.querySelectorAll('img');
              imgs.forEach(img => {
                const srcs = [img.src, img.dataset?.src, img.getAttribute('data-src')];
                for (const src of srcs) {
                  if (addPage(src)) break;
                }
              });
              if (pages.length > 0) break;
            }
          }
        }
      }
      
      // Strategia 4: API alternativa o iframe
      if (pages.length === 0) {
        const iframes = doc.querySelectorAll('iframe');
        for (const iframe of iframes) {
          const iframeSrc = iframe.src;
          if (iframeSrc && iframeSrc.includes('read')) {
            console.log('Found iframe reader, trying to load it...');
            try {
              const iframeHtml = await this.makeRequest(iframeSrc);
              const iframeDoc = this.parseHTML(iframeHtml);
              const iframeImgs = iframeDoc.querySelectorAll('img');
              iframeImgs.forEach(img => {
                addPage(img.src);
              });
            } catch (e) {
              console.error('Failed to load iframe content:', e);
            }
          }
        }
      }
      
      console.log(`Total pages found: ${pages.length}`);
      
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
