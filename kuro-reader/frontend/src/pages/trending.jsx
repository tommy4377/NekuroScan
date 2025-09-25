import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Switch, Center,
  Tabs, TabList, Tab, TabPanels, TabPanel
} from '@chakra-ui/react';
import { FaFire, FaArrowUp, FaPlus, FaClock, FaHeart } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function Trending() {
  const navigate = useNavigate();
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [activeTab, setActiveTab] = useState(0);
  const [lists, setLists] = useState({
    trending: [],
    recentChapters: [],
    weeklyTop: []
  });
  const [pages, setPages] = useState({
    trending: 1,
    recentChapters: 1,
    weeklyTop: 1
  });
  const [hasMore, setHasMore] = useState({
    trending: true,
    recentChapters: true,
    weeklyTop: true
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const toast = useToast();

  const tabKeys = ['trending', 'recentChapters', 'weeklyTop'];
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
      console.log(`Loading ${type} page ${pageNum}...`);
      let result = [];
      
      switch(type) {
        case 'trending':
          result = await apiManager.getTrending(includeAdult);
          break;
        case 'recentChapters':
          result = await apiManager.getRecentChapters(includeAdult);
          break;
        case 'weeklyTop':
          result = await apiManager.getWeeklyReleases();
          break;
      }
      
      if (result && result.length > 0) {
        setLists(prev => ({
          ...prev,
          [type]: reset || pageNum === 1 
            ? result 
            : [...prev[type], ...result.filter(item => 
                !prev[type].some(existing => existing.url === item.url)
              )]
        }));
        
        setPages(prev => ({ ...prev, [type]: pageNum }));
        
        // Since API doesn't support pagination for these, disable load more after first page
        setHasMore(prev => ({ ...prev, [type]: pageNum === 1 && result.length >= 15 }));
      }
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare i contenuti',
        status: 'error',
        duration: 3000,
      });
      setHasMore(prev => ({ ...prev, [type]: false }));
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [includeAdult, hasMore, toast, loading]);

  // Initial load for active tab
  useEffect(() => {
    loadData(currentKey, 1, true);
  }, [currentKey, includeAdult]);

  const handleLoadMore = () => {
    if (!loading && hasMore[currentKey]) {
      // For trending content, we simulate pagination by loading from different sources
      loadData(currentKey, pages[currentKey] + 1);
    }
  };

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
            Nessun contenuto disponibile
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
              <MangaCard 
                manga={item} 
                hideSource 
                showLatestChapter={true}
              />
              
              {/* Trending Badge for top 3 */}
              {currentKey === 'trending' && i < 3 && pages[currentKey] === 1 && (
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
            </MotionBox>
          ))}
        </SimpleGrid>
        
        {/* Load More Button */}
        {hasMore[currentKey] && (
          <Center py={6}>
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
        {/* Header */}
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
                  Trending & Aggiornamenti
                </Heading>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.400">
                    {lists[currentKey].length} contenuti
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
                <Text display={{ base: 'none', md: 'block' }}>Trending</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FaClock />
                <Text display={{ base: 'none', md: 'block' }}>Ultimi Capitoli</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FaHeart />
                <Text display={{ base: 'none', md: 'block' }}>Top Settimanali</Text>
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

export default Trending;