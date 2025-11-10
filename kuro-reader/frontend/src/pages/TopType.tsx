// @ts-nocheck - Complex legacy file, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
// frontend/src/pages/TopType.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Container, Heading, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Center, SimpleGrid, Spinner
} from '@chakra-ui/react';
import { FaTrophy, FaArrowUp } from 'react-icons/fa';
import { useInView } from 'react-intersection-observer';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import MangaCard from '@/components/MangaCard';
import statsAPI from '@/api/stats';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// const Box = motion(Box); // Rimosso per evitare errori React #300

const TopType = React.memo(() => {
  const { type } = useParams();
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const toast = useToast();
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px'
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const preCacheImages = useCallback((items) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const urls = items.map(i => i.cover || i.coverUrl).filter(Boolean);
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls });
    }
  }, []);

  const loadData = useCallback(async (pageNum, reset = false) => {
    if (loading && !reset) return;
    if (!hasMore && !reset) return;
    
    if (reset) {
      setInitialLoading(true);
      setList([]);
      setPage(1);
      setHasMore(true);
      pageNum = 1;
    }
    
    setLoading(true);
    
    try {
      const result = await statsAPI.getTopByType(type, includeAdult, pageNum);
      
      if (result && result.results) {
        setList(prev => {
          if (reset || pageNum === 1) {
            preCacheImages(result.results);
            return result.results;
          }
          const existingUrls = new Set(prev.map(item => item.url));
          const newItems = result.results.filter(item => !existingUrls.has(item.url));
          preCacheImages(newItems);
          return [...prev, ...newItems];
        });
        
        setPage(pageNum);
        setHasMore(result.hasMore && result.results.length > 0);
      }
    } catch (error) {
      toast({
        title: 'Errore caricamento',
        description: 'Riprova tra qualche secondo',
        status: 'error',
        duration: 3000,
      });
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [type, includeAdult, hasMore, toast, loading, preCacheImages]);

  useEffect(() => {
    loadData(1, true);
  }, [type, includeAdult]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loading && list.length > 0) {
      loadData(page + 1);
    }
  }, [inView, hasMore, loading, list.length]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (initialLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="100px" borderRadius="xl" />
          <HStack spacing={4} wrap="wrap">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} height="320px" borderRadius="lg" flex="1 0 160px" />
            ))}
          </HStack>
        </VStack>
      </Container>
    );
  }

  const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box 
                p={3} 
                bg="purple.500" 
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FaTrophy color="white" size="20" />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'md', md: 'lg' }}>Top {typeTitle}</Heading>
                <HStack>
                  <Text fontSize="sm" color="gray.400">{list.length} caricati</Text>
                  <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>
                    {includeAdult ? '18+ inclusi' : 'Solo normali'}
                  </Badge>
                </HStack>
              </VStack>
            </HStack>

            <Button
              variant={includeAdult ? 'solid' : 'outline'}
              colorScheme="pink"
              size="sm"
              onClick={() => setIncludeAdult(!includeAdult)}
            >
              {includeAdult ? '🔞 Adult ON' : '🔞 Adult OFF'}
            </Button>
          </HStack>
        </Box>

        {list.length > 0 ? (
          <>
            <SimpleGrid 
              columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} 
              spacing={4}
              w="100%"
            >
              {list.map((item, i) => (
                <Box
                  key={item.url || `toptype-${i}`}
                  position="relative"
                  h="100%"
                >
                  <MangaCard 
                    manga={item} 
                    hideSource 
                    priority={i < 12}
                  />
                  {i < 10 && page === 1 && (
                      <Badge
                        position="absolute"
                        top={2}
                        left={2}
                        colorScheme={i < 3 ? 'yellow' : 'purple'}
                        fontSize="sm"
                        px={2}
                        py={1}
                        zIndex={10}
                      >
                        #{i + 1}
                      </Badge>
                    )}
                </Box>
              ))}
            </SimpleGrid>

            {hasMore && (
              <Center py={6} ref={loadMoreRef}>
                {loading && (
                  <VStack spacing={2}>
                    <Spinner size="lg" color="purple.500" thickness="3px" />
                    <Text fontSize="sm" color="gray.400">Caricamento...</Text>
                  </VStack>
                )}
              </Center>
            )}
            
            {!hasMore && list.length > 20 && (
              <Center py={4}>
                <Text color="gray.500">Hai raggiunto la fine</Text>
              </Center>
            )}
          </>
        ) : (
          <Center py={12}>
            <Text fontSize="lg" color="gray.500">
              Nessun {typeTitle.toLowerCase()} disponibile
            </Text>
          </Center>
        )}

        {showScrollTop && (
          <IconButton
            icon={<FaArrowUp />}
            position="fixed"
            bottom={8}
            right={8}
            colorScheme="purple"
            borderRadius="full"
            size="lg"
            onClick={scrollToTop}
            boxShadow="xl"
            aria-label="Torna su"
            zIndex={100}
          />
        )}
      </VStack>
    </Container>
  );
});

TopType.displayName = 'TopType';

export default TopType;