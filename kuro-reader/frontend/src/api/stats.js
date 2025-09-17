import { config } from '../config';

// MAPPA DEI GENERI CON ID NUMERICI (dalla API originale)
const GENRE_MAP = {
  // GENRES PRINCIPALI
  1: 'Action',
  2: 'Adventure',
  4: 'Comedy',
  5: 'Avant Garde',
  6: 'Mythology',
  7: 'Mystery',
  8: 'Drama',
  10: 'Fantasy',
  14: 'Horror',
  22: 'Romance',
  24: 'Sci-Fi',
  30: 'Sports',
  36: 'Slice of Life',
  37: 'Supernatural',
  45: 'Suspense',
  46: 'Award Winning',
  47: 'Gourmet',
  
  // EXPLICIT GENRES (mangaworldadult)
  9: 'Ecchi',
  12: 'Hentai',
  49: 'Erotica',
  
  // THEMES
  3: 'Racing',
  11: 'Strategy Game',
  13: 'Historical',
  17: 'Martial Arts',
  18: 'Mecha',
  19: 'Music',
  20: 'Parody',
  21: 'Samurai',
  23: 'School',
  26: 'Girls Love',
  28: 'Boys Love',
  29: 'Space',
  31: 'Super Power',
  32: 'Vampire',
  35: 'Harem',
  38: 'Military',
  39: 'Detective',
  40: 'Psychological',
  44: 'Crossdressing',
  48: 'Workplace',
  50: 'Adult Cast',
  51: 'Anthropomorphic',
  52: 'CGDCT',
  53: 'Childcare',
  54: 'Combat Sports',
  55: 'Delinquents',
  56: 'Educational',
  57: 'Gag Humor',
  58: 'Gore',
  59: 'High Stakes Game',
  60: 'Idols (Female)',
  61: 'Idols (Male)',
  62: 'Isekai',
  63: 'Iyashikei',
  64: 'Love Polygon',
  65: 'Magical Sex Shift',
  66: 'Mahou Shoujo',
  67: 'Medical',
  68: 'Memoir',
  69: 'Organized Crime',
  70: 'Otaku Culture',
  71: 'Performing Arts',
  72: 'Pets',
  73: 'Reincarnation',
  74: 'Reverse Harem',
  75: 'Love Status Quo',
  76: 'Showbiz',
  77: 'Survival',
  78: 'Team Sports',
  79: 'Time Travel',
  80: 'Video Game',
  81: 'Villainess',
  82: 'Visual Arts',
  83: 'Urban Fantasy',
  
  // DEMOGRAPHICS
  15: 'Kids',
  25: 'Shoujo',
  27: 'Shounen',
  41: 'Seinen',
  42: 'Josei'
};

// CATEGORIZZAZIONE PER PIATTAFORME
const PLATFORM_CATEGORIES = {
  mangaworld: {
    genres: [1, 2, 4, 5, 6, 7, 8, 10, 14, 22, 24, 30, 36, 37, 45, 46, 47],
    themes: [3, 11, 13, 17, 18, 19, 20, 21, 23, 26, 28, 29, 31, 32, 38, 39, 40, 44, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 66, 67, 68, 69, 70, 71, 72, 73, 76, 77, 78, 79, 80, 81, 82, 83],
    demographics: [15, 25, 27, 41, 42]
  },
  mangaworldadult: {
    genres: [9, 12, 49],
    themes: [35, 64, 65, 74, 75],
    demographics: []
  }
};

