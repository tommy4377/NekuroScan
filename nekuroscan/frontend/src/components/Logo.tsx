// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl', height = '40px', showImage = true, ...rest }) => {
  const [imageError, setImageError] = useState(false);
  
  // Determina l'immagine ottimale in base alla dimensione
  const getOptimalImage = (size) => {
    const numSize = parseInt(size);
    if (numSize <= 96) return '/favicon-96x96.webp';
    if (numSize <= 192) return '/web-app-manifest-192x192.webp';
    return '/web-app-manifest-512x512.webp';
  };

  const optimalImage = getOptimalImage(boxSize);

  return (
    <Box 
      display="inline-block"
      transition="transform 0.2s ease-out"
      _hover={{
        transform: 'translateY(-2px)'
      }}
      {...rest}
    >
      {showImage && !imageError ? (
        <img
          src={optimalImage}
          alt="NeKuro Scan"
          loading="eager"
          fetchPriority="high"
          width={boxSize}
          height={boxSize}
          style={{ 
            width: boxSize,
            height: boxSize,
            borderRadius: '0.5rem',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
          onError={() => setImageError(true)}
          draggable={false}
        />
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
  );
};

export default Logo;
