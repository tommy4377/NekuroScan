// frontend/src/api/stats.js
import { config } from '../config';

// Generi supportati (inclusi quelli che avevi chiamato "extra" ma che devono funzionare)
const GENRES = [
  'adulti','arti-marziali','avventura','azione','commedia','doujinshi','drammatico','ecchi',
  'fantasy','gender-bender','harem','hentai','horror','josei','lolicon','maturo','mecha','mistero',
  'psicologico','romantico','sci-fi','scolastico','seinen','shotacon','shoujo','shoujo-ai','shounen',
  'shounen-ai','slice-of-life','smut','soprannaturale','sport','storico','tragico','yaoi','yuri',
  'militare','musica','parodia','poliziesco','spazio','vampiri','isekai','reincarnazione',
  'survival','viaggi-nel-tempo','videogiochi','workplace'
];

const BASE = (adult) => adult ? 'https://www.mangaworldadult.net' : 'https://www.mangaworld.cx';

class StatsAPI {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000;
  }

  getCached(k) {
    const c = this.cache.get(k);
    if (c && Date.now() - c.t < this.ttl) return c.v;
    this.cache.delete(k);
    return null;
  }
  setCache(k, v) { this.cache.set(k, { v, t: Date.now() }); }

  async req(url) {
    const r = await fetch(`${config.PROXY_URL}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
    });
    const data = await r.json();
    if (!data.success) throw new Error(data.error || 'Request failed');
    return new DOMParser().parseFromString(data.data, 'text/html');
  }

  // hasMore robusto per entrambe le piattaforme
  hasMoreFromPagination(doc) {
    const byClass = doc.querySelector('ul.pagination li.page-item.next:not(.disabled), ul.pagination li.next:not(.disabled)');
    if (byClass) return true;
    const links = [...doc.querySelectorAll('ul.pagination a, .pagination a, .pagination-container a.page-link')];
    const found = links.some(a => /successivo|next|chevron-right/i.test(a.textContent || a.getAttribute('aria-label') || ''));
    return found;
  }

  // Parser per la griglia "Ultimi capitoli aggiunti" (evita slider di tendenza)
  parseLatestGrid(doc, base) {
    const list = [];
    // entry container standard
    const entries = doc.querySelectorAll('.comics-grid .entry');
    entries.forEach(entry => {
      const link = entry.querySelector('a.thumb, a');
      const img = entry.querySelector('img');
      const title = entry.querySelector('.manga-title, .name')?.textContent?.trim();
      // capitolo più recente dalla prima .xanh nella content-area
      const content = entry.querySelector('.content') || entry;
      const firstXanh = content.querySelector('.xanh');
      // prova a ricavare anche una data (il tag <i> più vicino)
      const firstDate = content.querySelector('i');
      const latestChapter = firstXanh?.textContent
        ?.replace(/^cap\.\s*/i, '')
        ?.replace(/^capitolo\s*/i, '')
        ?.trim() || '';
      const latestDate = firstDate?.textContent?.trim() || '';

      if (link?.href && title) {
        const href = link.getAttribute('href');
        list.push({
          url: href.startsWith('http') ? href : `${base}${href.startsWith('/') ? '' : '/'}${href.replace(/^\//, '')}`,
          title,
          cover: img?.src || img?.dataset?.src || '',
          latestChapter,
          latestDate,
          source: base.includes('adult') ? 'mangaWorldAdult' : 'mangaWorld',
          isAdult: base.includes('adult')
        });
      }
    });
    return list;
  }

  parseArchiveEntries(doc, base) {
    const items = [];
    doc.querySelectorAll('.entry').forEach(entry => {
      const a = entry.querySelector('a');
      const img = entry.querySelector('img');
      const title = entry.querySelector('.name, .title, .manga-title')?.textContent?.trim();
      if (a?.href && title) {
        const href = a.getAttribute('href');
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

  // Recenti con paginazione
  async getLatestUpdates(adult = false, page = 1) {
    const key = `latest_${adult}_${page}`;
    const c = this.getCached(key); if (c) return c;
    const base = BASE(adult);
    const url = `${base}/?page=${page}`;
    const doc = await this.req(url);
    const results = this.parseLatestGrid(doc, base);
    const hasMore = this.hasMoreFromPagination(doc);
    const out = { results, hasMore, page };
    this.setCache(key, out);
    return out;
  }

  // Più letti con paginazione
  async getMostFavorites(adult = false, page = 1) {
    const key = `most_${adult}_${page}`;
    const c = this.getCached(key); if (c) return c;
    const base = BASE(adult);
    const url = `${base}/archive?sort=most_read&page=${page}`;
    const doc = await this.req(url);
    const results = this.parseArchiveEntries(doc, base);
    const hasMore = this.hasMoreFromPagination(doc);
    const out = { results, hasMore, page };
    this.setCache(key, out);
    return out;
  }

  // Top per tipo con paginazione
  async getTopByType(type = 'manga', adult = false, page = 1) {
    const key = `top_${type}_${adult}_${page}`;
    const c = this.getCached(key); if (c) return c;
    const base = BASE(adult);
    const url = `${base}/archive?type=${encodeURIComponent(type)}&sort=most_read&page=${page}`;
    const doc = await this.req(url);
    const results = this.parseArchiveEntries(doc, base);
    const hasMore = this.hasMoreFromPagination(doc);
    const out = { results, hasMore, page };
    this.setCache(key, out);
    return out;
  }

  // Ricerca avanzata (un genere per query; AND multiplo si fa client-side in Categories.jsx)
  async searchAdvanced({
    genres = [],
    types = [],
    status = '',
    year = '',
    sort = 'most_read',
    page = 1,
    adult = false
  } = {}) {
    const base = BASE(adult);
    const params = new URLSearchParams();
    if (genres.length > 0) params.append('genre', genres[0]); // il resto lo intersecti lato UI
    if (types[0]) params.append('type', types[0]);
    if (status) params.append('status', status);
    if (year) params.append('year', year);
    params.append('sort', sort || 'most_read');
    params.append('page', String(page));

    const url = `${base}/archive?${params.toString()}`;
    const doc = await this.req(url);
    const results = this.parseArchiveEntries(doc, base);
    const hasMore = this.hasMoreFromPagination(doc);
    return { results, hasMore, page };
  }

  async getAllCategories() {
    const key = 'all_cats';
    const c = this.getCached(key); if (c) return c;
    const categories = {
      genres: GENRES.map(slug => ({
        id: slug,
        slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
      })),
      themes: ['ecchi','gender-bender','harem','shoujo-ai','shounen-ai','yaoi','yuri'].map(slug => ({
        id: slug, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
      })),
      demographics: ['shounen','shoujo','seinen','josei'].map(slug => ({
        id: slug, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
      })),
      types: [
        { id:'manga', name:'Manga', slug:'manga' },
        { id:'manhwa', name:'Manhwa', slug:'manhwa' },
        { id:'manhua', name:'Manhua', slug:'manhua' },
        { id:'oneshot', name:'Oneshot', slug:'oneshot' },
        { id:'doujinshi', name:'Doujinshi', slug:'doujinshi' }
      ],
      status: [
        { id:'ongoing', name:'In corso', slug:'ongoing' },
        { id:'completed', name:'Completato', slug:'completed' },
        { id:'dropped', name:'Droppato', slug:'dropped' },
        { id:'paused', name:'In pausa', slug:'paused' }
      ],
      years: [],
      sort_options: [
        { id:'most_read', name:'Più letti', value:'most_read' },
        { id:'score', name:'Valutazione', value:'score' },
        { id:'newest', name:'Più recenti', value:'newest' },
        { id:'a-z', name:'A-Z', value:'a-z' },
        { id:'z-a', name:'Z-A', value:'z-a' }
      ]
    };
    const now = new Date().getFullYear();
    for (let y = now; y >= 1990; y--) {
      categories.years.push({ id: String(y), slug: String(y), name: String(y) });
    }
    this.setCache(key, categories);
    return categories;
  }
}

const statsAPI = new StatsAPI();
export default statsAPI;
export { StatsAPI };