export class StatsAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minuti
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
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
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
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

  // Determina la piattaforma basandosi sull'ID del genere
  categorizeByPlatform(genreId) {
    const id = parseInt(genreId);
    
    if (PLATFORM_CATEGORIES.mangaworldadult.genres.includes(id) || 
        PLATFORM_CATEGORIES.mangaworldadult.themes.includes(id)) {
      return 'mangaworldadult';
    }
    
    return 'mangaworld';
  }

  // Ottieni il nome del genere dall'ID
  getGenreName(genreId) {
    return GENRE_MAP[genreId] || `Unknown Genre (${genreId})`;
  }

  // Ottieni gli ultimi aggiornamenti
  async getLatestUpdates(includeAdult = false) {
    const cacheKey = `latest_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const updates = [];

    try {
      // MangaWorld latest
      const mwHtml = await this.makeRequest('https://www.mangaworld.so');
      const mwDoc = this.parseHTML(mwHtml);
      
      // Cerca gli ultimi capitoli aggiunti
      const selectors = [
        '.new-chapters .entry',
        '.latest-updates .entry',
        '.comics-grids .entry',
        '#new-chapters .entry'
      ];
      
      for (const selector of selectors) {
        const entries = mwDoc.querySelectorAll(selector);
        if (entries.length > 0) {
          entries.forEach((entry, i) => {
            if (i >= 50) return; // Limita a 50 per performance iniziale
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title')?.textContent?.trim();
            const chapter = entry.querySelector('.chapter, .latest-chapter')?.textContent?.trim();
            
            if (link?.href && title) {
              const href = link.getAttribute('href');
              updates.push({
                url: href.startsWith('http') ? href : `https://www.mangaworld.so${href}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                latestChapter: chapter || '',
                source: 'mangaWorld',
                isAdult: false,
                updatedAt: new Date().toISOString()
              });
            }
          });
          break;
        }
      }

      // MangaWorld Adult latest se richiesto
      if (includeAdult) {
        try {
          const adultHtml = await this.makeRequest('https://www.mangaworldadult.net');
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.entry, .latest-manga .entry');
          adultEntries.forEach((entry, i) => {
            if (i >= 30) return;
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
            
            if (link?.href && title) {
              const href = link.getAttribute('href');
              updates.push({
                url: href.startsWith('http') ? href : `https://www.mangaworldadult.net${href}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                source: 'mangaWorldAdult',
                isAdult: true,
                updatedAt: new Date().toISOString()
              });
            }
          });
        } catch (err) {
          console.error('Error fetching adult updates:', err);
        }
      }

      this.setCache(cacheKey, updates);
      return updates;
      
    } catch (error) {
      console.error('Error fetching latest updates:', error);
      return [];
    }
  }

  // Ottieni i più popolari/favoriti
  async getMostFavorites(includeAdult = false) {
    const cacheKey = `favorites_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const favorites = [];

    try {
      const url = 'https://www.mangaworld.so/archive?sort=most_read';
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      entries.forEach((entry, i) => {
        if (i >= 50) return;
        
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title')?.textContent?.trim();
        const views = entry.querySelector('.views, .view-count')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          favorites.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.so${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            views: views || '0',
            source: 'mangaWorld',
            isAdult: false
          });
        }
      });

      if (includeAdult) {
        try {
          const adultUrl = 'https://www.mangaworldadult.net/archive?sort=most_read';
          const adultHtml = await this.makeRequest(adultUrl);
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.entry');
          adultEntries.forEach((entry, i) => {
            if (i >= 30) return;
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title')?.textContent?.trim();
            
            if (link?.href && title) {
              const href = link.getAttribute('href');
              favorites.push({
                url: href.startsWith('http') ? href : `https://www.mangaworldadult.net${href}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                source: 'mangaWorldAdult',
                isAdult: true
              });
            }
          });
        } catch (err) {
          console.error('Error fetching adult favorites:', err);
        }
      }

      this.setCache(cacheKey, favorites);
      return favorites;
      
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
  }

  // Ottieni top manga per tipo
  async getTopByType(type = 'manga') {
    const cacheKey = `top_${type}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      let url;
      
      switch(type) {
        case 'manga':
          url = 'https://www.mangaworld.so/archive?type=manga&sort=most_read';
          break;
        case 'manhwa':
          url = 'https://www.mangaworld.so/archive?type=manhwa&sort=most_read';
          break;
        case 'manhua':
          url = 'https://www.mangaworld.so/archive?type=manhua&sort=most_read';
          break;
        case 'oneshot':
          url = 'https://www.mangaworld.so/archive?type=oneshot&sort=most_read';
          break;
        default:
          url = 'https://www.mangaworld.so/archive?sort=most_read';
      }

      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = [];
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach((entry, i) => {
        if (i >= 50) return;
        
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.so${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            type,
            source: 'mangaWorld'
          });
        }
      });

      this.setCache(cacheKey, results);
      return results;
      
    } catch (error) {
      console.error(`Error fetching top ${type}:`, error);
      return [];
    }
  }

  // Ottieni tutte le categorie disponibili
  async getAllCategories() {
    const cacheKey = 'all_categories';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const categories = {
      genres: [],
      explicit_genres: [],
      themes: [],
      demographics: [],
      types: [],
      status: [],
      years: [],
      platform_mapping: {}
    };

    try {
      // Mappa tutti i generi con i loro ID numerici
      Object.entries(GENRE_MAP).forEach(([id, name]) => {
        const genreId = parseInt(id);
        const platform = this.categorizeByPlatform(genreId);
        
        const genreObj = {
          id: genreId,
          name,
          platform,
          url: `/categories/genre/${genreId}`
        };

        // Categorizza in base al tipo
        if (PLATFORM_CATEGORIES.mangaworldadult.genres.includes(genreId)) {
          categories.explicit_genres.push(genreObj);
        } else if (genreId <= 47 && ![3, 9, 11, 12, 13].includes(genreId)) {
          categories.genres.push(genreObj);
        } else if (genreId >= 15 && genreId <= 42 && [15, 25, 27, 41, 42].includes(genreId)) {
          categories.demographics.push(genreObj);
        } else {
          categories.themes.push(genreObj);
        }
      });

      // Tipi di manga
      categories.types = [
        { id: 'manga', name: 'Manga', description: 'Fumetti giapponesi' },
        { id: 'manhwa', name: 'Manhwa', description: 'Fumetti coreani' },
        { id: 'manhua', name: 'Manhua', description: 'Fumetti cinesi' },
        { id: 'oneshot', name: 'Oneshot', description: 'Storia completa in un capitolo' },
        { id: 'thai', name: 'Thai', description: 'Fumetti thailandesi' },
        { id: 'vietnamese', name: 'Vietnamese', description: 'Fumetti vietnamiti' },
        { id: 'novel', name: 'Light Novel', description: 'Romanzi illustrati' },
        { id: 'doujin', name: 'Doujinshi', description: 'Opere amatoriali' }
      ];

      // Stati
      categories.status = [
        { id: 'ongoing', name: 'In corso', color: 'green' },
        { id: 'completed', name: 'Completato', color: 'blue' },
        { id: 'dropped', name: 'Droppato', color: 'red' },
        { id: 'paused', name: 'In pausa', color: 'yellow' }
      ];

      // Anni - dal corrente al 1990
      const currentYear = new Date().getFullYear();
      for (let year = currentYear; year >= 1990; year--) {
        categories.years.push({
          id: year.toString(),
          name: year.toString()
        });
      }

      // Aggiungi mapping piattaforme
      categories.platform_mapping = {
        mangaworld: PLATFORM_CATEGORIES.mangaworld,
        mangaworldadult: PLATFORM_CATEGORIES.mangaworldadult
      };

      this.setCache(cacheKey, categories);
      return categories;
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      return categories;
    }
  }

  // Ottieni manga per genere ID (SENZA LIMITI - carica tutti)
  async getMangaByGenreId(genreId, page = 0, limit = 100) {
    const cacheKey = `genre_${genreId}_${page}_${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const platform = this.categorizeByPlatform(genreId);
    const genreName = this.getGenreName(genreId);
    const results = [];
    let hasMore = true;

    try {
      // Costruisci URL basato sulla piattaforma
      const baseUrl = platform === 'mangaworldadult' 
        ? 'https://www.mangaworldadult.net' 
        : 'https://www.mangaworld.so';
        
      // Mappa il genere ID al nome per la query
      const genreQuery = genreName.toLowerCase().replace(/\s+/g, '-');
      const url = `${baseUrl}/archive?genre=${genreQuery}&page=${page + 1}`;

      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      
      // Carica TUTTI i risultati senza limite artificiale
      entries.forEach(entry => {
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            source: platform === 'mangaworldadult' ? 'mangaWorldAdult' : 'mangaWorld',
            isAdult: platform === 'mangaworldadult',
            genreId,
            genreName
          });
        }
      });

      // Controlla se ci sono altre pagine
      const pagination = doc.querySelector('.pagination');
      const nextButton = pagination?.querySelector('.next, a[rel="next"]');
      hasMore = nextButton !== null && !nextButton.classList.contains('disabled');

      const response = {
        results,
        page,
        hasMore,
        totalResults: results.length,
        genreId,
        genreName,
        platform
      };

      this.setCache(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error(`Error fetching genre ${genreId}:`, error);
      return {
        results: [],
        page,
        hasMore: false,
        totalResults: 0,
        genreId,
        genreName,
        platform
      };
    }
  }

  // Ottieni TUTTI i manga di una categoria (carica pagine infinite)
  async getAllMangaByCategory(category, type, includeAdult = false) {
    const allResults = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const results = await this.getMangaByCategoryPage(category, type, page, includeAdult);
        allResults.push(...results.results);
        hasMore = results.hasMore;
        page++;
        
        // Previeni loop infiniti
        if (page > 1000) break;
      } catch (error) {
        console.error(`Error loading page ${page}:`, error);
        break;
      }
    }

    return {
      results: allResults,
      totalPages: page,
      totalResults: allResults.length,
      category,
      type
    };
  }

  // Ottieni manga per categoria con paginazione
  async getMangaByCategoryPage(category, type, page = 0, includeAdult = false) {
    const cacheKey = `category_${category}_${type}_${page}_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const results = [];

    try {
      // Costruisci URL per MangaWorld
      let url = 'https://www.mangaworld.so/archive?';
      const params = new URLSearchParams();
      
      switch(type) {
        case 'genre':
          params.append('genre', category);
          break;
        case 'type':
          params.append('type', category);
          break;
        case 'status':
          params.append('status', category);
          break;
        case 'year':
          params.append('year', category);
          break;
        case 'demographic':
          params.append('genre', category);
          break;
      }
      
      params.append('page', page + 1);
      url += params.toString();

      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      entries.forEach(entry => {
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.so${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            source: 'mangaWorld',
            isAdult: false
          });
        }
      });

      // Adult se richiesto
      if (includeAdult && (type === 'genre' || type === 'type')) {
        try {
          let adultUrl = 'https://www.mangaworldadult.net/archive?';
          const adultParams = new URLSearchParams();
          
          switch(type) {
            case 'genre':
              adultParams.append('genre', category);
              break;
            case 'type':
              adultParams.append('type', category);
              break;
          }
          
          adultParams.append('page', page + 1);
          adultUrl += adultParams.toString();

          const adultHtml = await this.makeRequest(adultUrl);
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.entry');
          adultEntries.forEach(entry => {
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title')?.textContent?.trim();
            
            if (link?.href && title) {
              const href = link.getAttribute('href');
              results.push({
                url: href.startsWith('http') ? href : `https://www.mangaworldadult.net${href}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                source: 'mangaWorldAdult',
                isAdult: true
              });
            }
          });
        } catch (err) {
          console.error('Error fetching adult category:', err);
        }
      }

      // Calcola se ci sono altre pagine
      const pagination = doc.querySelector('.pagination');
      const hasMore = pagination?.querySelector('.next:not(.disabled)') !== null;

      const response = {
        results,
        page,
        hasMore,
        totalResults: results.length
      };

      this.setCache(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error('Error fetching category manga:', error);
      return {
        results: [],
        page,
        hasMore: false,
        totalResults: 0
      };
    }
  }
}

export default new StatsAPI();
