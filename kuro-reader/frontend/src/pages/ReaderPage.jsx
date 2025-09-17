import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaExpand, FaCompress, 
  FaTimes, FaBars, FaColumns
} from 'react-icons/fa';
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
  
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');

  useEffect(() => {
    loadData();
  }, [chapterId]);

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
    if (nextMode === 'double' && currentPage % 2 !== 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderPages = () => {
    if (!chapter || !chapter.pages || chapter.pages.length === 0) return null;

    if (readingMode === 'webtoon') {
      return (
        <VStack spacing={0} bg="black" pb={20}>
          {chapter.pages.map((page, i) => (
            <Image
              key={i}
              src={page}
              alt={`Page ${i + 1}`}
              width="100%"
              maxW="900px"
              mx="auto"
            />
          ))}
        </VStack>
      );
    }

    const pagesToShow = readingMode === 'double' ? 
      Math.min(2, chapter.pages.length - currentPage) : 1;
    
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
            <Box key={pageIndex} flex={1} display="flex" justifyContent="center">
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
                objectFit="contain"
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
            icon={readingMode === 'single' ? <FaBars /> : <FaColumns />}
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

      {/* Navigation arrows - sempre visibili */}
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

      {/* Content */}
      {renderPages()}
    </Box>
  );
}

export default ReaderPage;
