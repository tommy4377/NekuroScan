export class NovelCoolAPI {
  constructor() {
    this.baseUrl = 'https://www.novelcool.com/';
    this.loggedIn = false;
  }

  async makeRequest(url) {
    try {
      const response = await fetch('https://kuro-proxy-server.onrender.com/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
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
      const searchUrls = [
        `${this.baseUrl}search?q=${encodeURIComponent(searchTerm)}`,
        `${this.baseUrl}search/${encodeURIComponent(searchTerm)}.html`,
        `${this.baseUrl}archive?keyword=${encodeURIComponent(searchTerm)}`
      ];
      
      const results = [];
      
      for (const searchUrl of searchUrls) {
        try {
          const html = await this.makeRequest(searchUrl);
          const doc = this.parseHTML(html);
          
          const selectors = [
            'a[href*="/novel/"]',
            'a[href*="/book/"]',
            '.book-item a',
            '.novel-item a',
            '.list-item a',
            '.entry a'
          ];
          
          for (const selector of selectors) {
            const links = doc.querySelectorAll(selector);
            links.forEach(link => {
              const href = link.getAttribute('href');
              if (href && (href.includes('novel') || href.includes('book'))) {
                const fullUrl = new URL(href, this.baseUrl).href;
                
                // Extract basic info
                const parent = link.closest('.book-item, .novel-item, .list-item, .entry') || link;
                const img = parent.querySelector('img');
                const title = parent.querySelector('h3, h4, .title, .name')?.textContent || 
                             link.textContent || 'Unknown Title';
                
                if (!results.find(r => r.url === fullUrl)) {
                  results.push({
                    url: fullUrl,
                    title: title.trim(),
                    cover: img?.src || '',
                    type: 'novel'
                  });
                }
              }
            });
            
            if (results.length > 0) break;
          }
          
          if (results.length > 0) break;
        } catch (err) {
          console.error(`Search URL failed ${searchUrl}:`, err);
        }
      }
      
      return results.slice(0, 10);
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
      const titleSelectors = [
        'h1.bookname',
        'h1.title',
        '.book-info h1',
        '.novel-info h1',
        'h1'
      ];
      
      let title = 'Unknown Title';
      for (const selector of titleSelectors) {
        const elem = doc.querySelector(selector);
        if (elem?.textContent) {
          title = elem.textContent.trim();
          break;
        }
      }
      
      // Extract cover
      const coverSelectors = [
        '.book-img img',
        '.bookimg img',
        '.cover img',
        '.novel-cover img'
      ];
      
      let coverUrl = '';
      for (const selector of coverSelectors) {
        const img = doc.querySelector(selector);
        if (img) {
          coverUrl = img.src || img.dataset.src || '';
          if (coverUrl) break;
        }
      }
      
      // Extract plot
      const plotSelectors = [
        '.book-intro',
        '.novel-summary',
        '.description',
        '.synopsis'
      ];
      
      let plot = '';
      for (const selector of plotSelectors) {
        const elem = doc.querySelector(selector);
        if (elem) {
          plot = elem.textContent.trim();
          if (plot.length > 50) break;
        }
      }
      
      // Extract chapters
      const chapters = [];
      const chapterSelectors = [
        'ul.chapter-list li a',
        '.chapter-list a',
        '.chapters a',
        'a[href*="chapter"]'
      ];
      
      for (const selector of chapterSelectors) {
        const links = doc.querySelectorAll(selector);
        if (links.length > 0) {
          links.forEach((link, i) => {
            const href = link.getAttribute('href');
            if (href) {
              const chapterUrl = new URL(href, this.baseUrl).href;
              const chapterText = link.textContent.trim();
              
              chapters.push({
                url: chapterUrl,
                chapterNumber: i + 1,
                title: chapterText
              });
            }
          });
          break;
        }
      }
      
      return {
        url,
        title,
        coverUrl,
        plot,
        chapters,
        type: 'novel',
        source: 'novelCool'
      };
    } catch (error) {
      console.error('Get novel from URL error:', error);
      return null;
    }
  }

  async getChapterDetail(chapterUrl) {
    try {
      const html = await this.makeRequest(chapterUrl);
      const doc = this.parseHTML(html);
      
      const contentSelectors = [
        '.chapter-content',
        '.content',
        '.chapter-body',
        '.reader-content',
        '#content'
      ];
      
      let content = '';
      for (const selector of contentSelectors) {
        const elem = doc.querySelector(selector);
        if (elem) {
          // Remove unwanted elements
          elem.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
          
          content = elem.textContent.trim();
          if (content.length > 100) break;
        }
      }
      
      return {
        url: chapterUrl,
        content,
        type: 'text'
      };
    } catch (error) {
      console.error('Get chapter content error:', error);
      return null;
    }
  }

  async getTrending() {
    try {
      const html = await this.makeRequest(this.baseUrl);
      const doc = this.parseHTML(html);
      
      const trending = [];
      const selectors = [
        '.hot-book a',
        '.popular a',
        '.trending a',
        '.featured a'
      ];
      
      for (const selector of selectors) {
        const links = doc.querySelectorAll(selector);
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && (href.includes('novel') || href.includes('book'))) {
            const fullUrl = new URL(href, this.baseUrl).href;
            const parent = link.closest('.book-item, .entry') || link;
            const img = parent.querySelector('img');
            const title = parent.querySelector('.title, .name')?.textContent || 
                         link.textContent || 'Unknown';
            
            if (!trending.find(t => t.url === fullUrl)) {
              trending.push({
                url: fullUrl,
                title: title.trim(),
                cover: img?.src || '',
                type: 'novel'
              });
            }
          }
        });
        
        if (trending.length >= 10) break;
      }
      
      return trending.slice(0, 10);
    } catch (error) {
      console.error('Get trending error:', error);
      return [];
    }
  }

}
