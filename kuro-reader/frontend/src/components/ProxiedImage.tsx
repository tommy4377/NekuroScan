/**
 * PROXIED IMAGE - Robust image component with CORS handling
 * Handles image loading through proxy with retry logic and blob URL support
 */

import { useState, useEffect, useRef, memo } from 'react';
import type { CSSProperties } from 'react';
import { Image, Box, Spinner, Text, VStack, Button } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';
import { config } from '@/config';

// ========== TYPES ==========

interface ProxiedImageProps extends Omit<BoxProps, 'style'> {
  src: string | null | undefined;
  alt?: string;
  style?: CSSProperties;
  priority?: boolean;
}

// ========== CONSTANTS ==========

const CDN_PATTERN = atob('Y2RuLm1hbmdhd29ybGQ='); // Obfuscated anti-scraping
const LOAD_TIMEOUT = 90000; // 90s - Sharp processing can take time

// ========== COMPONENT ==========

const ProxiedImage = memo<ProxiedImageProps>(({ src, alt, style, priority, ...props }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // URL validation
    if (!src || typeof src !== 'string') {
      setError(true);
      setLoading(false);
      return;
    }
    
    // If BLOB URL, use directly (offline)
    if (src.startsWith('blob:')) {
      setImageSrc(src);
      setLoading(false);
      setError(false);
      return;
    }
    
    // If not http, error
    if (!src.startsWith('http')) {
      setError(true);
      setLoading(false);
      return;
    }
    
    // Reset state
    setLoading(true);
    setError(false);
    setRetryCount(0);
    
    // If from external CDN, use proxy directly (avoid useless retries)
    if (src.includes(CDN_PATTERN)) {
      const proxyUrl = `${config.PROXY_URL}/api/image-proxy?url=${encodeURIComponent(src)}`;
      setImageSrc(proxyUrl);
    } else {
      setImageSrc(src);
    }
    
    // Timeout for longer loading
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && loading) {
        setError(true);
        setLoading(false);
      }
    }, LOAD_TIMEOUT);
    
  }, [src, loading]);

  const handleError = (): void => {
    if (!mountedRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // If blob URL fails, not a real error - might be revoked
    if (src && src.startsWith('blob:')) {
      setError(true);
      setLoading(false);
      return;
    }
    
    // If already using proxy and fails, don't retry
    if (imageSrc && imageSrc.includes('/api/image-proxy')) {
      setError(true);
      setLoading(false);
      return;
    }
    
    // SINGLE RETRY: If not already proxy, use proxy
    if (retryCount === 0 && config.PROXY_URL && src) {
      const proxyUrl = `${config.PROXY_URL}/api/image-proxy?url=${encodeURIComponent(src)}`;
      setRetryCount(1);
      setLoading(true);
      setImageSrc(proxyUrl);
      return;
    }
    
    // TOTAL FAILURE
    setError(true);
    setLoading(false);
  };

  const handleLoad = (): void => {
    if (!mountedRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoading(false);
    setError(false);
  };

  const handleRetry = (): void => {
    // For blob URLs, no retry - use directly
    if (src && src.startsWith('blob:')) {
      setImageSrc(src);
      setError(false);
      setLoading(false);
      return;
    }
    
    setError(false);
    setLoading(true);
    setRetryCount(0);
    setImageSrc(src || null);
  };

  // For blob URLs, never show error state - they're offline and ok
  const isBlobUrl = src && src.startsWith('blob:');
  
  // ERROR STATE (but not for blob URLs)
  if (error && !isBlobUrl) {
    return (
      <Box 
        bg="gray.800" 
        minH="400px" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        borderRadius="md"
        border="1px solid"
        borderColor="gray.700"
        {...props}
      >
        <VStack spacing={2} p={4}>
          <Text color="red.400" fontSize="sm">
            ⚠️ Errore
          </Text>
          <Button 
            size="xs" 
            colorScheme="purple" 
            onClick={handleRetry}
          >
            Riprova
          </Button>
        </VStack>
      </Box>
    );
  }

  // LOADING STATE + IMAGE
  return (
    <Box 
      position="relative" 
      w="100%" 
      h="100%" 
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'auto' // Allows native zoom and scroll
      }}
      {...props}
    >
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={alt || 'Manga page'}
          onLoad={handleLoad}
          onError={handleError}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          style={{
            ...style,
            opacity: 1,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            transform: 'translate3d(0, 0, 0)',
            touchAction: 'auto' // Allows zoom
          }}
          loading="eager"
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          w="100%"
          h="100%"
        />
      )}
      {loading && !isBlobUrl && (
        <Box 
          position="absolute" 
          top="50%" 
          left="50%" 
          transform="translate(-50%, -50%)"
          zIndex={1}
          pointerEvents="none"
        >
          <Spinner size="lg" color="purple.400" thickness="3px" speed="0.8s" />
        </Box>
      )}
    </Box>
  );
});

ProxiedImage.displayName = 'ProxiedImage';

export default ProxiedImage;

