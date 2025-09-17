import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Badge, Divider, Icon as ChakraIcon
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
import apiManager from '../api';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  
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

  const ContentSection = ({ title, icon, items, color = 'purple', viewAllPath, iconSize = 5 }) => (
    <VStack align="stretch" spacing={4}>
      <Box bg="gray.800" p={4} borderRadius="lg">
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
              <Heading size="md">{title}</Heading>
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
              onClick={() => navigate(viewAllPath)}
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
      </Box>
    </VStack>
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap">
            <VStack align="start" spacing={1}>
              <Heading 
                size="xl"
                bgGradient="linear(to-r, purple.400, pink.400)"
                bgClip="text"
              >
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
                leftIcon={includeAdult ? <Text>🔞</Text> : null}
              >
                {includeAdult ? 'Adult attivi' : 'Solo normale'}
              </Button>
              <IconButton
                icon={<FaSync />}
                onClick={loadAllContent}
                aria-label="Ricarica"
                isLoading={loading}
                variant="ghost"
                colorScheme="purple"
              />
            </HStack>
          </HStack>
        </Box>

        {/* Continua a leggere */}
        {continueReading.length > 0 && (
          <ContentSection
            title="Continua a leggere"
            icon={FaBookOpen}
            items={continueReading}
            color="green"
            viewAllPath="/library"
            iconSize={4}
          />
        )}

        {/* Main Content Tabs */}
        <Box bg="gray.800" borderRadius="xl" p={4}>
          <Tabs colorScheme="purple" variant="soft-rounded">
            <TabList bg="gray.900" p={2} borderRadius="lg">
              <Tab>
                <HStack spacing={2}>
                  <FaClock />
                  <Text display={{ base: 'none', md: 'block' }}>Aggiornamenti</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FaStar />
                  <Text display={{ base: 'none', md: 'block' }}>Popolari</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FaTrophy />
                  <Text display={{ base: 'none', md: 'block' }}>Top Series</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Ultimi aggiornamenti */}
              <TabPanel px={0} pt={6}>
                <ContentSection
                  title="Capitoli recenti"
                  icon={FaClock}
                  items={latestUpdates}
                  color="blue"
                  viewAllPath="/search?sort=latest"
                />
              </TabPanel>

              {/* Più popolari */}
              <TabPanel px={0} pt={6}>
                <ContentSection
                  title="I più amati della settimana"
                  icon={FaHeart}
                  items={mostFavorites}
                  color="pink"
                  viewAllPath="/search?sort=popular"
                />
              </TabPanel>

              {/* Top Series */}
              <TabPanel px={0} pt={6}>
                <VStack spacing={6} align="stretch">
                  <ContentSection
                    title="Top Manga Giapponesi"
                    icon={GiDragonHead}
                    items={topManga}
                    color="orange"
                    viewAllPath="/categories?type=manga"
                    iconSize={6}
                  />
                  
                  <ContentSection
                    title="Top Manhwa Coreani"
                    icon={BiBook}
                    items={topManhwa}
                    color="purple"
                    viewAllPath="/categories?type=manhwa"
                    iconSize={5}
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
