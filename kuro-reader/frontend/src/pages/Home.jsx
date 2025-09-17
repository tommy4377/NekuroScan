import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Flex, Icon, Skeleton, Badge
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaHeart, FaFire, FaClock, FaCalendarWeek } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import useAuth from '../hooks/useAuth';

const MotionBox = motion(Box);

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSection, setSelectedSection] = useState('manga');
  const [continueReading, setContinueReading] = useState([]);
  const [recentChapters, setRecentChapters] = useState([]);
  const [weeklyReleases, setWeeklyReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadContent();
  }, [selectedSection]);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Carica continua a leggere
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      setContinueReading(reading.slice(0, 10));

      // Carica capitoli recenti
      const recent = await apiManager.getRecentChapters();
      setRecentChapters(recent);

      // Carica uscite settimanali
      const weekly = await apiManager.getWeeklyReleases();
      setWeeklyReleases(weekly);
      
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionClick = (section) => {
    if (section === 'adult' && !user) {
      toast({
        title: 'Accesso richiesto',
        description: 'Devi effettuare l\'accesso per vedere questa sezione',
        status: 'warning',
        duration: 3000,
      });
      navigate('/');
      return;
    }
    setSelectedSection(section);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Sezioni circolari per Manga/Adult */}
        <Flex justify="center" gap={8} py={8}>
          <MotionBox
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSectionClick('manga')}
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
              <Text fontWeight="bold">Manga</Text>
            </VStack>
          </MotionBox>

          <MotionBox
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSectionClick('adult')}
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
              position="relative"
            >
              <Icon as={FaHeart} boxSize={12} />
              <Text fontWeight="bold">Adult</Text>
              {!user && (
                <Badge position="absolute" top={2} right={2} colorScheme="red">
                  18+
                </Badge>
              )}
            </VStack>
          </MotionBox>
        </Flex>

        {/* Continua a leggere */}
        {continueReading.length > 0 && (
          <VStack align="stretch" spacing={4}>
            <HStack>
              <Icon as={FaClock} color="purple.400" />
              <Heading size="lg">Continua a leggere</Heading>
            </HStack>
            
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {continueReading.map((item, i) => (
                <MangaCard key={i} manga={item} hideSource />
              ))}
            </SimpleGrid>
          </VStack>
        )}

        {/* Uscite settimanali */}
        <VStack align="stretch" spacing={4}>
          <HStack>
            <Icon as={FaCalendarWeek} color="green.400" />
            <Heading size="lg">Uscite questa settimana</Heading>
          </HStack>
          
          {loading ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {weeklyReleases.map((manga, i) => (
                <MangaCard key={i} manga={manga} hideSource />
              ))}
            </SimpleGrid>
          )}
        </VStack>

        {/* Capitoli recenti */}
        <VStack align="stretch" spacing={4}>
          <HStack>
            <Icon as={FaFire} color="orange.400" />
            <Heading size="lg">Capitoli recenti</Heading>
          </HStack>
          
          {loading ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {recentChapters.map((manga, i) => (
                <MangaCard key={i} manga={manga} hideSource />
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </VStack>
    </Container>
  );
}

export default Home;
