import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaExpand, FaCompress, 
  FaTimes, FaBars, FaColumns, FaAlignJustify, FaCog
} from 'react-icons/fa';
import { RiPagesFill, RiPagesLine } from 'react-icons/ri';
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
  const [readingMode, setReadingMode] = useState('single');
  const [imageLoading, setImageLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [imageScale, setImageScale] = useState(100);
  
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

  useEffect(() => {
    loadData();
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [chapterId]);

  useEffect(() => {
    // Auto-scroll per modalità webtoon
    if (autoScroll && readingMode === 'webtoon') {
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
  }, [autoScroll, scrollSpeed, readingMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const mangaUrl = atob(mangaId);
      const mangaData = await apiManager.getMangaDetails(mangaUrl, source);
      setManga(mangaData);
      
      const chapterUrl = atob(chapterId);
      const chapterData = await apiManager.getChapter(chapterUrl, source);
      
      if (!chapterData || !chapterData.pages || chapterData.pages.length === 0) {
        throw new Error('Nessuna pagina trovata');
      }
      
      setChapter(chapterData);
      setCurrentPage(0);
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Errore',
        description: error.message,
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
    }
  };

  const changePage = (direction) => {
    const pagesToSkip = readingMode === 'double' ? 2 : 1;
    const newPage = currentPage + (direction * pagesToSkip);
    
    if (newPage >= 0 && newPage < chapter.pages.length) {
      setCurrentPage(newPage);
    } else if (newPage >= chapter.pages.length && chapterIndex < manga.chapters.length - 1) {
      navigateChapter(1);
    } else if (newPage < 0 && chapterIndex > 0) {
      navigateChapter(-1);
    }
  };

  const toggleFullscreen = () => {
    const elem = document.documentElement;
    
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const cycleReadingMode = () => {
    const modes = ['single', 'double', 'webtoon'];
    const currentIndex = modes.indexOf(readingMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setReadingMode(nextMode);
    
    // Reset to valid page when switching modes
    if (nextMode === 'double' && currentPage % 2 !== 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getReadingModeIcon = () => {
    switch(readingMode) {
      case 'single':
        return <RiPagesFill />;
      case 'double':
        return <RiPagesLine />;
      case 'webtoon':
        return <FaAlignJustify />;
      default:
        return <FaBars />;
    }
  };

  const detectManhwa = () => {
    // Rileva se è un manhwa/webtoon dalle dimensioni delle pagine
    if (chapter?.pages?.length > 0) {
      const firstPage = new Image();
      firstPage.src = chapter.pages[0];
      firstPage.onload = () => {
        const aspectRatio = firstPage.width / firstPage.height;
        // Se l'aspect ratio è molto verticale (< 0.5), probabilmente è un webtoon
        if (aspectRatio < 0.5) {
          setReadingMode('webtoon');
        }
      };
    }
  };

  useEffect(() => {
    detectManhwa();
  }, [chapter]);

  const renderPages = () => {
    if (!chapter || !chapter.pages || chapter.pages.length === 0) return null;

    if (readingMode === 'webtoon') {
      return (
        <VStack 
          ref={containerRef}
          spacing={0} 
          bg="black" 
          pb={20}
          height="100vh"
          overflowY="auto"
        >
          {chapter.pages.map((page, i) => (
            <Image
              key={i}
              src={page}
              alt={`Page ${i + 1}`}
              width="100%"
              maxW="900px"
              mx="auto"
              style={{ 
                transform: `scale(${imageScale / 100})`,
                transformOrigin: 'top center'
              }}
            />
          ))}
        </VStack>
      );
    }

    // Calcola quante pagine mostrare
    let pagesToShow = 1;
    if (readingMode === 'double') {
      // Non mostrare 2 pagine se siamo all'ultima pagina dispari
      pagesToShow = Math.min(2, chapter.pages.length - currentPage);
    }
    
    return (
      <Box
        bg="black"
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
        onClick={(e) => {
          if (readingMode === 'webtoon') return;
          
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width * 0.3) {
            changePage(-1);
          } else if (x > rect.width * 0.7) {
            changePage(1);
          }
        }}
      >
        {[...Array(pagesToShow)].map((_, i) => {
          const pageIndex = currentPage + i;
          if (pageIndex >= chapter.pages.length) return null;
          
          return (
            <Box 
              key={pageIndex} 
              flex={pagesToShow > 1 ? 1 : 'none'}
              display="flex" 
              justifyContent="center"
              height="100vh"
              overflow="hidden"
            >
              {imageLoading && (
                <Spinner 
                  position="absolute" 
                  size="xl" 
                  color="purple.500"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                />
              )}
              <Image
                src={chapter.pages[pageIndex]}
                alt={`Page ${pageIndex + 1}`}
                maxH="100vh"
                maxW={pagesToShow > 1 ? "50vw" : "100vw"}
                objectFit="contain"
                style={{ 
                  transform: `scale(${imageScale / 100})`,
                  transformOrigin: 'center'
                }}
                onLoadStart={() => setImageLoading(true)}
                onLoad={() => setImageLoading(false)}
              />
            </Box>
          );
        })}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box bg="black" minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack>
          <Spinner size="xl" color="purple.500" />
          <Text color="white">Caricamento...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box bg="black" minH="100vh" position="relative">
      {/* Minimal floating controls */}
      <Box position="fixed" top={4} left={4} zIndex={1001}>
        <IconButton
          icon={<FaTimes />}
          variant="solid"
          colorScheme="blackAlpha"
          bg="blackAlpha.700"
          color="white"
          size="lg"
          borderRadius="full"
          onClick={() => navigate(`/manga/${source}/${mangaId}`)}
        />
      </Box>

      <Box position="fixed" top={4} right={4} zIndex={1001}>
        <HStack>
          <IconButton
            icon={<FaCog />}
            variant="solid"
            colorScheme="blackAlpha"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={() => setSettingsOpen(true)}
          />
          <IconButton
            icon={getReadingModeIcon()}
            variant="solid"
            colorScheme="blackAlpha"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={cycleReadingMode}
          />
          <IconButton
            icon={isFullscreen ? <FaCompress /> : <FaExpand />}
            variant="solid"
            colorScheme="blackAlpha"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={toggleFullscreen}
          />
        </HStack>
      </Box>

      {/* Navigation arrows */}
      {readingMode !== 'webtoon' && (
        <>
          <IconButton
            icon={<FaChevronLeft />}
            position="fixed"
            left={4}
            top="50%"
            transform="translateY(-50%)"
            variant="solid"
            colorScheme="blackAlpha"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={() => changePage(-1)}
            isDisabled={currentPage === 0 && chapterIndex === 0}
            zIndex={1001}
          />
          
          <IconButton
            icon={<FaChevronRight />}
            position="fixed"
            right={4}
            top="50%"
            transform="translateY(-50%)"
            variant="solid"
            colorScheme="blackAlpha"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={() => changePage(1)}
            isDisabled={currentPage >= chapter.pages.length - 1 && 
                      chapterIndex >= manga.chapters.length - 1}
            zIndex={1001}
          />
        </>
      )}

      {/* Page indicator */}
      {readingMode !== 'webtoon' && chapter?.pages && (
        <Box
          position="fixed"
          bottom={4}
          left="50%"
          transform="translateX(-50%)"
          bg="blackAlpha.700"
          color="white"
          px={4}
          py={2}
          borderRadius="full"
          zIndex={1001}
        >
          <Text fontSize="sm">
            {currentPage + 1} / {chapter.pages.length}
          </Text>
        </Box>
      )}

      {/* Settings Drawer */}
      <Drawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} placement="right">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerHeader>Impostazioni Reader</DrawerHeader>
          <DrawerBody>
            <VStack spacing={6} align="stretch">
              {/* Modalità lettura */}
              <FormControl>
                <FormLabel>Modalità lettura</FormLabel>
                <VStack align="stretch">
                  <Button
                    leftIcon={<RiPagesFill />}
                    variant={readingMode === 'single' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setReadingMode('single')}
                    size="sm"
                  >
                    Pagina singola
                  </Button>
                  <Button
                    leftIcon={<RiPagesLine />}
                    variant={readingMode === 'double' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setReadingMode('double')}
                    size="sm"
                  >
                    Pagina doppia
                  </Button>
                  <Button
                    leftIcon={<FaAlignJustify />}
                    variant={readingMode === 'webtoon' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setReadingMode('webtoon')}
                    size="sm"
                  >
                    Webtoon (Scroll verticale)
                  </Button>
                </VStack>
              </FormControl>

              {/* Auto-scroll per webtoon */}
              {readingMode === 'webtoon' && (
                <FormControl>
                  <FormLabel>Scorrimento automatico</FormLabel>
                  <HStack mb={2}>
                    <Switch
                      isChecked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      colorScheme="purple"
                    />
                    <Text>{autoScroll ? 'Attivo' : 'Disattivo'}</Text>
                  </HStack>
                  {autoScroll && (
                    <VStack align="stretch">
                      <Text fontSize="sm">Velocità: {scrollSpeed}%</Text>
                      <Slider
                        value={scrollSpeed}
                        min={10}
                        max={200}
                        onChange={setScrollSpeed}
                        colorScheme="purple"
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

              {/* Zoom immagine */}
              <FormControl>
                <FormLabel>Zoom: {imageScale}%</FormLabel>
                <Slider
                  value={imageScale}
                  min={50}
                  max={200}
                  onChange={setImageScale}
                  colorScheme="purple"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <Button 
                  size="xs" 
                  mt={2} 
                  onClick={() => setImageScale(100)}
                  variant="outline"
                >
                  Reset zoom
                </Button>
              </FormControl>

              {/* Navigazione capitoli */}
              <FormControl>
                <FormLabel>Navigazione capitoli</FormLabel>
                <VStack align="stretch">
                  <Button
                    size="sm"
                    leftIcon={<FaChevronLeft />}
                    onClick={() => navigateChapter(-1)}
                    isDisabled={chapterIndex === 0}
                  >
                    Capitolo precedente
                  </Button>
                  <Button
                    size="sm"
                    rightIcon={<FaChevronRight />}
                    onClick={() => navigateChapter(1)}
                    isDisabled={chapterIndex >= manga.chapters.length - 1}
                  >
                    Capitolo successivo
                  </Button>
                </VStack>
              </FormControl>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Content */}
      {renderPages()}
    </Box>
  );
}

export default ReaderPage;
