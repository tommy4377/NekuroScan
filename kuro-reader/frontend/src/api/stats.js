import { config } from '../config';

// FIX: MangaWorld usa SLUG non ID numerici
const GENRE_MAP = {
  'azione': { name: 'Azione', slug: 'azione' },
  'avventura': { name: 'Avventura', slug: 'avventura' },
  'commedia': { name: 'Commedia', slug: 'commedia' },
  'drammatico': { name: 'Drammatico', slug: 'drammatico' },
  'fantasy': { name: 'Fantasy', slug: 'fantasy' },
  'horror': { name: 'Horror', slug: 'horror' },
  'mistero': { name: 'Mistero', slug: 'mistero' },
  'romantico': { name: 'Romantico', slug: 'romantico' },
  'sci-fi': { name: 'Sci-Fi', slug: 'sci-fi' },
  'slice-of-life': { name: 'Slice of Life', slug: 'slice-of-life' },
  'sport': { name: 'Sport', slug: 'sport' },
  'soprannaturale': { name: 'Soprannaturale', slug: 'soprannaturale' },
  'storico': { name: 'Storico', slug: 'storico' },
  'psicologico': { name: 'Psicologico', slug: 'psicologico' },
  'scolastico': { name: 'Scolastico', slug: 'scolastico' },
  'arti-marziali': { name: 'Arti Marziali', slug: 'arti-marziali' },
  'mecha': { name: 'Mecha', slug: 'mecha' },
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
  'workplace': { name: 'Workplace', slug: 'workplace' },
  
  // Demographics
  'shounen': { name: 'Shounen', slug: 'shounen' },
  'shoujo': { name: 'Shoujo', slug: 'shoujo' },
  'seinen': { name: 'Seinen', slug: 'seinen' },
  'josei': { name: 'Josei', slug: 'josei' },
  
  // Adult
  'hentai': { name: 'Hentai', slug: 'hentai', adult: true },
  'ecchi': { name: 'Ecchi', slug: 'ecchi', mixed: true },
  'smut': { name: 'Smut', slug: 'smut', adult: true },
  'maturo': { name: 'Maturo', slug: 'maturo', adult: true },
  'adulti': { name: 'Adulti', slug: 'adulti', adult: true },
  'yaoi': { name: 'Yaoi', slug: 'yaoi', mixed: true },
  'yuri': { name: 'Yuri', slug: 'yuri', mixed: true },
  'harem': { name: 'Harem', slug: 'harem', mixed: true },
  'gender-bender': { name: 'Gender Bender', slug: 'gender-bender', mixed: true },
  'shounen-ai': { name: 'Shounen Ai', slug: 'shounen-ai', mixed: true },
  'shoujo-ai': { name: 'Shoujo Ai', slug: 'shoujo-ai', mixed: true }
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

  // FIX: Ricerca avanzata con filtri COMBINATI
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
      // Costruisci URL con TUTTI i parametri
      let url = 'https://www.mangaworld.cx/archive?';
      const params = [];
      
      // FIX: Aggiungi TUTTI i generi selezionati
      genres.forEach(genre => {
        const genreSlug = this.getGenreSlug(genre);
        params.push(`genre=${genreSlug}`);
      });
      
      // Aggiungi tipo
      if (types.length > 0) {
        params.push(`type=${types[0]}`);
      }
      
      // Aggiungi altri filtri
      if (status) params.push(`status=${status}`);
      if (year) params.push(`year=${year}`);
      params.push(`sort=${sort}`); // Usa sort corretto
      params.push(`page=${page}`);
      
      url += params.join('&');
      
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

      // Check pagination
      const pagination = doc.querySelector('.pagination');
      const nextButton = pagination?.querySelector('a.next:not(.disabled)');
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

  // Ottieni ultimi aggiornamenti con scroll infinito
  async getLatestUpdates(includeAdult = false, limit = null, page = 1) {
    const cacheKey = `latest_${includeAdult}_${limit}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const updates = [];

    try {
      const url = `https://www.mangaworld.cx/?page=${page}`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.comics-grid .entry');
      
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
            isAdult: false
          });
        }
      });

      // Check if has more
      const pagination = doc.querySelector('.pagination');
      const hasMore = !!pagination?.querySelector('a.next:not(.disabled)');

      const result = {
        results: limit ? updates.slice(0, limit) : updates,
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

  // Ottieni i più letti con scroll infinito
  async getMostFavorites(includeAdult = false, limit = null, page = 1) {
    const cacheKey = `favorites_${includeAdult}_${limit}_${page}`;
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
      const hasMore = !!pagination?.querySelector('a.next:not(.disabled)');

      const result = {
        results: limit ? favorites.slice(0, limit) : favorites,
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
        { id: 'oneshot', name: 'Oneshot', slug: 'oneshot' }
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
        { id: 'score', name: 'Valutazione', value: 'score' },
        { id: 'newest', name: 'Più recenti', value: 'newest' },
        { id: 'a-z', name: 'A-Z', value: 'a-z' },
        { id: 'z-a', name: 'Z-A', value: 'z-a' }
      ]
    };

    // Generi normali
    const normalGenres = [
      'azione', 'avventura', 'commedia', 'drammatico', 'fantasy',
      'horror', 'mistero', 'romantico', 'sci-fi', 'slice-of-life',
      'sport', 'soprannaturale', 'storico', 'psicologico', 'scolastico',
      'arti-marziali', 'mecha', 'militare', 'musica', 'parodia',
      'poliziesco', 'spazio', 'vampiri', 'isekai', 'reincarnazione',
      'survival', 'viaggi-nel-tempo', 'videogiochi', 'workplace'
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

    // Demographics
    ['shounen', 'shoujo', 'seinen', 'josei'].forEach(slug => {
      const genre = GENRE_MAP[slug];
      if (genre) {
        categories.demographics.push({
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

  async getTopByType(type = 'manga', limit = null) {
    const cacheKey = `top_${type}_${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const results = [];
      const url = `https://www.mangaworld.cx/archive?type=${type}&sort=most_read`;
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach((entry, i) => {
        if (limit && i >= limit) return;
        
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
}

export default new StatsAPI();
