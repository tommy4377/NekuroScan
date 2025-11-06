// ProxiedImage.jsx - Componente robusto per gestire immagini con CORS
import React, { useState, useEffect, useRef } from 'react';
import { Image, Box, Spinner, Text, VStack, Button } from '@chakra-ui/react';
import { config } from '../config';

function ProxiedImage({ src, alt, style, ...props }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);
  const timeoutRef = useRef(null);
  const MAX_RETRIES = 3;

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
      console.error('ProxiedImage: src non valido', src);
      setError(true);
      setLoading(false);
      return;
    }
    
    if (!src.startsWith('http')) {
      console.error('ProxiedImage: URL deve iniziare con http', src);
      setError(true);
      setLoading(false);
      return;
    }
    
    // Reset stato
    setImageSrc(src);
    setLoading(true);
    setError(false);
    setRetryCount(0);
    
    // TIMEOUT per caricamento
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('ProxiedImage: Timeout caricamento', src);
        handleError();
      }
    }, 30000); // 30 secondi timeout
    
  }, [src]);

  const handleError = () => {
    if (!mountedRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    console.error(`Errore caricamento (tentativo ${retryCount + 1}/${MAX_RETRIES}):`, imageSrc);
    
    // RETRY 1: Forza reload con timestamp (evita cache)
    if (retryCount === 0) {
      console.log('Retry 1: Cache busting...');
      const timestamp = Date.now();
      const newSrc = src.includes('?') 
        ? `${src}&_t=${timestamp}` 
        : `${src}?_t=${timestamp}`;
      
      setRetryCount(1);
      setLoading(true);
      setImageSrc(newSrc);
      return;
    }
    
    // RETRY 2: Prova con crossOrigin diverso
    if (retryCount === 1) {
      console.log('Retry 2: Cambiando crossOrigin...');
      setRetryCount(2);
      setLoading(true);
      // Riprova con l'URL originale ma senza crossOrigin
      setImageSrc(src);
      return;
    }
    
    // RETRY 3: Usa proxy server (se disponibile)
    if (retryCount === 2 && config.PROXY_URL) {
      console.log('Retry 3: Usando proxy...');
      const proxyUrl = `${config.PROXY_URL}/api/image-proxy?url=${encodeURIComponent(src)}`;
      setRetryCount(3);
      setLoading(true);
      setImageSrc(proxyUrl);
      return;
    }
    
    // FALLIMENTO TOTALE
    console.error('ProxiedImage: Tutti i tentativi falliti per:', src);
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
    
    if (retryCount > 0) {
      console.log(`✅ Immagine caricata al tentativo ${retryCount + 1}`);
    }
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
        <VStack spacing={3} p={4}>
          <Text color="red.400" fontSize="lg" fontWeight="bold">
            ⚠️ Immagine non disponibile
          </Text>
          <Text color="gray.400" fontSize="sm" textAlign="center">
            Impossibile caricare l'immagine dopo {MAX_RETRIES} tentativi
          </Text>
          {src && (
            <Text color="gray.600" fontSize="xs" fontFamily="mono" isTruncated maxW="300px">
              {src}
            </Text>
          )}
          <Button 
            size="sm" 
            colorScheme="purple" 
            onClick={handleRetry}
            mt={2}
          >
            Riprova
          </Button>
        </VStack>
      </Box>
    );
  }

  // STATO LOADING + IMMAGINE
  return (
    <Box position="relative" {...props}>
      {loading && (
        <Box 
          position="absolute" 
          top="50%" 
          left="50%" 
          transform="translate(-50%, -50%)"
          zIndex={2}
          bg="blackAlpha.600"
          borderRadius="full"
          p={4}
        >
          <Spinner size="xl" color="purple.500" thickness="4px" />
        </Box>
      )}
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={alt || 'Manga page'}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            ...style,
            opacity: loading ? 0.3 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
          crossOrigin={retryCount === 2 ? undefined : 'anonymous'}
          loading="lazy"
          fallback={<Box minH="400px" bg="gray.800" />}
        />
      )}
    </Box>
  );
}

export default ProxiedImage;

