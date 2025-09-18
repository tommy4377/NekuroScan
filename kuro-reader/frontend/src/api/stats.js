import { config } from '../config';

// MAPPA GENERI SEMPLIFICATA - SOLO QUELLI CHE USEREMO
const GENRE_MAP = {
  'azione': 'Azione',
  'avventura': 'Avventura',
  'commedia': 'Commedia',
  'drammatico': 'Drammatico',
  'fantasy': 'Fantasy',
  'horror': 'Horror',
  'mistero': 'Mistero',
  'romantico': 'Romantico',
  'sci-fi': 'Sci-Fi',
  'slice-of-life': 'Slice of Life',
  'sport': 'Sport',
  'soprannaturale': 'Soprannaturale',
  'storico': 'Storico',
  'psicologico': 'Psicologico',
  'scolastico': 'Scolastico',
  'arti-marziali': 'Arti Marziali',
  'mecha': 'Mecha',
  'militare': 'Militare',
  'musica': 'Musica',
  'parodia': 'Parodia',
  'poliziesco': 'Poliziesco',
  'spazio': 'Spazio',
  'vampiri': 'Vampiri',
  'isekai': 'Isekai',
  'reincarnazione': 'Reincarnazione',
  'survival': 'Survival',
  'viaggi-nel-tempo': 'Viaggi nel Tempo',
  'videogiochi': 'Videogiochi',
  'workplace': 'Workplace',
  
  // Demographics
  'shounen': 'Shounen',
  'shoujo': 'Shoujo',
  'seinen': 'Seinen',
  'josei': 'Josei',
  
  // Adult (solo su mangaworldadult)
  'hentai': 'Hentai',
  'ecchi': 'Ecchi',
  'smut': 'Smut',
  'maturo': 'Maturo',
  'adulti': 'Adulti',
  'yaoi': 'Yaoi',
  'yuri': 'Yuri',
  'harem': 'Harem',
  'gender-bender': 'Gender Bender',
  'shounen-ai': 'Shounen Ai',
  'shoujo-ai': 'Shoujo Ai'
};

// Generi che sono SOLO adult
const ADULT_ONLY_GENRES = ['hentai', 'smut', 'maturo', 'adulti'];

// Generi che possono essere su entrambe le piattaforme
const MIXED_GENRES = ['ecchi', 'yaoi', 'yuri', 'harem', 'gender-bender', 'shounen-ai', 'shoujo-ai'];

