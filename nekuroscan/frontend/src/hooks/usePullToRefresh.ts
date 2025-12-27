/**
 * USE PULL TO REFRESH - Hook per pull to refresh gesture
 * ✅ SEZIONE 4.3: Touch Gestures - Pull to refresh
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Min distance to trigger refresh (default: 80px)
  enabled?: boolean;
  disabled?: boolean;
}

interface PullState {
  startY: number;
  currentY: number;
  isPulling: boolean;
  isRefreshing: boolean;
}

export const usePullToRefresh = (options: PullToRefreshOptions) => {
  const {
    onRefresh,
    threshold = 80,
    enabled = true,
    disabled = false
  } = options;

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const stateRef = useRef<PullState>({
    startY: 0,
    currentY: 0,
    isPulling: false,
    isRefreshing: false
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || disabled || stateRef.current.isRefreshing) return;
    
    // Solo se siamo in cima alla pagina
    if (window.scrollY > 10) return;

    const touch = e.touches[0];
    stateRef.current.startY = touch.clientY;
    stateRef.current.isPulling = true;
  }, [enabled, disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || disabled || !stateRef.current.isPulling || stateRef.current.isRefreshing) return;
    
    // Solo se siamo in cima alla pagina
    if (window.scrollY > 10) {
      stateRef.current.isPulling = false;
      setPullDistance(0);
      return;
    }

    const touch = e.touches[0];
    const deltaY = touch.clientY - stateRef.current.startY;

    // Solo se stiamo tirando verso il basso
    if (deltaY > 0) {
      // Calcola distanza con resistenza (easing)
      const distance = Math.min(deltaY * 0.6, threshold * 1.5); // Max 1.5x threshold
      setPullDistance(distance);
      stateRef.current.currentY = touch.clientY;

      // Preveni scroll nativo se stiamo tirando
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [enabled, disabled, threshold]);

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!enabled || disabled || !stateRef.current.isPulling || stateRef.current.isRefreshing) {
      stateRef.current.isPulling = false;
      setPullDistance(0);
      return;
    }

    stateRef.current.isPulling = false;
    const currentDistance = pullDistance;

    // Se abbiamo superato la soglia, trigger refresh
    if (currentDistance >= threshold) {
      setIsRefreshing(true);
      stateRef.current.isRefreshing = true;
      setPullDistance(0);

      try {
        await onRefresh();
      } catch (error) {
        console.error('[PullToRefresh] Error during refresh:', error);
      } finally {
        setIsRefreshing(false);
        stateRef.current.isRefreshing = false;
      }
    } else {
      // Reset smooth
      setPullDistance(0);
    }
  }, [enabled, disabled, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (!enabled || disabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullDistance,
    isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1) // 0-1
  };
};

