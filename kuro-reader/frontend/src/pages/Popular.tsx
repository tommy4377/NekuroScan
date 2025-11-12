/**
 * POPULAR - Popular manga page
 * Shows popular manga with infinite scroll and pagination
 */

import { useState, useEffect, useCallback, memo } from 'react';
import type { ChangeEvent } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton,
  Center, SimpleGrid, Spinner, Switch
} from '@chakra-ui/react';
import { FaFire, FaArrowUp, FaPlus } from 'react-icons/fa';
import { useInView } from 'react-intersection-observer';
import type { Manga } from '@/types/manga';
import MangaCard from '@/components/MangaCard';
import statsAPI from '@/api/stats';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSEO, SEOTemplates } from '@/hooks/useSEO';

// ========== COMPONENT ==========

const Popular = memo(() => {
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [list, setList] = useState<Manga[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [infiniteScrollEnabled] = useLocalStorage('infiniteScroll', true);
  const toast = useToast();
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px'
  });

  useEffect(() => {
    const handleScroll = (): void => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const preCacheImages = useCallback((items: Manga[]) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const urls = items.map(i => i.coverUrl).filter(Boolean) as string[];
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls });
    }
  }, []);

  const loadData = useCallback(async (pageNum: number, reset = false) => {
    if (loading && !reset) return;
    if (!hasMore && !reset) return;
    
    if (reset || pageNum === 1) {
      setInitialLoading(true);
      setList([]);
      setPage(1);
      setHasMore(true);
      pageNum = 1;
    }
    
    setLoading(true);
    
    try {
      const result = await statsAPI.searchAdvanced({ sort: 'newest', page: pageNum, includeAdult });
      
      if (result && result.results) {
        setList(prev => {
          const merged = reset || pageNum === 1 
            ? result.results 
            : [...prev, ...result.results.filter((item: Manga) => 
                !prev.some(existing => existing.url === item.url)
              )];
          preCacheImages(merged);
          return merged;
        });
        
        setPage(pageNum);
        setHasMore(result.hasMore && result.results.length > 0);
      }
    } catch {
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare i manga trending',
        status: 'error',
        duration: 3000,
      });
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [includeAdult, hasMore, toast, loading, preCacheImages]);

  useEffect(() => {
    loadData(1, true);
  }, [includeAdult]);

  // Infinite scroll
  useEffect(() => {
    if (inView && infiniteScrollEnabled && hasMore && !loading) {
      loadData(page + 1);
    }
  }, [inView, infiniteScrollEnabled, hasMore, loading]);

  const handleLoadMore = (): void => {
    if (!loading && hasMore) {
      loadData(page + 1);
    }
  };

  const renderContent = () => {
    if (initialLoading) {
      return (
        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} spacing={4} w="100%">
          {[...Array(20)].map((_, i) => (
            <Skeleton key={i} height="320px" borderRadius="lg" />
          ))}
        </SimpleGrid>
      );
    }
    
    if (list.length === 0) {
      return (
        <Center py={12}>
          <Text fontSize="lg" color="gray.500">
            Nessun manga trovato
          </Text>
        </Center>
      );
    }
    
    return (
      <>
        <SimpleGrid 
          columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} 
          spacing={4}
          w="100%"
        >
          {list.map((item, i) => (
            <Box
              key={item.url || `popular-${i}`}
              position="relative"
              h="100%"
            >
              <MangaCard 
                manga={item} 
                priority={i < 12}
              />
              {i < 3 && page === 1 && (
                <Badge
                  position="absolute"
                  top={2}
                  left={2}
                  colorScheme="orange"
                  fontSize="sm"
                  px={2}
                  py={1}
                  zIndex={10}
                >
                  🔥 #{i + 1}
                </Badge>
              )}
            </Box>
          ))}
        </SimpleGrid>
        
        {hasMore && (
          <Center py={6} ref={infiniteScrollEnabled ? loadMoreRef : null}>
            {infiniteScrollEnabled && loading ? (
              <VStack>
                <Spinner color="purple.500" />
                <Text fontSize="sm" color="gray.400">Caricamento...</Text>
              </VStack>
            ) : !infiniteScrollEnabled ? (
              <Button
                onClick={handleLoadMore}
                isLoading={loading}
                loadingText="Caricamento..."
                colorScheme="purple"
                size="lg"
                leftIcon={!loading ? <FaPlus /> : undefined}
                variant="solid"
                disabled={loading}
              >
                {loading ? 'Caricamento...' : 'Carica altri'}
              </Button>
            ) : null}
          </Center>
        )}
        
        {!hasMore && list.length > 0 && (
          <Center py={4}>
            <Text color="gray.500">Fine dei risultati</Text>
          </Center>
        )}
      </>
    );
  };

  const SEOHelmet = useSEO(SEOTemplates.trending());

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
                  bg="orange.500" 
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <FaFire color="white" size="20" />
                </Box>
                <VStack align="start" spacing={0}>
                  <Heading size={{ base: 'md', md: 'lg' }}>
                    Capitoli in Tendenza
                  </Heading>
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.400">
                      {list.length} contenuti
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
                  isChecked={Boolean(includeAdult)}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setIncludeAdult(e.target.checked)}
                />
              </HStack>
            </HStack>
          </Box>

          <Box pt={6}>
            {renderContent()}
          </Box>

          {showScrollTop && (
            <IconButton
              icon={<FaArrowUp />}
              position="fixed"
              bottom={8}
              right={8}
              colorScheme="purple"
              borderRadius="full"
              size="lg"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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

Popular.displayName = 'Popular';

export default Popular;

