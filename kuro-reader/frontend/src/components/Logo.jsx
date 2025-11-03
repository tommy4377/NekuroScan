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
          position="relative"
          pb={1}
          _hover={{
            '&::after': {
              width: '100%'
            }
          }}
          _after={{
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 0,
            height: '3px',
            bgGradient: 'linear(to-r, purple.400, pink.400)',
            transition: 'width 0.3s ease'
          }}
        >
          {showText ? (
            <Heading
              size="lg"
              bgGradient="linear(to-r, purple.400, pink.400)"
              bgClip="text"
              fontWeight="bold"
              letterSpacing="tight"
              mb={0}
            >
              NeKuro Scan
            </Heading>
          ) : imageSrc && showImage ? (
            <ChakraImage 
              src={imageSrc}
              boxSize={boxSize}
              h={height}
              alt="NeKuro Scan"
              opacity={imageLoaded ? 1 : 0}
              transition="opacity 0.3s"
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
