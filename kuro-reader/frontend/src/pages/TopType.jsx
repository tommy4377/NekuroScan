import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Center
} from '@chakra-ui/react';
import { FaTrophy, FaArrowUp, FaPlus } from 'react-icons/fa';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function TopType() {
  const { type } = useParams();
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const toast = useToast();

  // Monitor scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadData = useCallback(async (pageNum, reset = false) => {
    if (loading && !reset) return;
    if (!hasMore && !reset) return;
    
    if (reset) {
      setInitialLoading(true);
      setList([]);
      setPage(1);
      setHasMore(true);
      pageNum = 1;
    }
    
    setLoading(true);
    
    try {
      const result = await statsAPI.getTopByType(type, includeAdult, pageNum);
      
      if (result && result.results) {
        setList(prev => {
          if (reset || pageNum === 1) {
            return result.results;
          }
          const existingUrls = new Set(prev.map(item => item.url));
          const newItems = result.results.filter(item => !existingUrls.has(item.url));
          return [...prev, ...newItems];
        });
        
        setPage(pageNum);
        setHasMore(result.hasMore && result.results.length > 0);
      }
    } catch (error) {
      console.error('Error loading:', error);
      toast({
        title: 'Errore caricamento',
        description: 'Riprova tra qualche secondo',
        status: 'error',
        duration: 3000,
      });
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [type, includeAdult, hasMore, toast, loading]);

  useEffect(() => {
    loadData(1, true);
  }, [type, includeAdult]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadData(page + 1);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (initialLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="100px" borderRadius="xl" />
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} height="320px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    );
  }

  const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box 
                p={3} 
                bg="purple.500" 
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FaTrophy color="white" size="20" />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'md', md: 'lg' }}>Top {typeTitle}</Heading>
                <HStack>
                  <Text fontSize="sm" color="gray.400">{list.length} caricati</Text>
                  <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>
                    {includeAdult ? '18+ inclusi' : 'Solo normali'}
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
              {includeAdult ? '🔞 Adult ON' : '🔞 Adult OFF'}
            </Button>
          </HStack>
        </Box>

        {/* Content */}
        {list.length > 0 ? (
          <>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {list.map((item, i) => (
                <MotionBox
                  key={`${item.url}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  position="relative"
                >
                  <MangaCard manga={item} hideSource />
                  
                  {/* Rank Badge for top 10 */}
                  {i < 10 && page === 1 && (
                    <Badge
                      position="absolute"
                      top={2}
                      left={2}
                      colorScheme={i < 3 ? 'yellow' : 'purple'}
                      fontSize="sm"
                      px={2}
                      py={1}
                      zIndex={10}
                    >
                      #{i + 1}
                    </Badge>
                  )}
                </MotionBox>
              ))}
            </SimpleGrid>

            {/* Load More Button */}
            {hasMore && (
              <Center py={6}>
                <Button
                  onClick={handleLoadMore}
                  isLoading={loading}
                  loadingText="Caricamento..."
                  colorScheme="purple"
                  size="lg"
                  leftIcon={!loading ? <FaPlus /> : undefined}
                  variant="solid"
                  disabled={loading}
                >
                  {loading ? 'Caricamento...' : 'Carica altri'}
                </Button>
              </Center>
            )}
            
            {!hasMore && list.length > 20 && (
              <Center py={4}>
                <Text color="gray.500">Hai raggiunto la fine</Text>
              </Center>
            )}
          </>
        ) : (
          <Center py={12}>
            <Text fontSize="lg" color="gray.500">
              Nessun {typeTitle.toLowerCase()} disponibile
            </Text>
          </Center>
        )}

        {/* Scroll to top */}
        {showScrollTop && (
          <IconButton
            icon={<FaArrowUp />}
            position="fixed"
            bottom={8}
            right={8}
            colorScheme="purple"
            borderRadius="full"
            size="lg"
            onClick={scrollToTop}
            boxShadow="xl"
            aria-label="Torna su"
            zIndex={100}
          />
        )}
      </VStack>
    </Container>
  );
}

export default TopType;
