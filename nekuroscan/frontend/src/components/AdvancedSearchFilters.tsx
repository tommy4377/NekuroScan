/**
 * ADVANCED SEARCH FILTERS - Componente per filtri ricerca avanzata
 * ✅ SEZIONE 2.2: Ricerca Avanzata con Filtri
 */

import {
  Box,
  VStack,
  HStack,
  Button,
  Select,
  Checkbox,
  Text,
  Collapse,
  IconButton,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Divider,
  Badge,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from '@chakra-ui/icons';
import { useState, useEffect, useRef } from 'react';

interface AdvancedSearchFiltersProps {
  genres: Array<{ id: string; name: string }>;
  types: Array<{ id: string; name: string }>;
  selectedGenres: string[];
  selectedType: string | null;
  filters: {
    includeAdult: boolean;
    sortBy: string;
    year: string;
    status: string;
    minChapters: string;
  };
  onGenresChange: (genres: string[]) => void;
  onTypeChange: (type: string | null) => void;
  onFiltersChange: (filters: Partial<typeof filters>) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

const SORT_OPTIONS = [
  { value: 'most_read', label: 'Più letti' },
  { value: 'newest', label: 'Più recenti' },
  { value: 'score', label: 'Valutazione' },
  { value: 'a-z', label: 'A-Z' },
  { value: 'z-a', label: 'Z-A' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti' },
  { value: 'ongoing', label: 'In corso' },
  { value: 'completed', label: 'Completati' },
  { value: 'hiatus', label: 'In pausa' },
];

const MIN_CHAPTERS_OPTIONS = [
  { value: '', label: 'Tutti' },
  { value: '10', label: '10+ capitoli' },
  { value: '50', label: '50+ capitoli' },
  { value: '100', label: '100+ capitoli' },
  { value: '200', label: '200+ capitoli' },
];

const STORAGE_KEY = 'nekuroscan_advanced_search_filters';

export default function AdvancedSearchFilters({
  genres,
  types,
  selectedGenres,
  selectedType,
  filters,
  onGenresChange,
  onTypeChange,
  onFiltersChange,
  onSearch,
  onReset,
  isLoading = false,
  searchQuery = '',
  onSearchQueryChange
}: AdvancedSearchFiltersProps) {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });
  const [genreSearch, setGenreSearch] = useState('');

  // Carica filtri salvati al mount (solo una volta)
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedGenres && Array.isArray(parsed.selectedGenres)) {
          onGenresChange(parsed.selectedGenres);
        }
        if (parsed.selectedType) {
          onTypeChange(parsed.selectedType);
        }
        if (parsed.filters && typeof parsed.filters === 'object') {
          onFiltersChange(parsed.filters);
        }
        if (parsed.searchQuery && onSearchQueryChange) {
          onSearchQueryChange(parsed.searchQuery);
        }
      }
      hasLoadedRef.current = true;
    } catch (e) {
      console.warn('Failed to load saved filters:', e);
      hasLoadedRef.current = true;
    }
  }, []); // Solo al mount

  // Salva filtri quando cambiano
  useEffect(() => {
    try {
      const toSave = {
        selectedGenres,
        selectedType,
        filters,
        searchQuery
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save filters:', e);
    }
  }, [selectedGenres, selectedType, filters, searchQuery]);

  // Formatta nome genere (capitalizza e sostituisce trattini)
  const formatGenreName = (name: string): string => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleGenre = (genreId: string) => {
    if (selectedGenres.includes(genreId)) {
      onGenresChange(selectedGenres.filter(g => g !== genreId));
    } else {
      onGenresChange([...selectedGenres, genreId]);
    }
  };

  const filteredGenres = genres.filter(genre =>
    formatGenreName(genre.name).toLowerCase().includes(genreSearch.toLowerCase()) ||
    genre.id.toLowerCase().includes(genreSearch.toLowerCase()) ||
    genre.name.toLowerCase().includes(genreSearch.toLowerCase())
  );

  const activeFiltersCount = selectedGenres.length + (selectedType ? 1 : 0) + 
    (filters.year ? 1 : 0) + (filters.status ? 1 : 0) + (filters.minChapters ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0 || filters.includeAdult;

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      p={5}
      border="1px solid"
      borderColor="gray.700"
      boxShadow="md"
      _hover={{
        borderColor: 'purple.600',
        boxShadow: 'lg'
      }}
      transition="all 0.3s"
    >
      <VStack spacing={4} align="stretch">
        {/* Header con toggle */}
        <HStack justify="space-between">
          <HStack>
            <Text fontSize="lg" fontWeight="bold">
              🔍 Ricerca Avanzata
            </Text>
            {hasActiveFilters && (
              <Badge colorScheme="purple" borderRadius="full" px={2}>
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro' : 'filtri'}
              </Badge>
            )}
          </HStack>
          <IconButton
            aria-label={isOpen ? 'Nascondi filtri' : 'Mostra filtri'}
            icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            onClick={onToggle}
            variant="ghost"
            size="sm"
          />
        </HStack>

        {/* Barra ricerca rapida */}
        {onSearchQueryChange && (
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Cerca per titolo..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              bg="gray.700"
              _focus={{
                borderColor: 'purple.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSearch();
                }
              }}
            />
          </InputGroup>
        )}

        {/* Tag filtri attivi */}
        {(selectedGenres.length > 0 || selectedType) && (
          <Wrap spacing={2}>
            {selectedGenres.map((genreId) => {
              const genre = genres.find(g => g.id === genreId);
              return (
                <WrapItem key={genreId}>
                  <Tag 
                    size="md" 
                    colorScheme="purple" 
                    borderRadius="full"
                    px={3}
                    py={1}
                    cursor="pointer"
                    _hover={{ 
                      transform: 'translateY(-2px)',
                      boxShadow: 'md'
                    }}
                    transition="all 0.2s"
                  >
                    <TagLabel fontWeight="medium">
                      {genre ? formatGenreName(genre.name) : formatGenreName(genreId)}
                    </TagLabel>
                    <TagCloseButton 
                      onClick={() => toggleGenre(genreId)}
                      _hover={{ bg: 'purple.600' }}
                    />
                  </Tag>
                </WrapItem>
              );
            })}
            {selectedType && (
              <WrapItem>
                <Tag 
                  size="md" 
                  colorScheme="blue" 
                  borderRadius="full"
                  px={3}
                  py={1}
                  cursor="pointer"
                  _hover={{ 
                    transform: 'translateY(-2px)',
                    boxShadow: 'md'
                  }}
                  transition="all 0.2s"
                >
                  <TagLabel fontWeight="medium">
                    {types.find(t => t.id === selectedType)?.name || selectedType}
                  </TagLabel>
                  <TagCloseButton 
                    onClick={() => onTypeChange(null)}
                    _hover={{ bg: 'blue.600' }}
                  />
                </Tag>
              </WrapItem>
            )}
          </Wrap>
        )}

        {/* Controlli rapidi */}
        <HStack flexWrap="wrap" spacing={3}>
          <Select
            maxW="180px"
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ sortBy: e.target.value })}
            bg="gray.700"
            size="sm"
            _focus={{
              borderColor: 'purple.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)'
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>

          <Checkbox
            isChecked={filters.includeAdult}
            onChange={(e) => onFiltersChange({ includeAdult: e.target.checked })}
            colorScheme="pink"
            size="md"
          >
            🔞 Adult
          </Checkbox>

          <Button
            size="sm"
            colorScheme="purple"
            onClick={onSearch}
            isLoading={isLoading}
            isDisabled={!hasActiveFilters && !searchQuery.trim()}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg'
            }}
            transition="all 0.2s"
          >
            🔍 Cerca
          </Button>

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              _hover={{
                bg: 'gray.700',
                transform: 'translateY(-2px)'
              }}
              transition="all 0.2s"
            >
              🗑️ Reset
            </Button>
          )}
        </HStack>

        {/* Filtri avanzati collassabili */}
        <Collapse in={isOpen} animateOpacity>
          <VStack spacing={4} align="stretch" pt={2}>
            <Divider />

            {/* Tipo */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={3} color="purple.300">
                📚 Tipo
              </Text>
              <Wrap spacing={2}>
                {types.map((type) => (
                  <WrapItem key={type.id}>
                    <Button
                      size="sm"
                      variant={selectedType === type.id ? 'solid' : 'outline'}
                      colorScheme={selectedType === type.id ? 'blue' : 'gray'}
                      onClick={() => onTypeChange(selectedType === type.id ? null : type.id)}
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: 'md'
                      }}
                      transition="all 0.2s"
                    >
                      {type.name}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>

            {/* Generi */}
            <Box>
              <HStack justify="space-between" mb={3}>
                <Text fontSize="sm" fontWeight="semibold" color="purple.300">
                  🏷️ Generi
                </Text>
                {selectedGenres.length > 0 && (
                  <Badge colorScheme="purple" borderRadius="full" px={2}>
                    {selectedGenres.length} selezionati
                  </Badge>
                )}
              </HStack>
              <InputGroup size="sm" mb={3}>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Cerca genere..."
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  bg="gray.700"
                  _focus={{
                    borderColor: 'purple.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)'
                  }}
                />
              </InputGroup>
              <Box
                maxH="300px"
                overflowY="auto"
                border="1px solid"
                borderColor="gray.700"
                borderRadius="lg"
                p={4}
                css={{
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#2D3748',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#4A5568',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#718096',
                  },
                }}
              >
                <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
                  {filteredGenres.map((genre) => (
                    <Checkbox
                      key={genre.id}
                      isChecked={selectedGenres.includes(genre.id)}
                      onChange={() => toggleGenre(genre.id)}
                      colorScheme="purple"
                      size="md"
                      _hover={{
                        transform: 'translateX(4px)'
                      }}
                      transition="all 0.2s"
                    >
                      <Text fontSize="sm" fontWeight="medium">
                        {formatGenreName(genre.name)}
                      </Text>
                    </Checkbox>
                  ))}
                </SimpleGrid>
              </Box>
            </Box>

            {/* Altri filtri */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2} color="purple.300">
                  📊 Stato
                </Text>
                <Select
                  value={filters.status}
                  onChange={(e) => onFiltersChange({ status: e.target.value })}
                  bg="gray.700"
                  size="sm"
                  _focus={{
                    borderColor: 'purple.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)'
                  }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2} color="purple.300">
                  📅 Anno
                </Text>
                <Input
                  type="number"
                  placeholder="Es. 2020"
                  value={filters.year}
                  onChange={(e) => onFiltersChange({ year: e.target.value })}
                  bg="gray.700"
                  size="sm"
                  min="1900"
                  max={new Date().getFullYear()}
                  _focus={{
                    borderColor: 'purple.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)'
                  }}
                />
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2} color="purple.300">
                  📖 Capitoli Minimi
                </Text>
                <Select
                  value={filters.minChapters}
                  onChange={(e) => onFiltersChange({ minChapters: e.target.value })}
                  bg="gray.700"
                  size="sm"
                  _focus={{
                    borderColor: 'purple.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)'
                  }}
                >
                  {MIN_CHAPTERS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </Box>
            </SimpleGrid>
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  );
}

