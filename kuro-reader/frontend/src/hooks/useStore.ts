/**
 * USE STORE - Global app state management
 * Zustand store with persistence for user preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Manga, ReadingMode } from '@/types/manga';

// ========== TYPES ==========

interface Preferences {
  theme: 'dark' | 'light';
  fontSize: 'sm' | 'md' | 'lg';
  readingMode: ReadingMode;
  autoBookmark: boolean;
  preloadImages: boolean;
}

interface BookmarkEntry {
  mangaUrl: string;
  chapterIndex: number;
  pageIndex: number;
  timestamp: string;
}

interface MangaWithTimestamp extends Manga {
  lastRead: string;
}

interface StoreState {
  preferences: Preferences;
  currentReading: Manga | null;
  readingHistory: MangaWithTimestamp[];
  bookmarks: BookmarkEntry[];
  favorites: Manga[];
  isLoading: boolean;
  error: string | null;
}

interface StoreActions {
  setPreferences: (prefs: Partial<Preferences>) => void;
  addToHistory: (manga: Manga) => void;
  addToFavorites: (manga: Manga) => void;
  removeFromFavorites: (mangaUrl: string) => void;
  addBookmark: (mangaUrl: string, chapterIndex: number, pageIndex?: number) => void;
  getBookmark: (mangaUrl: string) => BookmarkEntry | undefined;
  setCurrentReading: (manga: Manga | null) => void;
  clearHistory: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type Store = StoreState & StoreActions;

// ========== STORE ==========

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // STATE
      preferences: {
        theme: 'dark',
        fontSize: 'md',
        readingMode: 'single',
        autoBookmark: true,
        preloadImages: true,
      },
      
      currentReading: null,
      readingHistory: [],
      bookmarks: [],
      favorites: [],
      isLoading: false,
      error: null,
      
      // ACTIONS
      setPreferences: (prefs) => set((state) => ({
        preferences: { ...state.preferences, ...prefs }
      })),
      
      addToHistory: (manga) => set((state) => {
        const history = [...state.readingHistory];
        const index = history.findIndex(h => h.url === manga.url);
        
        if (index !== -1) {
          history.splice(index, 1);
        }
        
        history.unshift({
          ...manga,
          lastRead: new Date().toISOString()
        });
        
        return { readingHistory: history.slice(0, 100) };
      }),
      
      addToFavorites: (manga) => set((state) => {
        const favorites = [...state.favorites];
        const exists = favorites.some(f => f.url === manga.url);
        
        if (!exists) {
          favorites.unshift(manga);
        }
        
        return { favorites };
      }),
      
      removeFromFavorites: (mangaUrl) => set((state) => ({
        favorites: state.favorites.filter(f => f.url !== mangaUrl)
      })),
      
      addBookmark: (mangaUrl, chapterIndex, pageIndex = 0) => set((state) => {
        const bookmarks = [...state.bookmarks];
        const index = bookmarks.findIndex(b => b.mangaUrl === mangaUrl);
        
        const bookmark: BookmarkEntry = {
          mangaUrl,
          chapterIndex,
          pageIndex,
          timestamp: new Date().toISOString()
        };
        
        if (index !== -1) {
          bookmarks[index] = bookmark;
        } else {
          bookmarks.push(bookmark);
        }
        
        return { bookmarks };
      }),
      
      getBookmark: (mangaUrl) => {
        const state = get();
        return state.bookmarks.find(b => b.mangaUrl === mangaUrl);
      },
      
      setCurrentReading: (manga) => set({ currentReading: manga }),
      clearHistory: () => set({ readingHistory: [] }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'kuro-reader-store',
      partialize: (state) => ({
        preferences: state.preferences,
        readingHistory: state.readingHistory,
        bookmarks: state.bookmarks,
        favorites: state.favorites,
      }),
    }
  )
);

export default useStore;

