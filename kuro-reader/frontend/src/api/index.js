import { MangaWorldAdultAPI } from './mangaWorldAdult';
import { NovelCoolAPI } from './novelCool';
import { MangaWorldAPI } from './mangaWorld';

class APIManager {
  constructor() {
    this.apis = {
      mangaWorldAdult: new MangaWorldAdultAPI(),
      novelCool: new NovelCoolAPI(),
      mangaWorld: new MangaWorldAPI()
    };
    
    this.searchPriority = ['mangaWorld', 'mangaWorldAdult', 'novelCool'];
  }

  async searchAll(query) {
    const results = {
      manga: [],
      novels: [],
      all: []
    };

    // Ricerca parallela su tutte le API
    const searchPromises = this.searchPriority.map(apiName => 
      this.apis[apiName].search(query).catch(err => {
        console.error(`${apiName} search failed:`, err);
        return [];
      })
    );

    const allResults = await Promise.all(searchPromises);
    
    // Combina i risultati
    allResults.forEach((apiResults, index) => {
      const apiName = this.searchPriority[index];
      const type = apiName.includes('novel') ? 'novels' : 'manga';
      
      apiResults.forEach(result => {
        const enrichedResult = {
          ...result,
          source: apiName,
          type
        };
        
        results[type].push(enrichedResult);
        results.all.push(enrichedResult);
      });
    });

    // Rimuovi duplicati basandoti sul titolo
    results.all = this.removeDuplicates(results.all);
    
    return results;
  }

  async getMangaDetails(url, source) {
    try {
      const api = this.apis[source];
      if (!api) throw new Error(`Unknown source: ${source}`);
      
      return await api.getMangaFromUrl(url);
    } catch (error) {
      console.error(`Failed to get details from ${source}:`, error);
      
      // Prova con un'altra API se fallisce
      for (const apiName of this.searchPriority) {
        if (apiName !== source) {
          try {
            return await this.apis[apiName].getMangaFromUrl(url);
          } catch (err) {
            continue;
          }
        }
      }
      
      throw error;
    }
  }

  async getChapter(chapterUrl, source) {
    try {
      const api = this.apis[source];
      if (!api) throw new Error(`Unknown source: ${source}`);
      
      return await api.getChapterDetail(chapterUrl);
    } catch (error) {
      console.error(`Failed to get chapter from ${source}:`, error);
      throw error;
    }
  }

  async getTrending() {
    const trending = [];
    
    const trendingPromises = this.searchPriority.map(apiName =>
      this.apis[apiName].getTrending().catch(() => [])
    );
    
    const allTrending = await Promise.all(trendingPromises);
    
    allTrending.forEach((apiTrending, index) => {
      const apiName = this.searchPriority[index];
      apiTrending.forEach(item => {
        trending.push({
          ...item,
          source: apiName
        });
      });
    });
    
    return this.removeDuplicates(trending).slice(0, 20);
  }

  removeDuplicates(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export default new APIManager();