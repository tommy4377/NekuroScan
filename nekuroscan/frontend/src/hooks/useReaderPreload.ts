/**
 * USE READER PRELOAD - Intelligent preloading for reader
 * Preloads next pages to improve reading experience
 */

import { useEffect, useRef } from 'react';
import { preloadImage } from '@/utils/imageQueue';
import { getProxyImageUrl } from '@/utils/readerHelpers';

// ========== TYPES ==========

interface UseReaderPreloadOptions {
  preloadCount?: number;
  enabled?: boolean;
  priority?: boolean;
}

interface UseReaderPreloadReturn {
  preloadedCount: number;
  clearPreloaded: () => void;
}

// ========== HOOK ==========

export function useReaderPreload(
  pages: string[] | undefined,
  currentPage: number,
  readingMode: string,
  options: UseReaderPreloadOptions = {}
): UseReaderPreloadReturn {
  const {
    preloadCount = 2,
    enabled = true,
  } = options;
  
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !pages || pages.length === 0) return;
    
    // Skip for webtoon (has virtual scroll)
    if (readingMode === 'webtoon') return;
    
    // Cleanup old preloads
    if (preloadedRef.current.size > 20) {
      preloadedRef.current.clear();
    }
    
    let cancelled = false;
    
    // Preload next pages
    const preload = async (): Promise<void> => {
      for (let i = 1; i <= preloadCount; i++) {
        if (cancelled) break;
        
        const nextIdx = currentPage + i;
        if (nextIdx >= pages.length) break;
        
        const pageUrl = pages[nextIdx];
        if (!pageUrl || preloadedRef.current.has(pageUrl)) continue;
        
        const proxiedUrl = getProxyImageUrl(pageUrl);
        const imagePriority = i === 1 ? 10 : (i === 2 ? 5 : 1);
        
        preloadedRef.current.add(pageUrl);
        
        try {
          await preloadImage(proxiedUrl, imagePriority);
        } catch {
          if (!cancelled) {
            preloadedRef.current.delete(pageUrl);
          }
        }
      }
    };
    
    preload();
    
    return () => {
      cancelled = true;
    };
  }, [currentPage, pages, readingMode, preloadCount, enabled]);
  
  return {
    preloadedCount: preloadedRef.current.size,
    clearPreloaded: () => preloadedRef.current.clear()
  };
}

export default useReaderPreload;

