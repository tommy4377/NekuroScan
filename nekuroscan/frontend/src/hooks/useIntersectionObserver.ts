/**
 * USE INTERSECTION OBSERVER - Optimized lazy loading hook
 * Observes when elements enter viewport with performance optimizations
 */

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

// ========== TYPES ==========

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseLazyListReturn<T> {
  itemsToRender: T[];
  hasMore: boolean;
  loadMore: () => void;
}

// ========== HOOKS ==========

/**
 * Hook to observe when an element enters the viewport
 * @param options - IntersectionObserver options
 * @returns [ref to assign to element, isVisible]
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [RefObject<HTMLElement>, boolean] {
  const {
    threshold = 0.1,
    rootMargin = '50px', // Load before it enters viewport
    triggerOnce = true
  } = options;
  
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // If already visible and triggerOnce, do nothing
    if (isVisible && triggerOnce) return;

    // Support for old browsers
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        
        const visible = entry.isIntersecting;
        
        if (visible) {
          setIsVisible(true);
          
          // If triggerOnce, disconnect after first visibility
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
 * Hook for lazy loading lists/grids with light virtualization
 * Loads elements progressively when scrolling
 * @param items - Array of items to render
 * @param initialCount - Initial number of elements (default 12)
 * @param increment - How many elements to load at once (default 6)
 * @returns [itemsToRender, hasMore, loadMore]
 */
export function useLazyList<T>(
  items: T[],
  initialCount = 12,
  increment = 6
): UseLazyListReturn<T> {
  const [count, setCount] = useState(initialCount);
  const hasMore = count < items.length;
  
  const loadMore = (): void => {
    if (hasMore) {
      setCount(prev => Math.min(prev + increment, items.length));
    }
  };
  
  const itemsToRender = items.slice(0, count);
  
  return {
    itemsToRender,
    hasMore,
    loadMore
  };
}

export default useIntersectionObserver;

