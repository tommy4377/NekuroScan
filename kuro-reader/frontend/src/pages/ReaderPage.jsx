// ✅ READERPAGE.JSX v4.0 - COMPLETO CON TUTTE LE FUNZIONALITÀ
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, DrawerCloseButton, Select, Divider,
  Switch, Badge, Heading
} from '@chakra-ui/react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog, FaBook, FaPlay, FaPause
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import apiManager from '../api';

function ReaderPage() {
  // ========== HOOKS ESSENZIALI ==========
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // ========== STATES CON LOCALSTORAGE ==========
  const [chapter, setChapter] = useState(null);
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Impostazioni salvate
  const [readingMode, setReadingMode] = useState(() => localStorage.getItem('readingMode') || 'webtoon');
  const [imageScale, setImageScale] = useState(() => parseInt(localStorage.getItem('imageScale') || '100'));
  const [brightness, setBrightness] = useState(() => parseInt(localStorage.getItem('brightness') || '100'));
  const [showControls, setShowControls] = useState(true);
  const [autoNextChapter, setAutoNextChapter] = useState(() => localStorage.getItem('autoNextChapter') === 'true');
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(() => parseInt(localStorage.getItem('scrollSpeed') || '2'));
  
  // ========== REFS ESSENZIALI ==========
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const preloadedImages = useRef(new Set());
  const webtoonScrollRef = useRef(null);
  const autoScrollInterval = useRef(null);
  
  // ========== CALCOLI ==========
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');
  const totalPages = chapter?.pages?.length || 0;
  const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
  
  // Calcolo pagine da mostrare in base alla modalità
  const pagesToShow = readingMode === 'double' ? 2 : 1;
  const currentImages = [];
  for (let i = 0; i < pagesToShow; i++) {
    const pageIndex = currentPage + i;
    if (pageIndex < totalPages) {
      currentImages.push({
        url: chapter?.pages?.[pageIndex],
        index: pageIndex
      });
    }
  }
  
  // ========== SALVA IMPOSTAZIONI ==========
  useEffect(() => {
    localStorage.setItem('readingMode', readingMode);
  }, [readingMode]);
  
  useEffect(() => {
    localStorage.setItem('imageScale', imageScale.toString());
  }, [imageScale]);
  
  useEffect(() => {
    localStorage.setItem('brightness', brightness.toString());
  }, [brightness]);
  
  useEffect(() => {
    localStorage.setItem('autoNextChapter', autoNextChapter.toString());
  }, [autoNextChapter]);
  
  useEffect(() => {
    localStorage.setItem('scrollSpeed', scrollSpeed.toString());
  }, [scrollSpeed]);
  
  // Auto-scroll per modalità webtoon
  useEffect(() => {
    if (readingMode !== 'webtoon' || !autoScroll || !webtoonScrollRef.current) {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
      return;
    }
    
    const scrollContainer = webtoonScrollRef.current;
    const pixelsPerSecond = scrollSpeed * 50; // 1=50px/s, 2=100px/s, etc
    
    autoScrollInterval.current = setInterval(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop += pixelsPerSecond / 60; // 60fps
        
        // Check se siamo alla fine
        const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 100;
        if (isAtBottom && autoNextChapter) {
          setAutoScroll(false);
          setTimeout(() => {
            navigateChapter(1);
          }, 1000);
        }
      }
    }, 1000 / 60); // 60fps
    
    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    };
  }, [autoScroll, readingMode, scrollSpeed, autoNextChapter, navigateChapter]);

  // ========== HANDLERS ==========
  
  // ✅ WRAP saveProgress in useCallback per evitare React error #300
  const saveProgress = React.useCallback(() => {
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
      window.dispatchEvent(new CustomEvent('library-updated'));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [manga, chapter, chapterIndex, currentPage, source]);

  // Naviga alla pagina successiva/precedente
  const changePage = useCallback((delta) => {
    const newPage = currentPage + delta;
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    } else if (newPage >= totalPages && autoNextChapter) {
      // Verrà definito dopo
    } else if (newPage < 0 && autoNextChapter) {
      // Verrà definito dopo
    }
  }, [currentPage, totalPages, autoNextChapter]);

  // ✅ WRAP navigateChapter in useCallback per evitare React error #300
  const navigateChapter = useCallback((direction) => {
    if (!manga?.chapters) return;
    
    const newIndex = chapterIndex + direction;
    
    if (newIndex >= 0 && newIndex < manga.chapters.length) {
      saveProgress();
      const newChapter = manga.chapters[newIndex];
      const newChapterId = btoa(newChapter.url);
      setCurrentPage(0); // Reset alla prima pagina
      navigate(`/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
    } else if (direction > 0) {
      saveProgress();
      toast({
        title: 'Manga completato!',
        description: 'Hai finito di leggere questo manga',
        status: 'success',
        duration: 2000,
      });
      setTimeout(() => {
        navigate(`/manga/${source}/${mangaId}`);
      }, 1200);
    } else if (direction < 0) {
      toast({
        title: 'Primo capitolo',
        description: 'Sei già al primo capitolo',
        status: 'info',
        duration: 1500,
      });
    }
  }, [manga, chapterIndex, saveProgress, navigate, source, mangaId, toast]);

  // ✅ WRAP toggleFullscreen in useCallback per evitare React error #300
  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ✅ WRAP handleKeyPress in useCallback per evitare React error #300
  const handleKeyPress = useCallback((e) => {
    if (readingMode === 'webtoon') return; // Webtoon usa scroll nativo
    
    if (e.key === 'Escape') {
      if (isFullscreen) {
        toggleFullscreen();
      } else {
        saveProgress();
        navigate(`/manga/${source}/${mangaId}`);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      const step = readingMode === 'double' ? 2 : 1;
      if (currentPage - step >= 0) {
        setCurrentPage(currentPage - step);
      } else if (autoNextChapter) {
        navigateChapter(-1);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      const step = readingMode === 'double' ? 2 : 1;
      if (currentPage + step < totalPages) {
        setCurrentPage(currentPage + step);
      } else if (autoNextChapter) {
        navigateChapter(1);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      } else if (autoNextChapter) {
        navigateChapter(1);
      }
    }
  }, [isFullscreen, toggleFullscreen, saveProgress, navigate, source, mangaId, navigateChapter, currentPage, chapter, readingMode, totalPages, autoNextChapter]);

  // ✅ WRAP handlePageClick in useCallback per evitare React error #300
  const handlePageClick = useCallback((e) => {
    if (!chapter?.pages || readingMode === 'webtoon') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const step = readingMode === 'double' ? 2 : 1;
    
    // Click sinistra = pagina precedente
    if (clickX < width * 0.3) {
      const newPage = currentPage - step;
      if (newPage >= 0) {
        setCurrentPage(newPage);
      } else if (autoNextChapter) {
        navigateChapter(-1);
      }
    } 
    // Click destra = pagina successiva
    else if (clickX > width * 0.7) {
      const newPage = currentPage + step;
      if (newPage < totalPages) {
        setCurrentPage(newPage);
      } else if (autoNextChapter) {
        navigateChapter(1);
      }
    }
  }, [chapter, currentPage, navigateChapter, readingMode, totalPages, autoNextChapter]);

  // ========== EFFECTS ==========
  
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);

        const chapterUrl = atob(chapterId);
        const mangaUrl = atob(mangaId);

        const [mangaData, chapterData] = await Promise.all([
          apiManager.getMangaDetails(mangaUrl, source),
          apiManager.getChapter(chapterUrl, source)
        ]);
        
        if (!isMounted) return;
        
        setManga(mangaData);
        setChapter(chapterData);
        
        const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
        const mangaProgress = progress[mangaData.url];
        if (mangaProgress && mangaProgress.chapterId === chapterUrl) {
          setCurrentPage(mangaProgress.page || 0);
        }
        
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Error loading reader data:', error);
        toast({
          title: 'Errore caricamento',
          description: 'Impossibile caricare il capitolo',
          status: 'error',
          duration: 3000,
        });
        setTimeout(() => {
          if (isMounted) {
            navigate(`/manga/${source}/${mangaId}`);
          }
        }, 2000);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (source && mangaId && chapterId) {
      loadData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [source, mangaId, chapterId, navigate, toast]);

  // ✅ FIX dipendenze useEffect
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const hideControls = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    if (showControls) {
      hideControls();
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, currentPage]);

  // Preload immagini successive per navigazione più fluida
  useEffect(() => {
    if (!chapter?.pages || readingMode === 'webtoon') return;
    
    const preloadCount = 3;
    for (let i = 1; i <= preloadCount; i++) {
      const nextPage = currentPage + i;
      if (nextPage < totalPages && chapter.pages[nextPage]) {
        const imgUrl = chapter.pages[nextPage];
        if (!preloadedImages.current.has(imgUrl)) {
          const imgElement = document.createElement('img');
          imgElement.src = imgUrl;
          preloadedImages.current.add(imgUrl);
        }
      }
    }
  }, [currentPage, chapter, totalPages, readingMode]);

  // ✅ FIX dipendenze useEffect
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [saveProgress]);

  // ========== RENDER ==========
  
  if (loading) {
    return (
      <Box h="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={6}>
          <Spinner 
            size="xl" 
            color="purple.500" 
            thickness="4px"
            speed="0.65s"
          />
          <VStack spacing={2}>
            <Text color="white" fontSize="lg" fontWeight="bold">Caricamento capitolo...</Text>
            <Text color="gray.400" fontSize="sm">{manga?.title || 'Attendere...'}</Text>
            {chapterIndex >= 0 && (
              <Badge colorScheme="purple">
                Capitolo {chapterIndex + 1}
              </Badge>
            )}
          </VStack>
        </VStack>
      </Box>
    );
  }

  if (!chapter || !manga) {
      return (
      <Box h="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
          <Text color="white" fontSize="lg">Capitolo non trovato</Text>
          <Button onClick={() => navigate(`/manga/${source}/${mangaId}`)}>
              Torna al manga
            </Button>
          </VStack>
        </Box>
      );
    }

    return (
      <Box
      h="100vh" 
        bg="black"
        position="relative"
      ref={containerRef}
      onMouseMove={() => setShowControls(true)}
      onClick={handlePageClick}
        cursor="pointer"
    >
      {/* Top Controls */}
      {showControls && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bg="blackAlpha.900"
          p={2}
          zIndex={10}
          transition="opacity 0.3s"
          backdropFilter="blur(10px)"
        >
          <HStack justify="space-between">
            <HStack spacing={1}>
              <IconButton
                icon={<FaChevronLeft />}
                onClick={(e) => { e.stopPropagation(); navigateChapter(-1); }}
                aria-label="Capitolo precedente"
                variant="ghost"
                color="white"
                size="sm"
              />
              <VStack spacing={0} px={2}>
                <Text color="white" fontSize="xs" fontWeight="bold">
                  Cap. {chapterIndex + 1} / {manga.chapters?.length}
                </Text>
                {readingMode !== 'webtoon' && (
                  <Text color="gray.400" fontSize="xs">
                    Pag. {currentPage + 1} / {totalPages}
                  </Text>
                )}
              </VStack>
              <IconButton
                icon={<FaChevronRight />}
                onClick={(e) => { e.stopPropagation(); navigateChapter(1); }}
                aria-label="Capitolo successivo"
                variant="ghost"
                color="white"
                size="sm"
              />
              {readingMode === 'webtoon' && (
                <IconButton
                  icon={autoScroll ? <FaPause /> : <FaPlay />}
                  onClick={(e) => { e.stopPropagation(); setAutoScroll(!autoScroll); }}
                  aria-label={autoScroll ? "Pausa auto-scroll" : "Avvia auto-scroll"}
                  variant={autoScroll ? "solid" : "ghost"}
                  colorScheme={autoScroll ? "green" : "gray"}
                  color="white"
                  size="sm"
                />
              )}
            </HStack>

            <HStack>
          <IconButton
            icon={<FaCog />}
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
            aria-label="Impostazioni"
                variant="ghost"
            color="white"
                size="sm"
          />
          <IconButton
            icon={isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                aria-label="Schermo intero"
                variant="ghost"
                color="white"
                size="sm"
              />
              <IconButton
                icon={<FaTimes />}
                onClick={(e) => {
                  e.stopPropagation();
                  saveProgress();
                  navigate(`/manga/${source}/${mangaId}`);
                }}
                aria-label="Chiudi"
                variant="ghost"
            color="white"
                size="sm"
          />
        </HStack>
      </HStack>
        </Box>
      )}

      {/* Progress Bar */}
      {showControls && (
        <Box
          position="absolute"
          top="50px"
        left={0}
        right={0}
        bg="blackAlpha.800"
          p={2}
          zIndex={10}
        >
          <Progress
            value={progressPercentage}
            colorScheme="purple"
            size="sm"
            borderRadius="md"
          />
      </Box>
      )}

      {/* Main Content */}
      {readingMode === 'webtoon' ? (
        // Modalità Verticale/Webtoon - scroll continuo
        <Box
          ref={webtoonScrollRef}
          h="100%"
          overflowY="auto"
          pt={showControls ? "60px" : "20px"}
          pb="80px"
          css={{
            '&::-webkit-scrollbar': { width: '10px' },
            '&::-webkit-scrollbar-track': { background: '#1a202c' },
            '&::-webkit-scrollbar-thumb': { 
              background: 'var(--chakra-colors-purple-500)', 
              borderRadius: '5px',
              border: '2px solid #1a202c'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'var(--chakra-colors-purple-400)'
            }
          }}
        >
          <VStack spacing={0} align="center">
            {chapter?.pages?.map((page, i) => (
              <Box 
                key={i} 
                w="100%" 
                maxW="900px"
                position="relative"
              >
                {/* Indicatore numero pagina */}
                <Box
                  position="absolute"
                  top={4}
                  left={4}
                  bg="blackAlpha.700"
                  color="white"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="bold"
                  zIndex={1}
                >
                  {i + 1} / {totalPages}
                </Box>
                <Image
                  src={page}
                  alt={`Pagina ${i + 1}`}
                  w="100%"
                  style={{
                    filter: `brightness(${brightness}%)`,
                  }}
                  fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1200'%3E%3Crect fill='%23333' width='800' height='1200'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle'%3ECaricamento...%3C/text%3E%3C/svg%3E"
                />
              </Box>
            ))}
          </VStack>
          
          {/* Bottoni navigazione capitoli fissi in basso per webtoon */}
          <HStack
            position="fixed"
            bottom={4}
            left="50%"
            transform="translateX(-50%)"
            spacing={2}
            bg="blackAlpha.900"
            p={2}
            borderRadius="full"
            border="1px solid"
            borderColor="whiteAlpha.300"
            boxShadow="xl"
            backdropFilter="blur(10px)"
            zIndex={5}
          >
            <IconButton
              icon={<FaChevronLeft />}
              onClick={(e) => { e.stopPropagation(); navigateChapter(-1); }}
              aria-label="Capitolo precedente"
              variant="ghost"
              colorScheme="purple"
              color="white"
              size="sm"
              isDisabled={chapterIndex === 0}
            />
            <VStack spacing={0} px={3}>
              <Text color="white" fontSize="xs" fontWeight="bold">
                Capitolo {chapterIndex + 1}
              </Text>
              <Text color="gray.400" fontSize="xs">
                di {manga.chapters?.length}
              </Text>
            </VStack>
            <IconButton
              icon={<FaChevronRight />}
              onClick={(e) => { e.stopPropagation(); navigateChapter(1); }}
              aria-label="Capitolo successivo"
              variant="ghost"
              colorScheme="purple"
              color="white"
              size="sm"
              isDisabled={chapterIndex >= (manga.chapters?.length || 0) - 1}
            />
          </HStack>
        </Box>
      ) : (
        // Modalità Pagina Singola/Doppia
        <Box
          h="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          pt={showControls ? "100px" : 0}
          gap={4}
          position="relative"
        >
          {currentImages.map((img) => (
            <Box
              key={img.index}
              maxW={readingMode === 'double' ? '50%' : '100%'}
              maxH="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {img.url ? (
                <Image
                  src={img.url}
                  alt={`Pagina ${img.index + 1}`}
                  maxH="calc(100vh - 120px)"
                  maxW="100%"
                  objectFit="contain"
                  style={{
                    transform: `scale(${imageScale / 100})`,
                    filter: `brightness(${brightness}%)`,
                  }}
                  fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600'%3E%3Crect fill='%23333' width='400' height='600'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle'%3ECaricamento...%3C/text%3E%3C/svg%3E"
                />
              ) : (
                <VStack spacing={4}>
                  <Spinner size="xl" color="purple.500" />
                  <Text color="white">Caricamento...</Text>
                </VStack>
              )}
            </Box>
          ))}
          
          {/* Indicatore Pagina - sempre visibile nella modalità single/double */}
          <Box
            position="absolute"
            bottom={4}
            left="50%"
            transform="translateX(-50%)"
            bg="blackAlpha.800"
            color="white"
            px={4}
            py={2}
            borderRadius="full"
            fontSize="sm"
            fontWeight="bold"
            border="1px solid"
            borderColor="whiteAlpha.300"
            boxShadow="lg"
          >
            {currentPage + 1} / {totalPages}
          </Box>
          
          {/* Zone di click indicate */}
          <Box
            position="absolute"
            left={0}
            top="50%"
            transform="translateY(-50%)"
            w="30%"
            h="60%"
            opacity={0}
            transition="opacity 0.2s"
            _hover={{ opacity: 0.05, bg: 'white' }}
            pointerEvents="none"
            borderRadius="r-lg"
          />
          <Box
            position="absolute"
            right={0}
            top="50%"
            transform="translateY(-50%)"
            w="30%"
            h="60%"
            opacity={0}
            transition="opacity 0.2s"
            _hover={{ opacity: 0.05, bg: 'white' }}
            pointerEvents="none"
            borderRadius="l-lg"
          />
        </Box>
      )}

      {/* Settings Drawer - COMPLETO */}
      <Drawer
        isOpen={settingsOpen}
        placement="right"
        onClose={() => setSettingsOpen(false)}
        size="sm"
      >
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            <HStack spacing={2}>
              <FaCog />
              <Heading size="md">Impostazioni Lettura</Heading>
            </HStack>
          </DrawerHeader>
          <DrawerBody py={6}>
            <VStack spacing={6} align="stretch">
              
              {/* Modalità Lettura */}
              <FormControl>
                <FormLabel fontWeight="bold" mb={3}>📖 Modalità di lettura</FormLabel>
                <Select
                  value={readingMode}
                  onChange={(e) => setReadingMode(e.target.value)}
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  _hover={{ borderColor: 'purple.500' }}
                  _focus={{ borderColor: 'purple.400', bg: 'gray.700' }}
                >
                  <option value="single">Pagina Singola</option>
                  <option value="double">Doppia Pagina</option>
                  <option value="webtoon">Verticale (Webtoon)</option>
                </Select>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  {readingMode === 'webtoon' 
                    ? 'Scroll continuo verticale' 
                    : readingMode === 'double'
                    ? 'Visualizza 2 pagine affiancate'
                    : 'Una pagina per volta'}
                </Text>
              </FormControl>

              <Divider />

              {/* Scala Immagine */}
              {readingMode !== 'webtoon' && (
                <FormControl>
                  <FormLabel fontWeight="bold">🔍 Zoom: {imageScale}%</FormLabel>
                  <Slider
                    value={imageScale}
                    onChange={setImageScale}
                    min={50}
                    max={300}
                    step={10}
                    colorScheme="purple"
                  >
                    <SliderTrack bg="gray.700">
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb boxSize={6}>
                      <Box color="purple.500" />
                    </SliderThumb>
                  </Slider>
                  <HStack justify="space-between" mt={1}>
                    <Text fontSize="xs" color="gray.500">50%</Text>
                    <Text fontSize="xs" color="gray.500">300%</Text>
                  </HStack>
                </FormControl>
              )}

              {/* Luminosità */}
              <FormControl>
                <FormLabel fontWeight="bold">💡 Luminosità: {brightness}%</FormLabel>
                <Slider
                  value={brightness}
                  onChange={setBrightness}
                  min={50}
                  max={150}
                  step={5}
                  colorScheme="orange"
                >
                  <SliderTrack bg="gray.700">
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={6}>
                    <Box color="orange.500" />
                  </SliderThumb>
                </Slider>
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.500">50%</Text>
                  <Text fontSize="xs" color="gray.500">150%</Text>
                </HStack>
              </FormControl>

              <Divider />

              {/* Auto Next Chapter */}
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="auto-next" mb={0} fontWeight="bold">
                  ⏭️ Capitolo automatico
                </FormLabel>
                <Switch
                  id="auto-next"
                  colorScheme="purple"
                  isChecked={autoNextChapter}
                  onChange={(e) => setAutoNextChapter(e.target.checked)}
                />
              </FormControl>
              <Text fontSize="xs" color="gray.400" mt={-3}>
                Passa automaticamente al capitolo successivo alla fine
              </Text>

              {/* Auto Scroll per Webtoon */}
              {readingMode === 'webtoon' && (
                <>
                  <Divider />
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="auto-scroll" mb={0} fontWeight="bold">
                      📜 Auto-scroll
                    </FormLabel>
                    <Switch
                      id="auto-scroll"
                      colorScheme="green"
                      isChecked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                  </FormControl>
                  <Text fontSize="xs" color="gray.400" mt={-3}>
                    Scroll automatico in modalità verticale
                  </Text>

                  {autoScroll && (
                    <FormControl>
                      <FormLabel fontWeight="bold">🚀 Velocità scroll: {scrollSpeed}</FormLabel>
                      <Slider
                        value={scrollSpeed}
                        onChange={setScrollSpeed}
                        min={1}
                        max={10}
                        step={1}
                        colorScheme="green"
                      >
                        <SliderTrack bg="gray.700">
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={6}>
                          <Box color="green.500" />
                        </SliderThumb>
                      </Slider>
                      <HStack justify="space-between" mt={1}>
                        <Text fontSize="xs" color="gray.500">Lento</Text>
                        <Text fontSize="xs" color="gray.500">Veloce</Text>
                      </HStack>
                    </FormControl>
                  )}
                </>
              )}

              <Divider />

              {/* Info Capitolo */}
              <Box bg="gray.800" p={4} borderRadius="lg" border="1px solid" borderColor="gray.700">
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.400">Manga:</Text>
                    <Text fontSize="sm" fontWeight="bold" noOfLines={1}>{manga?.title}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.400">Capitolo:</Text>
                    <Badge colorScheme="purple">{chapterIndex + 1} / {manga?.chapters?.length}</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.400">Pagina:</Text>
                    <Badge colorScheme="blue">{currentPage + 1} / {totalPages}</Badge>
                  </HStack>
                  <Progress 
                    value={progressPercentage} 
                    colorScheme="purple" 
                    size="sm" 
                    borderRadius="full" 
                    mt={2}
                  />
                </VStack>
              </Box>

              <Divider />

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  saveProgress();
                  navigate(`/manga/${source}/${mangaId}`);
                }}
                colorScheme="purple"
                size="lg"
                leftIcon={<FaBook />}
              >
                Torna al manga
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

export default ReaderPage;