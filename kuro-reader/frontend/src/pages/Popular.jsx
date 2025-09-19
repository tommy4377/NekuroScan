import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Spinner,
  Select, Switch, Tabs, TabList, Tab, TabPanels, TabPanel, Center
} from '@chakra-ui/react';
import { FaHeart, FaArrowUp, FaFire, FaStar, FaTrophy } from 'react-icons/fa';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

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
  
  const toast = useToast();
  const observerRef = useRef(null);
  const loadingRef = useRef(false);

  const tabKeys = ['mostRead', 'topRated', 'trending'];
  const currentKey = tabKeys[activeTab];

  // Monitor scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load data function
  const loadData = useCallback(async (type, pageNum, reset = false) => {
    if (loadingRef.current && !reset) return;
    if (!hasMore[type] && !reset) return;
    
    loadingRef.current = true;
    
    if (reset || pageNum === 1) {
      setInitialLoading(true);
      setLists(prev => ({ ...prev, [type]: [] }));
      setPages(prev => ({ ...prev, [type]: 1 }));
      setHasMore(prev => ({ ...prev, [type]: true }));
      pageNum = 1;
    } else {
      setLoading(true);
    }
    
    try {
      console.log(`Loading ${type} page ${pageNum}...`);
      let result;
      
      switch(type) {
        case 'mostRead':
          result = await statsAPI.getMostFavorites(includeAdult, pageNum);
          break;
        case 'topRated':
          result = await statsAPI.searchAdvanced({
            sort: 'score',
            page: pageNum,
            includeAdult
          });
          break;
        case 'trending':
          result = await statsAPI.searchAdvanced({
            sort: 'newest',
            page: pageNum,
            includeAdult
          });
          break;
        default:
          result = await statsAPI.getMostFavorites(includeAdult, pageNum);
      }
      
      if (result && result.results) {
        setLists(prev => ({
          ...prev,
          [type]: reset || pageNum === 1 
            ? result.results 
            : [...prev[type], ...result.results]
        }));
        
        setPages(prev => ({ ...prev, [type]: pageNum }));
        setHasMore(prev => ({ ...prev, [type]: result.hasMore && result.results.length > 0 }));
        
        console.log(`Loaded ${result.results.length} items for ${type}. Has more: ${result.hasMore}`);
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
      loadingRef.current = false;
      setInitialLoading(false);
      setLoading(false);
    }
  }, [includeAdult, hasMore, toast]);

  // Initial load for active tab
  useEffect(() => {
    loadData(currentKey, 1, true);
  }, [currentKey, includeAdult]);

  // Setup Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && 
            hasMore[currentKey] && 
            !loadingRef.current && 
            !initialLoading && 
            lists[currentKey].length > 0) {
          console.log(`Trigger loading next page for ${currentKey}...`);
          loadData(currentKey, pages[currentKey] + 1);
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
  }, [currentKey, hasMore, pages, lists, initialLoading, loadData]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    const currentList = lists[currentKey];
    
    if (initialLoading) {
      return (
        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
          {[...Array(20)].map((_, i) => (
            <Skeleton key={i} height="320px" borderRadius="lg" />
          ))}
        </SimpleGrid>
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
        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
          {currentList.map((item, i) => (
            <MotionBox
              key={`${item.url}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              position="relative"
            >
              <MangaCard manga={item} hideSource />
              
              {/* Rank Badge for top 3 */}
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
            </MotionBox>
          ))}
        </SimpleGrid>
        
        {/* Observer Target */}
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
          {!hasMore[currentKey] && currentList.length > 0 && (
            <Text color="gray.500">Fine dei risultati</Text>
          )}
        </Box>
      </>
    );
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box p={3} bg="pink.500" borderRadius="lg">
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

        {/* Tabs */}
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

export default Popular;
