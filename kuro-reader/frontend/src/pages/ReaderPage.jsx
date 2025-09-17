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
  FaTimes, FaCog, FaAlignJustify
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
  const [fitMode, setFitMode] = useState('height');
  
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

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (readingMode === 'webtoon') return;
      
      switch(e.key) {
        case 'ArrowLeft':
          changePage(-1);
          break;
        case 'ArrowRight':
          changePage(1);
          break;
        case ' ':
          e.preventDefault();
          changePage(1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          cycleReadingMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, readingMode, chapter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorPages(new Set());
      
      const mangaUrl = atob(mangaId);
      const chapterUrl = atob(chapterId);
      
      const mangaData = await apiManager.getMangaDetails(mangaUrl, source);
      if (!mangaData) {
        throw new Error('Impossibile caricare i dettagli del manga');
      }
      setManga(mangaData);
      
      const chapterData = await apiManager.getChapter(chapterUrl, source);
      
      if (!chapterData) {
        throw new Error('Impossibile caricare il capitolo');
      }
      
      if (!chapterData.pages || chapterData.pages.length === 0) {
        throw new Error('Nessuna pagina trovata nel capitolo');
      }
      
      setChapter(chapterData);
      setCurrentPage(0);
      
      if (chapterData.pages.length > 0) {
        detectManhwa(chapterData.pages[0]);
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
      
      setTimeout(() => {
        navigate(`/manga/${source}/${mangaId}`);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const detectManhwa = (firstPageUrl) => {
    if (!firstPageUrl) return;
    
    const img = document.createElement('img');
    img.onload = function() {
      const aspectRatio = this.width / this.height;
      if (aspectRatio < 0.6) {
        setReadingMode('webtoon');
        setFitMode('width');
      }
    };
    img.src = firstPageUrl;
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
    if (!chapter?.pages) return;
    
    const pagesToSkip = readingMode === 'double' ? 2 : 1;
    const newPage = currentPage + (direction * pagesToSkip);
    
    if (newPage >= 0 && newPage < chapter.pages.length) {
      setCurrentPage(newPage);
      preloadImages(newPage);
    } else if (newPage >= chapter.pages.length && chapterIndex < manga.chapters.length - 1) {
      navigateChapter(1);
    } else if (newPage < 0 && chapterIndex > 0) {
      navigateChapter(-1);
    }
  };

  const preloadImages = (currentIndex) => {
    if (!chapter?.pages) return;
    
    for (let i = currentIndex + 1; i <= Math.min(currentIndex + 3, chapter.pages.length - 1); i++) {
      const img = document.createElement('img');
      img.src = chapter.pages[i];
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
      setIsFullscreen(false);
    }
  };

  const cycleReadingMode = () => {
    const modes = ['single', 'double', 'webtoon'];
    const currentIndex = modes.indexOf(readingMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setReadingMode(nextMode);
    
    if (nextMode === 'webtoon') {
      setFitMode('width');
    } else if (nextMode === 'double') {
      setFitMode('height');
      if (currentPage % 2 !== 0) {
        setCurrentPage(currentPage - 1);
      }
    } else {
      setFitMode('height');
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
        return <FaAlignJustify />;
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
        <Box
          ref={containerRef}
          bg="black"
          height="100vh"
          overflowY="auto"
          overflowX="hidden"
          pb={20}
        >
          <VStack spacing={0} width="100%">
            {chapter.pages.map((page, i) => (
              <Box 
                key={i} 
                width="100%"
                display="flex"
                justifyContent="center"
                bg="black"
              >
                {errorPages.has(i) ? (
                  <Box bg="gray.800" p={8} textAlign="center" width="100%">
                    <Text color="gray.400">Errore caricamento pagina {i + 1}</Text>
                  </Box>
                ) : (
                  <Image
                    src={page}
                    alt={`Page ${i + 1}`}
                    width="auto"
                    maxW={fitMode === 'width' ? '100%' : '900px'}
                    height="auto"
                    style={{ 
                      transform: `scale(${imageScale / 100})`,
                      transformOrigin: 'top center',
                      display: 'block'
                    }}
                    onError={() => handleImageError(i)}
                    loading="lazy"
                  />
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      );
    }

    let pagesToShow = readingMode === 'double' ? 2 : 1;
    
    if (readingMode === 'double' && currentPage === chapter.pages.length - 1) {
      pagesToShow = 1;
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
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const clickZone = rect.width * 0.3;
          
          if (x < clickZone) {
            changePage(-1);
          } else if (x > rect.width - clickZone) {
            changePage(1);
          }
        }}
        cursor="pointer"
        overflow="hidden"
      >
        <HStack spacing={0} height="100vh" width="100%" justifyContent="center">
          {[...Array(Math.min(pagesToShow, chapter.pages.length - currentPage))].map((_, i) => {
            const pageIndex = currentPage + i;
            if (pageIndex >= chapter.pages.length) return null;
            
            return (
              <Box 
                key={pageIndex}
                height="100vh"
                flex={readingMode === 'double' ? 1 : 'none'}
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
                maxW={readingMode === 'double' ? '50%' : '100%'}
              >
                {imageLoading && !errorPages.has(pageIndex) && (
                  <Spinner 
                    position="absolute" 
                    size="xl" 
                    color="purple.500"
                    zIndex={1}
                  />
                )}
                
                {errorPages.has(pageIndex) ? (
                  <Box 
                    bg="gray.800" 
                    p={8} 
                    textAlign="center"
                    borderRadius="md"
                  >
                    <Text color="gray.400">Errore caricamento pagina {pageIndex + 1}</Text>
                    <Button 
                      mt={2} 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setErrorPages(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(pageIndex);
                          return newSet;
                        });
                      }}
                    >
                      Riprova
                    </Button>
                  </Box>
                ) : (
                  <Image
                    src={chapter.pages[pageIndex]}
                    alt={`Page ${pageIndex + 1}`}
                    height={fitMode === 'height' ? '100vh' : 'auto'}
                    width={fitMode === 'width' ? '100%' : 'auto'}
                    maxH="100vh"
                    maxW={readingMode === 'double' ? '100%' : '100vw'}
                    objectFit="contain"
                    style={{ 
                      transform: `scale(${imageScale / 100})`,
                      transformOrigin: 'center',
                      display: 'block'
                    }}
                    onLoadStart={() => setImageLoading(true)}
                    onLoad={() => setImageLoading(false)}
                    onError={() => handleImageError(pageIndex)}
                  />
                )}
              </Box>
            );
          })}
        </HStack>
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
      {/* Top controls */}
      <HStack 
        position="fixed" 
        top={4} 
        left={4} 
        right={4} 
        zIndex={1001}
        justify="space-between"
      >
        <HStack>
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
          {/* Logo cliccabile per tornare alla home */}
          <Box
            as="button"
            onClick={() => navigate('/home')}
            bg="blackAlpha.700"
            p={2}
            borderRadius="full"
            transition="all 0.2s"
            _hover={{ bg: 'blackAlpha.600', transform: 'scale(1.05)' }}
          >
            <Image 
              src="/web-app-manifest-512x512.png" 
              boxSize="35px"
              fallbackSrc="https://via.placeholder.com/35" 
            />
          </Box>
        </HStack>

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
      </HStack>

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
            opacity={0.7}
            _hover={{ opacity: 1 }}
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
            opacity={0.7}
            _hover={{ opacity: 1 }}
          />
        </>
      )}

      {/* Page indicator solo */}
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

              <FormControl>
                <FormLabel>Adattamento immagine</FormLabel>
                <VStack align="stretch">
                  <Button
                    variant={fitMode === 'height' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setFitMode('height')}
                    size="sm"
                  >
                    Adatta altezza
                  </Button>
                  <Button
                    variant={fitMode === 'width' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setFitMode('width')}
                    size="sm"
                  >
                    Adatta larghezza
                  </Button>
                  <Button
                    variant={fitMode === 'original' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setFitMode('original')}
                    size="sm"
                  >
                    Dimensione originale
                  </Button>
                </VStack>
              </FormControl>

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

              <FormControl>
                <FormLabel>Zoom: {imageScale}%</FormLabel>
                <Slider
                  value={imageScale}
                  min={50}
                  max={200}
                  step={10}
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

              {manga && (
                <Box bg="gray.800" p={3} borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                    {manga.title}
                  </Text>
                  <Text fontSize="xs" color="gray.400" noOfLines={2}>
                    {manga.chapters?.[chapterIndex]?.title}
                  </Text>
                </Box>
              )}

              <Box bg="gray.800" p={3} borderRadius="md">
                <Text fontSize="xs" fontWeight="bold" mb={2}>Scorciatoie tastiera:</Text>
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs">← → : Pagina precedente/successiva</Text>
                  <Text fontSize="xs">Spazio: Pagina successiva</Text>
                  <Text fontSize="xs">F: Schermo intero</Text>
                  <Text fontSize="xs">M: Cambia modalità</Text>
                </VStack>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {renderPages()}
    </Box>
  );
}

export default ReaderPage;
