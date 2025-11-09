// useIntersectionObserver.js - Hook ottimizzato per lazy loading
import { useEffect, useRef, useState } from 'react';

/**
 * Hook per osservare quando un elemento entra nel viewport
 * Ottimizzato per performance con debouncing e threshold
 * 
 * @param {Object} options - Opzioni per IntersectionObserver
 * @param {number} options.threshold - Percentuale visibilità (default 0.1)
 * @param {string} options.rootMargin - Margine extra (default '50px')
 * @param {boolean} options.triggerOnce - Osserva solo una volta (default true)
 * @returns {[React.Ref, boolean]} - [ref da assegnare all'elemento, isVisible]
 */
export function useIntersectionObserver(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '50px', // Carica prima che entri nel viewport
    triggerOnce = true
  } = options;
  
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // Se già visibile e triggerOnce, non fare nulla
    if (isVisible && triggerOnce) return;

    // Supporto per browser vecchi
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        
        if (visible) {
          setIsVisible(true);
          
          // Se triggerOnce, disconnetti dopo la prima visibilità
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, isVisible]);

  return [ref, isVisible];
}

/**
 * Hook per lazy loading di liste/griglie con virtualizzazione leggera
 * Carica elementi progressivamente quando si scrolla
 * 
 * @param {Array} items - Array di elementi da renderizzare
 * @param {number} initialCount - Numero iniziale di elementi (default 12)
 * @param {number} increment - Quanti elementi caricare alla volta (default 6)
 * @returns {[Array, boolean, Function]} - [itemsToRender, hasMore, loadMore]
 */
export function useLazyList(items, initialCount = 12, increment = 6) {
  const [count, setCount] = useState(initialCount);
  const hasMore = count < items.length;
  
  const loadMore = () => {
    if (hasMore) {
      setCount(prev => Math.min(prev + increment, items.length));
    }
  };
  
  const itemsToRender = items.slice(0, count);
  
  return [itemsToRender, hasMore, loadMore];
}

export default useIntersectionObserver;
