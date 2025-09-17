import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const MotionBox = motion(Box);

function Home() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [continueReading, setContinueReading] = useState([]);
  const toast = useToast();

  useEffect(() => {
    loadContent();
    loadContinueReading();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const trendingData = await apiManager.getTrending();
      setTrending(trendingData);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i contenuti',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContinueReading = () => {
    const saved = localStorage.getItem('continueReading');
    if (saved) {
      setContinueReading(JSON.parse(saved));
    }
  };

  const categories = [
  { name: 'Azione', query: 'action manga' },
  { name: 'Romance', query: 'romance manga' },
  { name: 'Fantasy', query: 'fantasy manga' },
  { name: 'Isekai', query: 'isekai manga' },
  { name: 'Shounen', query: 'shounen manga' },
  { name: 'Seinen', query: 'seinen manga' },
  { name: 'Josei', query: 'josei manga' },
  { name: 'Shoujo', query: 'shoujo manga' }
];
  
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={12} align="stretch">
        {/* Hero Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            bg="purple.900"
            borderRadius="xl"
            p={8}
            bgGradient="linear(to-r, purple.600, pink.600)"
            position="relative"
            overflow="hidden"
          >
            <Box
              position="absolute"
              top="-50%"
              right="-10%"
              width="300px"
              height="300px"
              bg="whiteAlpha.100"
              borderRadius="full"
              filter="blur(60px)"
            />
            
            <VStack align="start" spacing={4} position="relative">
              <Heading size="2xl" fontWeight="black">
                Benvenuto su KuroReader
              </Heading>
              <Text fontSize="lg" opacity={0.9}>
                Scopri migliaia di manga e light novel, tutto in un unico posto
              </Text>
              <HStack spacing={4}>
                <Button size="lg" colorScheme="whiteAlpha">
                  Esplora
                </Button>
                <Button size="lg" variant="outline" colorScheme="whiteAlpha">
                  Libreria
                </Button>
              </HStack>
            </VStack>
          </Box>
        </MotionBox>

        {/* Continue Reading */}
        {continueReading.length > 0 && (
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Heading size="lg">Continua a leggere</Heading>
              <Button variant="link" colorScheme="purple">
                Vedi tutti
              </Button>
            </HStack>
            
            <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
              {continueReading.slice(0, 6).map((item, i) => (
                <MangaCard key={i} manga={item} />
              ))}
            </SimpleGrid>
          </VStack>
        )}

        {/* Trending Section */}
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between">
            <HStack>
              <Heading size="lg">Trending</Heading>
              <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
                HOT
              </Badge>
            </HStack>
            <Button variant="link" colorScheme="purple">
              Vedi tutti
            </Button>
          </HStack>
          
          {loading ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <Box>
              <Swiper
                modules={[Autoplay, Pagination]}
                spaceBetween={20}
                slidesPerView={2}
                autoplay={{ delay: 3000 }}
                pagination={{ clickable: true }}
                breakpoints={{
                  640: { slidesPerView: 3 },
                  768: { slidesPerView: 4 },
                  1024: { slidesPerView: 5 },
                }}
              >
                {trending.map((manga, i) => (
                  <SwiperSlide key={i}>
                    <MangaCard manga={manga} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </Box>
          )}
        </VStack>

        {/* Categories */}
        
        <VStack align="stretch" spacing={4}>
          <Heading size="lg">Categorie</Heading>
          
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
  {categories.map(category => (
    <MotionBox
      key={category.name}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate(`/search?q=${encodeURIComponent(category.query)}`)}
    >
      <Box
        bg="gray.800"
        p={6}
        borderRadius="lg"
        textAlign="center"
        cursor="pointer"
        transition="all 0.3s"
        _hover={{ bg: 'gray.700' }}
      >
        <Text fontWeight="bold">{category.name}</Text>
      </Box>
    </MotionBox>
  ))}
</SimpleGrid>
        </VStack>
      </VStack>
    </Container>
  );
}

export default Home;

