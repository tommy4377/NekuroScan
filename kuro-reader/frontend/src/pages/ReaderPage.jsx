import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, HStack, IconButton, Select, Text, VStack,
  Button, useToast, Flex, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Drawer, DrawerOverlay, DrawerContent, DrawerBody, 
  DrawerHeader, Switch, FormControl, FormLabel, Image, Spinner
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaArrowLeft, FaArrowRight, FaExpand, FaCompress, FaCog, FaTimes,
  FaPlay, FaPause, FaColumns, FaBars, FaAlignJustify
} from 'react-icons/fa';
import apiManager from '../api';

function ReaderPage() {
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [chapter, setChapter] = useState(null);
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [imagesLoading, setImagesLoading] = useState({});
  
  const scrollIntervalRef = useRef(null);
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('readerSettings');
    return saved ? JSON.parse(saved) : {
      readingMode: 'single',
      brightness: 100,
      zoom: 100
    };
  });

  useEffect(() => {
    loadData();
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [chapterId]);

  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (autoScroll && settings.readingMode === 'webtoon') {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy({
          top: scrollSpeed / 10,
          behavior: 'smooth'
        });
      }, 100);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    }
    
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [autoScroll, scrollSpeed, settings.readingMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carica manga info
      const mangaUrl = atob(mangaId);
      const mangaData = await apiManager.getMangaDetails(mangaUrl, source);
      setManga(mangaData);
      
      // Carica capitolo
      const chapterUrl = atob(chapterId);
      console.log('Loading chapter:', chapterUrl);
      const chapterData = await apiManager.getChapter(chapterUrl, source);
      
      if (!chapterData || !chapterData.pages || chapterData.pages.length === 0) {
        throw new Error('Nessuna pagina trovata nel capitolo');
      }
      
      setChapter(chapterData);
      setCurrentPage(0);
      
      // Salva progresso
      const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      progress[mangaId] = {
        chapterId,
        chapterIndex,
        page: 0,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('readingProgress', JSON.stringify(progress));
      
    } catch (error) {
      console.error('Error loading:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile caricare il capitolo',
        status: 'error',
        duration: 5000,
      });
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
      setCurrentPage(0);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < chapter.pages.length) {
      setCurrentPage(newPage);
      
      // Salva progresso
      const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      progress[mangaId] = {
        ...progress[mangaId],
        page: newPage
      };
      localStorage.setItem('readingProgress', JSON.stringify(progress));
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

  const renderReader = () => {
    if (!chapter || !chapter.pages || chapter.pages.length === 0) {
      return (
        <Box textAlign="center" py={20}>
          <Text>Nessuna pagina disponibile</Text>
        </Box>
      );
    }

    // Modalità Webtoon
    if (settings.readingMode === 'webtoon') {
      return (
        <VStack spacing={0} bg="black">
          {chapter.pages.map((page, i) => (
            <Box key={i} w="100%" maxW="900px" mx="auto" position="relative">
              {imagesLoading[i] && (
                <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
                  <Spinner size="xl" color="purple.500" />
                </Box>
              )}
              <Image
                src={page}
                alt={`Page ${i + 1}`}
                width="100%"
                loading="lazy"
                style={{
                  filter: `brightness(${settings.brightness}%)`,
                }}
                onLoad={() => setImagesLoading(prev => ({ ...prev, [i]: false }))}
                onLoadStart={() => setImagesLoading(prev => ({ ...prev, [i]: true }))}
                onError={(e) => {
                  console.error(`Failed to load page ${i + 1}:`, page);
                  e.target.style.display = 'none';
                }}
              />
            </Box>
          ))}
        </VStack>
      );
    }

    // Modalità singola/doppia
    const pagesToShow = settings.readingMode === 'double' ? 2 : 1;
    const pages = [];
    
    for (let i = 0; i < pagesToShow && currentPage + i < chapter.pages.length; i++) {
      pages.push(chapter.pages[currentPage + i]);
    }

    return (
      <Flex
        bg="black"
        minH="calc(100vh - 128px)"
        align="center"
        justify="center"
        position="relative"
      >
        {pages.map((page, i) => (
          <Box
            key={currentPage + i}
            maxH="calc(100vh - 128px)"
            maxW={settings.readingMode === 'double' ? '50%' : '100%'}
            px={settings.readingMode === 'double' ? 1 : 0}
            position="relative"
          >
            {imagesLoading[currentPage + i] && (
              <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
                <Spinner size="xl" color="purple.500" />
              </Box>
            )}
            <Image
              src={page}
              alt={`Page ${currentPage + i + 1}`}
              maxHeight="calc(100vh - 128px)"
              objectFit="contain"
              style={{
                filter: `brightness(${settings.brightness}%)`,
                transform: `scale(${settings.zoom / 100})`
              }}
              onLoad={() => setImagesLoading(prev => ({ ...prev, [currentPage + i]: false }))}
              onLoadStart={() => setImagesLoading(prev => ({ ...prev, [currentPage + i]: true }))}
              onError={(e) => {
                console.error(`Failed to load page ${currentPage + i + 1}:`, page);
                toast({
                  title: 'Errore caricamento immagine',
                  description: `Impossibile caricare la pagina ${currentPage + i + 1}`,
                  status: 'error',
                  duration: 3000,
                });
              }}
            />
          </Box>
        ))}
        
        {/* Zone click per navigazione */}
        {settings.readingMode !== 'webtoon' && (
          <>
            <Box
              position="absolute"
              left={0}
              top={0}
              bottom={0}
              width="30%"
              cursor="pointer"
              onClick={() => handlePageChange(currentPage - pagesToShow)}
              _hover={{ bg: 'whiteAlpha.100' }}
            />
            <Box
              position="absolute"
              right={0}
              top={0}
              bottom={0}
              width="30%"
              cursor="pointer"
              onClick={() => handlePageChange(currentPage + pagesToShow)}
              _hover={{ bg: 'whiteAlpha.100' }}
            />
          </>
        )}
      </Flex>
    );
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" />
          <Text>Caricamento capitolo...</Text>
        </VStack>
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
                onClick={() => navigate(`/manga/${source}/${mangaId}`)}
                aria-label="Chiudi"
              />
              
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                  {manga?.title}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Capitolo {chapterIndex + 1}
                </Text>
              </VStack>
            </HStack>

            <HStack>
              <IconButton
                icon={<FaCog />}
                variant="ghost"
                colorScheme="whiteAlpha"
                onClick={() => setSettingsOpen(true)}
                aria-label="Impostazioni"
              />
              
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

      {/* Reader Content */}
      <Box pt={isFullscreen ? 0 : 16} pb={isFullscreen ? 0 : 16}>
        {renderReader()}
      </Box>

      {/* Footer Controls */}
      {!isFullscreen && settings.readingMode !== 'webtoon' && chapter?.pages && (
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
            <HStack w="100%" maxW="600px">
              <Text fontSize="sm" color="gray.400" minW="60px">
                {currentPage + 1}/{chapter.pages.length}
              </Text>
              
              <Slider
                value={currentPage}
                min={0}
                max={chapter.pages.length - 1}
                onChange={handlePageChange}
                flex={1}
              >
                <SliderTrack bg="gray.700">
                  <SliderFilledTrack bg="purple.500" />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
            </HStack>

            <HStack spacing={4}>
              <Button
                leftIcon={<FaArrowLeft />}
                variant="outline"
                colorScheme="whiteAlpha"
                onClick={() => navigateChapter(-1)}
                isDisabled={chapterIndex === 0}
                size="sm"
              >
                Precedente
              </Button>
              
              <Button
                rightIcon={<FaArrowRight />}
                variant="outline"
                colorScheme="whiteAlpha"
                onClick={() => navigateChapter(1)}
                isDisabled={chapterIndex >= (manga?.chapters?.length || 0) - 1}
                size="sm"
              >
                Successivo
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Settings Drawer */}
      <Drawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} placement="right">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerHeader>Impostazioni Reader</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Modalità lettura</FormLabel>
                <VStack align="stretch">
                  <Button
                    leftIcon={<FaBars />}
                    variant={settings.readingMode === 'single' ? 'solid' : 'outline'}
                    onClick={() => setSettings({...settings, readingMode: 'single'})}
                    size="sm"
                  >
                    Pagina singola
                  </Button>
                  <Button
                    leftIcon={<FaColumns />}
                    variant={settings.readingMode === 'double' ? 'solid' : 'outline'}
                    onClick={() => setSettings({...settings, readingMode: 'double'})}
                    size="sm"
                  >
                    Pagina doppia
                  </Button>
                  <Button
                    leftIcon={<FaAlignJustify />}
                    variant={settings.readingMode === 'webtoon' ? 'solid' : 'outline'}
                    onClick={() => setSettings({...settings, readingMode: 'webtoon'})}
                    size="sm"
                  >
                    Webtoon (Scroll)
                  </Button>
                </VStack>
              </FormControl>

              {settings.readingMode === 'webtoon' && (
                <FormControl>
                  <FormLabel>Scorrimento automatico</FormLabel>
                  <HStack>
                    <Switch
                      isChecked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                    <Text>Attivo</Text>
                  </HStack>
                  {autoScroll && (
                    <VStack align="stretch" mt={2}>
                      <Text fontSize="sm">Velocità: {scrollSpeed}%</Text>
                      <Slider
                        value={scrollSpeed}
                        min={10}
                        max={200}
                        onChange={setScrollSpeed}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </VStack>
                  )}
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Luminosità: {settings.brightness}%</FormLabel>
                <Slider
                  value={settings.brightness}
                  min={20}
                  max={100}
                  onChange={(val) => setSettings({...settings, brightness: val})}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel>Zoom: {settings.zoom}%</FormLabel>
                <Slider
                  value={settings.zoom}
                  min={50}
                  max={200}
                  onChange={(val) => setSettings({...settings, zoom: val})}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

export default ReaderPage;
