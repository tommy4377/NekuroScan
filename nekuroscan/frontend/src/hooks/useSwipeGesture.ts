/**
 * USE SWIPE GESTURE - Custom hook for swipe gestures
 * ✅ SEZIONE 4.3: Touch Gestures
 */

import { useRef, useCallback, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  threshold?: number; // Min distance in pixels for swipe (default: 50)
  velocityThreshold?: number; // Min velocity for fast swipe (default: 0.3)
  longPressDelay?: number; // Delay in ms for long press (default: 500)
  enabled?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  longPressTimer: NodeJS.Timeout | null;
}

export const useSwipeGesture = (options: SwipeGestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    threshold = 50,
    velocityThreshold = 0.3,
    longPressDelay = 500,
    enabled = true
  } = options;

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    longPressTimer: null
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
      longPressTimer: null
    };

    // ✅ Long press detection
    if (onLongPress) {
      touchState.current.longPressTimer = setTimeout(() => {
        onLongPress();
      }, longPressDelay);
    }
  }, [enabled, onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchState.current.currentX = touch.clientX;
    touchState.current.currentY = touch.clientY;

    // ✅ Cancel long press if moved too much
    const deltaX = Math.abs(touchState.current.currentX - touchState.current.startX);
    const deltaY = Math.abs(touchState.current.currentY - touchState.current.startY);
    if ((deltaX > 10 || deltaY > 10) && touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    // ✅ Cancel long press timer
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }

    if (e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;
    const deltaTime = Date.now() - touchState.current.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // ✅ Check if swipe is significant
    if (distance < threshold) return;

    // ✅ Determine swipe direction
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Horizontal swipe
    if (absDeltaX > absDeltaY) {
      if (deltaX > 0) {
        // Swipe right
        if (velocity > velocityThreshold || absDeltaX > threshold * 2) {
          onSwipeRight?.();
        }
      } else {
        // Swipe left
        if (velocity > velocityThreshold || absDeltaX > threshold * 2) {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        // Swipe down
        if (velocity > velocityThreshold || absDeltaY > threshold * 2) {
          onSwipeDown?.();
        }
      } else {
        // Swipe up
        if (velocity > velocityThreshold || absDeltaY > threshold * 2) {
          onSwipeUp?.();
        }
      }
    }
  }, [enabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    if (!enabled) return;

    const element = document.body;
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      // Cleanup long press timer
      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    // Expose methods if needed
  };
};
