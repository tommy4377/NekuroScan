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
                
                // Rimuovi completamente le date
                chapterText = chapterText.replace(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g, '');
                chapterText = chapterText.replace(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/g, '');
                chapterText = chapterText.trim();
                
                // Estrai il numero del capitolo
                let chapterNumber = null;
                
                // Pattern specifici per estrarre SOLO il numero del capitolo
                const patterns = [
                  /^capitolo\s+(\d+(?:\.\d+)?)/i,
                  /^cap\.\s*(\d+(?:\.\d+)?)/i,
                  /^chapter\s+(\d+(?:\.\d+)?)/i,
                  /^ch\.\s*(\d+(?:\.\d+)?)/i,
                  /^episodio\s+(\d+(?:\.\d+)?)/i,
                  /^ep\.\s*(\d+(?:\.\d+)?)/i,
                  /^(\d+(?:\.\d+)?)(?:\s|$)/  // Solo numero all'inizio
                ];
                
                for (const pattern of patterns) {
                  const match = chapterText.match(pattern);
                  if (match) {
                    chapterNumber = parseFloat(match[1]);
                    break;
                  }
                }
                
                // Se non trova numero dal testo, prova dall'URL
                if (chapterNumber === null) {
                  const urlPatterns = [
                    /\/capitolo[_-](\d+(?:\.\d+)?)/i,
                    /\/chapter[_-](\d+(?:\.\d+)?)/i,
                    /\/cap[_-](\d+(?:\.\d+)?)/i,
                    /\/(\d+(?:\.\d+)?)(?:\?|\/|$)/  // Numero alla fine dell'URL
                  ];
                  
                  for (const pattern of urlPatterns) {
                    const match = href.match(pattern);
                    if (match) {
                      chapterNumber = parseFloat(match[1]);
                      break;
                    }
                  }
                }
                
                // Se ancora non trova, usa l'indice
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
              
              // Rimuovi date
              chapterText = chapterText.replace(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g, '');
              chapterText = chapterText.replace(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/g, '');
              chapterText = chapterText.trim();
              
              let chapterNumber = null;
              
              // Estrai numero
              const patterns = [
                /capitolo\s+(\d+(?:\.\d+)?)/i,
                /cap\.\s*(\d+(?:\.\d+)?)/i,
                /chapter\s+(\d+(?:\.\d+)?)/i,
                /^(\d+(?:\.\d+)?)/
              ];
              
              for (const pattern of patterns) {
                const match = chapterText.match(pattern);
                if (match) {
                  chapterNumber = parseFloat(match[1]);
                  break;
                }
              }
              
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
            
            chapters.push({
              url: fullUrl,
              chapterNumber: index + 1,
              title: `Capitolo ${index + 1}`,
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
            /pages\s*=\s*```math
([\s\S]*?)```/,
            /images\s*=\s*```math
([\s\S]*?)```/,
            /pageArray\s*=\s*```math
([\s\S]*?)```/,
            /imageArray\s*=\s*```math
([\s\S]*?)```/,
            /var\s+\w+\s*=\s*```math
([\s\S]*?)```;/
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
