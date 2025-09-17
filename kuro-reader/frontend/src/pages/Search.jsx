import React, { useState, useEffect } from 'react';
import {
  Box, Container, Input, InputGroup, InputLeftElement, SimpleGrid,
  Heading, Text, VStack, HStack, Button, Skeleton, Badge, useToast
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ all: [], manga: [], mangaAdult: [] });
  const [loading, setLoading] = useState(false);
  const [includeAdult, setIncludeAdult] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setResults({ all: [], manga: [], mangaAdult: [] });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Searching for:', searchQuery);
      const searchResults = await apiManager.searchAll(searchQuery, { includeAdult });
      console.log('Results:', searchResults);
      
      setResults(searchResults);
      
      if (searchResults.all.length === 0) {
        toast({
          title: 'Nessun risultato',
          description: 'Prova con altre parole chiave',
          status: 'info',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Errore nella ricerca',
        description: error.message || 'Si è verificato un errore',
        status: 'error',
        duration: 3000,
      });
      setResults({ all: [], manga: [], mangaAdult: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (query.trim()) {
      // Aggiorna l'URL e esegui la ricerca
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const quickSearch = (tag) => {
    setQuery(tag);
    navigate(`/search?q=${encodeURIComponent(tag)}`);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Search Header */}
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <VStack spacing={6}>
            <Heading size="xl">Cerca Manga</Heading>
            
            <form onSubmit={handleSearch} style={{ width: '100%' }}>
              <HStack spacing={4} maxW="600px" mx="auto">
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
                    _focus={{ bg: 'gray.700', boxShadow: 'outline' }}
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

            {/* Include Adult Toggle */}
            <HStack>
              <Button
                variant={includeAdult ? 'solid' : 'outline'}
                colorScheme="pink"
                size="sm"
                onClick={() => {
                  setIncludeAdult(!includeAdult);
                  // Se c'è già una ricerca attiva, rieseguila
                  if (query.trim()) {
                    performSearch(query);
                  }
                }}
              >
                {includeAdult ? '🔞 Adult inclusi' : 'Solo contenuti normali'}
              </Button>
            </HStack>

            {/* Quick Tags */}
            <HStack wrap="wrap" justify="center" spacing={2}>
              {['One Piece', 'Naruto', 'Solo Leveling', 'Attack on Titan', 'Demon Slayer'].map(tag => (
                <Button
                  key={tag}
                  size="sm"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => quickSearch(tag)}
                >
                  {tag}
                </Button>
              ))}
            </HStack>
          </VStack>
        </MotionBox>

        {/* Results */}
        {(results.all.length > 0 || loading) && (
          <VStack spacing={6} align="stretch">
            {/* Results count */}
            <HStack justify="space-between">
              <Text fontWeight="bold">
                {loading ? 'Ricerca in corso...' : `${results.all.length} risultati trovati`}
              </Text>
              {results.all.length > 0 && (
                <HStack spacing={2}>
                  {results.manga.length > 0 && (
                    <Badge colorScheme="blue">{results.manga.length} Manga</Badge>
                  )}
                  {results.mangaAdult.length > 0 && (
                    <Badge colorScheme="pink">🔞 {results.mangaAdult.length} Adult</Badge>
                  )}
                </HStack>
              )}
            </HStack>

            {/* Results Grid */}
            {loading ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} height="280px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            ) : (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {results.all.map((item, i) => (
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

        {/* Empty State */}
        {!loading && results.all.length === 0 && query && (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500">
              Nessun risultato trovato per "{query}"
            </Text>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Prova con parole chiave diverse o attiva i contenuti adult
            </Text>
          </Box>
        )}

        {/* Initial state */}
        {!loading && !query && (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500">
              Inserisci un termine di ricerca per iniziare
            </Text>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Oppure usa uno dei tag rapidi sopra
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}

export default Search;
