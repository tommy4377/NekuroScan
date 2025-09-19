import { config } from '../config';

// MAPPA COMPLETA DI TUTTI I GENERI DA MANGAWORLD
const GENRE_MAP = {
  // Generi standard (presenti su entrambi i siti)
  'adulti': { name: 'Adulti', slug: 'adulti', adult: true },
  'arti-marziali': { name: 'Arti Marziali', slug: 'arti-marziali' },
  'avventura': { name: 'Avventura', slug: 'avventura' },
  'azione': { name: 'Azione', slug: 'azione' },
  'commedia': { name: 'Commedia', slug: 'commedia' },
  'doujinshi': { name: 'Doujinshi', slug: 'doujinshi' },
  'drammatico': { name: 'Drammatico', slug: 'drammatico' },
  'ecchi': { name: 'Ecchi', slug: 'ecchi', mixed: true },
  'fantasy': { name: 'Fantasy', slug: 'fantasy' },
  'gender-bender': { name: 'Gender Bender', slug: 'gender-bender', mixed: true },
  'harem': { name: 'Harem', slug: 'harem', mixed: true },
  'hentai': { name: 'Hentai', slug: 'hentai', adult: true },
  'horror': { name: 'Horror', slug: 'horror' },
  'josei': { name: 'Josei', slug: 'josei' },
  'lolicon': { name: 'Lolicon', slug: 'lolicon', adult: true },
  'maturo': { name: 'Maturo', slug: 'maturo', adult: true },
  'mecha': { name: 'Mecha', slug: 'mecha' },
  'mistero': { name: 'Mistero', slug: 'mistero' },
  'psicologico': { name: 'Psicologico', slug: 'psicologico' },
  'romantico': { name: 'Romantico', slug: 'romantico' },
  'sci-fi': { name: 'Sci-Fi', slug: 'sci-fi' },
  'scolastico': { name: 'Scolastico', slug: 'scolastico' },
  'seinen': { name: 'Seinen', slug: 'seinen' },
  'shotacon': { name: 'Shotacon', slug: 'shotacon', adult: true },
  'shoujo': { name: 'Shoujo', slug: 'shoujo' },
  'shoujo-ai': { name: 'Shoujo Ai', slug: 'shoujo-ai', mixed: true },
  'shounen': { name: 'Shounen', slug: 'shounen' },
  'shounen-ai': { name: 'Shounen Ai', slug: 'shounen-ai', mixed: true },
  'slice-of-life': { name: 'Slice of Life', slug: 'slice-of-life' },
  'smut': { name: 'Smut', slug: 'smut', adult: true },
  'soprannaturale': { name: 'Soprannaturale', slug: 'soprannaturale' },
  'sport': { name: 'Sport', slug: 'sport' },
  'storico': { name: 'Storico', slug: 'storico' },
  'tragico': { name: 'Tragico', slug: 'tragico' },
  'yaoi': { name: 'Yaoi', slug: 'yaoi', mixed: true },
  'yuri': { name: 'Yuri', slug: 'yuri', mixed: true },
  
  // Generi extra che potrebbero non essere nei dropdown ma esistono
  'militare': { name: 'Militare', slug: 'militare' },
  'musica': { name: 'Musica', slug: 'musica' },
  'parodia': { name: 'Parodia', slug: 'parodia' },
  'poliziesco': { name: 'Poliziesco', slug: 'poliziesco' },
  'spazio': { name: 'Spazio', slug: 'spazio' },
  'vampiri': { name: 'Vampiri', slug: 'vampiri' },
  'isekai': { name: 'Isekai', slug: 'isekai' },
  'reincarnazione': { name: 'Reincarnazione', slug: 'reincarnazione' },
  'survival': { name: 'Survival', slug: 'survival' },
  'viaggi-nel-tempo': { name: 'Viaggi nel Tempo', slug: 'viaggi-nel-tempo' },
  'videogiochi': { name: 'Videogiochi', slug: 'videogiochi' },
  'workplace': { name: 'Workplace', slug: 'workplace' }
};

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
    this.cache.delete(key);
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

  getGenreName(genreSlug) {
    const genre = GENRE_MAP[genreSlug];
    return genre ? genre.name : genreSlug;
  }

  getGenreSlug(genreId) {
    const genre = GENRE_MAP[genreId];
    return genre ? genre.slug : genreId;
  }

  isAdultGenre(genreSlug) {
    const genre = GENRE_MAP[genreSlug];
    return genre && genre.adult === true;
  }

  isMixedGenre(genreSlug) {
    const genre = GENRE_MAP[genreSlug];
    return genre && genre.mixed === true;
  }

  // Ricerca avanzata con filtri COMBINATI
  async searchAdvanced(options = {}) {
    const {
      genres = [],
      types = [],
      status = '',
      year = '',
      sort = 'most_read', // DEFAULT: più letti
      page = 1,
      includeAdult = false
    } = options;

    const results = [];
    
    try {
      // Costruisci URL con parametri corretti
      let baseUrl = 'https://www.mangaworld.cx/archive?';
      const params = [];
      
      // Gestisci generi multipli
      if (genres.length > 0) {
        // MangaWorld accetta solo un genere alla volta, quindi facciamo richieste multiple
        const genreSlug = this.getGenreSlug(genres[0]);
        params.push(`genre=${genreSlug}`);
      }
      
      // Tipo
      if (types.length > 0) {
        params.push(`type=${types[0]}`);
      }
      
      // Altri filtri
      if (status) params.push(`status=${status}`);
      if (year) params.push(`year=${year}`);
      params.push(`sort=${sort}`);
      params.push(`page=${page}`);
      
      const url = baseUrl + params.join('&');
      console.log('Search URL:', url); // Debug
      
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
            isAdult: false
          });
        }
      });

      // Se ci sono generi adult e includeAdult è true
      if (includeAdult && genres.some(g => this.isAdultGenre(g) || this.isMixedGenre(g))) {
        const adultUrl = url.replace('mangaworld.cx', 'mangaworldadult.net');
        
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
                source: 'mangaWorldAdult',
                isAdult: true
              });
            }
          });
        } catch (err) {
          console.error('Error fetching adult search:', err);
        }
      }

      // Check pagination
      const pagination = doc.querySelector('.pagination');
      const nextButton = pagination?.querySelector('a:contains("Successivo"), a.next:not(.disabled)');
      const hasMore = !!nextButton;

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

  // Ottieni ultimi aggiornamenti con paginazione
  async getLatestUpdates(includeAdult = false, page = 1) {
    const cacheKey = `latest_${includeAdult}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const updates = [];

    try {
      const url = `https://www.mangaworld.cx/?page=${page}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.comics-grid .entry, .entry.vertical');
      
      entries.forEach((entry) => {
        const link = entry.querySelector('a.thumb, a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.manga-title, .name')?.textContent?.trim();
        const latestChap = entry.querySelector('.xanh')?.textContent?.trim();
        
        if (link?.href && title) {
          const href = link.getAttribute('href');
          updates.push({
            url: href.startsWith('http') ? href : `https://www.mangaworld.cx${href}`,
            title,
            cover: img?.src || img?.dataset?.src || '',
            latestChapter: latestChap?.replace(/^cap\.\s*/i, '').replace(/^capitolo\s*/i, '') || '',
            source: 'mangaWorld',
            isAdult: false
          });
        }
      });

      // Check for more pages
      const pagination = doc.querySelector('.pagination');
      const hasMore = !!pagination?.querySelector('a:contains("Successivo"), a.next:not(.disabled)');

      const result = {
        results: updates,
        hasMore,
        page
      };

      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error fetching latest updates:', error);
      return { results: [], hasMore: false, page };
    }
  }

  // Ottieni i più letti con paginazione
  async getMostFavorites(includeAdult = false, page = 1) {
    const cacheKey = `favorites_${includeAdult}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const favorites = [];

    try {
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

      const pagination = doc.querySelector('.pagination');
      const hasMore = !!pagination?.querySelector('a:contains("Successivo"), a.next:not(.disabled)');

      const result = {
        results: favorites,
        hasMore,
        page
      };

      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return { results: [], hasMore: false, page };
    }
  }

  // Top per tipo con paginazione
  async getTopByType(type = 'manga', page = 1) {
    const cacheKey = `top_${type}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const results = [];
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

      const pagination = doc.querySelector('.pagination');
      const hasMore = !!pagination?.querySelector('a:contains("Successivo"), a.next:not(.disabled)');

      const result = {
        results,
        hasMore,
        page
      };

      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error(`Error fetching top ${type}:`, error);
      return { results: [], hasMore: false, page };
    }
  }

  async getAllCategories() {
    const cacheKey = 'all_categories';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const categories = {
      genres: [],
      themes: [],
      demographics: [],
      types: [
        { id: 'manga', name: 'Manga', slug: 'manga' },
        { id: 'manhwa', name: 'Manhwa', slug: 'manhwa' },
        { id: 'manhua', name: 'Manhua', slug: 'manhua' },
        { id: 'oneshot', name: 'Oneshot', slug: 'oneshot' },
        { id: 'novel', name: 'Novel', slug: 'novel' }
      ],
      status: [
        { id: 'ongoing', name: 'In corso', slug: 'ongoing' },
        { id: 'completed', name: 'Completato', slug: 'completed' },
        { id: 'dropped', name: 'Droppato', slug: 'dropped' },
        { id: 'paused', name: 'In pausa', slug: 'paused' }
      ],
      years: [],
      sort_options: [
        { id: 'most_read', name: 'Più letti', value: 'most_read' },
        { id: 'less_read', name: 'Meno letti', value: 'less_read' },
        { id: 'newest', name: 'Più recenti', value: 'newest' },
        { id: 'oldest', name: 'Meno recenti', value: 'oldest' },
        { id: 'a-z', name: 'A-Z', value: 'a-z' },
        { id: 'z-a', name: 'Z-A', value: 'z-a' },
        { id: 'score', name: 'Valutazione', value: 'score' }
      ],
      explicit_genres: []
    };

    // Generi normali (non adult)
    const normalGenres = [
      'arti-marziali', 'avventura', 'azione', 'commedia', 'doujinshi',
      'drammatico', 'fantasy', 'horror', 'mecha', 'mistero', 
      'psicologico', 'romantico', 'sci-fi', 'scolastico', 
      'slice-of-life', 'soprannaturale', 'sport', 'storico', 'tragico',
      'militare', 'musica', 'parodia', 'poliziesco', 'spazio',
      'vampiri', 'isekai', 'reincarnazione', 'survival',
      'viaggi-nel-tempo', 'videogiochi', 'workplace'
    ];

    normalGenres.forEach(slug => {
      const genre = GENRE_MAP[slug];
      if (genre) {
        categories.genres.push({
          id: slug,
          name: genre.name,
          slug: genre.slug
        });
      }
    });

    // Temi misti (possono essere adult o normali)
    const themes = [
      'ecchi', 'gender-bender', 'harem', 'shoujo-ai', 'shounen-ai', 'yaoi', 'yuri'
    ];

    themes.forEach(slug => {
      const genre = GENRE_MAP[slug];
      if (genre) {
        categories.themes.push({
          id: slug,
          name: genre.name,
          slug: genre.slug
        });
      }
    });

    // Demographics
    const demographics = ['shounen', 'shoujo', 'seinen', 'josei'];
    demographics.forEach(slug => {
      const genre = GENRE_MAP[slug];
      if (genre) {
        categories.demographics.push({
          id: slug,
          name: genre.name,
          slug: genre.slug
        });
      }
    });

    // Generi espliciti (solo adult)
    const explicitGenres = ['adulti', 'hentai', 'lolicon', 'maturo', 'shotacon', 'smut'];
    explicitGenres.forEach(slug => {
      const genre = GENRE_MAP[slug];
      if (genre) {
        categories.explicit_genres.push({
          id: slug,
          name: genre.name,
          slug: genre.slug
        });
      }
    });

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
  }
}

export default new StatsAPI();
