// ✅ useChapterPreload - Hook per preload capitolo con loading screen
import { useState, useEffect, useCallback } from 'react';
import { preloadImage } from '../utils/imageQueue';
import { getProxyImageUrl } from '../utils/readerHelpers';

export function useChapterPreload(chapter, options = {}) {
  const {
    preloadCount = 5,
    minLoadTime = 3000,
    enabled = true
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (!enabled || !chapter?.pages || chapter.pages.length === 0) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const startTime = Date.now();

    const preload = async () => {
      setIsLoading(true);
      setProgress(0);
      setLoadedCount(0);

      // Preload prime N pagine
      const pagesToPreload = Math.min(preloadCount, chapter.pages.length);
      
      for (let i = 0; i < pagesToPreload; i++) {
        if (!mounted) break;

        const pageUrl = chapter.pages[i];
        if (!pageUrl) continue;

        const proxiedUrl = getProxyImageUrl(pageUrl);
        const priority = i === 0 ? 10 : (i < 3 ? 5 : 1);

        try {
          await preloadImage(proxiedUrl, priority);
          
          if (mounted) {
            setLoadedCount(i + 1);
            setProgress(((i + 1) / pagesToPreload) * 80); // 0-80% per preload
          }
        } catch (error) {
          console.warn(`Failed to preload page ${i}:`, error);
        }
      }

      // Progress 80-100% per minimum delay
      if (mounted) {
        setProgress(90);
        
        // Aspetta minLoadTime
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minLoadTime - elapsed);
        
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining));
        }
        
        if (mounted) {
          setProgress(100);
          
          // Small delay per smooth transition
          setTimeout(() => {
            if (mounted) {
              setIsLoading(false);
            }
          }, 300);
        }
      }
    };

    preload();

    return () => {
      mounted = false;
    };
  }, [chapter, preloadCount, minLoadTime, enabled]);

  const reset = useCallback(() => {
    setIsLoading(true);
    setProgress(0);
    setLoadedCount(0);
  }, []);

  return {
    isLoading,
    progress,
    loadedCount,
    totalToLoad: preloadCount,
    reset
  };
}

export default useChapterPreload;

