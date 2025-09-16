import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  HStack,
  IconButton,
  Select,
  Text,
  VStack,
  Image,
  Button,
  useToast,
  Flex,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaArrowRight,
  FaExpand,
  FaCompress,
  FaCog,
  FaList,
  FaTimes
} from 'react-icons/fa';
import apiManager from '../api';
import Reader from '../components/Reader';

function ReaderPage() {
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const [chapter, setChapter] = useState(null);
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState({
    readingMode: 'single', // single, double, webtoon
    zoom: 100,
    brightness: 100,
    fitMode: 'width' // width, height, original
  });
  const toast = useToast();
  const navigate = useNavigate();
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

  useEffect(() => {
    loadChapter();
    loadManga();
  }, [chapterId]);

  const loadManga = async () => {
    try {
      const mangaUrl = atob(mangaId);
      const details = await apiManager.getMangaDetails(mangaUrl, source);
      setManga(details);
    } catch (error) {
      console.error('Error loading manga:', error);
    }
  };

  const loadChapter = async () => {
    try {
      setLoading(true);
      const chapterUrl = atob(chapterId);
      const chapterData = await apiManager.getChapter(chapterUrl, source);
      
      if (!chapterData) {
        throw new Error('Chapter not found');
      }
      
      setChapter(chapterData);
      
      // Save reading progress
      const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      progress[mangaId] = {
        chapterId,
        chapterIndex,
        page: currentPage,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('readingProgress', JSON.stringify(progress));
      
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile caricare il capitolo',
        status: 'error',
        duration: 3000,
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const navigateChapter = (direction) => {
    if (!manga?.chapters) return;
    
    const newIndex = chapterIndex + direction;
    if (newIndex >= 0 && newIndex < manga.chapters.length) {
      const newChapter = manga.chapters[newIndex];
      const newChapterId = btoa(newChapter.url);
      navigate(`/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Caricamento...</Text>
      </Container>
    );
  }

  if (!chapter) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Capitolo non trovato</Text>
      </Container>
    );
  }

  return (
    <Box bg="black" minH="100vh" position="relative">
      {/* Header */}
      {!isFullscreen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bg="rgba(0,0,0,0.9)"
          backdropFilter="blur(10px)"
          zIndex={1000}
          p={2}
        >
          <Flex align="center" justify="space-between">
            <HStack>
              <IconButton
                icon={<FaTimes />}
                variant="ghost"
                colorScheme="whiteAlpha"
                onClick={() => navigate(-1)}
                aria-label="Chiudi"
              />
              
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                  {manga?.title}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {manga?.chapters?.[chapterIndex]?.title}
                </Text>
              </VStack>
            </HStack>

            <HStack>
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FaCog />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  aria-label="Impostazioni"
                />
                <MenuList bg="gray.800">
                  <MenuItem onClick={() => setSettings({...settings, readingMode: 'single'})}>
                    Pagina singola
                  </MenuItem>
                  <MenuItem onClick={() => setSettings({...settings, readingMode: 'double'})}>
                    Pagina doppia
                  </MenuItem>
                  <MenuItem onClick={() => setSettings({...settings, readingMode: 'webtoon'})}>
                    Webtoon (scroll)
                  </MenuItem>
                </MenuList>
              </Menu>
              
              <IconButton
                icon={isFullscreen ? <FaCompress /> : <FaExpand />}
                variant="ghost"
                colorScheme="whiteAlpha"
                onClick={toggleFullscreen}
                aria-label="Fullscreen"
              />
            </HStack>
          </Flex>
        </Box>
      )}

      {/* Reader */}
      <Box pt={isFullscreen ? 0 : 16} pb={isFullscreen ? 0 : 16}>
        <Reader
          chapter={chapter}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          settings={settings}
          isNovel={chapter.type === 'text'}
        />
      </Box>

      {/* Footer Controls */}
      {!isFullscreen && (
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          bg="rgba(0,0,0,0.9)"
          backdropFilter="blur(10px)"
          zIndex={1000}
          p={4}
        >
          <VStack spacing={2}>
            {/* Page selector */}
            {chapter.pages && (
              <HStack w="100%" maxW="600px">
                <Text fontSize="sm" color="gray.400" minW="60px">
                  {currentPage + 1}/{chapter.pages.length}
                </Text>
                
                <Slider
                  value={currentPage}
                  min={0}
                  max={chapter.pages.length - 1}
                  onChange={setCurrentPage}
                  flex={1}
                >
                  <SliderTrack bg="gray.700">
                    <SliderFilledTrack bg="purple.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>
              </HStack>
            )}

            {/* Navigation */}
            <HStack spacing={4}>
              <Button
                leftIcon={<FaArrowLeft />}
                variant="outline"
                colorScheme="whiteAlpha"
                onClick={() => navigateChapter(-1)}
                isDisabled={chapterIndex === 0}
              >
                Precedente
              </Button>
              
              <Select
                value={chapterIndex}
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value);
                  const newChapter = manga.chapters[newIndex];
                  const newChapterId = btoa(newChapter.url);
                  navigate(`/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
                }}
                bg="gray.800"
                maxW="200px"
              >
                {manga?.chapters?.map((ch, i) => (
                  <option key={i} value={i}>
                    {ch.title}
                  </option>
                ))}
              </Select>
              
              <Button
                rightIcon={<FaArrowRight />}
                variant="outline"
                colorScheme="whiteAlpha"
                onClick={() => navigateChapter(1)}
                isDisabled={chapterIndex >= (manga?.chapters?.length || 0) - 1}
              >
                Successivo
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  );
}

export default ReaderPage;