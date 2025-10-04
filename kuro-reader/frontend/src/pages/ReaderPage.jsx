// ✅ READERPAGE.JSX - VERSIONE DEFINITIVA SENZA NAVIGATE (USA WINDOW.LOCATION.HREF)
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, Badge, DrawerCloseButton, Select, Divider
} from '@chakra-ui/react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog, FaAlignJustify,
  FaBookmark, FaHome
} from 'react-icons/fa';
import { RiPagesFill, RiPagesLine } from 'react-icons/ri';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import apiManager from '../api';
import useAuthStore from '../hooks/useAuth';

const MotionBox = motion(Box);

function ReaderPage() {
  // ========== HOOKS (SEMPRE TUTTI, SEMPRE IN QUESTO ORDINE!) ==========
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  
  // ========== STATES (SEMPRE TUTTI!) ==========
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 0, y: 0 });
  
  // ========== REFS ==========
  const syncRef = useRef(null);
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const imageRefs = useRef({});
  const lastTapRef = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const controlsTimeoutRef = useRef(null);
  
  // ========== CALCOLI ==========
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

  // ========== HANDLERS (FUNZIONI NORMALI) ==========
  
  const saveProgress = () => {
    if (!manga || !chapter) return;
    
    try {
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      readingProgress[manga.url] = {
        chapterId: chapter.url,
        chapterIndex,
        chapterTitle: manga.chapters?.[chapterIndex]?.title || '',
        page: currentPage,
        totalPages: chapter.pages?.length || 0,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
      
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const existingIndex = reading.findIndex(r => r.url === manga.url);
      
      const readingItem = {
        url: manga.url,
        title: manga.title,
        cover: manga.coverUrl,
        type: manga.type,
        source: manga.source || source,
        lastChapterIndex: chapterIndex,
        lastChapterTitle: manga.chapters?.[chapterIndex]?.title || '',
        lastPage: currentPage,
        progress: Math.round(((chapterIndex + 1) / (manga.chapters?.length || 1)) * 100),
        lastRead: new Date().toISOString()
      };
      
      if (existingIndex !== -1) {
        reading[existingIndex] = readingItem;
      } else {
        reading.unshift(readingItem);
      }
      
      localStorage.setItem('reading', JSON.stringify(reading.slice(0, 100)));
      
      if (currentPage === (chapter.pages?.length || 1) - 1) {
        const completed = JSON.parse(localStorage.getItem('completedChapters') || '{}');
        if (!completed[manga.url]) completed[manga.url] = [];
        if (!completed[manga.url].includes(chapterIndex)) {
          completed[manga.url].push(chapterIndex);
        }
        localStorage.setItem('completedChapters', JSON.stringify(completed));
      }
      
      window.dispatchEvent(new CustomEvent('library-updated'));

      if (syncRef.current) {
        syncRef.current({ refreshAfter: false, reason: 'reading-progress' });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const navigateChapter = (direction) => {
    if (!manga?.chapters) return;
    
    const newIndex = chapterIndex + direction;
    
    if (newIndex >= 0 && newIndex < manga.chapters.length) {
      saveProgress();
      const newChapter = manga.chapters[newIndex];
      const newChapterId = btoa(newChapter.url);
      window.location.href = `/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`;
    } else if (direction > 0) {
      toast({
        title: 'Ultimo capitolo raggiunto',
        description: 'Hai completato il manga!',
        status: 'success',
        duration: 3000,
      });
      
      const completed = JSON.parse(localStorage.getItem('completed') || '[]');
      if (!completed.find(c => c.url === manga.url)) {
        completed.unshift({
          url: manga.url,
          title: manga.title,
          cover: manga.coverUrl,
          type: manga.type,
          source: manga.source || source,
          completedAt: new Date().toISOString(),
          progress: 100
        });
        localStorage.setItem('completed', JSON.stringify(completed));
      }
      
      window.dispatchEvent(new CustomEvent('library-updated'));
      
      setTimeout(() => {
        window.location.href = `/manga/${source}/${mangaId}`;
      }, 1200);
    } else {
      toast({
        title: 'Primo capitolo',
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
      
      // Preload
      const preloadCount = readingMode === 'webtoon' ? 10 : 5;
      for (let i = newPage; i < Math.min(newPage + preloadCount, chapter.pages.length); i++) {
        if (!preloadedImages[i]) {
          const img = new window.Image();
          img.onload = () => {
            setPreloadedImages(prev => ({ ...prev, [i]: true }));
          };
          img.src = chapter.pages[i];
        }
      }
    } else if (newPage >= chapter.pages.length) {
      if (chapterIndex < (manga?.chapters?.length || 0) - 1) {
        toast({
          title: 'Capitolo completato!',
          description: 'Passaggio al capitolo successivo...',
          status: 'success',
          duration: 2000,
        });
        
        setTimeout(() => {
          navigateChapter(1);
        }, 1500);
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
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      setIsFullscreen(false);
    }
  };

  const cycleReadingMode = () => {
    const modes = ['single', 'double', 'webtoon'];
    const currentIndex = modes.indexOf(readingMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    setReadingMode(nextMode);
    localStorage.setItem('preferredReadingMode', nextMode);
    
    if (nextMode === 'webtoon') {
      setFitMode('width');
    } else if (nextMode === 'double') {
      setFitMode('height');
      if (currentPage % 2 !== 0) setCurrentPage(currentPage - 1);
    } else {
      setFitMode('height');
    }
    
    toast({
      title: `Modalità: ${nextMode === 'single' ? 'Pagina singola' : nextMode === 'double' ? 'Pagina doppia' : 'Webtoon'}`,
      status: 'info',
      duration: 1500,
    });
  };

  const handleImageError = (pageIndex) => {
    setErrorPages(prev => new Set([...prev, pageIndex]));
  };

  const retryImage = (pageIndex) => {
    setErrorPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageIndex);
      return newSet;
    });
    
    const img = imageRefs.current[pageIndex];
    if (img) {
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
        chapterTitle: manga.chapters?.[chapterIndex]?.title || '',
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

  const handleImageClick = (e) => {
    if (readingMode === 'webtoon') return;
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!isZoomed) {
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        setZoomOrigin({ x, y });
        setZoomLevel(2);
        setIsZoomed(true);
      } else {
        setZoomLevel(1);
        setIsZoomed(false);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const getReadingModeIcon = () => {
    switch(readingMode) {
      case 'single': return RiPagesFill;
      case 'double': return RiPagesLine;
      case 'webtoon': return FaAlignJustify;
      default: return FaAlignJustify;
    }
  };

  // ========== EFFECTS (SEMPRE TUTTI, SEMPRE IN QUESTO ORDINE!) ==========
  
  // 1. Get sync function
  useEffect(() => {
    syncRef.current = useAuthStore.getState().syncToServer;
  }, []);

  // 2. Load data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setErrorPages(new Set());
        setPreloadedImages({});

        const mangaUrl = atob(mangaId);
        const chapterUrl = atob(chapterId);

        const mangaData = await apiManager.getMangaDetails(mangaUrl, source);
        if (cancelled) return;
        if (!mangaData) throw new Error('Impossibile caricare i dettagli del manga');
        
        setManga(mangaData);
        
        const chapterData = await apiManager.getChapter(chapterUrl, source);
        if (cancelled) return;
        if (!chapterData) throw new Error('Impossibile caricare il capitolo');
        if (!chapterData.pages || chapterData.pages.length === 0) {
          throw new Error('Nessuna pagina trovata nel capitolo');
        }

        setChapter(chapterData);
        
        const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
        const progress = readingProgress[mangaUrl];
        
        let startPage = 0;
        if (progress && progress.chapterId === chapterUrl && progress.page) {
          startPage = Math.min(progress.page, chapterData.pages.length - 1);
          
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
        
        const reading = JSON.parse(localStorage.getItem('reading') || '[]');
        const existingIndex = reading.findIndex(r => r.url === mangaData.url);
        
        const readingItem = {
          url: mangaData.url,
          title: mangaData.title,
          cover: mangaData.coverUrl,
          type: mangaData.type,
          source: mangaData.source || source,
          lastChapterIndex: chapterIndex,
          lastChapterTitle: mangaData.chapters?.[chapterIndex]?.title || '',
          lastPage: startPage,
          progress: Math.round(((chapterIndex + 1) / (mangaData.chapters?.length || 1)) * 100),
          lastRead: new Date().toISOString()
        };
        
        if (existingIndex !== -1) {
          reading[existingIndex] = readingItem;
        } else {
          reading.unshift(readingItem);
        }
        
        localStorage.setItem('reading', JSON.stringify(reading.slice(0, 100)));
        
        if (chapterData.pages.length > 0) {
          const img = new window.Image();
          img.onload = function() {
            if (cancelled) return;
            
            const aspectRatio = this.width / this.height;
            if (aspectRatio < 0.6) {
              setReadingMode('webtoon');
              setFitMode('width');
            } else {
              const savedMode = localStorage.getItem('preferredReadingMode');
              if (savedMode) {
                setReadingMode(savedMode);
              }
            }
          };
          img.src = chapterData.pages[0];
        }

        setLoading(false);

      } catch (error) {
        if (cancelled) return;
        console.error('Load error:', error);
        
        toast({
          title: 'Errore caricamento',
          description: error.message || 'Impossibile caricare il capitolo',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });

        setTimeout(() => {
          if (!cancelled) window.location.href = `/manga/${source}/${mangaId}`;
        }, 2000);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [chapterId, source, mangaId, chapterIndex, toast]);

  // 3. Mouse move
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // 4. Auto scroll
  useEffect(() => {
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);

    if (autoScroll && readingMode === 'webtoon' && containerRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollBy({ top: scrollSpeed / 10, behavior: 'smooth' });
          
          const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 100) {
            setAutoScroll(false);
            toast({ title: 'Fine capitolo raggiunta', status: 'info', duration: 2000 });
          }
        }
      }, 100);
    }

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [autoScroll, scrollSpeed, readingMode, toast]);

  // 5. Touch gestures
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    };

    const handleTouchEnd = (e) => {
      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      };

      const deltaX = touchEnd.x - touchStartRef.current.x;
      const deltaY = touchEnd.y - touchStartRef.current.y;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          changePage(-1);
        } else {
          changePage(1);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentPage, readingMode, chapter, manga, chapterIndex, toast]);

  // 6. Keyboard
  useEffect(() => {
    const handleKeyPress = (e) => {
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
            containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
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
          e.preventDefault();
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            saveProgress();
            window.location.href = `/manga/${source}/${mangaId}`;
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
  }, [settingsOpen, readingMode, isFullscreen, chapter, currentPage, source, mangaId, manga, chapterIndex, toast]);

  // 7. Save progress
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentPage, manga, chapter, chapterIndex, source]);

  // 8. Cleanup
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // ========== RENDER ==========
  
  if (loading || !chapter || !manga) {
    return (
      <Box bg="black" minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="white" fontSize="lg">Caricamento capitolo...</Text>
        </VStack>
      </Box>
    );
  }

  const pageProgress = Math.round(((currentPage + 1) / chapter.pages.length) * 100);
  const ReadingModeIcon = getReadingModeIcon();

  // Render pages
  const renderPages = () => {
    if (!chapter || !chapter.pages || chapter.pages.length === 0) {
      return (
        <Box bg="black" minH="100vh" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
            <Text color="white" fontSize="lg">Nessuna pagina disponibile</Text>
            <Button colorScheme="purple" onClick={() => window.location.href = `/manga/${source}/${mangaId}`}>
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
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: '#1a1a1a' },
            '&::-webkit-scrollbar-thumb': { background: '#4a4a4a', borderRadius: '4px' },
            '&::-webkit-scrollbar-thumb:hover': { background: '#6a6a6a' },
          }}
          onScroll={(e) => {
            const container = e.target;
            const scrollPercentage = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
            const estimatedPage = Math.floor((scrollPercentage / 100) * chapter.pages.length);

            if (estimatedPage !== currentPage && estimatedPage >= 0 && estimatedPage < chapter.pages.length) {
              setCurrentPage(estimatedPage);
            }

            if (scrollPercentage > 98 && !loadingMore) {
              setLoadingMore(true);
              setTimeout(() => {
                if (chapterIndex < (manga?.chapters?.length || 0) - 1) {
                  toast({
                    title: 'Capitolo completato!',
                    description: 'Passaggio al capitolo successivo...',
                    status: 'success',
                    duration: 2000,
                  });

                  setTimeout(() => {
                    navigateChapter(1);
                  }, 1500);
                }
                setLoadingMore(false);
              }, 500);
            }
          }}
        >
          <VStack spacing={0}>
            {chapter.pages.map((page, i) => (
              <Box key={i} w="100%">
                {!errorPages.has(i) ? (
                  <Image
                    src={page}
                    alt={`Page ${i + 1}`}
                    width="100%"
                    loading="lazy"
                    onError={() => handleImageError(i)}
                  />
                ) : (
                  <Box bg="gray.800" minH="400px" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                    <Text color="gray.500" mb={2}>Immagine non disponibile</Text>
                    <Button size="sm" onClick={() => retryImage(i)}>Riprova</Button>
                  </Box>
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      );
    }

    // Single/Double page mode
    const pagesToShow = readingMode === 'double' && currentPage < chapter.pages.length - 1 ? 2 : 1;

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
        <AnimatePresence mode="wait">
          <MotionBox
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            height="100vh"
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
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
                      <Spinner position="absolute" size="xl" color="purple.500" zIndex={1} />
                    )}

                    {errorPages.has(pageIndex) ? (
                      <Box bg="gray.800" p={8} textAlign="center" borderRadius="md">
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
                        ref={(el) => (imageRefs.current[pageIndex] = el)}
                        src={chapter.pages[pageIndex]}
                        alt={`Page ${pageIndex + 1}`}
                        height={fitMode === 'height' ? '100vh' : 'auto'}
                        width={fitMode === 'width' ? '100%' : 'auto'}
                        maxH="100vh"
                        maxW={readingMode === 'double' ? '100%' : '100vw'}
                        objectFit="contain"
                        style={{
                          transform: `scale(${isZoomed ? zoomLevel : imageScale / 100})`,
                          transformOrigin: isZoomed ? `${zoomOrigin.x}% ${zoomOrigin.y}%` : 'center',
                          display: 'block',
                          transition: isZoomed ? 'transform 0.3s ease' : 'none',
                        }}
                        onLoadStart={() => setImageLoading(true)}
                        onLoad={() => setImageLoading(false)}
                        onError={() => handleImageError(pageIndex)}
                        onClick={handleImageClick}
                      />
                    )}
                  </Box>
                );
              })}
            </HStack>
          </MotionBox>
        </AnimatePresence>
      </Box>
    );
  };

  return (
    <Box bg="black" minH="100vh" position="relative">
      {/* Top Controls */}
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
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={() => {
              saveProgress();
              window.location.href = `/manga/${source}/${mangaId}`;
            }}
            aria-label="Chiudi"
          />
          <IconButton
            icon={<FaHome />}
            variant="solid"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={() => {
              saveProgress();
              window.location.href = '/home';
            }}
            aria-label="Home"
          />
          <IconButton
            icon={<FaBookmark />}
            variant="solid"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={addBookmark}
            aria-label="Segnalibro"
          />
        </HStack>

        <HStack>
          <IconButton
            icon={<FaCog />}
            variant="solid"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={() => setSettingsOpen(true)}
            aria-label="Impostazioni"
          />
          <IconButton
            icon={<ReadingModeIcon />}
            variant="solid"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={cycleReadingMode}
            aria-label="Modalità"
          />
          <IconButton
            icon={isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
            variant="solid"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
          />
        </HStack>
      </HStack>

      {/* Navigation Arrows */}
      {readingMode !== 'webtoon' && (
        <>
          <IconButton
            icon={<FaChevronLeft />}
            position="fixed"
            left={4}
            top="50%"
            transform="translateY(-50%)"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={(e) => {
              e.stopPropagation();
              changePage(-1);
            }}
            isDisabled={currentPage === 0 && chapterIndex === 0}
            zIndex={999}
            opacity={showControls ? 0.7 : 0}
            _hover={{ opacity: 1 }}
            transition="opacity 0.3s"
            pointerEvents={showControls ? 'auto' : 'none'}
            aria-label="Precedente"
          />
          <IconButton
            icon={<FaChevronRight />}
            position="fixed"
            right={4}
            top="50%"
            transform="translateY(-50%)"
            bg="blackAlpha.700"
            color="white"
            size="lg"
            borderRadius="full"
            onClick={(e) => {
              e.stopPropagation();
              changePage(1);
            }}
            isDisabled={currentPage >= chapter.pages.length - 1 && chapterIndex >= (manga.chapters?.length || 0) - 1}
            zIndex={999}
            opacity={showControls ? 0.7 : 0}
            _hover={{ opacity: 1 }}
            transition="opacity 0.3s"
            pointerEvents={showControls ? 'auto' : 'none'}
            aria-label="Successiva"
          />
        </>
      )}

      {/* Bottom Info */}
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
            <Text fontSize="sm" noOfLines={1}>{manga.title}</Text>
            <Badge colorScheme="purple">
              Cap. {chapterIndex + 1}/{manga.chapters?.length || 0}
            </Badge>
          </HStack>
          <HStack justify="space-between" width="100%">
            <Text fontSize="xs" color="gray.400" noOfLines={1}>
              Capitolo {chapterIndex + 1}
            </Text>
            <Text fontSize="xs">Pagina {currentPage + 1}/{chapter.pages.length}</Text>
          </HStack>
          <Progress value={pageProgress} size="xs" colorScheme="purple" width="100%" />
        </VStack>
      </Box>

      {/* Main Content */}
      <Box style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}>
        {renderPages()}
      </Box>

      {/* Settings Drawer */}
      <Drawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} placement="right" size="sm">
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            Impostazioni Lettura
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel>Modalità Lettura</FormLabel>
                <Select
                  value={readingMode}
                  onChange={(e) => {
                    setReadingMode(e.target.value);
                    localStorage.setItem('preferredReadingMode', e.target.value);
                  }}
                  bg="gray.800"
                >
                  <option value="single">Pagina Singola</option>
                  <option value="double">Pagina Doppia</option>
                  <option value="webtoon">Webtoon</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Adattamento Pagina</FormLabel>
                <Select
                  value={fitMode}
                  onChange={(e) => {
                    setFitMode(e.target.value);
                    localStorage.setItem('preferredFitMode', e.target.value);
                  }}
                  bg="gray.800"
                >
                  <option value="height">Adatta Altezza</option>
                  <option value="width">Adatta Larghezza</option>
                </Select>
              </FormControl>

              {readingMode === 'webtoon' && (
                <>
                  <Divider />
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb={0}>Auto-scroll</FormLabel>
                    <Switch
                      isChecked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      colorScheme="purple"
                    />
                  </FormControl>

                  {autoScroll && (
                    <FormControl>
                      <FormLabel>Velocità Scroll: {scrollSpeed}</FormLabel>
                      <Slider
                        value={scrollSpeed}
                        onChange={setScrollSpeed}
                        min={10}
                        max={100}
                        colorScheme="purple"
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </FormControl>
                  )}
                </>
              )}

              <Divider />

              {readingMode !== 'webtoon' && (
                <FormControl>
                  <FormLabel>Scala Immagine: {imageScale}%</FormLabel>
                  <Slider
                    value={imageScale}
                    onChange={setImageScale}
                    min={50}
                    max={200}
                    colorScheme="purple"
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Luminosità: {brightness}%</FormLabel>
                <Slider
                  value={brightness}
                  onChange={setBrightness}
                  min={50}
                  max={150}
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
                  onChange={setContrast}
                  min={50}
                  max={150}
                  colorScheme="purple"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <Divider />

              <VStack align="start" spacing={2}>
                <Text fontSize="sm" fontWeight="bold">Scorciatoie Tastiera</Text>
                <Text fontSize="xs" color="gray.400">← / → : Cambia pagina</Text>
                <Text fontSize="xs" color="gray.400">F : Schermo intero</Text>
                <Text fontSize="xs" color="gray.400">M : Cambia modalità</Text>
                <Text fontSize="xs" color="gray.400">B : Aggiungi segnalibro</Text>
                <Text fontSize="xs" color="gray.400">[ / ] : Cambia capitolo</Text>
                <Text fontSize="xs" color="gray.400">ESC : Esci</Text>
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

export default ReaderPage;