export class StatsAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
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

  // Ottieni nome genere dalla slug
  getGenreName(genreSlug) {
    if (typeof genreSlug === 'number') {
      // Se ricevi un numero, ritorna il nome dalla slug
      return 'Genere';
    }
    return GENRE_MAP[genreSlug] || genreSlug;
  }

  // Determina se un genere richiede la piattaforma adult
  isAdultGenre(genreSlug) {
    return ADULT_ONLY_GENRES.includes(genreSlug);
  }

  // Ottieni gli ultimi aggiornamenti
  async getLatestUpdates(includeAdult = false) {
    const cacheKey = `latest_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const updates = [];

    try {
      const mwHtml = await this.makeRequest('https://www.mangaworld.cx');
      const mwDoc = this.parseHTML(mwHtml);
      
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

  // Ottieni i più popolari
  async getMostFavorites(includeAdult = false) {
    const cacheKey = `favorites_${includeAdult}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const favorites = [];

    try {
      // Prendi i più letti invece dei trending
      const url = 'https://www.mangaworld.cx/archive?sort=most_read';
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      entries.forEach((entry, i) => {
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

      if (includeAdult) {
        try {
          const adultUrl = 'https://www.mangaworldadult.net/archive?sort=most_read';
          const adultHtml = await this.makeRequest(adultUrl);
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.entry');
          adultEntries.forEach((entry, i) => {
            if (i >= 15) return;
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
            
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

  // Ottieni top per tipo (manga, manhwa, manhua, oneshot)
  async getTopByType(type = 'manga') {
    const cacheKey = `top_${type}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://www.mangaworld.cx/archive?type=${type}&sort=most_read`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = [];
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach((entry, i) => {
        if (i >= 50) return;
        
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
      sort_options: []
    };

    try {
      // Generi normali (senza duplicati)
      const normalGenres = [
        'azione', 'avventura', 'commedia', 'drammatico', 'fantasy',
        'horror', 'mistero', 'romantico', 'sci-fi', 'slice-of-life',
        'sport', 'soprannaturale', 'storico', 'psicologico', 'scolastico',
        'arti-marziali', 'mecha', 'militare', 'musica', 'parodia',
        'poliziesco', 'spazio', 'vampiri', 'isekai', 'reincarnazione',
        'survival', 'viaggi-nel-tempo', 'videogiochi', 'workplace'
      ];

      normalGenres.forEach(slug => {
        categories.genres.push({
          id: slug,
          name: GENRE_MAP[slug],
          slug: slug
        });
      });

      // Generi adult/explicit
      const adultGenres = ['hentai', 'smut', 'maturo', 'adulti'];
      adultGenres.forEach(slug => {
        categories.explicit_genres.push({
          id: slug,
          name: GENRE_MAP[slug],
          slug: slug
        });
      });

      // Generi misti (possono essere su entrambe)
      const mixedGenres = ['ecchi', 'yaoi', 'yuri', 'harem', 'gender-bender', 'shounen-ai', 'shoujo-ai'];
      mixedGenres.forEach(slug => {
        categories.themes.push({
          id: slug,
          name: GENRE_MAP[slug],
          slug: slug
        });
      });

      // Demographics
      const demographics = ['shounen', 'shoujo', 'seinen', 'josei'];
      demographics.forEach(slug => {
        categories.demographics.push({
          id: slug,
          name: GENRE_MAP[slug],
          slug: slug
        });
      });

      // Tipi (solo quelli principali)
      categories.types = [
        { id: 'manga', name: 'Manga', slug: 'manga' },
        { id: 'manhwa', name: 'Manhwa', slug: 'manhwa' },
        { id: 'manhua', name: 'Manhua', slug: 'manhua' },
        { id: 'oneshot', name: 'Oneshot', slug: 'oneshot' }
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

      // Opzioni di ordinamento
      categories.sort_options = [
        { id: 'a-z', name: 'A-Z', value: 'a-z' },
        { id: 'z-a', name: 'Z-A', value: 'z-a' },
        { id: 'most_read', name: 'Più letti', value: 'most_read' },
        { id: 'less_read', name: 'Meno letti', value: 'less_read' },
        { id: 'newest', name: 'Più recenti', value: 'newest' },
        { id: 'oldest', name: 'Meno recenti', value: 'oldest' },
        { id: 'score', name: 'Voto', value: 'score' }
      ];

      this.setCache(cacheKey, categories);
      return categories;
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      return categories;
    }
  }

  // Ricerca avanzata con filtri multipli
  async searchAdvanced(options = {}) {
    const {
      genres = [],
      types = [],
      status = '',
      year = '',
      sort = 'a-z',
      page = 1,
      includeAdult = false
    } = options;

    const results = [];
    
    try {
      // Costruisci URL con parametri multipli
      const params = new URLSearchParams();
      
      // Aggiungi generi multipli
      genres.forEach(genre => {
        params.append('genre[]', genre);
      });
      
      // Tipo (solo uno alla volta)
      if (types.length > 0) {
        params.append('type', types[0]); // Prendi solo il primo
      }
      
      if (status) params.append('status', status);
      if (year) params.append('year', year);
      if (sort) params.append('sort', sort);
      params.append('page', page);

      const url = `https://www.mangaworld.cx/archive?${params.toString()}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach(entry => {
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
        
        // Cerca il voto
        const scoreElem = entry.querySelector('.rating, .score, .vote');
        const score = scoreElem?.textContent?.trim() || 'N/A';
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            score,
            source: 'mangaWorld',
            isAdult: false
          });
        }
      });

      // Se ci sono generi adult e includeAdult è true
      if (includeAdult && genres.some(g => this.isAdultGenre(g))) {
        const adultParams = new URLSearchParams(params);
        const adultUrl = `https://www.mangaworldadult.net/archive?${adultParams.toString()}`;
        
        try {
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
                score: 'N/A',
                source: 'mangaWorldAdult',
                isAdult: true
              });
            }
          });
        } catch (err) {
          console.error('Error fetching adult search:', err);
        }
      }

      // Controlla paginazione
      const pagination = doc.querySelector('.pagination');
      const hasMore = pagination?.querySelector('.next:not(.disabled)') !== null;

      return {
        results,
        page,
        hasMore,
        totalResults: results.length
      };
      
    } catch (error) {
      console.error('Error in advanced search:', error);
      return {
        results: [],
        page,
        hasMore: false,
        totalResults: 0
      };
    }
  }

  // Metodi helper per compatibilità
  async getMangaByGenreId(genreId, page = 0, limit = 100) {
    // Converti ID numerico in slug se necessario
    const genreSlug = typeof genreId === 'number' ? 
      Object.keys(GENRE_MAP)[0] : genreId;
    
    return this.searchAdvanced({
      genres: [genreSlug],
      page: page + 1
    });
  }

  async getMangaByCategoryPage(category, type, page = 0, includeAdult = false) {
    const options = {
      page: page + 1,
      includeAdult
    };

    switch(type) {
      case 'genre':
        options.genres = [category];
        break;
      case 'type':
        options.types = [category];
        break;
      case 'status':
        options.status = category;
        break;
      case 'year':
        options.year = category;
        break;
      case 'demographic':
        options.genres = [category];
        break;
    }

    return this.searchAdvanced(options);
  }

  async getAllMangaByCategory(category, type, includeAdult = false) {
    const allResults = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limita a 10 pagine
      try {
        const results = await this.searchAdvanced({
          genres: type === 'genre' ? [category] : [],
          types: type === 'type' ? [category] : [],
          status: type === 'status' ? category : '',
          year: type === 'year' ? category : '',
          page,
          includeAdult
        });
        
        allResults.push(...results.results);
        hasMore = results.hasMore;
        page++;
      } catch (error) {
        console.error(`Error loading page ${page}:`, error);
        break;
      }
    }

    return {
      results: allResults,
      totalPages: page - 1,
      totalResults: allResults.length,
      category,
      type
    };
  }

  // Per i link "Vedi tutti"
  getViewAllUrl(section, includeAdult = false) {
    switch(section) {
      case 'latest':
        return '/latest-updates';
      case 'popular':
        return '/popular';
      case 'top-manga':
        return '/top/manga';
      case 'top-manhwa':
        return '/top/manhwa';
      case 'top-manhua':
        return '/top/manhua';
      case 'top-oneshot':
        return '/top/oneshot';
      default:
        return '/search';
    }
  }

  // Metodi mancanti per retrocompatibilità
  categorizeByPlatform(genreId) {
    return 'mangaworld';
  }

  // Aggiungi questo metodo in stats.js:

async getLatestUpdates(includeAdult = false, limit = null) {
  const cacheKey = `latest_${includeAdult}_${limit || 'all'}`;
  const cached = this.getCached(cacheKey);
  if (cached) return cached;

  const updates = [];

  try {
    // Se non c'è limite, carica più pagine
    const pagesToLoad = limit ? 1 : 5;
    
    for (let page = 1; page <= pagesToLoad; page++) {
      const mwHtml = await this.makeRequest(`https://www.mangaworld.cx/?page=${page}`);
      const mwDoc = this.parseHTML(mwHtml);
      
      const entries = mwDoc.querySelectorAll('.comics-grid .entry');
      
      entries.forEach((entry) => {
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
            latestChapter: latestChapter.replace(/^cap\.\s*/i, '').replace(/^capitolo\s*/i, ''),
            source: 'mangaWorld',
            isAdult: false,
            updatedAt: new Date().toISOString()
          });
        }
      });
      
      if (limit && updates.length >= limit) {
        break;
      }
    }

    if (includeAdult) {
      try {
        for (let page = 1; page <= Math.min(pagesToLoad, 3); page++) {
          const adultHtml = await this.makeRequest(`https://www.mangaworldadult.net/?page=${page}`);
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.comics-grid .entry');
          
          adultEntries.forEach((entry) => {
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
                latestChapter: latestChapter.replace(/^cap\.\s*/i, '').replace(/^capitolo\s*/i, ''),
                source: 'mangaWorldAdult',
                isAdult: true,
                updatedAt: new Date().toISOString()
              });
            }
          });
          
          if (limit && updates.length >= limit) {
            break;
          }
        }
      } catch (err) {
        console.error('Error fetching adult updates:', err);
      }
    }

    const finalUpdates = limit ? updates.slice(0, limit) : updates;
    this.setCache(cacheKey, finalUpdates);
    return finalUpdates;
    
  } catch (error) {
    console.error('Error fetching latest updates:', error);
    return [];
  }
}

