import { useState, useEffect, useCallback } from 'react';
import apiManager from '../api';
import { useStore } from './useStore';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setLoading: setGlobalLoading, setError: setGlobalError } = useStore();

  const request = useCallback(async (apiCall, options = {}) => {
    const { showGlobalLoading = false, showGlobalError = true } = options;
    
    setLoading(true);
    setError(null);
    
    if (showGlobalLoading) {
      setGlobalLoading(true);
    }
    
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Si è verificato un errore';
      setError(errorMessage);
      
      if (showGlobalError) {
        setGlobalError(errorMessage);
      }
      
      throw err;
    } finally {
      setLoading(false);
      if (showGlobalLoading) {
        setGlobalLoading(false);
      }
    }
  }, [setGlobalLoading, setGlobalError]);

  const searchManga = useCallback(async (query) => {
    return request(() => apiManager.searchAll(query));
  }, [request]);

  const getMangaDetails = useCallback(async (url, source) => {
    return request(() => apiManager.getMangaDetails(url, source));
  }, [request]);

  const getChapter = useCallback(async (chapterUrl, source) => {
    return request(() => apiManager.getChapter(chapterUrl, source));
  }, [request]);

  const getTrending = useCallback(async () => {
    return request(() => apiManager.getTrending());
  }, [request]);

  return {
    loading,
    error,
    searchManga,
    getMangaDetails,
    getChapter,
    getTrending,
    request
  };
};

export const useManga = (mangaUrl, source) => {
  const [manga, setManga] = useState(null);
  const { getMangaDetails, loading, error } = useApi();

  useEffect(() => {
    if (mangaUrl && source) {
      getMangaDetails(mangaUrl, source)
        .then(setManga)
        .catch(console.error);
    }
  }, [mangaUrl, source]);

  return { manga, loading, error };
};

export const useChapter = (chapterUrl, source) => {
  const [chapter, setChapter] = useState(null);
  const { getChapter, loading, error } = useApi();

  useEffect(() => {
    if (chapterUrl && source) {
      getChapter(chapterUrl, source)
        .then(setChapter)
        .catch(console.error);
    }
  }, [chapterUrl, source]);

  return { chapter, loading, error };
};
