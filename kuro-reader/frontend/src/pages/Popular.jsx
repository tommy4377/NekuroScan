// frontend/src/pages/Popular.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton,
  Tabs, TabList, Tab, TabPanels, TabPanel, Center, SimpleGrid
} from '@chakra-ui/react';
import { FaHeart, FaArrowUp, FaFire, FaStar, FaTrophy, FaPlus } from 'react-icons/fa';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useInView } from 'react-intersection-observer';

// const Box = motion(Box); // Rimosso per evitare errori React #300

function Popular() {
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [activeTab, setActiveTab] = useState(0);
  const [lists, setLists] = useState({
    mostRead: [],
    topRated: [],
    trending: []
  });
  const [pages, setPages] = useState({
    mostRead: 1,
    topRated: 1,
    trending: 1
  });
  const [hasMore, setHasMore] = useState({
    mostRead: true,
    topRated: true,
    trending: true
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useLocalStorage('infiniteScroll', true);
  const toast = useToast();
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px'
  });

  const tabKeys = ['mostRead', 'topRated', 'trending'];
  const currentKey = tabKeys[activeTab];

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const preCacheImages = useCallback((items) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const urls = items.map(i => i.cover || i.coverUrl).filter(Boolean);
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls });
    }
  }, []);

  const loadData = useCallback(async (type, pageNum, reset = false) => {
    if (loading && !reset) return;
    if (!hasMore[type] && !reset) return;
    
    if (reset || pageNum === 1) {
      setInitialLoading(true);
      setLists(prev => ({ ...prev, [type]: [] }));
      setPages(prev => ({ ...prev, [type]: 1 }));
      setHasMore(prev => ({ ...prev, [type]: true }));
      pageNum = 1;
    }
    
    setLoading(true);
    
    try {
      let result;
      switch(type) {
        case 'mostRead':
          result = await statsAPI.getMostFavorites(includeAdult, pageNum);
          break;
        case 'topRated':
          result = await statsAPI.searchAdvanced({ sort: 'score', page: pageNum, includeAdult });
          break;
        case 'trending':
          result = await statsAPI.searchAdvanced({ sort: 'newest', page: pageNum, includeAdult });
          break;
        default:
          result = await statsAPI.getMostFavorites(includeAdult, pageNum);
      }
      
      if (result && result.results) {
        setLists(prev => {
          const merged = reset || pageNum === 1 
            ? result.results 
            : [...prev[type], ...result.results.filter(item => 
                !prev[type].some(existing => existing.url === item.url)
              )];
          preCacheImages(merged);
          return { ...prev, [type]: merged };
        });
        
        setPages(prev => ({ ...prev, [type]: pageNum }));
        setHasMore(prev => ({ ...prev, [type]: result.hasMore && result.results.length > 0 }));
      }
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare i manga popolari',
        status: 'error',
        duration: 3000,
      });
      setHasMore(prev => ({ ...prev, [type]: false }));
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [includeAdult, hasMore, toast, loading, preCacheImages]);

  useEffect(() => {
    loadData(currentKey, 1, true);
  }, [currentKey, includeAdult]);

  // Infinite scroll
  useEffect(() => {
    if (inView && infiniteScrollEnabled && hasMore[currentKey] && !loading) {
      loadData(currentKey, pages[currentKey] + 1);
    }
  }, [inView, infiniteScrollEnabled, hasMore, currentKey, loading]);

  const handleLoadMore = () => {
    if (!loading && hasMore[currentKey]) {
      loadData(currentKey, pages[currentKey] + 1);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const renderGrid = (items) => {
    return (
      <SimpleGrid 
        columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} 
        spacing={4}
        w="100%"
      >
        {items.map((item, i) => (
          <Box
            key={item.url || `popular-${i}`}
            position="relative"
            h="100%"
          >
            <MangaCard 
              manga={item} 
              hideSource 
              priority={i < 12}
            />
            {i < 3 && pages[currentKey] === 1 && (
              <Badge
                position="absolute"
                top={2}
                left={2}
                colorScheme={i === 0 ? 'yellow' : i === 1 ? 'gray' : 'orange'}
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
    );
  };

  const renderContent = () => {
    const currentList = lists[currentKey];
    
    if (initialLoading) {
      return (
        <HStack spacing={4} wrap="wrap">
          {[...Array(20)].map((_, i) => (
            <Skeleton key={i} height="320px" borderRadius="lg" flex="1 0 160px" />
          ))}
        </HStack>
      );
    }
    
    if (currentList.length === 0) {
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
        {renderGrid(currentList)}
        {hasMore[currentKey] && (
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
        {!hasMore[currentKey] && currentList.length > 0 && (
          <Center py={4}>
            <Text color="gray.500">Fine dei risultati</Text>
          </Center>
        )}
      </>
    );
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box 
                p={3} 
                bg="pink.500" 
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FaHeart color="white" size="20" />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'md', md: 'lg' }}>
                  Manga Popolari
                </Heading>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.400">
                    {lists[currentKey].length} caricati
                  </Text>
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

        <Tabs 
          colorScheme="purple" 
          variant="soft-rounded"
          onChange={setActiveTab}
          defaultIndex={0}
        >
          <TabList bg="gray.800" p={2} borderRadius="lg">
            <Tab>
              <HStack spacing={2}>
                <FaFire />
                <Text display={{ base: 'none', md: 'block' }}>Più letti</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FaStar />
                <Text display={{ base: 'none', md: 'block' }}>Migliori</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FaTrophy />
                <Text display={{ base: 'none', md: 'block' }}>Trending</Text>
              </HStack>
            </Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel px={0} pt={6}>
              {activeTab === 0 && renderContent()}
            </TabPanel>
            <TabPanel px={0} pt={6}>
              {activeTab === 1 && renderContent()}
            </TabPanel>
            <TabPanel px={0} pt={6}>
              {activeTab === 2 && renderContent()}
            </TabPanel>
          </TabPanels>
        </Tabs>

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

export default Popular;