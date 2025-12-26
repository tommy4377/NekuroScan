/**
 * USE DOUBLE TAP - Detect double tap gestures
 * Useful for mobile interactions
 */

import { useRef } from 'react';

// ========== TYPES ==========

type TapHandler = (event: any) => void;

// ========== HOOK ==========

export function useDoubleTap(onDoubleTap: TapHandler, delay: number = 300): TapHandler {
  const lastTap = useRef<number>(0);

  const handleTap = (e: any): void => {
    const now = Date.now();
    const timeSince = now - lastTap.current;
    
    if (timeSince < delay && timeSince > 0) {
      onDoubleTap(e);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return handleTap;
}

export default useDoubleTap;

