// frontend/src/pages/Categories.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Tabs, TabList, TabPanels, Tab, TabPanel,
  Badge, Input, InputGroup, InputLeftElement, Select, Skeleton,
  Wrap, WrapItem, Spinner, Divider, Tag, TagLabel, TagCloseButton, Checkbox, Center
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useLocation } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import StickyHeader from '../components/StickyHeader';

// const Box = motion(Box); // Rimosso per evitare errori React #300

function Categories() {
  const location = useLocation();
  const toast = useToast();

  const [categories, setCategories] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingManga, setLoadingManga] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    includeAdult: false,
    sortBy: 'most_read',
    year: '',
    status: '',
    minChapters: ''
  });
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [pageTitle, setPageTitle] = useState('Esplora Categorie');
  const [currentPreset, setCurrentPreset] = useState(null);
  
  const loadingRef = useRef(false);
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!location.state) {
      setCurrentPreset(null);
      return;
    }
    
    setSelectedGenres([]);
    setSelectedType(null);
    setMangaList([]);
    setPage(1);
    setHasMore(true);
    setCurrentPreset(location.state.preset || location.state.type);

    if (location.state.preset === 'latest') {
      setPageTitle('Ultimi Aggiornamenti');
      setFilters(prev => ({ ...prev, sortBy: 'newest' }));
      loadPresetData('latest', 1, true);
    } else if (location.state.preset === 'popular') {
      setPageTitle('Manga Popolari');
      setFilters(prev => ({ ...prev, sortBy: 'most_read' }));
      loadPresetData('popular', 1, true);
    } else if (location.state.type) {
      const typeName = location.state.type.charAt(0).toUpperCase() + location.state.type.slice(1);
      setPageTitle(`Top ${typeName}`);
      setSelectedType(location.state.type);
      loadPresetData(location.state.type, 1, true);
    }
  }, [location.state, filters.includeAdult]);

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasMore && !loadingRef.current && mangaList.length > 0) {
      loadMoreData();
    }
  }, [inView, hasMore, mangaList.length]);

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const cats = await statsAPI.getAllCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({ title: 'Errore caricamento categorie', status: 'error', duration: 3000 });
    } finally {
      setLoadingCats(false);
    }
  };

  const loadPresetData = async (preset, pageNum, reset = false) => {
    if (loadingRef.current && !reset) return;
    loadingRef.current = true;
    
    if (reset) {
      setLoadingManga(true);
      setMangaList([]);
      setPage(1);
      setTotalLoaded(0);
    } else {
      setLoadingMore(true);
    }
    
    try {
      let result = null;
      
      if (preset === 'latest') {
        result = await statsAPI.getLatestUpdates(filters.includeAdult, pageNum);
      } else if (preset === 'popular') {
        result = await statsAPI.getMostFavorites(filters.includeAdult, pageNum);
      } else {
        result = await statsAPI.getTopByType(preset, filters.includeAdult, pageNum);
      }
      
      if (result && result.results) {
        const deduped = Array.from(new Map(result.results.map(item => [item.url, item])).values());
        if (reset) {
          setMangaList(deduped);
          setTotalLoaded(deduped.length);
        } else {
          setMangaList(prev => {
            const existingUrls = new Set(prev.map(m => m.url));
            const newItems = deduped.filter(m => !existingUrls.has(m.url));
            return [...prev, ...newItems];
          });
          setTotalLoaded(prev => prev + deduped.length);
        }
        setHasMore(result.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading preset data:', error);
      toast({ title: 'Errore caricamento', status: 'error' });
      setHasMore(false);
    } finally {
      setLoadingManga(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  };

  const loadMoreData = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    const nextPage = page + 1;
    
    if (currentPreset) {
      await loadPresetData(currentPreset, nextPage);
    } else if (selectedGenres.length > 0 || selectedType) {
      await loadMoreSearch(nextPage);
    }
  }, [page, hasMore, currentPreset, selectedGenres, selectedType, filters]);

  const loadMoreSearch = async (pageNum) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    
    try {
      const { results, hasMore: more } = await runSearch({ page: pageNum });
      setMangaList(prev => {
        const existingUrls = new Set(prev.map(m => m.url));
        const newItems = results.filter(m => !existingUrls.has(m.url));
        return [...prev, ...newItems];
      });
      setHasMore(more);
      setTotalLoaded(prev => prev + results.length);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading more:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  };

  const toggleGenre = (genreId) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(g => g !== genreId) 
        : [...prev, genreId]
    );
    setCurrentPreset(null);
  };

  const runSearch = async ({ page = 1 }) => {
    if (selectedGenres.length <= 1) {
      return statsAPI.searchAdvanced({
        genres: selectedGenres,
        types: selectedType ? [selectedType] : [],
        status: filters.status,
        year: filters.year,
        sort: filters.sortBy || 'most_read',
        page,
        includeAdult: filters.includeAdult
      });
    }

    const perGenre = await Promise.all(
      selectedGenres.map(g => statsAPI.searchAdvanced({
        genres: [g],
        types: selectedType ? [selectedType] : [],
        status: filters.status,
        year: filters.year,
        sort: filters.sortBy || 'most_read',
        page,
        includeAdult: filters.includeAdult
      }))
    );
    
    const lists = perGenre.map(x => x.results);
    const countByUrl = new Map();
    lists.flat().forEach(item => countByUrl.set(item.url, (countByUrl.get(item.url) || 0) + 1));
    const intersect = lists.flat().filter(item => countByUrl.get(item.url) === selectedGenres.length);
    const hasMore = perGenre.every(x => x.hasMore);
    
    return { results: intersect, hasMore, page };
  };

  const searchWithFilters = async () => {
    setLoadingManga(true);
    setPage(1);
    setMangaList([]);
    setPageTitle('Risultati Ricerca');
    setCurrentPreset(null);
    loadingRef.current = true;
    
    try {
      const { results, hasMore } = await runSearch({ page: 1 });
      const deduped = Array.from(new Map(results.map(item => [item.url, item])).values());
      setMangaList(deduped);
      setHasMore(hasMore);
      setTotalLoaded(deduped.length);
    } catch (error) {
      console.error('Error searching:', error);
      toast({ title: 'Errore ricerca', status: 'error', duration: 3000 });
    } finally {
      setLoadingManga(false);
      loadingRef.current = false;
    }
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setSelectedType(null);
    setFilters({ 
      includeAdult: false, 
      sortBy: 'most_read', 
      year: '', 
      status: '',
      minChapters: ''
    });
    setMangaList([]);
    setPage(1);
    setHasMore(true);
    setPageTitle('Esplora Categorie');
    setCurrentPreset(null);
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

  const filteredManga = mangaList.filter(manga => {
    // Filtro testo
    if (searchQuery && !manga.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filtro capitoli minimi
    if (filters.minChapters) {
      const minChaps = parseInt(filters.minChapters);
      const mangaChaps = manga.chapters?.length || manga.chaptersCount || 0;
      if (mangaChaps < minChaps) return false;
    }
    
    return true;
  });

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <StickyHeader title={pageTitle} badge={totalLoaded > 0 ? `${totalLoaded} risultati` : null}>
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        </StickyHeader>
        
        <VStack align="stretch" spacing={4}>

          {selectedGenres.length > 0 && (
            <Wrap>
              {selectedGenres.map((genreId) => (
                <WrapItem key={genreId}>
                  <Tag size="lg" colorScheme="purple">
                    <TagLabel>{genreId.replace(/-/g, ' ')}</TagLabel>
                    <TagCloseButton onClick={() => toggleGenre(genreId)} />
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
          )}

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
              maxW="170px"
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
              bg="gray.800"
            >
              <option value="most_read">Più letti</option>
              <option value="newest">Più recenti</option>
              <option value="score">Valutazione</option>
              <option value="a-z">A-Z</option>
              <option value="z-a">Z-A</option>
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

            <Select
              maxW="170px"
              value={filters.minChapters || ''}
              onChange={(e) => setFilters({...filters, minChapters: e.target.value})}
              bg="gray.800"
              placeholder="Capitoli min"
            >
              <option value="">Tutti</option>
              <option value="10">10+ capitoli</option>
              <option value="50">50+ capitoli</option>
              <option value="100">100+ capitoli</option>
              <option value="200">200+ capitoli</option>
            </Select>

            <Button 
              colorScheme="purple" 
              onClick={searchWithFilters} 
              isLoading={loadingManga}
              isDisabled={selectedGenres.length === 0 && !selectedType}
            >
              Cerca
            </Button>

            <Button variant="outline" onClick={resetFilters}>
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

        {!location.state && (
          loadingCats ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} height="200px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <Tabs colorScheme="purple" variant="enclosed">
              <TabList flexWrap="wrap">
                <Tab>Generi</Tab>
                <Tab>Tipi</Tab>
                <Tab>Demographics</Tab>
                <Tab>Stati</Tab>
              </TabList>

              <TabPanels>
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

                <TabPanel>
                  <Wrap spacing={2}>
                    {categories?.types?.map(type => (
                      <WrapItem key={type.id}>
                        <Button
                          size="sm"
                          variant={selectedType === type.id ? 'solid' : 'outline'}
                          colorScheme="green"
                          onClick={() => {
                            setSelectedType(selectedType === type.id ? null : type.id);
                            setCurrentPreset(null);
                          }}
                        >
                          {type.name}
                        </Button>
                      </WrapItem>
                    ))}
                  </Wrap>
                </TabPanel>

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
              </TabPanels>
            </Tabs>
          )
        )}

        {location.state && (<Divider />)}

        {(mangaList.length > 0 || loadingManga) && (
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Text fontWeight="bold">
                {totalLoaded} manga trovati
              </Text>
            </HStack>

            {loadingManga && mangaList.length === 0 ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {[...Array(20)].map((_, i) => (
                  <Skeleton key={i} height="280px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            ) : filteredManga.length > 0 ? (
              <>
                <SimpleGrid 
                  columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} 
                  spacing={4}
                  w="100%"
                >
                  {filteredManga.map((manga, i) => (
                    <Box
                      key={manga.url || `manga-${i}`}
                      h="100%"
                    >
                      <MangaCard 
                        manga={manga} 
                        hideSource 
                        priority={i < 12}
                      />
                    </Box>
                  ))}
                </SimpleGrid>

                {hasMore && (
                  <Center py={6} ref={loadMoreRef}>
                    {loadingMore && (
                      <VStack spacing={2}>
                        <Spinner size="lg" color="purple.500" thickness="3px" />
                        <Text fontSize="sm" color="gray.400">Caricamento...</Text>
                      </VStack>
                    )}
                  </Center>
                )}
                
                {!hasMore && mangaList.length > 20 && (
                  <Center py={4}>
                    <Text color="gray.500">Hai raggiunto la fine</Text>
                  </Center>
                )}
              </>
            ) : (
              <Box textAlign="center" py={12}>
                <Text color="gray.500">
                  {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun manga trovato'}
                </Text>
              </Box>
            )}
          </VStack>
        )}
      </VStack>
    </Container>
  );
}

export default Categories;