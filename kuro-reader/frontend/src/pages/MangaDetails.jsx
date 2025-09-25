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
  TabPanel,
  Progress,
  Tooltip
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaBookmark,
  FaPlay,
  FaShare,
  FaHeart,
  FaList,
  FaTh,
  FaRedo,
  FaCheckCircle
} from 'react-icons/fa';
import apiManager from '../api';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';

const MotionBox = motion(Box);

function MangaDetails() {
  const { source, id } = useParams();
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [readingProgress, setReadingProgress] = useState(null);
  const [completedChapters, setCompletedChapters] = useState([]);
  const toast = useToast();
  const navigate = useNavigate();
  const { user, syncFavorites } = useAuth(); // syncFavorites now exists in useAuth

  useEffect(() => {
    loadManga();
    checkFavorite();
    loadReadingProgress();
  }, [source, id]);

  const loadManga = async () => {
    try {
      setLoading(true);
      const mangaUrl = atob(id);
      const details = await apiManager.getMangaDetails(mangaUrl, source);
      
      if (!details) {
        throw new Error('Manga non trovato');
      }
      
      setManga(details);
      
      // Aggiungi alla cronologia
      addToHistory(details);
      
    } catch (error) {
      console.error('Error loading manga:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dettagli del manga',
        status: 'error',
        duration: 3000,
      });
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (mangaDetails) => {
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    const existingIndex = history.findIndex(h => h.url === mangaDetails.url);
    
    const historyItem = {
      url: mangaDetails.url,
      title: mangaDetails.title,
      cover: mangaDetails.coverUrl,
      type: mangaDetails.type,
      source: mangaDetails.source || source,
      lastVisited: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    
    history.unshift(historyItem);
    localStorage.setItem('history', JSON.stringify(history.slice(0, 100)));
  };

  const checkFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const mangaUrl = atob(id);
    setIsFavorite(favorites.some(f => f.url === mangaUrl));
  };

  const loadReadingProgress = () => {
    const mangaUrl = atob(id);
    const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
    const mangaProgress = progress[mangaUrl];
    
    if (mangaProgress) {
      setReadingProgress(mangaProgress);
      
      // Carica capitoli completati
      const completed = [];
      for (let i = 0; i < mangaProgress.chapterIndex; i++) {
        completed.push(i);
      }
      setCompletedChapters(completed);
    }
  };

  const toggleFavorite = async () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let updated;
    
    if (isFavorite) {
      updated = favorites.filter(f => f.url !== manga.url);
      setIsFavorite(false);
      
      toast({
        title: 'Rimosso dai preferiti',
        status: 'info',
        duration: 2000,
      });
    } else {
      const mangaToSave = {
        url: manga.url,
        title: manga.title,
        cover: manga.coverUrl,
        type: manga.type,
        source: manga.source || source,
        addedAt: new Date().toISOString()
      };
      
      updated = [mangaToSave, ...favorites];
      setIsFavorite(true);
      
      toast({
        title: 'Aggiunto ai preferiti',
        status: 'success',
        duration: 2000,
      });
    }
    
    localStorage.setItem('favorites', JSON.stringify(updated));
    
    // Sync con server se loggato - FIX: syncFavorites ora esiste
    if (user) {
      await syncFavorites(updated);
    }
  };

  const startReading = (chapterIndex = 0) => {
    if (!manga?.chapters?.[chapterIndex]) {
      toast({
        title: 'Capitolo non disponibile',
        status: 'error',
        duration: 2000,
      });
      return;
    }
    
    const chapter = manga.chapters[chapterIndex];
    const chapterId = btoa(chapter.url);
    
    // Salva progresso dettagliato
    const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
    progress[manga.url] = {
      chapterId: chapter.url,
      chapterIndex: chapterIndex,
      chapterTitle: chapter.title,
      totalChapters: manga.chapters.length,
      page: 0,
      pageIndex: 0, // FIX: Add consistent pageIndex
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('readingProgress', JSON.stringify(progress));
    
    // Aggiorna lista "reading"
    updateReadingList(chapterIndex, chapter);
    
    // Naviga al reader
    navigate(`/read/${source}/${id}/${chapterId}?chapter=${chapterIndex}`);
  };

  const updateReadingList = (chapterIndex, chapter) => {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const existingIndex = reading.findIndex(r => r.url === manga.url);
    
    const readingItem = {
      url: manga.url,
      title: manga.title,
      cover: manga.coverUrl,
      type: manga.type,
      source: manga.source || source,
      lastChapterIndex: chapterIndex,
      lastChapterTitle: chapter.title,
      totalChapters: manga.chapters.length,
      progress: Math.round((chapterIndex / manga.chapters.length) * 100),
      lastRead: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
      reading[existingIndex] = readingItem;
    } else {
      reading.unshift(readingItem);
    }
    
    localStorage.setItem('reading', JSON.stringify(reading.slice(0, 100)));
  };

  const continueReading = () => {
    if (readingProgress && readingProgress.chapterIndex !== undefined) {
      startReading(readingProgress.chapterIndex);
    } else {
      startReading(0);
    }
  };

  const markAsCompleted = () => {
    const completed = JSON.parse(localStorage.getItem('completed') || '[]');
    const exists = completed.findIndex(c => c.url === manga.url);
    
    if (exists === -1) {
      const completedItem = {
        url: manga.url,
        title: manga.title,
        cover: manga.coverUrl,
        type: manga.type,
        source: manga.source || source,
        completedAt: new Date().toISOString()
      };
      
      completed.unshift(completedItem);
      localStorage.setItem('completed', JSON.stringify(completed));
      
      // Rimuovi da reading
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const updated = reading.filter(r => r.url !== manga.url);
      localStorage.setItem('reading', JSON.stringify(updated));
      
      toast({
        title: 'Manga completato!',
        description: 'Aggiunto alla lista dei completati',
        status: 'success',
        duration: 3000,
      });
    }
  };

  const shareContent = async () => {
    const shareData = {
      title: manga.title,
      text: `Leggi ${manga.title} su KuroReader`,
      url: window.location.href
    };
    
    try {
      if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copiato!',
          description: 'Il link è stato copiato negli appunti',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copiato!',
          status: 'success',
          duration: 2000,
        });
      } catch (err) {
        toast({
          title: 'Errore',
          description: 'Impossibile condividere',
          status: 'error',
          duration: 2000,
        });
      }
    }
  };

  const isChapterRead = (chapterIndex) => {
    return completedChapters.includes(chapterIndex);
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
        <VStack spacing={8}>
          <Text fontSize="xl">Manga non trovato</Text>
          <Button colorScheme="purple" onClick={() => navigate('/home')}>
            Torna alla Home
          </Button>
        </VStack>
      </Container>
    );
  }

  const readProgress = readingProgress 
    ? Math.round((readingProgress.chapterIndex / manga.chapters.length) * 100)
    : 0;

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
              {readProgress > 0 && (
                <Box mt={3}>
                  <Text fontSize="sm" color="gray.400" mb={1}>
                    Progresso: {readProgress}%
                  </Text>
                  <Progress value={readProgress} colorScheme="purple" size="sm" />
                </Box>
              )}
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
                {manga.source === 'mangaWorldAdult' && (
                  <Badge colorScheme="pink">🔞 Adult</Badge>
                )}
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
                      <Badge 
                        variant="outline" 
                        colorScheme="purple"
                        cursor="pointer"
                        onClick={() => navigate(`/categories?genre=${genre.genre || genre}`)}
                      >
                        {genre.genre || genre}
                      </Badge>
                    </WrapItem>
                  ))}
                </Wrap>
              )}

              {/* Actions */}
              <HStack spacing={3} pt={4} flexWrap="wrap">
                {readingProgress && readingProgress.chapterIndex > 0 ? (
                  <>
                    <Button
                      colorScheme="green"
                      leftIcon={<FaPlay />}
                      onClick={continueReading}
                    >
                      Continua Cap. {readingProgress.chapterIndex + 1}
                    </Button>
                    <Tooltip label="Ricomincia dall'inizio">
                      <IconButton
                        icon={<FaRedo />}
                        variant="outline"
                        onClick={() => startReading(0)}
                        aria-label="Ricomincia"
                      />
                    </Tooltip>
                  </>
                ) : (
                  <Button
                    colorScheme="purple"
                    leftIcon={<FaPlay />}
                    onClick={() => startReading(0)}
                  >
                    Inizia a leggere
                  </Button>
                )}
                
                <IconButton
                  icon={isFavorite ? <FaHeart /> : <FaBookmark />}
                  colorScheme={isFavorite ? 'pink' : 'gray'}
                  variant={isFavorite ? 'solid' : 'outline'}
                  onClick={toggleFavorite}
                  aria-label="Preferiti"
                />
                
                <IconButton
                  icon={<FaShare />}
                  variant="outline"
                  aria-label="Condividi"
                  onClick={shareContent}
                />
                
                {readProgress >= 100 && (
                  <Button
                    leftIcon={<FaCheckCircle />}
                    colorScheme="green"
                    variant="outline"
                    onClick={markAsCompleted}
                  >
                    Segna come completato
                  </Button>
                )}
              </HStack>
            </VStack>
          </Flex>
        </MotionBox>

        {/* Description */}
        {manga.plot && (
          <Box bg="gray.800" p={6} borderRadius="xl">
            <Heading size="md" mb={4}>Trama</Heading>
            <Text color="gray.300" lineHeight="tall" whiteSpace="pre-wrap">
              {manga.plot.replace(/^trama:?\s*/i, '').trim()}
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

          {manga.chapters?.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={8}>
              Nessun capitolo disponibile
            </Text>
          ) : viewMode === 'list' ? (
            <VStack align="stretch" spacing={2} maxH="600px" overflowY="auto">
              {manga.chapters.map((chapter, i) => (
                <HStack
                  key={i}
                  p={3}
                  bg={isChapterRead(i) ? 'gray.700' : 'gray.700'}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: 'gray.600' }}
                  onClick={() => startReading(i)}
                  justify="space-between"
                  position="relative"
                  opacity={isChapterRead(i) ? 0.7 : 1}
                >
                  <HStack>
                    {isChapterRead(i) && (
                      <FaCheckCircle color="green" />
                    )}
                    {readingProgress?.chapterIndex === i && (
                      <Badge colorScheme="purple" size="sm">Attuale</Badge>
                    )}
                    <Text>{chapter.title}</Text>
                  </HStack>
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
              {manga.chapters.map((chapter, i) => (
                <Box
                  key={i}
                  p={4}
                  bg={isChapterRead(i) ? 'gray.700' : 'gray.700'}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: 'gray.600' }}
                  onClick={() => startReading(i)}
                  textAlign="center"
                  position="relative"
                  opacity={isChapterRead(i) ? 0.7 : 1}
                >
                  {isChapterRead(i) && (
                    <Box position="absolute" top={2} right={2}>
                      <FaCheckCircle color="green" size="12" />
                    </Box>
                  )}
                  {readingProgress?.chapterIndex === i && (
                    <Badge 
                      position="absolute" 
                      top={2} 
                      left={2} 
                      colorScheme="purple" 
                      size="sm"
                    >
                      Attuale
                    </Badge>
                  )}
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
