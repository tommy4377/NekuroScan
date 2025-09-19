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
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [includeAdult, setIncludeAdult] = useState(() => localStorage.getItem('includeAdult') === 'true');
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
  }, [searchParams, includeAdult]);

  const performSearch = async (q) => {
    if (!q?.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      let data = [];
      if (includeAdult) {
        // solo adult
        const r = await apiManager.searchAdult(q, 40);
        data = r || [];
      } else {
        // solo normal
        const r = await apiManager.searchManga(q, 40);
        data = r.all || r.manga || [];
      }
      setResults(data);
      if (data.length === 0) toast({ title: 'Nessun risultato', status: 'info', duration: 2500 });
    } catch (e) {
      console.error(e);
      toast({ title: 'Errore nella ricerca', status: 'error' });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <VStack spacing={6}>
          <Heading size="xl">Cerca Manga</Heading>
          <form onSubmit={onSubmit} style={{ width: '100%' }}>
            <HStack spacing={4} maxW="600px" mx="auto" w="100%">
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                <Input
                  placeholder="Cerca per titolo..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  bg="gray.800"
                  border="none"
                />
              </InputGroup>
              <Button type="submit" size="lg" colorScheme="purple" isLoading={loading} isDisabled={!query.trim()}>
                Cerca
              </Button>
            </HStack>
          </form>
          <HStack>
            <Button
              variant={includeAdult ? 'solid' : 'outline'}
              colorScheme="pink"
              size="sm"
              onClick={() => {
                const v = !includeAdult;
                setIncludeAdult(v);
                localStorage.setItem('includeAdult', v.toString());
                if (query.trim()) performSearch(query);
              }}
            >
              {includeAdult ? '🔞 Solo Adult' : 'Solo Normali'}
            </Button>
          </HStack>
        </VStack>

        {(results.length > 0 || loading) && (
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="bold">
                {loading ? 'Ricerca in corso...' : `${results.length} risultati trovati`}
              </Text>
              <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>
                {includeAdult ? 'Adult' : 'Normali'}
              </Badge>
            </HStack>

            {loading ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {[...Array(10)].map((_, i) => <Skeleton key={i} height="280px" borderRadius="lg" />)}
              </SimpleGrid>
            ) : (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {results.map((item, i) => (
                  <MotionBox key={`${item.url}-${i}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 1) }}>
                    <Box position="relative">
                      <MangaCard manga={item} hideSource />
                      {item.isAdult && (
                        <Badge position="absolute" top={2} right={2} colorScheme="pink" fontSize="xs">18+</Badge>
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
            <Text fontSize="lg" color="gray.500">Nessun risultato per "{query}"</Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}

export default Search;
