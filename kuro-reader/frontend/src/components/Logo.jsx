import React, { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl', height = '40px', showImage = true, ...rest }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Determina l'immagine ottimale in base alla dimensione
  const getOptimalImage = (size) => {
    const numSize = parseInt(size);
    if (numSize <= 96) return { webp: '/favicon-96x96.webp', png: '/favicon-96x96.png' };
    if (numSize <= 192) return { webp: '/web-app-manifest-192x192.webp', png: '/web-app-manifest-192x192.png' };
    return { webp: '/web-app-manifest-512x512.webp', png: '/web-app-manifest-512x512.png' };
  };

  const optimalImage = getOptimalImage(boxSize);

  useEffect(() => {
    const imgElement = new Image();
    imgElement.src = optimalImage.webp;
    imgElement.onload = () => setImageLoaded(true);
    imgElement.onerror = () => {
      // Fallback a PNG se WebP fallisce
      const pngImg = new Image();
      pngImg.src = optimalImage.png;
      pngImg.onload = () => setImageLoaded(true);
      pngImg.onerror = () => setHasError(true);
    };
  }, [optimalImage.webp, optimalImage.png]);

  return (
    <Box {...rest}>
      <Link 
        to="/home" 
        style={{ 
          textDecoration: 'none',
          display: 'inline-block',
          minWidth: '48px',
          minHeight: '48px',
          padding: '4px'
        }}
      >
        <Box
          display="inline-block"
          transition="all 0.2s ease"
          _hover={{
            transform: 'translateY(-2px)',
            filter: 'brightness(1.2)'
          }}
        >
          {!hasError && showImage ? (
            <Box
              opacity={imageLoaded ? 1 : 0}
              transition="opacity 0.3s"
              boxSize={boxSize}
            >
              {/* Usa direttamente l'immagine ottimale - srcset non funziona con sizes fissi */}
              <img
                src={optimalImage.webp}
                alt="NeKuro Scan"
                loading="eager"
                fetchpriority="high"
                onError={(e) => {
                  // Fallback a PNG se WebP fallisce
                  e.target.src = optimalImage.png;
                }}
                style={{ 
                  width: boxSize,
                  height: boxSize,
                  borderRadius: '0.5rem',
                  objectFit: 'contain',
                  imageRendering: '-webkit-optimize-contrast',
                  display: 'block'
                }}
              />
            </Box>
          ) : (
            <Box
              boxSize={boxSize}
              bg="purple.500"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="bold"
              fontSize="xl"
              color="white"
              boxShadow="md"
            >
              NK
            </Box>
          )}
        </Box>
      </Link>
    </Box>
  );
};

export default Logo;
