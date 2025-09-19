import React, { useState, useEffect } from 'react';
import {
  Box, Container, Input, InputGroup, InputLeftElement, SimpleGrid,
  Heading, Text, VStack, HStack, Button, Skeleton, Badge, useToast,
  ButtonGroup
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState(() => {
    const saved = localStorage.getItem('searchMode');
    return saved || 'all'; // 'all', 'normal', 'adult'
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    } else {
      setResults([]);
    }
  }, [searchParams, searchMode]);

  const performSearch = async (q) => {
    if (!q?.trim()) { 
      setResults([]); 
      return; 
    }
    
    setLoading(true);
    try {
      let data = [];
      
      if (searchMode === 'adult') {
        // Solo adult
        const r = await apiManager.searchAdult(q, 40);
        data = r || [];
      } else if (searchMode === 'normal') {
        // Solo normali
        const r = await apiManager.searchManga(q, 40);
        data = r.all || r.manga || [];
      } else {
        // Tutti (normale + adult)
        const r = await apiManager.searchAll(q, { includeAdult: true, limit: 40 });
        data = r.all || [];
      }
      
      setResults(data);
      
      if (data.length === 0) {
        toast({ 
          title: 'Nessun risultato trovato', 
          status: 'info', 
          duration: 2500 
        });
      }
    } catch (e) {
      console.error('Search error:', e);
      toast({ 
        title: 'Errore nella ricerca', 
        status: 'error' 
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const changeSearchMode = (mode) => {
    setSearchMode(mode);
    localStorage.setItem('searchMode', mode);
    if (query.trim()) {
      performSearch(query);
    }
  };

  const getResultsStats = () => {
    const normal = results.filter(r => !r.isAdult).length;
    const adult = results.filter(r => r.isAdult).length;
    return { normal, adult };
  };

  const stats = getResultsStats();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <VStack spacing={6}>
          <Heading size="xl">Cerca Manga</Heading>
          
          <form onSubmit={onSubmit} style={{ width: '100%' }}>
            <HStack spacing={4} maxW="600px" mx="auto" w="100%">
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Cerca per titolo..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  bg="gray.800"
                  border="none"
                  _focus={{ bg: 'gray.700', borderColor: 'purple.500' }}
                />
              </InputGroup>
              <Button 
                type="submit" 
                size="lg" 
                colorScheme="purple" 
                isLoading={loading} 
                isDisabled={!query.trim()}
              >
                Cerca
              </Button>
            </HStack>
          </form>
          
          <VStack spacing={3}>
            <Text fontSize="sm" color="gray.400">Tipo di contenuti:</Text>
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                variant={searchMode === 'all' ? 'solid' : 'outline'}
                colorScheme="purple"
                onClick={() => changeSearchMode('all')}
              >
                Tutti
              </Button>
              <Button
                variant={searchMode === 'normal' ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => changeSearchMode('normal')}
              >
                Solo Normali
              </Button>
              <Button
                variant={searchMode === 'adult' ? 'solid' : 'outline'}
                colorScheme="pink"
                onClick={() => changeSearchMode('adult')}
              >
                🔞 Solo Adult
              </Button>
            </ButtonGroup>
          </VStack>
        </VStack>

        {(results.length > 0 || loading) && (
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" flexWrap="wrap">
              <Text fontWeight="bold">
                {loading ? 'Ricerca in corso...' : `${results.length} risultati trovati`}
              </Text>
              {!loading && results.length > 0 && searchMode === 'all' && (
                <HStack spacing={2}>
                  {stats.normal > 0 && (
                    <Badge colorScheme="blue">{stats.normal} Normali</Badge>
                  )}
                  {stats.adult > 0 && (
                    <Badge colorScheme="pink">{stats.adult} Adult</Badge>
                  )}
                </HStack>
              )}
            </HStack>

            {loading ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} height="280px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            ) : (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {results.map((item, i) => (
                  <MotionBox 
                    key={`${item.url}-${i}`} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: Math.min(i * 0.05, 1) }}
                  >
                    <Box position="relative">
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
                  </MotionBox>
                ))}
              </SimpleGrid>
            )}
          </VStack>
        )}

        {!loading && results.length === 0 && query && (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500">
              Nessun risultato per "{query}"
            </Text>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Prova a cambiare il tipo di contenuti o modifica la ricerca
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}

export default Search;
