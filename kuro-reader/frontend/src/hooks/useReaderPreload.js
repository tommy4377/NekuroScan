// ✅ useReaderPreload - Hook per preload intelligente nel reader
import { useEffect, useRef } from 'react';
import { preloadNextPages } from '../utils/readerHelpers';
import { preloadImage } from '../utils/imageQueue';
import { getProxyImageUrl } from '../utils/readerHelpers';

export function useReaderPreload(pages, currentPage, readingMode, options = {}) {
  const {
    preloadCount = 2,
    enabled = true,
    priority = true
  } = options;
  
  const preloadedRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || !pages || pages.length === 0) return;
    
    // Skip per webtoon (ha virtual scroll)
    if (readingMode === 'webtoon') return;
    
    // Cleanup vecchi preload
    if (preloadedRef.current.size > 20) {
      preloadedRef.current.clear();
    }
    
    // Preload pagine successive
    const preloadPromises = [];
    
    for (let i = 1; i <= preloadCount; i++) {
      const nextIdx = currentPage + i;
      
      if (nextIdx >= pages.length) break;
      
      const pageUrl = pages[nextIdx];
      if (!pageUrl || preloadedRef.current.has(pageUrl)) continue;
      
      const proxiedUrl = getProxyImageUrl(pageUrl);
      const imagePriority = i === 1 ? 10 : (i === 2 ? 5 : 1);
      
      preloadedRef.current.add(pageUrl);
      preloadPromises.push(
        preloadImage(proxiedUrl, imagePriority).catch(() => {
          preloadedRef.current.delete(pageUrl);
        })
      );
    }
    
    return () => {
      // Cleanup on unmount
      if (preloadPromises.length > 0) {
        preloadPromises.forEach(p => p.catch(() => {}));
      }
    };
  }, [currentPage, pages, readingMode, preloadCount, enabled, priority]);
  
  return {
    preloadedCount: preloadedRef.current.size,
    clearPreloaded: () => preloadedRef.current.clear()
  };
}

export default useReaderPreload;

