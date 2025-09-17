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
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
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
          const href = link.getAttribute('href');
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
          
          results.push({
            url: fullUrl,
            title: title.trim(),
            cover: img?.src || img?.dataset?.src || '',
            type: 'manga',
            source: 'mangaWorldAdult'
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
      
      // Titolo - selettori aggiornati per Adult
      const titleElem = doc.querySelector('h1.name, h1.bigger, .info h1');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';
      
      // Cover image - selettori aggiornati
      const coverImg = doc.querySelector('.thumb img, .manga-image img, .book-cover img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';
      
      // Informazioni manga
      const info = {
        alternativeTitles: [],
        authors: [],
        artists: [],
        genres: [],
        status: '',
        type: 'Manga',
        year: ''
      };
      
      // Parse meta-data
      const metaDiv = doc.querySelector('.meta-data, .info');
      if (metaDiv) {
        // Generi
        const genreLinks = metaDiv.querySelectorAll('a[href*="/archive?genre"], a.badge');
        genreLinks.forEach(link => {
          const genre = link.textContent.trim();
          if (genre && !genre.includes('http')) {
            info.genres.push({ genre });
          }
        });
        
        // Autori
        const authorSection = Array.from(metaDiv.querySelectorAll('.col-12, .col-md-6'))
          .find(el => el.textContent.includes('Autori:'));
        if (authorSection) {
          const authorLinks = authorSection.querySelectorAll('a');
          authorLinks.forEach(link => {
            info.authors.push(link.textContent.trim());
          });
        }
        
        // Artisti
        const artistSection = Array.from(metaDiv.querySelectorAll('.col-12, .col-md-6'))
          .find(el => el.textContent.includes('Artisti:'));
        if (artistSection) {
          const artistLinks = artistSection.querySelectorAll('a');
          artistLinks.forEach(link => {
            info.artists.push(link.textContent.trim());
          });
        }
        
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
      const plotDiv = doc.querySelector('#noidungm, .comic-description');
      const plotText = plotDiv?.textContent?.trim() || '';
      const plot = plotText.replace(/^TRAMA\s*/i, '').trim();
      
      // Capitoli - parsing migliorato
      const chapters = [];
      const chapterContainer = doc.querySelector('.chapters-wrapper, #chapterList');
      
      if (chapterContainer) {
        const chapterElements = chapterContainer.querySelectorAll('.chapter > a, .chap');
        
        chapterElements.forEach((elem, i) => {
          const href = elem.getAttribute('href');
          if (!href) return;
          
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
          
          // Estrai testo del capitolo
          const chapterSpan = elem.querySelector('span');
          const chapterText = chapterSpan?.textContent?.trim() || elem.textContent?.trim() || `Capitolo ${i + 1}`;
          
          // Estrai data
          const dateElem = elem.querySelector('.chap-date, i');
          const dateText = dateElem?.textContent?.trim() || '';
          
          chapters.push({
            url: fullUrl,
            chapterNumber: i + 1,
            title: chapterText,
            dateAdd: dateText
          });
        });
      }
      
      // Se non trova capitoli nel container, cerca in tutta la pagina
      if (chapters.length === 0) {
        const allChapterLinks = doc.querySelectorAll('a[href*="/read/"]');
        allChapterLinks.forEach((elem, i) => {
          const href = elem.getAttribute('href');
          if (href) {
            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
            const chapterText = elem.textContent?.trim() || `Capitolo ${i + 1}`;
            
            chapters.push({
              url: fullUrl,
              chapterNumber: i + 1,
              title: chapterText,
              dateAdd: ''
            });
          }
        });
      }
      
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
        source: 'mangaWorldAdult'
      };
    } catch (error) {
      console.error('Get manga error:', error);
      return null;
    }
  }

  async getChapterDetail(chapterUrl) {
    try {
      // Aggiungi style=list per avere tutte le pagine
      let url = chapterUrl;
      if (!url.includes('style=list')) {
        url = url.includes('?') ? `${chapterUrl}&style=list` : `${chapterUrl}?style=list`;
      }
      
      console.log('Loading adult chapter from:', url);
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const pages = [];
      
      // Selettori per le pagine del reader
      const selectors = [
        '#page img',
        '.page img',
        '#reader img',
        '.chapter-content img',
        '.reading-content img',
        'img[data-src]',
        'img[data-lazy]'
      ];
      
      for (const selector of selectors) {
        const images = doc.querySelectorAll(selector);
        if (images.length > 0) {
          images.forEach(img => {
            const src = img.src || 
                       img.dataset.src || 
                       img.dataset.lazy || 
                       img.dataset.original ||
                       img.getAttribute('data-src') ||
                       img.getAttribute('data-lazy-src');
            
            if (src && src.includes('http')) {
              if (!pages.includes(src)) {
                pages.push(src);
                console.log('Found page:', src);
              }
            }
          });
          
          if (pages.length > 0) break;
        }
      }
      
      // Se non trova immagini, cerca negli script
      if (pages.length === 0) {
        console.log('No images found, searching scripts...');
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || script.innerHTML;
          if (content) {
            // Pattern per trovare array di immagini - FIXED REGEX
            const imageUrlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi;
            const matches = content.match(imageUrlPattern);
            
            if (matches) {
              matches.forEach(match => {
                const cleanUrl = match.replace(/["']/g, '').trim();
                if (cleanUrl.startsWith('http') && !pages.includes(cleanUrl)) {
                  pages.push(cleanUrl);
                }
              });
            }
            
            // Cerca anche pattern di array
            const arrayPatterns = [
              /pages\s*=\s*```math
([\s\S]*?)```/,
              /images\s*=\s*```math
([\s\S]*?)```/,
              /pageArray\s*=\s*```math
([\s\S]*?)```/
            ];
            
            for (const pattern of arrayPatterns) {
              const arrayMatch = content.match(pattern);
              if (arrayMatch && arrayMatch[1]) {
                const urlMatches = arrayMatch[1].match(/["']([^"']+)["']/g);
                if (urlMatches) {
                  urlMatches.forEach(url => {
                    const cleanUrl = url.replace(/["']/g, '').trim();
                    if (cleanUrl.startsWith('http') && !pages.includes(cleanUrl)) {
                      pages.push(cleanUrl);
                    }
                  });
                }
              }
            }
          }
        });
      }
      
      console.log(`Total pages found: ${pages.length}`);
      
      return {
        url: chapterUrl,
        pages,
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
      
      // Selettori per manga popolari/trending
      const selectors = [
        '.top-wrapper .entry',
        '.hot-manga .entry',
        '.trending .entry',
        '.popular .entry'
      ];
      
      for (const selector of selectors) {
        const entries = doc.querySelectorAll(selector);
        if (entries.length > 0) {
          entries.forEach((entry, i) => {
            if (i >= 10) return;
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title, .manga-title')?.textContent || 'Unknown';
            
            if (link?.href) {
              const href = link.getAttribute('href');
              const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`;
              
              trending.push({
                url: fullUrl,
                title: title.trim(),
                cover: img?.src || img?.dataset?.src || '',
                type: 'manga',
                source: 'mangaWorldAdult'
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
