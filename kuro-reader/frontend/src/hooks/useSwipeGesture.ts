/**
 * USE SWIPE GESTURE - Detect swipe gestures
 * Handles left/right swipe on touch devices
 */

import { useEffect, useRef } from 'react';

// ========== TYPES ==========

type SwipeHandler = () => void;

// ========== HOOK ==========

export function useSwipeGesture(
  onSwipeLeft?: SwipeHandler, 
  onSwipeRight?: SwipeHandler, 
  threshold: number = 50
): void {
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent): void => {
      touchEnd.current = null;
      touchStart.current = e.targetTouches[0]?.clientX ?? null;
    };

    const onTouchMove = (e: TouchEvent): void => {
      touchEnd.current = e.targetTouches[0]?.clientX ?? null;
    };

    const onTouchEnd = (): void => {
      if (touchStart.current === null || touchEnd.current === null) return;
      
      const distance = touchStart.current - touchEnd.current;
      const isLeftSwipe = distance > threshold;
      const isRightSwipe = distance < -threshold;
      
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    };

    const element = document.body;
    
    element.addEventListener('touchstart', onTouchStart);
    element.addEventListener('touchmove', onTouchMove);
    element.addEventListener('touchend', onTouchEnd);
    
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);
}

export default useSwipeGesture;

