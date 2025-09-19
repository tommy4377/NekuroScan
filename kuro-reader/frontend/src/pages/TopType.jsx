// frontend/src/pages/TopType.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, VStack, HStack, Heading, Text, SimpleGrid, Spinner, Box, Button, Badge } from '@chakra-ui/react';
import { useInView } from 'react-intersection-observer';
import { FaTrophy } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import statsAPI from '../api/stats';

export default function TopType() {
  const { type } = useParams();
  const [includeAdult, setIncludeAdult] = useState(() => localStorage.getItem('includeAdult') === 'true');
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: '200px' });

  const load = async (p) => {
    setLoading(true);
    const r = await statsAPI.getTopByType(type, includeAdult, p);
    setList(prev => [...prev, ...r.results]);
    setHasMore(r.hasMore);
    setLoading(false);
  };

  useEffect(() => { setList([]); setPage(1); setHasMore(true); load(1); }, [type, includeAdult]);
  useEffect(() => { if (inView && hasMore && !loading) { const np = page + 1; setPage(np); load(np); } }, [inView]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" flexWrap="wrap">
          <HStack>
            <Box p={2} bg="purple.500" borderRadius="lg"><FaTrophy color="#fff" /></Box>
            <VStack align="start" spacing={0}>
              <Heading size="lg">Top {type}</Heading>
              <HStack>
                <Text fontSize="sm" color="gray.400">{list.length} caricati</Text>
                <Badge colorScheme={includeAdult ? 'pink' : 'blue'}>{includeAdult ? 'Adult' : 'Normali'}</Badge>
              </HStack>
            </VStack>
          </HStack>
          <Button
            variant={includeAdult ? 'solid' : 'outline'}
            colorScheme="pink"
            size="sm"
            onClick={() => { const v = !includeAdult; setIncludeAdult(v); localStorage.setItem('includeAdult', v.toString()); }}
          >
            {includeAdult ? '🔞 Solo Adult' : 'Solo Normali'}
          </Button>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
          {list.map((item, i) => (
            <Box key={`${item.url}-${i}`} position="relative">
              <MangaCard manga={item} hideSource showLatest={false} />
              {item.isAdult && <Badge position="absolute" top={2} right={2} colorScheme="pink">18+</Badge>}
            </Box>
          ))}
        </SimpleGrid>

        {hasMore && (
          <Box ref={ref} textAlign="center" py={6}>
            {loading ? <Spinner color="purple.500" /> : <Button variant="outline" onClick={() => { const np = page + 1; setPage(np); load(np); }}>Carica altri</Button>}
          </Box>
        )}
      </VStack>
    </Container>
  );
}
