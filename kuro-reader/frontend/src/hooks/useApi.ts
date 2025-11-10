/**
 * USE API - Wrapper hooks for API calls with loading/error states
 */

import { useState, useEffect, useCallback } from 'react';
import type { Manga, MangaDetails, MangaSource } from '@/types/manga';
import type { SearchMangaResponse } from '@/types/api';
import apiManager from '@/api';
import { useStore } from './useStore';

// ========== TYPES ==========

interface ApiOptions {
  showGlobalLoading?: boolean;
  showGlobalError?: boolean;
}

interface UseApiReturn {
  loading: boolean;
  error: string | null;
  searchManga: (query: string) => Promise<SearchMangaResponse>;
  getMangaDetails: (url: string, source: MangaSource) => Promise<MangaDetails | null>;
  getChapterPages: (chapterUrl: string, source: MangaSource) => Promise<string[]>;
  getTrending: () => Promise<Manga[]>;
  request: <T>(apiCall: () => Promise<T>, options?: ApiOptions) => Promise<T>;
}

interface UseMangaReturn {
  manga: MangaDetails | null;
  loading: boolean;
  error: string | null;
}

interface UseChapterReturn {
  pages: string[] | null;
  loading: boolean;
  error: string | null;
}

// ========== HOOKS ==========

export function useApi(): UseApiReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setLoading: setGlobalLoading, setError: setGlobalError } = useStore();

  const request = useCallback(async <T,>(
    apiCall: () => Promise<T>, 
    options: ApiOptions = {}
  ): Promise<T> => {
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
      const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore';
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

  const searchManga = useCallback(async (query: string): Promise<SearchMangaResponse> => {
    return request(() => apiManager.searchAll(query));
  }, [request]);

  const getMangaDetails = useCallback(async (url: string, source: MangaSource): Promise<MangaDetails | null> => {
    return request(() => apiManager.getMangaDetails(url, source));
  }, [request]);

  const getChapterPages = useCallback(async (chapterUrl: string, source: MangaSource): Promise<string[]> => {
    return request(() => apiManager.getChapterPages(chapterUrl, source));
  }, [request]);

  const getTrending = useCallback(async (): Promise<Manga[]> => {
    return request(() => apiManager.getTrending());
  }, [request]);

  return {
    loading,
    error,
    searchManga,
    getMangaDetails,
    getChapterPages,
    getTrending,
    request
  };
}

export function useManga(mangaUrl: string | undefined, source: MangaSource | undefined): UseMangaReturn {
  const [manga, setManga] = useState<MangaDetails | null>(null);
  const { getMangaDetails, loading, error } = useApi();

  useEffect(() => {
    if (mangaUrl && source) {
      getMangaDetails(mangaUrl, source)
        .then(setManga)
        .catch(() => {
          // Silent fail - error already handled by useApi
        });
    }
  }, [mangaUrl, source, getMangaDetails]);

  return { manga, loading, error };
}

export function useChapter(chapterUrl: string | undefined, source: MangaSource | undefined): UseChapterReturn {
  const [pages, setPages] = useState<string[] | null>(null);
  const { getChapterPages, loading, error } = useApi();

  useEffect(() => {
    if (chapterUrl && source) {
      getChapterPages(chapterUrl, source)
        .then(setPages)
        .catch(() => {
          // Silent fail - error already handled by useApi
        });
    }
  }, [chapterUrl, source, getChapterPages]);

  return { pages, loading, error };
}

