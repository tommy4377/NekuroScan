import { MangaWorldAPI } from './mangaWorld';
import { MangaWorldAdultAPI } from './mangaWorldAdult';

class APIManager {
  constructor() {
    this.apis = {
      mangaWorld: new MangaWorldAPI(),
      mangaWorldAdult: new MangaWorldAdultAPI()
    };
    
    // Cache per evitare troppe richieste
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
  }

  // ============= METODI DI CACHE =============
  
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // ============= RICERCA =============
  
  async searchAll(query, options = {}) {
    const { includeAdult = false, limit = 20 } = options;
    
    // Check cache
    const cacheKey = `search_${query}_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    const results = {
      manga: [],
      mangaAdult: [],
      all: []
    };

    try {
      // Ricerca su MangaWorld normale
      const mangaWorldResults = await this.apis.mangaWorld.search(query);
      
      mangaWorldResults.forEach(item => {
        const enrichedItem = {
          ...item,
          source: 'mangaWorld',
          type: 'manga',
          isAdult: false
        };
        results.manga.push(enrichedItem);
        results.all.push(enrichedItem);
      });

      // Ricerca su MangaWorld Adult solo se richiesto
      if (includeAdult) {
        const adultResults = await this.apis.mangaWorldAdult.search(query);
        
        adultResults.forEach(item => {
          const enrichedItem = {
            ...item,
            source: 'mangaWorldAdult',
            type: 'manga',
            isAdult: true
          };
          results.mangaAdult.push(enrichedItem);
          results.all.push(enrichedItem);
        });
      }

      // Rimuovi duplicati basandoti sul titolo normalizzato
      results.all = this.removeDuplicates(results.all);
      
      // Limita i risultati
      results.all = results.all.slice(0, limit);
      results.manga = results.manga.slice(0, limit);
      results.mangaAdult = results.mangaAdult.slice(0, limit);
      
      // Salva in cache
      this.setCache(cacheKey, results);
      
      return results;
      
    } catch (error) {
      console.error('Search error:', error);
      return results;
    }
  }

  async searchManga(query, limit = 20) {
    return this.searchAll(query, { includeAdult: false, limit });
  }

  async searchAdult(query, limit = 20) {
    const results = await this.searchAll(query, { includeAdult: true, limit });
    return results.mangaAdult;
  }

  // ============= DETTAGLI MANGA =============
  
  async getMangaDetails(url, source) {
    const cacheKey = `manga_${url}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const api = this.apis[source];
      if (!api) {
        throw new Error(`Unknown source: ${source}`);
      }
      
      const details = await api.getMangaFromUrl(url);
      
      if (details) {
        // Aggiungi metadati
        details.source = source;
        details.isAdult = source === 'mangaWorldAdult';
        
        // Salva in cache
        this.setCache(cacheKey, details);
      }
      
      return details;
      
    } catch (error) {
      console.error(`Failed to get manga details from ${source}:`, error);
      
      // Prova con l'altra API se fallisce
      const alternativeSource = source === 'mangaWorld' ? 'mangaWorldAdult' : 'mangaWorld';
      try {
        const details = await this.apis[alternativeSource].getMangaFromUrl(url);
        if (details) {
          details.source = alternativeSource;
          details.isAdult = alternativeSource === 'mangaWorldAdult';
          this.setCache(cacheKey, details);
        }
        return details;
      } catch (err) {
        console.error('Alternative source also failed:', err);
        throw error;
      }
    }
  }

  // ============= CAPITOLI =============
  
  async getChapter(chapterUrl, source) {
    const cacheKey = `chapter_${chapterUrl}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const api = this.apis[source];
      if (!api) {
        throw new Error(`Unknown source: ${source}`);
      }
      
      const chapter = await api.getChapterDetail(chapterUrl);
      
      if (chapter && chapter.pages && chapter.pages.length > 0) {
        this.setCache(cacheKey, chapter);
      }
      
      return chapter;
      
    } catch (error) {
      console.error(`Failed to get chapter from ${source}:`, error);
      throw error;
    }
  }

  // ============= HOME PAGE DATA =============
  
  async getTrending(includeAdult = false) {
    const cacheKey = `trending_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const trending = [];
    
    try {
      // Trending da MangaWorld
      const mangaWorldTrending = await this.apis.mangaWorld.getTrending();
      mangaWorldTrending.forEach(item => {
        trending.push({
          ...item,
          source: 'mangaWorld',
          isAdult: false
        });
      });

      // Trending da Adult se richiesto
      if (includeAdult) {
        const adultTrending = await this.apis.mangaWorldAdult.getTrending();
        adultTrending.forEach(item => {
          trending.push({
            ...item,
            source: 'mangaWorldAdult',
            isAdult: true
          });
        });
      }

      const uniqueTrending = this.removeDuplicates(trending).slice(0, 20);
      this.setCache(cacheKey, uniqueTrending);
      
      return uniqueTrending;
      
    } catch (error) {
      console.error('Get trending error:', error);
      return [];
    }
  }

  async getRecentChapters() {
    const cacheKey = 'recent_chapters';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Ottieni la homepage e cerca la sezione "Ultimi capitoli aggiunti"
      const html = await this.apis.mangaWorld.makeRequest(this.apis.mangaWorld.baseUrl);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      const recentChapters = [];
      
      // Selettori per capitoli recenti
      const selectors = [
        '.new-chapters .entry',
        '.latest-updates .entry',
        '.recent-updates .entry',
        '.chapters-updates .entry'
      ];
      
      for (const selector of selectors) {
        const entries = doc.querySelectorAll(selector);
        if (entries.length > 0) {
          entries.forEach((entry, i) => {
            if (i >= 20) return;
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const chapter = entry.querySelector('.chapter-num, .latest-chapter');
            
            if (link?.href) {
              const href = link.getAttribute('href');
              recentChapters.push({
                url: href.startsWith('http') ? href : `https://www.mangaworld.so/${href.replace(/^\//, '')}`,
                title: entry.querySelector('.name, .title')?.textContent?.trim() || 'Unknown',
                cover: img?.src || img?.dataset?.src || '',
                latestChapter: chapter?.textContent?.trim() || '',
                source: 'mangaWorld',
                isAdult: false
              });
            }
          });
          break;
        }
      }
      
      this.setCache(cacheKey, recentChapters);
      return recentChapters;
      
    } catch (error) {
      console.error('Get recent chapters error:', error);
      return [];
    }
  }

  async getWeeklyReleases() {
    const cacheKey = 'weekly_releases';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Cerca manga popolari della settimana
      const popularThisWeek = [
        'One Piece',
        'My Hero Academia', 
        'Jujutsu Kaisen',
        'Black Clover',
        'Chainsaw Man',
        'Spy x Family',
        'Blue Lock',
        'Sakamoto Days'
      ];
      
      const weeklyReleases = [];
      
      for (const title of popularThisWeek) {
        try {
          const results = await this.apis.mangaWorld.search(title);
          if (results.length > 0) {
            const manga = results[0];
            weeklyReleases.push({
              ...manga,
              source: 'mangaWorld',
              isAdult: false,
              isWeeklyRelease: true
            });
          }
        } catch (err) {
          console.error(`Error searching ${title}:`, err);
        }
      }
      
      this.setCache(cacheKey, weeklyReleases);
      return weeklyReleases;
      
    } catch (error) {
      console.error('Get weekly releases error:', error);
      return [];
    }
  }

  async getTopManga() {
    const cacheKey = 'top_manga';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const topTitles = [
      'One Piece',
      'Attack on Titan',
      'Death Note',
      'Fullmetal Alchemist',
      'Demon Slayer',
      'Naruto',
      'Dragon Ball',
      'Berserk',
      'Hunter x Hunter',
      'Tokyo Ghoul'
    ];

    const topManga = [];
    
    for (const title of topTitles) {
      try {
        const results = await this.apis.mangaWorld.search(title);
        if (results.length > 0) {
          const bestMatch = results.find(m => 
            m.title.toLowerCase().includes(title.toLowerCase())
          ) || results[0];
          
          if (bestMatch) {
            topManga.push({
              ...bestMatch,
              source: 'mangaWorld',
              isAdult: false,
              isTopManga: true
            });
          }
        }
      } catch (err) {
        console.error(`Error searching top manga ${title}:`, err);
      }
    }
    
    this.setCache(cacheKey, topManga);
    return topManga;
  }

  // ============= UTILITY =============
  
  removeDuplicates(items) {
    const seen = new Map();
    return items.filter(item => {
      // Normalizza il titolo per il confronto
      const key = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20); // Usa solo i primi 20 caratteri
      
      if (seen.has(key)) {
        // Se già visto, preferisci quello non adult
        const existing = seen.get(key);
        if (existing.isAdult && !item.isAdult) {
          seen.set(key, item);
          return true;
        }
        return false;
      }
      
      seen.set(key, item);
      return true;
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // ============= CATEGORIE =============
  
  async getByCategory(category, includeAdult = false) {
    const cacheKey = `category_${category}_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const categoryQueries = {
      'azione': ['action', 'battle', 'fighting'],
      'romance': ['romance', 'love', 'romantic'],
      'fantasy': ['fantasy', 'magic', 'isekai'],
      'horror': ['horror', 'scary', 'thriller'],
      'comedy': ['comedy', 'funny', 'humor'],
      'shounen': ['shounen', 'naruto', 'one piece'],
      'seinen': ['seinen', 'berserk', 'monster'],
      'shoujo': ['shoujo', 'romance', 'love story']
    };

    const queries = categoryQueries[category.toLowerCase()] || [category];
    const allResults = [];

    for (const query of queries) {
      try {
        const results = await this.searchAll(query, { includeAdult, limit: 10 });
        allResults.push(...results.all);
      } catch (err) {
        console.error(`Error searching category ${category}:`, err);
      }
    }

    const uniqueResults = this.removeDuplicates(allResults).slice(0, 30);
    this.setCache(cacheKey, uniqueResults);
    
    return uniqueResults;
  }
}

// Esporta un'istanza singleton
const apiManager = new APIManager();

// Esporta anche la classe per testing
export { APIManager };
export default apiManager;
