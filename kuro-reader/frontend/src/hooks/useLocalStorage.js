import { useState, useEffect, useCallback } from 'react';

export const useLocalStorage = (key, initialValue) => {
  // Get from local storage then parse stored json or return initialValue
  const readValue = useCallback(() => {
    // Prevent build error "window is undefined" but keep working on server side
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState(readValue);

  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Dispatch storage event for other tabs/windows
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(valueToStore),
          oldValue: JSON.stringify(storedValue),
          storageArea: window.localStorage,
          url: window.location.href
        }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          setStoredValue(e.newValue);
        }
      }
    };

    // Listen for changes in other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue, removeValue];
};

// Specific hooks for common use cases
export const useFavorites = () => {
  const [favorites, setFavorites, clearFavorites] = useLocalStorage('favorites', []);
  
  const addFavorite = useCallback((manga) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.url === manga.url);
      if (exists) return prev;
      return [manga, ...prev];
    });
  }, [setFavorites]);
  
  const removeFavorite = useCallback((mangaUrl) => {
    setFavorites(prev => prev.filter(f => f.url !== mangaUrl));
  }, [setFavorites]);
  
  const isFavorite = useCallback((mangaUrl) => {
    return favorites.some(f => f.url === mangaUrl);
  }, [favorites]);
  
  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites
  };
};

export const useReadingProgress = () => {
  const [progress, setProgress] = useLocalStorage('readingProgress', {});
  
  const saveProgress = useCallback((mangaId, chapterId, chapterIndex, page = 0) => {
    setProgress(prev => ({
      ...prev,
      [mangaId]: {
        chapterId,
        chapterIndex,
        page,
        timestamp: new Date().toISOString()
      }
    }));
  }, [setProgress]);
  
  const getProgress = useCallback((mangaId) => {
    return progress[mangaId] || null;
  }, [progress]);
  
  const removeProgress = useCallback((mangaId) => {
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[mangaId];
      return newProgress;
    });
  }, [setProgress]);
  
  return {
    progress,
    saveProgress,
    getProgress,
    removeProgress
  };
};

export const useSettings = () => {
  const [settings, setSettings] = useLocalStorage('settings', {
    readingMode: 'single',
    zoom: 100,
    brightness: 100,
    fitMode: 'width',
    fontSize: 'md',
    theme: 'dark',
    preloadImages: true,
    autoBookmark: true
  });
  
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);
  
  return {
    settings,
    updateSettings
  };
};
