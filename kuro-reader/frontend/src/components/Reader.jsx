import React, { useState, useEffect } from 'react';
import {
  Box,
  Image,
  Text,
  VStack,
  Container,
  Skeleton
} from '@chakra-ui/react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

function Reader({ chapter, currentPage, onPageChange, settings, isNovel }) {
  const [loadedImages, setLoadedImages] = useState({});

  useEffect(() => {
    // Preload next images
    if (chapter?.pages) {
      const preloadCount = 3;
      for (let i = currentPage; i < Math.min(currentPage + preloadCount, chapter.pages.length); i++) {
        const img = new Image();
        img.src = chapter.pages[i];
        img.onload = () => {
          setLoadedImages(prev => ({ ...prev, [i]: true }));
        };
      }
    }
  }, [currentPage, chapter]);

  if (isNovel) {
    // Novel reader
    return (
      <Container maxW="container.md" py={8}>
        <Box
          bg="gray.900"
          p={8}
          borderRadius="lg"
          minH="70vh"
          style={{
            filter: `brightness(${settings.brightness}%)`,
          }}
        >
          <Text
            fontSize={settings.fontSize || 'lg'}
            lineHeight="tall"
            whiteSpace="pre-wrap"
            fontFamily="Georgia, serif"
          >
            {chapter.content}
          </Text>
        </Box>
      </Container>
    );
  }

  // Manga reader
  if (settings.readingMode === 'webtoon') {
    // Webtoon mode - vertical scroll
    return (
      <VStack spacing={0} bg="black">
        {chapter.pages?.map((page, i) => (
          <Box key={i} w="100%" maxW="900px" mx="auto">
            <LazyLoadImage
              src={page}
              alt={`Page ${i + 1}`}
              effect="blur"
              width="100%"
              style={{
                filter: `brightness(${settings.brightness}%)`,
              }}
            />
          </Box>
        ))}
      </VStack>
    );
  }

  // Single/Double page mode
  const pagesToShow = settings.readingMode === 'double' ? 2 : 1;
  const pages = [];
  
  for (let i = 0; i < pagesToShow; i++) {
    const pageIndex = currentPage + i;
    if (pageIndex < chapter.pages?.length) {
      pages.push(chapter.pages[pageIndex]);
    }
  }

  return (
    <Box
      bg="black"
      minH="calc(100vh - 128px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={(e) => {
        // Click navigation
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        
        if (x < width * 0.3) {
          // Previous page
          if (currentPage > 0) {
            onPageChange(Math.max(0, currentPage - pagesToShow));
          }
        } else if (x > width * 0.7) {
          // Next page
          if (currentPage < chapter.pages.length - 1) {
            onPageChange(Math.min(chapter.pages.length - 1, currentPage + pagesToShow));
          }
        }
      }}
      cursor="pointer"
      position="relative"
    >
      {pages.map((page, i) => (
        <Box
          key={currentPage + i}
          maxH="calc(100vh - 128px)"
          maxW={settings.readingMode === 'double' ? '50%' : '100%'}
          px={2}
        >
          {loadedImages[currentPage + i] ? (
            <Image
              src={page}
              alt={`Page ${currentPage + i + 1}`}
              objectFit={settings.fitMode === 'width' ? 'contain' : settings.fitMode}
              maxH="calc(100vh - 128px)"
              style={{
                filter: `brightness(${settings.brightness}%)`,
                transform: `scale(${settings.zoom / 100})`,
              }}
            />
          ) : (
            <Skeleton height="80vh" width="100%" />
          )}
        </Box>
      ))}

      {/* Navigation hints */}
      <Box
        position="absolute"
        left={0}
        top="50%"
        transform="translateY(-50%)"
        w="30%"
        h="100%"
        opacity={0}
        _hover={{ opacity: 0.1 }}
        bg="white"
        cursor="w-resize"
      />
      <Box
        position="absolute"
        right={0}
        top="50%"
        transform="translateY(-50%)"
        w="30%"
        h="100%"
        opacity={0}
        _hover={{ opacity: 0.1 }}
        bg="white"
        cursor="e-resize"
      />
    </Box>
  );
}

export default Reader;