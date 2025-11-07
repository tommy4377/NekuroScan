// frontend/src/pages/Trending.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Switch, Center, SimpleGrid
} from '@chakra-ui/react';
import { FaFire, FaArrowUp, FaPlus } from 'react-icons/fa';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import { useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import { useLocalStorage } from '../hooks/useLocalStorage';

// const Box = motion(Box); // Rimosso per evitare errori React #300

const Trending = React.memo(() => {
  const navigate = useNavigate();
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [lists, setLists] = useState({
    trending: []
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAllItems, setShowAllItems] = useState({
    trending: false
  });
  
  const toast = useToast();
  const currentKey = 'trending';

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

  const loadData = useCallback(async () => {
    if (loading) return;
    
    setInitialLoading(true);
    setLoading(true);
    
    try {
      const result = await apiManager.getTrending(includeAdult);
      if (result && result.length > 0) {
        preCacheImages(result);
        setLists({ trending: result });
      } else {
        setLists({ trending: [] });
      }
    } catch (error) {
      console.error('Error loading trending:', error);
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

  const handleShowMore = () => {
    setShowAllItems(prev => ({ ...prev, [currentKey]: true }));
  };

  const handleShowLess = () => {
    setShowAllItems({ trending: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCategories = () => {
    navigate('/categories', { 
      state: { 
        includeAdult,
        preset: 'popular'
      } 
    });
  };

  const renderGrid = (items) => {
    return (
      <SimpleGrid 
        columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} 
        spacing={4}
        w="100%"
      >
        {items.map((item, i) => (
          <Box
            key={item.url || `trending-${i}`}
            position="relative"
            h="100%"
          >
            <MangaCard 
              manga={item} 
              hideSource 
              showLatestChapter={true}
              priority={i < 12}
            />
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
          </Box>
        ))}
      </SimpleGrid>
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
                  Capitoli in Tendenza
                </Heading>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.400">
                    {lists.trending.length} contenuti
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
  );
});

Trending.displayName = 'Trending';

export default Trending;