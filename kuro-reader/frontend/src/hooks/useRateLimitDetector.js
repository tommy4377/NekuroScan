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
        
        // Rileva 429 (Too Many Requests) o 403 (Banned) - MA SOLO DAL NOSTRO SERVER
        // 502 = sito sorgente blocca, NON siamo noi che banniamo
        if (response.status === 429 || response.status === 403) {
          // Controlla se è il NOSTRO rate limit (avrà X-RateLimit headers)
          const hasRateLimitHeaders = response.headers.get('X-RateLimit-Limit') !== null;
          
          // Se è dal sito sorgente (502 wrapped), NON mostrare ban
          const contentType = response.headers.get('Content-Type') || '';
          const isJsonError = contentType.includes('application/json');
          
          if (hasRateLimitHeaders || (response.status === 429 && isJsonError)) {
            const retryHeader = response.headers.get('Retry-After');
            const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;
            
            setRetryAfter(retrySeconds);
            setBanReason(response.status === 403 ? 'blacklisted' : 'rate-limit');
            setIsBanned(true);
            
            // Log per debugging
            console.warn(`🚨 SEI STATO BANNATO (${response.status}), retry after ${retrySeconds}s`);
          } else {
            // È un 403 dal sito sorgente, non nostro ban
            console.warn(`⚠️ Sito sorgente blocca (403), NON sei bannato`);
          }
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

