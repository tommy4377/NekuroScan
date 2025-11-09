// frontend/src/pages/Search.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Input, InputGroup, InputLeftElement,
  Heading, Text, VStack, HStack, Button, Skeleton, Badge, useToast,
  ButtonGroup, Center, Spinner, SimpleGrid
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import searchHistory from '../utils/searchHistory';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300

// const Box = motion(Box); // Rimosso per evitare errori React #300

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState([]);
  
  // ✅ FIX: Ref per evitare spam
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const lastSearchRef = useRef('');

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

  // ✅ FIX: Funzione di ricerca ottimizzata senza spam
  const performSearch = useCallback(async (searchQuery, mode, pageNum = 1, append = false) => {
    // Evita ricerche duplicate
    const searchKey = `${searchQuery}-${mode}-${pageNum}`;
    if (loadingRef.current || !searchQuery?.trim() || searchKey === lastSearchRef.current) {
      return;
    }
    
    lastSearchRef.current = searchKey;
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
        data = await apiManager.searchAdult(searchQuery, limit);
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
      
      // ✅ Solo 1 toast se nessun risultato
      if (data.length === 0 && pageNum === 1) {
        toast({ 
          title: 'Nessun risultato trovato', 
          status: 'info', 
          duration: 2000,
          isClosable: true
        });
      }
    } catch (e) {
      console.error('❌ Search error:', e);
      toast({ 
        title: 'Errore nella ricerca', 
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      setResults(append ? results : []);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [preCacheImages, toast, results]);

  // ✅ FIX: Debounce manuale più efficiente
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
    }
    
    if (q && q.length >= 3) {
      // Cancella timeout precedente
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Nuovo timeout
      searchTimeoutRef.current = setTimeout(() => {
        setPage(1);
        lastSearchRef.current = ''; // Reset per permettere nuova ricerca
        performSearch(q, searchMode, 1, false);
      }, 500);
    } else if (!q) {
      setResults([]);
      setHasMore(true);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchParams, searchMode, performSearch]);

  const loadMore = () => {
    if (loadingRef.current || !hasMore) return;
    const nextPage = page + 1;
    performSearch(query, searchMode, nextPage, true);
  };

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasMore && !loadingRef.current && results.length > 0 && query && query.length >= 3) {
      loadMore();
    }
  }, [inView, hasMore, results.length, query]);

  // Carica cronologia al mount
  useEffect(() => {
    setHistory(searchHistory.getAll());
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && query.length >= 3) {
      // Salva nella cronologia
      searchHistory.add(query.trim());
      setHistory(searchHistory.getAll());
      setShowSuggestions(false);
      
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Mostra suggerimenti se c'è input
    if (value.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    
    // ✅ Non cercare durante la digitazione, solo quando premi invio
    if (value.length === 0) {
      setResults([]);
      setHasMore(true);
      lastSearchRef.current = '';
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  const clearHistory = () => {
    searchHistory.clear();
    setHistory([]);
    toast({
      title: 'Cronologia cancellata',
      status: 'info',
      duration: 2000
    });
  };

  const changeSearchMode = (mode) => {
    setSearchMode(mode);
    localStorage.setItem('searchMode', mode);
    setPage(1);
    lastSearchRef.current = ''; // Reset
    if (query.trim() && query.length >= 3) {
      performSearch(query, mode, 1, false);
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
            <Box maxW="600px" mx="auto" w="100%" position="relative">
              <HStack spacing={4}>
                <InputGroup size="lg">
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    inputMode="search"
                    placeholder="Cerca per titolo (min. 3 caratteri)..."
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    bg="gray.800"
                    border="1px solid"
                    borderColor="gray.700"
                    _focus={{ bg: 'gray.700', borderColor: 'purple.500', outline: 'none' }}
                    fontSize="16px"
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
              
              {/* Cronologia e Suggerimenti */}
              {showSuggestions && (query.length >= 2 || history.length > 0) && (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  right={0}
                  mt={2}
                  bg="gray.800"
                  borderRadius="lg"
                  boxShadow="xl"
                  zIndex={10}
                  maxH="300px"
                  overflowY="auto"
                  border="1px solid"
                  borderColor="gray.700"
                >
                  <VStack align="stretch" spacing={0}>
                    {/* Suggerimenti dalla cronologia */}
                    {query.length >= 2 && searchHistory.getSuggestions(query).map((suggestion, i) => (
                      <Box
                        key={i}
                        px={4}
                        py={3}
                        cursor="pointer"
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => selectSuggestion(suggestion)}
                        borderBottom={i < searchHistory.getSuggestions(query).length - 1 ? '1px solid' : 'none'}
                        borderColor="gray.700"
                      >
                        <HStack>
                          <SearchIcon color="purple.400" size="sm" />
                          <Text>{suggestion}</Text>
                        </HStack>
                      </Box>
                    ))}
                    
                    {/* Cronologia recente */}
                    {query.length === 0 && history.length > 0 && (
                      <>
                        <HStack justify="space-between" px={4} py={2} bg="gray.700">
                          <Text fontSize="sm" fontWeight="bold" color="gray.400">
                            Ricerche recenti
                          </Text>
                          <Button size="xs" variant="ghost" onClick={clearHistory}>
                            Cancella
                          </Button>
                        </HStack>
                        {history.slice(0, 10).map((item, i) => (
                          <Box
                            key={i}
                            px={4}
                            py={3}
                            cursor="pointer"
                            _hover={{ bg: 'gray.700' }}
                            onClick={() => selectSuggestion(item.query)}
                          >
                            <HStack justify="space-between">
                              <HStack>
                                <SearchIcon color="gray.500" size="sm" />
                                <Text>{item.query}</Text>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </Text>
                            </HStack>
                          </Box>
                        ))}
                      </>
                    )}
                  </VStack>
                </Box>
              )}
            </Box>
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
                <SimpleGrid 
                  columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} 
                  spacing={4}
                  w="100%"
                  overflow="visible"
                >
                  {results.map((item, i) => (
                    <Box 
                      key={item.url || `search-${i}`}
                      h="100%"
                      overflow="visible"
                    >
                      <MangaCard 
                        manga={item} 
                        hideSource 
                        priority={i < 12}
                      />
                    </Box>
                  ))}
                </SimpleGrid>
                
                {hasMore && query && (
                  <Center ref={loadMoreRef} py={6}>
                    {loadingMore && (
                      <VStack spacing={2}>
                        <Spinner size="lg" color="purple.500" thickness="3px" />
                        <Text fontSize="sm" color="gray.400">Caricamento...</Text>
                      </VStack>
                    )}
                  </Center>
                )}
                
                {!hasMore && results.length > 20 && (
                  <Center py={4}>
                    <Text color="gray.500">Hai raggiunto la fine</Text>
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