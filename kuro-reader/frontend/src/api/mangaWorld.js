export class MangaWorldAPI {
  constructor() {
    this.baseUrl = 'https://www.mangaworld.so/';
  }

  async makeRequest(url) {
    try {
      const response = await fetch('/api/proxy', {
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
      if (!data.success) throw new Error(data.error);
      
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
        if (i >= 15) return;
        
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const titleElem = entry.querySelector('p.name, .manga-title');
        
        if (link?.href) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
            title: titleElem?.textContent?.trim() || 'Unknown',
            cover: img?.src || img?.dataset?.src || '',
            type: 'manga',
            source: 'mangaWorld'
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
      
      // Extract title
      const titleElem = doc.querySelector('h1.name, .info h1');
      const title = titleElem?.textContent?.trim() || 'Unknown Title';
      
      // Extract cover
      const coverImg = doc.querySelector('.thumb img, .manga-image img');
      const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';
      
      // Extract info
      const infoDiv = doc.querySelector('div.info, .manga-info');
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
        // Extract genres
        const genreLinks = infoDiv.querySelectorAll('a[href*="/archive?genre"]');
        genreLinks.forEach(link => {
          info.genres.push({
            genre: link.textContent.trim()
          });
        });
        
        // Extract authors
        const authorLinks = infoDiv.querySelectorAll('a[href*="/archive?author"]');
        authorLinks.forEach(link => {
          info.authors.push(link.textContent.trim());
        });
        
        // Extract status
        const statusLink = infoDiv.querySelector('a[href*="/archive?status"]');
        if (statusLink) {
          info.status = statusLink.textContent.trim();
        }
        
        // Extract year
        const yearLink = infoDiv.querySelector('a[href*="/archive?year"]');
        if (yearLink) {
          info.year = yearLink.textContent.trim();
        }
      }
      
      // Extract plot
      const plotDiv = doc.querySelector('#noidungm, .comic-description');
      const plot = plotDiv?.textContent?.trim() || '';
      
      // Extract chapters
      const chapters = [];
      const chapterElements = doc.querySelectorAll('.chapter a, .chapters-wrapper a');
      
      const chapterArray = Array.from(chapterElements);
      chapterArray.reverse(); // Reverse for chronological order
      
      chapterArray.forEach((elem, i) => {
        const chapterUrl = elem.getAttribute('href');
        const chapterTitle = elem.querySelector('span')?.textContent?.trim() || 
                           elem.textContent?.trim() || `Capitolo ${i + 1}`;
        
        if (chapterUrl) {
          chapters.push({
            url: chapterUrl.startsWith('http') ? chapterUrl : `${this.baseUrl}${chapterUrl.replace(/^\//, '')}`,
            chapterNumber: i + 1,
            title: chapterTitle,
            dateAdd: elem.querySelector('.time')?.textContent?.trim() || ''
          });
        }
      });
      
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
        source: 'mangaWorld'
      };
    } catch (error) {
      console.error('Get manga error:', error);
      return null;
    }
  }

  async getChapterDetail(chapterUrl) {
    try {
      // Add style=list to get all pages at once
      const url = chapterUrl.includes('?') ? 
        `${chapterUrl}&style=list` : 
        `${chapterUrl}?style=list`;
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const pages = [];
      
      // Find all page images
      const pageContainer = doc.querySelector('#page, .page, .reader-pages');
      if (pageContainer) {
        const images = pageContainer.querySelectorAll('img');
        images.forEach(img => {
          const src = img.src || img.dataset.src || img.dataset.lazy || img.dataset.original;
          if (src && src.includes('http')) {
            pages.push(src);
          }
        });
      }
      
      // Alternative: look for images in scripts
      if (pages.length === 0) {
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent;
          if (content && content.includes('pages')) {
            const matches = content.match(/["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi);
            if (matches) {
              matches.forEach(match => {
                const cleanUrl = match.replace(/["']/g, '');
                if (!pages.includes(cleanUrl)) {
                  pages.push(cleanUrl);
                }
              });
            }
          }
        });
      }
      
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
      
      // Look for trending/hot manga section
      const selectors = [
        '.hot-manga .entry',
        '.trending .entry',
        '#hot-mangas .entry',
        '.comics-grid .entry'
      ];
      
      for (const selector of selectors) {
        const entries = doc.querySelectorAll(selector);
        if (entries.length > 0) {
          entries.forEach((entry, i) => {
            if (i >= 10) return;
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const titleElem = entry.querySelector('.name, .title');
            
            if (link?.href) {
              const href = link.getAttribute('href');
              trending.push({
                url: href.startsWith('http') ? href : `${this.baseUrl}${href.replace(/^\//, '')}`,
                title: titleElem?.textContent?.trim() || 'Unknown',
                cover: img?.src || img?.dataset?.src || '',
                type: 'manga',
                source: 'mangaWorld'
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