// @ts-nocheck - Complex legacy file, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/pages/Search.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import {
  Box, Container, Input, InputGroup, InputLeftElement,
  Heading, Text, VStack, HStack, Button, Skeleton, Badge, useToast,
  ButtonGroup, Center, Spinner, SimpleGrid, Collapse, IconButton,
  Wrap, WrapItem, Avatar
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { FaFilter, FaUserFriends } from 'react-icons/fa';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import MangaCard from '@/components/MangaCard';
import apiManager from '@/api';
import searchHistory from '@/utils/searchHistory';
import axios from 'axios';
import { config } from '@/config';
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
  const [userResults, setUserResults] = useState([]); // ✅ Risultati utenti
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  
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
      
      // ✅ Ricerca utenti
      if (mode === 'users') {
        const response = await axios.get(`${config.API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        data = response.data.users || [];
        
        setUserResults(data);
        setResults([]); // Pulisci risultati manga
        setHasMore(false); // Nessuna paginazione per utenti (max 20)
        setPage(1);
        
        if (data.length === 0) {
          toast({ 
            title: 'Nessun utente trovato', 
            status: 'info', 
            duration: 2000,
            isClosable: true
          });
        }
        return;
      }
      
      // Ricerca manga
      if (mode === 'adult') {
        data = await apiManager.searchAdult(searchQuery, limit);
      } else if (mode === 'normal') {
        const r = await apiManager.searchManga(searchQuery, limit);
        data = r.all || r.manga || [];
      } else {
        const r = await apiManager.searchAll(searchQuery, { includeAdult: true, limit });
        data = r.all || [];
      }
      
      setUserResults([]); // Pulisci risultati utenti
      
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

  const loadMore: any = () => {
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

  const onSubmit: any = (e) => {
    e.preventDefault();
    if (query.trim() && query.length >= 3) {
      // Salva nella cronologia
      searchHistory.add(query.trim());
      setHistory(searchHistory.getAll());
      setShowSuggestions(false);
      
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleInputChange: any = (e) => {
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

  const selectSuggestion: any = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  const clearHistory: any = () => {
    searchHistory.clear();
    setHistory([]);
    toast({
      title: 'Cronologia cancellata',
      status: 'info',
      duration: 2000
    });
  };

  const changeSearchMode: any = (mode) => {
    setSearchMode(mode);
    localStorage.setItem('searchMode', mode);
    setPage(1);
    lastSearchRef.current = ''; // Reset
    if (query.trim() && query.length >= 3) {
      performSearch(query, mode, 1, false);
    }
  };

  // Filtra risultati per generi selezionati
  const filteredResults = selectedGenres.length > 0
    ? results.filter(manga => {
        // Se il manga ha generi, controlla se include almeno uno dei generi selezionati
        if (manga.genres && Array.isArray(manga.genres)) {
          return selectedGenres.some(selectedGenre => 
            manga.genres.some(g => 
              g.toLowerCase().includes(selectedGenre.toLowerCase()) ||
              selectedGenre.toLowerCase().includes(g.toLowerCase())
            )
          );
        }
        // Se non ha generi, mostralo comunque
        return true;
      })
    : results;
  
  const normalCount = filteredResults.filter(r => !r.isAdult).length;
  const adultCount = filteredResults.filter(r => r.isAdult).length;

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
            <HStack justify="space-between" w="100%">
              <Text fontSize="sm" color="gray.400">Tipo di contenuti:</Text>
              {searchMode !== 'users' && (
                <Button
                  size="sm"
                  leftIcon={<FaFilter />}
                  rightIcon={showFilters ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  variant="ghost"
                  colorScheme="purple"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Nascondi' : 'Mostra'} Filtri Avanzati
                </Button>
              )}
            </HStack>
            
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
              <Button
                variant={searchMode === 'users' ? 'solid' : 'outline'}
                colorScheme="green"
                onClick={() => changeSearchMode('users')}
                leftIcon={<FaUserFriends />}
              >
                Utenti
              </Button>
            </ButtonGroup>
            
            {/* Filtri Avanzati Collassabili - Solo per manga */}
            <Collapse in={showFilters && searchMode !== 'users'} style={{ width: '100%' }}>
              <VStack
                spacing={4}
                align="stretch"
                p={4}
                bg="gray.800"
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.700"
              >
                <Text fontSize="sm" fontWeight="bold" color="purple.300">
                  Filtra per Generi (seleziona per includere)
                </Text>
                
                <Wrap spacing={2}>
                  {['Azione', 'Avventura', 'Commedia', 'Drammatico', 'Fantasy', 'Horror', 'Mistero', 'Psicologico', 'Romantico', 'Sci-Fi', 'Slice of Life', 'Sportivo', 'Soprannaturale', 'Thriller'].map(genre => (
                    <WrapItem key={genre}>
                      <Button
                        size="sm"
                        variant={selectedGenres.includes(genre) ? 'solid' : 'outline'}
                        colorScheme={selectedGenres.includes(genre) ? 'purple' : 'gray'}
                        onClick={() => {
                          setSelectedGenres(prev => 
                            prev.includes(genre) 
                              ? prev.filter(g => g !== genre)
                              : [...prev, genre]
                          );
                        }}
                      >
                        {selectedGenres.includes(genre) && '✓ '}
                        {genre}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
                
                {selectedGenres.length > 0 && (
                  <HStack>
                    <Text fontSize="xs" color="gray.400">
                      {selectedGenres.length} generi selezionati
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => setSelectedGenres([])}
                    >
                      Cancella
                    </Button>
                  </HStack>
                )}
                
                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                  💡 Suggerimento: Dopo aver selezionato i generi, vai su{' '}
                  <Button
                    size="xs"
                    variant="link"
                    colorScheme="purple"
                    onClick={() => navigate('/categories')}
                  >
                    Esplora Categorie
                  </Button>
                  {' '}per una ricerca avanzata completa
                </Text>
              </VStack>
            </Collapse>
          </VStack>
        </VStack>

        {/* ========== RISULTATI UTENTI ========== */}
        {(userResults.length > 0 || (loading && searchMode === 'users')) && (
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" flexWrap="wrap">
              <Text fontWeight="bold">
                {loading ? 'Ricerca utenti in corso...' : `${userResults.length} ${userResults.length === 1 ? 'utente trovato' : 'utenti trovati'}`}
              </Text>
            </HStack>

            {loading ? (
              <VStack spacing={4}>
                {[...Array(3)].map((_, i) => (
                  <HStack key={i} p={4} bg="gray.800" borderRadius="lg" w="100%">
                    <Skeleton boxSize="50px" borderRadius="full" />
                    <VStack align="start" flex={1} spacing={2}>
                      <Skeleton height="20px" width="150px" />
                      <Skeleton height="15px" width="100px" />
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {userResults.map((user) => (
                  <Box
                    key={user.id}
                    p={4}
                    bg="gray.800"
                    borderRadius="lg"
                    cursor="pointer"
                    _hover={{ bg: 'gray.700', transform: 'translateY(-2px)', boxShadow: 'lg' }}
                    transition="all 0.2s"
                    onClick={() => navigate(`/user/${user.username}`)}
                  >
                    <HStack spacing={4}>
                      <Avatar
                        size="lg"
                        name={user.displayName}
                        src={user.avatarUrl}
                        bg="purple.500"
                      />
                      <VStack align="start" flex={1} spacing={1}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="lg">
                            {user.displayName}
                          </Text>
                          {user.badges && user.badges.length > 0 && (
                            <Badge colorScheme="purple" fontSize="xs">
                              {user.badges[0]}
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="gray.400">
                          @{user.username}
                        </Text>
                        {user.bio && (
                          <Text fontSize="sm" color="gray.300" noOfLines={2}>
                            {user.bio}
                          </Text>
                        )}
                        {user.viewCount > 0 && (
                          <Badge colorScheme="blue" fontSize="xs">
                            {user.viewCount} visualizzazioni
                          </Badge>
                        )}
                      </VStack>
                      <Button
                        size="sm"
                        colorScheme="purple"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/${user.username}`);
                        }}
                      >
                        Visualizza
                      </Button>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        )}

        {/* ========== RISULTATI MANGA ========== */}
        {(results.length > 0 || (loading && searchMode !== 'users')) && (
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" flexWrap="wrap">
              <Text fontWeight="bold">
                {loading ? 'Ricerca in corso...' : `${filteredResults.length} risultati trovati`}
                {selectedGenres.length > 0 && ` (${results.length} totali, filtrati per genere)`}
              </Text>
              {!loading && filteredResults.length > 0 && searchMode === 'all' && (
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
                >
                  {filteredResults.map((item, i) => (
                    <Box
                      key={item.url || `search-${i}`}
                      h="100%"
                    >
                      <MangaCard 
                        manga={item} 
                        
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