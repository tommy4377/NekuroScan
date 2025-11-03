import React, { useState, useEffect } from 'react';
import { Image, Box, Text } from '@chakra-ui/react';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    // Preload dell'immagine
    const img = new Image();
    img.src = '/web-app-manifest-512x512.png';
    img.onload = () => {
      setImageSrc('/web-app-manifest-512x512.png');
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageLoaded(true);
    };
  }, []);

  return (
    <>
      {imageSrc ? (
        <Image 
          src={imageSrc}
          boxSize={boxSize}
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
      {showText && (
        <Text
          fontSize={fontSize}
          fontWeight="bold"
          bgGradient="linear(to-r, purple.400, pink.400)"
          bgClip="text"
        >
          NeKuro Scan
        </Text>
      )}
    </>
  );
};

export default Logo;

