import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Skeleton, Text, VStack, HStack,
  Badge, Button, useToast, IconButton, Flex
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaFire, FaCrown, FaBookOpen } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';

const MotionBox = motion(Box);

// Top manga predefiniti
const TOP_MANGA = [
  { title: 'One Piece', query: 'one piece' },
  { title: 'Fullmetal Alchemist', query: 'fullmetal alchemist' },
  { title: 'Attack on Titan', query: 'attack on titan' },
  { title: 'Demon Slayer', query: 'demon slayer' },
  { title: 'My Hero Academia', query: 'my hero academia' },
  { title: 'Death Note', query: 'death note' },
  { title: 'Naruto', query: 'naruto' },
  { title: 'Hunter x Hunter', query: 'hunter x hunter' },
  { title: 'Tokyo Revengers', query: 'tokyo revengers' },
  { title: 'Jujutsu Kaisen', query: 'jujutsu kaisen' }
];

function Home() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [topManga, setTopManga] = useState([]);
  const [categoryManga, setCategoryManga] = useState({});
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState({});
  const toast = useToast();

  const categories = [
    { name: 'Azione', query: 'action' },
    { name: 'Romance', query: 'romance' },
    { name: 'Fantasy', query: 'fantasy' },
    { name: 'Isekai', query: 'isekai' },
    { name: 'Shounen', query: 'shounen' },
    { name: 'Seinen', query: 'seinen' }
  ];

  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    setLoading(true);
    await Promise.all([
      loadTrending(),
      loadTopManga(),
      loadContinueReading()
    ]);
    setLoading(false);
    
    // Carica categorie in background
    categories.forEach(cat => loadCategoryManga(cat));
  };

  const loadTrending = async () => {
    try {
      const trendingData = await apiManager.getTrending();
      setTrending(trendingData.slice(0, 15));
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  const loadTopManga = async () => {
    try {
      const topResults = await Promise.all(
        TOP_MANGA.slice(0, 5).map(async (manga) => {
          try {
            const results = await apiManager.searchAll(manga.query);
            return results.all[0] || null;
          } catch {
            return null;
          }
        })
      );
      setTopManga(topResults.filter(Boolean));
    } catch (error) {
      console.error('Error loading top manga:', error);
    }
  };

  const loadCategoryManga = async (category) => {
    setLoadingCategories(prev => ({ ...prev, [category.name]: true }));
    try {
      const results = await apiManager.searchAll(category.query);
      setCategoryManga(prev => ({
        ...prev,
        [category.name]: results.all.slice(0, 10)
      }));
    } catch (error) {
      console.error(`Error loading category ${category.name}:`, error);
    } finally {
      setLoadingCategories(prev => ({ ...prev, [category.name]: false }));
    }
  };

  const loadContinueReading = () => {
    // Carica da localStorage tutti i manga in lettura
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    
    // Combina reading e history, rimuovi duplicati
    const combined = [...reading];
    history.forEach(item => {
      if (!combined.find(r => r.url === item.url)) {
        combined.push(item);
      }
    });
    
    // Ordina per data di lettura più recente
    combined.sort((a, b) => {
      const dateA = new Date(a.lastRead || 0);
      const dateB = new Date(b.lastRead || 0);
      return dateB - dateA;
    });
    
    setContinueReading(combined.slice(0, 10));
  };

  const ScrollableSection = ({ items, title, icon, loading: sectionLoading }) => {
    const [scrollIndex, setScrollIndex] = useState(0);
    const itemsPerView = 5;
    const maxIndex = Math.max(0, items.length - itemsPerView);

    return (
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between">
          <HStack>
            {icon}
            <Heading size="lg">{title}</Heading>
          </HStack>
          {items.length > itemsPerView && (
            <HStack>
              <IconButton
                icon={<FaChevronLeft />}
                size="sm"
                onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
                isDisabled={scrollIndex === 0}
              />
              <IconButton
                icon={<FaChevronRight />}
                size="sm"
                onClick={() => setScrollIndex(Math.min(maxIndex, scrollIndex + 1))}
                isDisabled={scrollIndex >= maxIndex}
              />
            </HStack>
          )}
        </HStack>
        
        {sectionLoading ? (
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : (
          <Box overflow="hidden">
            <Flex
              transform={`translateX(-${scrollIndex * (100 / itemsPerView)}%)`}
              transition="transform 0.3s"
            >
              {items.map((item, i) => (
                <Box key={i} flex={`0 0 ${100 / itemsPerView}%`} px={2}>
                  <MangaCard manga={item} />
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </VStack>
    );
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={12} align="stretch">
        {/* Hero Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            bg="purple.900"
            borderRadius="xl"
            p={8}
            bgGradient="linear(to-r, purple.600, pink.600)"
            position="relative"
            overflow="hidden"
          >
            <Box
              position="absolute"
              top="-50%"
              right="-10%"
              width="300px"
              height="300px"
              bg="whiteAlpha.100"
              borderRadius="full"
              filter="blur(60px)"
            />
            
            <VStack align="start" spacing={4} position="relative">
              <Heading size="2xl" fontWeight="black">
                Benvenuto su KuroReader
              </Heading>
              <Text fontSize="lg" opacity={0.9}>
                Scopri migliaia di manga e light novel, tutto in un unico posto
              </Text>
              <HStack spacing={4}>
                <Button 
                  size="lg" 
                  colorScheme="whiteAlpha"
                  onClick={() => navigate('/search')}
                >
                  Esplora
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  colorScheme="whiteAlpha"
                  onClick={() => navigate('/library')}
                >
                  Libreria
                </Button>
              </HStack>
            </VStack>
          </Box>
        </MotionBox>

        {/* Continue Reading */}
        {continueReading.length > 0 && (
          <ScrollableSection
            items={continueReading}
            title="Continua a leggere"
            icon={<FaBookOpen color="#9F7AEA" />}
            loading={false}
          />
        )}

        {/* Top Manga */}
        <ScrollableSection
          items={topManga}
          title="Top Manga"
          icon={<FaCrown color="#F6AD55" />}
          loading={loading}
        />

        {/* Trending */}
        <ScrollableSection
          items={trending}
          title="Trending"
          icon={<FaFire color="#FC8181" />}
          loading={loading}
        />

        {/* Categories with manga */}
        {categories.map(category => (
          <Box key={category.name}>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Heading size="md">{category.name}</Heading>
                <Button
                  variant="link"
                  colorScheme="purple"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(category.query)}`)}
                >
                  Vedi tutti →
                </Button>
              </HStack>
              
              {loadingCategories[category.name] ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} height="280px" borderRadius="lg" />
                  ))}
                </SimpleGrid>
              ) : (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {(categoryManga[category.name] || []).slice(0, 5).map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              )}
            </VStack>
          </Box>
        ))}
      </VStack>
    </Container>
  );
}

export default Home;
