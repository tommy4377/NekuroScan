// frontend/src/pages/Search.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Input, InputGroup, InputLeftElement,
  Heading, Text, VStack, HStack, Button, Skeleton, Badge, useToast,
  ButtonGroup, Center, Spinner
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import { motion } from 'framer-motion';
import debounce from 'lodash.debounce';
import VirtualGrid from '../components/VirtualGrid';

const MotionBox = motion(Box);

function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState(() => localStorage.getItem('searchMode') || 'all');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: false
  });

  const preCacheImages = useCallback((items) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const urls = items.map(i => i.cover || i.coverUrl).filter(Boolean);
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls });
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery, mode, pageNum = 1, append = false) => {
      if (!searchQuery?.trim() || loadingRef.current) { 
        setResults([]); 
        setLoading(false);
        return; 
      }
      
      loadingRef.current = true;
      
      if (pageNum === 1) {
        setLoading(true);
        setResults([]);
      } else {
        setLoadingMore(true);
      }
      
      try {
        let data = [];
        const limit = 40;
        
        if (mode === 'adult') {
          const r = await apiManager.searchAdult(searchQuery, limit);
          data = r || [];
        } else if (mode === 'normal') {
          const r = await apiManager.searchManga(searchQuery, limit);
          data = r.all || r.manga || [];
        } else {
          const r = await apiManager.searchAll(searchQuery, { includeAdult: true, limit });
          data = r.all || [];
        }
        
        if (append) {
          setResults(prev => {
            const existingUrls = new Set(prev.map(m => m.url));
            const newItems = data.filter(m => !existingUrls.has(m.url));
            preCacheImages(newItems);
            return [...prev, ...newItems];
          });
        } else {
          preCacheImages(data);
          setResults(data);
        }
        
        setHasMore(data.length >= 20);
        setPage(pageNum);
        
        if (data.length === 0 && pageNum === 1) {
          toast({ 
            title: 'Nessun risultato trovato', 
            status: 'info', 
            duration: 2500 
          });
        }
      } catch (e) {
        console.error('Search error:', e);
        toast({ title: 'Errore nella ricerca', status: 'error' });
        setResults(append ? results : []);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    }, 500),
    [preCacheImages, toast, results]
  );

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setPage(1);
      debouncedSearch(q, searchMode, 1, false);
    } else {
      setResults([]);
    }
    
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchParams, searchMode, debouncedSearch]);

  useEffect(() => {
    if (inView && hasMore && !loadingRef.current && results.length > 0 && query) {
      loadMore();
    }
  }, [inView, hasMore, results.length, query]);

  const loadMore = () => {
    if (loadingRef.current || !hasMore) return;
    const nextPage = page + 1;
    debouncedSearch(query, searchMode, nextPage, true);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 3) {
      setPage(1);
      debouncedSearch(value, searchMode, 1, false);
    } else if (value.length === 0) {
      setResults([]);
      setHasMore(true);
    }
  };

  const changeSearchMode = (mode) => {
    setSearchMode(mode);
    localStorage.setItem('searchMode', mode);
    setPage(1);
    if (query.trim()) {
      debouncedSearch(query, mode, 1, false);
    }
  };

  const normalCount = results.filter(r => !r.isAdult).length;
  const adultCount = results.filter(r => r.isAdult).length;

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
                  placeholder="Cerca per titolo (min. 3 caratteri)..."
                  value={query}
                  onChange={handleInputChange}
                  bg="gray.800"
                  border="none"
                  _focus={{ bg: 'gray.700', borderColor: 'purple.500' }}
                  autoFocus
                />
              </InputGroup>
              <Button 
                type="submit" 
                size="lg" 
                colorScheme="purple" 
                isLoading={loading} 
                isDisabled={!query.trim() || query.length < 3}
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
                  {normalCount > 0 && (
                    <Badge colorScheme="blue">{normalCount} Normali</Badge>
                  )}
                  {adultCount > 0 && (
                    <Badge colorScheme="pink">{adultCount} Adult</Badge>
                  )}
                </HStack>
              )}
            </HStack>

            {loading && results.length === 0 ? (
              <HStack spacing={4} wrap="wrap">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} height="280px" borderRadius="lg" flex="1 0 160px" />
                ))}
              </HStack>
            ) : (
              <>
                {results.length > 40 ? (
                  <VirtualGrid
                    items={results}
                    minWidth={160}
                    gap={16}
                    renderItem={(item, i) => (
                      <MotionBox 
                        key={`${item.url}-${i}`} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: Math.min(i * 0.01, 0.3) }}
                      >
                        <MangaCard manga={item} hideSource />
                      </MotionBox>
                    )}
                  />
                ) : (
                  <HStack spacing={4} wrap="wrap">
                    {results.map((item, i) => (
                      <MotionBox 
                        key={`${item.url}-${i}`} 
                        flex="1 0 160px"
                        maxW="200px"
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: Math.min(i * 0.05, 1) }}
                      >
                        <MangaCard manga={item} hideSource />
                      </MotionBox>
                    ))}
                  </HStack>
                )}
                
                {hasMore && query && (
                  <Center ref={loadMoreRef} py={4}>
                    {loadingMore ? (
                      <HStack>
                        <Spinner color="purple.500" />
                        <Text>Caricamento altri risultati...</Text>
                      </HStack>
                    ) : (
                      <Button
                        colorScheme="purple"
                        variant="outline"
                        onClick={loadMore}
                      >
                        Carica altri
                      </Button>
                    )}
                  </Center>
                )}
              </>
            )}
          </VStack>
        )}

        {!loading && results.length === 0 && query && query.length >= 3 && (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500">
              Nessun risultato per "{query}"
            </Text>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Prova a cambiare il tipo di contenuti o modifica la ricerca
            </Text>
          </Box>
        )}

        {query && query.length < 3 && query.length > 0 && (
          <Box textAlign="center" py={8}>
            <Text color="gray.500">
              Digita almeno 3 caratteri per cercare
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}

export default Search;