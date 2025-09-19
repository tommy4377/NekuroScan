import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton
} from '@chakra-ui/react';
import { useInView } from 'react-intersection-observer';
import { FaHeart, FaArrowUp } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

function Popular() {
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: '200px' });
  const toast = useToast();

  useEffect(() => {
    load(1);
  }, [includeAdult]);

  useEffect(() => {
    if (inView && hasMore && !loading && list.length > 0) {
      const np = page + 1;
      setPage(np);
      load(np);
    }
  }, [inView]);

  const load = async (p) => {
    setLoading(true);
    try {
      const r = await statsAPI.getMostFavorites(includeAdult, p);
      setList(prev => p === 1 ? r.results : [...prev, ...r.results]);
      setHasMore(r.hasMore);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" flexWrap="wrap">
          <HStack>
            <Box p={3} bg="pink.500" borderRadius="lg">
              <FaHeart color="white" />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size="lg">I più letti</Heading>
              <HStack>
                <Text fontSize="sm" color="gray.400">{list.length} caricati</Text>
                <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>
                  {includeAdult ? 'Adult' : 'Normali'}
                </Badge>
              </HStack>
            </VStack>
          </HStack>

          <Button
            variant={includeAdult ? 'solid' : 'outline'}
            colorScheme="pink"
            size="sm"
            onClick={() => setIncludeAdult(!includeAdult)}
          >
            {includeAdult ? '🔞 Solo Adult' : 'Solo Normali'}
          </Button>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
          {list.map((item, i) => (
            <Box key={`${item.url}-${i}`} position="relative">
              <MangaCard manga={item} hideSource showLatest={false} />
              {item.isAdult && (
                <Badge position="absolute" top={2} right={2} colorScheme="pink" fontSize="xs">
                  18+
                </Badge>
              )}
            </Box>
          ))}
        </SimpleGrid>

        {hasMore && (
          <Box ref={ref} textAlign="center" py={6}>
            {loading ? (
              <HStack justify="center">
                <Skeleton height="40px" width="120px" borderRadius="lg" />
              </HStack>
            ) : (
              <Button variant="outline" onClick={() => { const np = page + 1; setPage(np); load(np); }}>
                Carica altri
              </Button>
            )}
          </Box>
        )}

        {list.length > 20 && (
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
      </VStack>
    </Container>
  );
}

export default Popular;
