import React from 'react';
import {
  SimpleGrid, Box, Text, VStack, HStack, Badge, Skeleton
} from '@chakra-ui/react';
import MangaCard from './MangaCard';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300

// const Box = motion(Box); // Rimosso per evitare errori React #300

function SearchResults({ results, loading, filter = 'all' }) {
  const getFilteredResults = () => {
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
            {results.manga?.length > 0 && (
              <Badge colorScheme="blue">{results.manga.length} Manga</Badge>
            )}
            {results.mangaAdult?.length > 0 && (
              <Badge colorScheme="pink">{results.mangaAdult.length} Adult</Badge>
            )}
          </HStack>
        )}
      </HStack>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        {filteredResults.map((item, i) => (
          <Box
            key={`${item.url}-${i}`}
          >
            <MangaCard manga={item} />
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  );
}

export default SearchResults;
