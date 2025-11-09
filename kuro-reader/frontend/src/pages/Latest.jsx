// frontend/src/pages/Latest.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Switch, Center, SimpleGrid, Spinner
} from '@chakra-ui/react';
import { FaClock, FaArrowUp } from 'react-icons/fa';
import { useInView } from 'react-intersection-observer';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSEO, SEOTemplates } from '../hooks/useSEO';

// const Box = motion(Box); // Rimosso per evitare errori React #300

const Latest = React.memo(() => {
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

  const fixChapterNumber = (chapter) => {
    if (!chapter) return '';
    let clean = chapter
      .replace(/^(cap\.|capitolo|chapter|ch\.)\s*/i, '')
      .replace(/^vol\.\s*\d+\s*-\s*/i, '')
      .trim();
    const match = clean.match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      let num = match[1];
      if (parseInt(num) >= 10 && num.length > 2) {
        num = num.slice(0, -2);
      }
      else if (num.startsWith('0') && num.length >= 4) {
        num = num.substring(0, 2);
        if (parseInt(num) > 9) {
          num = num.replace(/^0/, '');
        }
      }
      return num;
    }
    return clean;
  };

  const loadData = useCallback(async (pageNum, reset = false) => {
    if (loading) return;
    if (!reset && !hasMore) return;
    
    if (reset) {
      setInitialLoading(true);
      setList([]);
      setPage(1);
      setHasMore(true);
      pageNum = 1;
    }
    
    setLoading(true);
    
    try {
      const result = await statsAPI.getLatestUpdates(includeAdult, pageNum);
      if (result && result.results) {
        const cleanedResults = result.results.map(item => ({
          ...item,
          latestChapter: fixChapterNumber(item.latestChapter)
        }));
        
        // Deduplica più aggressiva basata su URL normalizzato
        const deduplicatedResults = Array.from(
          new Map(cleanedResults.map(item => [
            item.url.toLowerCase().replace(/\/$/, ''), // Normalizza URL
            item
          ])).values()
        );
        
        setList(prev => {
          if (reset || pageNum === 1) {
            return deduplicatedResults;
          }
          const existingUrls = new Set(prev.map(item => item.url.toLowerCase().replace(/\/$/, '')));
          const newItems = deduplicatedResults.filter(item => 
            !existingUrls.has(item.url.toLowerCase().replace(/\/$/, ''))
          );
          return [...prev, ...newItems];
        });
        
        setPage(pageNum);
        setHasMore(result.hasMore && deduplicatedResults.length > 0);
      }
    } catch (error) {
      console.error('Error loading latest:', error);
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
  }, [includeAdult, hasMore, toast, loading]);

  useEffect(() => {
    loadData(1, true);
  }, [includeAdult]);

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
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} height="320px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    );
  }

  // ✅ SEO Dinamico
  const SEOHelmet = useSEO(SEOTemplates.latest());

  return (
    <>
      {SEOHelmet}
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box 
                p={3} 
                bg="blue.500" 
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FaClock color="white" size="20" />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'md', md: 'lg' }}>
                  Ultimi Aggiornamenti
                </Heading>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.400">
                    {list.length} manga caricati
                  </Text>
                  <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>
                    {includeAdult ? '18+ inclusi' : 'Solo normali'}
                  </Badge>
                </HStack>
              </VStack>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" display={{ base: 'none', md: 'block' }}>
                Adult:
              </Text>
              <Switch
                colorScheme="pink"
                isChecked={includeAdult}
                onChange={(e) => setIncludeAdult(e.target.checked)}
              />
            </HStack>
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
                  key={item.url || `latest-${i}`}
                  h="100%"
                >
                  <MangaCard 
                    manga={item} 
                    hideSource
                    priority={i < 12} 
                    showLatestChapter={true}
                  />
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
              Nessun aggiornamento disponibile
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
    </>
  );
});

Latest.displayName = 'Latest';

export default Latest;