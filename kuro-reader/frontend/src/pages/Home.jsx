import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Skeleton, Text, VStack, HStack,
  Badge, Button, useToast, IconButton, Flex, Spinner
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaFire, FaCrown, FaBookOpen } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';

const MotionBox = motion(Box);

// Top manga accurati
const TOP_MANGA = [
  'One Piece',
  'Fullmetal Alchemist', 
  'Attack on Titan',
  'Death Note',
  'Demon Slayer',
  'My Hero Academia',
  'Naruto',
  'Dragon Ball',
  'Berserk',
  'Hunter x Hunter'
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
  const [currentPage, setCurrentPage] = useState({});

  const categories = [
    { name: 'Azione', query: 'action shounen battle' },
    { name: 'Romance', query: 'romance love story' },
    { name: 'Fantasy', query: 'fantasy magic dragon' },
    { name: 'Isekai', query: 'isekai reincarnation another world' },
    { name: 'Horror', query: 'horror scary thriller' },
    { name: 'Comedy', query: 'comedy funny humor' }
  ];

  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    setLoading(true);
    
    // Carica in parallelo
    const promises = [
      loadTrending(),
      loadTopManga(),
      loadContinueReading()
    ];
    
    await Promise.allSettled(promises);
    setLoading(false);
    
    // Carica categorie una alla volta per non sovraccaricare
    for (const cat of categories) {
      await loadCategoryManga(cat, 0);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay tra richieste
    }
  };

  const loadTrending = async () => {
    try {
      // Carica i trending reali da MangaWorld
      const trendingData = await apiManager.getTrending();
      
      // Se non ci sono abbastanza trending, cerca manga popolari
      if (trendingData.length < 10) {
        const popularSearches = ['Solo Leveling', 'Chainsaw Man', 'Jujutsu Kaisen'];
        for (const search of popularSearches) {
          try {
            const results = await apiManager.searchAll(search);
            if (results.all.length > 0) {
              trendingData.push(results.all[0]);
            }
          } catch (err) {
            console.error(`Error searching ${search}:`, err);
          }
        }
      }
      
      setTrending(trendingData.slice(0, 20));
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  const loadTopManga = async () => {
    try {
      const topResults = [];
      
      // Cerca ogni top manga
      for (const title of TOP_MANGA) {
        try {
          const results = await apiManager.searchAll(title);
          if (results.all.length > 0) {
            // Prendi il primo risultato che matcha meglio
            const bestMatch = results.all.find(m => 
              m.title.toLowerCase().includes(title.toLowerCase())
            ) || results.all[0];
            
            if (bestMatch) {
              topResults.push(bestMatch);
            }
          }
        } catch (err) {
          console.error(`Error searching ${title}:`, err);
        }
      }
      
      setTopManga(topResults);
    } catch (error) {
      console.error('Error loading top manga:', error);
    }
  };

  const loadCategoryManga = async (category, page = 0) => {
    const categoryKey = `${category.name}_${page}`;
    setLoadingCategories(prev => ({ ...prev, [categoryKey]: true }));
    
    try {
      // Cerca con query più specifiche per ottenere più risultati
      const queries = category.query.split(' ');
      const allResults = [];
      
      for (const q of queries.slice(0, 2)) { // Usa solo le prime 2 parole chiave
        try {
          const results = await apiManager.searchAll(q);
          allResults.push(...results.all);
        } catch (err) {
          console.error(`Error searching ${q}:`, err);
        }
      }
      
      // Rimuovi duplicati
      const uniqueResults = [];
      const seen = new Set();
      
      for (const manga of allResults) {
        const key = manga.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
          seen.add(key);
          uniqueResults.push(manga);
        }
      }
      
      setCategoryManga(prev => ({
        ...prev,
        [category.name]: [
          ...(prev[category.name] || []),
          ...uniqueResults
        ].slice(0, 50) // Limita a 50 per categoria
      }));
      
      setCurrentPage(prev => ({
        ...prev,
        [category.name]: page
      }));
      
    } catch (error) {
      console.error(`Error loading category ${category.name}:`, error);
    } finally {
      setLoadingCategories(prev => ({ ...prev, [categoryKey]: false }));
    }
  };

  const loadMoreCategory = async (category) => {
    const nextPage = (currentPage[category.name] || 0) + 1;
    await loadCategoryManga(
      categories.find(c => c.name === category.name),
      nextPage
    );
  };

  const loadContinueReading = () => {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    
    // Combina e ordina per data
    const combined = [...reading];
    history.forEach(item => {
      if (!combined.find(r => r.url === item.url)) {
        combined.push(item);
      }
    });
    
    combined.sort((a, b) => 
      new Date(b.lastRead || 0) - new Date(a.lastRead || 0)
    );
    
    setContinueReading(combined.slice(0, 15));
  };

  const ScrollableSection = ({ items, title, icon, loading: sectionLoading, onLoadMore }) => {
    const [scrollIndex, setScrollIndex] = useState(0);
    const itemsPerView = 5;
    const maxIndex = Math.max(0, items.length - itemsPerView);

    return (
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between">
          <HStack>
            {icon}
            <Heading size="lg">{title}</Heading>
            <Badge colorScheme="gray">{items.length}</Badge>
          </HStack>
          <HStack>
            {onLoadMore && (
              <Button size="sm" onClick={onLoadMore} isLoading={sectionLoading}>
                Carica altri
              </Button>
            )}
            {items.length > itemsPerView && (
              <>
                <IconButton
                  icon={<FaChevronLeft />}
                  size="sm"
                  onClick={() => setScrollIndex(Math.max(0, scrollIndex - itemsPerView))}
                  isDisabled={scrollIndex === 0}
                />
                <IconButton
                  icon={<FaChevronRight />}
                  size="sm"
                  onClick={() => setScrollIndex(Math.min(maxIndex, scrollIndex + itemsPerView))}
                  isDisabled={scrollIndex >= maxIndex}
                />
              </>
            )}
          </HStack>
        </HStack>
        
        {sectionLoading && items.length === 0 ? (
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : (
          <Box overflow="hidden">
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {items.slice(scrollIndex, scrollIndex + itemsPerView * 2).map((item, i) => (
                <MangaCard key={`${item.url}-${i}`} manga={item} />
              ))}
            </SimpleGrid>
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
          title="Trending Ora"
          icon={<FaFire color="#FC8181" />}
          loading={loading}
        />

        {/* Categories */}
        {categories.map(category => {
          const items = categoryManga[category.name] || [];
          const categoryKey = `${category.name}_${currentPage[category.name] || 0}`;
          
          return (
            <ScrollableSection
              key={category.name}
              items={items}
              title={category.name}
              loading={loadingCategories[categoryKey]}
              onLoadMore={() => loadMoreCategory(category)}
            />
          );
        })}
      </VStack>
    </Container>
  );
}

export default Home;
