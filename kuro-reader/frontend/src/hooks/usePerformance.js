// usePerformance.js - Hook per ottimizzazione performance eventi

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounce: Esegue callback solo dopo che l'utente ha smesso di triggerare l'evento
 * Utile per: input search, resize, scroll stop detection
 * 
 * @param {Function} callback - Funzione da eseguire
 * @param {number} delay - Ritardo in ms (default 300)
 * @returns {Function} - Funzione debounced
 */
export function useDebounce(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  
  // Aggiorna callback ref per evitare stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}

/**
 * Throttle: Limita l'esecuzione della callback a max una volta ogni X ms
 * Utile per: scroll events, resize, mouse move
 * 
 * @param {Function} callback - Funzione da eseguire
 * @param {number} limit - Intervallo minimo tra esecuzioni in ms (default 100)
 * @returns {Function} - Funzione throttled
 */
export function useThrottle(callback, limit = 100) {
  const inThrottle = useRef(false);
  const lastRan = useRef(Date.now());
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  const throttledCallback = useCallback((...args) => {
    if (!inThrottle.current) {
      callbackRef.current(...args);
      lastRan.current = Date.now();
      inThrottle.current = true;
      
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [limit]);
  
  return throttledCallback;
}

/**
 * Hook per ottimizzare scroll events
 * Combina throttling e tracking direzione scroll
 * 
 * @param {Object} options - Opzioni
 * @returns {Object} - { scrollY, scrollDirection, isScrolling }
 */
export function useOptimizedScroll(options = {}) {
  const { throttleDelay = 100 } = options;
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('down');
  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);
  
  const handleScroll = useThrottle(() => {
    const currentScrollY = window.scrollY;
    
    setScrollY(currentScrollY);
    setIsScrolling(true);
    
    // Determina direzione
    if (currentScrollY > lastScrollY.current) {
      setScrollDirection('down');
    } else if (currentScrollY < lastScrollY.current) {
      setScrollDirection('up');
    }
    
    lastScrollY.current = currentScrollY;
    
    // Reset isScrolling dopo 150ms di inattività
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, throttleDelay);
  
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleScroll]);
  
  return { scrollY, scrollDirection, isScrolling };
}

/**
 * Hook per resize ottimizzato
 * Usa debouncing per evitare troppi re-render
 * 
 * @param {number} delay - Debounce delay (default 150)
 * @returns {Object} - { width, height }
 */
export function useOptimizedResize(delay = 150) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  
  const handleResize = useDebounce(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, delay);
  
  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);
  
  return windowSize;
}

/**
 * Hook per rilevare quando l'utente è idle (inattivo)
 * Utile per pausare animazioni o fetch quando non interagisce
 * 
 * @param {number} timeout - Tempo di inattività in ms (default 30000 = 30s)
 * @returns {boolean} - true se idle
 */
export function useIdleDetection(timeout = 30000) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef(null);
  
  const resetTimer = useCallback(() => {
    setIsIdle(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeout);
  }, [timeout]);
  
  useEffect(() => {
    // Eventi che indicano attività utente
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
    
    // Inizia il timer
    resetTimer();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);
  
  return isIdle;
}

/**
 * Hook per Request Animation Frame ottimizzato
 * Sincronizza updates con il browser refresh rate per animazioni smooth
 * 
 * @param {Function} callback - Funzione da eseguire ogni frame
 * @param {boolean} isRunning - Se l'animazione deve essere attiva
 */
export function useRAF(callback, isRunning = true) {
  const requestRef = useRef();
  const previousTimeRef = useRef();
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!isRunning) return;
    
    const animate = (time) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callbackRef.current(deltaTime);
      }
      
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning]);
}

/**
 * Hook per performance monitoring
 * Monitora FPS e performance metrics
 */
export function usePerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const [metrics, setMetrics] = useState({
    memory: null,
    timing: null
  });
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId;
    
    const measureFPS = (currentTime) => {
      frameCount++;
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
        
        // Misura memoria (se disponibile)
        if (performance.memory) {
          setMetrics(prev => ({
            ...prev,
            memory: {
              used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
              total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2)
            }
          }));
        }
      }
      
      rafId = requestAnimationFrame(measureFPS);
    };
    
    rafId = requestAnimationFrame(measureFPS);
    
    // Ottieni Navigation Timing
    if (performance.getEntriesByType) {
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        setMetrics(prev => ({
          ...prev,
          timing: {
            dns: Math.round(navTiming.domainLookupEnd - navTiming.domainLookupStart),
            tcp: Math.round(navTiming.connectEnd - navTiming.connectStart),
            request: Math.round(navTiming.responseStart - navTiming.requestStart),
            response: Math.round(navTiming.responseEnd - navTiming.responseStart),
            dom: Math.round(navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart),
            load: Math.round(navTiming.loadEventEnd - navTiming.loadEventStart)
          }
        }));
      }
    }
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);
  
  return { fps, metrics };
}

export default {
  useDebounce,
  useThrottle,
  useOptimizedScroll,
  useOptimizedResize,
  useIdleDetection,
  useRAF,
  usePerformanceMonitor
};

