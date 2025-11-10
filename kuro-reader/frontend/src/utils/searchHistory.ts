/**
 * SEARCH HISTORY - Cronologia Ricerche
 * Gestisce la cronologia delle ricerche utente con localStorage
 */

// ========== TYPES ==========

export interface SearchHistoryItem {
  query: string;
  timestamp: string;
}

export interface SearchHistoryStats {
  total: number;
  recent7days: number;
  recent30days: number;
  mostRecent: string | null;
  oldest: string | null;
}

// ========== CONSTANTS ==========

const MAX_HISTORY = 20;
const STORAGE_KEY = 'searchHistory';

// ========== SEARCH HISTORY MANAGER ==========

class SearchHistoryManager {
  /**
   * Aggiungi ricerca alla cronologia
   */
  add(query: string): SearchHistoryItem[] {
    if (!query || query.trim().length < 2) {
      return this.getAll();
    }
    
    const history = this.getAll();
    const normalizedQuery = query.trim();
    
    // Rimuovi duplicati (case-insensitive)
    const filtered = history.filter(
      item => item.query.toLowerCase() !== normalizedQuery.toLowerCase()
    );
    
    // Aggiungi in cima
    const newItem: SearchHistoryItem = {
      query: normalizedQuery,
      timestamp: new Date().toISOString()
    };
    
    filtered.unshift(newItem);
    
    // Limita a MAX_HISTORY
    const trimmed = filtered.slice(0, MAX_HISTORY);
    
    this.save(trimmed);
    return trimmed;
  }

  /**
   * Ottieni tutta la cronologia
   */
  getAll(): SearchHistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  }

  /**
   * Ottieni suggerimenti basati su input parziale
   */
  getSuggestions(partialQuery: string, limit: number = 5): string[] {
    if (!partialQuery || partialQuery.trim().length < 2) {
      return [];
    }
    
    const history = this.getAll();
    const lower = partialQuery.toLowerCase().trim();
    
    return history
      .filter(item => item.query.toLowerCase().includes(lower))
      .slice(0, limit)
      .map(item => item.query);
  }

  /**
   * Rimuovi singola ricerca
   */
  remove(query: string): SearchHistoryItem[] {
    const history = this.getAll();
    const filtered = history.filter(item => item.query !== query);
    
    this.save(filtered);
    return filtered;
  }

  /**
   * Pulisci tutta la cronologia
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  /**
   * Ottieni ricerche recenti (ultimi N giorni)
   */
  getRecent(days: number = 7): SearchHistoryItem[] {
    const history = this.getAll();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return history.filter(item => {
      try {
        const timestamp = new Date(item.timestamp).getTime();
        return timestamp >= cutoff && !isNaN(timestamp);
      } catch {
        return false;
      }
    });
  }

  /**
   * Statistiche ricerche
   */
  getStats(): SearchHistoryStats {
    const history = this.getAll();
    
    return {
      total: history.length,
      recent7days: this.getRecent(7).length,
      recent30days: this.getRecent(30).length,
      mostRecent: history[0]?.query ?? null,
      oldest: history[history.length - 1]?.query ?? null
    };
  }

  /**
   * Esporta cronologia come JSON
   */
  export(): string {
    const history = this.getAll();
    return JSON.stringify(history, null, 2);
  }

  /**
   * Importa cronologia da JSON
   */
  import(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format: expected array');
      }
      
      // Valida items
      const valid = parsed.every(
        item => item && typeof item.query === 'string' && typeof item.timestamp === 'string'
      );
      
      if (!valid) {
        throw new Error('Invalid format: items must have query and timestamp');
      }
      
      this.save(parsed.slice(0, MAX_HISTORY));
      return true;
    } catch (error) {
      console.error('Error importing search history:', error);
      return false;
    }
  }

  /**
   * Salva cronologia in localStorage
   */
  private save(history: SearchHistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }
}

// ========== EXPORT ==========

export const searchHistory = new SearchHistoryManager();
export default searchHistory;

