import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Container
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
  const [errorPages, setErrorPages] = useState(new Set());
  
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
  }, [chapterId, source]);

  useEffect(() => {
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
      setErrorPages(new Set());
      
      // Decodifica gli ID
      const mangaUrl = atob(mangaId);
      const chapterUrl = atob(chapterId);
      
      console.log('Loading manga:', mangaUrl);
      console.log('Loading chapter:', chapterUrl);
      console.log('Source:', source);
      
      // Carica dettagli manga
      const mangaData = await apiManager.getMangaDetails(mangaUrl, source);
      if (!mangaData) {
        throw new Error('Impossibile caricare i dettagli del manga');
      }
      setManga(mangaData);
      
      // Carica capitolo
      const chapterData = await apiManager.getChapter(chapterUrl, source);
      
      if (!chapterData) {
        throw new Error('Impossibile caricare il capitolo');
      }
      
      if (!chapterData.pages || chapterData.pages.length === 0) {
        throw new Error('Nessuna pagina trovata nel capitolo');
      }
      
      console.log(`Loaded ${chapterData.pages.length} pages`);
      setChapter(chapterData);
      setCurrentPage(0);
      
      // Rileva se è un webtoon
      if (chapterData.pages.length > 0) {
        detectManhwa(chapterData.pages);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Errore caricamento',
        description: error.message || 'Impossibile caricare il capitolo',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      
      // Torna alla pagina del manga dopo 2 secondi
      setTimeout(() => {
        navigate(`/manga/${source}/${mangaId}`);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const detectManhwa = (pages) => {
    if (!pages || pages.length === 0) return;
    
    const img = new Image();
    img.src = pages[0];
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      // Se l'aspect ratio è molto verticale, è probabilmente un webtoon
      if (aspectRatio < 0.5) {
        setReadingMode('webtoon');
      }
    };
  };

  const navigateChapter = (direction) => {
    if (!manga?.chapters) return;
    
    const newIndex = chapterIndex + direction;
    if (newIndex >= 0 && newIndex < manga.chapters.length) {
      const newChapter = manga.chapters[newIndex];
      const newChapterId = btoa(newChapter.url);
      navigate(`/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
    } else {
      toast({
        title: direction > 0 ? 'Ultimo capitolo' : 'Primo capitolo',
        status: 'info',
        duration: 2000,
      });
    }
  };

  const changePage = (direction) => {
    const pagesToSkip = readingMode === 'double' ? 2 : 1;
    const newPage = currentPage + (direction * pagesToSkip);
    
    if (newPage >= 0 && newPage < chapter.pages.length) {
      setCurrentPage(newPage);
    } else if (newPage >= chapter.pages.length && chapterIndex < manga.chapters.length - 1) {
      // Vai al capitolo successivo
      navigateChapter(1);
    } else if (newPage < 0 && chapterIndex > 0) {
      // Vai al capitolo precedente
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

  const handleImageError = (pageIndex) => {
    setErrorPages(prev => new Set([...prev, pageIndex]));
    console.error(`Failed to load page ${pageIndex + 1}`);
  };

  const renderPages = () => {
    if (!chapter || !chapter.pages || chapter.pages.length === 0) {
      return (
        <Box bg="black" minH="100vh" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
            <Text color="white" fontSize="lg">Nessuna pagina disponibile</Text>
            <Button colorScheme="purple" onClick={() => navigate(`/manga/${source}/${mangaId}`)}>
              Torna al manga
            </Button>
          </VStack>
        </Box>
      );
    }

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
            <Box key={i} width="100%" maxW="900px" mx="auto" position="relative">
              {errorPages.has(i) ? (
                <Box bg="gray.800" p={8} textAlign="center">
                  <Text color="gray.400">Errore caricamento pagina {i + 1}</Text>
                </Box>
              ) : (
                <Image
                  src={page}
                  alt={`Page ${i + 1}`}
                  width="100%"
                  style={{ 
                    transform: `scale(${imageScale / 100})`,
                    transformOrigin: 'top center'
                  }}
                  onError={() => handleImageError(i)}
                />
              )}
            </Box>
          ))}
        </VStack>
      );
    }

    // Single/Double page mode
    let pagesToShow = 1;
    if (readingMode === 'double') {
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
        cursor="pointer"
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
              position="relative"
            >
              {imageLoading && !errorPages.has(pageIndex) && (
                <Spinner 
                  position="absolute" 
                  size="xl" 
                  color="purple.500"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                />
              )}
              
              {errorPages.has(pageIndex) ? (
                <Box 
                  bg="gray.800" 
                  p={8} 
                  textAlign="center"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="gray.400">Errore caricamento pagina {pageIndex + 1}</Text>
                </Box>
              ) : (
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
                  onError={() => handleImageError(pageIndex)}
                />
              )}
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
          <Text color="white">Caricamento capitolo...</Text>
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
          aria-label="Chiudi reader"
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
            aria-label="Impostazioni"
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
            aria-label="Modalità lettura"
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
            aria-label="Schermo intero"
          />
        </HStack>
      </Box>

      {/* Navigation arrows */}
      {readingMode !== 'webtoon' && chapter?.pages && (
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
            aria-label="Pagina precedente"
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
                      chapterIndex >= manga?.chapters?.length - 1}
            zIndex={1001}
            aria-label="Pagina successiva"
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
            Pagina {currentPage + 1} / {chapter.pages.length}
          </Text>
        </Box>
      )}

      {/* Chapter info */}
      {manga && (
        <Box
          position="fixed"
          top={20}
          left="50%"
          transform="translateX(-50%)"
          bg="blackAlpha.700"
          color="white"
          px={4}
          py={2}
          borderRadius="md"
          zIndex={1000}
        >
          <Text fontSize="sm" noOfLines={1}>
            {manga.chapters?.[chapterIndex]?.title || `Capitolo ${chapterIndex + 1}`}
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
                  <Text textAlign="center" fontSize="sm">
                    {chapterIndex + 1} / {manga?.chapters?.length || 0}
                  </Text>
                  <Button
                    size="sm"
                    rightIcon={<FaChevronRight />}
                    onClick={() => navigateChapter(1)}
                    isDisabled={!manga || chapterIndex >= manga.chapters.length - 1}
                  >
                    Capitolo successivo
                  </Button>
                </VStack>
              </FormControl>

              {/* Info capitolo */}
              {manga && (
                <Box bg="gray.800" p={3} borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold">
                    {manga.title}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    {manga.chapters?.[chapterIndex]?.title}
                  </Text>
                </Box>
              )}
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
