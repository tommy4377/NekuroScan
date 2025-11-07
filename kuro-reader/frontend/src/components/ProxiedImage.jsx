// ProxiedImage.jsx - Componente robusto per gestire immagini con CORS
import React, { useState, useEffect, useRef } from 'react';
import { Image, Box, Spinner, Text, VStack, Button } from '@chakra-ui/react';
import { config } from '../config';

const ProxiedImage = React.memo(({ src, alt, style, ...props }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // VALIDAZIONE URL
    if (!src || typeof src !== 'string') {
      setError(true);
      setLoading(false);
      return;
    }
    
    if (!src.startsWith('http')) {
      setError(true);
      setLoading(false);
      return;
    }
    
    // Reset stato
    setLoading(true);
    setError(false);
    setRetryCount(0);
    
    // Se è cdn.mangaworld.cx, usa DIRETTAMENTE il proxy (evita retry inutili)
    if (src.includes('cdn.mangaworld')) {
      const proxyUrl = `${config.PROXY_URL}/api/image-proxy?url=${encodeURIComponent(src)}`;
      setImageSrc(proxyUrl);
    } else {
      setImageSrc(src);
    }
    
    // TIMEOUT per caricamento più lungo
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && loading) {
        setError(true);
        setLoading(false);
      }
    }, 25000); // 25 secondi timeout - alcune immagini sono lente
    
  }, [src]);

  const handleError = () => {
    if (!mountedRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Se già stiamo usando il proxy e fallisce, non ritentare
    if (imageSrc && imageSrc.includes('/api/image-proxy')) {
      setError(true);
      setLoading(false);
      return;
    }
    
    // UNICO RETRY: Se non è già proxy, usa proxy
    if (retryCount === 0 && config.PROXY_URL) {
      const proxyUrl = `${config.PROXY_URL}/api/image-proxy?url=${encodeURIComponent(src)}`;
      setRetryCount(1);
      setLoading(true);
      setImageSrc(proxyUrl);
      return;
    }
    
    // FALLIMENTO TOTALE
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    if (!mountedRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoading(false);
    setError(false);
  };

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    setRetryCount(0);
    setImageSrc(src);
  };

  // STATO ERRORE
  if (error) {
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

  // STATO LOADING + IMMAGINE
  return (
    <Box position="relative" w="100%" h="100%" {...props}>
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={alt || 'Manga page'}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            ...style,
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'opacity'
          }}
          loading="lazy"
          decoding="async"
          w="100%"
          h="100%"
        />
      )}
      {loading && (
        <Box 
          position="absolute" 
          top="50%" 
          left="50%" 
          transform="translate(-50%, -50%)"
          zIndex={1}
        >
          <Spinner size="lg" color="purple.400" thickness="3px" speed="0.8s" />
        </Box>
      )}
    </Box>
  );
});

ProxiedImage.displayName = 'ProxiedImage';

export default ProxiedImage;

