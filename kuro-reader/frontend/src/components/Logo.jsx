import React, { useState, useEffect } from 'react';
import { Image as ChakraImage, Box, Text, Heading } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl', height = '40px', showImage = true, ...rest }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    const imgElement = document.createElement('img');
    imgElement.src = '/web-app-manifest-192x192.png';
    imgElement.onload = () => {
      setImageSrc('/web-app-manifest-192x192.png');
      setImageLoaded(true);
    };
    imgElement.onerror = () => {
      setImageLoaded(true);
    };
  }, []);

  return (
    <Box {...rest}>
      <Link to="/home" style={{ textDecoration: 'none' }}>
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
              src={imageSrc}
              boxSize={boxSize}
              h={height}
              alt="NeKuro Scan"
              opacity={imageLoaded ? 1 : 0}
              transition="opacity 0.3s"
              borderRadius="lg"
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
