// frontend/src/pages/Home.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Badge, Icon as ChakraIcon, useBreakpointValue,
  Spinner, Center, Divider
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FaFire, FaClock, FaStar, FaBookOpen, FaHeart,
  FaChevronRight, FaSync, FaTrophy, FaDragon, FaArrowRight
} from 'react-icons/fa';
import { GiDragonHead } from 'react-icons/gi';
import { BiBook } from 'react-icons/bi';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  
  const [content, setContent] = useState({
    recentChapters: [], // NUOVI capitoli recenti reali
    popular: [],
    topManga: [],
    topManhwa: [],
    topManhua: [],
    topOneshot: [],
    continueReading: [],
    recommendations: []
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadAllContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Carica VERI capitoli recenti dalla homepage/archivio ordinato per data
      const recentChaptersPromise = apiManager.getRecentChapters();
      
      const [
        recentChaptersRes,
        popularRes, 
        mangaRes, 
        manhwaRes, 
        manhuaRes, 
        oneshotRes
      ] = await Promise.allSettled([
        recentChaptersPromise,
        statsAPI.getMostFavorites(includeAdult, 1),
        statsAPI.getTopByType('manga', includeAdult, 1),
        statsAPI.getTopByType('manhwa', includeAdult, 1),
        statsAPI.getTopByType('manhua', includeAdult, 1),
        statsAPI.getTopByType('oneshot', includeAdult, 1)
      ]);
      
      const processResult = (result, fallback = []) => {
        if (result.status === 'fulfilled' && result.value?.results) {
          return result.value.results.slice(0, 15);
        } else if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          return result.value.slice(0, 15);
        }
        return fallback;
      };
      
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const readingWithProgress = reading.slice(0, 10).map(item => ({
        ...item,
        continueFrom: item.lastChapterIndex ? `Cap. ${item.lastChapterIndex + 1}` : null
      }));
      
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      let recommendations = [];
      if (favorites.length > 0) {
        try {
          const genre = favorites[0].genres?.[0]?.genre || 'shounen';
          const recRes = await statsAPI.searchAdvanced({
            genres: [genre],
            sort: 'score',
            page: 1,
            includeAdult
          });
          recommendations = recRes.results.slice(0, 10);
        } catch (err) {
          console.error('Failed to load recommendations:', err);
        }
      }
      
      setContent({
        recentChapters: processResult(recentChaptersRes), // Veri capitoli recenti
        popular: processResult(popularRes),
        topManga: processResult(mangaRes),
        topManhwa: processResult(manhwaRes),
        topManhua: processResult(manhuaRes),
        topOneshot: processResult(oneshotRes),
        continueReading: readingWithProgress,
        recommendations
      });
      
    } catch (error) {
      console.error('Error loading home content:', error);
      setError('Alcuni contenuti potrebbero non essere disponibili');
      toast({
        title: 'Errore caricamento',
        description: 'Alcuni contenuti potrebbero non essere disponibili',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeAdult, toast]);

  useEffect(() => {
    loadAllContent();
  }, [loadAllContent]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllContent();
  };

  // FIX: navigazione corretta per "Vedi tutti"
  const navigateToSection = (path, state = {}) => {
    navigate(path, { state: { ...state, includeAdult } });
  };

  const ContentSection = ({ 
    title, 
    icon, 
    items, 
    color = 'purple', 
    viewAllPath,
    viewAllState = {},
    showLatestChapter = false,
    showProgress = false,
    emptyMessage = 'Nessun contenuto disponibile'
  }) => {
    if (!items || items.length === 0 && !loading) {
      return (
        <Box bg="gray.800" p={{ base: 3, md: 4 }} borderRadius="lg">
          <HStack justify="space-between" mb={4}>
            <HStack spacing={3}>
              <Box 
                p={2} 
                bg={`${color}.500`} 
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
                minW="36px"
                minH="36px"
              >
                <ChakraIcon as={icon} color="white" boxSize={5} />
              </Box>
              <Heading size={{ base: 'sm', md: 'md' }}>{title}</Heading>
            </HStack>
          </HStack>
          <Center py={8}>
            <Text color="gray.500">{emptyMessage}</Text>
          </Center>
        </Box>
      );
    }

    return (
      <VStack align="stretch" spacing={4}>
        <Box bg="gray.800" p={{ base: 3, md: 4 }} borderRadius="lg">
          <HStack justify="space-between" mb={4}>
            <HStack spacing={3}>
              <Box 
                p={2} 
                bg={`${color}.500`} 
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
                minW="36px"
                minH="36px"
              >
                <ChakraIcon as={icon} color="white" boxSize={5} />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'sm', md: 'md' }}>{title}</Heading>
                <Text fontSize="xs" color="gray.400">
                  {items.length} disponibili
                </Text>
              </VStack>
            </HStack>
            {viewAllPath && (
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<FaChevronRight />}
                onClick={() => navigateToSection(viewAllPath, viewAllState)}
                color={`${color}.400`}
                _hover={{ bg: `${color}.900` }}
              >
                Vedi tutti
              </Button>
            )}
          </HStack>

          <Box overflowX="auto" pb={2}>
            <HStack spacing={{ base: 3, md: 4 }} align="start">
              {items.map((item, i) => (
                <MotionBox
                  key={`${item.url}-${i}`}
                  minW={{ base: '140px', md: '160px' }}
                  maxW={{ base: '140px', md: '160px' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  position="relative"
                >
                  <MangaCard 
                    manga={item} 
                    hideSource 
                    showLatestChapter={showLatestChapter}
                  />
                  
                  {showProgress && item.continueFrom && (
                    <Box
                      position="absolute"
                      bottom="60px"
                      left={2}
                      right={2}
                      bg="green.600"
                      color="white"
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="xs"
                      textAlign="center"
                      fontWeight="bold"
                      opacity={0.95}
                      zIndex={10}
                    >
                      {item.continueFrom}
                    </Box>
                  )}
                </MotionBox>
              ))}
            </HStack>
          </Box>
        </Box>
      </VStack>
    );
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={{ base: 4, md: 8 }}>
        <VStack spacing={8}>
          <Skeleton height="150px" borderRadius="xl" />
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} w="100%">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }}>
      <VStack spacing={{ base: 6, md: 8 }} align="stretch">
        {/* Header */}
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <VStack align="start" spacing={1}>
              <Heading 
                size={{ base: 'lg', md: 'xl' }} 
                bgGradient="linear(to-r, purple.400, pink.400)" 
                bgClip="text"
              >
                Benvenuto su KuroReader
              </Heading>
              <Text color="gray.400">
                Scopri i tuoi manga preferiti
              </Text>
            </VStack>
            <HStack>
              <Button
                variant={includeAdult ? 'solid' : 'outline'}
                colorScheme="pink"
                size="sm"
                onClick={() => setIncludeAdult(!includeAdult)}
              >
                {includeAdult ? '🔞 Adult ON' : '🔞 Adult OFF'}
              </Button>
              <IconButton
                icon={<FaSync />}
                onClick={handleRefresh}
                aria-label="Ricarica"
                isLoading={refreshing}
                variant="ghost"
                colorScheme="purple"
              />
            </HStack>
          </HStack>
        </Box>

        {/* Continua a leggere */}
        {content.continueReading.length > 0 && (
          <ContentSection
            title="Continua a leggere"
            icon={FaBookOpen}
            items={content.continueReading}
            color="green"
            viewAllPath="/library"
            showProgress={true}
          />
        )}

        {/* NUOVA SEZIONE: Ultimi capitoli aggiunti */}
        {content.recentChapters.length > 0 && (
          <ContentSection 
            title="Ultimi capitoli aggiunti" 
            icon={FaClock} 
            items={content.recentChapters} 
            color="blue" 
            viewAllPath="/categories"
            viewAllState={{ preset: 'latest' }}
            showLatestChapter={true}
          />
        )}

        {/* Manga più letti / popolari */}
        {content.popular.length > 0 && (
          <ContentSection 
            title="I più letti del momento" 
            icon={FaHeart} 
            items={content.popular} 
            color="pink" 
            viewAllPath="/categories"
            viewAllState={{ preset: 'popular' }}
          />
        )}

        {/* Top Series per tipo */}
        <Box bg="gray.800" borderRadius="xl" p={{ base: 3, md: 4 }}>
          <HStack mb={4}>
            <Box p={2} bg="orange.500" borderRadius="lg">
              <FaTrophy color="white" size="20" />
            </Box>
            <Heading size={{ base: 'md', md: 'lg' }}>Top Series</Heading>
          </HStack>
          
          <VStack spacing={4} align="stretch">
            <ContentSection 
              title="Top Manga" 
              icon={GiDragonHead} 
              items={content.topManga} 
              color="orange" 
              viewAllPath="/categories"
              viewAllState={{ type: 'manga' }}
            />
            <ContentSection 
              title="Top Manhwa" 
              icon={BiBook} 
              items={content.topManhwa} 
              color="purple" 
              viewAllPath="/categories"
              viewAllState={{ type: 'manhwa' }}
            />
            <ContentSection 
              title="Top Manhua" 
              icon={FaDragon} 
              items={content.topManhua} 
              color="red" 
              viewAllPath="/categories"
              viewAllState={{ type: 'manhua' }}
            />
            <ContentSection 
              title="Top Oneshot" 
              icon={FaBookOpen} 
              items={content.topOneshot} 
              color="green" 
              viewAllPath="/categories"
              viewAllState={{ type: 'oneshot' }}
            />
          </VStack>
        </Box>

        {/* Consigliati */}
        {content.recommendations.length > 0 && (
          <ContentSection 
            title="Consigliati per te" 
            icon={FaStar} 
            items={content.recommendations} 
            color="yellow" 
            emptyMessage="Aggiungi preferiti per ricevere consigli personalizzati"
          />
        )}

        {/* CTA per esplorare */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <VStack spacing={4}>
            <Heading size="md">Esplora per categoria</Heading>
            <Button 
              colorScheme="purple" 
              onClick={() => navigate('/categories')} 
              rightIcon={<FaArrowRight />}
              size="lg"
              w={{ base: '100%', md: 'auto' }}
            >
              Scopri tutte le categorie
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}

export default Home;