// 🔍 SEARCH HISTORY - Cronologia ricerche
const MAX_HISTORY = 20;

export const searchHistory = {
  // Aggiungi ricerca alla cronologia
  add(query) {
    if (!query || query.length < 2) return;
    
    const history = this.getAll();
    
    // Rimuovi duplicati
    const filtered = history.filter(item => 
      item.query.toLowerCase() !== query.toLowerCase()
    );
    
    // Aggiungi in cima
    filtered.unshift({
      query: query.trim(),
      timestamp: new Date().toISOString()
    });
    
    // Limita a MAX_HISTORY
    const trimmed = filtered.slice(0, MAX_HISTORY);
    
    localStorage.setItem('searchHistory', JSON.stringify(trimmed));
    return trimmed;
  },

  // Ottieni tutta la cronologia
  getAll() {
    try {
      return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch {
      return [];
    }
  },

  // Ottieni suggerimenti basati su input parziale
  getSuggestions(partialQuery, limit = 5) {
    if (!partialQuery || partialQuery.length < 2) return [];
    
    const history = this.getAll();
    const lower = partialQuery.toLowerCase();
    
    return history
      .filter(item => item.query.toLowerCase().includes(lower))
      .slice(0, limit)
      .map(item => item.query);
  },

  // Rimuovi singola ricerca
  remove(query) {
    const history = this.getAll();
    const filtered = history.filter(item => item.query !== query);
    localStorage.setItem('searchHistory', JSON.stringify(filtered));
    return filtered;
  },

  // Pulisci tutta la cronologia
  clear() {
    localStorage.removeItem('searchHistory');
    return [];
  },

  // Ottieni ricerche recenti (ultimi N giorni)
  getRecent(days = 7) {
    const history = this.getAll();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return history.filter(item => {
      const timestamp = new Date(item.timestamp).getTime();
      return timestamp >= cutoff;
    });
  },

  // Statistiche ricerche
  getStats() {
    const history = this.getAll();
    
    return {
      total: history.length,
      recent7days: this.getRecent(7).length,
      recent30days: this.getRecent(30).length,
      mostRecent: history[0]?.query || null,
      oldest: history[history.length - 1]?.query || null
    };
  }
};

export default searchHistory;

