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
          results.push({
            url: new URL(link.getAttribute('href'), this.baseUrl).href,
            title: title.trim(),
            cover: img?.src || '',
            type: 'manga'
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
      const infoDiv = doc.querySelector('div.info');
      let title = 'Unknown Title';
      if (infoDiv) {
        const titleElem = infoDiv.querySelector('h1, h2');
        if (titleElem) {
          title = titleElem.textContent.trim();
        }
      }
      
      // Extract cover
      let coverUrl = '';
      const thumbDiv = doc.querySelector('div.thumb');
      if (thumbDiv) {
        const img = thumbDiv.querySelector('img');
        if (img) {
          coverUrl = img.src || '';
        }
      }
      
      // Extract genres
      const genres = [];
      const genreContainer = Array.from(doc.querySelectorAll('div')).find(div => 
        div.textContent.includes('Generi:') || div.textContent.includes('Genres:')
      );
      
      if (genreContainer) {
        genreContainer.querySelectorAll('a').forEach(link => {
          const genre = link.textContent.trim();
          if (genre) genres.push({ genre });
        });
      }
      
      // Extract plot
      let plot = '';
      const plotDiv = doc.querySelector('div.comic-description');
      if (plotDiv) {
        const plotContent = plotDiv.querySelector('div.mb-3');
        if (plotContent) {
          plot = plotContent.textContent.trim();
        }
      }
      
      // Extract chapters
      const chapters = [];
      const chapterDivs = doc.querySelectorAll('div.chapter');
      
      Array.from(chapterDivs).reverse().forEach((div, i) => {
        const link = div.querySelector('a');
        if (link) {
          const chapterUrl = new URL(link.getAttribute('href'), this.baseUrl).href;
          const chapterText = link.textContent.trim();
          
          chapters.push({
            url: chapterUrl,
            chapterNumber: i + 1,
            title: chapterText
          });
        }
      });
      
      return {
        url,
        title,
        coverUrl,
        genres,
        plot,
        chapters,
        type: 'manga',
        source: 'mangaWorldAdult'
      };
    } catch (error) {
      console.error('Get manga error:', error);
      return null;
    }
  }

  async getChapterDetail(chapterUrl) {
    try {
      const html = await this.makeRequest(chapterUrl);
      const doc = this.parseHTML(html);
      
      const pageUrls = [];
      const pageDiv = doc.querySelector('#page, .chapter-pages, .reader-pages');
      
      if (pageDiv) {
        pageDiv.querySelectorAll('img').forEach(img => {
          const src = img.src || img.dataset.src || img.dataset.lazy;
          if (src && src.includes('http')) {
            pageUrls.push(src);
          }
        });
      }
      
      return {
        url: chapterUrl,
        pages: pageUrls,
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
      const entries = doc.querySelectorAll('#chapters-slide div.entry, .trending-section div.entry');
      
      entries.forEach((entry, i) => {
        if (i >= 10) return;
        
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title')?.textContent || 'Unknown';
        
        if (link?.href) {
          trending.push({
            url: new URL(link.getAttribute('href'), this.baseUrl).href,
            title: title.trim(),
            cover: img?.src || '',
            type: 'manga'
          });
        }
      });
      
      return trending;
    } catch (error) {
      console.error('Get trending error:', error);
      return [];
    }
  }

}

