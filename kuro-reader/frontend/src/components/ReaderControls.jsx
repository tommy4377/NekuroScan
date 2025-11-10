// ✅ ReaderControls - Controlli del reader memoizzati per performance
import React, { memo } from 'react';
import { Box, HStack, VStack, IconButton, Text, Progress } from '@chakra-ui/react';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog, FaPlay, FaPause,
  FaBookmark, FaRegBookmark, FaStickyNote, FaRegStickyNote
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';

const ReaderControls = memo(({
  // States
  showControls,
  currentPage,
  totalPages,
  progressPercentage,
  chapterIndex,
  totalChapters,
  readingMode,
  autoScroll,
  isBookmarked,
  hasNote,
  isFullscreen,
  
  // Handlers
  onNavigateChapter,
  onToggleAutoScroll,
  onToggleBookmark,
  onOpenNotes,
  onOpenSettings,
  onToggleFullscreen,
  onClose
}) => {
  if (!showControls) return null;

  const isMobile = window.innerWidth < 768;

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
          {/* Nav capitolo - SEMPRE visibile su mobile */}
          <HStack spacing={1} display={{ base: 'flex', md: currentPage >= totalPages - 1 ? 'flex' : 'none' }}>
            <IconButton
              icon={<FaChevronLeft />}
              onClick={(e) => { e.stopPropagation(); onNavigateChapter(-1); }}
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
              onClick={(e) => { e.stopPropagation(); onNavigateChapter(1); }}
              aria-label="Capitolo successivo"
              variant="ghost"
              color="white"
              size="sm"
              isDisabled={chapterIndex >= totalChapters - 1}
            />
          </HStack>

          {/* Spacer centrale */}
          <Box flex={1} />

          <HStack spacing={1}>
            <IconButton
              icon={isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
              aria-label="Segnalibro"
              variant="ghost"
              color={isBookmarked ? "yellow.400" : "white"}
              size="sm"
            />
            <IconButton
              icon={hasNote ? <FaStickyNote /> : <FaRegStickyNote />}
              onClick={(e) => { e.stopPropagation(); onOpenNotes(); }}
              aria-label="Note"
              variant="ghost"
              color={hasNote ? "green.400" : "white"}
              size="sm"
            />
            <IconButton
              icon={<FaCog />}
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              aria-label="Impostazioni"
              variant="ghost"
              color="white"
              size="sm"
            />
            <IconButton
              icon={isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
              onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
              aria-label="Schermo intero"
              variant="ghost"
              color="white"
              size="sm"
              display={{ base: 'none', md: 'flex' }}
            />
            <IconButton
              icon={<FaTimes />}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
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

