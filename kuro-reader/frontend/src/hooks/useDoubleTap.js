import { useRef } from 'react';

export function useDoubleTap(onDoubleTap, delay = 300) {
  const lastTap = useRef(0);

  const handleTap = (e) => {
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