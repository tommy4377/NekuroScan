/**
 * USE RATE LIMIT DETECTOR - Detects rate limiting and bans
 * Intercepts fetch globally to detect 429/403 responses from our server
 */

import { useState, useEffect, useCallback } from 'react';

// ========== TYPES ==========

type BanReason = 'rate-limit' | 'blacklisted';

interface UseRateLimitDetectorReturn {
  isBanned: boolean;
  banReason: BanReason;
  retryAfter: number;
  resetBan: () => void;
}

// ========== HOOK ==========

export function useRateLimitDetector(): UseRateLimitDetectorReturn {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<BanReason>('rate-limit');
  const [retryAfter, setRetryAfter] = useState(60);

  // Intercept global fetch to detect 429/403
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      try {
        const response = await originalFetch(...args);
        
        // Detect 429 (Too Many Requests) or 403 (Banned) - ONLY FROM OUR SERVER
        // 502 = source site blocks, NOT us banning
        if (response.status === 429 || response.status === 403) {
          // Check if it's OUR rate limit (has X-RateLimit headers)
          const hasRateLimitHeaders = response.headers.get('X-RateLimit-Limit') !== null;
          
          // If from source site (502 wrapped), DON'T show ban
          const contentType = response.headers.get('Content-Type') || '';
          const isJsonError = contentType.includes('application/json');
          
          if (hasRateLimitHeaders || (response.status === 429 && isJsonError)) {
            const retryHeader = response.headers.get('Retry-After');
            const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;
            
            setRetryAfter(retrySeconds);
            setBanReason(response.status === 403 ? 'blacklisted' : 'rate-limit');
            setIsBanned(true);
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

