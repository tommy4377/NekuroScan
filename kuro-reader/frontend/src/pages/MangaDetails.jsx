import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Image,
  VStack,
  HStack,
  Button,
  Badge,
  SimpleGrid,
  Skeleton,
  useToast,
  Flex,
  IconButton,
  Wrap,
  WrapItem,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaBookmark,
  FaPlay,
  FaShare,
  FaHeart,
  FaList,
  FaTh
} from 'react-icons/fa';
import apiManager from '../api';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function MangaDetails() {
  const { source, id } = useParams();
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadManga();
    checkFavorite();
  }, [source, id]);

  const loadManga = async () => {
    try {
      setLoading(true);
      const mangaUrl = atob(id);
      const details = await apiManager.getMangaDetails(mangaUrl, source);
      setManga(details);
      
      // Add to history
      const history = JSON.parse(localStorage.getItem('history') || '[]');
      const exists = history.findIndex(h => h.url === mangaUrl);
      if (exists !== -1) {
        history.splice(exists, 1);
      }
      history.unshift({
        ...details,
        lastRead: new Date().toISOString()
      });
      localStorage.setItem('history', JSON.stringify(history.slice(0, 50)));
      
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dettagli',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const mangaUrl = atob(id);
    setIsFavorite(favorites.some(f => f.url === mangaUrl));
  };

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const mangaUrl = atob(id);
    
    if (isFavorite) {
      const updated = favorites.filter(f => f.url !== mangaUrl);
      localStorage.setItem('favorites', JSON.stringify(updated));
      setIsFavorite(false);
      toast({
        title: 'Rimosso dai preferiti',
        status: 'info',
        duration: 2000,
      });
    } else {
      favorites.unshift(manga);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
      toast({
        title: 'Aggiunto ai preferiti',
        status: 'success',
        duration: 2000,
      });
    }
  };

  const startReading = (chapterIndex = 0) => {
    if (!manga?.chapters?.[chapterIndex]) return;
    
    const chapter = manga.chapters[chapterIndex];
    const chapterId = btoa(chapter.url);
    
    // Add to reading list
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const exists = reading.findIndex(r => r.url === manga.url);
    if (exists !== -1) {
      reading[exists].lastChapter = chapterIndex;
      reading[exists].lastRead = new Date().toISOString();
    } else {
      reading.unshift({
        ...manga,
        lastChapter: chapterIndex,
        lastRead: new Date().toISOString()
      });
    }
    localStorage.setItem('reading', JSON.stringify(reading));
    
    navigate(`/read/${source}/${id}/${chapterId}?chapter=${chapterIndex}`);
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Skeleton height="400px" width="100%" />
          <Skeleton height="200px" width="100%" />
          <Skeleton height="300px" width="100%" />
        </VStack>
      </Container>
    );
  }

  if (!manga) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Manga non trovato</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Flex
            direction={{ base: 'column', md: 'row' }}
            gap={8}
            bg="gray.800"
            borderRadius="xl"
            p={6}
          >
            {/* Cover */}
            <Box flex="0 0 auto">
              <Image
                src={manga.coverUrl || 'https://via.placeholder.com/300x450'}
                alt={manga.title}
                borderRadius="lg"
                width={{ base: '100%', md: '250px' }}
                height={{ base: 'auto', md: '350px' }}
                objectFit="cover"
                boxShadow="xl"
              />
            </Box>

            {/* Info */}
            <VStack align="stretch" flex={1} spacing={4}>
              <Heading size="xl">{manga.title}</Heading>
              
              {manga.alternativeTitles?.length > 0 && (
                <Text color="gray.400" fontSize="sm">
                  {manga.alternativeTitles.join(' • ')}
                </Text>
              )}

              <HStack spacing={2} wrap="wrap">
                <Badge colorScheme="purple">{manga.type || 'MANGA'}</Badge>
                <Badge colorScheme="green">{manga.status || 'In corso'}</Badge>
                {manga.year && <Badge>{manga.year}</Badge>}
                <Badge colorScheme="blue">{manga.chapters?.length || 0} capitoli</Badge>
              </HStack>

              {manga.authors?.length > 0 && (
                <Text>
                  <Text as="span" fontWeight="bold">Autore: </Text>
                  {manga.authors.join(', ')}
                </Text>
              )}

              {manga.genres?.length > 0 && (
                <Wrap spacing={2}>
                  {manga.genres.map((genre, i) => (
                    <WrapItem key={i}>
                      <Badge variant="outline" colorScheme="purple">
                        {genre.genre || genre}
                      </Badge>
                    </WrapItem>
                  ))}
                </Wrap>
              )}

              {/* Actions */}
              <HStack spacing={3} pt={4}>
                <Button
                  colorScheme="purple"
                  leftIcon={<FaPlay />}
                  onClick={() => startReading(0)}
                >
                  Inizia a leggere
                </Button>
                
                <IconButton
                  icon={<FaBookmark />}
                  colorScheme={isFavorite ? 'pink' : 'gray'}
                  variant={isFavorite ? 'solid' : 'outline'}
                  onClick={toggleFavorite}
                  aria-label="Preferiti"
                />
                
                <IconButton
                  icon={<FaShare />}
                  variant="outline"
                  aria-label="Condividi"
                  onClick={() => {
                    navigator.share({
                      title: manga.title,
                      text: `Leggi ${manga.title} su KuroReader`,
                      url: window.location.href
                    }).catch(() => {
                      // Copy to clipboard fallback
                      navigator.clipboard.writeText(window.location.href);
                      toast({
                        title: 'Link copiato!',
                        status: 'success',
                        duration: 2000,
                      });
                    });
                  }}
                />
              </HStack>
            </VStack>
          </Flex>
        </MotionBox>

        {/* Description */}
        {manga.plot && (
          <Box bg="gray.800" p={6} borderRadius="xl">
            <Heading size="md" mb={4}>Trama</Heading>
            <Text color="gray.300" lineHeight="tall">
              {manga.plot}
            </Text>
          </Box>
        )}

        {/* Chapters */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <HStack justify="space-between" mb={4}>
            <Heading size="md">
              Capitoli ({manga.chapters?.length || 0})
            </Heading>
            
            <HStack>
              <IconButton
                icon={<FaList />}
                size="sm"
                variant={viewMode === 'list' ? 'solid' : 'ghost'}
                onClick={() => setViewMode('list')}
                aria-label="Vista lista"
              />
              <IconButton
                icon={<FaTh />}
                size="sm"
                variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                onClick={() => setViewMode('grid')}
                aria-label="Vista griglia"
              />
            </HStack>
          </HStack>

          {viewMode === 'list' ? (
            <VStack align="stretch" spacing={2} maxH="600px" overflowY="auto">
              {manga.chapters?.map((chapter, i) => (
                <HStack
                  key={i}
                  p={3}
                  bg="gray.700"
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: 'gray.600' }}
                  onClick={() => startReading(i)}
                  justify="space-between"
                >
                  <Text>{chapter.title}</Text>
                  {chapter.dateAdd && (
                    <Text fontSize="sm" color="gray.400">
                      {chapter.dateAdd}
                    </Text>
                  )}
                </HStack>
              ))}
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} maxH="600px" overflowY="auto">
              {manga.chapters?.map((chapter, i) => (
                <Box
                  key={i}
                  p={4}
                  bg="gray.700"
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: 'gray.600' }}
                  onClick={() => startReading(i)}
                  textAlign="center"
                >
                  <Text fontSize="sm" noOfLines={2}>
                    {chapter.title}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
      </VStack>
    </Container>
  );
}

export default MangaDetails;