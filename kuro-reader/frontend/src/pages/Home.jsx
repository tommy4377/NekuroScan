import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Badge, Divider
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FaFire, FaClock, FaStar, FaBookOpen, FaHeart,
  FaChevronRight, FaSync
} from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Stati per i vari contenuti
  const [latestUpdates, setLatestUpdates] = useState([]);
  const [mostFavorites, setMostFavorites] = useState([]);
  const [topManga, setTopManga] = useState([]);
  const [topManhwa, setTopManhwa] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  
  useEffect(() => {
    loadAllContent();
  }, [includeAdult]);

  const loadAllContent = async () => {
    setLoading(true);
    try {
      // Carica tutti i contenuti in parallelo
      const [updates, favorites, manga, manhwa] = await Promise.all([
        statsAPI.getLatestUpdates(includeAdult),
        statsAPI.getMostFavorites(includeAdult),
        statsAPI.getTopByType('manga'),
        statsAPI.getTopByType('manhwa')
      ]);

      setLatestUpdates(updates.slice(0, 10));
      setMostFavorites(favorites.slice(0, 10));
      setTopManga(manga.slice(0, 10));
      setTopManhwa(manhwa.slice(0, 10));
      
      // Carica i continua a leggere dal localStorage
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
    }
  };

  const ContentSection = ({ title, icon, items, color = 'purple', viewAllPath }) => (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <HStack>
          <Icon as={icon} color={`${color}.400`} boxSize={6} />
          <Heading size="md">{title}</Heading>
        </HStack>
        {viewAllPath && (
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<FaChevronRight />}
            onClick={() => navigate(viewAllPath)}
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
          <HStack spacing={4} minW="max-content">
            {items.map((item, i) => (
              <Box key={`${item.url}-${i}`} minW="150px" maxW="150px">
                <MangaCard manga={item} hideSource />
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
            ))}
          </HStack>
        </Box>
      ) : (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Nessun contenuto disponibile</Text>
        </Box>
      )}
    </VStack>
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header con toggle Adult */}
        <HStack justify="space-between" flexWrap="wrap">
          <Heading size="xl">Benvenuto su KuroReader</Heading>
          <HStack>
            <Button
              variant={includeAdult ? 'solid' : 'outline'}
              colorScheme="pink"
              size="sm"
              onClick={() => setIncludeAdult(!includeAdult)}
            >
              {includeAdult ? '🔞 Adult attivi' : 'Solo contenuti normali'}
            </Button>
            <IconButton
              icon={<FaSync />}
              onClick={loadAllContent}
              aria-label="Ricarica"
              isLoading={loading}
              variant="ghost"
            />
          </HStack>
        </HStack>

        {/* Continua a leggere */}
        {continueReading.length > 0 && (
          <>
            <ContentSection
              title="Continua a leggere"
              icon={FaBookOpen}
              items={continueReading}
              color="green"
              viewAllPath="/library"
            />
            <Divider />
          </>
        )}

        {/* Tabs per organizzare i contenuti */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>
              <HStack>
                <FaClock />
                <Text>Ultimi aggiornamenti</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <FaStar />
                <Text>Più popolari</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <FaFire />
                <Text>Top Series</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Ultimi aggiornamenti */}
            <TabPanel px={0}>
              <ContentSection
                title="Capitoli recenti"
                icon={FaClock}
                items={latestUpdates}
                color="blue"
                viewAllPath="/search?sort=latest"
              />
            </TabPanel>

            {/* Più popolari */}
            <TabPanel px={0}>
              <ContentSection
                title="I più amati"
                icon={FaHeart}
                items={mostFavorites}
                color="pink"
                viewAllPath="/search?sort=popular"
              />
            </TabPanel>

            {/* Top Series */}
            <TabPanel px={0}>
              <VStack spacing={8} align="stretch">
                <ContentSection
                  title="Top Manga"
                  icon={FaFire}
                  items={topManga}
                  color="orange"
                  viewAllPath="/categories?type=manga"
                />
                
                <ContentSection
                  title="Top Manhwa"
                  icon={FaFire}
                  items={topManhwa}
                  color="purple"
                  viewAllPath="/categories?type=manhwa"
                />
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Quick Actions */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <Heading size="md" mb={4}>Esplora per categoria</Heading>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            {[
              { name: 'Azione', color: 'red', path: '/categories?genre=action' },
              { name: 'Romance', color: 'pink', path: '/categories?genre=romance' },
              { name: 'Fantasy', color: 'purple', path: '/categories?genre=fantasy' },
              { name: 'Isekai', color: 'blue', path: '/categories?genre=isekai' },
              { name: 'Shounen', color: 'orange', path: '/categories?demographic=shounen' },
              { name: 'Seinen', color: 'gray', path: '/categories?demographic=seinen' },
              { name: 'Manhwa', color: 'green', path: '/categories?type=manhwa' },
              { name: 'Tutte', color: 'purple', path: '/categories' }
            ].map(cat => (
              <Button
                key={cat.name}
                colorScheme={cat.color}
                variant="outline"
                onClick={() => navigate(cat.path)}
                size="sm"
              >
                {cat.name}
              </Button>
            ))}
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  );
}

// Fix per l'import di Icon
const Icon = ({ as: Component, ...props }) => <Box as={Component} {...props} />;

export default Home;
