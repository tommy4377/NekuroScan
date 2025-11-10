/**
 * SMART COLLECTIONS - Automatic intelligent manga collections
 * Generates dynamic collections based on reading patterns
 */

import type { Manga } from '@/types/manga';

// ========== TYPES ==========

interface SmartCollection {
  id: string;
  name: string;
  description: string;
  manga: Manga[];
  color: string;
  auto: true;
}

interface MangaWithProgress extends Manga {
  progress?: number;
  lastRead?: string;
}

interface GenreCounts {
  [genre: string]: number;
}

// ========== HELPERS ==========

function getStoredManga(key: string): MangaWithProgress[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ========== COLLECTIONS ==========

export const smartCollections = {
  getAlmostFinished(): SmartCollection {
    const reading = getStoredManga('reading');
    
    return {
      id: 'almost-finished',
      name: '🎯 Almost Finished',
      description: 'Manga with progress > 80%',
      manga: reading.filter(m => (m.progress ?? 0) > 80),
      color: 'green',
      auto: true
    };
  },

  getStale(): SmartCollection {
    const reading = getStoredManga('reading');
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    return {
      id: 'stale',
      name: '⏰ Not Read for 30+ Days',
      description: 'Manga you haven\'t read in over a month',
      manga: reading.filter(m => {
        if (!m.lastRead) return false;
        const lastRead = new Date(m.lastRead).getTime();
        return lastRead < thirtyDaysAgo;
      }),
      color: 'orange',
      auto: true
    };
  },

  getJustStarted(): SmartCollection {
    const reading = getStoredManga('reading');
    
    return {
      id: 'just-started',
      name: '🌱 Just Started',
      description: 'Progress < 10%',
      manga: reading.filter(m => (m.progress ?? 0) < 10),
      color: 'cyan',
      auto: true
    };
  },

  getInProgress(): SmartCollection {
    const reading = getStoredManga('reading');
    
    return {
      id: 'in-progress',
      name: '📖 In Progress',
      description: 'Progress between 10% and 80%',
      manga: reading.filter(m => {
        const progress = m.progress ?? 0;
        return progress >= 10 && progress <= 80;
      }),
      color: 'blue',
      auto: true
    };
  },

  getNewChapters(): SmartCollection {
    const reading = getStoredManga('reading');
    const favorites = getStoredManga('favorites');
    
    // Combine and deduplicate
    const all = [...reading, ...favorites];
    const unique = Array.from(new Map(all.map(m => [m.url, m])).values());
    
    // Placeholder: would need backend to detect new chapters
    return {
      id: 'new-chapters',
      name: '🆕 New Chapters',
      description: 'Manga with new chapters available',
      manga: unique.filter(() => Math.random() > 0.7), // Placeholder logic
      color: 'purple',
      auto: true
    };
  },

  getUnreadFavorites(): SmartCollection {
    const favorites = getStoredManga('favorites');
    const reading = getStoredManga('reading');
    const completed = getStoredManga('completed');
    
    const readOrCompleted = new Set([...reading, ...completed].map(m => m.url));
    
    return {
      id: 'unread-favorites',
      name: '❤️ Favorites to Read',
      description: 'Favorites you haven\'t started yet',
      manga: favorites.filter(m => !readOrCompleted.has(m.url)),
      color: 'pink',
      auto: true
    };
  },

  getByTopGenre(): SmartCollection | null {
    const reading = getStoredManga('reading');
    const favorites = getStoredManga('favorites');
    
    // Count genres
    const genreCounts: GenreCounts = {};
    [...reading, ...favorites].forEach(manga => {
      if (manga.genres) {
        manga.genres.forEach(g => {
          const genre = typeof g === 'string' ? g : g;
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });
    
    // Find top genre
    const entries = Object.entries(genreCounts);
    if (entries.length === 0) return null;
    
    const topEntry = entries.sort((a, b) => b[1] - a[1])[0];
    if (!topEntry) return null;
    
    const [topGenre] = topEntry;
    
    return {
      id: 'top-genre',
      name: `🎨 Genre: ${topGenre}`,
      description: `Your ${topGenre} manga`,
      manga: [...reading, ...favorites].filter(m => 
        m.genres?.some(g => (typeof g === 'string' ? g : g) === topGenre)
      ),
      color: 'teal',
      auto: true
    };
  },

  getAll(): SmartCollection[] {
    const collections = [
      this.getAlmostFinished(),
      this.getInProgress(),
      this.getJustStarted(),
      this.getStale(),
      this.getNewChapters(),
      this.getUnreadFavorites(),
      this.getByTopGenre()
    ].filter((c): c is SmartCollection => c !== null && c.manga.length > 0);
    
    return collections;
  },

  getById(id: string): SmartCollection | undefined {
    return this.getAll().find(c => c.id === id);
  }
};

export default smartCollections;

