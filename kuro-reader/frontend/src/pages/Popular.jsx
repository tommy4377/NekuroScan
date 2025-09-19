import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, SimpleGrid, VStack, Spinner, Text,
  HStack, Button, useToast, IconButton
} from '@chakra-ui/react';
import { useInView } from 'react-intersection-observer';
import { FaFire, FaArrowUp } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function Popular() {
  const [manga, setManga] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [includeAdult, setIncludeAdult] = useState(() => {
    return localStorage.getItem('includeAdult') === 'true';
  });
  const { ref, inView } = useInView({ threshold: 0.1 });
  const toast = useToast();
  
  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore();
    }
  }, [inView]);
  
  useEffect(() => {
    loadInitial();
  }, [includeAdult]);
  
  const loadInitial = async () => {
    setLoading(true);
    setManga([]);
    setPage(1);
    try {
      const result = await statsAPI.getMostFavorites(includeAdult, 1);
      setManga(result.results);
      setHasMore(result.hasMore);
      setPage(2);
    } catch (error) {
      console.error('Error loading:', error);
      toast({
        title: 'Errore caricamento',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const result = await statsAPI.getMostFavorites(includeAdult, page);
      setManga(prev => [...prev, ...result.results]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap">
          <HStack>
            <Box p={2} bg="orange.500" borderRadius="lg">
              <FaFire color="white" size={24} />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size="lg">Manga Più Popolari</Heading>
              <Text fontSize="sm" color="gray.400">
                I più letti di sempre
              </Text>
            </VStack>
          </HStack>
          
          <Button
            variant={includeAdult ? 'solid' : 'outline'}
            colorScheme="pink"
            size="sm"
            onClick={() => {
              const newValue = !includeAdult;
              setIncludeAdult(newValue);
              localStorage.setItem('includeAdult', newValue.toString());
            }}
          >
            {includeAdult ? '🔞 Adult ON' : 'Solo normale'}
          </Button>
        </HStack>
        
        {/* Grid manga */}
        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
          {manga.map((item, i) => (
            <MotionBox
              key={`${item.url}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
              position="relative"
            >
              <MangaCard manga={item} />
              {i < 10 && (
                <Box
                  position="absolute"
                  top={2}
                  left={2}
                  bg="orange.500"
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  #{i + 1}
                </Box>
              )}
              {item.isAdult && (
                <Box
                  position="absolute"
                  top={2}
                  right={2}
                  bg="pink.500"
                  color="white"
                  fontSize="xs"
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  18+
                </Box>
              )}
            </MotionBox>
          ))}
        </SimpleGrid>
        
        {/* Loading indicator */}
        {hasMore && (
          <Box ref={ref} textAlign="center" py={8}>
            {loading ? (
              <VStack>
                <Spinner size="xl" color="purple.500" thickness="4px" />
                <Text color="gray.500">Caricamento...</Text>
              </VStack>
            ) : (
              <Button onClick={loadMore} variant="outline">
                Carica altri
              </Button>
            )}
          </Box>
        )}
        
        {!hasMore && manga.length > 0 && (
          <Text textAlign="center" color="gray.500" py={4}>
            Hai raggiunto la fine • {manga.length} manga totali
          </Text>
        )}
      </VStack>

      {/* Scroll to top button */}
      {manga.length > 20 && (
        <IconButton
          icon={<FaArrowUp />}
          position="fixed"
          bottom={8}
          right={8}
          colorScheme="purple"
          borderRadius="full"
          size="lg"
          onClick={scrollToTop}
          boxShadow="lg"
          aria-label="Torna su"
        />
      )}
    </Container>
  );
}

export default Popular;
