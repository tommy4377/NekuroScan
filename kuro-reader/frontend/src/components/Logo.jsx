import React, { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl', height = '40px', showImage = true, ...rest }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Preload dell'immagine WebP appropriata in base alla dimensione
    const size = parseInt(boxSize);
    const imgSrc = size <= 96 
      ? '/favicon-96x96.webp'
      : size <= 192
        ? '/web-app-manifest-192x192.webp'
        : '/web-app-manifest-512x512.webp';
    
    const imgElement = new Image();
    imgElement.src = imgSrc;
    imgElement.onload = () => setImageLoaded(true);
    imgElement.onerror = () => {
      // Fallback a PNG se WebP fallisce
      const pngImg = new Image();
      pngImg.src = imgSrc.replace('.webp', '.png');
      pngImg.onload = () => setImageLoaded(true);
      pngImg.onerror = () => setHasError(true);
    };
  }, [boxSize]);

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
              <picture>
                {/* WebP con srcset ottimizzato */}
                <source 
                  type="image/webp"
                  srcSet="/favicon-96x96.webp 96w, /web-app-manifest-192x192.webp 192w, /web-app-manifest-512x512.webp 512w"
                  sizes={`(max-width: 96px) 96px, (max-width: 192px) 192px, 512px`}
                />
                {/* Fallback PNG */}
                <img
                  src="/favicon-96x96.png"
                  srcSet="/favicon-96x96.png 96w, /web-app-manifest-192x192.png 192w, /web-app-manifest-512x512.png 512w"
                  sizes={`(max-width: 96px) 96px, (max-width: 192px) 192px, 512px`}
                  alt="NeKuro Scan"
                  loading="eager"
                  fetchpriority="high"
                  style={{ 
                    width: boxSize,
                    height: boxSize,
                    borderRadius: '0.5rem',
                    objectFit: 'contain',
                    imageRendering: '-webkit-optimize-contrast',
                    display: 'block'
                  }}
                />
              </picture>
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
