import React from 'react';
import {
  SimpleGrid,
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Skeleton
} from '@chakra-ui/react';
import MangaCard from './MangaCard';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function SearchResults({ results, loading, filter = 'all' }) {
  const getFilteredResults = () => {
    if (!results) return [];
    
    switch (filter) {
      case 'manga':
        return results.manga || [];
      case 'novels':
        return results.novels || [];
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
            {results.novels?.length > 0 && (
              <Badge colorScheme="purple">{results.novels.length} Novel</Badge>
            )}
          </HStack>
        )}
      </HStack>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        {filteredResults.map((item, i) => (
          <MotionBox
            key={`${item.url}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.5) }}
          >
            <MangaCard manga={item} />
          </MotionBox>
        ))}
      </SimpleGrid>
    </VStack>
  );
}

export default SearchResults;
