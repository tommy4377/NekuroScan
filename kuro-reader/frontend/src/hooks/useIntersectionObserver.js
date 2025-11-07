// Hook per IntersectionObserver - Lazy loading avanzato
import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        rootMargin: options.rootMargin || '200px', // Precarica 200px prima
        threshold: options.threshold || 0.01,
        ...options
      }
    );

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [options.rootMargin, options.threshold, hasIntersected]);

  return { targetRef, isIntersecting, hasIntersected };
}

export default useIntersectionObserver;

