// ✅ useChapterPreload - Hook dedicato per preload immagini capitolo
import { useEffect, useRef, useState } from 'react';
import { config } from '../config';

export function useChapterPreload(chapterPages = [], enabled = true) {
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const abortController = useRef(null);
  const loadedUrls = useRef(new Set());

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
    
    // Crea nuovo AbortController per questa sessione
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    const preloadImages = async () => {
      const totalImages = Math.min(chapterPages.length, 10); // Precarica max 10 immagini
      let loaded = 0;

      const loadPromises = chapterPages.slice(0, totalImages).map(async (url, index) => {
        if (signal.aborted) return;

        try {
          // Crea un nuovo Image element
          const img = new Image();
          
          // Determina se è CDN che richiede proxy
          const cdnPattern = atob('Y2RuLm1hbmdhd29ybGQ=');
          const needsProxy = url.includes(cdnPattern);
          
          // URL da precaricare
          const imageUrl = needsProxy 
            ? `${config.PROXY_URL || 'https://kuro-proxy-server.onrender.com'}/api/image-proxy?url=${encodeURIComponent(url)}`
            : url;

          // Promise per caricare l'immagine
          await new Promise((resolve) => {
            if (signal.aborted) {
              resolve();
              return;
            }

            let timeoutId;

            const onLoad = () => {
              if (timeoutId) clearTimeout(timeoutId);
              if (!signal.aborted) {
                loaded++;
                loadedUrls.current.add(url);
                setLoadedCount(loaded);
                setProgress((loaded / totalImages) * 100);
              }
              resolve();
            };

            const onError = () => {
              if (timeoutId) clearTimeout(timeoutId);
              // Continua anche se un'immagine fallisce
              if (!signal.aborted) {
                loaded++;
                setLoadedCount(loaded);
                setProgress((loaded / totalImages) * 100);
              }
              resolve();
            };

            // Timeout per evitare che si blocchi
            timeoutId = setTimeout(() => {
              if (!signal.aborted) {
                loaded++;
                setLoadedCount(loaded);
                setProgress((loaded / totalImages) * 100);
              }
              resolve();
            }, 10000); // 10 secondi timeout per immagine

            img.onload = onLoad;
            img.onerror = onError;
            
            // Set src DOPO aver impostato i listener
            img.src = imageUrl;
          });
        } catch (err) {
          // Continua anche in caso di errore
          if (!signal.aborted) {
            loaded++;
            setLoadedCount(loaded);
            setProgress((loaded / totalImages) * 100);
          }
        }
      });

      // Aspetta che tutte le immagini siano elaborate
      await Promise.all(loadPromises);

      if (!signal.aborted) {
        setIsComplete(true);
      }
    };

    preloadImages();

    // Cleanup
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [chapterPages, enabled]);

  return {
    progress,
    loadedCount,
    isComplete,
    totalToLoad: Math.min(chapterPages.length, 10)
  };
}

export default useChapterPreload;
