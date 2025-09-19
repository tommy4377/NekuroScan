import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Spinner,
  Select, Switch, Tabs, TabList, Tab, TabPanels, TabPanel
} from '@chakra-ui/react';
import { useInView } from 'react-intersection-observer';
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
  const [sortBy, setSortBy] = useState('all_time'); // all_time, month, week
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const { ref, inView } = useInView({ 
    threshold: 0.1, 
    rootMargin: '200px' 
  });
  
  const toast = useToast();

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

  // Load initial data
  useEffect(() => {
    loadData(currentKey, 1);
  }, [includeAdult, sortBy, activeTab]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore[currentKey] && !loading && lists[currentKey].length > 0) {
      loadData(currentKey, pages[currentKey] + 1);
    }
  }, [inView, currentKey]);

  const loadData = async (type, pageNum) => {
    if (pageNum === 1) {
      setInitialLoading(true);
      setLists(prev => ({ ...prev, [type]: [] }));
    } else {
      setLoading(true);
    }
    
    try {
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
      
      // Apply time filter if needed
      let filtered = result.results;
      if (sortBy === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.updateDate || Date.now());
          return itemDate >= monthAgo;
        });
      } else if (sortBy === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.updateDate || Date.now());
          return itemDate >= weekAgo;
        });
      }
      
      if (pageNum === 1) {
        setLists(prev => ({ ...prev, [type]: filtered }));
      } else {
        setLists(prev => ({ 
          ...prev, 
          [type]: [...prev[type], ...filtered] 
        }));
      }
      
      setPages(prev => ({ ...prev, [type]: pageNum }));
      setHasMore(prev => ({ ...prev, [type]: result.hasMore }));
      
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare i manga popolari',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = (listKey) => {
    const currentList = lists[listKey];
    
    if (initialLoading && activeTab === tabKeys.indexOf(listKey)) {
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
        <Box textAlign="center" py={12}>
          <Text fontSize="lg" color="gray.500">
            Nessun manga trovato
          </Text>
        </Box>
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
              <Box position="relative">
                <MangaCard manga={item} hideSource />
                
                {/* Rank Badge for top manga */}
                {i < 3 && (
                  <Badge
                    position="absolute"
                    top={2}
                    left={2}
                    colorScheme={i === 0 ? 'yellow' : i === 1 ? 'gray' : 'orange'}
                    fontSize="sm"
                    px={2}
                    py={1}
                  >
                    #{i + 1}
                  </Badge>
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
              </Box>
            </MotionBox>
          ))}
        </SimpleGrid>
        
        {hasMore[listKey] && (
          <Box ref={activeTab === tabKeys.indexOf(listKey) ? ref : null} textAlign="center" py={6}>
            {loading ? (
              <HStack justify="center" spacing={3}>
                <Spinner color="purple.500" />
                <Text>Caricamento...</Text>
              </HStack>
            ) : (
              <Button 
                variant="outline" 
                colorScheme="purple"
                onClick={() => loadData(listKey, pages[listKey] + 1)}
              >
                Carica altri
              </Button>
            )}
          </Box>
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
              <Box p={3} bg="pink.500" borderRadius="lg">
                <FaHeart color="white" size="20" />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'md', md: 'lg' }}>
                  Manga Popolari
                </Heading>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.400">
                    I più amati dalla community
                  </Text>
                  {!initialLoading && (
                    <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>
                      {includeAdult ? '18+ inclusi' : 'Solo normali'}
                    </Badge>
                  )}
                </HStack>
              </VStack>
            </HStack>
            
            {/* Filters */}
            <HStack spacing={3}>
              <Select
                size="sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                maxW="150px"
                bg="gray.700"
              >
                <option value="all_time">Sempre</option>
                <option value="month">Mese</option>
                <option value="week">Settimana</option>
              </Select>
              
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
              {renderContent('mostRead')}
            </TabPanel>
            <TabPanel px={0} pt={6}>
              {renderContent('topRated')}
            </TabPanel>
            <TabPanel px={0} pt={6}>
              {renderContent('trending')}
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
