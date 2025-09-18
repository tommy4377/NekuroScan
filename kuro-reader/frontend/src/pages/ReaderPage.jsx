import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, Badge, DrawerCloseButton, Select
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaExpand, FaCompress, 
  FaTimes, FaCog, FaAlignJustify, FaBookmark, FaHome
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
  const [preloadedImages, setPreloadedImages] = useState({});
  
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [chapterId, source]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll && readingMode === 'webtoon') {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollBy({
            top: scrollSpeed / 10,
            behavior: 'smooth'
          });
          
          // Check if reached bottom
          const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 100) {
            setAutoScroll(false);
          }
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (readingMode === 'webtoon') {
        switch(e.key) {
          case ' ':
            e.preventDefault();
            setAutoScroll(prev => !prev);
            break;
          case 'ArrowUp':
            containerRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
            break;
          case 'ArrowDown':
            containerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
            break;
        }
        return;
      }
      
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
        case 's':
          setSettingsOpen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, readingMode, chapter]);

  // Save progress
  useEffect(() => {
    if (!manga || !chapter || !chapter.pages || chapter.pages.length === 0) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Save after 1 second of no page changes
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentPage, manga, chapter, chapterIndex]);

  const saveProgress = useCallback(() => {
    if (!manga || !chapter) return;
    
    // Save detailed progress
    const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
    readingProgress[manga.url] = {
      chapterId: chapter.url,
      chapterIndex: chapterIndex,
      chapterTitle: manga.chapters[chapterIndex]?.title || '',
      page: currentPage,
      totalPages: chapter.pages?.length || 0,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
    
    // Update reading list
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const existingIndex = reading.findIndex(r => r.url === manga.url);
    
    if (existingIndex !== -1) {
      reading[existingIndex] = {
        ...reading[existingIndex],
        lastChapterIndex: chapterIndex,
        lastChapterTitle: manga.chapters[chapterIndex]?.title || '',
        lastPage: currentPage,
        progress: Math.round((chapterIndex / manga.chapters.length) * 100),
        lastRead: new Date().toISOString()
      };
      localStorage.setItem('reading', JSON.stringify(reading));
    }
    
    // Check if chapter is completed
    if (currentPage >= chapter.pages.length - 1) {
      markChapterAsRead(chapterIndex);
    }
  }, [manga, chapter, chapterIndex, currentPage]);

  const markChapterAsRead = (chapIndex) => {
    const completed = JSON.parse(localStorage.getItem('completedChapters') || '{}');
    if (!completed[manga.url]) {
      completed[manga.url] = [];
    }
    if (!completed[manga.url].includes(chapIndex)) {
      completed[manga.url].push(chapIndex);
      localStorage.setItem('completedChapters', JSON.stringify(completed));
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorPages(new Set());
      setPreloadedImages({});
      
      const mangaUrl = atob(mangaId);
      const chapterUrl = atob(chapterId);
      
      // Load manga details
      const mangaData = await apiManager.getMangaDetails(mangaUrl, source);
      if (!mangaData) {
        throw new Error('Impossibile caricare i dettagli del manga');
      }
      setManga(mangaData);
      
      // Load chapter
      const chapterData = await apiManager.getChapter(chapterUrl, source);
      
      if (!chapterData) {
        throw new Error('Impossibile caricare il capitolo');
      }
      
      if (!chapterData.pages || chapterData.pages.length === 0) {
        throw new Error('Nessuna pagina trovata nel capitolo');
      }
      
      setChapter(chapterData);
      
      // Restore last page read
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      const progress = readingProgress[mangaUrl];
      
      let startPage = 0;
      if (progress && progress.chapterId === chapterUrl && progress.page) {
        startPage = Math.min(progress.page, chapterData.pages.length - 1);
        
        // Ask user if they want to continue from last page
        if (progress.page > 0 && progress.page < chapterData.pages.length - 1) {
          toast({
            title: `Continua da pagina ${progress.page + 1}?`,
            status: 'info',
            duration: 5000,
            isClosable: true,
            position: 'top',
          });
        }
      }
      
      setCurrentPage(startPage);
      
      // Detect if it's a webtoon/manhwa
      if (chapterData.pages.length > 0) {
        detectReadingMode(chapterData.pages[0]);
      }
      
      // Preload first pages
      preloadImages(startPage, chapterData.pages);
      
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

  const detectReadingMode = (firstPageUrl) => {
    if (!firstPageUrl) return;
    
    const img = new Image();
    img.onload = function() {
      const aspectRatio = this.width / this.height;
      if (aspectRatio < 0.6) {
        // It's likely a webtoon/manhwa
        setReadingMode('webtoon');
        setFitMode('width');
      } else {
        // Regular manga
        const savedMode = localStorage.getItem('preferredReadingMode') || 'single';
        setReadingMode(savedMode);
      }
    };
    img.src = firstPageUrl;
  };

  const preloadImages = (startIndex, pages) => {
    if (!pages || pages.length === 0) return;
    
    const preloadCount = 5;
    for (let i = startIndex; i < Math.min(startIndex + preloadCount, pages.length); i++) {
      const img = new Image();
      img.onload = () => {
        setPreloadedImages(prev => ({ ...prev, [i]: true }));
      };
      img.src = pages[i];
    }
  };

  const navigateChapter = async (direction) => {
    if (!manga?.chapters) return;
    
    const newIndex = chapterIndex + direction;
    if (newIndex >= 0 && newIndex < manga.chapters.length) {
      // Save current progress before navigating
      saveProgress();
      
      const newChapter = manga.chapters[newIndex];
      const newChapterId = btoa(newChapter.url);
      navigate(`/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
    } else {
      toast({
        title: direction > 0 ? 'Ultimo capitolo raggiunto' : 'Primo capitolo raggiunto',
        status: 'info',
        duration: 2000,
      });
      
      if (direction > 0) {
        // Suggest going back to manga details
        setTimeout(() => {
          navigate(`/manga/${source}/${mangaId}`);
        }, 2000);
      }
    }
  };

  const changePage = (direction) => {
    if (!chapter?.pages) return;
    
    const pagesToSkip = readingMode === 'double' ? 2 : 1;
    const newPage = currentPage + (direction * pagesToSkip);
    
    if (newPage >= 0 && newPage < chapter.pages.length) {
      setCurrentPage(newPage);
      preloadImages(newPage, chapter.pages);
    } else if (newPage >= chapter.pages.length) {
      // Chapter completed
      if (chapterIndex < manga.chapters.length - 1) {
        toast({
          title: 'Capitolo completato!',
          description: 'Passaggio al capitolo successivo...',
          status: 'success',
          duration: 2000,
        });
        setTimeout(() => navigateChapter(1), 1500);
      } else {
        toast({
          title: 'Manga completato!',
          description: 'Hai raggiunto l\'ultimo capitolo',
          status: 'success',
          duration: 3000,
        });
      }
    } else if (newPage < 0 && chapterIndex > 0) {
      navigateChapter(-1);
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
    
    // Save preference
    localStorage.setItem('preferredReadingMode', nextMode);
    
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

  const retryImage = (pageIndex) => {
    setErrorPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageIndex);
      return newSet;
    });
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
          onScroll={(e) => {
            // Update current page based on scroll position
            const container = e.target;
            const scrollPercentage = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
            const estimatedPage = Math.floor((scrollPercentage / 100) * chapter.pages.length);
            if (estimatedPage !== currentPage && estimatedPage >= 0 && estimatedPage < chapter.pages.length) {
              setCurrentPage(estimatedPage);
            }
          }}
        >
          <VStack spacing={0} width="100%">
            {chapter.pages.map((page, i) => (
              <Box 
                key={i} 
                width="100%"
                display="flex"
                justifyContent="center"
                bg="black"
                id={`page-${i}`}
              >
                {errorPages.has(i) ? (
                  <Box bg="gray.800" p={8} textAlign="center" width="100%">
                    <Text color="gray.400">Errore caricamento pagina {i + 1}</Text>
                    <Button 
                      mt={2} 
                      size="sm" 
                      onClick={() => retryImage(i)}
                    >
                      Riprova
                    </Button>
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

    // Single/Double page mode
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
                {imageLoading && !errorPages.has(pageIndex) && !preloadedImages[pageIndex] && (
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
                        retryImage(pageIndex);
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

  const pageProgress = chapter?.pages ? Math.round((currentPage / chapter.pages.length) * 100) : 0;

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
            onClick={() => {
              saveProgress();
              navigate(`/manga/${source}/${mangaId}`);
            }}
            aria-label="Chiudi reader"
          />
          <IconButton
            icon={<FaHome />}
            variant="solid"
            colorScheme="blackAlpha"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={() => {
              saveProgress();
              navigate('/home');
            }}
            aria-label="Home"
          />
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

      {/* Page indicator */}
      {chapter?.pages && (
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
          <VStack spacing={1}>
            <Text fontSize="sm">
              Pagina {currentPage + 1} / {chapter.pages.length}
            </Text>
            <Progress value={pageProgress} size="xs" colorScheme="purple" width="100px" />
          </VStack>
        </Box>
      )}

      {/* Settings Drawer */}
      <Drawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} placement="right" size="sm">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerCloseButton />
          <DrawerHeader>Impostazioni Reader</DrawerHeader>
          <DrawerBody>
            <VStack spacing={6} align="stretch">
              {/* Reading Mode */}
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

              {/* Fit Mode */}
              <FormControl>
                <FormLabel>Adattamento immagine</FormLabel>
                <Select
                  value={fitMode}
                  onChange={(e) => setFitMode(e.target.value)}
                  bg="gray.800"
                >
                  <option value="height">Adatta altezza</option>
                  <option value="width">Adatta larghezza</option>
                  <option value="original">Dimensione originale</option>
                </Select>
              </FormControl>

              {/* Auto Scroll (Webtoon only) */}
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

              {/* Zoom */}
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

              {/* Chapter Navigation */}
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
                  <HStack justify="center">
                    <Text fontSize="sm">
                      Capitolo {chapterIndex + 1} / {manga?.chapters?.length || 0}
                    </Text>
                  </HStack>
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

              {/* Current Manga Info */}
              {manga && (
                <Box bg="gray.800" p={3} borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                    {manga.title}
                  </Text>
                  <Text fontSize="xs" color="gray.400" noOfLines={2}>
                    {manga.chapters?.[chapterIndex]?.title}
                  </Text>
                  <Badge colorScheme="purple" mt={2}>
                    Pagina {currentPage + 1} / {chapter?.pages?.length || 0}
                  </Badge>
                </Box>
              )}

              {/* Keyboard Shortcuts */}
              <Box bg="gray.800" p={3} borderRadius="md">
                <Text fontSize="xs" fontWeight="bold" mb={2}>Scorciatoie tastiera:</Text>
                <VStack align="start" spacing={1}>
                  {readingMode === 'webtoon' ? (
                    <>
                      <Text fontSize="xs">Spazio: Play/Pausa auto-scroll</Text>
                      <Text fontSize="xs">↑ ↓: Scorri su/giù</Text>
                    </>
                  ) : (
                    <>
                      <Text fontSize="xs">← →: Pagina precedente/successiva</Text>
                      <Text fontSize="xs">Spazio: Pagina successiva</Text>
                    </>
                  )}
                  <Text fontSize="xs">F: Schermo intero</Text>
                  <Text fontSize="xs">M: Cambia modalità</Text>
                  <Text fontSize="xs">S: Apri impostazioni</Text>
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
