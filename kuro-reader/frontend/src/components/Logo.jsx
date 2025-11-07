import React, { useState, useEffect } from 'react';
import { Image as ChakraImage, Box, Text, Heading } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl', height = '40px', showImage = true, ...rest }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    const imgElement = document.createElement('img');
    imgElement.src = '/favicon-96x96.png';
    imgElement.onload = () => {
      setImageSrc('/favicon-96x96.png');
      setImageLoaded(true);
    };
    imgElement.onerror = () => {
      setImageLoaded(true);
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
          {imageSrc && showImage ? (
            <ChakraImage 
              src="/favicon-96x96.png"
              srcSet="/favicon-96x96.png 96w, /web-app-manifest-192x192.png 192w"
              sizes={boxSize === '40px' ? '40px' : '56px'}
              boxSize={boxSize}
              alt="NeKuro Scan"
              opacity={imageLoaded ? 1 : 0}
              transition="opacity 0.3s"
              borderRadius="lg"
              objectFit="contain"
              loading="eager"
              fetchpriority="high"
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
      </Link>
    </Box>
  );
};

export default Logo;
