import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Spinner,
  Switch, Center
} from '@chakra-ui/react';
import { FaClock, FaArrowUp, FaPlus } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
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
  const loadMoreButtonRef = useRef(null);
  
  // InView hook per auto-click
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Auto-click quando il bottone è visibile
  useEffect(() => {
    if (inView && !loading && hasMore && loadMoreButtonRef.current) {
      console.log('Auto-clicking load more button...');
      loadMoreButtonRef.current.click();
    }
  }, [inView, loading, hasMore]);

  // Monitor scroll for button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fixed chapter number helper
  const fixChapterNumber = (chapter) => {
    if (!chapter) return '';
    
    // Rimuovi prefissi
    let clean = chapter
      .replace(/^(cap\.|capitolo|chapter|ch\.)\s*/i, '')
      .replace(/^vol\.\s*\d+\s*-\s*/i, '')
      .trim();
    
    // Estrai numero
    const match = clean.match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      let num = match[1];
      
      // FIX: Se il numero è >= 10 e ha più di 2 cifre, tronca le ultime 2
      if (parseInt(num) >= 10 && num.length > 2) {
        num = num.slice(0, -2);
      }
      // Se inizia con 0 e ha 4 cifre (es. 0176), prendi solo le prime 2
      else if (num.startsWith('0') && num.length >= 4) {
        num = num.substring(0, 2);
        // Rimuovi lo 0 iniziale se > 09
        if (parseInt(num) > 9) {
          num = num.replace(/^0/, '');
        }
      }
      
      return num;
    }
    
    return clean;
  };

  // Load data function
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
      console.log(`Loading page ${pageNum}...`);
      const result = await statsAPI.getLatestUpdates(includeAdult, pageNum);
      
      if (result && result.results) {
        const cleanedResults = result.results.map(item => ({
          ...item,
          latestChapter: fixChapterNumber(item.latestChapter)
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
  }, [includeAdult, hasMore, toast]);

  // Initial load
  useEffect(() => {
    loadData(1, true);
  }, [includeAdult]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadData(page + 1);
    }
  };

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
                >
                  <MangaCard 
                    manga={item} 
                    hideSource 
                    showLatestChapter={true}
                  />
                </MotionBox>
              ))}
            </SimpleGrid>

            {/* Load More Button with Auto-Click */}
            {hasMore && (
              <Center ref={inViewRef} py={6}>
                <Button
                  ref={loadMoreButtonRef}
                  onClick={handleLoadMore}
                  isLoading={loading}
                  loadingText="Caricamento..."
                  colorScheme="purple"
                  size="lg"
                  leftIcon={!loading && <FaPlus />}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? 'Caricamento...' : 'Carica altri'}
                </Button>
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
