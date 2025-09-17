import { config } from '../config';

// MAPPA DEI GENERI - Mantenuta per compatibilità con MyAnimeList
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
  
  // EXPLICIT GENRES
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

// MAPPA NOMI GENERI ITALIANI per MangaWorld
const ITALIAN_GENRE_MAP = {
  'action': 'azione',
  'adventure': 'avventura',
  'comedy': 'commedia',
  'drama': 'drammatico',
  'fantasy': 'fantasy',
  'horror': 'horror',
  'mystery': 'mistero',
  'romance': 'romantico',
  'sci-fi': 'sci-fi',
  'slice of life': 'slice-of-life',
  'sports': 'sport',
  'supernatural': 'soprannaturale',
  'ecchi': 'ecchi',
  'hentai': 'hentai',
  'adult': 'adulti',
  'historical': 'storico',
  'martial arts': 'arti-marziali',
  'mecha': 'mecha',
  'psychological': 'psicologico',
  'school': 'scolastico',
  'shounen': 'shounen',
  'shoujo': 'shoujo',
  'seinen': 'seinen',
  'josei': 'josei',
  'yaoi': 'yaoi',
  'yuri': 'yuri',
  'harem': 'harem',
  'isekai': 'isekai'
};

export class StatsAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
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

  // Ottieni gli ultimi aggiornamenti - CORRETTO con selettori dal DOM
  async getLatestUpdates(includeAdult = false) {
    const cacheKey = `latest_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const updates = [];

    try {
      // MangaWorld latest - Selettori corretti dal DOM
      const mwHtml = await this.makeRequest('https://www.mangaworld.cx');
      const mwDoc = this.parseHTML(mwHtml);
      
      // Usa .comics-grid .entry per gli ultimi capitoli
      const entries = mwDoc.querySelectorAll('.comics-grid .entry');
      
      entries.forEach((entry, i) => {
        if (i >= 50) return;
        
        const link = entry.querySelector('a.thumb, a.manga-title');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.manga-title')?.textContent?.trim();
        const latestChaps = entry.querySelectorAll('.xanh');
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          const latestChapter = latestChaps[0]?.textContent?.trim() || '';
          
          updates.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            latestChapter,
            source: 'mangaWorld',
            isAdult: false,
            updatedAt: new Date().toISOString()
          });
        }
      });

      // MangaWorld Adult latest se richiesto - Selettori corretti
      if (includeAdult) {
        try {
          const adultHtml = await this.makeRequest('https://www.mangaworldadult.net');
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.comics-grid .entry');
          
          adultEntries.forEach((entry, i) => {
            if (i >= 30) return;
            
            const link = entry.querySelector('a.thumb, a.manga-title');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.manga-title')?.textContent?.trim();
            const latestChaps = entry.querySelectorAll('.xanh');
            
            if (link?.href && title) {
              const href = link.getAttribute('href');
              const latestChapter = latestChaps[0]?.textContent?.trim() || '';
              
              updates.push({
                url: href.startsWith('http') ? href : `https://www.mangaworldadult.net${href}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                latestChapter,
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

  // Ottieni i più popolari/trending - CORRETTO
  async getMostFavorites(includeAdult = false) {
    const cacheKey = `favorites_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const favorites = [];

    try {
      // Prima prova a prendere i trending dalla homepage
      const html = await this.makeRequest('https://www.mangaworld.cx');
      const doc = this.parseHTML(html);
      
      // Cerca i capitoli di tendenza con selettore corretto
      const trendingEntries = doc.querySelectorAll('.comics-flex .entry.vertical, #chapters-slide .entry');
      
      if (trendingEntries.length > 0) {
        trendingEntries.forEach((entry, i) => {
          if (i >= 20) return;
          
          const link = entry.querySelector('a.thumb');
          const img = entry.querySelector('img');
          const title = entry.querySelector('.manga-title, .name')?.textContent?.trim();
          
          if (link?.href && title) {
            const href = link.getAttribute('href');
            favorites.push({
              url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
              title,
              cover: img?.src || img?.dataset?.src || '',
              trending: true,
              source: 'mangaWorld',
              isAdult: false
            });
          }
        });
      }
      
      // Se non troviamo trending, prendi i più letti
      if (favorites.length === 0) {
        const archiveUrl = 'https://www.mangaworld.cx/archive?sort=most_read';
        const archiveHtml = await this.makeRequest(archiveUrl);
        const archiveDoc = this.parseHTML(archiveHtml);
        
        const archiveEntries = archiveDoc.querySelectorAll('.entry');
        archiveEntries.forEach((entry, i) => {
          if (i >= 20) return;
          
          const link = entry.querySelector('a');
          const img = entry.querySelector('img');
          const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
          
          if (link?.href && title) {
            const href = link.getAttribute('href');
            favorites.push({
              url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
              title,
              cover: img?.src || img?.dataset?.src || '',
              source: 'mangaWorld',
              isAdult: false
            });
          }
        });
      }

      // Adult trending se richiesto
      if (includeAdult) {
        try {
          const adultHtml = await this.makeRequest('https://www.mangaworldadult.net');
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultTrending = adultDoc.querySelectorAll('.comics-flex .entry.vertical, #chapters-slide .entry');
          
          adultTrending.forEach((entry, i) => {
            if (i >= 15) return;
            
            const link = entry.querySelector('a.thumb');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.manga-title, .name')?.textContent?.trim();
            
            if (link?.href && title) {
              const href = link.getAttribute('href');
              favorites.push({
                url: href.startsWith('http') ? href : `https://www.mangaworldadult.net${href}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                trending: true,
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

  // Ottieni tutte le categorie disponibili - CORRETTO
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
      years: []
    };

    try {
      // Ottieni i generi da MangaWorld
      const html = await this.makeRequest('https://www.mangaworld.cx');
      const doc = this.parseHTML(html);
      
      // Estrai generi dal dropdown menu
      const genreLinks = doc.querySelectorAll('.dropdown-menu a[href*="/archive?genre"]');
      
      genreLinks.forEach(link => {
        const href = link.getAttribute('href');
        const genreName = link.textContent.trim();
        const genreSlug = href.match(/genre=([^&]+)/)?.[1];
        
        if (genreSlug && genreName) {
          const genreObj = {
            id: genreSlug,
            name: genreName,
            slug: genreSlug,
            url: `/archive?genre=${genreSlug}`
          };
          
          // Categorizza in base al nome
          if (['Ecchi', 'Hentai', 'Smut', 'Maturo', 'Adulti'].includes(genreName)) {
            categories.explicit_genres.push(genreObj);
          } else if (['Shounen', 'Shoujo', 'Seinen', 'Josei', 'Kids'].includes(genreName)) {
            categories.demographics.push(genreObj);
          } else {
            categories.genres.push(genreObj);
          }
        }
      });

      // Tipi di manga
      categories.types = [
        { id: 'manga', name: 'Manga', slug: 'manga' },
        { id: 'manhwa', name: 'Manhwa', slug: 'manhwa' },
        { id: 'manhua', name: 'Manhua', slug: 'manhua' },
        { id: 'oneshot', name: 'Oneshot', slug: 'oneshot' },
        { id: 'thai', name: 'Thai', slug: 'thai' },
        { id: 'vietnamese', name: 'Vietnamese', slug: 'vietnamese' },
        { id: 'novel', name: 'Light Novel', slug: 'novel' },
        { id: 'doujin', name: 'Doujinshi', slug: 'doujin' }
      ];

      // Stati
      categories.status = [
        { id: 'ongoing', name: 'In corso', slug: 'ongoing' },
        { id: 'completed', name: 'Completato', slug: 'completed' },
        { id: 'dropped', name: 'Droppato', slug: 'dropped' },
        { id: 'paused', name: 'In pausa', slug: 'paused' }
      ];

      // Anni
      const currentYear = new Date().getFullYear();
      for (let year = currentYear; year >= 1990; year--) {
        categories.years.push({
          id: year.toString(),
          name: year.toString(),
          slug: year.toString()
        });
      }

      this.setCache(cacheKey, categories);
      return categories;
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      return categories;
    }
  }

  // Ottieni manga per genere - CORRETTO per usare slug invece di ID
  async getMangaByGenre(genreSlug, page = 1, includeAdult = false) {
    const cacheKey = `genre_${genreSlug}_${page}_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const results = [];
    
    try {
      // MangaWorld normale
      const url = `https://www.mangaworld.cx/archive?genre=${genreSlug}&page=${page}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach(entry => {
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            source: 'mangaWorld',
            isAdult: false,
            genre: genreSlug
          });
        }
      });

      // MangaWorld Adult se richiesto e il genere è appropriato
      if (includeAdult && ['ecchi', 'hentai', 'smut', 'adulti', 'maturo', 'yaoi', 'yuri'].includes(genreSlug)) {
        try {
          const adultUrl = `https://www.mangaworldadult.net/archive?genre=${genreSlug}&page=${page}`;
          const adultHtml = await this.makeRequest(adultUrl);
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.entry');
          
          adultEntries.forEach(entry => {
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
            
            if (link?.href && title) {
              const href = link.getAttribute('href');
              results.push({
                url: href.startsWith('http') ? href : `https://www.mangaworldadult.net${href}`,
                title,
                cover: img?.src || img?.dataset?.src || '',
                source: 'mangaWorldAdult',
                isAdult: true,
                genre: genreSlug
              });
            }
          });
        } catch (err) {
          console.error('Error fetching adult genre:', err);
        }
      }

      // Controlla se ci sono altre pagine
      const pagination = doc.querySelector('.pagination');
      const nextButton = pagination?.querySelector('.next:not(.disabled)');
      const hasMore = nextButton !== null;

      const response = {
        results,
        page,
        hasMore,
        totalResults: results.length,
        genre: genreSlug
      };

      this.setCache(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error(`Error fetching genre ${genreSlug}:`, error);
      return {
        results: [],
        page,
        hasMore: false,
        totalResults: 0,
        genre: genreSlug
      };
    }
  }

  // Ottieni manga per tipo
  async getMangaByType(type, page = 1) {
    const cacheKey = `type_${type}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://www.mangaworld.cx/archive?type=${type}&page=${page}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = [];
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach(entry => {
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            type,
            source: 'mangaWorld'
          });
        }
      });

      // Controlla paginazione
      const pagination = doc.querySelector('.pagination');
      const hasMore = pagination?.querySelector('.next:not(.disabled)') !== null;

      const response = {
        results,
        page,
        hasMore,
        totalResults: results.length,
        type
      };

      this.setCache(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error(`Error fetching type ${type}:`, error);
      return {
        results: [],
        page,
        hasMore: false,
        totalResults: 0,
        type
      };
    }
  }

  // Nuovo metodo per ottenere manga per stato
  async getMangaByStatus(status, page = 1) {
    const cacheKey = `status_${status}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://www.mangaworld.cx/archive?status=${status}&page=${page}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = [];
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach(entry => {
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            status,
            source: 'mangaWorld'
          });
        }
      });

      const pagination = doc.querySelector('.pagination');
      const hasMore = pagination?.querySelector('.next:not(.disabled)') !== null;

      const response = {
        results,
        page,
        hasMore,
        totalResults: results.length,
        status
      };

      this.setCache(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error(`Error fetching status ${status}:`, error);
      return {
        results: [],
        page,
        hasMore: false,
        totalResults: 0,
        status
      };
    }
  }
}

export default new StatsAPI();
