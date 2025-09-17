import React, { useState, useEffect } from 'react';
import {
  Box, Container, Input, InputGroup, InputLeftElement, SimpleGrid,
  Heading, Text, VStack, HStack, Button, Skeleton, Badge, useToast
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useSearchParams } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState({ all: [], manga: [], mangaAdult: [] });
  const [loading, setLoading] = useState(false);
  const [includeAdult, setIncludeAdult] = useState(false);
  const toast = useToast();

  useEffect(() => {
  const q = searchParams.get('q');
  if (q && q !== query) {
    setQuery(q);
    performSearch(q);
  }
}, [searchParams.get('q')]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await apiManager.searchAll(searchQuery, { includeAdult });
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
      toast({
        title: 'Errore nella ricerca',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
      setResults({ all: [], manga: [], mangaAdult: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
  if (e) e.preventDefault();
  
  if (query.trim()) {
    // Non cambiare route, solo esegui la ricerca
    performSearch(query);
  }
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
                    _focus={{ bg: 'gray.700' }}
                  />
                </InputGroup>
                <Button type="submit" size="lg" colorScheme="purple" isLoading={loading}>
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
                onClick={() => setIncludeAdult(!includeAdult)}
              >
                {includeAdult ? 'Adult inclusi' : 'Solo normale'}
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
                  onClick={() => {
                    setQuery(tag);
                    setSearchParams({ q: tag });
                    performSearch(tag);
                  }}
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
                {loading ? 'Ricerca...' : `${results.all.length} risultati`}
              </Text>
              {results.all.length > 0 && (
                <HStack spacing={2}>
                  {results.manga.length > 0 && (
                    <Badge colorScheme="blue">{results.manga.length} Manga</Badge>
                  )}
                  {results.mangaAdult.length > 0 && (
                    <Badge colorScheme="pink">{results.mangaAdult.length} Adult</Badge>
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
                    transition={{ delay: i * 0.05 }}
                  >
                    <MangaCard manga={item} hideSource />
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
              Prova con parole chiave diverse
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}

export default Search;

