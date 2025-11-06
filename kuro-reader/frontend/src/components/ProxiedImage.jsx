// ProxiedImage.jsx - Componente per gestire immagini con CORS
import React, { useState, useEffect } from 'react';
import { Image, Box, Spinner, Text, VStack } from '@chakra-ui/react';
import { config } from '../config';

/**
 * Componente che gestisce il caricamento di immagini con possibili problemi CORS
 * Prova prima il caricamento diretto, poi tramite proxy se fallisce
 */
function ProxiedImage({ src, alt, style, ...props }) {
  const [imageSrc, setImageSrc] = useState(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  useEffect(() => {
    // Reset quando cambia src
    setImageSrc(src);
    setLoading(true);
    setError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    console.error(`Failed to load image: ${imageSrc}`);
    
    // Primo retry: prova con un altro URL se disponibile
    if (retryCount === 0) {
      console.log('Retrying image load with CORS mode...');
      setRetryCount(1);
      setLoading(true);
      // Forza reload con timestamp per evitare cache
      const newSrc = src.includes('?') ? `${src}&t=${Date.now()}` : `${src}?t=${Date.now()}`;
      setImageSrc(newSrc);
      return;
    }
    
    // Secondo retry: prova tramite proxy (se disponibile)
    if (retryCount === 1 && config.PROXY_URL) {
      console.log('Retrying through proxy...');
      setRetryCount(2);
      setLoading(true);
      
      // Crea URL proxy
      const proxyUrl = `${config.PROXY_URL}/api/image-proxy?url=${encodeURIComponent(src)}`;
      setImageSrc(proxyUrl);
      return;
    }
    
    // Tutti i retry falliti
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  if (error) {
    return (
      <Box 
        bg="gray.800" 
        minH="400px" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        {...props}
      >
        <VStack spacing={2}>
          <Text color="red.400" fontSize="sm">⚠️ Errore caricamento immagine</Text>
          <Text color="gray.500" fontSize="xs">URL: {src.substring(0, 50)}...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <>
      {loading && (
        <Box 
          position="absolute" 
          top="50%" 
          left="50%" 
          transform="translate(-50%, -50%)"
          zIndex={1}
        >
          <Spinner size="xl" color="purple.500" thickness="4px" />
        </Box>
      )}
      <Image
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          ...style,
          opacity: loading ? 0.3 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
        crossOrigin="anonymous"
        loading="lazy"
        {...props}
      />
    </>
  );
}

export default ProxiedImage;

