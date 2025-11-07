import React, { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl', height = '40px', showImage = true, ...rest }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Preload dell'immagine WebP
    const imgElement = new Image();
    imgElement.src = '/web-app-manifest-512x512.webp';
    imgElement.onload = () => setImageLoaded(true);
    imgElement.onerror = () => {
      // Fallback a PNG se WebP fallisce
      const pngImg = new Image();
      pngImg.src = '/web-app-manifest-512x512.png';
      pngImg.onload = () => setImageLoaded(true);
      pngImg.onerror = () => setHasError(true);
    };
  }, []);

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
              as="picture"
              opacity={imageLoaded ? 1 : 0}
              transition="opacity 0.3s"
            >
              {/* WebP con srcset per responsive */}
              <source 
                type="image/webp"
                srcSet="/web-app-manifest-192x192.webp 192w, /web-app-manifest-512x512.webp 512w"
                sizes={boxSize}
              />
              {/* Fallback PNG */}
              <Box
                as="img"
                src="/web-app-manifest-512x512.png"
                srcSet="/web-app-manifest-192x192.png 192w, /web-app-manifest-512x512.png 512w"
                sizes={boxSize}
                alt="NeKuro Scan"
                boxSize={boxSize}
                borderRadius="lg"
                objectFit="contain"
                loading="eager"
                fetchpriority="high"
                style={{ 
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
