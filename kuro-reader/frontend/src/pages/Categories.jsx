import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Tabs, TabList, Tab, TabPanels, TabPanel,
  Badge, Input, InputGroup, InputLeftElement, Select, Skeleton,
  Wrap, WrapItem, IconButton, Spinner, useDisclosure, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Divider, Tag, TagLabel, TagCloseButton, Checkbox
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import apiManager from '../api';
import { FaTags, FaTheaterMasks, FaUsers, FaCalendar, FaFlag, FaFire } from 'react-icons/fa';
import { useInView } from 'react-intersection-observer';

const MotionBox = motion(Box);

function Categories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Stati
  const [categories, setCategories] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingManga, setLoadingManga] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    includeAdult: false,
    sortBy: 'popular',
    year: '',
    status: ''
  });
  const [totalLoaded, setTotalLoaded] = useState(0);

  // Infinite scroll ref
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  useEffect(() => {
    loadCategories();
    
    // Check location state for presets
    if (location.state) {
      if (location.state.preset === 'latest') {
        setFilters(prev => ({ ...prev, sortBy: 'newest' }));
        setTimeout(() => searchWithFilters(), 500);
      } else if (location.state.preset === 'popular') {
        setFilters(prev => ({ ...prev, sortBy: 'most_read' }));
        setTimeout(() => searchWithFilters(), 500);
      } else if (location.state.type) {
        setSelectedType(location.state.type);
        setTimeout(() => searchWithFilters(), 500);
      }
    }
  }, []);

  // Auto-load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !loadingMore && mangaList.length > 0) {
      loadMore();
    }
  }, [inView, hasMore, loadingMore]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const cats = await statsAPI.getAllCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Errore caricamento categorie',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (genreId) => {
    setSelectedGenres(prev => {
      if (prev.includes(genreId)) {
        return prev.filter(g => g !== genreId);
      } else {
        return [...prev, genreId];
      }
    });
  };

  const searchWithFilters = async () => {
    if (selectedGenres.length === 0 && !selectedType && !filters.status && !filters.year && filters.sortBy === 'popular') {
      // Se non ci sono filtri, carica manga popolari
      setLoadingManga(true);
      try {
        const popular = await statsAPI.getMostFavorites(filters.includeAdult);
        setMangaList(popular);
        setHasMore(false);
        setTotalLoaded(popular.length);
      } catch (error) {
        console.error('Error loading popular:', error);
      } finally {
        setLoadingManga(false);
      }
      return;
    }

    setLoadingManga(true);
    setPage(0);
    setMangaList([]);
    
    try {
      // FIX: Per generi multipli, cerca con AND logic
      let results = [];
      
      if (selectedGenres.length > 1) {
        // Ricerca custom per generi multipli
        const baseUrl = filters.includeAdult ? 
          'https://www.mangaworldadult.net/archive' : 
          'https://www.mangaworld.cx/archive';
        
        // Costruisci URL con tutti i generi
        const params = new URLSearchParams();
        selectedGenres.forEach(genre => {
          params.append('genre', genre);
        });
        if (selectedType) params.append('type', selectedType);
        if (filters.status) params.append('status', filters.status);
        if (filters.year) params.append('year', filters.year);
        if (filters.sortBy) params.append('sort', filters.sortBy);
        
        const searchUrl = `${baseUrl}?${params.toString()}`;
        
        // Usa apiManager per fare la richiesta
        const response = await fetch(`https://kuro-proxy-server.onrender.com/api/proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: searchUrl })
        });
        
        const data = await response.json();
        if (data.success) {
          const doc = new DOMParser().parseFromString(data.data, 'text/html');
          const entries = doc.querySelectorAll('.entry');
          
          entries.forEach((entry, i) => {
            if (i >= 50) return;
            
            const link = entry.querySelector('a');
            const img = entry.querySelector('img');
            const title = entry.querySelector('.name, .title')?.textContent?.trim();
            
            if (link && title) {
              results.push({
                url: link.href,
                title,
                cover: img?.src || '',
                source: filters.includeAdult ? 'mangaWorldAdult' : 'mangaWorld',
                isAdult: filters.includeAdult
              });
            }
          });
        }
      } else {
        // Ricerca normale con statsAPI
        const result = await statsAPI.searchAdvanced({
          genres: selectedGenres,
          types: selectedType ? [selectedType] : [],
          status: filters.status,
          year: filters.year,
          sort: filters.sortBy,
          page: 1,
          includeAdult: filters.includeAdult
        });
        results = result.results;
        setHasMore(result.hasMore);
      }
      
      setMangaList(results);
      setTotalLoaded(results.length);
      setPage(1);
      
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: 'Errore ricerca',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingManga(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const result = await statsAPI.searchAdvanced({
        genres: selectedGenres,
        types: selectedType ? [selectedType] : [],
        status: filters.status,
        year: filters.year,
        sort: filters.sortBy,
        page: page + 1,
        includeAdult: filters.includeAdult
      });
      
      setMangaList(prev => [...prev, ...result.results]);
      setHasMore(result.hasMore);
      setTotalLoaded(prev => prev + result.results.length);
      setPage(prev => prev + 1);
      
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedType(null);
    setFilters({
      includeAdult: false,
      sortBy: 'popular',
      year: '',
      status: ''
    });
    setMangaList([]);
    setPage(0);
    setHasMore(true);
  };

  const GenreButton = ({ id, name, isSelected, onToggle, color = 'purple' }) => (
    <Button
      size="sm"
      variant={isSelected ? 'solid' : 'outline'}
      colorScheme={color}
      onClick={() => onToggle(id)}
      leftIcon={isSelected ? <Text>✓</Text> : null}
    >
      {name}
    </Button>
  );

  // Filtra manga basandosi sulla ricerca
  const filteredManga = mangaList.filter(manga => 
    !searchQuery || manga.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <VStack align="stretch" spacing={4}>
          <Heading size="xl">Esplora Categorie</Heading>
          
          {/* Filtri attivi */}
          {selectedGenres.length > 0 && (
            <Wrap>
              {selectedGenres.map((genreId) => {
                const genreName = statsAPI.getGenreName(genreId);
                return (
                  <WrapItem key={genreId}>
                    <Tag size="lg" colorScheme="purple">
                      <TagLabel>{genreName}</TagLabel>
                      <TagCloseButton onClick={() => toggleGenre(genreId)} />
                    </Tag>
                  </WrapItem>
                );
              })}
            </Wrap>
          )}
          
          {/* Controlli */}
          <HStack flexWrap="wrap" spacing={4}>
            <InputGroup maxW="300px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Filtra risultati..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="gray.800"
              />
            </InputGroup>
            
            <Select
              maxW="150px"
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
              bg="gray.800"
            >
              <option value="a-z">A-Z</option>
              <option value="z-a">Z-A</option>
              <option value="most_read">Più letti</option>
              <option value="newest">Più recenti</option>
              <option value="score">Valutazione</option>
            </Select>
            
            <Select
              maxW="150px"
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: e.target.value})}
              bg="gray.800"
              placeholder="Anno"
            >
              {categories?.years?.map(year => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </Select>
            
            <Button
              colorScheme="purple"
              onClick={searchWithFilters}
              isLoading={loadingManga}
            >
              Cerca
            </Button>
            
            <Button
              variant="outline"
              onClick={clearFilters}
            >
              Pulisci filtri
            </Button>
            
            <Checkbox
              isChecked={filters.includeAdult}
              onChange={(e) => setFilters({...filters, includeAdult: e.target.checked})}
              colorScheme="pink"
            >
              🔞 Adult
            </Checkbox>
          </HStack>
        </VStack>

        {/* Tabs per le categorie */}
        {loading ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height="200px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : (
          <Tabs colorScheme="purple" variant="enclosed">
            <TabList flexWrap="wrap">
              <Tab><FaTags /> Generi</Tab>
              <Tab><FaTheaterMasks /> Tipi</Tab>
              <Tab><FaUsers /> Demographics</Tab>
              <Tab><FaFlag /> Stati</Tab>
              {filters.includeAdult && <Tab>🔞 Temi Adult</Tab>}
            </TabList>

            <TabPanels>
              {/* Generi */}
              <TabPanel>
                <Wrap spacing={2}>
                  {categories?.genres?.map(genre => (
                    <WrapItem key={genre.id}>
                      <GenreButton
                        id={genre.id}
                        name={genre.name}
                        isSelected={selectedGenres.includes(genre.id)}
                        onToggle={toggleGenre}
                        color="blue"
                      />
                    </WrapItem>
                  ))}
                </Wrap>
              </TabPanel>

              {/* Tipi */}
              <TabPanel>
                <Wrap spacing={2}>
                  {categories?.types?.map(type => (
                    <WrapItem key={type.id}>
                      <Button
                        size="sm"
                        variant={selectedType === type.id ? 'solid' : 'outline'}
                        colorScheme="green"
                        onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
                      >
                        {type.name}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </TabPanel>

              {/* Demographics */}
              <TabPanel>
                <Wrap spacing={2}>
                  {categories?.demographics?.map(demo => (
                    <WrapItem key={demo.id}>
                      <GenreButton
                        id={demo.id}
                        name={demo.name}
                        isSelected={selectedGenres.includes(demo.id)}
                        onToggle={toggleGenre}
                        color="purple"
                      />
                    </WrapItem>
                  ))}
                </Wrap>
              </TabPanel>

              {/* Stati */}
              <TabPanel>
                <Wrap spacing={2}>
                  {categories?.status?.map(status => (
                    <WrapItem key={status.id}>
                      <Button
                        size="sm"
                        variant={filters.status === status.id ? 'solid' : 'outline'}
                        colorScheme="gray"
                        onClick={() => setFilters({...filters, status: filters.status === status.id ? '' : status.id})}
                      >
                        {status.name}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </TabPanel>

              {/* Adult Themes */}
              {filters.includeAdult && (
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <Wrap spacing={2}>
                      {categories?.themes?.map(theme => (
                        <WrapItem key={theme.id}>
                          <GenreButton
                            id={theme.id}
                            name={theme.name}
                            isSelected={selectedGenres.includes(theme.id)}
                            onToggle={toggleGenre}
                            color="pink"
                          />
                        </WrapItem>
                      ))}
                    </Wrap>
                    
                    {categories?.explicit_genres && (
                      <>
                        <Divider />
                        <Text fontWeight="bold">Generi Espliciti:</Text>
                        <Wrap spacing={2}>
                          {categories.explicit_genres.map(genre => (
                            <WrapItem key={genre.id}>
                              <GenreButton
                                id={genre.id}
                                name={genre.name}
                                isSelected={selectedGenres.includes(genre.id)}
                                onToggle={toggleGenre}
                                color="red"
                              />
                            </WrapItem>
                          ))}
                        </Wrap>
                      </>
                    )}
                  </VStack>
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        )}

        <Divider />

        {/* Risultati */}
        {mangaList.length > 0 && (
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Text fontWeight="bold">
                {totalLoaded} manga trovati
                {hasMore && ' (altri disponibili)'}
              </Text>
              
              {hasMore && (
                <Button
                  onClick={loadMore}
                  isLoading={loadingMore}
                  colorScheme="purple"
                  variant="outline"
                >
                  Carica altri
                </Button>
              )}
            </HStack>

            {/* Griglia manga */}
            {loadingManga && mangaList.length === 0 ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {[...Array(20)].map((_, i) => (
                  <Skeleton key={i} height="280px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            ) : (
              <>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {filteredManga.map((manga, i) => (
                    <MotionBox
                      key={`${manga.url}-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    >
                      <Box position="relative">
                        <MangaCard manga={manga} hideSource />
                        {manga.isAdult && (
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

                {/* Infinite scroll trigger */}
                {hasMore && (
                  <Box ref={loadMoreRef} textAlign="center" py={4}>
                    {loadingMore && (
                      <HStack justify="center">
                        <Spinner color="purple.500" />
                        <Text>Caricamento...</Text>
                      </HStack>
                    )}
                  </Box>
                )}
              </>
            )}
          </VStack>
        )}
      </VStack>
    </Container>
  );
}

export default Categories;
