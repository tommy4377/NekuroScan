import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Tabs, TabList, TabPanels, Tab, TabPanel,
  Badge, Input, InputGroup, InputLeftElement, Select, Skeleton,
  Wrap, WrapItem, IconButton, Spinner, Divider, Tag, TagLabel, TagCloseButton, Checkbox
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useInView } from 'react-intersection-observer';

const MotionBox = motion(Box);

function Categories() {
  const location = useLocation();
  const toast = useToast();

  // State
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
    status: ''
  });
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [pageTitle, setPageTitle] = useState('Esplora Categorie');
  const [currentPreset, setCurrentPreset] = useState(null);

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
    
    // Reset state quando cambia preset
    setSelectedGenres([]);
    setSelectedType(null);
    setMangaList([]);
    setPage(1);
    setHasMore(true);
    setCurrentPreset(location.state.preset || location.state.type);

    if (location.state.preset === 'latest') {
      setPageTitle('Ultimi Aggiornamenti');
      setFilters(prev => ({ ...prev, sortBy: 'newest' }));
      loadPresetData('latest', 1);
    } else if (location.state.preset === 'popular') {
      setPageTitle('Manga Popolari');
      setFilters(prev => ({ ...prev, sortBy: 'most_read' }));
      loadPresetData('popular', 1);
    } else if (location.state.type) {
      const typeName = location.state.type.charAt(0).toUpperCase() + location.state.type.slice(1);
      setPageTitle(`Top ${typeName}`);
      setSelectedType(location.state.type);
      loadPresetData(location.state.type, 1);
    }
  }, [location.state, filters.includeAdult]);

  useEffect(() => {
    if (inView && hasMore && !loadingMore && mangaList.length > 0) {
      loadMoreData();
    }
  }, [inView, hasMore, loadingMore, mangaList.length]);

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

  const loadPresetData = async (preset, pageNum) => {
    if (pageNum === 1) {
      setLoadingManga(true);
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
        // È un tipo (manga, manhwa, manhua, oneshot)
        result = await statsAPI.getTopByType(preset, filters.includeAdult, pageNum);
      }
      
      if (result) {
        if (pageNum === 1) {
          setMangaList(result.results);
          setTotalLoaded(result.results.length);
        } else {
          setMangaList(prev => [...prev, ...result.results]);
          setTotalLoaded(prev => prev + result.results.length);
        }
        setHasMore(result.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading preset data:', error);
      toast({ title: 'Errore caricamento', status: 'error' });
    } finally {
      setLoadingManga(false);
      setLoadingMore(false);
    }
  };

  const loadMoreData = async () => {
    if (loadingMore || !hasMore) return;
    
    const nextPage = page + 1;
    
    if (currentPreset) {
      // Carica più dati per preset
      loadPresetData(currentPreset, nextPage);
    } else if (selectedGenres.length > 0 || selectedType) {
      // Carica più dati per ricerca
      loadMoreSearch(nextPage);
    }
  };

  const loadMoreSearch = async (pageNum) => {
    setLoadingMore(true);
    try {
      const { results, hasMore: more } = await runSearch({ page: pageNum });
      setMangaList(prev => [...prev, ...results]);
      setHasMore(more);
      setTotalLoaded(prev => prev + results.length);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleGenre = (genreId) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(g => g !== genreId) 
        : [...prev, genreId]
    );
    setCurrentPreset(null); // Reset preset quando si seleziona un genere
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

    // AND tra più generi
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
    
    try {
      const { results, hasMore } = await runSearch({ page: 1 });
      setMangaList(results);
      setHasMore(hasMore);
      setTotalLoaded(results.length);
    } catch (error) {
      console.error('Error searching:', error);
      toast({ title: 'Errore ricerca', status: 'error', duration: 3000 });
    } finally {
      setLoadingManga(false);
    }
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setSelectedType(null);
    setFilters({ 
      includeAdult: false, 
      sortBy: 'most_read', 
      year: '', 
      status: '' 
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

  const filteredManga = mangaList.filter(manga =>
    !searchQuery || manga.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <VStack align="stretch" spacing={4}>
          <Heading size="xl">{pageTitle}</Heading>

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
                {totalLoaded} manga trovati {hasMore && ' (altri disponibili)'}
              </Text>
              {hasMore && !loadingMore && (
                <Button 
                  onClick={loadMoreData} 
                  colorScheme="purple" 
                  variant="outline"
                >
                  Carica altri
                </Button>
              )}
            </HStack>

            {loadingManga && mangaList.length === 0 ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {[...Array(20)].map((_, i) => (
                  <Skeleton key={i} height="280px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            ) : filteredManga.length > 0 ? (
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
                        <MangaCard manga={manga} hideSource showLatest={false} />
                        {manga.isAdult && (
                          <Badge position="absolute" top={2} right={2} colorScheme="pink" fontSize="xs">18+</Badge>
                        )}
                      </Box>
                    </MotionBox>
                  ))}
                </SimpleGrid>

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
