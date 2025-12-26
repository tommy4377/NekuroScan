/**
 * USE CHAPTER PRELOAD - Preload chapter images
 * Efficiently preloads first 10 images with abort support
 */

import { useEffect, useRef, useState } from 'react';
import { config } from '@/config';

// ========== TYPES ==========

interface UseChapterPreloadReturn {
  progress: number;
  loadedCount: number;
  isComplete: boolean;
  totalToLoad: number;
}

// ========== CONSTANTS ==========

const CDN_PATTERN = atob('Y2RuLm1hbmdhd29ybGQ=');
const MAX_PRELOAD = 10;
const IMAGE_TIMEOUT = 10000; // 10 seconds per image

// ========== HOOK ==========

export function useChapterPreload(
  chapterPages: string[] = [], 
  enabled: boolean = true
): UseChapterPreloadReturn {
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const loadedUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !chapterPages || chapterPages.length === 0) {
      setIsComplete(true);
      return;
    }

    // Reset state
    setProgress(0);
    setLoadedCount(0);
    setIsComplete(false);
    loadedUrls.current = new Set();
    
    // Create new AbortController for this session
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    const preloadImages = async (): Promise<void> => {
      const totalImages = Math.min(chapterPages.length, MAX_PRELOAD);
      let loaded = 0;

      const loadPromises = chapterPages.slice(0, totalImages).map(async (url) => {
        if (signal.aborted) return;

        try {
          const img = new Image();
          
          // Determine if CDN requires proxy
          const needsProxy = url.includes(CDN_PATTERN);
          
          const imageUrl = needsProxy 
            ? `${config.PROXY_URL || ''}/api/image-proxy?url=${encodeURIComponent(url)}`
            : url;

          await new Promise<void>((resolve) => {
            if (signal.aborted) {
              resolve();
              return;
            }

            let timeoutId: ReturnType<typeof setTimeout>;

            const onLoad = (): void => {
              if (timeoutId) clearTimeout(timeoutId);
              if (!signal.aborted) {
                loaded++;
                loadedUrls.current.add(url);
                setLoadedCount(loaded);
                setProgress((loaded / totalImages) * 100);
              }
              resolve();
            };

            const onError = (): void => {
              if (timeoutId) clearTimeout(timeoutId);
              if (!signal.aborted) {
                loaded++;
                setLoadedCount(loaded);
                setProgress((loaded / totalImages) * 100);
              }
              resolve();
            };

            // Timeout to prevent blocking
            timeoutId = setTimeout(() => {
              if (!signal.aborted) {
                loaded++;
                setLoadedCount(loaded);
                setProgress((loaded / totalImages) * 100);
              }
              resolve();
            }, IMAGE_TIMEOUT);

            img.onload = onLoad;
            img.onerror = onError;
            img.src = imageUrl;
          });
        } catch {
          if (!signal.aborted) {
            loaded++;
            setLoadedCount(loaded);
            setProgress((loaded / totalImages) * 100);
          }
        }
      });

      await Promise.all(loadPromises);

      if (!signal.aborted) {
        setIsComplete(true);
      }
    };

    preloadImages();

    // Cleanup
    return () => {
      abortController.current?.abort();
    };
  }, [chapterPages, enabled]);

  return {
    progress,
    loadedCount,
    isComplete,
    totalToLoad: Math.min(chapterPages.length, MAX_PRELOAD)
  };
}

export default useChapterPreload;

