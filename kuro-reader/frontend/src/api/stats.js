import { config } from '../config';
import { getBaseUrl } from '../config/sources';

// Generi supportati
const GENRES = [
  'adulti','arti-marziali','avventura','azione','commedia','doujinshi','drammatico','ecchi',
  'fantasy','gender-bender','harem','hentai','horror','josei','lolicon','maturo','mecha','mistero',
  'psicologico','romantico','sci-fi','scolastico','seinen','shotacon','shoujo','shoujo-ai','shounen',
  'shounen-ai','slice-of-life','smut','soprannaturale','sport','storico','tragico','yaoi','yuri'
];

const BASE = (adult) => getBaseUrl(adult ? 'ma' : 'm');

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

  // FIX CRITICO: Cambio logica per hasMore
  hasMoreFromPagination(doc, currentResults, page) {
    // METODO 1: Se ci sono risultati, probabilmente ci sono altre pagine
    if (currentResults.length >= 15) {
      // Se abbiamo 15+ risultati, probabilmente c'è un'altra pagina
      return true;
    }
    
    // METODO 2: Cerca il pulsante next (come fallback)
    const nextBtn = doc.querySelector('ul.pagination li.page-item.next:not(.disabled), ul.pagination li.next:not(.disabled), a.next');
    if (nextBtn) return true;
    
    // METODO 3: Se siamo a pagina 1-3 e ci sono risultati, assumiamo ci siano altre pagine
    if (page <= 3 && currentResults.length > 0) {
      return true;
    }
    
    // Se non ci sono risultati o sono pochi, non ci sono altre pagine
    return false;
  }

  // Parser per ultimi capitoli aggiunti
  parseLatestGrid(doc, base) {
    const list = [];
    const entries = doc.querySelectorAll('.comics-grid .entry, .entry');
    
    entries.forEach((entry, index) => {
      if (index >= 20) return; // Limita a 20 per pagina
      
      const link = entry.querySelector('a.thumb, a');
      const img = entry.querySelector('img');
      const title = entry.querySelector('.manga-title, .name')?.textContent?.trim();
      
      const firstChapter = entry.querySelector('.content .xanh');
      const latestChapter = firstChapter?.textContent
        ?.replace(/^cap\.\s*/i, '')
        ?.replace(/^capitolo\s*/i, '')
        ?.trim() || '';
      
      if (link?.href && title) {
        const href = link.getAttribute('href');
        list.push({
          url: href.startsWith('http') ? href : `${base}${href.startsWith('/') ? '' : '/'}${href.replace(/^\//, '')}`,
          title,
          cover: img?.src || img?.dataset?.src || '',
          latestChapter,
          source: base.includes('adult') ? 'mangaWorldAdult' : 'mangaWorld',
          isAdult: base.includes('adult')
        });
      }
    });
    
    return list;
  }

  // Parser generico per archivio
  parseArchiveEntries(doc, base) {
    const items = [];
    const entries = doc.querySelectorAll('.entry');
    
    entries.forEach((entry, index) => {
      if (index >= 20) return; // Limita a 20 per pagina
      
      const link = entry.querySelector('a');
      const img = entry.querySelector('img');
      const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
      
      if (link?.href && title) {
        const href = link.getAttribute('href');
        items.push({
          url: href.startsWith('http') ? href : `${base}${href.startsWith('/') ? '' : '/'}${href.replace(/^\//, '')}`,
          title,
          cover: img?.src || img?.dataset?.src || '',
          source: base.includes('adult') ? 'mangaWorldAdult' : 'mangaWorld',
          isAdult: base.includes('adult')
        });
      }
    });
    
    return items;
  }

  // Ultimi aggiornamenti con paginazione
  async getLatestUpdates(includeAdult = false, page = 1) {
    const cacheKey = `latest_${includeAdult}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const base = BASE(includeAdult);
      const url = `${base}/?page=${page}`;
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseLatestGrid(doc, base);
      
      // FIX: hasMore basato sui risultati effettivi
      const hasMore = this.hasMoreFromPagination(doc, results, page);
      
      const finalResults = {
        results,
        hasMore,
        page
      };
      
      this.setCache(cacheKey, finalResults);
      return finalResults;
      
    } catch (error) {
      console.error('Error fetching latest updates:', error);
      return { results: [], hasMore: false, page };
    }
  }

  // Più letti con paginazione
  async getMostFavorites(includeAdult = false, page = 1) {
    const cacheKey = `favorites_${includeAdult}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const base = BASE(includeAdult);
      const url = `${base}/archive?sort=most_read&page=${page}`;
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseArchiveEntries(doc, base);
      
      // FIX: hasMore basato sui risultati effettivi
      const hasMore = this.hasMoreFromPagination(doc, results, page);
      
      const finalResults = {
        results,
        hasMore,
        page
      };
      
      this.setCache(cacheKey, finalResults);
      return finalResults;
      
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return { results: [], hasMore: false, page };
    }
  }

  // Top per tipo con paginazione
  async getTopByType(type = 'manga', includeAdult = false, page = 1) {
    const cacheKey = `top_${type}_${includeAdult}_${page}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const base = BASE(includeAdult);
      const url = `${base}/archive?type=${type}&sort=most_read&page=${page}`;
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseArchiveEntries(doc, base);
      
      // FIX: hasMore basato sui risultati effettivi
      const hasMore = this.hasMoreFromPagination(doc, results, page);
      
      const finalResults = {
        results,
        hasMore,
        page
      };
      
      this.setCache(cacheKey, finalResults);
      return finalResults;
      
    } catch (error) {
      console.error(`Error fetching top ${type}:`, error);
      return { results: [], hasMore: false, page };
    }
  }

  // Ricerca avanzata
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

    try {
      const base = BASE(includeAdult);
      const params = new URLSearchParams();
      
      if (genres.length > 0) {
        params.append('genre', genres[0]);
      }
      
      if (types.length > 0) {
        params.append('type', types[0]);
      }
      
      if (status) params.append('status', status);
      if (year) params.append('year', year);
      params.append('sort', sort);
      params.append('page', page);

      const url = `${base}/archive?${params.toString()}`;
      
      const html = await this.makeRequest(url);
      const doc = this.parseHTML(html);
      
      const results = this.parseArchiveEntries(doc, base);
      
      // FIX: hasMore basato sui risultati effettivi
      const hasMore = this.hasMoreFromPagination(doc, results, page);
      
      return {
        results,
        hasMore,
        page
      };
      
    } catch (error) {
      console.error('Search error:', error);
      return {
        results: [],
        hasMore: false,
        page
      };
    }
  }

  // Tutte le categorie
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

    GENRES.forEach(slug => {
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      categories.genres.push({
        id: slug,
        name,
        slug
      });
    });

    ['shounen', 'shoujo', 'seinen', 'josei'].forEach(slug => {
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      categories.demographics.push({
        id: slug,
        name,
        slug
      });
    });

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
