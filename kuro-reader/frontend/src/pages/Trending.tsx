/**
 * TRENDING - Trending manga page
 * Shows currently trending manga with infinite scroll
 */

import { useState, useEffect, useCallback, memo } from 'react';
import type { ChangeEvent } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack,
  useToast, Skeleton, Badge, IconButton, Switch, Center, SimpleGrid, Spinner
} from '@chakra-ui/react';
import { FaFire, FaArrowUp } from 'react-icons/fa';
import { useInView } from 'react-intersection-observer';
import type { Manga } from '@/types/manga';
import MangaCard from '@/components/MangaCard';
import apiManager from '@/api';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSEO, SEOTemplates } from '@/hooks/useSEO';

// ========== COMPONENT ==========

const Trending = memo((): JSX.Element => {
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [list, setList] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const toast = useToast();
  
  const { ref: loadMoreRef } = useInView({
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

  const loadData = useCallback(async () => {
    if (loading) return;
    
    setInitialLoading(true);
    setLoading(true);
    
    try {
      const result = await apiManager.getTrending(includeAdult);
      if (result && result.length > 0) {
        preCacheImages(result);
        setList(result);
      } else {
        setList([]);
      }
    } catch {
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare i contenuti',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [includeAdult, toast, loading, preCacheImages]);

  useEffect(() => {
    loadData();
  }, [includeAdult]);

  const renderContent = (): JSX.Element => {
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
            Nessun contenuto disponibile
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
              key={item.url || `trending-${i}`}
              position="relative"
              h="100%"
            >
              <MangaCard 
                manga={item} 
                showLatestChapter={true}
                priority={i < 12}
              />
              {i < 3 && (
                <Badge
                  position="absolute"
                  top={2}
                  left={2}
                  colorScheme="orange"
                  fontSize="xs"
                  px={2}
                  py={1}
                  zIndex={10}
                >
                  🔥 HOT
                </Badge>
              )}
            </Box>
          ))}
        </SimpleGrid>
        
        {list.length > 0 && (
          <Center py={6} ref={loadMoreRef}>
            {loading && (
              <VStack spacing={2}>
                <Spinner size="lg" color="orange.500" thickness="3px" />
                <Text fontSize="sm" color="gray.400">Caricamento...</Text>
              </VStack>
            )}
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
                  isChecked={includeAdult}
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

Trending.displayName = 'Trending';

export default Trending;

