/**
 * READER CONTROLS - Memoized reader controls for performance
 * Top bar controls for reader navigation and settings
 */

import { memo } from 'react';
import type { MouseEvent } from 'react';
import { Box, HStack, VStack, IconButton, Text, Progress } from '@chakra-ui/react';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog,
  FaBookmark, FaRegBookmark, FaStickyNote, FaRegStickyNote
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';

// ========== TYPES ==========

interface ReaderControlsProps {
  // States
  showControls: boolean;
  currentPage: number;
  totalPages: number;
  progressPercentage: number;
  chapterIndex: number;
  totalChapters: number;
  readingMode: string;
  autoScroll: boolean;
  isBookmarked: boolean;
  hasNote: boolean;
  isFullscreen: boolean;
  
  // Handlers
  onNavigateChapter: (direction: number) => void;
  onToggleAutoScroll: () => void;
  onToggleBookmark: () => void;
  onOpenNotes: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

// ========== COMPONENT ==========

const ReaderControls = memo<ReaderControlsProps>(({
  // States
  showControls,
  currentPage,
  totalPages,
  progressPercentage,
  chapterIndex,
  totalChapters,
  isBookmarked,
  hasNote,
  isFullscreen,
  
  // Handlers
  onNavigateChapter,
  onToggleBookmark,
  onOpenNotes,
  onOpenSettings,
  onToggleFullscreen,
  onClose
}) => {
  if (!showControls) return null;

  const handleStopPropagation = (e: MouseEvent, handler: () => void): void => {
    e.stopPropagation();
    handler();
  };

  return (
    <>
      {/* Top Controls */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bg="blackAlpha.900"
        p={2}
        zIndex={999}
        transition="opacity 0.3s"
        backdropFilter="blur(10px)"
        sx={{
          paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
          paddingLeft: 'calc(0.5rem + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(0.5rem + env(safe-area-inset-right, 0px))',
        }}
      >
        <HStack justify="space-between" spacing={2}>
          {/* Chapter navigation - ALWAYS visible on mobile */}
          <HStack spacing={1} display={{ base: 'flex', md: currentPage >= totalPages - 1 ? 'flex' : 'none' }}>
            <IconButton
              icon={<FaChevronLeft />}
              onClick={(e) => handleStopPropagation(e, () => onNavigateChapter(-1))}
              aria-label="Capitolo precedente"
              variant="ghost"
              color="white"
              size="sm"
              isDisabled={chapterIndex === 0}
            />
            <VStack spacing={0} px={1} display={{ base: 'none', md: 'flex' }}>
              <Text color="white" fontSize="xs" fontWeight="bold">
                Cap. {chapterIndex + 1} / {totalChapters}
              </Text>
            </VStack>
            <IconButton
              icon={<FaChevronRight />}
              onClick={(e) => handleStopPropagation(e, () => onNavigateChapter(1))}
              aria-label="Capitolo successivo"
              variant="ghost"
              color="white"
              size="sm"
              isDisabled={chapterIndex >= totalChapters - 1}
            />
          </HStack>

          {/* Center spacer */}
          <Box flex={1} />

          <HStack spacing={1}>
            <IconButton
              icon={isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
              onClick={(e) => handleStopPropagation(e, onToggleBookmark)}
              aria-label="Segnalibro"
              variant="ghost"
              color={isBookmarked ? "yellow.400" : "white"}
              size="sm"
            />
            <IconButton
              icon={hasNote ? <FaStickyNote /> : <FaRegStickyNote />}
              onClick={(e) => handleStopPropagation(e, onOpenNotes)}
              aria-label="Note"
              variant="ghost"
              color={hasNote ? "green.400" : "white"}
              size="sm"
            />
            <IconButton
              icon={<FaCog />}
              onClick={(e) => handleStopPropagation(e, onOpenSettings)}
              aria-label="Impostazioni"
              variant="ghost"
              color="white"
              size="sm"
            />
            <IconButton
              icon={isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
              onClick={(e) => handleStopPropagation(e, onToggleFullscreen)}
              aria-label="Schermo intero"
              variant="ghost"
              color="white"
              size="sm"
              display={{ base: 'none', md: 'flex' }}
            />
            <IconButton
              icon={<FaTimes />}
              onClick={(e) => handleStopPropagation(e, onClose)}
              aria-label="Chiudi"
              variant="solid"
              colorScheme="red"
              color="white"
              size="sm"
              _hover={{ bg: 'red.600' }}
            />
          </HStack>
        </HStack>
      </Box>

      {/* Progress Bar */}
      <Box
        position="absolute"
        top="calc(50px + env(safe-area-inset-top, 0px))"
        left={0}
        right={0}
        bg="blackAlpha.900"
        p={3}
        zIndex={999}
        backdropFilter="blur(10px)"
        sx={{
          paddingLeft: 'calc(0.75rem + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(0.75rem + env(safe-area-inset-right, 0px))',
        }}
      >
        <VStack spacing={2}>
          <HStack w="100%" justify="space-between" px={2}>
            <Text fontSize="xs" color="gray.400">
              Progresso capitolo
            </Text>
            <Text fontSize="xs" color="white" fontWeight="bold">
              {currentPage + 1} / {totalPages} pagine ({Math.round(progressPercentage)}%)
            </Text>
          </HStack>
          <Progress
            value={progressPercentage}
            size="xs"
            colorScheme="purple"
            borderRadius="full"
            w="100%"
            hasStripe
            isAnimated
          />
        </VStack>
      </Box>
    </>
  );
});

ReaderControls.displayName = 'ReaderControls';

export default ReaderControls;

