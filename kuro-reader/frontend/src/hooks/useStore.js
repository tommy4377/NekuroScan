import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // User preferences
      preferences: {
        theme: 'dark',
        fontSize: 'md',
        readingMode: 'single',
        autoBookmark: true,
        preloadImages: true,
      },
      
      // Reading state
      currentReading: null,
      readingHistory: [],
      bookmarks: [],
      favorites: [],
      
      // App state
      isLoading: false,
      error: null,
      
      // Actions
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
        
        if (index !== -1) {
          bookmarks[index] = {
            ...bookmarks[index],
            chapterIndex,
            pageIndex,
            timestamp: new Date().toISOString()
          };
        } else {
          bookmarks.push({
            mangaUrl,
            chapterIndex,
            pageIndex,
            timestamp: new Date().toISOString()
          });
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
