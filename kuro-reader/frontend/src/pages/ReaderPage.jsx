// ✅ READERPAGE.JSX - VERSIONE SEMPLIFICATA SENZA ERRORI REACT #300
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, DrawerCloseButton, Select, Divider
} from '@chakra-ui/react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import apiManager from '../api';

function ReaderPage() {
  // ========== HOOKS ESSENZIALI ==========
  const { source, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // ========== STATES ESSENZIALI ==========
  const [chapter, setChapter] = useState(null);
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [imageScale, setImageScale] = useState(100);
  const [fitMode, setFitMode] = useState('height');
  const [showControls, setShowControls] = useState(true);
  
  // ========== REFS ESSENZIALI ==========
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  // ========== CALCOLI ==========
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

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

  // ✅ WRAP navigateChapter in useCallback per evitare React error #300
  const navigateChapter = React.useCallback((direction) => {
    if (!manga?.chapters) return;
    
    const newIndex = chapterIndex + direction;
    
    if (newIndex >= 0 && newIndex < manga.chapters.length) {
      saveProgress();
      const newChapter = manga.chapters[newIndex];
      const newChapterId = btoa(newChapter.url);
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
  const handleKeyPress = React.useCallback((e) => {
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
  }, [isFullscreen, toggleFullscreen, saveProgress, navigate, source, mangaId, navigateChapter, currentPage, chapter]);

  // ✅ WRAP handlePageClick in useCallback per evitare React error #300
  const handlePageClick = React.useCallback((e) => {
    if (!chapter?.pages) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    if (clickX < width / 2) {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
    } else {
        navigateChapter(-1);
      }
      } else {
      if (currentPage < chapter.pages.length - 1) {
        setCurrentPage(currentPage + 1);
    } else {
        navigateChapter(1);
      }
    }
  }, [chapter, currentPage, navigateChapter]);

  // ========== EFFECTS ==========
  
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);

        const chapterUrl = atob(chapterId);

        const [mangaData, chapterData] = await Promise.all([
          apiManager.getMangaDetails(source, mangaId),
          apiManager.getChapterPages(source, chapterUrl)
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
                onClick={(e) => { e.stopPropagation(); navigateChapter(-1); }}
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
                onClick={(e) => { e.stopPropagation(); navigateChapter(1); }}
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
      <Box
        h="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        pt={showControls ? "100px" : 0}
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt={`Pagina ${currentPage + 1}`}
            maxH="100%"
            maxW="100%"
            objectFit={fitMode === 'width' ? 'contain' : 'cover'}
            transform={`scale(${imageScale / 100})`}
            onError={() => {
              console.error(`Failed to load image: ${currentImage}`);
            }}
          />
        ) : (
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" />
            <Text color="white">Caricamento immagine...</Text>
          </VStack>
        )}
      </Box>

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