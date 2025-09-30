// frontend/src/pages/Trending.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Switch, Center,
  Tabs, TabList, Tab, TabPanels, TabPanel
} from '@chakra-ui/react';
import { FaFire, FaArrowUp, FaPlus, FaClock, FaHeart } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import VirtualGrid from '../components/VirtualGrid';

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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAllItems, setShowAllItems] = useState({
    trending: false,
    recentChapters: false,
    weeklyTop: false
  });
  
  const toast = useToast();
  const tabKeys = ['trending', 'recentChapters', 'weeklyTop'];
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

  const loadData = useCallback(async (type) => {
    if (loading) return;
    
    setInitialLoading(true);
    setLoading(true);
    
    try {
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
        preCacheImages(result);
        setLists(prev => ({ ...prev, [type]: result }));
      } else {
        setLists(prev => ({ ...prev, [type]: [] }));
      }
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
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
    loadData(currentKey);
  }, [currentKey, includeAdult]);

  const handleShowMore = () => {
    setShowAllItems(prev => ({ ...prev, [currentKey]: true }));
  };

  const handleShowLess = () => {
    setShowAllItems(prev => ({ ...prev, [currentKey]: false }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCategories = () => {
    navigate('/categories', { 
      state: { 
        includeAdult,
        preset: currentKey === 'trending' ? 'popular' : 'latest'
      } 
    });
  };

  const renderGrid = (items) => {
    if (items.length > 30) {
      return (
        <VirtualGrid
          items={items}
          minWidth={160}
          gap={16}
          renderItem={(item, i) => (
            <MotionBox
              key={`${item.url}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.3) }}
              position="relative"
            >
              <MangaCard manga={item} hideSource showLatestChapter={true} />
              {currentKey === 'trending' && i < 3 && (
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
          )}
        />
      );
    }

    return (
      <HStack spacing={4} wrap="wrap">
        {items.map((item, i) => (
          <MotionBox
            key={`${item.url}-${i}`}
            flex="1 0 160px"
            maxW="200px"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            position="relative"
          >
            <MangaCard manga={item} hideSource showLatestChapter={true} />
            {currentKey === 'trending' && i < 3 && (
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
      </HStack>
    );
  };

  const renderContent = () => {
    const currentList = lists[currentKey];
    const showAll = showAllItems[currentKey];
    const itemsToShow = showAll ? currentList : currentList.slice(0, 20);
    
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
            Nessun contenuto disponibile
          </Text>
        </Center>
      );
    }
    
    return (
      <>
        {renderGrid(itemsToShow)}
        
        {currentList.length > 20 && (
          <Center py={6}>
            {!showAll ? (
              <VStack spacing={3}>
                <Button
                  onClick={handleShowMore}
                  colorScheme="purple"
                  size="lg"
                  leftIcon={<FaPlus />}
                  variant="solid"
                >
                  Mostra tutti ({currentList.length - 20} rimanenti)
                </Button>
                <Button
                  onClick={navigateToCategories}
                  variant="outline"
                  colorScheme="purple"
                  size="sm"
                >
                  Esplora altre categorie
                </Button>
              </VStack>
            ) : (
              <Button
                onClick={handleShowLess}
                colorScheme="gray"
                size="lg"
                variant="outline"
              >
                Mostra meno
              </Button>
            )}
          </Center>
        )}
        
        {currentList.length <= 20 && currentList.length > 0 && (
          <Center py={6}>
            <VStack spacing={3}>
              <Text color="gray.500">
                Hai visto tutti i {currentList.length} contenuti disponibili
              </Text>
              <Button
                onClick={navigateToCategories}
                colorScheme="purple"
                variant="outline"
              >
                Esplora altre categorie
              </Button>
            </VStack>
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

        <Tabs 
          colorScheme="purple" 
          variant="soft-rounded"
          onChange={(index) => {
            setActiveTab(index);
            setShowAllItems({ trending: false, recentChapters: false, weeklyTop: false });
          }}
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
  );
}

export default Trending;