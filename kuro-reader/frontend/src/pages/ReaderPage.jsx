import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, Badge, DrawerCloseButton, Select,
  Divider, Tooltip
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaExpand, FaCompress, 
  FaTimes, FaCog, FaAlignJustify, FaBookmark, FaHome,
  FaArrowUp, FaArrowDown, FaRedo
} from 'react-icons/fa';
import { RiPagesFill, RiPagesLine } from 'react-icons/ri';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import apiManager from '../api';

function ReaderPage() {
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Stati principali
  const [chapter, setChapter] = useState(null);
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingMode, setReadingMode] = useState(() => 
    localStorage.getItem('preferredReadingMode') || 'single'
  );
  const [imageLoading, setImageLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [imageScale, setImageScale] = useState(100);
  const [errorPages, setErrorPages] = useState(new Set());
  const [fitMode, setFitMode] = useState(() => 
    localStorage.getItem('preferredFitMode') || 'height'
  );
  const [preloadedImages, setPreloadedImages] = useState({});
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  
  // Refs
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const imageRefs = useRef({});
  
  // Derivati
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
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, []);

  // Load data quando cambia capitolo
  useEffect(() => {
    loadData();
  }, [chapterId, source]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  // Auto scroll per webtoon
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
            toast({
              title: 'Fine capitolo raggiunta',
              status: 'info',
              duration: 2000,
            });
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
      // Ignora se il drawer è aperto
      if (settingsOpen) return;
      
      if (readingMode === 'webtoon') {
        switch(e.key) {
          case ' ':
            e.preventDefault();
            setAutoScroll(prev => !prev);
            break;
          case 'ArrowUp':
            e.preventDefault();
            containerRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
            break;
          case 'ArrowDown':
            e.preventDefault();
            containerRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
            break;
          case 'Home':
            e.preventDefault();
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          case 'End':
            e.preventDefault();
            containerRef.current?.scrollTo({ 
              top: containerRef.current.scrollHeight, 
              behavior: 'smooth' 
            });
            break;
        }
      } else {
        switch(e.key) {
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault();
            changePage(-1);
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            e.preventDefault();
            changePage(1);
            break;
          case ' ':
            e.preventDefault();
            changePage(1);
            break;
          case 'Home':
            e.preventDefault();
            setCurrentPage(0);
            break;
          case 'End':
            e.preventDefault();
            if (chapter?.pages) {
              setCurrentPage(chapter.pages.length - 1);
            }
            break;
        }
      }
      
      // Comandi globali
      switch(e.key) {
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          cycleReadingMode();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          setSettingsOpen(prev => !prev);
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            navigate(`/manga/${source}/${mangaId}`);
          }
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          addBookmark();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          window.location.reload();
          break;
        case '[':
          e.preventDefault();
          navigateChapter(-1);
          break;
        case ']':
          e.preventDefault();
          navigateChapter(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, readingMode, chapter, settingsOpen, isFullscreen]);

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

  // Preload images
  useEffect(() => {
    if (!chapter?.pages) return;
    preloadImages(currentPage, chapter.pages);
  }, [currentPage, chapter]);

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
    
    const readingItem = {
      url: manga.url,
      title: manga.title,
      cover: manga.coverUrl,
      type: manga.type,
      source: manga.source || source,
      lastChapterIndex: chapterIndex,
      lastChapterTitle: manga.chapters[chapterIndex]?.title || '',
      lastPage: currentPage,
      progress: Math.round((chapterIndex / manga.chapters.length) * 100),
      lastRead: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
      reading[existingIndex] = readingItem;
    } else {
      reading.unshift(readingItem);
    }
    
    localStorage.setItem('reading', JSON.stringify(reading.slice(0, 100)));
    
    // Check if chapter is completed
    if (currentPage >= chapter.pages.length - 1) {
      markChapterAsRead(chapterIndex);
    }
  }, [manga, chapter, chapterIndex, currentPage, source]);

  const markChapterAsRead = (chapIndex) => {
    if (!manga) return;
    
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
            title: `Continua da pagina ${progress.page + 1}`,
            status: 'info',
            duration: 3000,
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
    
    const img = document.createElement('img');
    img.onload = function() {
      const aspectRatio = this.width / this.height;
      if (aspectRatio < 0.6) {
        // It's likely a webtoon/manhwa
        setReadingMode('webtoon');
        setFitMode('width');
      } else {
        // Regular manga - use saved preference
        const savedMode = localStorage.getItem('preferredReadingMode');
        if (savedMode) {
          setReadingMode(savedMode);
        }
      }
    };
    img.src = firstPageUrl;
  };

  const preloadImages = (startIndex, pages) => {
    if (!pages || pages.length === 0) return;
    
    const preloadCount = readingMode === 'webtoon' ? 10 : 5;
    for (let i = startIndex; i < Math.min(startIndex + preloadCount, pages.length); i++) {
      if (!preloadedImages[i]) {
        const img = document.createElement('img');
        img.onload = () => {
          setPreloadedImages(prev => ({ ...prev, [i]: true }));
        };
        img.src = pages[i];
      }
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
      if (direction > 0) {
        toast({
          title: 'Ultimo capitolo raggiunto',
          description: 'Hai completato il manga!',
          status: 'success',
          duration: 3000,
        });
        
        // Mark manga as completed
        const completed = JSON.parse(localStorage.getItem('completed') || '[]');
        if (!completed.find(c => c.url === manga.url)) {
          completed.unshift({
            url: manga.url,
            title: manga.title,
            cover: manga.coverUrl,
            completedAt: new Date().toISOString()
          });
          localStorage.setItem('completed', JSON.stringify(completed));
        }
        
        setTimeout(() => {
          navigate(`/manga/${source}/${mangaId}`);
        }, 2000);
      } else {
        toast({
          title: 'Primo capitolo',
          status: 'info',
          duration: 2000,
        });
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
    } else if (newPage < 0) {
      if (chapterIndex > 0) {
        navigateChapter(-1);
      }
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
    
    // Save preference
    localStorage.setItem('preferredReadingMode', nextMode);
    
    if (nextMode === 'webtoon') {
      setFitMode('width');
    } else if (nextMode === 'double') {
      setFitMode('height');
      // Adjust to even page number for double mode
      if (currentPage % 2 !== 0) {
        setCurrentPage(currentPage - 1);
      }
    } else {
      setFitMode('height');
    }
    
    toast({
      title: `Modalità: ${nextMode === 'single' ? 'Pagina singola' : 
              nextMode === 'double' ? 'Pagina doppia' : 'Webtoon'}`,
      status: 'info',
      duration: 1500,
    });
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
    // Force reload
    if (imageRefs.current[pageIndex]) {
      const img = imageRefs.current[pageIndex];
      const src = img.src;
      img.src = '';
      setTimeout(() => {
        img.src = src;
      }, 100);
    }
  };

  const addBookmark = () => {
    if (!manga) return;
    
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    const existingIndex = bookmarks.findIndex(b => 
      b.mangaUrl === manga.url && b.chapterIndex === chapterIndex
    );
    
    if (existingIndex === -1) {
      bookmarks.push({
        mangaUrl: manga.url,
        mangaTitle: manga.title,
        chapterIndex,
        chapterTitle: manga.chapters[chapterIndex]?.title || '',
        page: currentPage,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
      toast({
        title: 'Segnalibro aggiunto',
        status: 'success',
        duration: 2000,
      });
    } else {
      toast({
        title: 'Segnalibro già presente',
        status: 'info',
        duration: 2000,
      });
    }
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
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#1a1a1a',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#4a4a4a',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#6a6a6a',
            },
          }}
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
                    <Text color="gray.400" mb={2}>
                      Errore caricamento pagina {i + 1}
                    </Text>
                    <Button 
                      size="sm" 
                      colorScheme="purple"
                      onClick={() => retryImage(i)}
                    >
                      Riprova
                    </Button>
                  </Box>
                ) : (
                  <Image
                    ref={el => imageRefs.current[i] = el}
                    src={page}
                    alt={`Page ${i + 1}`}
                    width="auto"
                    maxW={fitMode === 'width' ? '100%' : '900px'}
                    height="auto"
                    style={{ 
                      transform: `scale(${imageScale / 100})`,
                      transformOrigin: 'top center',
                      display: 'block',
                      filter: `brightness(${brightness}%) contrast(${contrast}%)`
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
    
    // Show single page if it's the last page
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
          // Click navigation only on specific zones
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
                    <Text color="gray.400" mb={2}>
                      Errore caricamento pagina {pageIndex + 1}
                    </Text>
                    <Button 
                      size="sm" 
                      colorScheme="purple"
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
                    ref={el => imageRefs.current[pageIndex] = el}
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
                      display: 'block',
                      filter: `brightness(${brightness}%) contrast(${contrast}%)`
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
        
        {/* Click zones indicator */}
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width="30%"
          opacity={0}
          transition="opacity 0.2s"
          _hover={{ opacity: 0.1 }}
          bg="white"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          right={0}
          top={0}
          bottom={0}
          width="30%"
          opacity={0}
          transition="opacity 0.2s"
          _hover={{ opacity: 0.1 }}
          bg="white"
          pointerEvents="none"
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box bg="black" minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="white" fontSize="lg">Caricamento capitolo...</Text>
        </VStack>
      </Box>
    );
  }

  const pageProgress = chapter?.pages ? Math.round(((currentPage + 1) / chapter.pages.length) * 100) : 0;
  const chapterProgress = manga?.chapters ? Math.round(((chapterIndex + 1) / manga.chapters.length) * 100) : 0;

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
        opacity={showControls ? 1 : 0}
        transition="opacity 0.3s"
        pointerEvents={showControls ? 'auto' : 'none'}
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
          <IconButton
            icon={<FaBookmark />}
            variant="solid"
            colorScheme="blackAlpha"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={addBookmark}
            aria-label="Aggiungi segnalibro"
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
            icon={isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
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
            onClick={(e) => {
              e.stopPropagation();
              changePage(-1);
            }}
            isDisabled={currentPage === 0 && chapterIndex === 0}
            zIndex={1001}
            aria-label="Pagina precedente"
            opacity={showControls ? 0.7 : 0}
            _hover={{ opacity: 1 }}
            transition="opacity 0.3s"
            pointerEvents={showControls ? 'auto' : 'none'}
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
            onClick={(e) => {
              e.stopPropagation();
              changePage(1);
            }}
            isDisabled={currentPage >= chapter.pages.length - 1 && 
                      chapterIndex >= manga?.chapters?.length - 1}
            zIndex={1001}
            aria-label="Pagina successiva"
            opacity={showControls ? 0.7 : 0}
            _hover={{ opacity: 1 }}
            transition="opacity 0.3s"
            pointerEvents={showControls ? 'auto' : 'none'}
          />
        </>
      )}

      {/* Bottom info bar */}
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="blackAlpha.800"
        color="white"
        px={4}
        py={2}
        zIndex={1001}
        opacity={showControls ? 1 : 0}
        transition="opacity 0.3s"
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        <VStack spacing={1}>
          <HStack justify="space-between" width="100%">
            <Text fontSize="sm" noOfLines={1}>
              {manga?.title}
            </Text>
            <Badge colorScheme="purple">
              Cap. {chapterIndex + 1}/{manga?.chapters?.length || 0}
            </Badge>
          </HStack>
          <HStack justify="space-between" width="100%">
            <Text fontSize="xs" color="gray.400" noOfLines={1}>
          Capitolo {chapterIndex + 1}
            </Text>
            <Text fontSize="xs">
              Pagina {currentPage + 1}/{chapter?.pages?.length || 0}
            </Text>
          </HStack>
          <Progress value={pageProgress} size="xs" colorScheme="purple" width="100%" />
        </VStack>
      </Box>

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
                    onClick={() => {
                      setReadingMode('single');
                      localStorage.setItem('preferredReadingMode', 'single');
                    }}
                    size="sm"
                  >
                    Pagina singola
                  </Button>
                  <Button
                    leftIcon={<RiPagesLine />}
                    variant={readingMode === 'double' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => {
                      setReadingMode('double');
                      localStorage.setItem('preferredReadingMode', 'double');
                      if (currentPage % 2 !== 0) {
                        setCurrentPage(currentPage - 1);
                      }
                    }}
                    size="sm"
                  >
                    Pagina doppia
                  </Button>
                  <Button
                    leftIcon={<FaAlignJustify />}
                    variant={readingMode === 'webtoon' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => {
                      setReadingMode('webtoon');
                      localStorage.setItem('preferredReadingMode', 'webtoon');
                    }}
                    size="sm"
                  >
                    Webtoon (Scroll verticale)
                  </Button>
                </VStack>
              </FormControl>

              <Divider />

              {/* Fit Mode */}
              <FormControl>
                <FormLabel>Adattamento immagine</FormLabel>
                <Select
                  value={fitMode}
                  onChange={(e) => {
                    setFitMode(e.target.value);
                    localStorage.setItem('preferredFitMode', e.target.value);
                  }}
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

              <Divider />

              {/* Image adjustments */}
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
                <FormLabel>Luminosità: {brightness}%</FormLabel>
                <Slider
                  value={brightness}
                  min={20}
                  max={150}
                  onChange={setBrightness}
                  colorScheme="purple"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel>Contrasto: {contrast}%</FormLabel>
                <Slider
                  value={contrast}
                  min={50}
                  max={150}
                  onChange={setContrast}
                  colorScheme="purple"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setImageScale(100);
                  setBrightness(100);
                  setContrast(100);
                }}
              >
                Reset impostazioni immagine
              </Button>

              <Divider />

              {/* Chapter Navigation */}
              <FormControl>
                <FormLabel>Navigazione capitoli</FormLabel>
                <VStack align="stretch" spacing={2}>
                  <Button
                    size="sm"
                    leftIcon={<FaChevronLeft />}
                    onClick={() => navigateChapter(-1)}
                    isDisabled={chapterIndex === 0}
                  >
                    Capitolo precedente
                  </Button>
                  
                  <Select
                    value={chapterIndex}
                    onChange={(e) => {
                      const newIndex = parseInt(e.target.value);
                      if (manga?.chapters?.[newIndex]) {
                        saveProgress();
                        const newChapter = manga.chapters[newIndex];
                        const newChapterId = btoa(newChapter.url);
                        navigate(`/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
                      }
                    }}
                    bg="gray.800"
                    size="sm"
                  >
                    {manga?.chapters?.map((ch, i) => (
                      <option key={i} value={i}>
                        Cap. {i + 1}: {ch.title}
                      </option>
                    ))}
                  </Select>
                  
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

              <Divider />

              {/* Current Manga Info */}
              {manga && (
                <Box bg="gray.800" p={3} borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                    {manga.title}
                  </Text>
                  <Text fontSize="xs" color="gray.400" noOfLines={2} mt={1}>
                    {manga.chapters?.[chapterIndex]?.title}
                  </Text>
                  <HStack mt={2} spacing={2}>
                    <Badge colorScheme="purple">
                      Pagina {currentPage + 1}/{chapter?.pages?.length || 0}
                    </Badge>
                    <Badge colorScheme="green">
                      Progresso: {chapterProgress}%
                    </Badge>
                  </HStack>
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
                      <Text fontSize="xs">Home/End: Inizio/Fine capitolo</Text>
                    </>
                  ) : (
                    <>
                      <Text fontSize="xs">← → / A D: Pagina precedente/successiva</Text>
                      <Text fontSize="xs">Spazio: Pagina successiva</Text>
                      <Text fontSize="xs">Home/End: Prima/Ultima pagina</Text>
                    </>
                  )}
                  <Text fontSize="xs">F: Schermo intero</Text>
                  <Text fontSize="xs">M: Cambia modalità</Text>
                  <Text fontSize="xs">S: Apri impostazioni</Text>
                  <Text fontSize="xs">B: Aggiungi segnalibro</Text>
                  <Text fontSize="xs">[ ]: Capitolo prec/succ</Text>
                  <Text fontSize="xs">R: Ricarica</Text>
                  <Text fontSize="xs">ESC: Chiudi reader</Text>
                </VStack>
              </Box>

              {/* Page Jump */}
              {chapter?.pages && (
                <FormControl>
                  <FormLabel>Vai a pagina</FormLabel>
                  <Select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                    bg="gray.800"
                    size="sm"
                  >
                    {chapter.pages.map((_, i) => (
                      <option key={i} value={i}>
                        Pagina {i + 1}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Quick Actions */}
              <VStack align="stretch" spacing={2}>
                <Button
                  size="sm"
                  leftIcon={<FaRedo />}
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Ricarica pagina
                </Button>
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={() => {
                    saveProgress();
                    setSettingsOpen(false);
                    navigate(`/manga/${source}/${mangaId}`);
                  }}
                >
                  Torna ai dettagli manga
                </Button>
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {renderPages()}
    </Box>
  );
}

export default ReaderPage;

