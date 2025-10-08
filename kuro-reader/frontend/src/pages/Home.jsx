// ✅ HOME.JSX v3.3 - COMPLETO E OTTIMIZZATO
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Badge, Icon, Center
} from '@chakra-ui/react';
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
import { recommendationEngine } from '../utils/recommendations';
import useAuth from '../hooks/useAuth';

// ✅ PULISCE NUMERO CAPITOLO
const cleanChapterNumber = (chapter) => {
  if (!chapter) return '';
  return chapter
    .replace(/^(cap\.|capitolo|chapter|ch\.)\s*/i, '')
    .replace(/^vol\.\s*\d+\s*-\s*/i, '')
    .replace(/^0+/, '')
    .trim();
};

function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  
  // Carica dati utente per raccomandazioni
  const [userManga, setUserManga] = useState({
    reading: [],
    favorites: [],
    completed: [],
    dropped: []
  });
  
  // ========= STATE =========
  const [content, setContent] = useState({
    trending: [],
    latest: [],
    popular: [],
    topManga: [],
    topManhwa: [],
    topManhua: [],
    topOneshot: [],
    continueReading: [],
    recommendations: [],
    forYou: []
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ========= LOAD CONTENT =========
  const loadAllContent = useCallback(async () => {
    setLoading(true);
    
    try {
      // Carica tutto in parallelo
      const [
        trendingRes,
        latestRes, 
        popularRes, 
        mangaRes, 
        manhwaRes, 
        manhuaRes, 
        oneshotRes
      ] = await Promise.allSettled([
        apiManager.getTrending(includeAdult),
        apiManager.getRecentChapters(includeAdult),
        statsAPI.getMostFavorites(includeAdult, 1),
        statsAPI.getTopByType('manga', includeAdult, 1),
        statsAPI.getTopByType('manhwa', includeAdult, 1),
        statsAPI.getTopByType('manhua', includeAdult, 1),
        statsAPI.getTopByType('oneshot', includeAdult, 1)
      ]);
      
      // Processa risultati
      const processResult = (result, fallback = []) => {
        if (result.status === 'fulfilled') {
          const data = Array.isArray(result.value) 
            ? result.value 
            : result.value?.results || [];
          
          return data.slice(0, 15).map(item => ({
            ...item,
            latestChapter: cleanChapterNumber(item.latestChapter)
          }));
        }
        return fallback;
      };
      
      // Continua a leggere
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const readingWithProgress = reading.slice(0, 10).map(item => ({
        ...item,
        continueFrom: item.lastChapterIndex ? `Cap. ${item.lastChapterIndex + 1}` : null
      }));
      
      // Raccomandazioni "Per te" intelligenti
      const allContent = {
        trending: processResult(trendingRes),
        latest: processResult(latestRes),
        popular: processResult(popularRes),
        topManga: processResult(mangaRes),
        topManhwa: processResult(manhwaRes),
        topManhua: processResult(manhuaRes),
        topOneshot: processResult(oneshotRes)
      };
      
      const forYouRecommendations = user ? await generateForYouRecommendations(allContent) : [];
      
      // Raccomandazioni tradizionali (fallback)
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
        trending: processResult(trendingRes),
        latest: processResult(latestRes),
        popular: processResult(popularRes),
        topManga: processResult(mangaRes),
        topManhwa: processResult(manhwaRes),
        topManhua: processResult(manhuaRes),
        topOneshot: processResult(oneshotRes),
        continueReading: readingWithProgress,
        recommendations,
        forYou: forYouRecommendations
      });
      
    } catch (error) {
      console.error('Error loading home content:', error);
      toast({
        title: 'Errore caricamento',
        description: 'Alcuni contenuti potrebbero non essere disponibili',
        status: 'warning',
        duration: 3000
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeAdult, toast]);

  useEffect(() => {
    loadUserManga();
    loadAllContent();
    
    // Ascolta aggiornamenti della libreria
    const handleLibraryUpdate = () => {
      loadUserManga();
      loadAllContent();
    };
    
    window.addEventListener('library-updated', handleLibraryUpdate);
    
    return () => {
      window.removeEventListener('library-updated', handleLibraryUpdate);
    };
  }, [loadAllContent]);

  // Carica dati utente per raccomandazioni
  const loadUserManga = () => {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const completed = JSON.parse(localStorage.getItem('completed') || '[]');
    const dropped = JSON.parse(localStorage.getItem('dropped') || '[]');
    
    setUserManga({ reading, favorites, completed, dropped });
  };

  // Genera raccomandazioni "Per te"
  const generateForYouRecommendations = async (allContent) => {
    try {
      // Combina tutti i manga disponibili
      const allManga = [
        ...allContent.trending,
        ...allContent.latest,
        ...allContent.popular,
        ...allContent.topManga,
        ...allContent.topManhwa,
        ...allContent.topManhua,
        ...allContent.topOneshot
      ];

      // Rimuovi duplicati
      const uniqueManga = allManga.filter((manga, index, self) => 
        index === self.findIndex(m => m.url === manga.url)
      );

      // Carica dati utente aggiornati
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const completed = JSON.parse(localStorage.getItem('completed') || '[]');
      const dropped = JSON.parse(localStorage.getItem('dropped') || '[]');
      
      // Combina tutti i manga dell'utente
      const allUserManga = [
        ...reading,
        ...favorites,
        ...completed,
        ...dropped
      ];

      // Genera raccomandazioni
      const recommendations = recommendationEngine.generateRecommendations(uniqueManga, allUserManga);
      
      console.log('🎯 For You Recommendations generated:', {
        totalManga: uniqueManga.length,
        userManga: allUserManga.length,
        recommendations: recommendations.length
      });
      
      return recommendations.slice(0, 12); // Limita a 12 raccomandazioni
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllContent();
  };

  const navigateToSection = (path) => {
    navigate(path, { state: { includeAdult } });
  };

  // ========= SEZIONE CONTENUTI =========
  const ContentSection = ({ 
    title, 
    icon, 
    items, 
    color = 'purple', 
    viewAllPath,
    showLatestChapter = false,
    showProgress = false,
    emptyMessage = 'Nessun contenuto disponibile'
  }) => {
    if (!items || (items.length === 0 && !loading)) {
      return (
        <Box 
          bg="gray.800" 
          p={{ base: 4, md: 6 }} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
        >
          <HStack justify="space-between" mb={4}>
            <HStack spacing={3}>
              <Box
  p={2}
  bg={`${color}.500`}
  borderRadius="lg"
  boxShadow="lg"
  display="flex"
  alignItems="center"
  justifyContent="center"
  lineHeight={0}
>
  <Icon as={icon} color="white" boxSize={5} />
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
        <Box 
          bg="gray.800" 
          p={{ base: 4, md: 6 }} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
          transition="all 0.3s"
          _hover={{ borderColor: `${color}.500` }}
        >
          <HStack justify="space-between" mb={4}>
            <HStack spacing={3}>
              <Box
  p={2}
  bg={`${color}.500`}
  borderRadius="lg"
  boxShadow="lg"
  display="flex"
  alignItems="center"
  justifyContent="center"
  lineHeight={0}
>
  <Icon as={icon} color="white" boxSize={5} />
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
                onClick={() => navigateToSection(viewAllPath)}
                color={`${color}.400`}
                _hover={{ bg: `${color}.900` }}
              >
                Vedi tutti
              </Button>
            )}
          </HStack>

          {/* Scroll orizzontale */}
          <Box 
            overflowX="auto" 
            pb={2}
            css={{
              '&::-webkit-scrollbar': { height: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { 
                background: `var(--chakra-colors-${color}-500)`, 
                borderRadius: '4px' 
              }
            }}
          >
            <HStack spacing={4} align="start">
              {items.map((item, i) => (
                <Box
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
                      boxShadow="lg"
                    >
                      {item.continueFrom}
                    </Box>
                  )}
                </Box>
              ))}
            </HStack>
          </Box>
        </Box>
      </VStack>
    );
  };

  // ========= LOADING STATE =========
  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Skeleton height="150px" borderRadius="xl" />
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4} w="100%">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        
        {/* ========= HEADER ========= */}
        <Box 
          bg="gray.800" 
          p={{ base: 4, md: 6 }} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
          boxShadow="xl"
        >
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <VStack align="start" spacing={1}>
              <Heading 
                size={{ base: 'lg', md: 'xl' }}
                bgGradient="linear(to-r, purple.400, pink.400)" 
                bgClip="text"
              >
                Benvenuto su NeKuro Scan
              </Heading>
              <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }}>
                Scopri i tuoi manga preferiti
              </Text>
            </VStack>
            <HStack spacing={3}>
              <Button
                variant={includeAdult ? 'solid' : 'outline'}
                colorScheme="pink"
                size={{ base: 'sm', md: 'md' }}
                onClick={() => setIncludeAdult(!includeAdult)}
                boxShadow={includeAdult ? 'lg' : 'none'}
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
                size={{ base: 'sm', md: 'md' }}
              />
            </HStack>
          </HStack>
        </Box>

        {/* ========= IN LETTURA ========= */}
        {content.continueReading.length > 0 && (
          <ContentSection
            title="In lettura"
            icon={FaBookOpen}
            items={content.continueReading}
            color="green"
            viewAllPath="/library"
            showProgress={true}
          />
        )}


        {/* ========= TABS CONTENUTI ========= */}
        <Box 
          bg="gray.800" 
          borderRadius="xl" 
          p={{ base: 3, md: 4 }}
          border="1px solid"
          borderColor="gray.700"
        >
          <Tabs colorScheme="purple" variant="soft-rounded">
            <TabList 
              bg="gray.900" 
              p={2} 
              borderRadius="lg" 
              overflowX="auto"
              css={{
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
              }}
            >
              <Tab>
                <HStack spacing={2}>
                  <FaClock />
                  <Text display={{ base: 'none', sm: 'block' }}>Aggiornamenti</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FaHeart />
                  <Text display={{ base: 'none', sm: 'block' }}>Popolari</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FaTrophy />
                  <Text display={{ base: 'none', sm: 'block' }}>Top Series</Text>
                </HStack>
              </Tab>
              {user && content.forYou.length > 0 && (
                <Tab>
                  <HStack spacing={2}>
                    <FaStar />
                    <Text display={{ base: 'none', sm: 'block' }}>Per te</Text>
                  </HStack>
                </Tab>
              )}
            </TabList>
            
            <TabPanels>
              {/* TAB AGGIORNAMENTI */}
              <TabPanel px={0} pt={6}>
                <VStack spacing={6} align="stretch">
                  {content.trending.length > 0 && (
                    <ContentSection 
                      title="Capitoli di tendenza" 
                      icon={FaFire} 
                      items={content.trending} 
                      color="orange" 
                      viewAllPath="/trending"
                      showLatestChapter={true}
                    />
                  )}
                  
                  {content.latest.length > 0 && (
                    <ContentSection 
                      title="Ultimi capitoli aggiunti" 
                      icon={FaClock} 
                      items={content.latest} 
                      color="blue" 
                      viewAllPath="/latest"
                      showLatestChapter={true}
                    />
                  )}
                </VStack>
              </TabPanel>
              
              {/* TAB POPOLARI */}
              <TabPanel px={0} pt={6}>
                <ContentSection 
                  title="I più letti" 
                  icon={FaHeart} 
                  items={content.popular} 
                  color="pink" 
                  viewAllPath="/popular"
                />
              </TabPanel>
              
              {/* TAB TOP SERIES */}
              <TabPanel px={0} pt={6}>
                <VStack spacing={6} align="stretch">
                  <ContentSection 
                    title="Top Manga" 
                    icon={GiDragonHead} 
                    items={content.topManga} 
                    color="orange" 
                    viewAllPath="/categories"
                  />
                  <ContentSection 
                    title="Top Manhwa" 
                    icon={BiBook} 
                    items={content.topManhwa} 
                    color="purple" 
                    viewAllPath="/categories"
                  />
                  <ContentSection 
                    title="Top Manhua" 
                    icon={FaDragon} 
                    items={content.topManhua} 
                    color="red" 
                    viewAllPath="/categories"
                  />
                  <ContentSection 
                    title="Top Oneshot" 
                    icon={FaBookOpen} 
                    items={content.topOneshot} 
                    color="green" 
                    viewAllPath="/categories"
                  />
                </VStack>
              </TabPanel>
              
              {/* TAB PER TE */}
              {user && content.forYou.length > 0 && (
                <TabPanel px={0} pt={6}>
                  <ContentSection 
                    title="Per te" 
                    icon={FaStar} 
                    items={content.forYou} 
                    color="purple" 
                    emptyMessage="Aggiungi manga alle tue liste per ricevere consigli personalizzati"
                  />
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </Box>

        {/* ========= CTA ESPLORA ========= */}
        <Box 
          bg="gray.800" 
          p={6} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
          textAlign="center"
        >
          <VStack spacing={4}>
            <Heading size={{ base: 'sm', md: 'md' }}>Esplora per categoria</Heading>
            <Button 
              colorScheme="purple" 
              onClick={() => navigate('/categories')} 
              rightIcon={<FaArrowRight />}
              size={{ base: 'md', md: 'lg' }}
              w={{ base: '100%', md: 'auto' }}
              boxShadow="lg"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
              transition="all 0.2s"
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