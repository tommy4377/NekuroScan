/**
 * READING PROGRESS BAR - Mini progress bar per navigation
 * ✅ SEZIONE 2.3: Reading Progress Visuale Migliorato
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Progress,
  HStack,
  Text,
  Tooltip,
  VStack
} from '@chakra-ui/react';
import { FaBook } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

interface ReadingProgress {
  chapterId?: string;
  chapterIndex: number;
  chapterTitle?: string;
  page?: number;
  pageIndex?: number;
  totalPages?: number;
  totalChapters?: number;
  timestamp?: string;
  lastRead?: string;
  // From 'reading' array
  title?: string;
  url?: string;
  lastChapterIndex?: number;
  lastChapterTitle?: string;
  progress?: number;
}

interface ReadingProgressBarProps {
  isVisible?: boolean;
}

const ReadingProgressBar = ({ isVisible = true }: ReadingProgressBarProps) => {
  const location = useLocation();
  const [progressData, setProgressData] = useState<ReadingProgress[]>([]);
  const [currentMangaProgress, setCurrentMangaProgress] = useState<ReadingProgress | null>(null);

  // Carica progress da localStorage
  useEffect(() => {
    const loadProgress = () => {
      try {
        // Carica da 'reading' array (formato più completo)
        const reading = JSON.parse(localStorage.getItem('reading') || '[]');
        
        // Anche da readingProgress per avere dati più aggiornati
        const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
        
        // Combina i dati
        const combined = reading
          .map((item: any) => {
            const progress = readingProgress[item.url];
            if (!progress && !item.progress) return null; // Skip se non c'è progress
            
            // Calcola progress se non presente
            let calculatedProgress = item.progress;
            if (!calculatedProgress && item.lastChapterIndex !== undefined) {
              // Prova a calcolare da lastChapterIndex e totalChapters o chapters.length
              const totalChaps = item.totalChapters || (item.chapters?.length);
              if (totalChaps) {
                calculatedProgress = Math.round(((item.lastChapterIndex + 1) / totalChaps) * 100);
              }
            }
            if (!calculatedProgress && progress) {
              // Calcola da progress data
              if (progress.totalChapters && progress.chapterIndex !== undefined) {
                calculatedProgress = Math.round(((progress.chapterIndex + 1) / progress.totalChapters) * 100);
              }
            }
            
            return {
              mangaUrl: item.url,
              mangaTitle: item.title,
              chapterIndex: progress?.chapterIndex ?? item.lastChapterIndex ?? 0,
              pageIndex: progress?.page ?? progress?.pageIndex ?? item.lastPage ?? 0,
              totalPages: progress?.totalPages ?? 0,
              lastChapterIndex: item.lastChapterIndex ?? progress?.chapterIndex ?? 0,
              lastChapterTitle: item.lastChapterTitle ?? progress?.chapterTitle ?? '',
              progress: calculatedProgress ?? 0,
              lastRead: item.lastRead ?? progress?.timestamp ?? new Date().toISOString()
            };
          })
          .filter((item: any) => item && (item.progress > 0 && item.progress < 100))
          .sort((a: any, b: any) => {
            const dateA = new Date(a.lastRead).getTime();
            const dateB = new Date(b.lastRead).getTime();
            return dateB - dateA;
          })
          .slice(0, 5); // Massimo 5 manga in corso

        setProgressData(combined);

        // Trova il progress del manga corrente (se siamo in ReaderPage o MangaDetails)
        const currentPath = location.pathname;
        const mangaMatch = currentPath.match(/\/manga\/([^\/]+)\/([^\/]+)/);
        if (mangaMatch && combined.length > 0) {
          const mangaId = mangaMatch[2];
          // Try to decode if it's base64
          let decodedId = mangaId;
          try {
            decodedId = decodeURIComponent(atob(mangaId.replace(/-/g, '+').replace(/_/g, '/') + '=='.substring(0, (4 - (mangaId.length % 4)) % 4)));
          } catch (e) {
            // Not base64, use as is
          }
          
          const current = combined.find((p: any) => {
            if (!p.mangaUrl) return false;
            // Try multiple matching strategies
            const urlLower = p.mangaUrl.toLowerCase();
            const idLower = mangaId.toLowerCase();
            const decodedLower = decodedId.toLowerCase();
            
            return urlLower.includes(idLower) || 
                   urlLower.includes(decodedLower) ||
                   idLower.includes(encodeURIComponent(urlLower)) ||
                   decodedLower.includes(encodeURIComponent(urlLower));
          });
          
          if (current) {
            setCurrentMangaProgress(current);
          } else {
            setCurrentMangaProgress(null);
          }
        } else {
          setCurrentMangaProgress(null);
        }
      } catch (e) {
        console.warn('[ReadingProgressBar] Error loading progress:', e);
        setProgressData([]);
        setCurrentMangaProgress(null);
      }
    };

    loadProgress();
    
    // Aggiorna ogni 5 secondi
    const interval = setInterval(loadProgress, 5000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Non mostrare se non ci sono dati o se siamo già in ReaderPage (dove c'è già un progress bar)
  if (!isVisible || location.pathname.includes('/read/')) {
    return null;
  }

  // Non mostrare se non ci sono dati
  if (progressData.length === 0 && !currentMangaProgress) {
    return null;
  }

  // Se c'è un manga corrente in lettura, mostra solo quello (più prominente)
  if (currentMangaProgress && currentMangaProgress.mangaTitle) {
    return (
      <Box
        position="sticky"
        top={0}
        zIndex={1000}
        bg="gray.800"
        borderBottom="1px solid"
        borderColor="gray.700"
        px={4}
        py={2}
      >
        <Tooltip
          label={
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold">{currentMangaProgress.mangaTitle || 'Manga'}</Text>
              <Text fontSize="xs">
                Capitolo {(currentMangaProgress.lastChapterIndex ?? currentMangaProgress.chapterIndex ?? 0) + 1}: {currentMangaProgress.lastChapterTitle || 'N/A'}
              </Text>
              {(currentMangaProgress.totalPages && currentMangaProgress.totalPages > 0) && (
                <Text fontSize="xs">
                  {currentMangaProgress.pageIndex || 0} / {currentMangaProgress.totalPages} pagine
                </Text>
              )}
            </VStack>
          }
          placement="bottom"
          bg="gray.800"
          color="white"
          borderRadius="md"
          px={3}
          py={2}
        >
          <HStack spacing={3} w="100%">
            <FaBook size="14" color="var(--chakra-colors-purple-400)" />
            <Box flex={1}>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.300" fontWeight="medium" noOfLines={1} flex={1}>
                  {currentMangaProgress.mangaTitle || 'Manga'}
                </Text>
                <Text fontSize="xs" color="gray.400" fontWeight="semibold">
                  {Math.round(currentMangaProgress.progress || 0)}%
                </Text>
              </HStack>
              <Progress
                value={currentMangaProgress.progress || 0}
                size="xs"
                colorScheme="purple"
                borderRadius="full"
                hasStripe
                isAnimated
              />
            </Box>
          </HStack>
        </Tooltip>
      </Box>
    );
  }

  // Altrimenti mostra un summary generale (se ci sono più manga in lettura)
  if (progressData.length === 0) return null;

  const totalProgress = progressData.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / progressData.length;
  const totalMangaInProgress = progressData.length;

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={1000}
      bg="gray.800"
      borderBottom="1px solid"
      borderColor="gray.700"
      px={4}
      py={2}
    >
        <Tooltip
          label={
            <VStack align="start" spacing={1}>
              {progressData.map((p: any, idx: number) => (
                <Text key={idx} fontSize="xs">
                  {p.mangaTitle || 'Manga'}: {Math.round(p.progress || 0)}%
                </Text>
              ))}
            </VStack>
          }
        placement="bottom"
        bg="gray.800"
        color="white"
        borderRadius="md"
        px={3}
        py={2}
      >
        <HStack spacing={3} w="100%">
          <FaBook size="14" color="var(--chakra-colors-purple-400)" />
          <Box flex={1}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" color="gray.300" fontWeight="medium">
                {totalMangaInProgress} {totalMangaInProgress === 1 ? 'manga in lettura' : 'manga in lettura'}
              </Text>
              <Text fontSize="xs" color="gray.400">
                {Math.round(totalProgress)}%
              </Text>
            </HStack>
            <Progress
              value={totalProgress}
              size="xs"
              colorScheme="purple"
              borderRadius="full"
              hasStripe
              isAnimated
            />
          </Box>
        </HStack>
      </Tooltip>
    </Box>
  );
};

export default ReadingProgressBar;

