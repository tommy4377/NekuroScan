// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
// Reader.jsx - VERSIONE CORRETTA SENZA ERRORI REACT #300
import { useState, useEffect } from 'react';
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
import ProxiedImage from '@/components/ProxiedImage';

function Reader({ chapter, currentPage, onPageChange, settings, isNovel }) {
  const [loadedImages, setLoadedImages] = useState({});

  // ==================== VALIDAZIONE INIZIALE ====================
  useEffect(() => {
    if (!chapter) {
      return;
    }
    
    if (!isNovel && (!chapter.pages || !Array.isArray(chapter.pages))) {
    }
  }, [chapter, isNovel]);

  // ==================== PRELOAD IMMAGINI ====================
  useEffect(() => {
    if (!chapter?.pages || !Array.isArray(chapter.pages)) {
      return;
    }

    const preloadCount = 3;
    const startIndex = Math.max(0, currentPage);
    const endIndex = Math.min(currentPage + preloadCount, chapter.pages.length);

    for (let i = startIndex; i < endIndex; i++) {
      if (chapter.pages[i]) {
        const imgElement = document.createElement('img');
        imgElement.src = chapter.pages[i];
        imgElement.onload = () => {
          setLoadedImages(prev => ({ ...prev, [i]: true }));
        };
        imgElement.onerror = () => {
        };
      }
    }
  }, [currentPage, chapter]);

  // ==================== GESTIONE CLICK - DEFINITA PRIMA DEI RETURN ====================
  const handlePageClick = (e) => {
    // VALIDAZIONE CRITICA
    if (!chapter?.pages || !Array.isArray(chapter.pages) || chapter.pages.length === 0) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const pagesToShow = settings?.readingMode === 'double' ? 2 : 1;

    // Click su sinistra = pagina precedente
    if (x < width * 0.3) {
      if (currentPage > 0) {
        const newPage = Math.max(0, currentPage - pagesToShow);
        onPageChange(newPage);
      }
    } 
    // Click su destra = pagina successiva
    else if (x > width * 0.7) {
      if (currentPage < chapter.pages.length - 1) {
        const newPage = Math.min(chapter.pages.length - 1, currentPage + pagesToShow);
        onPageChange(newPage);
      }
    }
  };

  // ==================== NOVEL READER ====================
  if (isNovel) {
    if (!chapter?.content) {
      return (
        <Container maxW="container.md" py={8}>
          <Box bg="gray.900" p={8} borderRadius="lg" minH="70vh">
            <Text color="gray.500" textAlign="center">
              Contenuto non disponibile
            </Text>
          </Box>
        </Container>
      );
    }

    return (
      <Container maxW="container.md" py={8}>
        <Box
          bg="gray.900"
          p={8}
          borderRadius="lg"
          minH="70vh"
          style={{
            filter: `brightness(${settings?.brightness || 100}%)`,
          }}
        >
          <Text
            fontSize={settings?.fontSize || 'lg'}
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

  // ==================== WEBTOON MODE ====================
  if (settings?.readingMode === 'webtoon') {
    if (!chapter?.pages || chapter.pages.length === 0) {
      return (
        <Container maxW="container.md" py={8}>
          <Text color="gray.500" textAlign="center">
            Nessuna pagina disponibile
          </Text>
        </Container>
      );
    }

    return (
      <VStack spacing={0} bg="black">
        {chapter.pages.map((page, i) => (
          <Box key={i} w="100%" maxW="900px" mx="auto" position="relative">
            {page ? (
              <ProxiedImage
                src={page}
                alt={`Page ${i + 1}`}
                w="100%"
                style={{
                  filter: `brightness(${settings?.brightness || 100}%)`,
                }}
              />
            ) : (
              <Box bg="gray.800" minH="400px" display="flex" alignItems="center" justifyContent="center">
                <Text color="gray.500">Immagine non disponibile</Text>
              </Box>
            )}
          </Box>
        ))}
      </VStack>
    );
  }

  // ==================== SINGLE/DOUBLE PAGE MODE ====================
  
  // Validazione pages
  if (!chapter?.pages || !Array.isArray(chapter.pages) || chapter.pages.length === 0) {
    return (
      <Container maxW="container.md" py={20}>
        <VStack spacing={4}>
          <Text color="gray.500" fontSize="lg" textAlign="center">
            Nessuna pagina disponibile per questo capitolo
          </Text>
        </VStack>
      </Container>
    );
  }

  // Calcolo pagine da mostrare
  const pagesToShow = settings?.readingMode === 'double' ? 2 : 1;
  const pages = [];
  
  for (let i = 0; i < pagesToShow; i++) {
    const pageIndex = currentPage + i;
    if (pageIndex >= 0 && pageIndex < chapter.pages.length && chapter.pages[pageIndex]) {
      pages.push({
        url: chapter.pages[pageIndex],
        index: pageIndex
      });
    }
  }

  // Se non ci sono pagine valide
  if (pages.length === 0) {
    return (
      <Container maxW="container.md" py={20}>
        <VStack spacing={4}>
          <Text color="gray.500" fontSize="lg">
            Pagina non disponibile
          </Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Box
      bg="black"
      minH="calc(100vh - 128px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={handlePageClick}
      cursor="pointer"
      position="relative"
    >
      {pages.map((pageData) => (
        <Box
          key={pageData.index}
          maxH="calc(100vh - 128px)"
          maxW={settings?.readingMode === 'double' ? '50%' : '100%'}
          px={2}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {loadedImages[pageData.index] ? (
            <ProxiedImage
              src={pageData.url}
              alt={`Page ${pageData.index + 1}`}
              objectFit={settings?.fitMode || 'contain'}
              maxH="calc(100vh - 128px)"
              maxW="100%"
              style={{
                filter: `brightness(${settings?.brightness || 100}%)`,
                transform: `scale(${(settings?.zoom || 100) / 100})`,
              }}
            />
          ) : (
            <Skeleton height="80vh" width="100%" borderRadius="md" />
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
        pointerEvents="none"
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
        pointerEvents="none"
      />

      {/* Indicatore pagina - trasparente */}
      <Box
        position="absolute"
        bottom={4}
        left="50%"
        transform="translateX(-50%)"
        bg="blackAlpha.300"
        color="whiteAlpha.800"
        px={3}
        py={1.5}
        borderRadius="full"
        fontSize="xs"
        fontWeight="medium"
        pointerEvents="none"
        backdropFilter="blur(4px)"
      >
        {currentPage + 1} / {chapter.pages.length}
      </Box>
    </Box>
  );
}

export default Reader;
