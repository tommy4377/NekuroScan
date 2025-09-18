import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Badge, Icon as ChakraIcon, useBreakpointValue
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FaFire, FaClock, FaStar, FaBookOpen, FaHeart,
  FaChevronRight, FaSync, FaTrophy, FaDragon
} from 'react-icons/fa';
import { GiDragonHead } from 'react-icons/gi';
import { BiBook } from 'react-icons/bi';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const [latestUpdates, setLatestUpdates] = useState([]);
  const [mostFavorites, setMostFavorites] = useState([]);
  const [topManga, setTopManga] = useState([]);
  const [topManhwa, setTopManhwa] = useState([]);
  const [topManhua, setTopManhua] = useState([]);
  const [topOneshot, setTopOneshot] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadAllContent();
  }, [includeAdult]);

  const loadAllContent = async () => {
    setLoading(true);
    try {
      const promises = [
        statsAPI.getLatestUpdates(includeAdult, 10),
        statsAPI.getMostFavorites(includeAdult, 10),
        statsAPI.getTopByType('manga', 10),
        statsAPI.getTopByType('manhwa', 10),
        statsAPI.getTopByType('manhua', 10),
        statsAPI.getTopByType('oneshot', 10)
      ];

      const [updates, favorites, manga, manhwa, manhua, oneshot] = await Promise.all(promises);

      // FIX: Usa results invece di accedere direttamente
      setLatestUpdates(updates.results || updates);
      setMostFavorites(favorites.results || favorites);
      setTopManga(manga);
      setTopManhwa(manhwa);
      setTopManhua(manhua);
      setTopOneshot(oneshot);
      
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      setContinueReading(reading.slice(0, 10));
      
    } catch (error) {
      console.error('Error loading home content:', error);
      toast({
        title: 'Errore caricamento',
        description: 'Alcuni contenuti potrebbero non essere disponibili',
        status: 'warning',
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewAll = (section) => {
    // Naviga a pagine dedicate per scroll infinito
    switch(section) {
      case 'latest-updates':
        navigate('/latest');
        break;
      case 'popular':
        navigate('/popular');
        break;
      default:
        navigate('/categories', { state: { type: section } });
    }
  };

  // FIX: ContentSection senza badge duplicato per i capitoli
  const ContentSection = ({ title, icon, items, color = 'purple', section, iconSize = 5 }) => (
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
            >
              <ChakraIcon as={icon} color="white" boxSize={iconSize} />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size={{ base: 'sm', md: 'md' }}>{title}</Heading>
              <Text fontSize="xs" color="gray.400">
                {items.length} disponibili
              </Text>
            </VStack>
          </HStack>
          {section && (
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<FaChevronRight />}
              onClick={() => handleViewAll(section)}
              color={`${color}.400`}
              _hover={{ bg: `${color}.900` }}
            >
              Vedi tutti
            </Button>
          )}
        </HStack>
        
        {loading ? (
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : items.length > 0 ? (
          <Box overflowX="auto" pb={2}>
            <HStack spacing={{ base: 3, md: 4 }} minW="max-content">
              {items.map((item, i) => (
                <MotionBox
                  key={`${item.url}-${i}`}
                  minW={{ base: '140px', md: '150px' }}
                  maxW={{ base: '140px', md: '150px' }}
                  position="relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <MangaCard manga={item} hideSource showLatestChapter={false} />
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
                </MotionBox>
              ))}
            </HStack>
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="gray.500">Nessun contenuto disponibile</Text>
          </Box>
        )}
      </Box>
    </VStack>
  );

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
              <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }}>
                Scopri i tuoi manga preferiti
              </Text>
            </VStack>
            <HStack>
              <Button
                variant={includeAdult ? 'solid' : 'outline'}
                colorScheme="pink"
                size="sm"
                onClick={() => setIncludeAdult(!includeAdult)}
                leftIcon={includeAdult ? <Text>🔞</Text> : null}
              >
                {includeAdult ? 'Adult ON' : 'Solo normale'}
              </Button>
              <IconButton
                icon={<FaSync />}
                onClick={() => {
                  setRefreshing(true);
                  loadAllContent();
                }}
                aria-label="Ricarica"
                isLoading={refreshing}
                variant="ghost"
                colorScheme="purple"
              />
            </HStack>
          </HStack>
        </Box>

        {continueReading.length > 0 && (
          <ContentSection
            title="Continua a leggere"
            icon={FaBookOpen}
            items={continueReading}
            color="green"
            section="library"
            iconSize={4}
          />
        )}

        {/* Main Content Tabs */}
        <Box bg="gray.800" borderRadius="xl" p={{ base: 3, md: 4 }}>
          <Tabs colorScheme="purple" variant="soft-rounded">
            <TabList bg="gray.900" p={2} borderRadius="lg" overflowX="auto">
              <Tab><HStack spacing={2}><FaClock /><Text>Aggiornamenti</Text></HStack></Tab>
              <Tab><HStack spacing={2}><FaStar /><Text>Popolari</Text></HStack></Tab>
              <Tab><HStack spacing={2}><FaTrophy /><Text>Top Series</Text></HStack></Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} pt={6}>
                <ContentSection
                  title="Capitoli recenti"
                  icon={FaClock}
                  items={latestUpdates}
                  color="blue"
                  section="latest-updates"
                />
              </TabPanel>

              <TabPanel px={0} pt={6}>
                <ContentSection
                  title="I più letti"
                  icon={FaHeart}
                  items={mostFavorites}
                  color="pink"
                  section="popular"
                />
              </TabPanel>

              <TabPanel px={0} pt={6}>
                <VStack spacing={6} align="stretch">
                  <ContentSection
                    title="Top Manga"
                    icon={GiDragonHead}
                    items={topManga}
                    color="orange"
                    section="manga"
                    iconSize={6}
                  />
                  
                  <ContentSection
                    title="Top Manhwa"
                    icon={BiBook}
                    items={topManhwa}
                    color="purple"
                    section="manhwa"
                  />

                  <ContentSection
                    title="Top Manhua"
                    icon={FaDragon}
                    items={topManhua}
                    color="red"
                    section="manhua"
                  />

                  <ContentSection
                    title="Top Oneshot"
                    icon={FaBookOpen}
                    items={topOneshot}
                    color="green"
                    section="oneshot"
                  />
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Container>
  );
}

export default Home;
