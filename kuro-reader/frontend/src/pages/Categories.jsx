import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Tabs, TabList, TabPanels, Tab, TabPanel,
  Badge, Input, InputGroup, InputLeftElement, Select, Skeleton,
  Wrap, WrapItem, IconButton, Spinner, useDisclosure, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Divider, Tag, TagLabel, TagCloseButton, Checkbox,
  FormControl, FormLabel
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { useInView } from 'react-intersection-observer';
import { FaChevronDown, FaChevronUp, FaFilter } from 'react-icons/fa';

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
  const [selectedType, setSelectedType] = useState('');
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [activeTab, setActiveTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1, rootMargin: '200px' });

  useEffect(() => {
    loadCategories();
    handlePresets();
  }, [location.state]);

  useEffect(() => {
    if (inView && hasMore && !loadingMore && mangaList.length > 0) {
      loadMore();
    }
  }, [inView]);

  const handlePresets = () => {
    const state = location.state;
    if (!state) return;

    setSelectedGenres([]);
    setSelectedType('');
    setMangaList([]);
    
    if (state.preset === 'latest') {
      setFilters(prev => ({ ...prev, sortBy: 'newest' }));
    } else if (state.preset === 'popular') {
      setFilters(prev => ({ ...prev, sortBy: 'most_read' }));
    }
  };

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
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(g => g !== genreId) 
        : [...prev, genreId]
    );
  };

  // AND multiplo tra generi
  const runSearch = async ({ page = 1 }) => {
    if (selectedGenres.length <= 1) {
      // Caso normale: 0 o 1 genere
      return statsAPI.searchAdvanced({
        genres: selectedGenres,
        types: selectedType ? [selectedType] : [],
        status: filters.status,
        year: filters.year,
        sort: filters.sortBy || 'most_read',
        page,
        includeAdult: filters.includeAdult
      });
    } else {
      // AND multiplo: intersect client-side
      const perGenre = await Promise.all(
        selectedGenres.map(g => 
          statsAPI.searchAdvanced({
            genres: [g],
            types: selectedType ? [selectedType] : [],
            status: filters.status,
            year: filters.year,
            sort: filters.sortBy || 'most_read',
            page,
            includeAdult: filters.includeAdult
          })
        )
      );
      
      // Intersect per URL
      const lists = perGenre.map(x => x.results);
      const urlCount = new Map();
      lists.flat().forEach(item => urlCount.set(item.url, (urlCount.get(item.url) || 0) + 1));
      const intersected = lists.flat().filter(item => urlCount.get(item.url) === selectedGenres.length);
      
      return { 
        results: intersected, 
        hasMore: perGenre.every(x => x.hasMore), 
        page 
      };
    }
  };

  const searchWithFilters = async () => {
    setLoading(true);
    setPage(1);
    setMangaList([]);
    setHasMore(true);
    
    try {
      const { results, hasMore } = await runSearch({ page: 1 });
      setMangaList(results);
      setHasMore(hasMore);
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: 'Errore ricerca',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { results, hasMore: more } = await runSearch({ page: nextPage });
      setMangaList(prev => [...prev, ...results]);
      setHasMore(more);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedType('');
    setFilters({
      includeAdult: false,
      sortBy: 'most_read',
      year: '',
      status: ''
    });
    setMangaList([]);
    setPage(1);
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

  const filteredManga = mangaList.filter(manga => 
    !searchQuery || manga.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <VStack align="stretch" spacing={4}>
          <Heading size="xl">Esplora Categorie</Heading>

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

            <Button
              leftIcon={showFilters ? <FaChevronUp /> : <FaFilter />}
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
            >
              Filtri avanzati
            </Button>

            <Button
              colorScheme="purple"
              onClick={searchWithFilters}
              isLoading={loading}
              isDisabled={selectedGenres.length === 0 && !selectedType && !filters.status && !filters.year}
            >
              Cerca
            </Button>

            <Button
              variant="outline"
              onClick={clearFilters}
              size="sm"
            >
              Pulisci
            </Button>

            <Checkbox
              isChecked={filters.includeAdult}
              onChange={(e) => setFilters({...filters, includeAdult: e.target.checked})}
              colorScheme="pink"
            >
              🔞 Adult
            </Checkbox>
          </HStack>

          {showFilters && (
            <Box bg="gray.800" p={4} borderRadius="lg">
              <VStack spacing={4} align="stretch">
                <HStack spacing={4} wrap="wrap">
                  <FormControl maxW="150px">
                    <FormLabel fontSize="sm">Ordina per</FormLabel>
                    <Select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                      bg="gray.700"
                      size="sm"
                    >
                      <option value="most_read">Più letti</option>
                      <option value="newest">Più recenti</option>
                      <option value="score">Valutazione</option>
                      <option value="a-z">A-Z</option>
                      <option value="z-a">Z-A</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW="120px">
                    <FormLabel fontSize="sm">Anno</FormLabel>
                    <Select
                      value={filters.year}
                      onChange={(e) => setFilters({...filters, year: e.target.value})}
                      bg="gray.700"
                      size="sm"
                      placeholder="Qualsiasi"
                    >
                      {categories?.years?.map(year => (
                        <option key={year.id} value={year.id}>{year.name}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl maxW="150px">
                    <FormLabel fontSize="sm">Stato</FormLabel>
                    <Select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      bg="gray.700"
                      size="sm"
                      placeholder="Qualsiasi"
                    >
                      {categories?.status?.map(status => (
                        <option key={status.id} value={status.id}>{status.name}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl maxW="150px">
                    <FormLabel fontSize="sm">Tipo</FormLabel>
                    <Select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      bg="gray.700"
                      size="sm"
                      placeholder="Qualsiasi"
                    >
                      {categories?.types?.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>
              </VStack>
            </Box>
          )}
        </VStack>

        {!location.state && (
          loading ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} height="200px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <Tabs colorScheme="purple" variant="enclosed" onChange={(index) => setActiveTab(index)}>
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
                          onClick={() => setSelectedType(selectedType === type.id ? '' : type.id)}
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

        {(mangaList.length > 0 || loading) && (
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Text fontWeight="bold">
                {mangaList.length} manga trovati {hasMore && ' (altri disponibili)'}
              </Text>
              {hasMore && (
                <Button onClick={loadMore} isLoading={loadingMore} colorScheme="purple" variant="outline" size="sm">
                  Carica altri
                </Button>
              )}
            </HStack>

            {loading && mangaList.length === 0 ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                {[...Array(20)].map((_, i) => (
                  <Skeleton key={i} height="280px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            ) : filteredManga.length > 0 ? (
              <>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {filteredManga.map((item, i) => (
                    <MotionBox
                      key={`${item.url}-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    >
                      <Box position="relative">
                        <MangaCard manga={item} hideSource showLatest={false} />
                        {item.isAdult && (
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
