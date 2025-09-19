import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, Badge, IconButton, Spinner,
  Select, Switch
} from '@chakra-ui/react';
import { useInView } from 'react-intersection-observer';
import { FaClock, FaArrowUp, FaFilter } from 'react-icons/fa';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MotionBox = motion(Box);

function Latest() {
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const { ref, inView } = useInView({ 
    threshold: 0.1, 
    rootMargin: '200px' 
  });
  
  const toast = useToast();

  // Monitor scroll for button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load initial data
  useEffect(() => {
    loadData(1);
  }, [includeAdult, filter]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loading && list.length > 0) {
      loadData(page + 1);
    }
  }, [inView, hasMore, loading]);

  const loadData = async (pageNum) => {
    if (pageNum === 1) {
      setInitialLoading(true);
      setList([]);
    } else {
      setLoading(true);
    }
    
    try {
      const result = await statsAPI.getLatestUpdates(includeAdult, pageNum);
      
      // Apply filter if needed
      let filtered = result.results;
      if (filter === 'today') {
        const today = new Date().toDateString();
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.updateDate || Date.now()).toDateString();
          return itemDate === today;
        });
      } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.updateDate || Date.now());
          return itemDate >= weekAgo;
        });
      }
      
      if (pageNum === 1) {
        setList(filtered);
      } else {
        setList(prev => [...prev, ...filtered]);
      }
      
      setPage(pageNum);
      setHasMore(result.hasMore);
      
    } catch (error) {
      console.error('Error loading latest:', error);
      toast({
        title: 'Errore caricamento',
        description: 'Impossibile caricare gli ultimi aggiornamenti',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatChapterNumber = (chapter) => {
    if (!chapter) return '';
    return chapter
      .replace(/^cap\.\s*/i, '')
      .replace(/^capitolo\s*/i, '')
      .replace(/^chapter\s*/i, '')
      .replace(/^ch\.\s*/i, '');
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box p={3} bg="blue.500" borderRadius="lg">
                <FaClock color="white" size="20" />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'md', md: 'lg' }}>
                  Ultimi Aggiornamenti
                </Heading>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.400">
                    {list.length} manga caricati
                  </Text>
                  {!initialLoading && (
                    <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>
                      {includeAdult ? '18+ inclusi' : 'Solo normali'}
                    </Badge>
                  )}
                </HStack>
              </VStack>
            </HStack>
            
            {/* Filters */}
            <HStack spacing={3}>
              <Select
                size="sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                maxW="150px"
                bg="gray.700"
              >
                <option value="all">Tutti</option>
                <option value="today">Oggi</option>
                <option value="week">Settimana</option>
              </Select>
              
              <HStack>
                <Text fontSize="sm" display={{ base: 'none', md: 'block' }}>
                  Adult:
                </Text>
                <Switch
                  colorScheme="pink"
                  isChecked={includeAdult}
                  onChange={(e) => setIncludeAdult(e.target.checked)}
                />
              </HStack>
            </HStack>
          </HStack>
        </Box>

        {/* Content */}
        {initialLoading ? (
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} height="320px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : list.length > 0 ? (
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
                
                {/* Chapter Badge */}
                {item.latestChapter && (
                  <Box
                    position="absolute"
                    bottom="60px"
                    left={2}
                    right={2}
                    bg="blue.600"
                    color="white"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="xs"
                    textAlign="center"
                    opacity={0.95}
                    fontWeight="bold"
                  >
                    Capitolo {formatChapterNumber(item.latestChapter)}
                  </Box>
                )}
                
                {/* Adult Badge */}
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
          </SimpleGrid>
        ) : (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500">
              Nessun aggiornamento disponibile
            </Text>
          </Box>
        )}

        {/* Load More */}
        {hasMore && !initialLoading && (
          <Box ref={ref} textAlign="center" py={6}>
            {loading ? (
              <HStack justify="center" spacing={3}>
                <Spinner color="purple.500" />
                <Text>Caricamento...</Text>
              </HStack>
            ) : (
              <Button 
                variant="outline" 
                colorScheme="purple"
                onClick={() => loadData(page + 1)}
              >
                Carica altri
              </Button>
            )}
          </Box>
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

export default Latest;
