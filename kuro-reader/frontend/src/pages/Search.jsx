import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Heading,
  Text,
  VStack,
  HStack,
  Select,
  Button,
  Skeleton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  useToast
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
  const [results, setResults] = useState({ all: [], manga: [], novels: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await apiManager.searchAll(searchQuery);
      setResults(searchResults);
      
      toast({
        title: 'Ricerca completata',
        description: `Trovati ${searchResults.all.length} risultati`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Errore nella ricerca',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query);
    }
  };

  const getFilteredResults = () => {
    switch (filter) {
      case 'manga':
        return results.manga;
      case 'novels':
        return results.novels;
      default:
        return results.all;
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
            <Heading size="xl">Cerca Manga e Novel</Heading>
            
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
            {/* Filters */}
            <HStack justify="space-between" wrap="wrap">
              <HStack>
                <Text fontWeight="bold">
                  {loading ? 'Ricerca...' : `${getFilteredResults().length} risultati`}
                </Text>
                {results.all.length > 0 && (
                  <HStack spacing={2}>
                    <Badge colorScheme="blue">{results.manga.length} Manga</Badge>
                    <Badge colorScheme="purple">{results.novels.length} Novel</Badge>
                  </HStack>
                )}
              </HStack>
              
              <Select
                maxW="200px"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                bg="gray.800"
              >
                <option value="all">Tutti</option>
                <option value="manga">Solo Manga</option>
                <option value="novels">Solo Novel</option>
              </Select>
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
                {getFilteredResults().map((item, i) => (
                  <MotionBox
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <MangaCard manga={item} />
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