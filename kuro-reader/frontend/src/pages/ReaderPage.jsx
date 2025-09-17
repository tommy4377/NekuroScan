import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, HStack, IconButton, Select, Text, VStack,
  Button, useToast, Flex, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Menu, MenuButton, MenuList, MenuItem, Badge,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaArrowLeft, FaArrowRight, FaExpand, FaCompress, FaCog, FaTimes,
  FaPlay, FaPause, FaColumns, FaArrowsAltH, FaArrowsAltV, FaBars,
  FaAlignJustify, FaGripVertical
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
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('readerSettings');
    return saved ? JSON.parse(saved) : {
      readingMode: 'single', // single, double, webtoon
      orientation: 'horizontal', // horizontal, vertical
      zoom: 100,
      brightness: 100,
      fitMode: 'width',
      autoPlay: false,
      autoPlaySpeed: 5000
    };
  });

  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    loadChapter();
    loadManga();
    
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [chapterId]);

  useEffect(() => {
    // Auto-scroll per modalità webtoon
    if (autoScroll && settings.readingMode === 'webtoon') {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollBy({
            top: scrollSpeed / 10,
            behavior: 'smooth'
          });
        }
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

  // Auto-play per cambiare pagina automaticamente
  useEffect(() => {
    if (settings.autoPlay && settings.readingMode !== 'webtoon') {
      const interval = setInterval(() => {
        handleNextPage();
      }, settings.autoPlaySpeed);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoPlay, settings.autoPlaySpeed, currentPage]);

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
      
      // Salva progresso
      const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      progress[mangaId] = {
        chapterId,
        chapterIndex,
        page: currentPage,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('readingProgress', JSON.stringify(progress));
      
      // Aggiorna continua a leggere
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const mangaUrl = atob(mangaId);
      const existingIndex = reading.findIndex(r => r.url === mangaUrl);
      
      if (existingIndex !== -1) {
        reading[existingIndex].lastChapter = chapterIndex;
        reading[existingIndex].lastRead = new Date().toISOString();
      } else if (manga) {
        reading.unshift({
          url: mangaUrl,
          title: manga.title,
          cover: manga.coverUrl,
          type: manga.type,
          source: source,
          lastChapter: chapterIndex,
          lastRead: new Date().toISOString()
        });
      }
      
      localStorage.setItem('reading', JSON.stringify(reading.slice(0, 50)));
      
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

  const handleNextPage = () => {
    if (!chapter?.pages) return;
    
    const pagesToSkip = settings.readingMode === 'double' ? 2 : 1;
    
    if (currentPage + pagesToSkip < chapter.pages.length) {
      setCurrentPage(prev => prev + pagesToSkip);
    } else {
      // Vai al capitolo successivo
      navigateChapter(1);
    }
  };

  const handlePrevPage = () => {
    const pagesToSkip = settings.readingMode === 'double' ? 2 : 1;
    
    if (currentPage - pagesToSkip >= 0) {
      setCurrentPage(prev => prev - pagesToSkip);
    } else if (chapterIndex > 0) {
      // Vai al capitolo precedente
      navigateChapter(-1);
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
    if (!chapter) return null;
    
    // Modalità Webtoon - scroll verticale
    if (settings.readingMode === 'webtoon') {
      return (
        <VStack 
          ref={containerRef}
          spacing={0} 
          bg="black"
          height="calc(100vh - 128px)"
          overflowY="auto"
          style={{
            filter: `brightness(${settings.brightness}%)`,
          }}
        >
          {chapter.pages?.map((page, i) => (
            <Box key={i} w="100%" maxW="900px" mx="auto">
              <img
                src={page}
                alt={`Page ${i + 1}`}
                style={{ width: '100%' }}
                loading="lazy"
              />
            </Box>
          ))}
        </VStack>
      );
    }
    
    // Modalità pagina singola/doppia
    const pagesToShow = settings.readingMode === 'double' ? 2 : 1;
    const pages = [];
    
    for (let i = 0; i < pagesToShow; i++) {
      const pageIndex = currentPage + i;
      if (pageIndex < chapter.pages?.length) {
        pages.push(chapter.pages[pageIndex]);
      }
    }
    
    return (
      <Flex
        bg="black"
        minH="calc(100vh - 128px)"
        align="center"
        justify="center"
        direction={settings.orientation === 'vertical' ? 'column' : 'row'}
        onClick={(e) => {
          if (settings.orientation === 'horizontal') {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            
            if (x < width * 0.3) {
              handlePrevPage();
            } else if (x > width * 0.7) {
              handleNextPage();
            }
          }
        }}
        style={{
          filter: `brightness(${settings.brightness}%)`,
          cursor: 'pointer'
        }}
      >
        {pages.map((page, i) => (
          <Box
            key={currentPage + i}
            maxH="calc(100vh - 128px)"
            maxW={settings.readingMode === 'double' ? '50%' : '100%'}
            px={settings.readingMode === 'double' ? 1 : 0}
          >
            <img
              src={page}
              alt={`Page ${currentPage + i + 1}`}
              style={{
                maxHeight: 'calc(100vh - 128px)',
                maxWidth: '100%',
                objectFit: settings.fitMode,
                transform: `scale(${settings.zoom / 100})`
              }}
            />
          </Box>
        ))}
      </Flex>
    );
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Caricamento...</Text>
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
      {!isFullscreen && settings.readingMode !== 'webtoon' && (
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
            {chapter?.pages && (
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
                size="sm"
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
                size="sm"
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
              {/* Modalità lettura */}
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
                    Webtoon (Scroll verticale)
                  </Button>
                </VStack>
              </FormControl>

              {/* Orientamento (solo per pagina singola/doppia) */}
              {settings.readingMode !== 'webtoon' && (
                <FormControl>
                  <FormLabel>Orientamento</FormLabel>
                  <HStack>
                    <Button
                      leftIcon={<FaArrowsAltH />}
                      variant={settings.orientation === 'horizontal' ? 'solid' : 'outline'}
                      onClick={() => setSettings({...settings, orientation: 'horizontal'})}
                      size="sm"
                      flex={1}
                    >
                      Orizzontale
                    </Button>
                    <Button
                      leftIcon={<FaArrowsAltV />}
                      variant={settings.orientation === 'vertical' ? 'solid' : 'outline'}
                      onClick={() => setSettings({...settings, orientation: 'vertical'})}
                      size="sm"
                      flex={1}
                    >
                      Verticale
                    </Button>
                  </HStack>
                </FormControl>
              )}

              {/* Auto-scroll per webtoon */}
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

              {/* Auto-play per cambiare pagina */}
              {settings.readingMode !== 'webtoon' && (
                <FormControl>
                  <FormLabel>Cambio pagina automatico</FormLabel>
                  <HStack>
                    <Switch
                      isChecked={settings.autoPlay}
                      onChange={(e) => setSettings({...settings, autoPlay: e.target.checked})}
                    />
                    <Text>Attivo</Text>
                  </HStack>
                  {settings.autoPlay && (
                    <Select
                      value={settings.autoPlaySpeed}
                      onChange={(e) => setSettings({...settings, autoPlaySpeed: parseInt(e.target.value)})}
                      size="sm"
                      mt={2}
                    >
                      <option value={3000}>3 secondi</option>
                      <option value={5000}>5 secondi</option>
                      <option value={7000}>7 secondi</option>
                      <option value={10000}>10 secondi</option>
                    </Select>
                  )}
                </FormControl>
              )}

              {/* Luminosità */}
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

              {/* Zoom */}
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
