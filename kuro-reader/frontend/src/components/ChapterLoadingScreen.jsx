// ✅ ChapterLoadingScreen - Loading SMOOTH con countdown
import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, Progress, HStack, Icon } from '@chakra-ui/react';
import { FaBook } from 'react-icons/fa';
import useChapterPreload from '../hooks/useChapterPreload';

const ChapterLoadingScreen = ({ 
  chapterTitle,
  chapterPages = [],
  currentPage = 1,
  totalPages = 0,
  onLoadComplete,
  minDelay = 3000
}) => {
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(Math.ceil(minDelay / 1000));
  
  // Hook per preload REALE
  const { progress: preloadProgress, loadedCount, isComplete: preloadComplete, totalToLoad } = useChapterPreload(chapterPages, true);

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();
    let animationFrame;
    let countdownInterval;

    // Progress bar smooth animation
    const updateProgress = () => {
      if (!mounted) return;
      
      const elapsed = Date.now() - startTime;
      const linearProgress = Math.min((elapsed / minDelay) * 100, 100);
      
      // Mix progress lineare + preload reale
      const mixedProgress = Math.max(linearProgress, preloadProgress);
      
      setProgress(mixedProgress);

      if (linearProgress < 100) {
        animationFrame = requestAnimationFrame(updateProgress);
      } else if (preloadComplete) {
        // Completa quando ENTRAMBI: tempo passato E preload completo
        setTimeout(() => {
          if (mounted && onLoadComplete) {
            onLoadComplete();
          }
        }, 200);
      }
    };

    // Countdown timer
    countdownInterval = setInterval(() => {
      if (!mounted) return;
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((minDelay - elapsed) / 1000));
      setCountdown(remaining);
      
      if (remaining === 0) {
        clearInterval(countdownInterval);
      }
    }, 100);

    // Start animation
    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      mounted = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [minDelay, onLoadComplete, preloadComplete, preloadProgress]);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="gray.900"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <VStack spacing={8} maxW="400px" px={6}>
        {/* Icon animato */}
        <Box
          position="relative"
          sx={{
            animation: 'float 2s ease-in-out infinite'
          }}
        >
          <Box
            bg="purple.500"
            borderRadius="full"
            p={6}
            boxShadow="0 0 40px rgba(128, 90, 213, 0.4)"
            sx={{
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            <Icon as={FaBook} boxSize={12} color="white" />
          </Box>
        </Box>

        {/* Titolo capitolo */}
        <VStack spacing={4} textAlign="center">
          <Text fontSize="xl" fontWeight="bold" color="white">
            {chapterTitle || 'Caricamento Capitolo'}
          </Text>
          
          <Text fontSize="lg" color="purple.400" fontWeight="bold">
            {countdown > 0 ? `${countdown}s` : 'Pronto!'}
          </Text>
        </VStack>

        {/* Progress bar SMOOTH */}
        <Box width="100%" maxW="350px">
          <Progress
            value={progress}
            size="lg"
            colorScheme="purple"
            borderRadius="full"
            hasStripe
            isAnimated
            sx={{
              '& > div': {
                transition: 'none' // Rimosso per smoothness con requestAnimationFrame
              }
            }}
          />
          
          <HStack justify="space-between" mt={3}>
            <Text fontSize="sm" color="gray.400">
              Precaricamento: {loadedCount}/{totalToLoad}
            </Text>
            <Text fontSize="sm" color="purple.400" fontWeight="bold">
              {Math.round(progress)}%
            </Text>
          </HStack>
          
          {totalPages > 0 && (
            <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
              {totalPages} pagine da caricare
            </Text>
          )}
        </Box>
      </VStack>

      {/* Animazioni CSS */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 40px rgba(128, 90, 213, 0.4); }
            50% { box-shadow: 0 0 60px rgba(128, 90, 213, 0.6); }
          }
        `}
      </style>
    </Box>
  );
};

export default ChapterLoadingScreen;

