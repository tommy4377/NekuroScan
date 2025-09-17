import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Tabs, TabList, Tab, TabPanels, TabPanel,
  Badge, Input, InputGroup, InputLeftElement, Select, Skeleton,
  Wrap, WrapItem, IconButton, Spinner, useDisclosure, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Divider, Tag, TagLabel, TagCloseButton
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
  const [selectedCategory, setSelectedCategory] = useState(null);
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
  const [activeFilters, setActiveFilters] = useState([]);
  const [totalLoaded, setTotalLoaded] = useState(0);

  useEffect(() => {
    loadCategories();
    
    // Controlla parametri URL
    const genre = searchParams.get('genre');
    const type = searchParams.get('type');
    const demographic = searchParams.get('demographic');
    
    if (genre) {
      handleCategorySelect(genre, 'genre');
    } else if (type) {
      handleCategorySelect(type, 'type');
    } else if (demographic) {
      handleCategorySelect(demographic, 'demographic');
    }
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

  const handleCategorySelect = async (categoryId, type) => {
    setSelectedCategory(categoryId);
    setSelectedType(type);
    setPage(0);
    setMangaList([]);
    setHasMore(true);
    setTotalLoaded(0);
    
    // Aggiorna URL
    const params = new URLSearchParams();
    params.set(type, categoryId);
    setSearchParams(params);
    
    // Aggiungi ai filtri attivi
    const filterName = type === 'genre' ? statsAPI.getGenreName(categoryId) : categoryId;
    addActiveFilter(type, filterName);
    
    await loadManga(categoryId, type, 0);
  };

  const loadManga = async (categoryId = selectedCategory, categoryType = selectedType, pageNum = page) => {
    if (!categoryId || !categoryType) return;
    
    setLoadingManga(true);
    try {
      let result;
      
      if (categoryType === 'genre' && !isNaN(categoryId)) {
        // Se è un genere con ID numerico
        result = await statsAPI.getMangaByGenreId(categoryId, pageNum, 100);
      } else {
        // Altri tipi di categorie
        result = await statsAPI.getMangaByCategoryPage(categoryId, categoryType, pageNum, filters.includeAdult);
      }
      
      if (pageNum === 0) {
        setMangaList(result.results);
      } else {
        setMangaList(prev => [...prev, ...result.results]);
      }
      
      setHasMore(result.hasMore);
      setPage(pageNum + 1);
      setTotalLoaded(prev => prev + result.results.length);
      
    } catch (error) {
      console.error('Error loading manga:', error);
      toast({
        title: 'Errore caricamento manga',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingManga(false);
    }
  };

  const loadMore = () => {
    if (!loadingManga && hasMore) {
      loadManga(selectedCategory, selectedType, page);
    }
  };

  const loadAllPages = async () => {
    if (!selectedCategory || !selectedType) return;
    
    onOpen(); // Apri modal di caricamento
    setLoadingManga(true);
    
    try {
      const result = await statsAPI.getAllMangaByCategory(selectedCategory, selectedType, filters.includeAdult);
      setMangaList(result.results);
      setTotalLoaded(result.totalResults);
      setHasMore(false);
      
      toast({
        title: 'Caricamento completato',
        description: `${result.totalResults} manga caricati da ${result.totalPages} pagine`,
        status: 'success',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error loading all pages:', error);
      toast({
        title: 'Errore caricamento',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingManga(false);
      onClose();
    }
  };

  const addActiveFilter = (type, name) => {
    const newFilter = { type, name };
    setActiveFilters(prev => {
      const exists = prev.find(f => f.type === type && f.name === name);
      if (exists) return prev;
      return [...prev, newFilter];
    });
  };

  const removeActiveFilter = (type, name) => {
    setActiveFilters(prev => prev.filter(f => !(f.type === type && f.name === name)));
    
    if (type === selectedType && name === selectedCategory) {
      setSelectedCategory(null);
      setSelectedType(null);
      setMangaList([]);
      setSearchParams({});
    }
  };

  const CategoryButton = ({ id, name, description, type, color = 'purple' }) => (
    <Button
      size="sm"
      variant={selectedCategory === id && selectedType === type ? 'solid' : 'outline'}
      colorScheme={color}
      onClick={() => handleCategorySelect(id, type)}
      whiteSpace="normal"
      height="auto"
      py={2}
      px={3}
      textAlign="left"
    >
      <VStack align="start" spacing={0}>
        <Text fontWeight="bold">{name}</Text>
        {description && (
          <Text fontSize="xs" opacity={0.8} fontWeight="normal">
            {description}
          </Text>
        )}
      </VStack>
    </Button>
  );

  const GenreSection = ({ title, items, type, icon, color }) => (
    <Box>
      <HStack mb={3}>
        <Icon as={icon} color={`${color}.400`} />
        <Heading size="sm">{title}</Heading>
        <Badge colorScheme={color}>{items?.length || 0}</Badge>
      </HStack>
      <Wrap spacing={2}>
        {items?.map(item => (
          <WrapItem key={item.id}>
            <CategoryButton
              id={item.id}
              name={item.name}
              description={item.description}
              type={type}
              color={color}
            />
          </WrapItem>
        ))}
      </Wrap>
    </Box>
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
          {activeFilters.length > 0 && (
            <Wrap>
              {activeFilters.map((filter, i) => (
                <WrapItem key={i}>
                  <Tag size="lg" colorScheme="purple">
                    <TagLabel>{filter.name}</TagLabel>
                    <TagCloseButton onClick={() => removeActiveFilter(filter.type, filter.name)} />
                  </Tag>
                </WrapItem>
              ))}
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
              <option value="popular">Più popolari</option>
              <option value="latest">Più recenti</option>
              <option value="alphabetical">Alfabetico</option>
              <option value="rating">Valutazione</option>
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
              variant={filters.includeAdult ? 'solid' : 'outline'}
              colorScheme="pink"
              size="sm"
              onClick={() => setFilters({...filters, includeAdult: !filters.includeAdult})}
            >
              {filters.includeAdult ? '🔞 Adult attivi' : 'Solo normale'}
            </Button>
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
              <Tab><FaFire /> Temi</Tab>
              <Tab><FaTheaterMasks /> Tipi</Tab>
              <Tab><FaUsers /> Demographics</Tab>
              <Tab><FaFlag /> Stati</Tab>
              {filters.includeAdult && <Tab>🔞 Adult</Tab>}
            </TabList>

            <TabPanels>
              {/* Generi */}
              <TabPanel>
                <GenreSection
                  title="Generi principali"
                  items={categories?.genres}
                  type="genre"
                  icon={FaTags}
                  color="blue"
                />
              </TabPanel>

              {/* Temi */}
              <TabPanel>
                <GenreSection
                  title="Temi"
                  items={categories?.themes}
                  type="genre"
                  icon={FaFire}
                  color="orange"
                />
              </TabPanel>

              {/* Tipi */}
              <TabPanel>
                <GenreSection
                  title="Tipi di pubblicazione"
                  items={categories?.types}
                  type="type"
                  icon={FaTheaterMasks}
                  color="green"
                />
              </TabPanel>

              {/* Demographics */}
              <TabPanel>
                <GenreSection
                  title="Target demografico"
                  items={categories?.demographics}
                  type="genre"
                  icon={FaUsers}
                  color="purple"
                />
              </TabPanel>

              {/* Stati */}
              <TabPanel>
                <Wrap spacing={2}>
                  {categories?.status?.map(status => (
                    <WrapItem key={status.id}>
                      <Button
                        size="sm"
                        variant={selectedCategory === status.id ? 'solid' : 'outline'}
                        colorScheme={status.color || 'gray'}
                        onClick={() => handleCategorySelect(status.id, 'status')}
                      >
                        {status.name}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </TabPanel>

              {/* Adult Genres */}
              {filters.includeAdult && (
                <TabPanel>
                  <GenreSection
                    title="Contenuti Adult"
                    items={categories?.explicit_genres}
                    type="genre"
                    icon={FaFire}
                    color="pink"
                  />
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        )}

        <Divider />

        {/* Risultati */}
        {selectedCategory && (
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Heading size="md">
                  {selectedType === 'genre' ? statsAPI.getGenreName(selectedCategory) : selectedCategory}
                </Heading>
                <Text color="gray.400">
                  {totalLoaded} manga caricati
                  {hasMore && ' (altri disponibili)'}
                </Text>
              </VStack>
              
              <HStack>
                {hasMore && (
                  <>
                    <Button
                      onClick={loadMore}
                      isLoading={loadingManga}
                      loadingText="Caricamento..."
                      colorScheme="purple"
                      variant="outline"
                    >
                      Carica altri
                    </Button>
                    <Button
                      onClick={loadAllPages}
                      colorScheme="purple"
                      variant="solid"
                    >
                      Carica TUTTI
                    </Button>
                  </>
                )}
              </HStack>
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
                
                {/* Pulsante carica altri in fondo */}
                {hasMore && (
                  <Box textAlign="center" pt={4}>
                    <Button
                      onClick={loadMore}
                      isLoading={loadingManga}
                      loadingText="Caricamento..."
                      colorScheme="purple"
                      size="lg"
                    >
                      Carica altri manga
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Box textAlign="center" py={12}>
                <Text color="gray.500">
                  {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun manga in questa categoria'}
                </Text>
              </Box>
            )}
          </VStack>
        )}
      </VStack>

      {/* Modal caricamento completo */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>Caricamento in corso</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} py={4}>
              <Spinner size="xl" color="purple.500" />
              <Text>Caricamento di TUTTI i manga della categoria...</Text>
              <Text fontSize="sm" color="gray.400">
                Questo potrebbe richiedere diversi minuti per categorie grandi
              </Text>
              <Text fontWeight="bold">
                {totalLoaded} manga caricati finora
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" onClick={() => {
              onClose();
              setLoadingManga(false);
            }}>
              Annulla
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

// Fix per Icon component
const Icon = ({ as: Component, ...props }) => <Box as={Component} {...props} />;

export default Categories;