async getMostFavorites(includeAdult = false, limit = null) {
  const cacheKey = `favorites_${includeAdult}_${limit || 'all'}`;
  const cached = this.getCached(cacheKey);
  if (cached) return cached;

  const favorites = [];

  try {
    // Carica più pagine se non c'è limite
    const pagesToLoad = limit ? 1 : 5;
    
    for (let page = 1; page <= pagesToLoad; page++) {
      const url = `https://www.mangaworld.cx/archive?sort=most_read&page=${page}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      entries.forEach((entry) => {
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
      
      if (limit && favorites.length >= limit) {
        break;
      }
    }

    if (includeAdult) {
      try {
        for (let page = 1; page <= Math.min(pagesToLoad, 3); page++) {
          const adultUrl = `https://www.mangaworldadult.net/archive?sort=most_read&page=${page}`;
          const adultHtml = await this.makeRequest(adultUrl);
          const adultDoc = this.parseHTML(adultHtml);
          
          const adultEntries = adultDoc.querySelectorAll('.entry');
          adultEntries.forEach((entry) => {
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
            
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
          
          if (limit && favorites.length >= limit) {
            break;
          }
        }
      } catch (err) {
        console.error('Error fetching adult favorites:', err);
      }
    }

    const finalFavorites = limit ? favorites.slice(0, limit) : favorites;
    this.setCache(cacheKey, finalFavorites);
    return finalFavorites;
    
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
}

async getTopByType(type = 'manga', limit = null) {
  const cacheKey = `top_${type}_${limit || 'all'}`;
  const cached = this.getCached(cacheKey);
  if (cached) return cached;

  try {
    const results = [];
    const pagesToLoad = limit ? 1 : 5;
    
    for (let page = 1; page <= pagesToLoad; page++) {
      const url = `https://www.mangaworld.cx/archive?type=${type}&sort=most_read&page=${page}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach((entry) => {
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
      
      if (limit && results.length >= limit) {
        break;
      }
    }

    const finalResults = limit ? results.slice(0, limit) : results;
    this.setCache(cacheKey, finalResults);
    return finalResults;
    
  } catch (error) {
    console.error(`Error fetching top ${type}:`, error);
    return [];
  }
}
  
}

export default new StatsAPI();
