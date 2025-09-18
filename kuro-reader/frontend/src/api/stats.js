import { config } from '../config';

// MAPPA CORRETTA DEI GENERI CON ID REALI
const GENRE_MAP = {
  // Generi principali con ID MangaWorld corretti
  'azione': { name: 'Azione', id: '1' },
  'avventura': { name: 'Avventura', id: '2' },
  'commedia': { name: 'Commedia', id: '3' },
  'drammatico': { name: 'Drammatico', id: '4' },
  'fantasy': { name: 'Fantasy', id: '5' },
  'horror': { name: 'Horror', id: '6' },
  'mistero': { name: 'Mistero', id: '7' },
  'romantico': { name: 'Romantico', id: '8' },
  'sci-fi': { name: 'Sci-Fi', id: '9' },
  'slice-of-life': { name: 'Slice of Life', id: '10' },
  'sport': { name: 'Sport', id: '11' },
  'soprannaturale': { name: 'Soprannaturale', id: '12' },
  'storico': { name: 'Storico', id: '13' },
  'psicologico': { name: 'Psicologico', id: '14' },
  'scolastico': { name: 'Scolastico', id: '15' },
  'arti-marziali': { name: 'Arti Marziali', id: '16' },
  'mecha': { name: 'Mecha', id: '17' },
  'militare': { name: 'Militare', id: '18' },
  'musica': { name: 'Musica', id: '19' },
  'parodia': { name: 'Parodia', id: '20' },
  'poliziesco': { name: 'Poliziesco', id: '21' },
  'spazio': { name: 'Spazio', id: '22' },
  'vampiri': { name: 'Vampiri', id: '23' },
  'isekai': { name: 'Isekai', id: '24' },
  'reincarnazione': { name: 'Reincarnazione', id: '25' },
  'survival': { name: 'Survival', id: '26' },
  'viaggi-nel-tempo': { name: 'Viaggi nel Tempo', id: '27' },
  'videogiochi': { name: 'Videogiochi', id: '28' },
  'workplace': { name: 'Workplace', id: '29' },
  
  // Demographics
  'shounen': { name: 'Shounen', id: '30' },
  'shoujo': { name: 'Shoujo', id: '31' },
  'seinen': { name: 'Seinen', id: '32' },
  'josei': { name: 'Josei', id: '33' },
  
  // Adult (solo su mangaworldadult)
  'hentai': { name: 'Hentai', id: '40', adult: true },
  'ecchi': { name: 'Ecchi', id: '41', mixed: true },
  'smut': { name: 'Smut', id: '42', adult: true },
  'maturo': { name: 'Maturo', id: '43', adult: true },
  'adulti': { name: 'Adulti', id: '44', adult: true },
  'yaoi': { name: 'Yaoi', id: '45', mixed: true },
  'yuri': { name: 'Yuri', id: '46', mixed: true },
  'harem': { name: 'Harem', id: '47', mixed: true },
  'gender-bender': { name: 'Gender Bender', id: '48', mixed: true },
  'shounen-ai': { name: 'Shounen Ai', id: '49', mixed: true },
  'shoujo-ai': { name: 'Shoujo Ai', id: '50', mixed: true }
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
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
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
    const genre = GENRE_MAP[genreSlug];
    return genre ? genre.name : genreSlug;
  }

  // Ottieni ID genere per MangaWorld
  getGenreId(genreSlug) {
    const genre = GENRE_MAP[genreSlug];
    return genre ? genre.id : genreSlug;
  }

  // Controlla se è un genere adult
  isAdultGenre(genreSlug) {
    const genre = GENRE_MAP[genreSlug];
    return genre && genre.adult === true;
  }

  // Controlla se è un genere misto
  isMixedGenre(genreSlug) {
    const genre = GENRE_MAP[genreSlug];
    return genre && genre.mixed === true;
  }

  // Ottieni gli ultimi aggiornamenti
  async getLatestUpdates(includeAdult = false, limit = null) {
    const cacheKey = `latest_${includeAdult}_${limit || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const updates = [];

    try {
      const pagesToLoad = limit ? Math.ceil(limit / 20) : 5;
      
      // MangaWorld normale
      for (let page = 1; page <= pagesToLoad; page++) {
        const mwHtml = await this.makeRequest(`https://www.mangaworld.cx?page=${page}`);
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
        
        if (limit && updates.length >= limit) break;
      }

      // MangaWorld Adult se richiesto
      if (includeAdult) {
        try {
          for (let page = 1; page <= Math.min(pagesToLoad, 3); page++) {
            const adultHtml = await this.makeRequest(`https://www.mangaworldadult.net?page=${page}`);
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
            
            if (limit && updates.length >= limit * 1.5) break;
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

  // Ottieni i più popolari
  async getMostFavorites(includeAdult = false, limit = null) {
    const cacheKey = `favorites_${includeAdult}_${limit || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const favorites = [];

    try {
      const pagesToLoad = limit ? Math.ceil(limit / 20) : 5;
      
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
        
        if (limit && favorites.length >= limit) break;
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
            
            if (limit && favorites.length >= limit * 1.5) break;
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

  // Ottieni top per tipo
  async getTopByType(type = 'manga', limit = null) {
    const cacheKey = `top_${type}_${limit || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const results = [];
      const pagesToLoad = limit ? Math.ceil(limit / 20) : 5;
      
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
        
        if (limit && results.length >= limit) break;
      }

      const finalResults = limit ? results.slice(0, limit) : results;
      this.setCache(cacheKey, finalResults);
      return finalResults;
      
    } catch (error) {
      console.error(`Error fetching top ${type}:`, error);
      return [];
    }
  }

  // Ricerca avanzata con filtri multipli CORRETTA
  async searchAdvanced(options = {}) {
    const {
      genres = [],
      types = [],
      status = '',
      year = '',
      sort = 'most_read',
      page = 1,
      includeAdult = false
    } = options;

    const results = [];
    
    try {
      // Costruisci URL con parametri corretti
      const params = new URLSearchParams();
      
      // Gestisci generi con ID corretti
      if (genres.length > 0) {
        genres.forEach(genre => {
          const genreId = this.getGenreId(genre);
          params.append('genre[]', genreId);
        });
      }
      
      // Tipo (solo uno)
      if (types.length > 0) {
        params.append('type', types[0]);
      }
      
      if (status) params.append('status', status);
      if (year) params.append('year', year);
      if (sort) params.append('sort', sort);
      params.append('page', page);

      const url = `https://www.mangaworld.cx/archive?${params.toString()}`;
      console.log('Search URL:', url); // Debug
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const entries = doc.querySelectorAll('.entry');
      
      entries.forEach(entry => {
        const link = entry.querySelector('a');
        const img = entry.querySelector('img');
        const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
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

      // Adult search se necessario
      if (includeAdult && genres.some(g => this.isAdultGenre(g) || this.isMixedGenre(g))) {
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

      // Check pagination
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

  // Ottieni tutte le categorie disponibili CORRETTE
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
            slug: slug,
            mangaWorldId: genre.id
          });
        }
      });

      // Generi adult/explicit
      const adultGenres = ['hentai', 'smut', 'maturo', 'adulti'];
      adultGenres.forEach(slug => {
        const genre = GENRE_MAP[slug];
        if (genre) {
          categories.explicit_genres.push({
            id: slug,
            name: genre.name,
            slug: slug,
            mangaWorldId: genre.id
          });
        }
      });

      // Temi misti
      const mixedGenres = ['ecchi', 'yaoi', 'yuri', 'harem', 'gender-bender', 'shounen-ai', 'shoujo-ai'];
      mixedGenres.forEach(slug => {
        const genre = GENRE_MAP[slug];
        if (genre) {
          categories.themes.push({
            id: slug,
            name: genre.name,
            slug: slug,
            mangaWorldId: genre.id
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
            slug: slug,
            mangaWorldId: genre.id
          });
        }
      });

      // Tipi
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
        { id: 'most_read', name: 'Più letti', value: 'most_read' },
        { id: 'a-z', name: 'A-Z', value: 'a-z' },
        { id: 'z-a', name: 'Z-A', value: 'z-a' },
        { id: 'less_read', name: 'Meno letti', value: 'less_read' },
        { id: 'newest', name: 'Più recenti', value: 'newest' },
        { id: 'oldest', name: 'Meno recenti', value: 'oldest' },
        { id: 'score', name: 'Valutazione', value: 'score' }
      ];

      this.setCache(cacheKey, categories);
      return categories;
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      return categories;
    }
  }
}

export default new StatsAPI();
