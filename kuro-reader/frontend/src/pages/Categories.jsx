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
  const [pageTitle, setPageTitle] = useState('Esplora Categorie');

  // Infinite scroll ref
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  useEffect(() => {
    loadCategories();
    handlePresets();
  }, [location.state]);

  // Gestisce i preset dalla navigazione
  const handlePresets = () => {
    const state = location.state;
    if (!state) return;

    // Reset stati
    setSelectedGenres([]);
    setSelectedType(null);
    setMangaList([]);
    
    if (state.preset === 'latest') {
      setPageTitle('Ultimi Aggiornamenti');
      setFilters(prev => ({ ...prev, sortBy: 'newest' }));
      loadLatestUpdates();
    } else if (state.preset === 'popular') {
      setPageTitle('Manga Popolari');
      setFilters(prev => ({ ...prev, sortBy: 'most_read' }));
      loadPopularManga();
    } else if (state.type) {
      const typeName = state.type.charAt(0).toUpperCase() + state.type.slice(1);
      setPageTitle(`Top ${typeName}`);
      setSelectedType(state.type);
      loadByType(state.type);
    }
  };

  // Carica ultimi aggiornamenti
  const loadLatestUpdates = async () => {
    setLoadingManga(true);
    try {
      const updates = await statsAPI.getLatestUpdates(filters.includeAdult);
      setMangaList(updates);
      setHasMore(false);
      setTotalLoaded(updates.length);
    } catch (error) {
      console.error('Error loading latest:', error);
      toast({
        title: 'Errore caricamento',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingManga(false);
    }
  };

  // Carica manga popolari
  const loadPopularManga = async () => {
    setLoadingManga(true);
    try {
      const popular = await statsAPI.getMostFavorites(filters.includeAdult);
      setMangaList(popular);
      setHasMore(false);
      setTotalLoaded(popular.length);
    } catch (error) {
      console.error('Error loading popular:', error);
      toast({
        title: 'Errore caricamento',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingManga(false);
    }
  };

  // Carica per tipo
  const loadByType = async (type) => {
    setLoadingManga(true);
    try {
      const results = await statsAPI.getTopByType(type);
      setMangaList(results);
      setHasMore(false);
      setTotalLoaded(results.length);
    } catch (error) {
      console.error('Error loading by type:', error);
      toast({
        title: 'Errore caricamento',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingManga(false);
    }
  };

  // Auto-load more quando scrolling
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
    setLoadingManga(true);
    setPage(0);
    setMangaList([]);
    setPageTitle('Risultati Ricerca');
    
    try {
      // FIX: Ricerca con generi multipli usando AND logic
      if (selectedGenres.length > 0) {
        // Per generi multipli, dobbiamo fare richieste separate e filtrare
        const allResults = [];
        
        // Prima ottieni manga con il primo genere
        const firstGenreUrl = `https://www.mangaworld.cx/archive?genre=${selectedGenres[0]}&sort=${filters.sortBy}`;
        
        const response = await fetch(`https://kuro-proxy-server.onrender.com/api/proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: firstGenreUrl })
        });
        
        const data = await response.json();
        if (data.success) {
          const doc = new DOMParser().parseFromString(data.data, 'text/html');
          const entries = doc.querySelectorAll('.entry');
          
          // Per ogni manga trovato, verifica se ha TUTTI i generi richiesti
          for (const entry of entries) {
            const link = entry.querySelector('a');
            if (!link) continue;
            
            const mangaUrl = link.href.startsWith('http') ? link.href : `https://www.mangaworld.cx${link.href}`;
            
            // Carica i dettagli per verificare i generi
            if (selectedGenres.length > 1) {
              try {
                const detailResponse = await fetch(`https://kuro-proxy-server.onrender.com/api/proxy`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: mangaUrl })
                });
                
                const detailData = await detailResponse.json();
                if (detailData.success) {
                  const detailDoc = new DOMParser().parseFromString(detailData.data, 'text/html');
                  const genreLinks = detailDoc.querySelectorAll('a[href*="/archive?genre"]');
                  
                  const mangaGenres = [];
                  genreLinks.forEach(g => {
                    const genreText = g.textContent.trim().toLowerCase();
                    mangaGenres.push(genreText);
                  });
                  
                  // Verifica che abbia TUTTI i generi selezionati
                  const hasAllGenres = selectedGenres.every(genreId => {
                    const genreName = statsAPI.getGenreName(genreId).toLowerCase();
                    return mangaGenres.some(mg => mg.includes(genreName));
                  });
                  
                  if (hasAllGenres) {
                    const img = entry.querySelector('img');
                    const title = entry.querySelector('.name, .title')?.textContent?.trim();
                    
                    allResults.push({
                      url: mangaUrl,
                      title: title || 'Unknown',
                      cover: img?.src || '',
                      source: 'mangaWorld',
                      isAdult: false
                    });
                  }
                }
              } catch (err) {
                console.error('Error checking manga genres:', err);
              }
            } else {
              // Solo un genere, aggiungi direttamente
              const img = entry.querySelector('img');
              const title = entry.querySelector('.name, .title')?.textContent?.trim();
              
              allResults.push({
                url: mangaUrl,
                title: title || 'Unknown',
                cover: img?.src || '',
                source: 'mangaWorld',
                isAdult: false
              });
            }
            
            // Limita a 50 risultati per evitare troppe richieste
            if (allResults.length >= 50) break;
          }
        }
        
        setMangaList(allResults);
        setTotalLoaded(allResults.length);
        setHasMore(false);
        
      } else {
        // Ricerca normale senza generi multipli
        const result = await statsAPI.searchAdvanced({
          types: selectedType ? [selectedType] : [],
          status: filters.status,
          year: filters.year,
          sort: filters.sortBy,
          page: 1,
          includeAdult: filters.includeAdult
        });
        
        setMangaList(result.results);
        setHasMore(result.hasMore);
        setTotalLoaded(result.results.length);
        setPage(1);
      }
      
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
    setPageTitle('Esplora Categorie');
    
    // Clear location state
    navigate(location.pathname, { replace: true });
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
          <Heading size="xl">{pageTitle}</Heading>
          
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

        {/* Tabs per le categorie - mostra solo se non c'è un preset */}
        {!location.state && (
          loading ? (
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
          )
        )}

        {location.state && (
          <Divider />
        )}

        {/* Risultati */}
        {(mangaList.length > 0 || loadingManga) && (
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
