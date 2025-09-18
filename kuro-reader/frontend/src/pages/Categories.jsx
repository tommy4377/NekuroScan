import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Tabs, TabList, Tab, TabPanels, TabPanel,
  Badge, Input, InputGroup, InputLeftElement, Select, Skeleton,
  Wrap, WrapItem, IconButton, Spinner, useDisclosure, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Divider, Tag, TagLabel, TagCloseButton, Checkbox
} from '@chakra-ui/react';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';
import { FaTags, FaTheaterMasks, FaUsers, FaCalendar, FaFlag, FaFire } from 'react-icons/fa';

const MotionBox = motion(Box);

function Categories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Stati
  const [categories, setCategories] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingManga, setLoadingManga] = useState(false);
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

  useEffect(() => {
    loadCategories();
  }, []);

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
    if (selectedGenres.length === 0 && !selectedType && !filters.status && !filters.year) {
      toast({
        title: 'Seleziona almeno un filtro',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setLoadingManga(true);
    setPage(0);
    setMangaList([]);
    
    try {
      const result = await statsAPI.searchAdvanced({
        genres: selectedGenres,
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
    if (loadingManga || !hasMore) return;
    
    setLoadingManga(true);
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
      setLoadingManga(false);
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
                  isLoading={loadingManga}
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
