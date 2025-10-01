// ✅ READERPAGE.JSX v3.8 - FIX INIZIALIZZAZIONE
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, Badge, DrawerCloseButton, Select,
  Divider, Tooltip
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog, FaAlignJustify, 
  FaBookmark, FaHome, FaRedo
} from 'react-icons/fa';
import { RiPagesFill, RiPagesLine } from 'react-icons/ri';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import apiManager from '../api';
import useAuth from '../hooks/useAuth';

const MotionBox = motion(Box);

function ReaderPage() {
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // ✅ Hook auth sicuro
  const authHook = useAuth() || {};
  const { syncToServer = null } = authHook;
  
  // States
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
  
  // ✅ Flag per inizializzazione completa
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const imageRefs = useRef({});
  const lastTapRef = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const controlsTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

  // ========= ✅ FUNZIONI DEFINITE SUBITO (non in ref) =========
  
  const saveProgress = () => {
    if (!manga || !chapter || !isMountedRef.current) return;
    
    try {
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
        progress: Math.round(((chapterIndex + 1) / manga.chapters.length) * 100),
        lastRead: new Date().toISOString()
      };
      
      if (existingIndex !== -1) {
        reading[existingIndex] = readingItem;
      } else {
        reading.unshift(readingItem);
      }
      
      localStorage.setItem('reading', JSON.stringify(reading.slice(0, 100)));
      
      if (currentPage >= (chapter.pages?.length || 1) - 1) {
        const completed = JSON.parse(localStorage.getItem('completedChapters') || '{}');
        if (!completed[manga.url]) {
          completed[manga.url] = [];
        }
        if (!completed[manga.url].includes(chapterIndex)) {
          completed[manga.url].push(chapterIndex);
          localStorage.setItem('completedChapters', JSON.stringify(completed));
        }
      }
      
      window.dispatchEvent(new CustomEvent('library-updated'));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const navigateChapter = async (direction) => {
    if (!manga?.chapters || !isMountedRef.current) return;
    
    try {
      const newIndex = chapterIndex + direction;
      if (newIndex >= 0 && newIndex < manga.chapters.length) {
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
          
          const rp = JSON.parse(localStorage.getItem('readingProgress') || '{}');
          rp[manga.url] = {
            chapterId: manga.chapters[manga.chapters.length - 1]?.url,
            chapterIndex: manga.chapters.length - 1,
            chapterTitle: manga.chapters[manga.chapters.length - 1]?.title || '',
            totalChapters: manga.chapters.length,
            page: 0,
            totalPages: 0,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('readingProgress', JSON.stringify(rp));
          
          const cc = JSON.parse(localStorage.getItem('completedChapters') || '{}');
          cc[manga.url] = Array.from({ length: manga.chapters.length }, (_, i) => i);
          localStorage.setItem('completedChapters', JSON.stringify(cc));
          
          if (syncToServer && typeof syncToServer === 'function') {
            try {
              await syncToServer();
            } catch (e) {
              console.error('Sync after completion failed:', e);
            }
          }
          
          window.dispatchEvent(new CustomEvent('library-updated'));
          
          setTimeout(() => {
            if (isMountedRef.current) {
              navigate(`/manga/${source}/${mangaId}`);
            }
          }, 1200);
        } else {
          toast({
            title: 'Primo capitolo',
            status: 'info',
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error('Error navigating chapter:', error);
    }
  };

  const changePage = (direction) => {
    if (!chapter?.pages || !isMountedRef.current) return;
    
    try {
      const pagesToSkip = readingMode === 'double' ? 2 : 1;
      const newPage = currentPage + (direction * pagesToSkip);
      
      if (newPage >= 0 && newPage < chapter.pages.length) {
        setCurrentPage(newPage);
        
        // Preload
        const preloadCount = readingMode === 'webtoon' ? 10 : 5;
        for (let i = newPage; i < Math.min(newPage + preloadCount, chapter.pages.length); i++) {
          if (!preloadedImages[i]) {
            const img = document.createElement('img');
            img.onload = () => {
              if (isMountedRef.current) {
                setPreloadedImages(prev => ({ ...prev, [i]: true }));
              }
            };
            img.src = chapter.pages[i];
          }
        }
      } else if (newPage >= chapter.pages.length) {
        if (chapterIndex < manga?.chapters?.length - 1) {
          toast({
            title: 'Capitolo completato!',
            description: 'Passaggio al capitolo successivo...',
            status: 'success',
            duration: 2000,
          });
          setTimeout(() => {
            if (isMountedRef.current) {
              navigateChapter(1);
            }
          }, 1500);
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
    } catch (error) {
      console.error('Error changing page:', error);
    }
  };

  // ✅ Cleanup effect - PRIMO
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // ✅ Load data effect
  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      if (cancelled) return;
      
      try {
        setLoading(true);
        setErrorPages(new Set());
        setPreloadedImages({});
        
        const mangaUrl = atob(mangaId);
        const chapterUrl = atob(chapterId);
        
        const mangaData = await apiManager.getMangaDetails(mangaUrl, source);
        if (cancelled) return;
        
        if (!mangaData) {
          throw new Error('Impossibile caricare i dettagli del manga');
        }
        setManga(mangaData);
        
        const chapterData = await apiManager.getChapter(chapterUrl, source);
        if (cancelled) return;
        
        if (!chapterData) {
          throw new Error('Impossibile caricare il capitolo');
        }
        
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
        
        // Detect reading mode
        if (chapterData.pages.length > 0) {
          const img = document.createElement('img');
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
        
        // ✅ Segna come inizializzato
        if (!cancelled) {
          setIsInitialized(true);
        }
        
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading data:', error);
        toast({
          title: 'Errore caricamento',
          description: error.message || 'Impossibile caricare il capitolo',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        
        setTimeout(() => {
          if (!cancelled) {
            navigate(`/manga/${source}/${mangaId}`);
          }
        }, 2000);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      cancelled = true;
    };
  }, [chapterId, source, mangaId, navigate, toast]);

  // ✅ Mouse move effect - SOLO SE INIZIALIZZATO
  useEffect(() => {
    if (!isInitialized) return;
    
    const handleMouseMove = () => {
      if (!isMountedRef.current) return;
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setShowControls(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isInitialized]);

  // ✅ Auto scroll effect - SOLO SE INIZIALIZZATO
  useEffect(() => {
    if (!isInitialized) return;
    
    if (autoScroll && readingMode === 'webtoon') {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current && isMountedRef.current) {
          containerRef.current.scrollBy({
            top: scrollSpeed / 10,
            behavior: 'smooth'
          });
          
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
  }, [autoScroll, scrollSpeed, readingMode, toast, isInitialized]);

  // ✅ Touch gestures - SOLO SE INIZIALIZZATO
  useEffect(() => {
    if (!isInitialized) return;
    
    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    };

    const handleTouchEnd = (e) => {
      if (!isMountedRef.current) return;
      
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
  }, [isInitialized]);

  // ✅ Keyboard shortcuts - SOLO SE INIZIALIZZATO
  useEffect(() => {
    if (!isInitialized) return;
    
    const handleKeyPress = (e) => {
      if (settingsOpen || !isMountedRef.current) return;
      
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
  }, [settingsOpen, readingMode, isFullscreen, chapter, navigate, source, mangaId, isInitialized]);

  // ✅ Save progress effect - SOLO SE INIZIALIZZATO
  useEffect(() => {
    if (!manga || !chapter || !chapter.pages || chapter.pages.length === 0 || !isInitialized) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        saveProgress();
      }
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentPage, manga, chapter, chapterIndex, isInitialized]);

  // ========= HELPER FUNCTIONS =========

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

  // ========= RENDER =========

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
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: '#1a1a1a' },
            '&::-webkit-scrollbar-thumb': { background: '#4a4a4a', borderRadius: '4px' },
            '&::-webkit-scrollbar-thumb:hover': { background: '#6a6a6a' },
          }}
          onScroll={(e) => {
            if (!isMountedRef.current) return;
            
            const container = e.target;
            const scrollPercentage = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
            const estimatedPage = Math.floor((scrollPercentage / 100) * chapter.pages.length);
            
            if (estimatedPage !== currentPage && estimatedPage >= 0 && estimatedPage < chapter.pages.length) {
              setCurrentPage(estimatedPage);
            }
            
            if (scrollPercentage >= 98 && !loadingMore) {
              setLoadingMore(true);
              
              setTimeout(() => {
                if (!isMountedRef.current) return;
                
                if (chapterIndex < manga?.chapters?.length - 1) {
                  toast({
                    title: 'Capitolo completato!',
                    description: 'Passaggio al capitolo successivo...',
                    status: 'success',
                    duration: 2000,
                  });
                  
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      navigateChapter(1);
                    }
                  }, 1000);
                } else {
                  toast({
                    title: 'Manga completato!',
                    description: 'Hai raggiunto l\'ultimo capitolo',
                    status: 'success',
                    duration: 3000,
                  });
                  setLoadingMore(false);
                }
              }, 1000);
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
              >
                {errorPages.has(i) ? (
                  <Box bg="gray.800" p={8} textAlign="center" width="100%">
                    <Text color="gray.400" mb={2}>Errore caricamento pagina {i + 1}</Text>
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

    const pageVariants = {
      enter: (direction) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
      }),
      center: {
        x: 0,
        opacity: 1
      },
      exit: (direction) => ({
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
      })
    };

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
        <AnimatePresence mode="wait" custom={1}>
          <MotionBox
            key={currentPage}
            custom={1}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
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
                          transform: `scale(${isZoomed ? zoomLevel : imageScale / 100})`,
                          transformOrigin: isZoomed ? `${zoomOrigin.x}% ${zoomOrigin.y}%` : 'center',
                          display: 'block',
                          filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                          transition: isZoomed ? 'transform 0.3s ease' : 'none'
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

  return (
    <Box bg="black" minH="100vh" position="relative">
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
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">
                      Scroll Automatico
                    </FormLabel>
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

              <FormControl>
                <FormLabel>Zoom Immagine: {imageScale}%</FormLabel>
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

              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="bold">Scorciatoie Tastiera</Text>
                <Text fontSize="xs" color="gray.400">← → : Cambia pagina</Text>
                <Text fontSize="xs" color="gray.400">F : Schermo intero</Text>
                <Text fontSize="xs" color="gray.400">M : Cambia modalità</Text>
                <Text fontSize="xs" color="gray.400">B : Aggiungi segnalibro</Text>
                <Text fontSize="xs" color="gray.400">[ ] : Cambia capitolo</Text>
                <Text fontSize="xs" color="gray.400">ESC : Esci</Text>
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