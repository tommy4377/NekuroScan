// ✅ READERPAGE.JSX - VERSIONE COMPLETA CORRETTA SENZA ERRORI REACT #300
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  Switch, FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, Badge, DrawerCloseButton, Select, Divider,
  Flex, Center, Container, useDisclosure
} from '@chakra-ui/react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog, FaAlignJustify,
  FaBookmark, FaHome, FaVolumeUp, FaVolumeMute, FaExpand, FaCompress
} from 'react-icons/fa';
import { RiPagesFill, RiPagesLine } from 'react-icons/ri';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import apiManager from '../api';
import useAuthStore from '../hooks/useAuth';

function ReaderPage() {
  // ========== HOOKS ==========
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // ========== STATES COMPLETI ==========
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
  const [scrollSpeed, setScrollSpeed] = useState(80);
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
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  
  // ========== REFS ==========
  const syncRef = useRef(null);
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const imageRefs = useRef({});
  const lastTapRef = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const controlsTimeoutRef = useRef(null);
  const endChapterGuardRef = useRef(false);
  
  // ========== CALCOLI ==========
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

  // ========== HANDLERS ==========
  
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
      navigate(`/read/${source}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
    } else if (direction > 0) {
      // Fine manga
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

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      if (isFullscreen) {
        toggleFullscreen();
      } else {
        saveProgress();
        navigate(`/manga/${source}/${mangaId}`);
      }
    } else if (e.key === 'ArrowLeft') {
      navigateChapter(-1);
    } else if (e.key === 'ArrowRight') {
      navigateChapter(1);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (currentPage < (chapter?.pages?.length || 1) - 1) {
        setCurrentPage(currentPage + 1);
      } else {
        navigateChapter(1);
      }
    }
  };

  const handlePageClick = (e) => {
    if (!chapter?.pages) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    if (clickX < width / 2) {
      // Click sinistro - pagina precedente
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else {
        navigateChapter(-1);
      }
    } else {
      // Click destro - pagina successiva
      if (currentPage < chapter.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      } else {
        navigateChapter(1);
      }
    }
  };

  const handleDoubleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    setZoomOrigin({ x: clickX / rect.width, y: clickY / rect.height });
    setIsZoomed(!isZoomed);
    setZoomLevel(isZoomed ? 1 : 2);
  };

  const preloadImages = () => {
    if (!chapter?.pages) return;
    
    const preloadCount = 3;
    const startIndex = Math.max(0, currentPage);
    const endIndex = Math.min(currentPage + preloadCount, chapter.pages.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      if (chapter.pages[i] && !preloadedImages[i]) {
        const img = new Image();
        img.src = chapter.pages[i];
        img.onload = () => {
          setPreloadedImages(prev => ({ ...prev, [i]: true }));
        };
        img.onerror = () => {
          setErrorPages(prev => new Set([...prev, i]));
        };
      }
    }
  };

  const toggleAutoScroll = () => {
    if (autoScroll) {
      clearInterval(scrollIntervalRef.current);
      setAutoScroll(false);
    } else {
      setAutoScroll(true);
      scrollIntervalRef.current = setInterval(() => {
        if (currentPage < (chapter?.pages?.length || 1) - 1) {
          setCurrentPage(prev => prev + 1);
        } else {
          navigateChapter(1);
        }
      }, scrollSpeed * 10);
    }
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(50);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  // ========== EFFECTS ==========
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Decodifica chapterId
        const chapterUrl = atob(chapterId);
        
        // Carica dati manga e capitolo
        const [mangaData, chapterData] = await Promise.all([
          apiManager.getMangaDetails(source, mangaId),
          apiManager.getChapterPages(source, chapterUrl)
        ]);
        
        setManga(mangaData);
        setChapter(chapterData);
        
        // Carica progresso se esiste
        const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
        const mangaProgress = progress[mangaData.url];
        if (mangaProgress && mangaProgress.chapterId === chapterUrl) {
          setCurrentPage(mangaProgress.page || 0);
        }
        
      } catch (error) {
        console.error('Error loading reader data:', error);
        toast({
          title: 'Errore caricamento',
          description: 'Impossibile caricare il capitolo',
          status: 'error',
          duration: 3000,
        });
        setTimeout(() => {
          navigate(`/manga/${source}/${mangaId}`);
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    if (source && mangaId && chapterId) {
      loadData();
    }
  }, [source, mangaId, chapterId, navigate, toast]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, chapter, isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (chapter?.pages) {
      preloadImages();
    }
  }, [chapter, currentPage]);

  useEffect(() => {
    // Auto-hide controls
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

  useEffect(() => {
    // Save progress on page change
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentPage, chapterIndex]);

  // ========== RENDER ==========
  
  if (loading) {
    return (
      <Box h="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" />
          <Text color="white">Caricamento capitolo...</Text>
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

  const currentImage = chapter.pages?.[currentPage];
  const totalPages = chapter.pages?.length || 0;
  const progressPercentage = ((currentPage + 1) / totalPages) * 100;

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
          bg="blackAlpha.800"
          p={2}
          zIndex={10}
          transition="opacity 0.3s"
        >
          <HStack justify="space-between">
            <HStack>
              <IconButton
                icon={<FaChevronLeft />}
                onClick={() => navigateChapter(-1)}
                aria-label="Capitolo precedente"
                variant="ghost"
                color="white"
                size="sm"
              />
              <Text color="white" fontSize="sm">
                {chapterIndex + 1} / {manga.chapters?.length}
              </Text>
              <IconButton
                icon={<FaChevronRight />}
                onClick={() => navigateChapter(1)}
                aria-label="Capitolo successivo"
                variant="ghost"
                color="white"
                size="sm"
              />
            </HStack>
            
            <HStack>
              <Text color="white" fontSize="sm">
                {currentPage + 1} / {totalPages}
              </Text>
              <IconButton
                icon={<FaCog />}
                onClick={() => setSettingsOpen(true)}
                aria-label="Impostazioni"
                variant="ghost"
                color="white"
                size="sm"
              />
              <IconButton
                icon={isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
                onClick={toggleFullscreen}
                aria-label="Schermo intero"
                variant="ghost"
                color="white"
                size="sm"
              />
              <IconButton
                icon={<FaTimes />}
                onClick={() => {
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
      <Box
        h="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        pt={showControls ? "100px" : 0}
        onDoubleClick={handleDoubleClick}
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt={`Pagina ${currentPage + 1}`}
            maxH="100%"
            maxW="100%"
            objectFit={fitMode === 'width' ? 'contain' : 'cover'}
            transform={`scale(${imageScale / 100})`}
            filter={`brightness(${brightness}%) contrast(${contrast}%)`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              console.error(`Failed to load image: ${currentImage}`);
              setImageLoading(false);
            }}
            style={{
              transform: isZoomed 
                ? `scale(${zoomLevel}) translate(${zoomOrigin.x * 50}%, ${zoomOrigin.y * 50}%)`
                : `scale(${imageScale / 100})`
            }}
          />
        ) : (
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" />
            <Text color="white">Caricamento immagine...</Text>
          </VStack>
        )}
      </Box>

      {/* Bottom Controls */}
      {showControls && (
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="blackAlpha.800"
          p={2}
          zIndex={10}
        >
          <HStack justify="space-between">
            <HStack>
              <IconButton
                icon={autoScroll ? <FaPause /> : <FaPlay />}
                onClick={toggleAutoScroll}
                aria-label="Auto scroll"
                variant="ghost"
                color="white"
                size="sm"
              />
              <IconButton
                icon={isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                onClick={toggleMute}
                aria-label="Volume"
                variant="ghost"
                color="white"
                size="sm"
              />
            </HStack>
            
            <HStack>
              <Text color="white" fontSize="xs">
                {Math.round(progressPercentage)}%
              </Text>
            </HStack>
          </HStack>
        </Box>
      )}

      {/* Settings Drawer */}
      <Drawer
        isOpen={settingsOpen}
        placement="right"
        onClose={() => setSettingsOpen(false)}
      >
        <DrawerOverlay />
        <DrawerContent bg="gray.800" color="white">
          <DrawerCloseButton />
          <DrawerHeader>Impostazioni Lettura</DrawerHeader>
          <DrawerBody>
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel>Modalità lettura</FormLabel>
                <Select
                  value={readingMode}
                  onChange={(e) => setReadingMode(e.target.value)}
                  bg="gray.700"
                >
                  <option value="single">Pagina singola</option>
                  <option value="webtoon">Webtoon</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Adattamento immagine</FormLabel>
                <Select
                  value={fitMode}
                  onChange={(e) => setFitMode(e.target.value)}
                  bg="gray.700"
                >
                  <option value="height">Altezza</option>
                  <option value="width">Larghezza</option>
                  <option value="fit">Adatta</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Scala: {imageScale}%</FormLabel>
                <Slider
                  value={imageScale}
                  onChange={setImageScale}
                  min={50}
                  max={200}
                  step={10}
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
                  min={0}
                  max={200}
                  step={10}
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
                  min={0}
                  max={200}
                  step={10}
                  colorScheme="purple"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel>Auto Scroll: {scrollSpeed}ms</FormLabel>
                <Slider
                  value={scrollSpeed}
                  onChange={setScrollSpeed}
                  min={50}
                  max={200}
                  step={10}
                  colorScheme="purple"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>
              
              <Divider />
              
              <Button
                onClick={() => {
                  saveProgress();
                  navigate(`/manga/${source}/${mangaId}`);
                }}
                colorScheme="purple"
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