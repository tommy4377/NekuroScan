// frontend/src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Icon as ChakraIcon, useBreakpointValue
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaClock, FaHeart, FaChevronRight, FaSync, FaTrophy, FaDragon, FaBookOpen } from 'react-icons/fa';
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

  const [latest, setLatest] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topManga, setTopManga] = useState([]);
  const [topManhwa, setTopManhwa] = useState([]);
  const [topManhua, setTopManhua] = useState([]);
  const [topOneshot, setTopOneshot] = useState([]);
  const [continueReading, setContinueReading] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadAll(); }, [includeAdult]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [l, p, m, wh, wu, os] = await Promise.all([
        statsAPI.getLatestUpdates(includeAdult, 1),
        statsAPI.getMostFavorites(includeAdult, 1),
        statsAPI.getTopByType('manga', includeAdult, 1),
        statsAPI.getTopByType('manhwa', includeAdult, 1),
        statsAPI.getTopByType('manhua', includeAdult, 1),
        statsAPI.getTopByType('oneshot', includeAdult, 1),
      ]);
      setLatest((l.results || []).slice(0, 10));
      setPopular((p.results || []).slice(0, 10));
      setTopManga((m.results || []).slice(0, 10));
      setTopManhwa((wh.results || []).slice(0, 10));
      setTopManhua((wu.results || []).slice(0, 10));
      setTopOneshot((os.results || []).slice(0, 10));
      setContinueReading(JSON.parse(localStorage.getItem('reading') || '[]').slice(0, 10));
    } catch (e) {
      console.error(e);
      toast({ title: 'Errore caricamento', status: 'warning' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewAll = (section) => {
    switch(section) {
      case 'latest': navigate('/latest'); break;
      case 'popular': navigate('/popular'); break;
      case 'manga': navigate('/top/manga'); break;
      case 'manhwa': navigate('/top/manhwa'); break;
      case 'manhua': navigate('/top/manhua'); break;
      case 'oneshot': navigate('/top/oneshot'); break;
      case 'library': navigate('/library'); break;
      default: navigate('/categories');
    }
  };

  const ContentSection = ({ title, icon, items, color = 'purple', section, showLatestInCard = false }) => (
    <VStack align="stretch" spacing={4}>
      <Box bg="gray.800" p={{ base: 3, md: 4 }} borderRadius="lg">
        <HStack justify="space-between" mb={4}>
          <HStack spacing={3}>
            <Box p={2} bg={`${color}.500`} borderRadius="lg">
              <ChakraIcon as={icon} color="white" boxSize={5} />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size={{ base: 'sm', md: 'md' }}>{title}</Heading>
              <Text fontSize="xs" color="gray.400">{items.length} disponibili</Text>
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
            {[...Array(5)].map((_, i) => <Skeleton key={i} height="280px" borderRadius="lg" />)}
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
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                >
                  <MangaCard manga={item} hideSource showLatest={showLatestInCard} />
                  {/* niente overlay, testo "Cap. xx" è dentro la card */}
                </MotionBox>
              ))}
            </HStack>
          </Box>
        ) : (
          <Box textAlign="center" py={8}><Text color="gray.500">Nessun contenuto disponibile</Text></Box>
        )}
      </Box>
    </VStack>
  );

  return (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }}>
      <VStack spacing={{ base: 6, md: 8 }} align="stretch">
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
                {includeAdult ? '🔞 Solo Adult' : 'Solo Normali'}
              </Button>
              <IconButton icon={<FaSync />} onClick={() => { setRefreshing(true); loadAll(); }} aria-label="Ricarica" isLoading={refreshing} variant="ghost" colorScheme="purple" />
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
            showLatestInCard={false}
          />
        )}

        <Box bg="gray.800" borderRadius="xl" p={{ base: 3, md: 4 }}>
          <Tabs colorScheme="purple" variant="soft-rounded">
            <TabList bg="gray.900" p={2} borderRadius="lg" overflowX="auto">
              <Tab><HStack spacing={2}><FaClock /><Text display={{ base:'none', sm:'block' }}>Aggiornamenti</Text></HStack></Tab>
              <Tab><HStack spacing={2}><FaHeart /><Text display={{ base:'none', sm:'block' }}>Più letti</Text></HStack></Tab>
              <Tab><HStack spacing={2}><FaTrophy /><Text display={{ base:'none', sm:'block' }}>Top Series</Text></HStack></Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} pt={6}>
                <ContentSection title="Capitoli recenti" icon={FaClock} items={latest} color="blue" section="latest" showLatestInCard />
              </TabPanel>
              <TabPanel px={0} pt={6}>
                <ContentSection title="I più letti" icon={FaHeart} items={popular} color="pink" section="popular" />
              </TabPanel>
              <TabPanel px={0} pt={6}>
                <VStack spacing={6} align="stretch">
                  <ContentSection title="Top Manga" icon={GiDragonHead} items={topManga} color="orange" section="manga" />
                  <ContentSection title="Top Manhwa" icon={BiBook} items={topManhwa} color="purple" section="manhwa" />
                  <ContentSection title="Top Manhua" icon={FaDragon} items={topManhua} color="red" section="manhua" />
                  <ContentSection title="Top Oneshot" icon={FaBookOpen} items={topOneshot} color="green" section="oneshot" />
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        {isMobile && (
          <Button colorScheme="purple" onClick={() => navigate('/categories')} rightIcon={<FaChevronRight />} size="lg" w="100%">
            Esplora tutte le categorie
          </Button>
        )}
      </VStack>
    </Container>
  );
}

export default Home;
