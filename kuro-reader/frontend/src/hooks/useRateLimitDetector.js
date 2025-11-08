// Hook per rilevare quando utente è bannato (429/403)
import { useState, useEffect, useCallback } from 'react';

export function useRateLimitDetector() {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('rate-limit');
  const [retryAfter, setRetryAfter] = useState(60);

  // Intercetta fetch globale per rilevare 429/403
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Rileva 429 (Too Many Requests) o 403 (Banned)
        if (response.status === 429 || response.status === 403) {
          const retryHeader = response.headers.get('Retry-After');
          const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;
          
          setRetryAfter(retrySeconds);
          setBanReason(response.status === 403 ? 'blacklisted' : 'rate-limit');
          setIsBanned(true);
          
          // Log per debugging
          console.warn(`🚨 Rate limit detected: ${response.status}, retry after ${retrySeconds}s`);
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const resetBan = useCallback(() => {
    setIsBanned(false);
    setBanReason('rate-limit');
    setRetryAfter(60);
  }, []);

  return {
    isBanned,
    banReason,
    retryAfter,
    resetBan
  };
}

export default useRateLimitDetector;

