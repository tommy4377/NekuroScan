import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Badge, Icon as ChakraIcon, useBreakpointValue,
  Divider
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FaFire, FaClock, FaStar, FaBookOpen, FaHeart,
  FaChevronRight, FaSync, FaTrophy, FaDragon, FaHistory,
  FaBook
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
  
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  
  // Stati separati per contenuti diversi
  const [latestChapters, setLatestChapters] = useState([]); // Ultimi capitoli aggiunti
  const [mostRead, setMostRead] = useState([]); // Manga più letti
  const [topManga, setTopManga] = useState([]);
  const [topManhwa, setTopManhwa] = useState([]);
  const [topManhua, setTopManhua] = useState([]);
  const [topOneshot, setTopOneshot] = useState([]);
  
  // Stati utente
  const [continueReading, setContinueReading] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllContent();
  }, [includeAdult]);

  const loadAllContent = async () => {
    setLoading(true);
    try {
      // Carica dati dal server
      const [latest, popular, manga, manhwa, manhua, oneshot] = await Promise.all([
        statsAPI.getLatestUpdates(includeAdult, 1),
        statsAPI.getMostFavorites(includeAdult, 1),
        statsAPI.getTopByType('manga', includeAdult, 1),
        statsAPI.getTopByType('manhwa', includeAdult, 1),
        statsAPI.getTopByType('manhua', includeAdult, 1),
        statsAPI.getTopByType('oneshot', includeAdult, 1),
      ]);
      
      // Separa ultimi capitoli con badge dai più letti
      setLatestChapters(latest.results || []);
      setMostRead(popular.results || []);
      setTopManga(manga.results || []);
      setTopManhwa(manhwa.results || []);
      setTopManhua(manhua.results || []);
      setTopOneshot(oneshot.results || []);
      
      // Carica dati utente locali
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      setContinueReading(reading.slice(0, 10));
      
      const history = JSON.parse(localStorage.getItem('history') || '[]');
      setRecentHistory(history.slice(0, 10));
      
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
    switch(section) {
      case 'latest':
        navigate('/latest');
        break;
      case 'popular':
        navigate('/popular');
        break;
      case 'manga':
      case 'manhwa':
      case 'manhua':
      case 'oneshot':
        navigate('/categories', { state: { type: section } });
        break;
      case 'library':
        navigate('/library');
        break;
      case 'history':
        navigate('/library');
        break;
      default:
        navigate('/categories');
    }
  };

  // Componente per sezioni generiche SENZA badge capitolo
  const ContentSection = ({ title, icon, items, color = 'purple', section, showCount = true }) => (
    <VStack align="stretch" spacing={4}>
      <Box bg="gray.800" p={{ base: 3, md: 4 }} borderRadius="lg">
        <HStack justify="space-between" mb={4}>
          <HStack spacing={3}>
            <Box p={2} bg={`${color}.500`} borderRadius="lg">
              <ChakraIcon as={icon} color="white" boxSize={5} />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size={{ base: 'sm', md: 'md' }}>{title}</Heading>
              {showCount && (
                <Text fontSize="xs" color="gray.400">{items.length} disponibili</Text>
              )}
            </VStack>
          </HStack>
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
              {items.slice(0, 10).map((item, i) => (
                <MotionBox
                  key={`${item.url}-${i}`}
                  minW={{ base: '140px', md: '150px' }}
                  maxW={{ base: '140px', md: '150px' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                >
                  <MangaCard manga={item} hideSource showChapterBadge={false} />
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

  // Componente dedicato per ultimi capitoli CON badge
  const LatestChaptersSection = () => (
    <VStack align="stretch" spacing={4}>
      <Box bg="gray.800" p={{ base: 3, md: 4 }} borderRadius="lg">
        <HStack justify="space-between" mb={4}>
          <HStack spacing={3}>
            <Box p={2} bg="blue.500" borderRadius="lg">
              <FaClock color="white" size={20} />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size={{ base: 'sm', md: 'md' }}>Ultimi Capitoli Aggiunti</Heading>
              <Text fontSize="xs" color="gray.400">{latestChapters.length} aggiornamenti</Text>
            </VStack>
          </HStack>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<FaChevronRight />}
            onClick={() => handleViewAll('latest')}
            color="blue.400"
            _hover={{ bg: 'blue.900' }}
          >
            Vedi tutti
          </Button>
        </HStack>

        {loading ? (
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : latestChapters.length > 0 ? (
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
            {latestChapters.slice(0, 10).map((item, i) => (
              <MotionBox
                key={`latest-${item.url}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
              >
                <MangaCard manga={item} hideSource showChapterBadge={true} />
              </MotionBox>
            ))}
          </SimpleGrid>
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="gray.500">Nessun aggiornamento disponibile</Text>
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
              <Heading size={{ base: 'lg', md: 'xl' }} bgGradient="linear(to-r, purple.400, pink.400)" bgClip="text">
                Benvenuto su KuroReader
              </Heading>
              <Text color="gray.400">Scopri i tuoi manga preferiti</Text>
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
                onClick={() => { setRefreshing(true); loadAllContent(); }}
                aria-label="Ricarica"
                isLoading={refreshing}
                variant="ghost"
                colorScheme="purple"
              />
            </HStack>
          </HStack>
        </Box>

        {/* Sezioni utente */}
        {continueReading.length > 0 && (
          <ContentSection
            title="Continua a leggere"
            icon={FaBookOpen}
            items={continueReading}
            color="green"
            section="library"
          />
        )}

        {recentHistory.length > 0 && (
          <ContentSection
            title="Letti di recente"
            icon={FaHistory}
            items={recentHistory}
            color="blue"
            section="history"
          />
        )}

        {/* Sezione ultimi capitoli con badge */}
        <LatestChaptersSection />

        <Divider borderColor="gray.700" />

        {/* Sezione più letti SENZA badge */}
        <ContentSection
          title="Manga Più Letti"
          icon={FaFire}
          items={mostRead}
          color="pink"
          section="popular"
        />

        <Divider borderColor="gray.700" />

        {/* Tabs per categorie */}
        <Box bg="gray.800" borderRadius="xl" p={{ base: 3, md: 4 }}>
          <Tabs colorScheme="purple" variant="soft-rounded">
            <TabList bg="gray.900" p={2} borderRadius="lg" overflowX="auto">
              <Tab><HStack spacing={2}><FaTrophy /><Text display={{ base:'none', sm:'block' }}>Top Manga</Text></HStack></Tab>
              <Tab><HStack spacing={2}><BiBook /><Text display={{ base:'none', sm:'block' }}>Top Manhwa</Text></HStack></Tab>
              <Tab><HStack spacing={2}><FaDragon /><Text display={{ base:'none', sm:'block' }}>Top Manhua</Text></HStack></Tab>
              <Tab><HStack spacing={2}><FaBook /><Text display={{ base:'none', sm:'block' }}>Top Oneshot</Text></HStack></Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} pt={6}>
                <ContentSection 
                  title="Top Manga" 
                  icon={GiDragonHead} 
                  items={topManga} 
                  color="orange" 
                  section="manga"
                  showCount={false}
                />
              </TabPanel>
              <TabPanel px={0} pt={6}>
                <ContentSection 
                  title="Top Manhwa" 
                  icon={BiBook} 
                  items={topManhwa} 
                  color="purple" 
                  section="manhwa"
                  showCount={false}
                />
              </TabPanel>
              <TabPanel px={0} pt={6}>
                <ContentSection 
                  title="Top Manhua" 
                  icon={FaDragon} 
                  items={topManhua} 
                  color="red" 
                  section="manhua"
                  showCount={false}
                />
              </TabPanel>
              <TabPanel px={0} pt={6}>
                <ContentSection 
                  title="Top Oneshot" 
                  icon={FaBookOpen} 
                  items={topOneshot} 
                  color="green" 
                  section="oneshot"
                  showCount={false}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        {/* Footer Button Mobile */}
        {isMobile && (
          <Button 
            colorScheme="purple" 
            onClick={() => navigate('/categories')} 
            rightIcon={<FaChevronRight />} 
            size="lg" 
            w="100%"
          >
            Esplora tutte le categorie
          </Button>
        )}
      </VStack>
    </Container>
  );
}

export default Home;