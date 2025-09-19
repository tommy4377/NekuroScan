import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Spinner,
  Switch, Center
} from '@chakra-ui/react';
import { FaClock, FaArrowUp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function Latest() {
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const toast = useToast();
  const observerRef = useRef(null);
  const loadingRef = useRef(false);

  // Clean chapter number helper
  const cleanChapterNumber = (chapter) => {
    if (!chapter) return '';
    let clean = chapter.replace(/^(cap\.|capitolo|chapter|ch\.)\s*/i, '').trim();
    const match = clean.match(/^(\d+(?:\.\d+)?)/);
    return match ? match[1] : clean;
  };

  // Monitor scroll for button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load data function
  const loadData = useCallback(async (pageNum, reset = false) => {
    // Previeni chiamate multiple
    if (loadingRef.current) return;
    if (!reset && !hasMore) return;
    
    loadingRef.current = true;
    
    if (reset) {
      setInitialLoading(true);
      setList([]);
      setPage(1);
      setHasMore(true);
      pageNum = 1;
    } else {
      setLoading(true);
    }
    
    try {
      console.log(`Loading page ${pageNum}...`);
      const result = await statsAPI.getLatestUpdates(includeAdult, pageNum);
      
      if (result && result.results) {
        const cleanedResults = result.results.map(item => ({
          ...item,
          latestChapter: cleanChapterNumber(item.latestChapter)
        }));
        
        setList(prev => {
          if (reset || pageNum === 1) {
            return cleanedResults;
          }
          // Evita duplicati
          const existingUrls = new Set(prev.map(item => item.url));
          const newItems = cleanedResults.filter(item => !existingUrls.has(item.url));
          return [...prev, ...newItems];
        });
        
        setPage(pageNum);
        setHasMore(result.hasMore && cleanedResults.length > 0);
        console.log(`Loaded ${cleanedResults.length} items. Has more: ${result.hasMore}`);
      }
    } catch (error) {
      console.error('Error loading latest:', error);
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare gli aggiornamenti',
        status: 'error',
        duration: 3000,
      });
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, [includeAdult, hasMore, toast]);

  // Initial load
  useEffect(() => {
    loadData(1, true);
  }, [includeAdult]);

  // Setup Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingRef.current && !initialLoading && list.length > 0) {
          console.log('Trigger loading next page...');
          loadData(page + 1);
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, page, list.length, initialLoading, loadData]);

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

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box p={3} bg="blue.500" borderRadius="lg">
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

        {/* Content Grid */}
        {list.length > 0 ? (
          <>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {list.map((item, i) => (
                <MotionBox
                  key={`${item.url}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  position="relative"
                >
                  <MangaCard 
                    manga={item} 
                    hideSource 
                    showLatestChapter={true} // Passa prop per mostrare il capitolo
                  />
                </MotionBox>
              ))}
            </SimpleGrid>

            {/* Observer Target - IMPORTANTE: elemento visibile per triggerare il caricamento */}
            <Box 
              ref={observerRef}
              h="100px" 
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {loading && (
                <HStack spacing={3}>
                  <Spinner color="purple.500" />
                  <Text>Caricamento...</Text>
                </HStack>
              )}
              {!hasMore && list.length > 0 && (
                <Text color="gray.500">Fine dei risultati</Text>
              )}
            </Box>
          </>
        ) : (
          <Center py={12}>
            <Text fontSize="lg" color="gray.500">
              Nessun aggiornamento disponibile
            </Text>
          </Center>
        )}

        {/* Scroll to top */}
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
}

export default Latest;
