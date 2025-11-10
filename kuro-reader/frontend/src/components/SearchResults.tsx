/**
 * SEARCH RESULTS - Display search results with filtering
 * Shows manga cards in responsive grid with loading states
 */

import {
  SimpleGrid, Box, Text, VStack, HStack, Badge, Skeleton
} from '@chakra-ui/react';
import type { Manga } from '@/types/manga';
import type { SearchMangaResponse } from '@/types/api';
import MangaCard from '@/components/MangaCard';

// ========== TYPES ==========

type FilterType = 'all' | 'manga' | 'adult';

interface SearchResultsProps {
  results: SearchMangaResponse | null;
  loading: boolean;
  filter?: FilterType;
}

// ========== COMPONENT ==========

function SearchResults({ results, loading, filter = 'all' }: SearchResultsProps): JSX.Element {
  const getFilteredResults = (): Manga[] => {
    if (!results) return [];
    
    switch (filter) {
      case 'manga':
        return results.manga || [];
      case 'adult':
        return results.mangaAdult || [];
      default:
        return results.all || [];
    }
  };

  const filteredResults = getFilteredResults();

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} height="280px" borderRadius="lg" />
        ))}
      </SimpleGrid>
    );
  }

  if (filteredResults.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Text fontSize="lg" color="gray.500">
          Nessun risultato trovato
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack>
        <Text fontWeight="bold">{filteredResults.length} risultati</Text>
        {results && (
          <HStack spacing={2}>
            {results.manga && results.manga.length > 0 && (
              <Badge colorScheme="blue">{results.manga.length} Manga</Badge>
            )}
            {results.mangaAdult && results.mangaAdult.length > 0 && (
              <Badge colorScheme="pink">{results.mangaAdult.length} Adult</Badge>
            )}
          </HStack>
        )}
      </HStack>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        {filteredResults.map((item, i) => (
          <Box key={`${item.url}-${i}`}>
            <MangaCard manga={item} />
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  );
}

export default SearchResults;

