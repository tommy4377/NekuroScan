import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Flex, Icon, Skeleton
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaHeart, FaFire, FaClock, FaCalendarWeek } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';

const MotionBox = motion(Box);

function Home() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState('manga');
  const [recentChapters, setRecentChapters] = useState([]);
  const [weeklyReleases, setWeeklyReleases] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadContent();
  }, [selectedSection]);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Carica contenuti in base alla sezione
      const includeAdult = selectedSection === 'adult';
      
      // Carica trending
      const trendingData = await apiManager.getTrending(includeAdult);
      setTrending(trendingData);
      
      // Carica capitoli recenti (solo per manga normale)
      if (selectedSection === 'manga') {
        const recent = await apiManager.getRecentChapters();
        setRecentChapters(recent);
        
        const weekly = await apiManager.getWeeklyReleases();
        setWeeklyReleases(weekly);
      } else {
        // Per adult carica contenuti adult specifici
        const adultSearch = await apiManager.searchAdult('', 20);
        setRecentChapters(adultSearch.slice(0, 10));
        setWeeklyReleases(adultSearch.slice(10, 20));
      }
      
    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare i contenuti',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Sezioni circolari per Manga/Adult */}
        <Flex justify="center" gap={8} py={8}>
          <MotionBox
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedSection('manga')}
          >
            <VStack
              bg={selectedSection === 'manga' ? 'purple.600' : 'gray.700'}
              borderRadius="full"
              w="150px"
              h="150px"
              justify="center"
              cursor="pointer"
              transition="all 0.3s"
              boxShadow={selectedSection === 'manga' ? '0 0 30px rgba(147, 51, 234, 0.5)' : 'xl'}
            >
              <Icon as={FaBook} boxSize={12} />
              <Text fontWeight="bold" fontSize="lg">Manga</Text>
            </VStack>
          </MotionBox>

          <MotionBox
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedSection('adult')}
          >
            <VStack
              bg={selectedSection === 'adult' ? 'pink.600' : 'gray.700'}
              borderRadius="full"
              w="150px"
              h="150px"
              justify="center"
              cursor="pointer"
              transition="all 0.3s"
              boxShadow={selectedSection === 'adult' ? '0 0 30px rgba(236, 72, 153, 0.5)' : 'xl'}
            >
              <Icon as={FaHeart} boxSize={12} />
              <Text fontWeight="bold" fontSize="lg">Adult</Text>
              <Text fontSize="xs" color="gray.300">18+</Text>
            </VStack>
          </MotionBox>
        </Flex>

        {/* Trending */}
        <VStack align="stretch" spacing={4}>
          <HStack>
            <Icon as={FaFire} color="orange.400" />
            <Heading size="lg">
              Trending {selectedSection === 'adult' ? 'Adult' : 'Manga'}
            </Heading>
          </HStack>
          
          {loading ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {trending.slice(0, 10).map((manga, i) => (
                <MangaCard key={`trending-${i}`} manga={manga} hideSource />
              ))}
            </SimpleGrid>
          )}
        </VStack>

        {/* Uscite settimanali / Popolari */}
        <VStack align="stretch" spacing={4}>
          <HStack>
            <Icon as={FaCalendarWeek} color="green.400" />
            <Heading size="lg">
              {selectedSection === 'adult' ? 'Popolari' : 'Uscite questa settimana'}
            </Heading>
          </HStack>
          
          {loading ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {weeklyReleases.slice(0, 10).map((manga, i) => (
                <MangaCard key={`weekly-${i}`} manga={manga} hideSource />
              ))}
            </SimpleGrid>
          )}
        </VStack>

        {/* Capitoli recenti / Nuovi arrivi */}
        <VStack align="stretch" spacing={4}>
          <HStack>
            <Icon as={FaClock} color="blue.400" />
            <Heading size="lg">
              {selectedSection === 'adult' ? 'Nuovi arrivi' : 'Capitoli recenti'}
            </Heading>
          </HStack>
          
          {loading ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {recentChapters.slice(0, 10).map((manga, i) => (
                <MangaCard key={`recent-${i}`} manga={manga} hideSource />
              ))}
            </SimpleGrid>
          )}
        </VStack>

        {/* Pulsante per vedere di più */}
        <HStack justify="center" pt={4}>
          <Button
            colorScheme="purple"
            onClick={() => navigate('/search')}
            size="lg"
          >
            Esplora tutti i {selectedSection === 'adult' ? 'manga adult' : 'manga'}
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}

export default Home;
