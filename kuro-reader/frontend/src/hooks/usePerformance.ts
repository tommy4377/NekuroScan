/**
 * USE PERFORMANCE - Performance optimization hooks
 * Provides debounce, throttle, scroll, resize, idle detection, RAF, and monitoring
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ========== TYPES ==========

interface WindowSize {
  width: number;
  height: number;
}

interface ScrollState {
  scrollY: number;
  scrollDirection: 'up' | 'down';
  isScrolling: boolean;
}

interface MemoryMetrics {
  used: string;
  total: string;
}

interface TimingMetrics {
  dns: number;
  tcp: number;
  request: number;
  response: number;
  dom: number;
  load: number;
}

interface PerformanceMetrics {
  memory: MemoryMetrics | null;
  timing: TimingMetrics | null;
}

interface PerformanceMonitorReturn {
  fps: number;
  metrics: PerformanceMetrics;
}

interface OptimizedScrollOptions {
  throttleDelay?: number;
}

// Extend Performance interface for memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// ========== HOOKS ==========

/**
 * Debounce: Executes callback only after user stopped triggering the event
 * Useful for: input search, resize, scroll stop detection
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  
  // Update callback ref to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
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
 * Throttle: Limits callback execution to max once every X ms
 * Useful for: scroll events, resize, mouse move
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  limit = 100
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false);
  const lastRan = useRef(Date.now());
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  const throttledCallback = useCallback((...args: Parameters<T>) => {
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
 * Hook for optimized scroll events
 * Combines throttling and scroll direction tracking
 */
export function useOptimizedScroll(options: OptimizedScrollOptions = {}): ScrollState {
  const { throttleDelay = 100 } = options;
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const handleScroll = useThrottle(() => {
    const currentScrollY = window.scrollY;
    
    setScrollY(currentScrollY);
    setIsScrolling(true);
    
    // Determine direction
    if (currentScrollY > lastScrollY.current) {
      setScrollDirection('down');
    } else if (currentScrollY < lastScrollY.current) {
      setScrollDirection('up');
    }
    
    lastScrollY.current = currentScrollY;
    
    // Reset isScrolling after 150ms of inactivity
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
 * Hook for optimized resize
 * Uses debouncing to avoid too many re-renders
 */
export function useOptimizedResize(delay = 150): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
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
 * Hook to detect when user is idle (inactive)
 * Useful for pausing animations or fetches when not interacting
 */
export function useIdleDetection(timeout = 30000): boolean {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
    
    // Start the timer
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
 * Hook for optimized Request Animation Frame
 * Syncs updates with browser refresh rate for smooth animations
 */
export function useRAF(callback: (deltaTime: number) => void, isRunning = true): void {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!isRunning) return;
    
    const animate = (time: number): void => {
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
 * Hook for performance monitoring
 * Monitors FPS and performance metrics
 */
export function usePerformanceMonitor(): PerformanceMonitorReturn {
  const [fps, setFps] = useState(60);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: null,
    timing: null
  });
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    
    const measureFPS = (currentTime: number): void => {
      frameCount++;
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
        
        // Measure memory (if available)
        if (performance.memory) {
          setMetrics(prev => ({
            ...prev,
            memory: {
              used: (performance.memory!.usedJSHeapSize / 1048576).toFixed(2),
              total: (performance.memory!.totalJSHeapSize / 1048576).toFixed(2)
            }
          }));
        }
      }
      
      rafId = requestAnimationFrame(measureFPS);
    };
    
    rafId = requestAnimationFrame(measureFPS);
    
    // Get Navigation Timing
    if (performance.getEntriesByType) {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
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

