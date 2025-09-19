import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Spinner,
  Select, Switch, Center
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
  const observerTarget = useRef(null);
  
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
    if (loading) return;
    
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
          latestChapter: cleanChapterNumber(item.latestChapter)
        }));
        
        if (reset || pageNum === 1) {
          setList(cleanedResults);
        } else {
          setList(prev => [...prev, ...cleanedResults]);
        }
        
        setPage(pageNum);
        setHasMore(result.hasMore && cleanedResults.length > 0);
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
      setLoading(false);
      setInitialLoading(false);
    }
  }, [includeAdult, loading, toast]);

  // Initial load
  useEffect(() => {
    loadData(1, true);
  }, [includeAdult]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoading) {
          loadData(page + 1);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, page, initialLoading, loadData]);

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
                  <MangaCard manga={item} hideSource />
                  
                  {/* Chapter Badge */}
                  {item.latestChapter && (
                    <Box
                      position="absolute"
                      bottom="60px"
                      left={2}
                      right={2}
                      bg="blue.600"
                      color="white"
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="xs"
                      textAlign="center"
                      opacity={0.95}
                      fontWeight="bold"
                    >
                      Capitolo {item.latestChapter}
                    </Box>
                  )}
                  
                  {/* Adult Badge */}
                  {item.isAdult && (
                    <Badge 
                      position="absolute" 
                      top={2} 
                      right={2} 
                      colorScheme="pink" 
                      fontSize="xs"
                    >
                      18+
                    </Badge>
                  )}
                </MotionBox>
              ))}
            </SimpleGrid>

            {/* Load More Trigger */}
            <Center ref={observerTarget} py={8}>
              {loading && (
                <HStack spacing={3}>
                  <Spinner color="purple.500" />
                  <Text>Caricamento...</Text>
                </HStack>
              )}
              {!hasMore && list.length > 0 && (
                <Text color="gray.500">Hai raggiunto la fine</Text>
              )}
            </Center>
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
